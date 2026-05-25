import { PageTitle } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RemoteCapturePanel } from '@/components/RemoteCapturePanel';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestScreenshotCapture } from '@/lib/api';
import type { PhotoRecord } from '@/lib/api';

export function CaptureScreenshotsPage() {
  const { data: photos, loading, reload } = useDevicePolling(
    () => fetchPhotos('screenshot'),
    [] as PhotoRecord[]
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Capture Screenshots" />
      <DeviceDataShell>
        <RemoteCapturePanel
          actionLabel="Request screenshot from child"
          actionIcon="camera"
          onRequest={requestScreenshotCapture}
          onRefresh={reload}
          loading={loading}
          photos={photos}
          typeFilter="screenshot"
          hint="Child app uploads the latest gallery image when screenshot is requested (Photos permission required)."
        />
        {!loading && photos.length === 0 && (
          <EmptyState
            title="No screenshots yet"
            description="Use the button above after the child device is paired and online."
          />
        )}
      </DeviceDataShell>
    </div>
  );
}
