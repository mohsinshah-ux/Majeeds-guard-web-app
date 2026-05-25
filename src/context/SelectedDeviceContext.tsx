import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  refreshDevices: () => Promise<void>;
  loading: boolean;
};

const SelectedDeviceContext = createContext<SelectedDeviceContextValue | null>(null);

export function SelectedDeviceProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(
    () => getSelectedDeviceId()
  );
  const [loading, setLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await fetchDevices();
      setDevices(list);

      if (list.length === 0) {
        setSelectedDeviceId(null);
        setSelectedDeviceIdState(null);
        return;
      }

      const stored = getSelectedDeviceId();
      const match = stored ? list.find((d) => d.id === stored) : null;
      const next = match ?? list[0]!;
      if (next.id !== stored) {
        setSelectedDeviceId(next.id);
      }
      setSelectedDeviceIdState(next.id);
    } catch {
      setDevices([]);
      setSelectedDeviceId(null);
      setSelectedDeviceIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const value = useMemo(
    () => ({
      devices,
      selectedDevice,
      selectedDeviceId,
      setSelectedDevice,
      refreshDevices,
      loading,
    }),
    [devices, selectedDevice, selectedDeviceId, setSelectedDevice, refreshDevices, loading]
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
