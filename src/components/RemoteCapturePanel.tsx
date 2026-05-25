import { useState } from 'react';
import { Camera, Mic, Monitor, RefreshCw, Video, Image } from 'lucide-react';
import type { PhotoRecord } from '@/lib/api';

type RemoteCapturePanelProps = {
  onRequest: () => Promise<unknown>;
  onRefresh: () => void;
  loading?: boolean;
  photos: PhotoRecord[];
  typeFilter?: PhotoRecord['type'];
  actionLabel: string;
  actionIcon?: 'camera' | 'mic' | 'monitor' | 'video' | 'image';
  hint?: string;
};

const icons = {
  camera: Camera,
  mic: Mic,
  monitor: Monitor,
  video: Video,
  image: Image,
};

export function RemoteCapturePanel({
  onRequest,
  onRefresh,
  loading,
  photos,
  typeFilter,
  actionLabel,
  actionIcon = 'camera',
  hint,
}: RemoteCapturePanelProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const Icon = icons[actionIcon];

  const filtered = typeFilter
    ? photos.filter((p) => p.type === typeFilter)
    : photos;

  const run = async () => {
    setBusy(true);
    setStatus('Sending request to child device…');
    try {
      await onRequest();
      setStatus('Request sent. Waiting for upload (about 5–25 seconds)…');
      setTimeout(() => {
        onRefresh();
        setStatus('Refreshed. Check results below.');
      }, 6000);
    } catch {
      setStatus('Failed to reach server. Is the backend running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => run()}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black rounded-lg hover:bg-[#16a34a] text-sm font-medium disabled:opacity-60"
        >
          <Icon className="w-4 h-4" />
          {busy ? 'Requesting…' : actionLabel}
        </button>
        <button
          type="button"
          onClick={() => onRefresh()}
          className="flex items-center gap-2 px-3 py-2 border border-slate-600 rounded-lg text-slate-300 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {status && <p className="text-xs text-emerald-400/90">{status}</p>}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.slice(0, 12).map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-800 bg-[#090d1f] overflow-hidden aspect-[3/4] relative"
            >
              {item.url.startsWith('data:image') || item.url.startsWith('http') ? (
                <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
              ) : item.type === 'audio' && item.url.startsWith('data:audio') ? (
                <div className="p-3 flex flex-col justify-center h-full">
                  <audio controls src={item.url} className="w-full" />
                  <p className="text-[10px] text-slate-400 mt-2 truncate">{item.title}</p>
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-500 flex items-center justify-center h-full text-center">
                  {item.title}
                </div>
              )}
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 px-1 rounded text-slate-300">
                {item.time.slice(11, 19)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
