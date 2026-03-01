'use client';

import { useState, useEffect, useRef } from 'react';
import { sendAdminMessage, sendPortalMessage, markMessagesRead } from '@/actions/messages';

interface Message {
    id: string;
    content: string;
    fromTenant: boolean;
    readAt: Date | null;
    createdAt: Date;
}

interface Props {
    tenantId: string;
    initialMessages: Message[];
    // If portalToken is set, we are in portal (tenant) mode
    portalToken?: string;
}

export default function TenantMessaging({ tenantId, initialMessages, portalToken }: Props) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const isPortal = !!portalToken;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Portal only: mark admin messages as read when tenant opens the conversation
    useEffect(() => {
        if (isPortal) {
            markMessagesRead(tenantId, false).catch(() => {});
        }
    }, [tenantId, isPortal]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);

        const res = isPortal
            ? await sendPortalMessage(tenantId, text, portalToken!)
            : await sendAdminMessage(tenantId, text);

        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message as Message]);
            setText('');
            // Admin replying → mark tenant messages as read
            if (!isPortal) {
                markMessagesRead(tenantId, true).catch(() => {});
            }
        }
        setSending(false);
    };

    const unreadCount = messages.filter(m => m.fromTenant !== isPortal && !m.readAt).length;

    return (
        <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    💬 {isPortal ? 'Messagerie avec votre propriétaire' : 'Messagerie'}
                </h3>
                {!isPortal && unreadCount > 0 && (
                    <button
                        onClick={() => {
                            markMessagesRead(tenantId, true).catch(() => {});
                            setMessages(prev => prev.map(m => m.fromTenant && !m.readAt ? { ...m, readAt: new Date() } : m));
                        }}
                        style={{ background: '#e879a8', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                        title="Marquer tous les messages du locataire comme lus"
                    >
                        {unreadCount} non lu{unreadCount > 1 ? 's' : ''} · ✓ Lu
                    </button>
                )}
            </div>

            {/* Messages thread */}
            <div style={{ height: '320px', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4rem', fontSize: '0.9rem' }}>
                        Aucun message pour l'instant.
                    </p>
                ) : (
                    messages.map(msg => {
                        const isMine = isPortal ? msg.fromTenant : !msg.fromTenant;
                        return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '75%',
                                    padding: '0.6rem 0.9rem',
                                    borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: isMine ? '#2b8cee' : 'var(--surface-active)',
                                    color: isMine ? 'white' : 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}>
                                    {msg.content}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    {new Date(msg.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {isMine && msg.readAt && <span style={{ marginLeft: '0.3rem' }}>✓✓</span>}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Votre message..."
                    style={{ flex: 1, padding: '0.6rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', background: 'var(--surface-active)', color: 'var(--text-main)' }}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    style={{ padding: '0.6rem 1.2rem', background: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', opacity: sending || !text.trim() ? 0.6 : 1 }}
                >
                    {sending ? '...' : 'Envoyer'}
                </button>
            </form>
        </div>
    );
}
