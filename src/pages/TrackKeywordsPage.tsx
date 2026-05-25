import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { Card, Tabs, Table, Dropdown } from '@/components/ui';
import { DeviceDataShell } from '@/components/DeviceDataShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDevicePolling } from '@/hooks/useDevicePolling';
import {
  fetchKeywordAlerts,
  fetchTrackedKeywords,
  updateTrackedKeywords,
  requestHistoricalSync,
} from '@/lib/api';
import type { KeywordAlertRecord } from '@/lib/api';

const columns = [
  { key: 'keyword' as const, header: 'Keyword' },
  { key: 'detectedIn' as const, header: 'Detected in' },
  { key: 'message' as const, header: 'Message' },
  {
    key: 'time' as const,
    header: 'Time',
    render: (r: KeywordAlertRecord) => r.time.replace('T', ' ').slice(0, 19),
  },
];

export function TrackKeywordsPage() {
  const { data: alerts, loading, reload } = useDevicePolling(fetchKeywordAlerts, []);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [saving, setSaving] = useState(false);
  const [kwError, setKwError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackedKeywords().then(setKeywords).catch(() => setKwError('Could not load keywords'));
  }, []);

  const addKeyword = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w || keywords.includes(w)) return;
    setSaving(true);
    try {
      const next = await updateTrackedKeywords([...keywords, w]);
      setKeywords(next);
      setNewWord('');
      await requestHistoricalSync();
      setTimeout(() => reload(), 3000);
    } catch {
      setKwError('Failed to save keyword');
    } finally {
      setSaving(false);
    }
  };

  const removeKeyword = async (word: string) => {
    setSaving(true);
    try {
      const next = await updateTrackedKeywords(keywords.filter((k) => k !== word));
      setKeywords(next);
      reload();
    } catch {
      setKwError('Failed to remove keyword');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Track Keywords" showInfo />
      <DeviceDataShell emptyDescription="Alerts are generated when child SMS, chats, notifications, or browser text match monitored keywords.">
        <Tabs
          tabs={[
            {
              id: 'alerts',
              label: 'Detected Alerts',
              content: (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Dropdown options={[{ value: 'all', label: 'All' }]} value="all" placeholder="All" aria-label="Date" />
                  </div>
                  <Card>
                    {loading ? (
                      <p className="text-sm text-slate-400 p-6">Scanning child activity…</p>
                    ) : alerts.length === 0 ? (
                      <EmptyState
                        title="No keyword matches yet"
                        description="Add custom keywords in the Monitored Keywords tab. Existing messages are rescanned when you add a word."
                      />
                    ) : (
                      <Table columns={columns} data={alerts} keyField="id" aria-label="Detected alerts" />
                    )}
                  </Card>
                </>
              ),
            },
            {
              id: 'add',
              label: 'Monitored keywords',
              content: (
                <Card className="p-6 space-y-4">
                  <p className="text-sm text-slate-300">Custom keywords (checked on all new and existing child data):</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-emerald-300 text-xs font-mono"
                      >
                        {k}
                        <button
                          type="button"
                          className="text-slate-500 hover:text-red-400"
                          onClick={() => removeKeyword(k)}
                          disabled={saving}
                          aria-label={`Remove ${k}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                      placeholder="Add keyword…"
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 min-w-[200px]"
                    />
                    <button
                      type="button"
                      disabled={saving || !newWord.trim()}
                      onClick={() => addKeyword()}
                      className="px-4 py-2 bg-[#22c55e] text-black rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Add & rescan history
                    </button>
                  </div>
                  {kwError && <p className="text-xs text-red-400">{kwError}</p>}
                </Card>
              ),
            },
          ]}
          defaultTab="alerts"
        />
      </DeviceDataShell>
    </div>
  );
}
