import { RefreshCw, HelpCircle } from 'lucide-react';

interface PageTitleProps {
  title: string;
  showRefresh?: boolean;
  showInfo?: boolean;
}

export function PageTitle({ title, showRefresh = true, showInfo = false }: PageTitleProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h1 className="text-xl font-bold text-[#e5ffe5]">{title}</h1>
      {showRefresh && (
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-slate-900 text-slate-400 hover:text-[#22c55e]"
          aria-label="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      )}
      {showInfo && (
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-slate-900 text-[#22c55e]"
          aria-label="Info"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
