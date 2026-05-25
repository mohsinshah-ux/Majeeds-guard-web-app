import { useEffect, useMemo, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { Card, Table, Dropdown, Button } from '@/components/ui';
import type { CallLog } from '@/data/callLogs';
import { Download, RefreshCw } from 'lucide-react';
import { fetchCallLogs } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import { exportCallLogsToXls, filterCallsByDays } from '@/lib/exportCalls';

const dateOptions = [
  { value: '1', label: 'Today' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: '0', label: 'All time' },
];

const columns = [
  { key: 'date' as const, header: 'Date' },
  { key: 'time' as const, header: 'Time' },
  { key: 'contact' as const, header: 'Contact' },
  { key: 'phoneNumber' as const, header: 'Number' },
  {
    key: 'direction' as const,
    header: 'Direction',
    render: (row: CallLog) => (
      <span className={row.direction === 'incoming' ? 'text-green-600' : row.direction === 'outgoing' ? 'text-blue-600' : 'text-amber-600'}>
        {row.direction}
      </span>
    ),
  },
  {
    key: 'duration' as const,
    header: 'Duration',
    render: (row: CallLog) => (row.duration > 0 ? `${Math.floor(row.duration / 60)}m ${row.duration % 60}s` : '—'),
  },
];

export function CallsPage() {
  const { selectedDeviceId } = useSelectedDevice();
  const [refreshKey, setRefreshKey] = useState(0);
  const [rows, setRows] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState('7');

  useEffect(() => {
    let isMounted = true;
    const load = async (showSpinner: boolean) => {
      if (!selectedDeviceId) {
        if (isMounted) setRows([]);
        setIsLoading(false);
        return;
      }
      if (showSpinner) setIsLoading(true);
      setError(null);
      try {
        const data = await fetchCallLogs();
        if (isMounted) setRows(data);
      } catch {
        if (isMounted) setError('Failed to load call logs from backend API.');
      } finally {
        if (isMounted && showSpinner) setIsLoading(false);
      }
    };

    void load(true);
    const interval = setInterval(() => void load(false), 5000);
    const onChange = () => void load(true);
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [refreshKey, selectedDeviceId]);

  const filteredRows = useMemo(() => {
    const days = Number(daysFilter);
    if (!days || days <= 0) return rows;
    return filterCallsByDays(rows, days);
  }, [rows, daysFilter]);

  const handleExport = () => {
    if (filteredRows.length === 0) return;
    const label = dateOptions.find((o) => o.value === daysFilter)?.label ?? 'calls';
    exportCallLogsToXls(filteredRows, `calls-${label.replace(/\s+/g, '-').toLowerCase()}.xls`);
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Calls" />
      <div className="flex flex-wrap gap-2 items-center">
        <Dropdown
          options={dateOptions}
          value={daysFilter}
          onChange={setDaysFilter}
          placeholder="Date range"
          aria-label="Date range"
        />
        <Button variant="outline" size="sm" className="gap-1" onClick={handleExport} disabled={filteredRows.length === 0}>
          <Download className="w-4 h-4" /> Export .xls
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => {
            setIsLoading(true);
            setRefreshKey((k) => k + 1);
          }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        <span className="text-xs text-slate-500">{filteredRows.length} call(s)</span>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading call logs...</p>
        ) : (
          <Table columns={columns} data={filteredRows} keyField="id" aria-label="Call logs" />
        )}
      </Card>
    </div>
  );
}
