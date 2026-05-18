'use client';

import { useState, useRef, useEffect } from 'react';
import TenantMessaging from './TenantMessaging';
import { reportIncident } from '@/actions/portal';
import { addPortalTaskNote } from '@/actions/tasks';
import { sendPortalMessage, markMessagesRead } from '@/actions/messages';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'home' | 'payments' | 'incidents' | 'messages' | 'documents';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Accueil', icon: '🏠' },
    { id: 'payments', label: 'Paiements', icon: '💳' },
    { id: 'incidents', label: 'Incidents', icon: '🔧' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'documents', label: 'Documents', icon: '📁' },
];

// APK color palette (matches rentmaestro-mobile tailwind.config.js)
const C = {
    bg: '#0a0e1a',
    surface: '#141824',
    sa: '#1e2535',
    border: '#2a3045',
    primary: '#2b8cee',
    tm: '#e2e8f0',
    ts: '#94a3b8',
    mu: '#64748b',
    paid: '#22c55e',
    pend: '#f59e0b',
    late: '#ef4444',
};

interface Payment {
    id: string;
    period: Date;
    amount: number;
    status: string;
}
interface TaskNote {
    id: string;
    content: string;
    authorType: string;
    createdAt: Date | string;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date | string;
    notes?: TaskNote[];
}
interface Message {
    id: string;
    content: string;
    fromTenant: boolean;
    readAt: Date | null;
    createdAt: Date;
}
interface Apartment {
    address: string;
    complement: string | null;
    zipCode: string;
    city: string;
}
interface Lease {
    id: string;
    apartmentId: string;
    rentAmount: number;
    chargesAmount: number;
    startDate: Date;
    apartment: Apartment;
    payments: Payment[];
}

interface PortalDoc {
    name: string;
    url: string;
    docType: string;
}

interface PortalDocuments {
    leaseDocs: PortalDoc[];
    tenantDocs: PortalDoc[];
    apartmentDocs: PortalDoc[];
    companyDocs: PortalDoc[];
    globalDocs: PortalDoc[];
}

export interface PortalShellProps {
    tenantId: string;
    firstName: string;
    lastName: string;
    token: string;
    currentLease: Lease | null;
    allPayments: Payment[];
    initialTasks: Task[];
    initialMessages: Message[];
    portalDocuments: PortalDocuments;
}

function PaymentBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        PAID: { label: 'Payé', color: C.paid },
        PENDING: { label: 'En attente', color: C.pend },
        LATE: { label: 'En retard', color: C.late },
    };
    const s = map[status] ?? { label: status, color: C.mu };
    return (
        <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
            borderRadius: '9999px', color: s.color, background: s.color + '22',
            flexShrink: 0,
        }}>{s.label}</span>
    );
}

function TaskBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        TODO: { label: 'Ouvert', color: C.pend },
        IN_PROGRESS: { label: 'En cours', color: C.primary },
        DONE: { label: 'Résolu', color: C.paid },
    };
    const s = map[status] ?? { label: status, color: C.mu };
    return (
        <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
            borderRadius: '9999px', color: s.color, background: s.color + '22',
            flexShrink: 0,
        }}>{s.label}</span>
    );
}

export default function PortalShell({
    tenantId, firstName, lastName, token,
    currentLease, allPayments, initialTasks, initialMessages, portalDocuments,
}: PortalShellProps) {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [messages, setMessages] = useState<Message[]>(initialMessages);

    // Incident form state
    const [showForm, setShowForm] = useState(false);
    const [incTitle, setIncTitle] = useState('');
    const [incDesc, setIncDesc] = useState('');
    const [submittingInc, setSubmittingInc] = useState(false);
    const [incSuccess, setIncSuccess] = useState('');

    // Task notes state
    const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
    const [noteAdding, setNoteAdding] = useState<Record<string, boolean>>({});
    const [localTaskNotes, setLocalTaskNotes] = useState<Record<string, TaskNote[]>>({});

    // Message input state
    const [msgText, setMsgText] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === 'messages') {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab]);

    useEffect(() => {
        if (activeTab === 'messages') {
            markMessagesRead(tenantId, false).catch(() => { });
        }
    }, [activeTab, tenantId]);

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLease || !incTitle.trim()) return;
        setSubmittingInc(true);
        const res = await reportIncident(currentLease.apartmentId, tenantId, incTitle.trim(), incDesc.trim(), token);
        setSubmittingInc(false);
        if (res.success) {
            setTasks(prev => [{
                id: '_' + Date.now(),
                title: incTitle.trim(),
                description: incDesc.trim() || null,
                status: 'TODO',
                createdAt: new Date(),
            }, ...prev]);
            setIncTitle('');
            setIncDesc('');
            setShowForm(false);
            setIncSuccess('Signalement transmis au propriétaire.');
            setTimeout(() => setIncSuccess(''), 4000);
        }
    };

    const handleAddPortalNote = async (taskId: string) => {
        const content = noteInputs[taskId]?.trim();
        if (!content) return;
        setNoteAdding(prev => ({ ...prev, [taskId]: true }));
        const res = await addPortalTaskNote(taskId, content, token);
        if (res.success && res.note) {
            setLocalTaskNotes(prev => ({
                ...prev,
                [taskId]: [...(prev[taskId] ?? []), res.note as TaskNote],
            }));
            setNoteInputs(prev => ({ ...prev, [taskId]: '' }));
        }
        setNoteAdding(prev => ({ ...prev, [taskId]: false }));
    };

    const handleSendMsg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgText.trim()) return;
        setSendingMsg(true);
        const res = await sendPortalMessage(tenantId, msgText.trim(), token);
        setSendingMsg(false);
        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message as Message]);
            setMsgText('');
        }
    };

    // ─── DOCUMENTS TAB ──────────────────────────────────────────
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const docGroups = [
        { label: 'Documents du bail', docs: portalDocuments.leaseDocs },
        { label: 'Mes documents', docs: portalDocuments.tenantDocs },
        { label: 'Logement', docs: portalDocuments.apartmentDocs },
        { label: 'Documents propriétaire', docs: portalDocuments.companyDocs },
        { label: 'Documents généraux', docs: portalDocuments.globalDocs },
    ].filter(g => g.docs.length > 0);

    const hasAnyDoc = docGroups.length > 0;

    const DocumentsTab = (
        <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.tm, marginBottom: '1rem' }}>Documents</h1>
            {!hasAnyDoc ? (
                <p style={{ fontSize: '0.875rem', color: C.ts }}>Aucun document disponible pour le moment.</p>
            ) : (
                docGroups.map(group => (
                    <div key={group.label} style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                            {group.label}
                        </p>
                        {group.docs.map(doc => (
                            <a
                                key={doc.url}
                                href={doc.url.startsWith('http') ? doc.url : `${baseUrl}${doc.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.6rem 0.875rem', marginBottom: '0.35rem',
                                    background: C.surface, borderRadius: '10px', border: `1px solid ${C.border}`,
                                    textDecoration: 'none', gap: '0.5rem',
                                }}
                            >
                                <span style={{ fontSize: '0.875rem', color: C.tm, wordBreak: 'break-word', flex: 1 }}>📄 {doc.name}</span>
                                {doc.docType && <span style={{ fontSize: '0.7rem', color: C.mu, flexShrink: 0 }}>{doc.docType}</span>}
                            </a>
                        ))}
                    </div>
                ))
            )}
        </div>
    );

    // ─── Shared card style ───────────────────────────────────────
    const card: React.CSSProperties = {
        background: C.surface,
        borderRadius: '12px',
        border: `1px solid ${C.border}`,
        padding: '0.875rem',
        marginBottom: '0.75rem',
    };

    // ─── HOME TAB ────────────────────────────────────────────────
    const HomeTab = (
        <div>
            <div style={{ marginBottom: '1.25rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.tm, margin: 0 }}>
                    Bonjour, {firstName} 👋
                </h1>
                <p style={{ fontSize: '0.85rem', color: C.ts, marginTop: '0.15rem' }}>Espace Locataire</p>
            </div>

            {!currentLease ? (
                <div style={card}>
                    <p style={{ color: C.ts, fontSize: '0.875rem' }}>Aucun bail actif.</p>
                </div>
            ) : (
                <>
                    <div style={card}>
                        <p style={{ fontSize: '0.65rem', color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                            Votre logement
                        </p>
                        {[
                            ['Adresse', currentLease.apartment.address],
                            ...(currentLease.apartment.complement ? [['Complément', currentLease.apartment.complement]] : []),
                            ['Ville', `${currentLease.apartment.zipCode} ${currentLease.apartment.city}`],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                                <span style={{ fontSize: '0.75rem', color: C.mu }}>{label}</span>
                                <span style={{ fontSize: '0.75rem', color: C.tm, fontWeight: 500 }}>{value}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                                <span style={{ fontSize: '0.75rem', color: C.mu }}>Loyer CC</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.primary }}>
                                    {(currentLease.rentAmount + currentLease.chargesAmount).toFixed(2)} €/mois
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                                <span style={{ fontSize: '0.75rem', color: C.mu }}>Depuis le</span>
                                <span style={{ fontSize: '0.75rem', color: C.tm }}>
                                    {new Date(currentLease.startDate).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {currentLease.payments[0] && (
                        <div style={card}>
                            <p style={{ fontSize: '0.65rem', color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                                Dernier paiement
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: C.tm, textTransform: 'capitalize', marginBottom: '0.1rem' }}>
                                        {format(new Date(currentLease.payments[0].period), 'MMMM yyyy', { locale: fr })}
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: C.ts }}>
                                        {currentLease.payments[0].amount.toFixed(2)} €
                                    </p>
                                </div>
                                <PaymentBadge status={currentLease.payments[0].status} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    // ─── PAYMENTS TAB ────────────────────────────────────────────
    const PaymentsTab = (
        <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.tm, marginBottom: '1rem' }}>Paiements</h1>
            {allPayments.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: C.ts }}>Aucun paiement enregistré.</p>
            ) : (
                allPayments.map(p => (
                    <div key={p.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: C.tm, textTransform: 'capitalize', marginBottom: '0.15rem' }}>
                                {format(new Date(p.period), 'MMMM yyyy', { locale: fr })}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: C.ts, marginBottom: '0.3rem' }}>{p.amount.toFixed(2)} €</p>
                            <PaymentBadge status={p.status} />
                        </div>
                        {p.status === 'PAID' && (
                            <a
                                href={`/api/portal/${token}/quittance/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    flexShrink: 0, fontSize: '0.75rem', fontWeight: 600,
                                    padding: '0.5rem 0.75rem', background: C.primary + '20',
                                    color: C.primary, borderRadius: '10px',
                                    border: `1px solid ${C.primary}30`,
                                    textDecoration: 'none',
                                }}
                            >
                                📄 Quittance
                            </a>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    // ─── INCIDENTS TAB ───────────────────────────────────────────
    const IncidentsTab = (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.tm, margin: 0 }}>Incidents</h1>
                {currentLease && (
                    <button
                        onClick={() => setShowForm(v => !v)}
                        style={{ background: C.primary, color: 'white', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.85rem', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                    >
                        + Signaler
                    </button>
                )}
            </div>

            {incSuccess && (
                <div style={{ fontSize: '0.85rem', color: C.paid, background: C.paid + '18', border: `1px solid ${C.paid}30`, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                    ✓ {incSuccess}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleReport} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: C.tm, margin: 0 }}>Nouveau signalement</h2>
                    <input
                        type="text"
                        value={incTitle}
                        onChange={e => setIncTitle(e.target.value)}
                        placeholder="Objet du problème *"
                        required
                        style={{ background: C.sa, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '0.6rem 0.85rem', color: C.tm, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <textarea
                        value={incDesc}
                        onChange={e => setIncDesc(e.target.value)}
                        placeholder="Description (optionnel)"
                        rows={3}
                        style={{ background: C.sa, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '0.6rem 0.85rem', color: C.tm, fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.ts, fontSize: '0.875rem', fontWeight: 500, padding: '0.6rem', borderRadius: '10px', cursor: 'pointer' }}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submittingInc || !incTitle.trim()}
                            style={{ flex: 1, background: C.primary, color: 'white', fontSize: '0.875rem', fontWeight: 600, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer', opacity: (submittingInc || !incTitle.trim()) ? 0.5 : 1 }}
                        >
                            {submittingInc ? 'Envoi...' : 'Envoyer'}
                        </button>
                    </div>
                </form>
            )}

            {tasks.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: C.ts }}>Aucun incident signalé.</p>
            ) : (
                tasks.map(task => {
                    const allNotes = [...(task.notes ?? []), ...(localTaskNotes[task.id] ?? [])];
                    const isAdding = noteAdding[task.id] ?? false;
                    return (
                        <div key={task.id} style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: task.description ? '0.4rem' : '0.4rem' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: C.tm, margin: 0 }}>{task.title}</p>
                                <TaskBadge status={task.status} />
                            </div>
                            {task.description && (
                                <p style={{ fontSize: '0.8rem', color: C.ts, marginBottom: '0.4rem' }}>{task.description}</p>
                            )}
                            <p style={{ fontSize: '0.7rem', color: C.mu, marginBottom: allNotes.length > 0 ? '0.5rem' : '0.4rem' }}>
                                {new Date(task.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            {allNotes.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                                    {allNotes.map(note => (
                                        <div key={note.id} style={{ padding: '0.4rem 0.6rem', background: C.sa, borderRadius: '8px', borderLeft: `2px solid ${note.authorType === 'TENANT' ? C.pend : C.primary}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: note.authorType === 'TENANT' ? C.pend : C.primary }}>
                                                    {note.authorType === 'TENANT' ? 'Moi' : 'Propriétaire'}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: C.mu }}>
                                                    {new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: C.tm, margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <input
                                    type="text"
                                    value={noteInputs[task.id] ?? ''}
                                    onChange={e => setNoteInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    placeholder="Ajouter une mise à jour..."
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddPortalNote(task.id); }}
                                    style={{ flex: 1, background: C.sa, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '0.4rem 0.65rem', color: C.tm, fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' }}
                                />
                                <button
                                    onClick={() => handleAddPortalNote(task.id)}
                                    disabled={isAdding || !(noteInputs[task.id] ?? '').trim()}
                                    style={{ background: C.primary, color: 'white', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, opacity: (isAdding || !(noteInputs[task.id] ?? '').trim()) ? 0.5 : 1 }}
                                >
                                    {isAdding ? '...' : '→'}
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    // ─── MESSAGES TAB (mobile only, full-screen layout) ──────────
    const MobileMessagesTab = (
        <>
            <div style={{ padding: '1rem 0 0.5rem', flexShrink: 0 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.tm, margin: 0 }}>Messages</h1>
                <p style={{ fontSize: '0.8rem', color: C.ts }}>Avec votre propriétaire</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0 0.75rem' }}>
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: C.mu, fontSize: '0.875rem', marginTop: '3rem' }}>
                        Aucun message pour l'instant.
                    </p>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.fromTenant;
                        return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '0.6rem 0.9rem',
                                    borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                    background: isMe ? C.primary : C.sa,
                                    color: isMe ? 'white' : C.tm,
                                    fontSize: '0.875rem',
                                    lineHeight: 1.5,
                                    border: isMe ? 'none' : `1px solid ${C.border}`,
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {msg.content}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: C.mu, marginTop: '0.15rem' }}>
                                    {new Date(msg.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {isMe && msg.readAt && <span style={{ marginLeft: '0.3rem' }}>✓✓</span>}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
            <form
                onSubmit={handleSendMsg}
                style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}
            >
                <input
                    type="text"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    placeholder="Votre message..."
                    disabled={sendingMsg}
                    style={{ flex: 1, background: C.sa, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '0.6rem 0.9rem', color: C.tm, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                />
                <button
                    type="submit"
                    disabled={sendingMsg || !msgText.trim()}
                    style={{ background: C.primary, color: 'white', fontWeight: 600, padding: '0.6rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', opacity: (sendingMsg || !msgText.trim()) ? 0.5 : 1, flexShrink: 0 }}
                >
                    {sendingMsg ? '...' : '→'}
                </button>
            </form>
        </>
    );

    const isMessagesTab = activeTab === 'messages';
    const isScrollableTab = activeTab !== 'messages';

    return (
        <>
            {/* ─── MOBILE LAYOUT ───────────────────────────────────────── */}
            <div className="portal-mobile" style={{ background: C.bg }}>
                <div style={isMessagesTab
                    ? { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 1rem' }
                    : { flex: 1, overflowY: 'auto', padding: '1rem', paddingTop: 'max(1rem, env(safe-area-inset-top))' }
                }>
                    {activeTab === 'home' && HomeTab}
                    {activeTab === 'payments' && PaymentsTab}
                    {activeTab === 'incidents' && IncidentsTab}
                    {activeTab === 'messages' && MobileMessagesTab}
                    {activeTab === 'documents' && DocumentsTab}
                </div>

                <nav style={{ flexShrink: 0, background: C.surface, borderTop: `1px solid ${C.border}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <div style={{ display: 'flex' }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    padding: '0.5rem 0', gap: '0.2rem', background: 'transparent', border: 'none',
                                    cursor: 'pointer', color: activeTab === tab.id ? C.primary : C.mu,
                                    transition: 'color 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{tab.icon}</span>
                                <span style={{ fontSize: '0.65rem' }}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
            </div>

            {/* ─── DESKTOP LAYOUT ──────────────────────────────────────── */}
            <div className="portal-desktop" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Espace Locataire</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Bienvenue, {firstName} {lastName}</p>
                </header>

                {!currentLease ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Aucun bail actif trouvé.</p>
                    </div>
                ) : (
                    <>
                        {/* Logement */}
                        <section style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Votre Logement</h2>
                            <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                <p><strong>Adresse :</strong> {currentLease.apartment.address}</p>
                                {currentLease.apartment.complement && <p><strong>Complément :</strong> {currentLease.apartment.complement}</p>}
                                <p><strong>Ville :</strong> {currentLease.apartment.zipCode} {currentLease.apartment.city}</p>
                                <p><strong>Loyer mensuel :</strong> {(currentLease.rentAmount + currentLease.chargesAmount).toFixed(2)} € (charges comprises)</p>
                                <p><strong>Début du bail :</strong> {new Date(currentLease.startDate).toLocaleDateString('fr-FR')}</p>
                            </div>
                        </section>

                        {/* Incidents */}
                        <section style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0 }}>Vos Signalements techniques</h2>
                                <button
                                    onClick={() => setShowForm(v => !v)}
                                    className="std-add-button"
                                    style={{ background: '#ef4444', border: 'none' }}
                                >
                                    ⚠️ Signaler un incident technique
                                </button>
                            </div>

                            {incSuccess && (
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: '1rem', borderRadius: '8px', border: '1px solid #10b981', fontWeight: 500, marginBottom: '1rem' }}>
                                    ✅ {incSuccess}
                                </div>
                            )}

                            {showForm && (
                                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>Nouveau Signalement</h3>
                                    <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="std-label">Objet (ex: Fuite d&apos;eau, Panne Internet)</label>
                                            <input type="text" required className="std-input" value={incTitle} onChange={e => setIncTitle(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="std-label">Description détaillée du problème</label>
                                            <textarea required className="std-input" rows={4} value={incDesc} onChange={e => setIncDesc(e.target.value)} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <button type="button" onClick={() => setShowForm(false)} className="std-btn-cancel">Annuler</button>
                                            <button type="submit" disabled={submittingInc} className="std-btn-submit">
                                                {submittingInc ? 'Envoi...' : 'Envoyer le signalement'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {tasks.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Aucun incident signalé.</p>
                                ) : (
                                    tasks.map(task => {
                                        const allNotes = [...(task.notes ?? []), ...(localTaskNotes[task.id] ?? [])];
                                        const isAdding = noteAdding[task.id] ?? false;
                                        return (
                                            <div key={task.id} style={{ padding: '1rem', background: 'var(--surface-active)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{task.title}</h3>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 500,
                                                        background: task.status === 'DONE' ? '#ecfdf5' : task.status === 'IN_PROGRESS' ? '#eff6ff' : '#fffbeb',
                                                        color: task.status === 'DONE' ? '#059669' : task.status === 'IN_PROGRESS' ? '#3b82f6' : '#d97706',
                                                    }}>
                                                        {task.status === 'TODO' ? 'À traiter' : task.status === 'IN_PROGRESS' ? 'En cours' : 'Résolu'}
                                                    </span>
                                                </div>
                                                {task.description && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{task.description}</p>}
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: allNotes.length > 0 ? '0.75rem' : '0.5rem' }}>
                                                    Signalé le {new Date(task.createdAt).toLocaleDateString('fr-FR')}
                                                </p>
                                                {allNotes.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                                        {allNotes.map(note => (
                                                            <div key={note.id} style={{ padding: '0.5rem 0.75rem', background: 'var(--surface)', borderRadius: '6px', borderLeft: `3px solid ${note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee'}` }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: note.authorType === 'TENANT' ? '#f59e0b' : '#2b8cee' }}>
                                                                        {note.authorType === 'TENANT' ? 'Moi' : 'Propriétaire'}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        {new Date(note.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input
                                                        type="text"
                                                        value={noteInputs[task.id] ?? ''}
                                                        onChange={e => setNoteInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                        placeholder="Ajouter une mise à jour..."
                                                        onKeyDown={e => { if (e.key === 'Enter') handleAddPortalNote(task.id); }}
                                                        style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddPortalNote(task.id)}
                                                        disabled={isAdding || !(noteInputs[task.id] ?? '').trim()}
                                                        style={{ background: '#2b8cee', color: 'white', fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0, opacity: (isAdding || !(noteInputs[task.id] ?? '').trim()) ? 0.5 : 1 }}
                                                    >
                                                        {isAdding ? '...' : 'Ajouter'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {/* Paiements */}
                        <section style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem' }}>Historique des Loyers & Quittances</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {allPayments.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Aucun historique de paiement pour le moment.</p>
                                ) : (
                                    allPayments.map(payment => {
                                        const isPaid = payment.status === 'PAID';
                                        const monthName = format(new Date(payment.period), 'MMMM yyyy', { locale: fr });
                                        return (
                                            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-active)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>{monthName}</p>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{payment.amount.toFixed(2)} €</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {isPaid ? (
                                                        <span style={{ padding: '0.3rem 0.8rem', background: '#ecfdf5', color: '#059669', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500 }}>Payé</span>
                                                    ) : (
                                                        <span style={{ padding: '0.3rem 0.8rem', background: '#fffbeb', color: '#d97706', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500 }}>En attente</span>
                                                    )}
                                                    {isPaid ? (
                                                        <a href={`/api/portal/${token}/quittance/${payment.id}`} target="_blank" rel="noopener noreferrer"
                                                            style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--surface)', color: 'var(--text-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                                                            ⬇️ Télécharger Quittance
                                                        </a>
                                                    ) : (
                                                        <div style={{ width: '175px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Quittance indisponible
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {/* Messages */}
                        <section style={{ marginBottom: '2rem' }}>
                            <TenantMessaging
                                tenantId={tenantId}
                                initialMessages={initialMessages}
                                portalToken={token}
                            />
                        </section>

                        {/* Documents */}
                        {hasAnyDoc && (
                            <section>
                                <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem' }}>📁 Vos Documents</h2>
                                {docGroups.map(group => (
                                    <div key={group.label} style={{ marginBottom: '1.25rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{group.label}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {group.docs.map(doc => (
                                                <a
                                                    key={doc.url}
                                                    href={doc.url.startsWith('http') ? doc.url : doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--surface-active)', borderRadius: '8px', border: '1px solid var(--border-color)', textDecoration: 'none', gap: '1rem' }}
                                                >
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>📄 {doc.name}</span>
                                                    {doc.docType && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>{doc.docType}</span>}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
