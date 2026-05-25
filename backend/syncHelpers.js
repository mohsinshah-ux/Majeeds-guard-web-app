/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * When the child device reports GPS, detect geofence enter/exit vs parent-defined fences.
 */
export function processGeofenceForLocation(
  lat,
  lng,
  geofences,
  fenceState,
  realGeofenceEvents,
  realSafetyAlerts,
  deviceId = null
) {
  for (const fence of geofences) {
    if (!fence.enabled) continue;
    const dist = distanceMeters(lat, lng, fence.lat, fence.lng);
    const inside = dist <= (fence.radiusM ?? 250);
    const prev = fenceState[fence.id];
    const next = inside ? "inside" : "outside";

    if (prev === undefined) {
      fenceState[fence.id] = next;
      continue;
    }
    if (prev === next) continue;

    fenceState[fence.id] = next;
    const eventType = inside ? "entered" : "exited";
    const time = new Date().toISOString();
    const event = {
      id: realGeofenceEvents.length + 1,
      type: eventType,
      fenceName: fence.name,
      fenceId: fence.id,
      lat,
      lng,
      time,
      displayTime: time.replace("T", " ").slice(0, 19),
      ...(deviceId ? { deviceId } : {})
    };
    realGeofenceEvents.unshift(event);
    realSafetyAlerts.unshift({
      id: realSafetyAlerts.length + 1,
      type: "Geofence",
      severity: inside ? "Info" : "Warning",
      msg: `Child ${eventType} geofence: ${fence.name}`,
      time,
      ...(deviceId ? { deviceId } : {})
    });
  }
}

/** Scan text from child telemetry for parent-tracked keywords. */
export function scanForKeywords(text, detectedIn, trackedKeywords, realKeywordAlerts, deviceId = null) {
  if (!text || typeof text !== "string") return;
  const lower = text.toLowerCase();
  for (const keyword of trackedKeywords) {
    const kw = keyword.trim().toLowerCase();
    if (!kw || !lower.includes(kw)) continue;
    const exists = realKeywordAlerts.some(
      (a) =>
        a.keyword === kw &&
        a.message === text &&
        (!deviceId || a.deviceId === deviceId) &&
        Math.abs(new Date(a.time).getTime() - Date.now()) < 60000
    );
    if (exists) continue;
    realKeywordAlerts.unshift({
      id: realKeywordAlerts.length + 1,
      keyword: kw,
      detectedIn: detectedIn || "Device",
      message: text.length > 120 ? text.slice(0, 120) + "…" : text,
      time: new Date().toISOString(),
      ...(deviceId ? { deviceId } : {})
    });
  }
}

/** Re-scan all stored child telemetry when parent updates monitored keywords. */
export function rescanStoredDataForKeywords(trackedKeywords, stores, deviceId = null) {
  const {
    realMessages,
    realSocialChats,
    realNotifications,
    realBrowserHistory,
    realKeylogs,
    realKeywordAlerts
  } = stores;

  for (const m of realMessages) {
    scanForKeywords(m.preview, m.from || "SMS", trackedKeywords, realKeywordAlerts, deviceId);
  }
  for (const c of realSocialChats) {
    scanForKeywords(c.preview, `${c.app} chat`, trackedKeywords, realKeywordAlerts, deviceId);
  }
  for (const n of realNotifications) {
    scanForKeywords(`${n.title} ${n.preview}`, n.app || "Notification", trackedKeywords, realKeywordAlerts, deviceId);
  }
  for (const b of realBrowserHistory) {
    scanForKeywords(`${b.query} ${b.url}`, "Browser", trackedKeywords, realKeywordAlerts, deviceId);
  }
  for (const k of realKeylogs) {
    scanForKeywords(k.text, k.app || "Keyboard", trackedKeywords, realKeywordAlerts, deviceId);
  }
}
