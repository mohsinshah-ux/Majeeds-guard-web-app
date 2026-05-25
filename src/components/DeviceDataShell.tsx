import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useHasBoundDevice } from '@/hooks/useDevicePolling';

export function DeviceDataShell({
  children,
  emptyTitle = 'No child device selected',
  emptyDescription = 'Bind a child device and select it from the green bar at the top of the sidebar to view its data.',
}: {
  children: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { hasDevice, loading, selectedDeviceId } = useHasBoundDevice();

  if (loading) {
    return (
      <p className="text-sm text-slate-400 p-6 flex gap-2 items-center">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading device…
      </p>
    );
  }

  if (!selectedDeviceId) {
    return (
      <EmptyState
        title="Select a child device"
        description="Use the device dropdown in the sidebar (green bar) to choose which child's data to view."
      />
    );
  }

  if (!hasDevice) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children}</>;
}
