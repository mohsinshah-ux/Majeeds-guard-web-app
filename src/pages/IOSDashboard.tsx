import { EmptyState } from '@/components/ui/EmptyState';

export function IOSDashboard() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[#e5ffe5]">iOS Dashboard</h1>
      <EmptyState
        title="Android child device required"
        description="This build monitors via the KidsGuard Android app. Pair an Android phone and use Dashboard, Calls, Messages, and other tabs for live data."
      />
    </div>
  );
}
