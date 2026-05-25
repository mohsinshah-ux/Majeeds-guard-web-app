const STORAGE_KEY = 'kidsguard_selected_device_id';

export const DEVICE_CHANGED_EVENT = 'kidsguard-device-changed';

export function getSelectedDeviceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedDeviceId(deviceId: string | null) {
  try {
    if (deviceId) {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(DEVICE_CHANGED_EVENT, { detail: deviceId })
    );
  } catch {
    // ignore
  }
}
