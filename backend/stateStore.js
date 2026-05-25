import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "data");
const stateFile = path.join(stateDir, "kidsguard-state.json");

function mapToObject(map) {
  return Object.fromEntries(map);
}

function objectToMap(obj) {
  const map = new Map();
  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
  }
  return map;
}

/**
 * Snapshot in-memory stores for persistence on Vercel (serverless /tmp).
 */
export function createStateSnapshot(stores) {
  return {
    deviceInvites: mapToObject(stores.deviceInvites),
    boundDevices: stores.boundDevices,
    remoteControlByDevice: mapToObject(stores.remoteControlByDevice),
    geofenceStateByDevice: stores.geofenceStateByDevice,
    geofences: stores.geofences,
    trackedKeywords: stores.trackedKeywords,
    realLocations: stores.realLocations,
    realCallLogs: stores.realCallLogs,
    realMessages: stores.realMessages,
    realSocialChats: stores.realSocialChats,
    realContacts: stores.realContacts,
    realUsageStats: stores.realUsageStats,
    realInstalledApps: stores.realInstalledApps,
    realNotifications: stores.realNotifications,
    realBrowserHistory: stores.realBrowserHistory,
    realWifiLogs: stores.realWifiLogs,
    realSafetyAlerts: stores.realSafetyAlerts,
    realPhotos: stores.realPhotos,
    realKeylogs: stores.realKeylogs,
    realAppCalls: stores.realAppCalls,
    realCalendarEvents: stores.realCalendarEvents,
    realGeofenceEvents: stores.realGeofenceEvents,
    realKeywordAlerts: stores.realKeywordAlerts,
    realCallRecordings: stores.realCallRecordings
  };
}

export function applyStateSnapshot(stores, snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;

  stores.deviceInvites.clear();
  for (const [key, value] of Object.entries(snapshot.deviceInvites ?? {})) {
    stores.deviceInvites.set(key, value);
  }

  stores.boundDevices.length = 0;
  for (const device of snapshot.boundDevices ?? []) {
    stores.boundDevices.push(device);
  }

  stores.remoteControlByDevice.clear();
  const remote = objectToMap(snapshot.remoteControlByDevice);
  for (const [key, value] of remote) {
    stores.remoteControlByDevice.set(key, value);
  }

  Object.assign(stores.geofenceStateByDevice, snapshot.geofenceStateByDevice ?? {});

  if (Array.isArray(snapshot.geofences) && snapshot.geofences.length > 0) {
    stores.geofences.length = 0;
    stores.geofences.push(...snapshot.geofences);
  }

  if (Array.isArray(snapshot.trackedKeywords)) {
    stores.trackedKeywords.length = 0;
    stores.trackedKeywords.push(...snapshot.trackedKeywords);
  }

  const arrayFields = [
    ["realLocations", stores.realLocations],
    ["realCallLogs", stores.realCallLogs],
    ["realMessages", stores.realMessages],
    ["realSocialChats", stores.realSocialChats],
    ["realContacts", stores.realContacts],
    ["realUsageStats", stores.realUsageStats],
    ["realInstalledApps", stores.realInstalledApps],
    ["realNotifications", stores.realNotifications],
    ["realBrowserHistory", stores.realBrowserHistory],
    ["realWifiLogs", stores.realWifiLogs],
    ["realSafetyAlerts", stores.realSafetyAlerts],
    ["realPhotos", stores.realPhotos],
    ["realKeylogs", stores.realKeylogs],
    ["realAppCalls", stores.realAppCalls],
    ["realCalendarEvents", stores.realCalendarEvents],
    ["realGeofenceEvents", stores.realGeofenceEvents],
    ["realKeywordAlerts", stores.realKeywordAlerts],
    ["realCallRecordings", stores.realCallRecordings]
  ];

  for (const [key, target] of arrayFields) {
    target.length = 0;
    const items = snapshot[key];
    if (Array.isArray(items)) {
      target.push(...items);
    }
  }
}

export function loadPersistedState(stores) {
  if (!process.env.VERCEL) return;
  try {
    if (!fs.existsSync(stateFile)) return;
    const raw = fs.readFileSync(stateFile, "utf8");
    const snapshot = JSON.parse(raw);
    applyStateSnapshot(stores, snapshot);
  } catch (err) {
    console.warn("Failed to load persisted state:", err instanceof Error ? err.message : err);
  }
}

export function savePersistedState(stores) {
  if (!process.env.VERCEL) return;
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    const snapshot = createStateSnapshot(stores);
    fs.writeFileSync(stateFile, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("Failed to save persisted state:", err instanceof Error ? err.message : err);
  }
}
