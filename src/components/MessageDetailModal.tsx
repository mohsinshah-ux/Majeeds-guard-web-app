type MessageDetailModalProps = {
  open: boolean;
  contact: string;
  channel: string;
  fullText: string;
  date: string;
  time: string;
  onClose: () => void;
};

export function MessageDetailModal({
  open,
  contact,
  channel,
  fullText,
  date,
  time,
  onClose,
}: MessageDetailModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-detail-title"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-xl border border-slate-700 bg-[#0f172a] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="message-detail-title" className="text-lg font-semibold text-[#e5ffe5]">
          {contact}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {channel} · {date} {time}
        </p>
        <div className="mt-4 p-4 rounded-lg bg-slate-900 border border-slate-800 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed">{fullText}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-[#22c55e] text-black text-sm font-medium hover:bg-[#16a34a]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
