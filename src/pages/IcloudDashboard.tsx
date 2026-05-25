import { EmptyState } from '@/components/ui/EmptyState';

export function IcloudDashboard() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[#e5ffe5]">iCloud Dashboard</h1>
      <EmptyState
        title="Not available in this build"
        description="Data syncs from the paired Android child app. Use the main sidebar tabs after binding a device."
      />
    </div>
  );
}
