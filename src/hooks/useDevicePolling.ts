import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';

/** Whether a child device is selected (uses shared device context). */
export function useHasBoundDevice(pollMs = 5000) {
  const { selectedDeviceId, devices, loading, refreshDevices } = useSelectedDevice();
  const hasDevice = Boolean(selectedDeviceId && devices.some((d) => d.id === selectedDeviceId));

  useEffect(() => {
    const interval = setInterval(() => void refreshDevices(), pollMs);
    return () => clearInterval(interval);
  }, [refreshDevices, pollMs]);

  return {
    hasDevice,
    loading,
    refresh: refreshDevices,
    selectedDeviceId,
  };
}

/** Loads API data on interval for the currently selected child device only. */
export function useDevicePolling<T>(
  loader: () => Promise<T>,
  initialValue: T,
  pollMs = 5000
) {
  const { hasDevice, loading: deviceLoading, selectedDeviceId } = useHasBoundDevice(pollMs);
  const initialRef = useRef(initialValue);
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoadDone = useRef(false);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!hasDevice || !selectedDeviceId) {
        setData(initialRef.current);
        setError(null);
        if (showSpinner) setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const result = await loader();
        setData(result);
        setError(null);
      } catch {
        setError('Failed to load data from child device.');
      } finally {
        if (showSpinner) setLoading(false);
        firstLoadDone.current = true;
      }
    },
    [hasDevice, selectedDeviceId, loader]
  );

  useEffect(() => {
    firstLoadDone.current = false;
    if (!hasDevice || !selectedDeviceId) {
      setData(initialRef.current);
      setLoading(false);
      return;
    }
    void load(true);
    const interval = setInterval(() => void load(false), pollMs);
    const onDeviceChange = () => {
      firstLoadDone.current = false;
      void load(true);
    };
    window.addEventListener(DEVICE_CHANGED_EVENT, onDeviceChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onDeviceChange);
    };
  }, [hasDevice, selectedDeviceId, load, pollMs]);

  const reload = useCallback(() => load(true), [load]);

  return {
    data,
    hasDevice,
    selectedDeviceId,
    loading: loading || deviceLoading,
    error,
    reload,
    isRefreshing: hasDevice && firstLoadDone.current && !loading,
  };
}
