/**
 * Fast Vercel routes — bypass Express/serverless-http (avoids cold-start hangs).
 */
import {
  resolveQueryDeviceId,
  resolveUploadDeviceId,
  filterByDevice,
  getRemoteControlForDevice
} from "./deviceHelpers.js";
import { isRedisConfigured } from "./persistence.js";
import { createInvitation, redeemInvitation } from "./pairing.js";
import {
  boundDevices,
  geofences,
  geofenceStateByDevice,
  realAppCalls,
  realBrowserHistory,
  realCallLogs,
  realCalendarEvents,
  realContacts,
  realGeofenceEvents,
  realInstalledApps,
  realKeylogs,
  realKeywordAlerts,
  realLocations,
  realMessages,
  realNotifications,
  realPhotos,
  realSafetyAlerts,
  realSocialChats,
  realUsageStats,
  realWifiLogs,
  remoteControlByDevice
} from "./stores.js";
import { processGeofenceForLocation } from "./syncHelpers.js";

const emptyDashboard = {
  overviewStats: [
    { label: "Calls", value: 0, change: "—" },
    { label: "Messages", value: 0, change: "—" },
    { label: "Locations", value: 0, change: "—" },
    { label: "Alerts", value: 0, change: "—" }
  ],
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

export function getRequestPath(req) {
  const raw = req.url || "/";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return raw.split("?")[0] || "/";
  }
}

export function getRequestQuery(req) {
  const raw = req.url || "/";
  try {
    return Object.fromEntries(new URL(raw, "http://localhost").searchParams);
  } catch {
    const q = raw.indexOf("?");
    if (q === -1) return {};
    return Object.fromEntries(new URLSearchParams(raw.slice(q + 1)));
  }
}

export async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString("utf8"));
      } catch {
        return {};
      }
    }
    if (typeof req.body === "object") return req.body;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function mockReq(req, body = {}) {
  return {
    headers: req.headers || {},
    query: getRequestQuery(req),
    body
  };
}

function forDevice(arr, deviceId) {
  return filterByDevice(arr, deviceId, boundDevices.length);
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function dashboardPayload(deviceId) {
  if (!deviceId) return emptyDashboard;
  return {
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
  };
}

const FAST_GET = {
  "/api/devices": () => [...boundDevices],
  "/api/dashboard": (req) => dashboardPayload(resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/call-logs": (req) => forDevice(realCallLogs, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/messages": (req) => forDevice(realMessages, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/locations": (req) => forDevice(realLocations, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/social-chats": (req) => forDevice(realSocialChats, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/contacts": (req) => forDevice(realContacts, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/usage-stats": (req) => forDevice(realUsageStats, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/installed-apps": (req) => forDevice(realInstalledApps, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/notifications": (req) => forDevice(realNotifications, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/browser-history": (req) => forDevice(realBrowserHistory, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/wifi-logs": (req) => forDevice(realWifiLogs, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/photos": (req) => forDevice(realPhotos, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/keylogs": (req) => forDevice(realKeylogs, resolveQueryDeviceId(mockReq(req), boundDevices)),
  "/api/remote-control": (req) => {
    const deviceId = resolveQueryDeviceId(mockReq(req), boundDevices);
    if (!deviceId) return null;
    return getRemoteControlForDevice(deviceId, remoteControlByDevice);
  }
};

async function handleTelemetryPost(path, req, res, body) {
  const m = mockReq(req, body);
  const deviceId = resolveUploadDeviceId(m, boundDevices);
  if (!deviceId) {
    sendJson(res, 401, { error: "Missing or invalid X-Device-Id header" });
    return true;
  }

  if (path === "/api/battery") {
    const { level } = body;
    if (typeof level === "number") {
      const dev = boundDevices.find((d) => d.id === deviceId);
      if (dev) dev.battery = level;
    }
    sendJson(res, 201, { success: true });
    return true;
  }

  if (path === "/api/locations") {
    const { lat, lng, place } = body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      sendJson(res, 400, { error: "lat and lng numbers are required" });
      return true;
    }
    if (!geofenceStateByDevice[deviceId]) geofenceStateByDevice[deviceId] = {};
    const entry = {
      id: realLocations.length + 1,
      deviceId,
      lat,
      lng,
      place: place || "Unknown",
      time: new Date().toISOString()
    };
    realLocations.unshift(entry);
    processGeofenceForLocation(
      lat,
      lng,
      geofences,
      geofenceStateByDevice[deviceId],
      realGeofenceEvents,
      realSafetyAlerts,
      deviceId
    );
    sendJson(res, 201, entry);
    return true;
  }

  if (path === "/api/call-logs") {
    const entry = {
      id: realCallLogs.length + 1,
      deviceId,
      contact: body.contact || "Unknown",
      number: body.number || "",
      type: body.type || "Incoming",
      duration: body.duration || "0:00",
      time: new Date().toISOString()
    };
    realCallLogs.unshift(entry);
    sendJson(res, 201, entry);
    return true;
  }

  if (path === "/api/messages") {
    const entry = {
      id: realMessages.length + 1,
      deviceId,
      from: body.from || "Unknown",
      channel: body.channel || "SMS",
      preview: body.preview || body.text || "",
      time: new Date().toISOString()
    };
    realMessages.unshift(entry);
    sendJson(res, 201, entry);
    return true;
  }

  if (path === "/api/contacts" && Array.isArray(body.contacts)) {
    for (const c of body.contacts) {
      realContacts.unshift({
        id: `${deviceId}-${realContacts.length + 1}`,
        deviceId,
        name: c.name || "Unknown",
        phone: c.phone || "",
        mail: c.mail || "",
        address: c.address || ""
      });
    }
    sendJson(res, 201, { success: true, count: body.contacts.length });
    return true;
  }

  if (path === "/api/usage-stats" && Array.isArray(body.stats)) {
    for (const s of body.stats) {
      realUsageStats.unshift({ ...s, deviceId });
    }
    sendJson(res, 201, { success: true });
    return true;
  }

  return false;
}

/**
 * @returns {Promise<boolean>} true if the request was handled
 */
export async function tryFastRoute(req, res) {
  const path = getRequestPath(req);
  const method = (req.method || "GET").toUpperCase();

  if (method === "GET" && (path === "/health" || path.endsWith("/health"))) {
    sendJson(res, 200, {
      status: "ok",
      service: "parental-control-backend",
      storage: isRedisConfigured() ? "redis" : "file_only",
      pairedDevices: boundDevices.length
    });
    return true;
  }

  if (method === "GET" && FAST_GET[path]) {
    const data = FAST_GET[path](req);
    if (data === null) {
      sendJson(res, 400, { error: "deviceId query required" });
    } else {
      sendJson(res, 200, data);
    }
    return true;
  }

  if (method === "POST" && path === "/api/device-invitations") {
    const body = await readJsonBody(req);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const result = createInvitation(label);
    sendJson(res, result.status, result.body);
    return true;
  }

  if (method === "POST" && path === "/api/pair/redeem") {
    const body = await readJsonBody(req);
    const token =
      (typeof body?.token === "string" && body.token.trim()) ||
      (typeof getRequestQuery(req).token === "string" && getRequestQuery(req).token.trim()) ||
      "";
    if (!token) {
      sendJson(res, 400, { error: "Pairing token is required" });
      return true;
    }
    const result = redeemInvitation(token, body);
    sendJson(res, result.status, result.body);
    return true;
  }

  if (method === "POST" && path.startsWith("/api/")) {
    const body = await readJsonBody(req);
    const handled = await handleTelemetryPost(path, req, res, body);
    if (handled) return true;
  }

  return false;
}
