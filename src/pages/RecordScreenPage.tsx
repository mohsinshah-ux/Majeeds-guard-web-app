import { PageTitle } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RemoteCapturePanel } from '@/components/RemoteCapturePanel';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestRecordScreen } from '@/lib/api';

export function RecordScreenPage() {
  const { data: photos, loading, reload } = useDevicePolling(
    () => fetchPhotos('screen_record'),
    []
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Record Screen" showInfo />
      <DeviceDataShell>
        <RemoteCapturePanel
          actionLabel="Capture screen snapshot"
          actionIcon="monitor"
          onRequest={requestRecordScreen}
          onRefresh={reload}
          loading={loading}
          photos={photos}
          typeFilter="screen_record"
          hint="Sends a screen snapshot from the child device (latest display image from gallery pipeline)."
        />
        {!loading && photos.length === 0 && (
          <EmptyState title="No screen captures" description="Request a capture from the paired child device." />
        )}
      </DeviceDataShell>
    </div>
  );
}
