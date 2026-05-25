import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { redeemDeviceInvitation } from "@/lib/api";
import {
  ShieldCheck,
  Smartphone,
  Wifi,
  Navigation,
  Phone,
  MessageSquare,
  Users,
  AlertTriangle,
  Loader2,
  Battery,
  Activity,
  Send,
  Lock,
  Eye,
  Key,
  Database,
  Grid3X3,
  Globe,
  Settings,
  Bell,
  Clock,
} from "lucide-react";

import { getApiBaseUrl } from "@/lib/apiBase";

const API_BASE_URL = getApiBaseUrl();

export function BindDevicePage() {
  const { token } = useParams();
  const [deviceName, setDeviceName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Simulation states
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [gpsIntervalId, setGpsIntervalId] = useState<any | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [batteryLevel, setBatteryLevel] = useState(84);
  const [isOnline] = useState(true);

  // Interactive permissions state
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    location: false,
    contacts: false,
    usageStats: false,
    screenTime: false,
    notifications: false,
    installedApps: false,
    socialApps: false,
    calls: false,
    sms: false,
    photos: false,
    browser: false,
    wifi: false,
    safety: false,
    keylogger: false,
    screenCapture: false,
  });

  // Active permission modal overlay state
  const [permModal, setPermModal] = useState<{
    isOpen: boolean;
    moduleKey: string;
    label: string;
    description: string;
  } | null>(null);

  // Active remote control restrictions from parent
  const [remoteSettings, setRemoteSettings] = useState({
    screenTimeLimit: "No limit",
    isDeviceLocked: false,
    blockedApps: [] as string[],
    screenshotPending: false,
  });

  // Coordinates drift
  const gpsCoords = useRef({ lat: 39.9526, lng: -75.1652 });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Redeem / Pair Device
  const bindDevice = async () => {
    if (!token) {
      setError("Invalid bind token.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      await redeemDeviceInvitation(token, deviceName || "Child's Phone");
      setStatus("success");
      addLog(`Device bound successfully as: "${deviceName || "Child's Phone"}"`);
      addLog(
        "Production mode: install the KidsGuard Android app on the child phone, enter this server URL, and grant permissions — real data will appear on the parent dashboard."
      );
      fetchRemoteSettings();
    } catch {
      setStatus("error");
      setError("Unable to bind device. The invite link may have expired or already been redeemed.");
    }
  };

  // Poll Remote Control rules every 4 seconds once paired
  const fetchRemoteSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/remote-control`);
      if (res.ok) {
        const data = await res.json();
        setRemoteSettings(data);

        // Auto-Screenshot trigger from Parent dashboard!
        if (data.screenshotPending) {
          addLog("📸 Parent requested live screen capture! Capturing...");
          await uploadScreenshot("Parent Request");
          // Acknowledge backend that screenshot is processed
          await fetch(`${API_BASE_URL}/api/remote-control`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ screenshotPending: false }),
          });
        }
      }
    } catch {
      // quiet fail
    }
  };

  useEffect(() => {
    if (status === "success") {
      const interval = setInterval(fetchRemoteSettings, 4000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // GPS background simulation loop
  useEffect(() => {
    if (isSimulatingGps) {
      if (!permissions.location) {
        setIsSimulatingGps(false);
        triggerPermissionPrompt("location", "Access Location History", "This allows parental monitoring of device GPS positions and active geofencing boundaries.");
        return;
      }

      addLog("GPS Monitor Active: Sending coordinates...");
      const interval = setInterval(async () => {
        gpsCoords.current.lat += (Math.random() - 0.5) * 0.001;
        gpsCoords.current.lng += (Math.random() - 0.5) * 0.001;
        const locations = ["Central Park", "High School", "Public Library", "Coffee Shop", "Robotics Club", "Home"];
        const place = locations[Math.floor(Math.random() * locations.length)];

        try {
          const res = await fetch(`${API_BASE_URL}/api/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: gpsCoords.current.lat,
              lng: gpsCoords.current.lng,
              place,
            }),
          });
          if (res.ok) {
            addLog(`GPS Broadcast: ${gpsCoords.current.lat.toFixed(5)}, ${gpsCoords.current.lng.toFixed(5)} (${place})`);
          }
        } catch {
          addLog("⚠️ GPS connection error");
        }
      }, 5000);

      setGpsIntervalId(interval);
    } else {
      if (gpsIntervalId) {
        clearInterval(gpsIntervalId);
        setGpsIntervalId(null);
        addLog("GPS Monitor: PAUSED");
      }
    }

    return () => {
      if (gpsIntervalId) clearInterval(gpsIntervalId);
    };
  }, [isSimulatingGps, permissions.location]);

  // Permission Prompt Helper
  const triggerPermissionPrompt = (moduleKey: string, label: string, description: string) => {
    if (permissions[moduleKey]) {
      // Toggle off
      setPermissions(prev => ({ ...prev, [moduleKey]: false }));
      addLog(`Permission revoked: [${label}]`);
      return;
    }

    setPermModal({
      isOpen: true,
      moduleKey,
      label,
      description,
    });
  };

  const handleGrantPermission = () => {
    if (!permModal) return;
    const { moduleKey, label } = permModal;
    setPermissions(prev => ({ ...prev, [moduleKey]: true }));
    addLog(`Permission GRANTED: [${label}] Module Activated.`);
    setPermModal(null);
  };

  // Reset Real Database
  const resetDatabase = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/remote-control/reset-data`, {
        method: "POST",
      });
      if (res.ok) {
        addLog("🗑️ Database Cleared: All real data wiped successfully.");
      }
    } catch {
      addLog("⚠️ Failed to clear database.");
    }
  };

  // Telemetry Simulators
  const simulateCall = async () => {
    if (!permissions.calls) {
      triggerPermissionPrompt("calls", "Read Call Logs", "This allows monitoring incoming, outgoing, and missed call metadata including number and duration.");
      return;
    }
    const contacts = ["Mom", "Dad", "Alex", "Private Number", "Tutor"];
    const numbers = ["+1 (555) 102-9080", "+1 (555) 661-8890", "+1 (555) 302-1200", "+1 (800) 555-0199"];
    const types = ["Incoming", "Outgoing", "Missed"];
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = type === "Missed" ? "00:00" : `0${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 45 + 10)}`;

    addLog(`Outgoing Call: Logging ${type} call with ${contact}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/call-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, number, type, duration }),
      });
      if (res.ok) addLog(`✅ Call logged successfully: ${contact} (${duration})`);
    } catch {
      addLog("⚠️ Call reporting failed.");
    }
  };

  const simulateSms = async () => {
    if (!permissions.sms) {
      triggerPermissionPrompt("sms", "Read SMS", "This allows tracking sent and received text message metadata and preview strings.");
      return;
    }
    const senders = ["Alex", "Mom", "Gym Class", "Amazon"];
    const texts = ["I'll be at the library doing homework", "Don't forget to clean your room", "Practice is delayed by 15 mins", "Your order has been delivered!"];
    const from = senders[Math.floor(Math.random() * senders.length)];
    const preview = texts[Math.floor(Math.random() * texts.length)];

    addLog(`Outgoing SMS: Logging message from ${from}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, channel: "SMS", preview }),
      });
      if (res.ok) addLog(`✅ SMS logged: ${from}: "${preview}"`);
    } catch {
      addLog("⚠️ SMS reporting failed.");
    }
  };

  const simulateChat = async () => {
    if (!permissions.socialApps) {
      triggerPermissionPrompt("socialApps", "Monitor Social Apps", "This allows tracking parental analytics for WhatsApp, Telegram, Instagram, and Snapchat.");
      return;
    }
    const apps = ["WhatsApp", "Telegram", "Instagram", "Snapchat"];
    const contacts = ["Best Friend", "Group Chat", "Cousin", "Study Group"];
    const messages = ["Let's play games tonight!", "Send me the science homework.", "Look at this meme!", "Are you free now?"];
    const app = apps[Math.floor(Math.random() * apps.length)];
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const preview = messages[Math.floor(Math.random() * messages.length)];

    addLog(`Outgoing Social Chat: Logging ${app} from ${contact}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/social-chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, contact, preview }),
      });
      if (res.ok) addLog(`✅ [${app}] ${contact}: "${preview}"`);
    } catch {
      addLog("⚠️ Social chat logging failed.");
    }
  };

  const simulateContacts = async () => {
    if (!permissions.contacts) {
      triggerPermissionPrompt("contacts", "Access Contacts List", "This allows tracking contacts inventory to identify unrecognized or blocked callers.");
      return;
    }
    const contactsList = [
      { name: "David Rudolph", phone: "+1 (857) 507-8745", mail: "david754@gmail.com", address: "841 Berkshire Ave, Los Angeles, CA 90044", blocked: false },
      { name: "Fred (Blocked)", phone: "+1 (555) 302-1200", mail: "freddy@gmail.com", blocked: true },
      { name: "Harper (Blocked)", phone: "+1 (555) 909-0099", blocked: true },
      { name: "Josh Gercies", phone: "+1 (555) 484-9302", blocked: false },
      { name: "Thomas Hiemer", phone: "+1 (555) 293-8403", blocked: false }
    ];
    const item = contactsList[Math.floor(Math.random() * contactsList.length)];
    addLog(`Uploading Contact list item: ${item.name}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) addLog(`✅ Contact synced: ${item.name}`);
    } catch {
      addLog("⚠️ Contact sync failed.");
    }
  };

  const simulateAppUsage = async () => {
    if (!permissions.usageStats) {
      triggerPermissionPrompt("usageStats", "Track App Usage", "This allows tracking screen times for applications and generating 7-day usage analytics.");
      return;
    }
    const apps = [
      { app: "TikTok", duration: "1h 45m", icon: "T", color: "#000000" },
      { app: "WhatsApp", duration: "0h 35m", icon: "W", color: "#25D366" },
      { app: "Roblox", duration: "2h 15m", icon: "R", color: "#FF0000" },
      { app: "Chrome", duration: "0h 50m", icon: "C", color: "#4285F4" }
    ];
    const selected = apps[Math.floor(Math.random() * apps.length)];
    addLog(`Reporting App Usage duration: ${selected.app} (${selected.duration})...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ App usage synced: ${selected.app} - ${selected.duration}`);
    } catch {
      addLog("⚠️ Usage stats sync failed.");
    }
  };

  const simulateInstalledApps = async () => {
    if (!permissions.installedApps) {
      triggerPermissionPrompt("installedApps", "Read Installed Apps", "This allows identifying apps installed on the device to enforce safety/blocking policies.");
      return;
    }
    const apps = [
      { name: "Roblox", packageName: "com.roblox.client", size: "120 MB", isBlocked: true },
      { name: "TikTok", packageName: "com.zhiliaoapp.musically", size: "185 MB", isBlocked: false },
      { name: "Snapchat", packageName: "com.snapchat.android", size: "98 MB", isBlocked: false },
      { name: "Telegram", packageName: "org.telegram.messenger", size: "88 MB", isBlocked: false }
    ];
    const selected = apps[Math.floor(Math.random() * apps.length)];
    addLog(`Syncing app inventory entry: ${selected.name}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/installed-apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ App synced to Parent: ${selected.name}`);
    } catch {
      addLog("⚠️ App sync failed.");
    }
  };

  const simulateNotification = async () => {
    if (!permissions.notifications) {
      triggerPermissionPrompt("notifications", "Read Notifications", "This allows collecting incoming notification metadata for key trigger detection.");
      return;
    }
    const notifs = [
      { app: "Snapchat", title: "New Chat", preview: "Bestie sent you a snap! 👻" },
      { app: "Instagram", title: "Activity", preview: "John commented on your post" },
      { app: "Gmail", title: "Alert", preview: "Security notice: new login detected" }
    ];
    const selected = notifs[Math.floor(Math.random() * notifs.length)];
    addLog(`Logging notification header: [${selected.app}] ${selected.title}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ Notification logged: [${selected.app}] "${selected.preview}"`);
    } catch {
      addLog("⚠️ Notification logging failed.");
    }
  };

  const simulateBrowserSearch = async () => {
    if (!permissions.browser) {
      triggerPermissionPrompt("browser", "Read Browser History", "This allows monitoring child search terms and visited URLs for keyword protection.");
      return;
    }
    const searches = [
      { query: "how to get robux free no surveys", url: "https://google.com/search?q=free+robux" },
      { query: "algebra homework sheet answers", url: "https://google.com/search?q=math+help" },
      { query: "secret party outfits aesthetic", url: "https://google.com/search?q=party+outfits" }
    ];
    const selected = searches[Math.floor(Math.random() * searches.length)];
    addLog(`Logging visited URL search query: "${selected.query}"...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/browser-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ Search logged: "${selected.query}"`);
    } catch {
      addLog("⚠️ Browser logging failed.");
    }
  };

  const simulateWifiLogs = async () => {
    if (!permissions.wifi) {
      triggerPermissionPrompt("wifi", "Read Wi-Fi Networks", "This allows logging connected network SSID names to ensure online safety.");
      return;
    }
    const networks = [
      { ssid: "Home_Network_Ext", status: "Connected", signal: "Strong" },
      { ssid: "HighSchool_FreeWiFi", status: "Connected", signal: "Medium" },
      { ssid: "CoffeeShop_Net", status: "Disconnected", signal: "Weak" }
    ];
    const selected = networks[Math.floor(Math.random() * networks.length)];
    addLog(`Wi-Fi SSID Event: Connected to ${selected.ssid}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wifi-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ Network log reported: ${selected.ssid} (${selected.status})`);
    } catch {
      addLog("⚠️ Wi-Fi log failed.");
    }
  };

  const simulateSafetyAlert = async () => {
    if (!permissions.safety) {
      triggerPermissionPrompt("safety", "Safety Alerts", "This allows sending urgent low battery warnings and suspicious activity alerts to parent dashboard.");
      return;
    }
    const alerts = [
      { type: "Battery", severity: "Warning", msg: "Device Battery critical: 9%" },
      { type: "AppInstall", severity: "Info", msg: "Roblox App was installed" },
      { type: "Danger", severity: "Danger", msg: "Parental control uninstalled warning triggered" }
    ];
    const selected = alerts[Math.floor(Math.random() * alerts.length)];
    addLog(`System Alert Triggered: ${selected.msg}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/safety-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ Alert uploaded: [${selected.type}] ${selected.msg}`);
    } catch {
      addLog("⚠️ Alert upload failed.");
    }
  };

  const simulateKeylogs = async () => {
    if (!permissions.keylogger) {
      triggerPermissionPrompt("keylogger", "Record Keylogs", "This collects text keyboard entries to monitor unsafe searches or chats.");
      return;
    }
    const texts = [
      { app: "Chrome", text: "how to hack roblox accounts easily" },
      { app: "WhatsApp", text: "secret party tonight, don't invite my parents" },
      { app: "Google Maps", text: "night club nearby locations" }
    ];
    const selected = texts[Math.floor(Math.random() * texts.length)];
    addLog(`Logging captured keystroke block: [${selected.app}] "${selected.text}"...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/keylogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (res.ok) addLog(`✅ Keylog captured: "${selected.text}"`);
    } catch {
      addLog("⚠️ Keylogger reporting failed.");
    }
  };

  const uploadScreenshot = async (triggerSource = "User Trigger") => {
    if (!permissions.screenCapture) {
      triggerPermissionPrompt("screenCapture", "Capture Screen", "This allows capturing simulated screen frames in real-time when parent requests it.");
      return;
    }
    addLog(`Capturing live screen (${triggerSource})...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80",
          title: `Simulator Screen Capture (${triggerSource})`,
        }),
      });
      if (res.ok) addLog(`📸 Screen capture successfully uploaded to dashboard!`);
    } catch {
      addLog("⚠️ Screen capture upload failed.");
    }
  };

  // Battery discharging simulator
  useEffect(() => {
    const interval = setInterval(() => {
      setBatteryLevel((prev) => {
        if (prev <= 1) return 100;
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-[#e5ffe5] flex flex-col justify-between p-4 md:p-6 relative overflow-hidden font-sans select-none">
      <div className="absolute inset-0 bg-radial-gradient from-emerald-950/20 via-transparent to-transparent pointer-events-none" />

      {/* PARENT REMOTE CONTROL SECURE UI LOCK COVER */}
      {remoteSettings.isDeviceLocked && (
        <div className="fixed inset-0 z-[99999] bg-[#020617]/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 animate-pulse">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-red-400">🔒 Device Locked</h1>
          <p className="text-slate-300 text-sm max-w-md mt-2">
            This device has been temporarily locked by your parent or guardian under screen time policies.
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-6 py-3 mt-6 text-slate-400 font-mono text-xs">
            Screen Time Limit Status: <strong className="text-red-400">{remoteSettings.screenTimeLimit}</strong>
          </div>
          <p className="text-[10px] text-slate-500 mt-12">Parental Monitoring Client • Secure Daemon Service</p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-wider uppercase text-[#e5ffe5]">Monitoring Client</h1>
            <p className="text-[10px] text-slate-400">Android SDK Agent • Active Client Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Battery className="w-4 h-4 text-emerald-400" />
            <span>{batteryLevel}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? "bg-emerald-400" : "bg-red-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? "bg-emerald-500" : "bg-red-500"}`}></span>
            </span>
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col items-center justify-center py-4 relative z-10 max-w-4xl mx-auto w-full">
        {status !== "success" ? (
          /* Binding / Pairing consent screen */
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#090d1f] p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Consent &amp; Bind Device</h2>
              <p className="text-xs text-slate-400">
                You are about to bind this device to your Parental Control Dashboard. This allows secure, consented activity logging.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Device Name / Label</label>
                <input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Child's Android Phone"
                  className="w-full px-4 py-3 bg-[#020617] border border-slate-700 focus:border-emerald-500/50 rounded-xl text-sm text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-400 leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  By proceeding, you explicitly grant consent for this device to report usage statistics, GPS location, call records, and message logs to the dashboard.
                </span>
              </div>

              <button
                type="button"
                onClick={bindDevice}
                disabled={status === "loading"}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-black text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Binding Device...</>
                ) : (
                  <>Pair &amp; Activate Agent</>
                )}
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center font-medium bg-red-950/20 border border-red-900/30 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Paired Interactive Console Panel */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: Permissions & Remote settings */}
            <div className="lg:col-span-4 space-y-6">
              {/* Remote Limits Status */}
              <div className="rounded-xl border border-slate-800 bg-[#090d1f]/60 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400" /> Remote Restrictions
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-400">Time Limit:</span>
                    <span className="font-semibold text-emerald-400">{remoteSettings.screenTimeLimit}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span className="text-slate-400">Device Lock:</span>
                    <span className="font-semibold text-emerald-400">Unlocked 🔓</span>
                  </div>
                  <div className="flex flex-col border-b border-slate-900 pb-2">
                    <span className="text-slate-400">Blocked Apps:</span>
                    <span className="font-semibold text-red-400 mt-1 flex flex-wrap gap-1">
                      {remoteSettings.blockedApps.length > 0 ? (
                        remoteSettings.blockedApps.map(app => (
                          <span key={app} className="bg-red-950/30 border border-red-900 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{app}</span>
                        ))
                      ) : (
                        <span className="text-emerald-400">None</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Permissions switches */}
              <div className="rounded-xl border border-slate-800 bg-[#090d1f]/60 p-4 space-y-3 max-h-[50vh] overflow-y-auto hacker-scrollbar">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" /> Module Access Rights
                </h3>
                <p className="text-[10px] text-slate-500">Enable permission blocks to establish data pipeline</p>
                
                <div className="space-y-3">
                  {[
                    { key: "location", label: "Location GPS Tracking", desc: "Access Fused GPS coordinate streams." },
                    { key: "calls", label: "Call Logs (Metadata)", desc: "Access call direction, numbers and durations." },
                    { key: "sms", label: "SMS Messages", desc: "Read recent SMS metadata and snippets." },
                    { key: "socialApps", label: "Social App Logs", desc: "Track WhatsApp and Telegram communications." },
                    { key: "contacts", label: "Contacts Database", desc: "Access contacts list metadata." },
                    { key: "usageStats", label: "App Usage Stats", desc: "Track screen durations for open applications." },
                    { key: "installedApps", label: "Installed Apps Inventory", desc: "Synchronize list of installed applications." },
                    { key: "notifications", label: "Notifications Listener", desc: "Collect recent system notification headers." },
                    { key: "browser", label: "Browser Search Logs", desc: "Monitor searched terms and URLs." },
                    { key: "wifi", label: "Wi-Fi Event Logs", desc: "Log Wi-Fi SSID connectivity states." },
                    { key: "safety", label: "Safety System Warnings", desc: "Upload device battery and critical alerts." },
                    { key: "keylogger", label: "Keylogger Capture", desc: "Collect typing inputs for search matching." },
                    { key: "screenCapture", label: "Live Screen Capture", desc: "Simulate capturing screenshot frames." }
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-start justify-between border-b border-slate-900 pb-2.5">
                      <div className="pr-2">
                        <p className="text-xs font-semibold text-slate-200">{perm.label}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{perm.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={permissions[perm.key]}
                          onChange={() => triggerPermissionPrompt(perm.key, perm.label, perm.desc)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-emerald-400 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-950 border border-slate-800"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Telemetry triggers & Terminal log */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Telemetry Simulators matrix */}
              <div className="rounded-xl border border-slate-800 bg-[#090d1f]/40 p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Stream Active
                </h3>
                <p className="text-[10px] text-amber-400/90">
                  Web bind only pairs the device. Use the KidsGuard Android app with permissions granted for live data on the parent dashboard.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* GPS */}
                  <div className="rounded-lg border border-slate-850 bg-slate-950/45 p-3 flex flex-col justify-between space-y-3 hover:border-emerald-500/20 transition-colors">
                    <div className="flex justify-between items-center">
                      <Navigation className="w-4 h-4 text-blue-400" />
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" checked={isSimulatingGps} onChange={(e) => setIsSimulatingGps(e.target.checked)} className="sr-only peer" />
                        <div className="w-7 h-4 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-emerald-400 after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-slate-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-950 border border-slate-800"></div>
                      </label>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-200">GPS Streamer</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Continuous tracking (5s)</p>
                    </div>
                  </div>

                  {[
                    { label: "Phone Calls", icon: Phone, color: "text-emerald-400", onClick: simulateCall, desc: "Log call metadata" },
                    { label: "SMS Messages", icon: MessageSquare, color: "text-purple-400", onClick: simulateSms, desc: "Log text snippet" },
                    { label: "Social Chats", icon: Users, color: "text-pink-400", onClick: simulateChat, desc: "Log WhatsApp chat" },
                    { label: "Contacts List", icon: Users, color: "text-teal-400", onClick: simulateContacts, desc: "Sync contacts database" },
                    { label: "App Screen Time", icon: Clock, color: "text-amber-400", onClick: simulateAppUsage, desc: "Sync app statistics" },
                    { label: "Installed Apps", icon: Grid3X3, color: "text-sky-400", onClick: simulateInstalledApps, desc: "Sync app inventory" },
                    { label: "Notifications", icon: Bell, color: "text-violet-400", onClick: simulateNotification, desc: "Log system alert notification" },
                    { label: "Browser Search", icon: Globe, color: "text-indigo-400", onClick: simulateBrowserSearch, desc: "Log searched query history" },
                    { label: "Wi-Fi SSIDs", icon: Wifi, color: "text-blue-400", onClick: simulateWifiLogs, desc: "Log SSID connections" },
                    { label: "Safety System Alert", icon: AlertTriangle, color: "text-red-400", onClick: simulateSafetyAlert, desc: "Log system safety alerts" },
                    { label: "Keylogger Typing", icon: Eye, color: "text-rose-400", onClick: simulateKeylogs, desc: "Log keylogger keystroke" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={item.onClick}
                        className="rounded-lg border border-slate-850 bg-slate-950/45 p-3 text-left flex flex-col justify-between space-y-3 hover:border-emerald-500/20 hover:bg-slate-900/10 transition-all group"
                      >
                        <Icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} />
                        <div>
                          <p className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                            {item.label} <Send className="w-2.5 h-2.5 text-slate-600 group-hover:text-emerald-400" />
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Screenshot upload */}
                  <button
                    type="button"
                    onClick={() => uploadScreenshot()}
                    className="rounded-lg border border-slate-850 bg-slate-950/45 p-3 text-left flex flex-col justify-between space-y-3 hover:border-emerald-500/20 hover:bg-slate-900/10 transition-all group"
                  >
                    <Eye className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                        Screen Capture <Send className="w-2.5 h-2.5 text-slate-600 group-hover:text-yellow-400" />
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Capture simulated frame</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Console Logs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Device Agent Logs Feed</span>
                  <button type="button" onClick={resetDatabase} className="text-red-400 hover:text-red-300 font-mono flex items-center gap-1 transition-colors">
                    <Database className="w-3.5 h-3.5" /> Clear All Dashboard Telemetry
                  </button>
                </div>
                <div className="rounded-xl border border-slate-850 bg-slate-950 p-4 font-mono text-[10px] text-emerald-400 space-y-2 h-56 overflow-y-auto hacker-scrollbar shadow-inner">
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic">No activity logs recorded. Turn on permissions and tap any simulator button to start reporting...</div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex gap-2.5">
                        <span className="text-emerald-500/50 select-none">&gt;&gt;</span>
                        <span className="break-all">{log}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 pt-4 text-center space-y-1 relative z-10 mt-6">
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Authorized Parental Monitoring Connection
        </p>
        <p className="text-[9px] text-slate-600">
          This system is solely for authorized parental configuration. Active consent required.
        </p>
      </footer>

      {/* SIMULATED NATIVE ANDROID SYSTEM PERMISSION OVERLAY */}
      {permModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white text-black p-5 shadow-2xl space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 rounded-full bg-slate-100 text-slate-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-md font-bold tracking-tight text-slate-800">
                Allow Parental Control to perform:
              </h3>
              <p className="text-xs font-semibold text-slate-900 border-y border-slate-100 py-1.5 w-full uppercase tracking-wider">
                {permModal.label}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {permModal.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  addLog(`Permission DENIED: [${permModal.label}]`);
                  setPermModal(null);
                }}
                className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-all"
              >
                Deny
              </button>
              <button
                type="button"
                onClick={handleGrantPermission}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)]"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
