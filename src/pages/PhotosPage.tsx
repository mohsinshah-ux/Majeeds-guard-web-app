import { useCallback, useEffect, useState } from 'react';
import { PageTitle, Card } from '@/components/ui';
import { Trash2, RefreshCw, Camera, Download } from 'lucide-react';
import { fetchPhotos, downloadPhotoAsset, requestGallerySync } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import type { PhotoRecord } from '@/lib/api';

export function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedDeviceId } = useSelectedDevice();

  const loadPhotos = useCallback(async (showInitial = false) => {
    if (showInitial) setInitialLoading(true);
    try {
      if (!selectedDeviceId) {
        setPhotos([]);
        setError(null);
        return;
      }
      const res = await fetchPhotos('gallery');
      setPhotos(res.filter((p) => p.type === 'gallery' || !p.type));
      setError(null);
    } catch {
      setError('Failed to fetch photo gallery from child device.');
    } finally {
      if (showInitial) setInitialLoading(false);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    void (async () => {
      if (selectedDeviceId) {
        await requestGallerySync();
      }
      await loadPhotos(true);
    })();
    const interval = setInterval(() => void loadPhotos(false), 8000);
    const onChange = () => void loadPhotos(true);
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [loadPhotos, selectedDeviceId]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSelect = () => {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((p) => p.id)));
  };

  const canShowImage = (p: PhotoRecord) =>
    p.url.startsWith('data:image') || p.url.startsWith('http');

  return (
    <div className="space-y-4">
      <PageTitle title="Photos" />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={photos.length > 0 && selected.size === photos.length}
              onChange={toggleAllSelect}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500"
            />
            Select All
          </label>
          <button type="button" className="p-2 text-slate-500 hover:text-red-500 disabled:opacity-50" disabled={selected.size === 0}>
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            await requestGallerySync();
            await loadPhotos(false);
            setSyncing(false);
          }}
          className="p-2 border border-slate-700 rounded-lg hover:bg-slate-900 text-slate-400 flex items-center gap-1.5 text-xs font-semibold"
        >
          {syncing ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <RefreshCw className="w-4 h-4" />}
          Sync gallery from child
        </button>
      </div>

      {initialLoading && photos.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading gallery from child device…
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 italic text-sm border-slate-800 bg-[#020617]">
          <Camera className="w-8 h-8 mx-auto mb-3 text-slate-600" />
          No gallery photos yet. Grant Photos permission on the child app and tap Sync.
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative rounded-lg border border-slate-800 bg-[#090d1f] overflow-hidden group aspect-square shadow-lg"
            >
              {canShowImage(p) ? (
                <img src={p.url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                  <Camera className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-[10px] text-slate-500">{p.title}</span>
                </div>
              )}

              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleSelect(p.id)}
                className="absolute top-1 left-1 rounded border-slate-700 bg-slate-900 text-emerald-500"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-slate-200 truncate font-semibold">{p.title}</p>
                {canShowImage(p) && (
                  <button
                    type="button"
                    onClick={() => downloadPhotoAsset(p)}
                    className="mt-1 flex items-center gap-1 text-[10px] bg-[#22c55e] text-black px-2 py-0.5 rounded font-semibold"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
