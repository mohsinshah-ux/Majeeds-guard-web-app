import { useEffect, useMemo, useState } from 'react';
import { PageTitle, Card } from '@/components/ui';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchGeofenceEvents, fetchGeofences } from '@/lib/api';
import type { GeofenceEventRecord, GeofenceRecord } from '@/lib/api';

export function GeofencePage() {
  const { data: events, hasDevice, loading } = useDevicePolling(
    fetchGeofenceEvents,
    [] as GeofenceEventRecord[]
  );
  const [fences, setFences] = useState<GeofenceRecord[]>([]);

  useEffect(() => {
    if (!hasDevice) {
      setFences([]);
      return;
    }
    fetchGeofences().then(setFences).catch(() => setFences([]));
    const interval = setInterval(() => {
      fetchGeofences().then(setFences).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [hasDevice]);

  const [activeFence, setActiveFence] = useState<string>('');

  const fenceNames = useMemo(() => {
    const fromEvents = [...new Set(events.map((e) => e.fenceName))];
    const fromDefs = fences.map((f) => f.name);
    return [...new Set([...fromDefs, ...fromEvents])];
  }, [events, fences]);

  const currentFence = activeFence || fenceNames[0] || '';
  const filtered = useMemo(
    () => events.filter((e) => e.fenceName === currentFence),
    [events, currentFence]
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Geofence" showInfo />
      <DeviceDataShell
        emptyDescription="Child GPS updates trigger enter/exit events when they cross Home, School, or other fences."
      >
        {loading ? (
          <p className="text-sm text-slate-400">Loading geofence activity…</p>
        ) : fenceNames.length === 0 && events.length === 0 ? (
          <EmptyState
            title="Waiting for location data"
            description="Grant Location on the child phone. Events appear when they enter or leave a geofence (Home, School)."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4 p-0 overflow-hidden bg-[#0f172a] border-slate-700">
              <div className="p-3 border-b border-slate-800 text-sm font-semibold text-[#e5ffe5]">
                Monitored fences
              </div>
              <div className="p-2 space-y-1">
                {fenceNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveFence(name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      currentFence === name ? 'bg-[#052e16] text-[#4ade80]' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </Card>
            <Card className="lg:col-span-8 p-0 overflow-hidden">
              <div className="p-3 border-b border-slate-800 text-sm font-semibold text-[#e5ffe5]">
                Events — {currentFence || 'All'}
              </div>
              <div className="divide-y divide-slate-800">
                {filtered.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
                    {e.type === 'entered' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                    )}
                    <div className="flex-1">
                      <span className="text-[#e5ffe5] font-medium capitalize">{e.type}</span>
                      <span className="text-slate-400"> — {e.fenceName}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{e.displayTime}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="p-6 text-center text-xs text-slate-500 italic">No enter/exit events for this fence yet.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </DeviceDataShell>
    </div>
  );
}
