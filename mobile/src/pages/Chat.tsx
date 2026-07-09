import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/landlord';

interface Message {
  id: string;
  content: string;
  fromTenant: boolean;
  createdAt: string;
}

interface ChatData {
  tenant: { id: string; firstName: string; lastName: string } | null;
  messages: Message[];
}

export default function Chat() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [data, setData] = useState<ChatData | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = () => api.getMessages(tenantId!).then(setData);

  useEffect(() => { load(); }, [tenantId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(tenantId!, input.trim());
      setInput('');
      await load();
    } finally {
      setSending(false);
    }
  };

  if (data && !data.tenant) {
    return (
      <div className="flex flex-col safe-top" style={{ height: '100%' }}>
        <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0">
          <button onClick={() => navigate('/messages')} className="text-text-muted text-lg">←</button>
          <p className="text-text-main font-semibold text-sm">Conversation</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-text-muted text-sm text-center">Locataire introuvable — il a peut-être été supprimé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col safe-top" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0">
        <button onClick={() => navigate('/messages')} className="text-text-muted text-lg">←</button>
        <div>
          <p className="text-text-main font-semibold text-sm">
            {data?.tenant?.firstName} {data?.tenant?.lastName}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {data?.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.fromTenant ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              msg.fromTenant
                ? 'bg-surface-active text-text-main rounded-tl-sm'
                : 'bg-primary text-white rounded-tr-sm'
            }`}>
              <p>{msg.content}</p>
              <p className={`text-xs mt-0.5 ${msg.fromTenant ? 'text-text-muted' : 'text-white/70'}`}>
                {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 bg-surface border-t border-border shrink-0 pb-nav">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 bg-surface-active border border-border rounded-xl px-3 py-2 text-text-main text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {sending ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}
