import { useEffect, useMemo, useState } from 'react';
import { PageTitle, Card, Table } from '@/components/ui';
import { PhoneCall, RefreshCw } from 'lucide-react';
import { fetchAppCalls, requestHistoricalSync } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import type { BackendAppCall } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

const apps = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'line', label: 'LINE' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'viber', label: 'Viber' },
];

export function AppCallsPage() {
  const [activeApp, setActiveApp] = useState(apps[0]!.id);
  const [realCalls, setRealCalls] = useState<BackendAppCall[]>([]);
  const { selectedDeviceId } = useSelectedDevice();
  const hasDevice = Boolean(selectedDeviceId);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      if (hasDevice) {
        const calls = await fetchAppCalls();
        setRealCalls(calls);
      } else {
        setRealCalls([]);
      }
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (hasDevice) await requestHistoricalSync();
      await loadData();
    })();
    const interval = setInterval(() => loadData(true), 5000);
    const onChange = () => void loadData();
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [hasDevice, selectedDeviceId]);

  const activeAppLabel = apps.find((a) => a.id === activeApp)?.label || '';

  const filteredData = useMemo(() => {
    if (!hasDevice) return [];
    return realCalls
      .filter((c) => {
        const appField = (c.app || c.phone || '').toLowerCase();
        return appField.includes(activeAppLabel.toLowerCase());
      })
      .map((c) => ({
        id: String(c.id),
        name: c.name,
        phone: c.phone,
        type: c.type,
        startTime: c.startTime,
        duration: c.duration,
        status: c.status,
      }));
  }, [hasDevice, realCalls, activeAppLabel]);

  const columns = useMemo(
    () => [
      { key: 'name' as const, header: 'Name' },
      { key: 'phone' as const, header: 'Contact' },
      { key: 'status' as const, header: 'Status' },
      { key: 'type' as const, header: 'Type' },
      { key: 'startTime' as const, header: 'Start Time' },
      { key: 'duration' as const, header: 'Duration' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageTitle title="App Calls" showInfo />
      <p className="text-xs text-slate-500">
        VoIP / app calls detected from social app notifications on the child device (historical + live).
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-3 p-0 overflow-hidden bg-[#0f172a] border-slate-700">
          <div className="p-3 border-b border-slate-800 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#22c55e]" />
            <div className="text-sm font-semibold text-[#e5ffe5]">Apps</div>
          </div>
          <div className="p-2 space-y-1">
            {apps.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActiveApp(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  a.id === activeApp ? 'bg-[#052e16] text-[#4ade80]' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
                  {a.label.slice(0, 1)}
                </span>
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-9 bg-[#0f172a] border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-[#e5ffe5]">{activeAppLabel}</div>
            <button type="button" onClick={() => loadData()} className="p-1 border border-slate-600 rounded text-slate-400">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {initialLoading ? (
            <p className="text-sm text-slate-400">Loading app calls…</p>
          ) : filteredData.length === 0 ? (
            <EmptyState title="No app calls" description="Call-related notifications from this app will appear here." />
          ) : (
            <Table columns={columns} data={filteredData} keyField="id" aria-label="App call logs" />
          )}
        </Card>
      </div>
    </div>
  );
}
