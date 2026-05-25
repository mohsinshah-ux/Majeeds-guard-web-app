import { useEffect, useState } from 'react';
import { PageTitle, Card } from '@/components/ui';
import { fetchContacts } from '@/lib/api';
import { useSelectedDevice } from '@/context/SelectedDeviceContext';
import { DEVICE_CHANGED_EVENT } from '@/lib/selectedDevice';
import type { Contact } from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function ContactsPage() {
  const { selectedDeviceId } = useSelectedDevice();
  const hasDevice = Boolean(selectedDeviceId);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const [activeTab, setActiveTab] = useState<'contacts' | 'blocked'>('contacts');
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    try {
      if (!selectedDeviceId) {
        setContacts([]);
        return;
      }
      const res = await fetchContacts();
      setContacts(res);
      if (res.length > 0) {
        setSelectedId(res[0].id);
      }
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void loadContacts();
    const interval = setInterval(loadContacts, 4000);
    const onChange = () => {
      setLoading(true);
      void loadContacts();
    };
    window.addEventListener(DEVICE_CHANGED_EVENT, onChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(DEVICE_CHANGED_EVENT, onChange);
    };
  }, [selectedDeviceId]);

  const displayedContacts = hasDevice ? contacts : [];
  const filteredContacts = displayedContacts.filter(c => activeTab === 'blocked' ? c.blocked : !c.blocked);
  const selectedContact = displayedContacts.find((c) => c.id === selectedId) || displayedContacts[0];

  const handleBlockToggle = async (c: Contact) => {
    if (!hasDevice) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, blocked: !c.blocked }),
      });
      loadContacts();
    } catch {
      // quiet fail
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400 p-6 flex gap-2 items-center"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading Contacts...</div>;
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Contacts" />
      
      <div className="flex gap-2 border-b border-slate-700">
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 text-sm font-medium rounded-t ${activeTab === 'contacts' ? 'bg-[#052e16] text-[#4ade80]' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          Contacts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 text-sm font-medium rounded-t flex items-center gap-1 ${activeTab === 'blocked' ? 'bg-[#052e16] text-[#4ade80]' : 'text-slate-400 hover:bg-slate-900'}`}
        >
          Blocked Contacts
          <span className="w-2 h-2 rounded-full bg-red-500" />
        </button>
      </div>

      {displayedContacts.length === 0 ? (
        <Card>
          <EmptyState
            title={hasDevice ? 'Waiting for contacts' : 'No device bound'}
            description={
              hasDevice
                ? 'Contacts sync automatically from the child device every few minutes.'
                : 'Bind a child device to load the contacts list here.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Contacts List */}
          <Card className="md:col-span-1">
            <ul className="divide-y divide-slate-700">
              {filteredContacts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-3 text-left rounded-lg ${
                      selectedId === c.id ? 'bg-[#052e16]' : 'hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-medium flex-shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-medium text-[#e5ffe5] truncate">{c.name}</span>
                    </div>
                    {hasDevice && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBlockToggle(c);
                        }}
                        className="text-[#22c55e] text-xs hover:text-[#4ade80] border border-emerald-800 hover:border-emerald-500 px-2 py-0.5 rounded cursor-pointer flex-shrink-0"
                      >
                        {c.blocked ? 'Unblock' : 'Block'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-xs text-slate-500 italic p-4 text-center">No contacts in this list.</div>
              )}
            </ul>
          </Card>

          {/* Contact Details Card */}
          <Card className="md:col-span-2">
            {selectedContact ? (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-medium text-slate-300 mb-2">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <h2 className="text-lg font-semibold text-[#e5ffe5]">{selectedContact.name}</h2>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-slate-500 uppercase text-xs mb-1">Phone</p>
                    <p className="text-slate-300">Number: {selectedContact.phone}</p>
                  </div>
                  {selectedContact.mail && (
                    <div className="border-t border-slate-700 pt-3">
                      <p className="text-slate-500 uppercase text-xs mb-1">Mail</p>
                      <p className="text-slate-300">{selectedContact.mail}</p>
                    </div>
                  )}
                  {selectedContact.address && (
                    <div className="border-t border-slate-700 pt-3">
                      <p className="text-slate-500 uppercase text-xs mb-1">Address</p>
                      <p className="text-slate-300">{selectedContact.address}</p>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-slate-500 uppercase text-xs mb-1">Status</p>
                    <p className="text-slate-300 font-mono text-xs">
                      {selectedContact.blocked ? "🚫 Blocked App/Call Restriction Active" : "✅ Allowed"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-500 italic p-6 text-center">Select a contact to view details</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
