import { useCallback, useMemo, useState } from 'react';
import { PageTitle, Card, Tabs } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchBrowserHistory, fetchUsageStats, requestHistoricalSync } from '@/lib/api';
import type { BrowserHistoryRecord, UsageStat } from '@/lib/api';
import { useEffect } from 'react';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';

const VIDEO_APPS = ['YouTube', 'TikTok', 'ReelShort', 'Chrome'] as const;

type VideoData = { history: BrowserHistoryRecord[]; usage: UsageStat[] };

export function VideoAppsPage() {
  const { selectedDeviceId } = useSelectedDevice();
  const [activeApp, setActiveApp] = useState<(typeof VIDEO_APPS)[number]>('YouTube');

  const loader = useCallback(async (): Promise<VideoData> => {
    const [history, usage] = await Promise.all([fetchBrowserHistory(), fetchUsageStats()]);
    return { history, usage };
  }, []);

  const { data, loading, reload } = useDevicePolling(loader, { history: [], usage: [] });

  useEffect(() => {
    if (!selectedDeviceId) return;
    void requestHistoricalSync();
  }, [selectedDeviceId]);

  const appKey = activeApp.toLowerCase();
  const watchRows = useMemo(
    () =>
      data.history.filter(
        (h) =>
          h.url.toLowerCase().includes(appKey) ||
          h.query.toLowerCase().includes(appKey) ||
          (appKey === 'youtube' && (h.url.includes('youtube') || h.query.toLowerCase().includes('youtube')))
      ),
    [data.history, appKey]
  );

  const usageRow = useMemo(
    () => data.usage.find((u) => u.app.toLowerCase().includes(appKey)),
    [data.usage, appKey]
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Video Apps" showInfo />
      <DeviceDataShell>
        <Tabs
          tabs={VIDEO_APPS.map((app) => ({
            id: app,
            label: app,
            content: (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap items-center">
                  {VIDEO_APPS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setActiveApp(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${
                        activeApp === a ? 'bg-[#052e16] text-emerald-400' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                  <button type="button" onClick={() => reload()} className="text-xs text-emerald-400 ml-auto hover:underline">
                    Refresh
                  </button>
                </div>
                <Card className="p-4">
                  {loading ? (
                    <p className="text-sm text-slate-400">Loading from child device…</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="text-slate-400 text-xs">Videos / searches</div>
                        <div className="text-[#22c55e] font-semibold">{watchRows.length}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs">Screen time (7d)</div>
                        <div className="text-[#22c55e] font-semibold">{usageRow?.duration ?? '—'}</div>
                      </div>
                    </div>
                  )}
                  {watchRows.length === 0 && !loading ? (
                    <EmptyState
                      title={`No ${activeApp} activity yet`}
                      description="Browser history and usage stats sync from the child phone after pairing."
                    />
                  ) : (
                    <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                      {watchRows.map((r) => (
                        <li key={r.id} className="text-sm border-b border-slate-800 pb-2">
                          <span className="text-slate-400 text-xs">{r.time.slice(0, 19).replace('T', ' ')}</span>
                          <p className="text-[#e5ffe5] break-all">{r.query || r.url}</p>
                          {r.url && <p className="text-[10px] text-slate-600 truncate">{r.url}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            ),
          }))}
          defaultTab="YouTube"
        />
      </DeviceDataShell>
    </div>
  );
}
