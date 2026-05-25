import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Share2,
  Smartphone,
  Phone,
  Mic,
  MessageSquare,
  Image,
  History,
  Keyboard,
  Search,
  Wifi,
  Grid3X3,
  Video,
  User,
  Calendar,
  Radio,
  Camera,
  Monitor,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Battery,
  MessageCircle,
  Video as VideoIcon,
  ChevronLeft,
  Trash2,
} from 'lucide-react';
import { X } from 'lucide-react';

import { removeDevice } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';

export type NavSection = 'phoneData' | 'remoteControl' | 'locationTracking' | 'moreFeatures' | null;

const socialNetworkItems = [
  { path: '/social-apps', label: 'Social Apps', icon: MessageCircle },
  { path: '/app-calls', label: 'App Calls', icon: Phone },
  { path: '/app-audio', label: 'App Audio', icon: Mic },
  { path: '/video-apps', label: 'Video Apps', icon: VideoIcon },
];

const phoneDataItems = [
  { path: '/calls', label: 'Calls', icon: Phone },
  { path: '/call-recording', label: 'Call Recording', icon: Mic },
  { path: '/messages', label: 'Messages', icon: MessageSquare, badge: '20' },
  { path: '/photos', label: 'Photos', icon: Image },
  { path: '/browser-history', label: 'Browser History', icon: History, badge: '80' },
  { path: '/keylogger', label: 'Keylogger', icon: Keyboard, badge: '28' },
  { path: '/track-keywords', label: 'Track Keywords', icon: Search },
  { path: '/wifi-logger', label: 'Wi-Fi Logger', icon: Wifi },
  { path: '/app-management', label: 'App Management', icon: Grid3X3 },
  { path: '/video-preview', label: 'Video Preview', icon: Video },
  { path: '/contacts', label: 'Contacts', icon: User },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
];

const remoteControlItems = [
  { path: '/record-surround', label: 'Record Surround', icon: Mic, badge: '18' },
  { path: '/capture-screenshots', label: 'Capture Screenshots', icon: Camera, badge: '18' },
  { path: '/record-screen', label: 'Record Screen', icon: Video },
  { path: '/live-screen', label: 'Live Screen', icon: Monitor },
  { path: '/take-photos', label: 'Take Photos', icon: Camera },
  { path: '/record-video', label: 'Record Video', icon: Video },
];

const locationTrackingItems = [{ path: '/locations', label: 'Locations', icon: MapPin }];

function NavLink({
  to,
  label,
  icon: Icon,
  badge,
  isActive,
  collapsed,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  isActive: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#052e16] text-[#4ade80]'
          : 'text-slate-400 hover:bg-white/5 hover:text-[#e5ffe5]'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{label}</span>}
      {badge && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

function Section({
  title,
  expanded,
  onToggle,
  children,
  icon: Icon,
  collapsed,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon: React.ElementType;
  collapsed?: boolean;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 w-full px-3 py-2 text-white hover:bg-white/10 rounded-r-lg text-sm font-medium"
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{title}</span>}
        {!collapsed &&
          (expanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ))}
      </button>
      {expanded && !collapsed && <div className="ml-2 mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onBindClick,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onBindClick?: () => void;
}) {
  const location = useLocation();
  const [phoneDataOpen, setPhoneDataOpen] = useState(true);
  const [remoteControlOpen, setRemoteControlOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(true);
  const [socialOpen, setSocialOpen] = useState(true);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { devices, selectedDevice, setSelectedDevice, refreshDevices } = useSelectedDevice();
  const devicesWithStatus = devices.map((d) => ({
    ...d,
    status: 'Online' as const,
    battery: d.battery ?? 100,
  }));

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav
      className={`flex flex-col h-full hacker-sidebar-bg text-[#e5ffe5] ${
        collapsed ? 'w-16' : 'w-64'
      } flex-shrink-0 border-r border-slate-900/70 shadow-[inset_-1px_0_0_rgba(34,197,94,0.08)] transition-[width] duration-200`}
      aria-label="Main navigation"
    >
      {/* Top device bar */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDeviceOpen((o) => !o)}
          className="flex items-center gap-2 w-full px-3 py-3 bg-[#16a34a] text-black shadow-[0_0_12px_rgba(22,163,74,0.8)]"
        >
          <span className="text-sm font-medium truncate">
            {selectedDevice?.deviceName ?? "No device bound"}
          </span>
          <span className="text-xs opacity-90">{selectedDevice?.battery ?? "—"}%</span>
          <Battery className="w-4 h-4" strokeWidth={2} />
        </button>
        {deviceOpen && !collapsed && (
          <div className="absolute left-3 right-3 mt-1 z-40 rounded-lg bg-[#020617] border border-slate-700 shadow-xl text-sm">
                <div className="p-2 space-y-1">
                {devicesWithStatus.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-500 text-center">
                    Bind a child device to see live battery and status here.
                  </p>
                ) : null}
                {devicesWithStatus.map((d) => (
                  <div key={d.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDevice(d);
                        setDeviceOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-900 text-left ${
                        selectedDevice?.id === d.id ? 'bg-[#052e16] ring-1 ring-emerald-900/50' : ''
                      }`}
                    >
                      <span className="truncate text-sm">{d.deviceName}</span>
                      <span className={`text-xs ${d.status === "Online" ? "text-[#22c55e]" : "text-slate-400"}`}>{d.status}</span>
                    </button>
                    <button
                      type="button"
                      title="Remove device"
                      disabled={removingId === d.id}
                      onClick={async () => {
                        if (!window.confirm(`Remove "${d.deviceName}" and clear only its data? Other devices are kept.`)) return;
                        setRemovingId(d.id);
                        try {
                          await removeDevice(d.id);
                          await refreshDevices();
                          setDeviceOpen(false);
                        } catch {
                          alert('Failed to remove device. Please try again.');
                        } finally {
                          setRemovingId(null);
                        }
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            <button
              type="button"
              onClick={onBindClick}
              className="flex items-center gap-2 w-full px-3 py-2 border-t border-slate-700 text-[#22c55e] hover:bg-slate-900 rounded-b-lg"
            >
              <Plus className="w-4 h-4" />
              Add A New Device
            </button>
          </div>
        )}
      </div>

      {/* Add A New Device button (side) */}
      {!collapsed && (
        <button
          type="button"
          onClick={onBindClick}
          className="mx-3 mt-3 flex items-center justify-center gap-2 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-medium rounded-lg transition-colors shadow-[0_0_10px_rgba(34,197,94,0.6)]"
        >
          <Plus className="w-5 h-5" />
          Add A New Device
        </button>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 hacker-scrollbar">
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium mb-1 ${
            location.pathname === '/' ? 'bg-[#052e16] text-[#4ade80]' : 'text-slate-400 hover:bg-white/5 hover:text-[#e5ffe5]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          {!collapsed && <span>Dashboard</span>}
        </Link>
        <Link
          to="/logs"
          className="flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium text-white hover:bg-white/10 mb-1"
        >
          <FileText className="w-5 h-5" />
          {!collapsed && (
            <>
              <span>Logs</span>
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs">1</span>
            </>
          )}
        </Link>
        <Link
          to="/screen-time"
          className="flex items-center gap-3 px-3 py-2 rounded-r-lg text-sm font-medium text-white hover:bg-white/10 mb-1"
        >
          <Clock className="w-5 h-5" />
          {!collapsed && <span>Screen Time</span>}
        </Link>

        <Section
          title="Social Networks"
          expanded={socialOpen}
          onToggle={() => setSocialOpen(!socialOpen)}
          icon={Share2}
          collapsed={collapsed}
        >
          {socialNetworkItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.path)}
              collapsed={collapsed}
            />
          ))}
        </Section>

        <Section
          title="Phone Data"
          expanded={phoneDataOpen}
          onToggle={() => setPhoneDataOpen(!phoneDataOpen)}
          icon={Smartphone}
          collapsed={collapsed}
        >
          {phoneDataItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              isActive={isActive(item.path)}
              collapsed={collapsed}
            />
          ))}
        </Section>

        <Section
          title="Remote Control"
          expanded={remoteControlOpen}
          onToggle={() => setRemoteControlOpen(!remoteControlOpen)}
          icon={Radio}
          collapsed={collapsed}
        >
          {remoteControlItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              isActive={isActive(item.path)}
            />
          ))}
        </Section>

        <Section
          title="Location Tracking"
          expanded={locationOpen}
          onToggle={() => setLocationOpen(!locationOpen)}
          icon={MapPin}
        >
          {locationTrackingItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.path)}
            />
          ))}
        </Section>

      </div>

      <div className="p-3 border-t border-white/10 flex items-center justify-end gap-2">
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </nav>
  );
}

export function MobileSidebar({
  open,
  onClose,
  onBindClick,
}: {
  open: boolean;
  onClose: () => void;
  onBindClick?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 w-72 shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between p-3 bg-[#0f172a] border-b border-white/10">
          <span className="font-semibold text-white">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar onBindClick={onBindClick} />
      </div>
    </div>
  );
}
