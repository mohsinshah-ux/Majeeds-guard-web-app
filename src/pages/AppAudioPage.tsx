import { useCallback, useEffect } from 'react';
import { PageTitle, Card } from '@/components/ui';
import { Mic, CalendarDays, RefreshCw, Download } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchAppCalls, fetchPhotos, downloadMediaUrl, requestHistoricalSync } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import type { BackendAppCall, PhotoRecord } from '@/lib/api';

type AppAudioData = {
  calls: BackendAppCall[];
  recordings: PhotoRecord[];
};

export function AppAudioPage() {
  const { selectedDeviceId } = useSelectedDevice();
  const loader = useCallback(async (): Promise<AppAudioData> => {
    const [calls, recordings] = await Promise.all([
      fetchAppCalls(),
      fetchPhotos('audio'),
    ]);
    return { calls, recordings };
  }, []);

  const { data, loading, reload } = useDevicePolling(loader, { calls: [], recordings: [] });

  useEffect(() => {
    if (!selectedDeviceId) return;
    void requestHistoricalSync();
  }, [selectedDeviceId]);

  const hasItems = data.calls.length > 0 || data.recordings.length > 0;

  return (
    <div className="space-y-4">
      <PageTitle title="App Audio" showInfo />
      <p className="text-xs text-slate-500">
        App call events and ambient audio clips from the child device (notifications + surround recordings).
      </p>
      <div className="flex justify-end">
        <button type="button" onClick={() => reload()} className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {loading && !hasItems ? (
        <p className="text-sm text-slate-400">Loading audio events…</p>
      ) : !hasItems ? (
        <EmptyState
          title="No app audio yet"
          description="Enable Notification and Microphone on the child phone. App calls and surround recordings appear here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.recordings.map((rec) => (
            <Card key={`rec-${rec.id}`} className="bg-[#0f172a] border-slate-700 p-4">
              <div className="text-sm font-semibold text-[#e5ffe5] mb-2">{rec.title}</div>
              {rec.url.startsWith('data:audio') && (
                <audio controls src={rec.url} className="w-full mb-2" />
              )}
              <button
                type="button"
                onClick={() => downloadMediaUrl(rec.url, `audio-${rec.id}.m4a`)}
                className="text-[10px] text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              <p className="text-[10px] text-slate-500 mt-2">{rec.time.slice(0, 19).replace('T', ' ')}</p>
            </Card>
          ))}
          {data.calls.map((it) => (
            <Card key={`call-${it.id}`} className="bg-[#0f172a] border-slate-700 p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#052e16] border border-[#16a34a]/40 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#e5ffe5]">{it.name}</div>
                  <div className="text-xs text-slate-400">
                    {it.app || 'App'} · {it.type} — {it.duration}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <CalendarDays className="w-3 h-3" />
                    {it.startTime}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-slate-500">VoIP call event (notification metadata)</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
