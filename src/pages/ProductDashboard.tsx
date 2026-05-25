import { useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Table, Dropdown, Button } from '@/components/ui';
import { type SocialApp } from '@/data/socialChats';
import type { CallLog } from '@/data/callLogs';
import type { Message } from '@/data/messages';
import type { LocationRecord } from '@/data/locationHistory';
import type { ChatMessage } from '@/data/socialChats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { activityByDay } from '@/data/overviewStats';
import { Download, RefreshCw } from 'lucide-react';
import { fetchCallLogs, fetchLocations, fetchMessages, fetchSocialChats } from '@/lib/api';

const dateRangeOptions = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

interface ProductDashboardProps {
  title: string;
  socialApp?: SocialApp;
}

export function ProductDashboard({ title, socialApp }: ProductDashboardProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationRecord[]>([]);
  const [allChats, setAllChats] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [calls, msgs, locations, chats] = await Promise.all([
          fetchCallLogs(),
          fetchMessages(),
          fetchLocations(),
          fetchSocialChats(),
        ]);
        if (!isMounted) return;
        setCallLogs(calls);
        setMessages(msgs);
        setLocationHistory(locations);
        setAllChats(chats);
      } catch {
        if (isMounted) setError('Failed to load dashboard data from backend API.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    const interval = setInterval(load, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const chats = useMemo(() => {
    if (!socialApp) return allChats;
    const appName = socialApp.toLowerCase();
    return allChats.filter((chat) => chat.contact.toLowerCase().includes(`(${appName})`));
  }, [allChats, socialApp]);

  const callColumns = [
    { key: 'date' as const, header: 'Date' },
    { key: 'time' as const, header: 'Time' },
    { key: 'contact' as const, header: 'Contact' },
    { key: 'phoneNumber' as const, header: 'Number' },
    {
      key: 'direction' as const,
      header: 'Direction',
      render: (row: CallLog) => (
        <span
          className={
            row.direction === 'incoming'
              ? 'text-emerald-600'
              : row.direction === 'outgoing'
                ? 'text-blue-600'
                : 'text-amber-600'
          }
        >
          {row.direction}
        </span>
      ),
    },
    {
      key: 'duration' as const,
      header: 'Duration',
      render: (row: CallLog) =>
        row.duration > 0 ? `${Math.floor(row.duration / 60)}m ${row.duration % 60}s` : '—',
    },
  ];

  const messageColumns = [
    { key: 'date' as const, header: 'Date' },
    { key: 'time' as const, header: 'Time' },
    { key: 'contact' as const, header: 'Contact' },
    {
      key: 'snippet' as const,
      header: 'Snippet',
      render: (row: Message) => (
        <span className={row.unread ? 'font-medium' : ''}>{row.snippet}</span>
      ),
    },
    {
      key: 'type' as const,
      header: 'Type',
      render: (row: Message) => (
        <span className={row.type === 'incoming' ? 'text-emerald-600' : 'text-blue-600'}>
          {row.type}
        </span>
      ),
    },
  ];

  const locationColumns = [
    { key: 'date' as const, header: 'Date' },
    { key: 'time' as const, header: 'Time' },
    { key: 'address' as const, header: 'Address' },
  ];

  const tabs = [
    {
      id: 'calls',
      label: 'Calls',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Dropdown
              options={dateRangeOptions}
              value="7"
              placeholder="Date range"
              aria-label="Date range"
            />
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
          <Card>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading call logs...</p>
            ) : (
              <Table columns={callColumns} data={callLogs} keyField="id" aria-label="Call logs" />
            )}
          </Card>
          <Card title="Call activity">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#22c55e" name="Calls" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Dropdown
              options={dateRangeOptions}
              value="7"
              placeholder="Date range"
              aria-label="Date range"
            />
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
          <Card>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading messages...</p>
            ) : (
              <Table columns={messageColumns} data={messages} keyField="id" aria-label="Messages" />
            )}
          </Card>
          <Card title="Message activity">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#10b981" name="Messages" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ),
    },
    {
      id: 'chats',
      label: 'Chats',
      content: (
        <div className="space-y-4">
          <Card title="Recent chats">
            <ul className="divide-y divide-slate-200">
              {chats.slice(0, 10).map((msg) => (
                <li key={msg.id} className="py-3 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800">{msg.contact}</span>
                    <span className="text-xs text-slate-500">
                      {msg.date} {msg.time}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{msg.content}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ),
    },
    {
      id: 'location',
      label: 'Location',
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Dropdown
              options={dateRangeOptions}
              value="7"
              placeholder="Date range"
              aria-label="Date range"
            />
          </div>
          <Card>
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading location history...</p>
            ) : (
              <Table
                columns={locationColumns}
                data={locationHistory}
                keyField="id"
                aria-label="Location history"
              />
            )}
          </Card>
          <Card title="Map view">
            <div className="h-64 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500 border border-slate-700">
              Map placeholder (e.g. Leaflet)
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Tabs tabs={tabs} defaultTab="calls" aria-label="Dashboard sections" />
    </div>
  );
}
