import { useEffect, useState, useMemo } from 'react';
import { PageTitle, Card, Tabs, Table } from '@/components/ui';
import { Search, RefreshCw } from 'lucide-react';
import { fetchInstalledApps, toggleAppBlock } from '@/lib/api';
import type { InstalledApp } from '@/lib/api';

export function AppManagementPage() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadApps = async () => {
    try {
      const data = await fetchInstalledApps();
      setApps(data);
      setError(null);
    } catch {
      setError('Failed to fetch installed apps from parent server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
    const interval = setInterval(loadApps, 4000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleToggle = async (packageName: string) => {
    try {
      await toggleAppBlock(packageName);
      loadApps();
    } catch (err) {
      alert('Failed to update app block status.');
    }
  };

  // Filtered lists
  const filteredApps = useMemo(() => {
    return apps.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apps, searchQuery]);

  const installedColumns = [
    { key: 'name' as const, header: 'App Name', render: (r: InstalledApp) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
          {r.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-200">{r.name}</p>
          <p className="text-[10px] text-slate-500 font-mono">{r.packageName}</p>
        </div>
      </div>
    )},
    { key: 'size' as const, header: 'Size' },
    { key: 'isBlocked' as const, header: 'Status', render: (r: InstalledApp) => (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.isBlocked ? 'bg-red-950/40 text-red-400 border border-red-900/50' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'}`}>
        {r.isBlocked ? 'Blocked' : 'Allowed'}
      </span>
    )},
    { key: 'action' as const, header: 'Action', render: (r: InstalledApp) => (
      <button
        type="button"
        onClick={() => handleToggle(r.packageName)}
        className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
          r.isBlocked 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20'
        }`}
      >
        {r.isBlocked ? 'Unblock App' : 'Block App'}
      </button>
    )},
  ];

  const limitColumns = [
    { key: 'name' as const, header: 'App Name', render: (r: InstalledApp) => (
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          checked={r.isBlocked} 
          onChange={() => handleToggle(r.packageName)}
          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30" 
        />
        <span className="font-medium text-slate-200">{r.name}</span>
      </div>
    ) },
    { key: 'type' as const, header: 'Restriction Type', render: (r: InstalledApp) => (
      <span className={r.isBlocked ? 'text-red-400 font-semibold' : 'text-slate-400'}>
        {r.isBlocked ? 'Blocklist Active' : 'No Limit'}
      </span>
    ) },
    { key: 'details' as const, header: 'Rules', render: (r: InstalledApp) => (
      <span className="text-slate-400 font-mono text-xs">
        {r.isBlocked ? 'Total Block (24 Hours)' : 'Unlimited access allowed'}
      </span>
    ) },
  ];

  const uninstalledAppsMock = [
    { name: 'MONOPOLY GO', uninstalledDate: '2026-04-12 12:30:43', packageName: 'com.scopely.monopolygo', size: '147 MB' },
    { name: 'Stumble Guys', uninstalledDate: '2026-04-09 12:31:06', packageName: 'com.kitkagames.stumbleguys', size: '162 MB' },
  ];

  const uninstalledColumns = [
    { key: 'name' as const, header: 'App Name', render: (r: typeof uninstalledAppsMock[0]) => (
      <div>
        <p className="font-semibold text-slate-300">{r.name}</p>
        <p className="text-[10px] text-slate-500 font-mono">{r.packageName}</p>
      </div>
    )},
    { key: 'uninstalledDate' as const, header: 'Uninstalled Time' },
    { key: 'size' as const, header: 'Size' },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title="App Management" />
      
      {error && (
        <div className="bg-red-950/20 border border-red-900 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadApps} className="text-xs hover:underline flex items-center gap-1 font-semibold">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'installed', label: 'Installed Apps', content: (
            <>
              <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                <div className="text-xs text-slate-400">
                  Total Apps detected: <strong className="text-emerald-400 font-mono">{apps.length}</strong>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Filter apps..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" 
                  />
                </div>
              </div>
              <Card className="bg-[#020617] border-slate-800">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Querying app inventory...
                  </div>
                ) : (
                  <Table columns={installedColumns} data={filteredApps} keyField="packageName" aria-label="Installed apps list" />
                )}
              </Card>
            </>
          ) },
          { id: 'uninstalled', label: 'Uninstalled Apps', content: (
            <>
              <div className="flex justify-end mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search uninstalled..." className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500" disabled />
                </div>
              </div>
              <Card className="bg-[#020617] border-slate-800">
                <Table columns={uninstalledColumns} data={uninstalledAppsMock} keyField="packageName" aria-label="Uninstalled apps list" />
              </Card>
            </>
          ) },
          { id: 'limit', label: 'App Limit & Policies', content: (
            <>
              <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                <div className="text-xs text-slate-400">
                  Policies are instantly synchronized to the child phone simulator.
                </div>
                <button 
                  type="button"
                  onClick={() => setRefreshKey(k => k + 1)}
                  className="p-2 border border-slate-700 rounded-lg hover:bg-slate-900 text-slate-400 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="w-4 h-4" /> Sync Now
                </button>
              </div>
              <Card className="bg-[#020617] border-slate-800">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading rules...
                  </div>
                ) : (
                  <Table columns={limitColumns} data={filteredApps} keyField="packageName" aria-label="App limits list" />
                )}
              </Card>
            </>
          ) },
        ]}
        defaultTab="installed"
      />
    </div>
  );
}
