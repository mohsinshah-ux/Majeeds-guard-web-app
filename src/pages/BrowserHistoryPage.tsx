import { useEffect, useState, useMemo } from 'react';
import { PageTitle, Card, Tabs, Table, Dropdown } from '@/components/ui';
import { Search, RefreshCw, Globe } from 'lucide-react';
import { fetchBrowserHistory } from '@/lib/api';
import type { BrowserHistoryRecord } from '@/lib/api';

export function BrowserHistoryPage() {
  const [history, setHistory] = useState<BrowserHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadHistory = async () => {
    try {
      const data = await fetchBrowserHistory();
      setHistory(data);
      setError(null);
    } catch {
      setError('Failed to fetch browser logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) =>
      item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  const columns = [
    { 
      key: 'time' as const, 
      header: 'Last Visit Time', 
      render: (r: BrowserHistoryRecord) => (
        <span className="text-slate-400 font-mono text-xs">
          {r.time.replace("T", " ").slice(0, 19)}
        </span>
      )
    },
    { 
      key: 'query' as const, 
      header: 'Search Query / Event', 
      render: (r: BrowserHistoryRecord) => (
        <span className="font-medium text-[#e5ffe5]">{r.query}</span>
      )
    },
    { 
      key: 'url' as const, 
      header: 'Website Address', 
      render: (r: BrowserHistoryRecord) => (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline text-xs flex items-center gap-1">
          <Globe className="w-3 h-3 flex-shrink-0" /> {r.url}
        </a>
      ) 
    },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="Browser History" />
      
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Tabs
        tabs={[
          { id: 'history', label: 'Safebrowsing DNS Logs', content: (
            <>
              <div className="flex flex-wrap gap-2 mb-4 justify-between items-center">
                <Dropdown options={[{ value: 'all', label: 'All Browsers' }]} value="all" placeholder="All" aria-label="Filter" />
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search history..." 
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
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Pulling Web Searches...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic">No web browsing telemetry captured yet.</div>
                ) : (
                  <Table columns={columns} data={filteredHistory} keyField="id" aria-label="Browser history list" />
                )}
              </Card>
            </>
          ) },
          { id: 'block', label: 'Web Filter / Restrictions', content: (
            <Card className="bg-[#020617] border-slate-800 text-center py-8">
              <p className="text-slate-400 text-sm">Safe Browsing mode is active. Content filtering resolves dynamically on the child agent client.</p>
            </Card>
          ) },
        ]}
        defaultTab="history"
      />
    </div>
  );
}
