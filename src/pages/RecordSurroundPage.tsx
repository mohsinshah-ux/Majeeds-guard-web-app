import { PageTitle } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RemoteCapturePanel } from '@/components/RemoteCapturePanel';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestSurroundRecord } from '@/lib/api';

export function RecordSurroundPage() {
  const { data: photos, loading, reload } = useDevicePolling(
    () => fetchPhotos('audio'),
    []
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Record Surround" showInfo />
      <DeviceDataShell>
        <RemoteCapturePanel
          actionLabel="Record surround (20s MIC)"
          actionIcon="mic"
          onRequest={requestSurroundRecord}
          onRefresh={reload}
          loading={loading}
          photos={photos}
          typeFilter="audio"
          hint="Records ~20 seconds of ambient audio on the child device. Grant Microphone permission on the child app."
        />
        {!loading && photos.length === 0 && (
          <EmptyState
            title="No surround recordings"
            description="Request a recording — uploads appear here when the child device finishes."
          />
        )}
      </DeviceDataShell>
    </div>
  );
}
