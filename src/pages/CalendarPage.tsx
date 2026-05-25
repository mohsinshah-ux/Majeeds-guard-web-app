import { PageTitle } from '@/components/ui';
import { Card, Table, Dropdown } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchCalendarEvents } from '@/lib/api';
import type { CalendarEventRecord } from '@/lib/api';

const columns = [
  { key: 'event' as const, header: 'Event' },
  { key: 'startTime' as const, header: 'Start Time' },
  { key: 'endTime' as const, header: 'End Time' },
  {
    key: 'location' as const,
    header: 'Event Location',
    render: (r: CalendarEventRecord) =>
      r.location ? <span className="text-blue-400">{r.location}</span> : '—',
  },
  { key: 'notes' as const, header: 'Notes' },
];

export function CalendarPage() {
  const { data: events, loading } = useDevicePolling(fetchCalendarEvents, []);

  return (
    <div className="space-y-4">
      <PageTitle title="Calendar" />
      <DeviceDataShell emptyDescription="Grant Calendar permission on the child phone to sync events here.">
        <div className="flex flex-wrap gap-2">
          <Dropdown options={[{ value: 'all', label: 'All' }]} value="all" placeholder="All" aria-label="Calendar" />
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-slate-400 p-6">Loading calendar from child device…</p>
          ) : events.length === 0 ? (
            <EmptyState
              title="No calendar events yet"
              description="Events sync from the child device calendar every few hours after READ_CALENDAR is granted."
            />
          ) : (
            <Table columns={columns} data={events} keyField="id" aria-label="Calendar events" />
          )}
        </Card>
      </DeviceDataShell>
    </div>
  );
}
