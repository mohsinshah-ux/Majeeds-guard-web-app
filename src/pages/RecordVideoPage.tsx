import { PageTitle, Card } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RemoteCapturePanel } from '@/components/RemoteCapturePanel';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestRecordVideo } from '@/lib/api';

export function RecordVideoPage() {
  const { data: items, loading, reload } = useDevicePolling(() => fetchPhotos('video'), []);

  return (
    <div className="space-y-4">
      <PageTitle title="Record Video" showInfo />
      <DeviceDataShell>
        <RemoteCapturePanel
          actionLabel="Sync video list from child"
          actionIcon="video"
          onRequest={requestRecordVideo}
          onRefresh={reload}
          loading={loading}
          photos={items}
          typeFilter="video"
          hint="Uploads video metadata from the child gallery (titles and dates)."
        />
        {!loading && items.length === 0 ? (
          <EmptyState title="No videos" description="Video entries appear when the child device has gallery access." />
        ) : (
          <Card className="p-4 mt-4">
            <ul className="space-y-2 text-sm">
              {items.map((v) => (
                <li key={v.id} className="text-slate-300">
                  {v.title} — <span className="text-slate-500">{v.time.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </DeviceDataShell>
    </div>
  );
}
