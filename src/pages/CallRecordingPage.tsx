import { PageTitle, Card, Table, Button } from '@/components/ui';
import { Mic, RefreshCw, Play } from 'lucide-react';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import { fetchCallRecordings } from '@/lib/api';
import type { CallRecordingRecord } from '@/lib/api';

const columns = [
  { key: 'name' as const, header: 'Name' },
  { key: 'phone' as const, header: 'Phone' },
  { key: 'type' as const, header: 'Type' },
  {
    key: 'duration' as const,
    header: 'Duration',
  },
  {
    key: 'time' as const,
    header: 'Time',
    render: (r: CallRecordingRecord) => r.time.replace('T', ' ').slice(0, 19),
  },
  {
    key: 'audio' as const,
    header: 'Recording',
    render: (r: CallRecordingRecord) =>
      r.hasAudio && r.audioUrl ? (
        <audio controls src={r.audioUrl} className="max-w-[180px] h-8" />
      ) : (
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Mic className="w-3 h-3 opacity-50" /> No audio
        </span>
      ),
  },
];

export function CallRecordingPage() {
  const { data: rows, loading, reload } = useDevicePolling(fetchCallRecordings, []);

  return (
    <div className="space-y-4">
      <PageTitle title="Call Recording" showInfo />
      <DeviceDataShell emptyDescription="Incoming calls on the child device are auto-recorded when Phone + Microphone permissions are granted.">
        <div className="flex flex-wrap gap-2 mb-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => reload()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
        <Card>
          {loading ? (
            <p className="text-sm text-slate-400 p-6">Loading call recordings…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No call recordings yet"
              description="Grant Call Log, Phone State, and Microphone on the child device. Android may limit in-call audio on some phones."
            />
          ) : (
            <Table columns={columns} data={rows} keyField="id" aria-label="Call recordings" />
          )}
        </Card>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Play className="w-3 h-3" />
          Recordings use the device microphone during incoming calls (platform limits may apply).
        </p>
      </DeviceDataShell>
    </div>
  );
}
