import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { Card, Table, Dropdown } from '@/components/ui';
import type { Message } from '@/data/messages';
import { fetchMessages } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import { MessageDetailModal } from '@/components/MessageDetailModal';

const dateOptions = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '0', label: 'All time' },
];

export function MessagesPage() {
  const { selectedDeviceId } = useSelectedDevice();
  const [rows, setRows] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Message | null>(null);

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
        const data = await fetchMessages();
        if (isMounted) setRows(data);
      } catch {
        if (isMounted) setError('Failed to load messages from backend API.');
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
  }, [selectedDeviceId]);

  const columns = [
    { key: 'date' as const, header: 'Date' },
    { key: 'time' as const, header: 'Time' },
    { key: 'contact' as const, header: 'Contact' },
    {
      key: 'snippet' as const,
      header: 'Snippet',
      render: (row: Message) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          className={`text-left hover:text-emerald-400 underline-offset-2 hover:underline ${row.unread ? 'font-medium text-[#e5ffe5]' : 'text-slate-300'}`}
          title="Click to read full message"
        >
          [{row.channel}] {row.snippet}
        </button>
      ),
    },
    {
      key: 'type' as const,
      header: 'Type',
      render: (row: Message) => (
        <span className={row.type === 'incoming' ? 'text-green-600' : 'text-blue-600'}>{row.type}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Messages" />
      <div className="flex flex-wrap gap-2">
        <Dropdown options={dateOptions} value="7" placeholder="Date range" aria-label="Date range" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading messages...</p>
        ) : (
          <Table columns={columns} data={rows} keyField="id" aria-label="Messages" />
        )}
      </Card>
      <MessageDetailModal
        open={selected !== null}
        contact={selected?.contact ?? ''}
        channel={selected?.channel ?? 'SMS'}
        fullText={selected?.fullText ?? ''}
        date={selected?.date ?? ''}
        time={selected?.time ?? ''}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
