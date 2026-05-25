import { useEffect, useState, useMemo } from 'react';
import { PageTitle, Card, Tabs, Table, Dropdown } from '@/components/ui';
import { Search, RefreshCw, Wifi } from 'lucide-react';
import { fetchWifiLogs } from '@/lib/api';
import type { WifiLog } from '@/lib/api';

export function WifiLoggerPage() {
  const [wifiLogs, setWifiLogs] = useState<WifiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadWifiLogs = async () => {
    try {
      const data = await fetchWifiLogs();
      setWifiLogs(data);
      setError(null);
    } catch {
      setError('Failed to fetch Wi-Fi connectivity logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWifiLogs();
    const interval = setInterval(loadWifiLogs, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const filteredLogs = useMemo(() => {
    return wifiLogs.filter((log) =>
      log.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [wifiLogs, searchQuery]);

  const columns = [
    { 
      key: 'ssid' as const, 
      header: 'SSID / Network Name', 
      render: (r: WifiLog) => (
        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-emerald-400" /> {r.ssid}
        </span>
      )
    },
    { 
      key: 'time' as const, 
      header: 'Connection Time', 
      render: (r: WifiLog) => (
        <span className="text-slate-400 font-mono text-xs">
          {r.time.replace("T", " ").slice(0, 19)}
        </span>
      )
    },
    { 
      key: 'status' as const, 
      header: 'Status', 
      render: (r: WifiLog) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.status === 'Connected' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
          {r.status}
        </span>
      )
    },
    { 
      key: 'signal' as const, 
      header: 'Signal Strength', 
      render: (r: WifiLog) => (
        <span className="text-xs text-slate-300 font-medium">{r.signal}</span>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Wi-Fi Logger" showInfo />
      
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Tabs
        tabs={[
          { id: 'history', label: 'Connection Logs', content: (
            <>
              <div className="flex flex-wrap gap-2 mb-4 justify-between items-center">
                <Dropdown options={[{ value: 'all', label: 'All Connections' }]} value="all" placeholder="All" aria-label="Date" />
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search network..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="p-2 border border-slate-700 rounded-lg hover:bg-slate-900 text-slate-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Card className="bg-[#020617] border-slate-800">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Fetching wifi state...
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic">No network connection logs captured.</div>
                ) : (
                  <Table columns={columns} data={filteredLogs} keyField="id" aria-label="Wi-Fi history list" />
                )}
              </Card>
            </>
          ) },
          { id: 'block', label: 'Blocked Access Points', content: (
            <Card className="bg-[#020617] border-slate-800 text-center py-8">
              <p className="text-slate-400 text-sm">Wifi restriction rules are synced directly onto the client daemon sandbox.</p>
            </Card>
          ) },
        ]}
        defaultTab="history"
      />
    </div>
  );
}
