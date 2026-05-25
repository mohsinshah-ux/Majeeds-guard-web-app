import { useEffect, useMemo, useState } from 'react';
import { PageTitle, Card, Tabs } from '@/components/ui';
import { Bell, Activity, RefreshCw } from 'lucide-react';
import { fetchNotifications, fetchSafetyAlerts } from '@/lib/api';
import type { NotificationRecord, SafetyAlert } from '@/lib/api';

type TimelineItem = { time: string; app: string; text: string };

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#090d1f] overflow-hidden">
      <div className="p-3 border-b border-slate-800 text-sm font-semibold text-[#e5ffe5] flex items-center justify-between">
        <span>Timeline View</span>
        <span className="text-[10px] text-slate-500 font-mono">Total events: {items.length}</span>
      </div>
      <div className="divide-y divide-slate-850">
        {items.map((it, idx) => (
          <div key={idx} className="flex gap-4 p-3 hover:bg-slate-900/40 transition-colors">
            <div className="w-24 flex-shrink-0 text-xs text-slate-400 font-mono">{it.time}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#e5ffe5]">{it.app}</div>
              <div className="text-xs text-slate-400 mt-0.5">{it.text}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 italic">No events captured.</div>
        )}
      </div>
    </div>
  );
}

export function LogsPage() {
  const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    try {
      const [nRes, aRes] = await Promise.all([
        fetchNotifications(),
        fetchSafetyAlerts()
      ]);
      setNotifs(nRes);
      setAlerts(aRes);
      setError(null);
    } catch {
      setError('Failed to fetch activity logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const parsedAlerts = useMemo(() => {
    return alerts.map((item) => {
      const displayTime = item.time.replace("T", " ").slice(11, 19);
      return {
        time: displayTime,
        app: `[${item.type}] ${item.severity}`,
        text: item.msg
      };
    });
  }, [alerts]);

  const parsedNotifications = useMemo(() => {
    return notifs.map((item) => {
      const displayTime = item.time.replace("T", " ").slice(11, 19);
      return {
        time: displayTime,
        app: item.app,
        text: `[${item.title}] ${item.preview}`
      };
    });
  }, [notifs]);

  return (
    <div className="space-y-4">
      <PageTitle title="Logs &amp; System Events" />
      
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Card className="bg-[#020617] border-slate-800">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-xs text-slate-400">
            System logs update in real-time as notifications and alerts occur.
          </div>
          <button 
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 border border-slate-700 rounded-lg hover:bg-slate-900 text-slate-400"
            aria-label="Refresh logs"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        <Tabs
          defaultTab="activities"
          tabs={[
            {
              id: 'activities',
              label: 'Safety Alerts & Activity',
              content: (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Activity className="w-4 h-4 text-[#22c55e]" /> Safety events logs uploaded from client daemon
                  </div>
                  <Timeline items={parsedAlerts} />
                </div>
              ),
            },
            {
              id: 'notifications',
              label: 'Notifications History',
              content: (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Bell className="w-4 h-4 text-[#22c55e]" /> System and third-party app notifications stream
                  </div>
                  <Timeline items={parsedNotifications} />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
