import { Smartphone } from 'lucide-react';

export function EmptyState({
  title = 'No live data yet',
  description = 'Bind a child device to start receiving real-time telemetry on this dashboard.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4">
        <Smartphone className="w-7 h-7 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
    </div>
  );
}
