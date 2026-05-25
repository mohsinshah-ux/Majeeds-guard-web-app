/**
 * Automatic child-device telemetry — pushes realistic data to the backend
 * on intervals (no manual "Send" buttons required).
 */

export type TelemetryLog = (message: string) => void;

export type GpsCoords = { lat: number; lng: number };

export type LiveTelemetryOptions = {
  onLog?: TelemetryLog;
  getBatteryLevel?: () => number;
  /** Called when parent requests screenshot via remote-control */
  onScreenshotRequested?: () => void | Promise<void>;
};

type TelemetryHandle = { stop: () => void };

const PLACES = [
  "Central Park",
  "High School",
  "Public Library",
  "Coffee Shop",
  "Robotics Club",
  "Home",
  "Soccer Field",
  "Mall Food Court",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function postJson(
  apiBase: string,
  path: string,
  body: unknown
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postBatteryLevel(apiBase: string, level: number) {
  return postJson(apiBase, "/api/battery", { level });
}

export async function tickGps(apiBase: string, coords: GpsCoords, onLog?: TelemetryLog) {
  coords.lat += (Math.random() - 0.5) * 0.001;
  coords.lng += (Math.random() - 0.5) * 0.001;
  const place = pick(PLACES);
  const ok = await postJson(apiBase, "/api/locations", {
    lat: coords.lat,
    lng: coords.lng,
    place,
  });
  if (ok) {
    onLog?.(
      `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (${place})`
    );
  }
  return ok;
}

async function tickCall(apiBase: string, onLog?: TelemetryLog) {
  const contacts = ["Mom", "Dad", "Alex", "Private Number", "Tutor", "Grandma"];
  const numbers = [
    "+1 (555) 102-9080",
    "+1 (555) 661-8890",
    "+1 (555) 302-1200",
    "+1 (800) 555-0199",
  ];
  const types = ["Incoming", "Outgoing", "Missed"];
  const contact = pick(contacts);
  const type = pick(types);
  const duration =
    type === "Missed"
      ? "00:00"
      : `0${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 45 + 10)}`;
  const ok = await postJson(apiBase, "/api/call-logs", {
    contact,
    number: pick(numbers),
    type,
    duration,
  });
  if (ok) onLog?.(`Call: ${type} — ${contact} (${duration})`);
}

async function tickSms(apiBase: string, onLog?: TelemetryLog) {
  const senders = ["Alex", "Mom", "Gym Class", "Amazon", "Dad"];
  const texts = [
    "I'll be at the library doing homework",
    "Don't forget to clean your room",
    "Practice is delayed by 15 mins",
    "Your order has been delivered!",
    "Can you pick me up at 4?",
  ];
  const from = pick(senders);
  const preview = pick(texts);
  const ok = await postJson(apiBase, "/api/messages", {
    from,
    channel: "SMS",
    preview,
  });
  if (ok) onLog?.(`SMS: ${from} — "${preview}"`);
}

async function tickSocialChat(apiBase: string, onLog?: TelemetryLog) {
  const apps = ["WhatsApp", "Telegram", "Instagram", "Snapchat"];
  const contacts = ["Best Friend", "Group Chat", "Cousin", "Study Group"];
  const messages = [
    "Let's play games tonight!",
    "Send me the science homework.",
    "Look at this meme!",
    "Are you free now?",
  ];
  const ok = await postJson(apiBase, "/api/social-chats", {
    app: pick(apps),
    contact: pick(contacts),
    preview: pick(messages),
  });
  if (ok) onLog?.(`Social chat synced`);
}

async function tickAppCall(apiBase: string, onLog?: TelemetryLog) {
  const names = ["Aditi", "John", "Sarah", "Mike"];
  const types = ["Incoming", "Outgoing"];
  const ok = await postJson(apiBase, "/api/app-calls", {
    name: pick(names),
    phone: "WhatsApp Call",
    type: pick(types),
    duration: `0${Math.floor(Math.random() * 9)}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")}`,
    status: "Normal",
  });
  if (ok) onLog?.(`App call (VoIP) logged`);
}

async function tickContact(apiBase: string, onLog?: TelemetryLog) {
  const list = [
    {
      name: "David Rudolph",
      phone: "+1 (857) 507-8745",
      mail: "david754@gmail.com",
      address: "841 Berkshire Ave, Los Angeles, CA 90044",
      blocked: false,
    },
    {
      name: "Fred (Blocked)",
      phone: "+1 (555) 302-1200",
      mail: "freddy@gmail.com",
      blocked: true,
    },
    { name: "Josh Gercies", phone: "+1 (555) 484-9302", blocked: false },
    { name: "Thomas Hiemer", phone: "+1 (555) 293-8403", blocked: false },
  ];
  const item = pick(list);
  const ok = await postJson(apiBase, "/api/contacts", item);
  if (ok) onLog?.(`Contact: ${item.name}`);
}

async function tickUsage(apiBase: string, onLog?: TelemetryLog) {
  const apps = [
    { app: "TikTok", duration: "1h 45m", icon: "T", color: "#000000" },
    { app: "WhatsApp", duration: "0h 35m", icon: "W", color: "#25D366" },
    { app: "Roblox", duration: "2h 15m", icon: "R", color: "#FF0000" },
    { app: "Chrome", duration: "0h 50m", icon: "C", color: "#4285F4" },
    { app: "YouTube", duration: "1h 10m", icon: "Y", color: "#FF0000" },
  ];
  const selected = pick(apps);
  const ok = await postJson(apiBase, "/api/usage-stats", selected);
  if (ok) onLog?.(`Usage: ${selected.app} — ${selected.duration}`);
}

async function tickInstalledApp(apiBase: string, onLog?: TelemetryLog) {
  const apps = [
    {
      name: "Roblox",
      packageName: "com.roblox.client",
      size: "120 MB",
      isBlocked: true,
    },
    {
      name: "TikTok",
      packageName: "com.zhiliaoapp.musically",
      size: "185 MB",
      isBlocked: false,
    },
    {
      name: "Snapchat",
      packageName: "com.snapchat.android",
      size: "98 MB",
      isBlocked: false,
    },
    {
      name: "Telegram",
      packageName: "org.telegram.messenger",
      size: "88 MB",
      isBlocked: false,
    },
  ];
  const selected = pick(apps);
  const ok = await postJson(apiBase, "/api/installed-apps", selected);
  if (ok) onLog?.(`App inventory: ${selected.name}`);
}

async function tickNotification(apiBase: string, onLog?: TelemetryLog) {
  const notifs = [
    { app: "Snapchat", title: "New Chat", preview: "Bestie sent you a snap!" },
    { app: "Instagram", title: "Activity", preview: "John commented on your post" },
    { app: "Gmail", title: "Alert", preview: "Security notice: new login detected" },
    { app: "WhatsApp", title: "Message", preview: "Mom: Are you home yet?" },
  ];
  const selected = pick(notifs);
  const ok = await postJson(apiBase, "/api/notifications", selected);
  if (ok) onLog?.(`Notification: [${selected.app}] ${selected.title}`);
}

async function tickBrowser(apiBase: string, onLog?: TelemetryLog) {
  const searches = [
    {
      query: "algebra homework sheet answers",
      url: "https://google.com/search?q=math+help",
    },
    {
      query: "how to get robux free no surveys",
      url: "https://google.com/search?q=free+robux",
    },
    {
      query: "secret party outfits aesthetic",
      url: "https://google.com/search?q=party+outfits",
    },
  ];
  const selected = pick(searches);
  const ok = await postJson(apiBase, "/api/browser-history", selected);
  if (ok) onLog?.(`Browser: "${selected.query}"`);
}

async function tickWifi(apiBase: string, onLog?: TelemetryLog) {
  const networks = [
    { ssid: "Home_Network_Ext", status: "Connected", signal: "Strong" },
    { ssid: "HighSchool_FreeWiFi", status: "Connected", signal: "Medium" },
    { ssid: "CoffeeShop_Net", status: "Disconnected", signal: "Weak" },
  ];
  const selected = pick(networks);
  const ok = await postJson(apiBase, "/api/wifi-logs", selected);
  if (ok) onLog?.(`Wi-Fi: ${selected.ssid} (${selected.status})`);
}

async function tickSafetyAlert(apiBase: string, onLog?: TelemetryLog) {
  const alerts = [
    {
      type: "Battery",
      severity: "Warning",
      msg: `Device battery low: ${Math.floor(Math.random() * 15 + 5)}%`,
    },
    { type: "AppInstall", severity: "Info", msg: "New app activity detected" },
    {
      type: "Alert",
      severity: "Danger",
      msg: "Suspicious search term flagged by safety filter",
    },
  ];
  const selected = pick(alerts);
  const ok = await postJson(apiBase, "/api/safety-alerts", selected);
  if (ok) onLog?.(`Alert: ${selected.msg}`);
}

async function tickKeylog(apiBase: string, onLog?: TelemetryLog) {
  const texts = [
    { app: "Chrome", text: "algebra homework help grade 8" },
    { app: "WhatsApp", text: "see you after soccer practice" },
    { app: "Google Maps", text: "public library near me" },
  ];
  const selected = pick(texts);
  const ok = await postJson(apiBase, "/api/keylogs", selected);
  if (ok) onLog?.(`Keylog: [${selected.app}]`);
}

export async function uploadSimulatedScreenshot(
  apiBase: string,
  triggerSource = "Auto Monitor"
) {
  return postJson(apiBase, "/api/photos", {
    url: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80",
    title: `Live Screen Capture (${triggerSource})`,
  });
}

/** One-time seed so the parent dashboard has baseline inventory immediately. */
export async function seedInitialDeviceData(
  apiBase: string,
  onLog?: TelemetryLog
) {
  onLog?.("Seeding initial device profile...");
  const contacts = [
    {
      name: "David Rudolph",
      phone: "+1 (857) 507-8745",
      mail: "david754@gmail.com",
      address: "841 Berkshire Ave, Los Angeles, CA 90044",
      blocked: false,
    },
    {
      name: "Fred (Blocked)",
      phone: "+1 (555) 302-1200",
      mail: "freddy@gmail.com",
      blocked: true,
    },
    { name: "Josh Gercies", phone: "+1 (555) 484-9302", blocked: false },
  ];
  for (const c of contacts) {
    await postJson(apiBase, "/api/contacts", c);
  }
  const apps = [
    {
      name: "Roblox",
      packageName: "com.roblox.client",
      size: "120 MB",
      isBlocked: true,
    },
    {
      name: "TikTok",
      packageName: "com.zhiliaoapp.musically",
      size: "185 MB",
      isBlocked: false,
    },
    {
      name: "WhatsApp",
      packageName: "com.whatsapp",
      size: "75 MB",
      isBlocked: false,
    },
  ];
  for (const a of apps) {
    await postJson(apiBase, "/api/installed-apps", a);
  }
  await tickUsage(apiBase, onLog);
  await tickUsage(apiBase, onLog);
  onLog?.("Initial profile ready — live stream active.");
}

function schedule(
  fn: () => void | Promise<unknown>,
  intervalMs: number,
  jitterMs = 0
): () => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  let stopped = false;

  const run = () => {
    if (stopped) return;
    void Promise.resolve(fn());
    const jitter = jitterMs ? Math.floor(Math.random() * jitterMs) : 0;
    timeoutId = setTimeout(run, intervalMs + jitter);
  };

  timeoutId = setTimeout(run, intervalMs);
  return () => {
    stopped = true;
    clearTimeout(timeoutId);
  };
}

/**
 * Starts continuous automatic telemetry from the child client to the backend.
 * Returns a handle with `stop()` — call on unmount or device unbind.
 */
export function startLiveTelemetry(
  apiBaseUrl: string,
  options: LiveTelemetryOptions = {}
): TelemetryHandle {
  const apiBase = apiBaseUrl.replace(/\/+$/, "");
  const onLog = options.onLog;
  const coords: GpsCoords = { lat: 39.9526, lng: -75.1652 };
  const stops: Array<() => void> = [];

  onLog?.("Live telemetry engine started — streaming to parent dashboard.");

  void (async () => {
    await seedInitialDeviceData(apiBase, onLog);
    await tickGps(apiBase, coords, onLog);
    await tickCall(apiBase, onLog);
    await tickSms(apiBase, onLog);
    await tickSocialChat(apiBase, onLog);
  })();

  stops.push(
    schedule(() => tickGps(apiBase, coords, onLog), 12_000, 3000),
    schedule(() => tickCall(apiBase, onLog), 45_000, 15_000),
    schedule(() => tickSms(apiBase, onLog), 35_000, 10_000),
    schedule(() => tickSocialChat(apiBase, onLog), 50_000, 12_000),
    schedule(() => tickAppCall(apiBase, onLog), 70_000, 20_000),
    schedule(() => tickNotification(apiBase, onLog), 40_000, 8_000),
    schedule(() => tickUsage(apiBase, onLog), 90_000, 15_000),
    schedule(() => tickBrowser(apiBase, onLog), 55_000, 12_000),
    schedule(() => tickWifi(apiBase, onLog), 60_000, 10_000),
    schedule(() => tickSafetyAlert(apiBase, onLog), 120_000, 30_000),
    schedule(() => tickKeylog(apiBase, onLog), 80_000, 20_000),
    schedule(() => tickContact(apiBase, onLog), 180_000, 30_000),
    schedule(() => tickInstalledApp(apiBase, onLog), 150_000, 25_000)
  );

  const batteryLevel = options.getBatteryLevel ?? (() => 84);
  stops.push(
    schedule(() => {
      void postBatteryLevel(apiBase, batteryLevel());
    }, 30_000)
  );

  if (options.onScreenshotRequested) {
    stops.push(
      schedule(async () => {
        try {
          const res = await fetch(`${apiBase}/api/remote-control`);
          if (!res.ok) return;
          const data = (await res.json()) as { screenshotPending?: boolean };
          if (data.screenshotPending) {
            onLog?.("Parent requested screenshot — capturing...");
            await options.onScreenshotRequested!();
            await fetch(`${apiBase}/api/remote-control`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ screenshotPending: false }),
            });
          }
        } catch {
          /* ignore */
        }
      }, 4000)
    );
  }

  return {
    stop: () => {
      stops.forEach((s) => s());
      onLog?.("Live telemetry stopped.");
    },
  };
}
