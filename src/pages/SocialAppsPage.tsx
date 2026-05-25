import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageTitle, Card } from '@/components/ui';
import {
  fetchSocialChatsRaw,
  fetchInstalledApps,
  downloadMediaUrl,
  requestHistoricalSync,
} from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import type { BackendSocialChat } from '@/lib/api';
import { Search, MessageCircle, Instagram, Facebook, PhoneCall, MessageSquare, Camera, Phone, Send, RefreshCw, Download, Film } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

const socialApps = ['WhatsApp', 'Facebook', 'Instagram', 'Messenger', 'Snapchat', 'Telegram', 'Line', 'Viber', 'WeChat', 'Discord', 'Kik', 'TikTok'];

const appMeta: Record<string, { icon: React.ElementType; bg: string }> = {
  WhatsApp: { icon: MessageCircle, bg: 'bg-emerald-500' },
  Facebook: { icon: Facebook, bg: 'bg-blue-600' },
  Instagram: { icon: Instagram, bg: 'bg-pink-500' },
  Messenger: { icon: MessageSquare, bg: 'bg-sky-500' },
  Snapchat: { icon: Camera, bg: 'bg-yellow-400' },
  Telegram: { icon: Send, bg: 'bg-sky-400' },
  Line: { icon: MessageCircle, bg: 'bg-green-500' },
  Viber: { icon: PhoneCall, bg: 'bg-purple-500' },
  WeChat: { icon: MessageCircle, bg: 'bg-emerald-600' },
  Discord: { icon: MessageSquare, bg: 'bg-indigo-500' },
  Kik: { icon: MessageCircle, bg: 'bg-lime-500' },
  TikTok: { icon: Phone, bg: 'bg-fuchsia-500' },
};

type ChatThread = {
  name: string;
  snippet: string;
  time: string;
  messages: {
    id: number;
    type: 'incoming' | 'outgoing';
    name: string;
    text: string;
    fullText: string;
    messageType: string;
    mediaUrl: string | null;
    time: string;
  }[];
};

export function SocialAppsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialApp = (searchParams.get('app') || 'whatsapp').toLowerCase();
  const initialAppLabel = useMemo(() => {
    const match = socialApps.find((a) => a.toLowerCase() === initialApp);
    return match || 'WhatsApp';
  }, [initialApp]);

  const [selectedApp, setSelectedApp] = useState<string>(initialAppLabel);
  const [selectedChat, setSelectedChat] = useState('');
  const { selectedDeviceId } = useSelectedDevice();
  const hasDevice = Boolean(selectedDeviceId);
  const [rawChats, setRawChats] = useState<BackendSocialChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [installedSocialApps, setInstalledSocialApps] = useState<string[]>(socialApps);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      if (hasDevice) {
        const apps = await fetchInstalledApps();
        const installedNames = apps.map((a) => a.name.toLowerCase());
        const filtered = socialApps.filter((sa) => installedNames.includes(sa.toLowerCase()));
        if (filtered.length > 0) setInstalledSocialApps(filtered);
      }

      const res = await fetchSocialChatsRaw();
      setRawChats(res);
    } catch {
      // quiet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (hasDevice) await requestHistoricalSync();
      await loadChats();
    })();
    const interval = setInterval(() => loadChats(true), 5000);
    const onChange = () => void loadChats();
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [hasDevice, selectedDeviceId]);

  const parsedRealChats = useMemo((): ChatThread[] => {
    if (!hasDevice) return [];
    const grouped: Record<string, ChatThread> = {};

    rawChats
      .filter((item) => item.app.toLowerCase().includes(selectedApp.toLowerCase()))
      .forEach((item) => {
        const contactName = item.contact.trim() || 'Unknown';
        const key = contactName;
        if (!grouped[key]) {
          grouped[key] = { name: contactName, snippet: item.preview, time: item.time, messages: [] };
        }
        const t = item.time.replace('T', ' ').slice(11, 19);
        grouped[key].messages.unshift({
          id: item.id,
          type: 'incoming',
          name: contactName,
          text: item.preview,
          fullText: item.fullText || item.preview,
          messageType: item.messageType || 'text',
          mediaUrl: item.mediaUrl ?? null,
          time: t,
        });
        if (item.time > grouped[key].time) {
          grouped[key].time = item.time;
          grouped[key].snippet = item.preview;
        }
      });

    return Object.values(grouped);
  }, [hasDevice, rawChats, selectedApp]);

  useEffect(() => {
    if (hasDevice && parsedRealChats.length > 0 && !selectedChat) {
      setSelectedChat(parsedRealChats[0].name);
    }
  }, [hasDevice, parsedRealChats, selectedChat]);

  const currentChatObj = parsedRealChats.find((c) => c.name === selectedChat);
  const displayedMessages = currentChatObj?.messages ?? [];

  if (loading) {
    return (
      <div className="text-sm text-slate-400 p-6 flex gap-2 items-center">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading chats from child device…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Social Apps" />
      <p className="text-xs text-slate-500">
        Chats sync from notification previews on the child device (existing notifications + new messages in real time).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 bg-[#0f172a] border-slate-700 p-0 overflow-hidden">
          <div className="grid grid-cols-[56px_minmax(0,1fr)] h-[550px]">
            <div className="border-r border-slate-800 bg-[#020617] p-2 space-y-2 overflow-y-auto">
              {installedSocialApps.map((app) => {
                const active = app === selectedApp;
                const meta = appMeta[app] ?? { icon: MessageCircle, bg: 'bg-slate-800' };
                const Icon = meta.icon;
                return (
                  <button
                    key={app}
                    type="button"
                    onClick={() => {
                      setSelectedApp(app);
                      setSelectedChat('');
                      navigate(`/social-apps?app=${encodeURIComponent(app.toLowerCase())}`);
                    }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      active ? `${meta.bg} text-black` : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={app}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            <div className="p-3 flex flex-col h-full overflow-hidden">
              <h3 className="text-sm font-semibold text-[#e5ffe5] border-b border-slate-800 pb-2 mb-2 flex justify-between">
                <span>{selectedApp}</span>
                {hasDevice && <span className="text-[9px] text-emerald-400 font-mono">LIVE</span>}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-1">
                {parsedRealChats.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedChat(c.name)}
                    className={`w-full flex items-center gap-2 px-2 py-2 text-left rounded-lg ${
                      selectedChat === c.name ? 'bg-[#052e16] border border-emerald-900/30' : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{c.snippet}</p>
                    </div>
                  </button>
                ))}
                {parsedRealChats.length === 0 && (
                  <EmptyState
                    title="No chats for this app"
                    description="Enable Notification access on the child phone. Open social apps so notifications appear."
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-8 bg-[#0f172a] border-slate-700 h-[550px] flex flex-col">
          <div className="flex gap-2 border-b border-slate-800 p-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search chats" className="w-full pl-9 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-xs text-slate-300" />
            </div>
            <button type="button" onClick={() => loadChats()} className="p-1.5 border border-slate-700 rounded-lg text-slate-400">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayedMessages.map((m) => (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2 bg-slate-900 border border-slate-800">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">{m.name}</p>
                  {m.mediaUrl && m.messageType === 'image' && (
                    <div className="mb-2">
                      <img src={m.mediaUrl} alt="Chat attachment" className="max-w-full rounded-lg max-h-48 object-contain" />
                      <button
                        type="button"
                        onClick={() => downloadMediaUrl(m.mediaUrl!, `chat-${m.id}.jpg`)}
                        className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1 hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download image
                      </button>
                    </div>
                  )}
                  {m.messageType === 'video' && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                      <Film className="w-4 h-4" />
                      Video shared
                      {m.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => downloadMediaUrl(m.mediaUrl!, `chat-video-${m.id}.jpg`)}
                          className="text-emerald-400 hover:underline"
                        >
                          Download preview
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{m.fullText}</p>
                  <p className="text-[9px] text-slate-500 text-right mt-1 font-mono">{m.time}</p>
                </div>
              </div>
            ))}
            {displayedMessages.length === 0 && (
              <p className="text-slate-500 text-xs text-center p-12">Select a thread to read full messages.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
