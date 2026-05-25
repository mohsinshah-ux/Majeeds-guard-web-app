import { PageTitle, Card, Button } from '@/components/ui';
import { Monitor } from 'lucide-react';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestLiveScreen } from '@/lib/api';

export function LiveScreenPage() {
  const { data: shots, loading, reload } = useDevicePolling(
    () => fetchPhotos('live_screen'),
    []
  );
  const latest = shots[0];

  return (
    <div className="space-y-4">
      <PageTitle title="Live Screen" showInfo />
      <DeviceDataShell>
        <Card className="bg-[#0f172a] border-slate-700 flex flex-col items-center justify-center py-10">
          <div className="w-56 min-h-[340px] rounded-[32px] border border-slate-700 bg-[#020617] flex items-center justify-center mb-6 overflow-hidden">
            {latest && (latest.url.startsWith('http') || latest.url.startsWith('data:image')) ? (
              <img src={latest.url} alt="Latest live capture" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400 p-4">
                <Monitor className="w-8 h-8 text-[#22c55e]" />
                <p className="text-xs text-center">Tap Start Live to request a fresh frame from the child device.</p>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            className="px-10 bg-[#22c55e] hover:bg-[#16a34a] text-black"
            disabled={loading}
            onClick={async () => {
              await requestLiveScreen();
              setTimeout(() => reload(), 6000);
            }}
          >
            Start Live
          </Button>
          {latest && (
            <p className="mt-3 text-xs text-slate-500">
              Last: {latest.title} — {latest.time.replace('T', ' ').slice(0, 19)}
            </p>
          )}
        </Card>
        {!loading && !latest && (
          <EmptyState title="No live capture yet" description="Child app responds within a few seconds when online." />
        )}
      </DeviceDataShell>
    </div>
  );
}
