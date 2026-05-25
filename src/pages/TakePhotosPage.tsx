import { PageTitle } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { RemoteCapturePanel } from '@/components/RemoteCapturePanel';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchPhotos, requestTakePhoto, requestGallerySync } from '@/lib/api';

export function TakePhotosPage() {
  const { data: photos, loading, reload } = useDevicePolling(
    () => fetchPhotos('gallery'),
    []
  );

  return (
    <div className="space-y-4">
      <PageTitle title="Take Photos" showInfo />
      <DeviceDataShell>
        <RemoteCapturePanel
          actionLabel="Sync latest photo"
          actionIcon="image"
          onRequest={requestTakePhoto}
          onRefresh={reload}
          loading={loading}
          photos={photos}
          typeFilter="gallery"
          hint="Pulls the newest image from the child gallery. Use Phone Data → Photos for full gallery history."
        />
        <button
          type="button"
          onClick={async () => {
            await requestGallerySync();
            setTimeout(() => reload(), 8000);
          }}
          className="text-xs text-emerald-400 hover:underline"
        >
          Run full gallery sync (up to 50 images)
        </button>
        {!loading && photos.length === 0 && (
          <EmptyState
            title="No photos synced"
            description="Grant gallery permission on the child device. Historical photos sync automatically after pairing."
          />
        )}
      </DeviceDataShell>
    </div>
  );
}
