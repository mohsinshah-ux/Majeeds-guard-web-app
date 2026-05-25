import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchDevices, type Device } from '@/lib/api';
import { getSelectedDeviceId, setSelectedDeviceId, DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';

type SelectedDeviceContextValue = {
  devices: Device[];
  selectedDevice: Device | null;
  selectedDeviceId: string | null;
  setSelectedDevice: (device: Device | null) => void;
  registerPairedDevice: (device: Device) => void;
  refreshDevices: () => Promise<Device[]>;
  loading: boolean;
  refreshError: string | null;
};

const SelectedDeviceContext = createContext<SelectedDeviceContextValue | null>(null);

export function SelectedDeviceProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(
    () => getSelectedDeviceId()
  );
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const devicesRef = useRef<Device[]>([]);

  const applySelection = useCallback((list: Device[]) => {
    // Empty list can be a cold-start blip on Vercel — keep the last selected device id.
    if (list.length === 0) return;
    const stored = getSelectedDeviceId();
    const match = stored ? list.find((d) => d.id === stored) : null;
    const next = match ?? list[0]!;
    if (next.id !== stored) {
      setSelectedDeviceId(next.id);
    }
    setSelectedDeviceIdState(next.id);
  }, []);

  const refreshDevices = useCallback(async (): Promise<Device[]> => {
    try {
      const list = await fetchDevices();
      if (!Array.isArray(list)) {
        throw new Error('Invalid devices response');
      }
      devicesRef.current = list;
      setDevices(list);
      setRefreshError(null);
      applySelection(list);
      return list;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load devices';
      setRefreshError(message);
      // Keep last known devices on transient API errors (do not wipe the list)
      return devicesRef.current;
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  useEffect(() => {
    void refreshDevices();
    const interval = setInterval(() => void refreshDevices(), 5000);
    return () => clearInterval(interval);
  }, [refreshDevices]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string | null>).detail ?? getSelectedDeviceId();
      setSelectedDeviceIdState(id);
    };
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
  }, []);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  );

  const setSelectedDevice = useCallback((device: Device | null) => {
    setSelectedDeviceId(device?.id ?? null);
    setSelectedDeviceIdState(device?.id ?? null);
  }, []);

  const registerPairedDevice = useCallback((device: Device) => {
    setDevices((prev) => {
      if (prev.some((d) => d.id === device.id)) return prev;
      const next = [...prev, device];
      devicesRef.current = next;
      return next;
    });
    setSelectedDeviceId(device.id);
    setSelectedDeviceIdState(device.id);
  }, []);

  const value = useMemo(
    () => ({
      devices,
      selectedDevice,
      selectedDeviceId,
      setSelectedDevice,
      registerPairedDevice,
      refreshDevices,
      loading,
      refreshError,
    }),
    [devices, selectedDevice, selectedDeviceId, setSelectedDevice, registerPairedDevice, refreshDevices, loading, refreshError]
  );

  return (
    <SelectedDeviceContext.Provider value={value}>{children}</SelectedDeviceContext.Provider>
  );
}

export function useSelectedDevice() {
  const ctx = useContext(SelectedDeviceContext);
  if (!ctx) {
    throw new Error('useSelectedDevice must be used within SelectedDeviceProvider');
  }
  return ctx;
}
