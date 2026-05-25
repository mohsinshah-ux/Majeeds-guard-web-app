import { useEffect, useMemo, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { Card, Table, Dropdown } from '@/components/ui';
import { Search, RefreshCw, HelpCircle, MapPin } from 'lucide-react';
import { LeafletMap } from '@/components/Map/LeafletMap';
import type { LocationRecord } from '@/data/locationHistory';
import { fetchLocations } from '@/lib/api';

const columns = [
  { key: 'address' as const, header: 'Address' },
  { key: 'lat' as const, header: 'Longitude and Latitude', render: (r: { lat: number; lng: number }) => (
    <span className="flex items-center gap-1 text-blue-600">
      <MapPin className="w-4 h-4" /> {r.lat},{r.lng}
    </span>
  ) },
  { key: 'time' as const, header: 'Location Time' },
  { key: 'map' as const, header: 'Map View', render: () => <button type="button" className="text-blue-600 hover:underline text-sm">View</button> },
];

export function LocationsPage() {
  const [rows, setRows] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchLocations();
        if (isMounted) setRows(data);
      } catch {
        if (isMounted) setError('Failed to load locations from backend API.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLocations();
      setRows(data);
    } catch {
      setError('Failed to load locations from backend API.');
    } finally {
      setIsLoading(false);
    }
  };

  const locationsData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        time: `${row.date} ${row.time}`
      })),
    [rows]
  );

  const mapCenter =
    locationsData[0] !== undefined
      ? { lat: locationsData[0].lat, lng: locationsData[0].lng }
      : { lat: 40.7128, lng: -74.006 };

  return (
    <div className="space-y-4">
      <PageTitle title="Locations" showInfo />
      <div className="flex flex-wrap gap-2 items-center">
        <Dropdown options={[{ value: 'all', label: 'All' }]} value="all" placeholder="All" aria-label="Date" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked /> GPS On
        </label>
        <div className="flex-1 min-w-[200px] relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search" className="w-full pl-9 pr-3 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-sm text-slate-300 placeholder-slate-500" />
        </div>
        <button type="button" onClick={load} className="p-2 border border-slate-600 rounded-lg hover:bg-slate-800 text-slate-400"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
        <button type="button" className="p-2 border border-slate-600 rounded-lg hover:bg-slate-800 text-slate-400"><HelpCircle className="w-5 h-5" /></button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Card className="overflow-hidden p-0">
        <div className="h-64 relative border border-slate-800 bg-[#0b1022]">
          <LeafletMap
            key={`${mapCenter.lat}-${mapCenter.lng}`}
            center={mapCenter}
            zoom={13}
            markers={
              locationsData[0]
                ? [
                    {
                      position: { lat: locationsData[0].lat, lng: locationsData[0].lng },
                      popup: (
                        <div className="text-sm">
                          <div className="font-semibold">Address</div>
                          <div className="text-slate-700">{locationsData[0].address}</div>
                          <div className="mt-1 text-slate-700">{locationsData[0].time}</div>
                        </div>
                      ),
                    },
                  ]
                : []
            }
            className="h-full w-full"
          />
          <div className="pointer-events-none absolute top-4 left-4 bg-[#020617]/90 border border-slate-700 rounded-lg shadow p-3 text-sm max-w-xs text-[#e5ffe5] backdrop-blur">
            <p className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#22c55e]" />
              Last known position
            </p>
            <p className="mt-1 text-slate-300">{locationsData[0]?.address ?? 'No location data'}</p>
            <p className="mt-1 text-slate-400 text-xs">{locationsData[0]?.time ?? '-'}</p>
          </div>
        </div>
      </Card>
      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading locations...</p>
        ) : (
          <Table columns={columns} data={locationsData} keyField="id" aria-label="Location history" />
        )}
      </Card>
      <p className="text-center text-sm text-slate-500">Copyright © 2026 ClevGuard.org. All rights reserved.</p>
    </div>
  );
}
