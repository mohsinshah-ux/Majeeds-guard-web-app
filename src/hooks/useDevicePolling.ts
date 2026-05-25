import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDevices } from '@/lib/api';
import { getSelectedDeviceId, DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';

/** Polls whether a child device is selected and bound. */
export function useHasBoundDevice(pollMs = 5000) {
  const [hasDevice, setHasDevice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(() => getSelectedDeviceId());

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const id = getSelectedDeviceId();
      setSelectedId(id);
      if (!id) {
        setHasDevice(false);
        return;
      }
      const devices = await fetchDevices();
      setHasDevice(devices.some((d) => d.id === id));
    } catch {
      setHasDevice(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const interval = setInterval(() => void refresh(true), pollMs);
    const onDeviceChange = () => void refresh(false);
    window.addEventListener(DEVICE_CHANGED_EVENT, onDeviceChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onDeviceChange);
    };
  }, [refresh, pollMs]);

  return { hasDevice, loading, refresh, selectedDeviceId: selectedId };
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
