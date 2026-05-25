import { Link } from 'react-router-dom';
import { Globe, Menu, Bell, FileText, Home } from 'lucide-react';
import { useState } from 'react';

const langOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

export function Header() {
  const [lang, setLang] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-14 bg-[#020617] border-b border-slate-800 flex items-center flex-shrink-0 text-[#e5ffe5]">
      {/* Left: actions */}
      <div className="flex items-center h-full">
        <Link
          to="/"
          className="flex items-center gap-2 h-full px-4 text-slate-300 hover:text-[#4ade80] hover:bg-slate-900 font-medium text-sm"
        >
          Dashboard
        </Link>
        <button
          type="button"
          className="h-full px-3 text-slate-400 hover:bg-slate-800"
          aria-label="Document"
        >
          <FileText className="w-5 h-5" />
        </button>
      </div>

      {/* Right: notifications, language */}
      <div className="flex-1 flex items-center justify-end gap-2 px-4">
        <Link
          to="/"
          className="hidden sm:flex items-center gap-1.5 text-slate-300 hover:text-[#4ade80]"
          aria-label="Home"
        >
          <Home className="w-5 h-5" />
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 text-slate-400 hover:text-[#22c55e] rounded-lg hover:bg-slate-900"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-[#020617] border border-slate-700 rounded-lg shadow-xl z-40">
              <div className="px-3 py-2 border-b border-slate-700 text-sm font-semibold text-[#e5ffe5]">
                Notifications
              </div>
              <ul className="max-h-64 overflow-auto hacker-scrollbar text-sm">
                <li className="px-3 py-2 border-b border-slate-800">
                  <div className="text-[#e5ffe5]">Demo alert</div>
                  <div className="text-xs text-slate-500">You are viewing demo data.</div>
                </li>
                <li className="px-3 py-2 border-b border-slate-800">
                  <div className="text-[#e5ffe5]">New keylog matches</div>
                  <div className="text-xs text-slate-500">2 risky keywords detected today.</div>
                </li>
                <li className="px-3 py-2">
                  <div className="text-[#e5ffe5]">Device online</div>
                  <div className="text-xs text-slate-500">John's Galaxy S24 just connected.</div>
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-lg"
            aria-haspopup="listbox"
            aria-expanded={langOpen}
          >
            <Globe className="w-4 h-4" />
            {langOptions.find((o) => o.value === lang)?.label ?? 'English'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <ul className="absolute right-0 top-full mt-1 w-40 bg-[#020617] border border-slate-700 rounded-lg shadow-lg py-1 z-30">
              {langOptions.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => { setLang(o.value); setLangOpen(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}

export function DemoBanner({ onBindClick }: { onBindClick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#022c22] border-b border-[#16a34a]">
      <p className="text-sm text-[#e5ffe5]">
        You are now viewing demo data. To start collecting actual data, please bind your own device.
      </p>
      <button
        type="button"
        onClick={onBindClick}
        className="flex-shrink-0 px-4 py-2 bg-[#16a34a] hover:bg-[#22c55e] text-black text-sm font-medium rounded-lg transition-colors shadow-[0_0_10px_rgba(34,197,94,0.6)]"
      >
        Bind My Device
      </button>
    </div>
  );
}

export function SidebarMobileToggle({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onMenuClick}
      className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
      aria-label="Open menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
