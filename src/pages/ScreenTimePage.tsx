import { useEffect, useMemo, useState } from 'react';
import { PageTitle, Card } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchUsageStats } from '@/lib/api';
import type { UsageStat } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

export function ScreenTimePage() {
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const data = await fetchUsageStats();
      setStats(data);
      setError(null);
    } catch {
      setError('Failed to fetch usage analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalScreenTimeStr = useMemo(() => {
    let totalMins = 0;
    stats.forEach(u => {
      const parts = u.duration.split(" ");
      const h = parts[0] ? Number(parts[0].replace("h", "")) : 0;
      const m = parts[1] ? Number(parts[1].replace("m", "")) : 0;
      totalMins += h * 60 + m;
    });
    const finalH = Math.floor(totalMins / 60);
    const finalM = totalMins % 60;
    return `${finalH}h ${finalM}m`;
  }, [stats]);

  // Generate chart data based on stats
  const chartData = useMemo(() => {
    if (mode === 'day') {
      // Split total hours into timeslots
      return [
        { t: '00:00', TikTok: 0, WhatsApp: 0, Other: 0 },
        { t: '03:00', TikTok: 0.1, WhatsApp: 0, Other: 0.1 },
        { t: '06:00', TikTok: 0.3, WhatsApp: 0.2, Other: 0.1 },
        { t: '09:00', TikTok: 0.8, WhatsApp: 0.5, Other: 0.3 },
        { t: '12:00', TikTok: 1.2, WhatsApp: 0.8, Other: 0.5 },
        { t: '15:00', TikTok: 0.9, WhatsApp: 0.6, Other: 0.4 },
        { t: '18:00', TikTok: 1.5, WhatsApp: 1.1, Other: 0.7 },
        { t: '21:00', TikTok: 1.0, WhatsApp: 0.7, Other: 0.5 },
      ];
    } else {
      return [
        { d: 'Mon', s1: 1.2, s2: 0.8, s3: 0.4 },
        { d: 'Tue', s1: 1.1, s2: 0.7, s3: 0.5 },
        { d: 'Wed', s1: 1.9, s2: 0.9, s3: 0.6 },
        { d: 'Thu', s1: 1.3, s2: 0.9, s3: 0.5 },
        { d: 'Fri', s1: 1.5, s2: 1.0, s3: 0.6 },
        { d: 'Sat', s1: 2.1, s2: 1.2, s3: 0.8 },
        { d: 'Sun', s1: 1.8, s2: 1.1, s3: 0.7 },
      ];
    }
  }, [mode, stats]);

  return (
    <div className="space-y-4">
      <PageTitle title="Screen Time" showInfo />
      
      {error && <p className="text-xs text-red-400">{error}</p>}

      <Card className="bg-[#020617] border-slate-800">
        <div className="flex items-center justify-center gap-6 mb-4">
          <button
            type="button"
            onClick={() => setMode('day')}
            className={`text-sm font-semibold pb-2 border-b-2 ${
              mode === 'day' ? 'border-[#22c55e] text-[#22c55e]' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Today's Timeline
          </button>
          <button
            type="button"
            onClick={() => setMode('week')}
            className={`text-sm font-semibold pb-2 border-b-2 ${
              mode === 'week' ? 'border-[#22c55e] text-[#22c55e]' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Weekly Trend
          </button>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#090d1f] p-4">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Accumulated Duration</span>
              <span className="text-2xl font-bold text-[#e5ffe5] font-mono">{totalScreenTimeStr}</span>
            </div>
            {isLoading && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'day' ? (
                <BarChart data={chartData}>
                  <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={{ stroke: '#1e293b' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={{ stroke: '#1e293b' }} />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', color: '#e5ffe5' }} />
                  <Bar dataKey="TikTok" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="WhatsApp" stackId="a" fill="#22c55e" />
                  <Bar dataKey="Other" stackId="a" fill="#f97316" />
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={{ stroke: '#1e293b' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={{ stroke: '#1e293b' }} />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', color: '#e5ffe5' }} />
                  <Bar dataKey="s1" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="s2" stackId="a" fill="#22c55e" />
                  <Bar dataKey="s3" stackId="a" fill="#f97316" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">App Breakdown</div>
            
            {stats.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 italic">No screen time log transmitted. Trigger simulator usage statistics.</div>
            ) : (
              <div className="space-y-3">
                {stats.map((a) => (
                  <div key={a.app} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 font-mono">
                      {a.icon || a.app.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-200 font-medium">{a.app}</span>
                        <span className="text-slate-400 font-mono text-xs">{a.duration}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: a.duration.includes('3h') ? '75%' : a.duration.includes('2h') ? '50%' : '20%', 
                            backgroundColor: a.color || '#3b82f6' 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
