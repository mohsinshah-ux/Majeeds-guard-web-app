interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-[#0f172a] rounded-xl border border-slate-700 shadow-sm overflow-hidden ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-sm font-semibold text-[#e5ffe5]">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
