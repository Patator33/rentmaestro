'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { reportIncident, uploadPortalDocument } from '@/actions/portal';
import { addPortalTaskNote, updatePortalTaskNote } from '@/actions/tasks';
import { sendPortalMessage, markPortalMessagesRead } from '@/actions/messages';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Logo from '@/components/Logo';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Page = 'accueil' | 'paiements' | 'incidents' | 'messages' | 'documents';

interface Payment { id: string; period: Date | string; amount: number; status: string; leaseId?: string }
interface TaskNote { id: string; content: string; authorType: string; createdAt: Date | string }
interface Task { id: string; title: string; description: string | null; status: string; createdAt: Date | string; tenantId?: string | null; notes?: TaskNote[] }
interface Message { id: string; content: string; fromTenant: boolean; readAt: Date | null; createdAt: Date | string }
interface Apartment { address: string; complement: string | null; zipCode: string; city: string }
interface Lease { id: string; apartmentId: string; rentAmount: number; chargesAmount: number; startDate: Date | string; apartment: Apartment; payments: Payment[] }
interface PortalDoc { id?: string; name: string; url: string; docType: string; createdAt?: Date | string }
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

// ─────────────────────────────────────────────────────────────
// Icônes (SVG trait outline 1.75px — reprises du handoff)
// ─────────────────────────────────────────────────────────────
type IconDef = [string, Record<string, any>][];
const ICON_DEFS: Record<string, IconDef> = {
    home: [['path', { d: 'M3 11.5 12 4l9 7.5' }], ['path', { d: 'M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9' }]],
    card: [['rect', { x: 2, y: 5, width: 20, height: 14, rx: 2 }], ['line', { x1: 2, y1: 10, x2: 22, y2: 10 }]],
    alert: [['path', { d: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }], ['line', { x1: 12, y1: 9, x2: 12, y2: 13 }], ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }]],
    message: [['path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }]],
    folder: [['path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z' }]],
    download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '7 10 12 15 17 10' }], ['line', { x1: 12, y1: 15, x2: 12, y2: 3 }]],
    send: [['path', { d: 'm22 2-7 20-4-9-9-4Z' }], ['path', { d: 'M22 2 11 13' }]],
    chevron: [['polyline', { points: '6 9 12 15 18 9' }]],
    file: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['polyline', { points: '14 2 14 8 20 8' }], ['line', { x1: 8, y1: 13, x2: 16, y2: 13 }], ['line', { x1: 8, y1: 17, x2: 16, y2: 17 }]],
    sun: [['circle', { cx: 12, cy: 12, r: 4 }], ['line', { x1: 12, y1: 2, x2: 12, y2: 4 }], ['line', { x1: 12, y1: 20, x2: 12, y2: 22 }], ['line', { x1: 4, y1: 12, x2: 2, y2: 12 }], ['line', { x1: 22, y1: 12, x2: 20, y2: 12 }], ['line', { x1: 5.5, y1: 5.5, x2: 4.1, y2: 4.1 }], ['line', { x1: 19.9, y1: 19.9, x2: 18.5, y2: 18.5 }], ['line', { x1: 5.5, y1: 18.5, x2: 4.1, y2: 19.9 }], ['line', { x1: 19.9, y1: 4.1, x2: 18.5, y2: 5.5 }]],
    moon: [['path', { d: 'M21 12.5A8.5 8.5 0 1 1 11.5 3 7 7 0 0 0 21 12.5Z' }]],
    upload: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '17 8 12 3 7 8' }], ['line', { x1: 12, y1: 3, x2: 12, y2: 15 }]],
};

function Icon({ name, size = 17, stroke = 1.75, color }: { name: string; size?: number; stroke?: number; color?: string }) {
    const defs = ICON_DEFS[name] ?? [];
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'}
            strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', display: 'block' }}>
            {defs.map(([tag, attrs], i) => {
                const T = tag as any;
                return <T key={i} {...attrs} />;
            })}
        </svg>
    );
}

// Élément interactif avec état hover (remplace le style-hover du prototype).
function Hover({ as = 'button', base, hover, children, ...rest }: any) {
    const [h, setH] = useState(false);
    const Tag: any = as;
    return (
        <Tag {...rest} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ ...base, ...(h ? hover : {}) }}>
            {children}
        </Tag>
    );
}

// ─────────────────────────────────────────────────────────────
// Design tokens (thème clair / sombre — définitifs, cf. handoff)
// ─────────────────────────────────────────────────────────────
function tokens(dark: boolean) {
    const light = {
        bg: '#f3f2f2', surface: '#eae9e9', text: '#201e1d',
        textMuted: 'rgba(32,30,29,0.62)', accent: '#0088b0', accentDeep: '#006786',
        accent2: '#d6006c', accent2Deep: '#aa0b56', divider: 'rgba(32,30,29,0.14)',
        accentTint: 'rgba(0,136,176,0.10)', accent2Tint: 'rgba(214,0,108,0.08)',
        font: 'var(--font-portal-serif), Georgia, serif', headingWeight: 600, italic: 'italic' as const,
        radiusSm: 2, radiusMd: 3, radiusLg: 6,
        shadowSm: '0 1px 2px rgba(45,43,43,0.12)',
        rowBorder: 'rgba(32,30,29,0.07)', secHoverBg: 'rgba(32,30,29,0.05)',
    };
    const darkT = {
        bg: '#161826', surface: '#232532', text: '#e9e9ed',
        textMuted: 'rgba(233,233,237,0.6)', accent: '#9184d9', accentDeep: '#d2cefd',
        accent2: '#a7a1db', accent2Deep: '#d2cefd', divider: 'rgba(233,233,237,0.14)',
        accentTint: 'rgba(145,132,217,0.14)', accent2Tint: 'rgba(167,161,219,0.12)',
        font: 'var(--font-portal-inter), system-ui, sans-serif', headingWeight: 500, italic: 'normal' as const,
        radiusSm: 4, radiusMd: 8, radiusLg: 14,
        shadowSm: '0 0 0 1px #3f424d',
        rowBorder: 'rgba(233,233,237,0.08)', secHoverBg: 'rgba(233,233,237,0.06)',
    };
    return dark ? darkT : light;
}

const NEW_DAYS = 14;
const eur = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €';
const monthYear = (d: Date | string) => format(new Date(d), 'MMMM yyyy', { locale: fr });
const isRecent = (d?: Date | string) => !!d && (Date.now() - new Date(d).getTime()) < NEW_DAYS * 86400000;
const sameMonth = (a: Date | string, b: Date) => {
    const d = new Date(a);
    return d.getUTCFullYear() === b.getUTCFullYear() && d.getUTCMonth() === b.getUTCMonth();
};

const PAYMENT_LABELS: Record<string, string> = { PAID: 'Payé', PENDING: 'En attente', LATE: 'En retard', PARTIAL: 'Partiel' };
const TASK_LABELS: Record<string, string> = { TODO: 'Reçu', IN_PROGRESS: 'En cours', DONE: 'Résolu' };

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────
export default function PortalShell({
    tenantId, firstName, token,
    currentLease, allPayments, initialTasks, initialMessages, portalDocuments,
}: PortalShellProps) {
    const [dark, setDark] = useState(false);
    const [page, setPage] = useState<Page>('accueil');

    // Persistance du thème (localStorage) — après montage pour éviter le mismatch SSR.
    useEffect(() => {
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem('rm-portal-theme') : null;
        if (saved === 'dark') setDark(true);
    }, []);
    const toggleTheme = () => setDark(d => {
        const next = !d;
        try { window.localStorage.setItem('rm-portal-theme', next ? 'dark' : 'light'); } catch { }
        return next;
    });

    const t = tokens(dark);

    // ─── État données live ───────────────────────────────────
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [localDocs, setLocalDocs] = useState<PortalDoc[]>([]); // documents envoyés cette session
    const [seenMessages, setSeenMessages] = useState(false);
    const [seenDocs, setSeenDocs] = useState(false);

    // Incident form
    const [showForm, setShowForm] = useState(false);
    const [incTitle, setIncTitle] = useState('');
    const [incDesc, setIncDesc] = useState('');
    const [submittingInc, setSubmittingInc] = useState(false);
    const [incSuccess, setIncSuccess] = useState('');

    // Notes de tâche
    const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
    const [noteAdding, setNoteAdding] = useState<Record<string, boolean>>({});
    const [localTaskNotes, setLocalTaskNotes] = useState<Record<string, TaskNote[]>>({});
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    // Messagerie
    const [draft, setDraft] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Upload documents
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState('');

    // Accordéon paiements
    const [openYear, setOpenYear] = useState<number | null>(
        allPayments.length ? new Date(allPayments[0].period).getFullYear() : null
    );

    useEffect(() => {
        if (page === 'messages') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, page]);

    useEffect(() => {
        if (page === 'messages' && !seenMessages) {
            setSeenMessages(true);
            markPortalMessagesRead(tenantId, false, token).catch(() => { });
        }
        if (page === 'documents') setSeenDocs(true);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Dérivations (vraies données) ────────────────────────
    const unreadOwnerMsgs = useMemo(
        () => messages.filter(m => !m.fromTenant && !m.readAt),
        [messages]
    );
    const hasUnreadMessage = !seenMessages && unreadOwnerMsgs.length > 0;

    const paymentGroups = useMemo(() => {
        const byYear = new Map<number, Payment[]>();
        for (const p of allPayments) {
            const y = new Date(p.period).getFullYear();
            (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(p);
        }
        return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([year, rows]) => ({
            year,
            rows: rows.slice().sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime()),
        }));
    }, [allPayments]);

    const latestPaid = useMemo(() => allPayments.find(p => p.status === 'PAID') ?? null, [allPayments]);

    // Statut du loyer du mois courant (encart sidebar)
    const statusTag = useMemo(() => {
        const now = new Date();
        const label = monthYear(now);
        if (!currentLease) return null;
        const cur = allPayments.find(p => p.leaseId === currentLease.id && sameMonth(p.period, now));
        if (cur?.status === 'PAID') return { text: `Loyer à jour — ${label}`, tone: 'ok' as const };
        if (cur?.status === 'PARTIAL') return { text: `Loyer partiel — ${label}`, tone: 'warn' as const };
        if (cur?.status === 'LATE') return { text: `Loyer en retard — ${label}`, tone: 'warn' as const };
        return { text: `Loyer en attente — ${label}`, tone: 'warn' as const };
    }, [allPayments, currentLease]);

    // Groupes de documents (mappés sur le design)
    const tenantSent = [...localDocs, ...portalDocuments.tenantDocs];
    const docGroups = [
        { title: 'Vos documents', items: tenantSent },
        { title: 'Documents du bail', items: [...portalDocuments.leaseDocs, ...portalDocuments.apartmentDocs] },
        { title: 'Documents propriétaire', items: portalDocuments.companyDocs },
        { title: 'Documents généraux', items: portalDocuments.globalDocs },
    ].filter(g => g.items.length > 0);

    const newDoc = useMemo(
        () => docGroups.flatMap(g => g.items).find(d => isRecent(d.createdAt)),
        [docGroups]
    );
    const hasNewDoc = !seenDocs && !!newDoc;

    // Incidents ouverts (tâches liées au locataire non résolues)
    const openIncident = useMemo(
        () => tasks.find(t2 => t2.tenantId && t2.status !== 'DONE'),
        [tasks]
    );

    // Cellules de l'accueil (n'apparaissent que si l'état est actif)
    const cells: { key: string; icon: string; title: string; subtitle: string; go: Page }[] = [];
    if (hasUnreadMessage) cells.push({ key: 'msg', icon: 'message', title: 'Nouveau message', subtitle: unreadOwnerMsgs[unreadOwnerMsgs.length - 1].content, go: 'messages' });
    if (hasNewDoc && newDoc) cells.push({ key: 'doc', icon: 'folder', title: 'Nouveau document', subtitle: newDoc.name, go: 'documents' });
    if (openIncident) cells.push({ key: 'inc', icon: 'alert', title: 'Incident en cours', subtitle: openIncident.title, go: 'incidents' });

    // ─── Handlers ────────────────────────────────────────────
    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentLease || !incTitle.trim()) return;
        setSubmittingInc(true);
        const res = await reportIncident(currentLease.apartmentId, tenantId, incTitle.trim(), incDesc.trim(), token);
        setSubmittingInc(false);
        if (res.success) {
            setTasks(prev => [{ id: '_' + Date.now(), title: incTitle.trim(), description: incDesc.trim() || null, status: 'TODO', createdAt: new Date(), tenantId }, ...prev]);
            setIncTitle(''); setIncDesc(''); setShowForm(false);
            setIncSuccess('Signalement transmis au propriétaire.');
            setTimeout(() => setIncSuccess(''), 4000);
        }
    };

    const handleAddNote = async (taskId: string) => {
        const content = noteInputs[taskId]?.trim();
        if (!content) return;
        setNoteAdding(p => ({ ...p, [taskId]: true }));
        const res = await addPortalTaskNote(taskId, content, token);
        if (res.success && res.note) {
            setLocalTaskNotes(p => ({ ...p, [taskId]: [...(p[taskId] ?? []), res.note as TaskNote] }));
            setNoteInputs(p => ({ ...p, [taskId]: '' }));
        }
        setNoteAdding(p => ({ ...p, [taskId]: false }));
    };

    const handleSaveNote = async (taskId: string) => {
        if (!editingNoteId || !editingNoteText.trim()) return;
        setSavingNote(true);
        const res = await updatePortalTaskNote(editingNoteId, editingNoteText.trim(), token);
        if (res.success && res.note) {
            const upd = res.note as TaskNote;
            setTasks(prev => prev.map(x => x.id === taskId ? { ...x, notes: (x.notes ?? []).map(n => n.id === upd.id ? upd : n) } : x));
            setLocalTaskNotes(p => ({ ...p, [taskId]: (p[taskId] ?? []).map(n => n.id === upd.id ? upd : n) }));
            setEditingNoteId(null); setEditingNoteText('');
        }
        setSavingNote(false);
    };

    const sendMessage = async () => {
        const text = draft.trim();
        if (!text) return;
        setSendingMsg(true);
        const res = await sendPortalMessage(tenantId, text, token);
        setSendingMsg(false);
        if (res.success && res.message) {
            setMessages(prev => [...prev, res.message as Message]);
            setDraft('');
        }
    };

    const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (!files.length) return;
        setUploadErr('');
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            setUploading(true);
            const res = await uploadPortalDocument(fd, token);
            setUploading(false);
            if (!res.success) {
                setUploadErr(res.error || "Échec de l'envoi du document.");
                continue;
            }
            const raw = res.doc.url;
            const url = raw.startsWith('/uploads/') ? `/api/portal/${token}/file?u=${encodeURIComponent(raw)}` : raw;
            setLocalDocs(prev => [{ ...res.doc, url }, ...prev]);
        }
    };

    // ─────────────────────────────────────────────────────────
    // Styles
    // ─────────────────────────────────────────────────────────
    const navLink = (name: Page): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, background: 'transparent', border: 'none',
        color: page === name ? t.accent : t.textMuted, fontWeight: page === name ? 600 : 400, cursor: 'pointer',
        fontFamily: t.font, padding: 0,
    });
    const dot = <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent2, display: 'inline-block' }} />;

    // Bouton pilule, partagé par le sélecteur de thème et l'Accueil mobile.
    const themeToggleBase: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.text,
        background: 'transparent', border: `1px solid ${t.divider}`, borderRadius: 999,
        padding: '6px 12px', cursor: 'pointer', fontFamily: t.font, whiteSpace: 'nowrap',
    };

    // Sections de la barre fixe mobile (Accueil et le thème restent en haut).
    const bottomNavItems: { id: Page; icon: string; label: string; dot: boolean }[] = [
        { id: 'paiements', icon: 'card', label: 'Paiements', dot: false },
        { id: 'incidents', icon: 'alert', label: 'Incidents', dot: false },
        { id: 'messages', icon: 'message', label: 'Messages', dot: hasUnreadMessage },
        { id: 'documents', icon: 'folder', label: 'Documents', dot: hasNewDoc },
    ];

    const card: React.CSSProperties = {
        display: 'flex', flexDirection: 'column', gap: 8, padding: 15, borderRadius: t.radiusMd,
        background: t.surface, border: dark ? `1px solid ${t.divider}` : 'none', boxShadow: dark ? t.shadowSm : 'none',
    };
    const h2: React.CSSProperties = { fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 21, margin: '0 0 14px' };
    const mutedText: React.CSSProperties = { margin: 0, color: t.textMuted, fontSize: 14 };
    const btnPrimary: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px',
        borderRadius: t.radiusMd, fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 14, cursor: 'pointer',
        background: dark ? 'transparent' : t.accent, color: dark ? t.accent : t.bg,
        border: dark ? `1px solid ${t.accent}` : '1px solid transparent',
    };
    const btnPrimaryHover: React.CSSProperties = { background: dark ? t.accentTint : t.accentDeep };
    const btnSecondary: React.CSSProperties = {
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: t.radiusMd,
        fontFamily: t.font, fontWeight: 500, fontSize: 13.5, cursor: 'pointer', background: 'transparent',
        color: t.text, border: `1px solid ${t.divider}`, boxSizing: 'border-box',
    };
    const btnSecondaryHover: React.CSSProperties = { background: t.secHoverBg };
    const fieldStyle: React.CSSProperties = {
        padding: '9px 12px', fontSize: 14, fontFamily: t.font, color: t.text, background: t.surface,
        border: `1px solid ${t.divider}`, borderRadius: t.radiusMd, outline: 'none', width: '100%', boxSizing: 'border-box',
    };
    const neutralTag: React.CSSProperties = {
        fontSize: 11, padding: '3px 9px', borderRadius: 999, fontWeight: 600,
        background: dark ? 'rgba(233,233,237,0.1)' : 'rgba(32,30,29,0.07)', color: t.textMuted,
    };
    const paidTag: React.CSSProperties = { fontSize: 11, padding: '3px 9px', borderRadius: 999, background: t.accentTint, color: t.accentDeep, fontWeight: 600 };
    const iconBtn: React.CSSProperties = { display: 'inline-flex', color: t.textMuted, padding: 6, borderRadius: t.radiusSm };

    const statusTagStyle = (tone: 'ok' | 'warn'): React.CSSProperties => ({
        display: 'inline-flex', width: 'fit-content', fontSize: 12.5, padding: '6px 13px', borderRadius: 999, fontWeight: 600,
        background: tone === 'ok' ? t.accentTint : t.accent2Tint,
        color: tone === 'ok' ? t.accentDeep : t.accent2Deep,
    });

    const paymentTag = (status: string): React.CSSProperties =>
        status === 'PAID' ? paidTag : { ...neutralTag, color: t.accent2Deep, background: t.accent2Tint };
    const taskTagStyle = (status: string): React.CSSProperties =>
        status === 'DONE' ? paidTag : status === 'IN_PROGRESS'
            ? { fontSize: 11, padding: '3px 9px', borderRadius: 999, fontWeight: 600, background: t.accentTint, color: t.accentDeep }
            : { ...neutralTag };

    // ─────────────────────────────────────────────────────────
    // Pages
    // ─────────────────────────────────────────────────────────
    const AccueilPage = (
        <section>
            <h2 style={h2}>Aperçu</h2>
            {cells.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                    {cells.map(c => (
                        <Hover key={c.key} onClick={() => setPage(c.go)}
                            base={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', padding: 15, borderRadius: t.radiusMd, background: t.surface, border: dark ? `1px solid ${t.divider}` : 'none', boxShadow: dark ? t.shadowSm : 'none', cursor: 'pointer', fontFamily: t.font, color: t.text, boxSizing: 'border-box' }}
                            hover={{ boxShadow: dark ? `0 0 0 1px ${t.accent}` : '0 2px 8px rgba(45,43,43,0.12)' }}>
                            <span style={{ display: 'flex', color: t.accent2, flex: 'none', marginTop: 2 }}><Icon name={c.icon} /></span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 14.5 }}>{c.title}</span>
                                <span style={{ fontSize: 12.5, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subtitle}</span>
                            </span>
                        </Hover>
                    ))}
                </div>
            ) : (
                <div style={card}>
                    <p style={mutedText}>Rien à signaler : pas de nouveau message, pas d'incident en cours, pas de nouveau document.</p>
                </div>
            )}
        </section>
    );

    const PaiementsPage = (
        <section>
            <h2 style={h2}>Historique des loyers</h2>
            {paymentGroups.length === 0 ? (
                <div style={card}><p style={mutedText}>Aucun paiement enregistré pour le moment.</p></div>
            ) : paymentGroups.map(grp => {
                const open = openYear === grp.year;
                return (
                    <div key={grp.year} style={{ marginBottom: 6 }}>
                        <button onClick={() => setOpenYear(open ? null : grp.year)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', fontSize: 14.5, fontWeight: 600, background: 'transparent', border: 'none', color: t.text, cursor: 'pointer', fontFamily: t.font, width: '100%', textAlign: 'left' }}>
                            <span style={{ display: 'flex', transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .15s' }}><Icon name="chevron" size={16} /></span>
                            {grp.year}
                        </button>
                        {open && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 10 }}>
                                    <thead>
                                        <tr>
                                            {['Mois', 'Montant', 'Statut', ''].map((th, i) => (
                                                <th key={i} style={{ textAlign: i === 3 ? 'right' : 'left', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.textMuted, padding: '8px 6px', borderBottom: `1px solid ${t.divider}`, fontWeight: 500 }}>{th}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grp.rows.map(row => (
                                            <tr key={row.id}>
                                                <td style={{ padding: '9px 6px', borderBottom: `1px solid ${t.rowBorder}`, textTransform: 'capitalize' }}>{monthYear(row.period)}</td>
                                                <td style={{ padding: '9px 6px', borderBottom: `1px solid ${t.rowBorder}` }}>{eur(row.amount)}</td>
                                                <td style={{ padding: '9px 6px', borderBottom: `1px solid ${t.rowBorder}` }}>
                                                    <span style={paymentTag(row.status)}>{PAYMENT_LABELS[row.status] ?? row.status}</span>
                                                </td>
                                                <td style={{ padding: '9px 6px', borderBottom: `1px solid ${t.rowBorder}`, textAlign: 'right' }}>
                                                    {row.status === 'PAID' && (
                                                        <a href={`/api/portal/${token}/quittance/${row.id}`} target="_blank" rel="noopener noreferrer" style={iconBtn} title="Télécharger la quittance">
                                                            <Icon name="download" size={15} />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </section>
    );

    const MessagesPage = (
        <section>
            <h2 style={h2}>Messagerie</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 ? (
                    <div style={card}><p style={mutedText}>Aucun message pour l'instant.</p></div>
                ) : messages.map(m => {
                    const me = m.fromTenant;
                    return (
                        <div key={m.id} style={{ ...card, maxWidth: me ? '78%' : '100%', marginLeft: me ? 'auto' : 0, background: me ? t.accentTint : t.surface }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textMuted }}>
                                {me ? 'Vous' : 'Propriétaire'} · {format(new Date(m.createdAt), 'dd/MM HH:mm', { locale: fr })}
                            </div>
                            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, fontStyle: t.italic, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="Écrire un message…" style={{ ...fieldStyle, flex: 1, minHeight: 40 }} />
                <Hover onClick={sendMessage} base={{ ...btnPrimary, opacity: sendingMsg || !draft.trim() ? 0.5 : 1 }} hover={btnPrimaryHover} disabled={sendingMsg || !draft.trim()}>
                    <Icon name="send" size={15} />Envoyer
                </Hover>
            </div>
        </section>
    );

    const DocumentsPage = (
        <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <h2 style={{ ...h2, margin: 0 }}>Documents</h2>
                <Hover as="label" htmlFor="doc-upload-input" base={{ ...btnSecondary, opacity: uploading ? 0.6 : 1 }} hover={btnSecondaryHover}>
                    <Icon name="upload" size={15} />{uploading ? 'Envoi…' : 'Ajouter un document'}
                </Hover>
                <input id="doc-upload-input" type="file" multiple onChange={onFilesSelected}
                    style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} />
            </div>
            {uploadErr && (
                <p style={{ ...mutedText, color: t.accent2Deep, marginBottom: 12 }}>{uploadErr}</p>
            )}
            {docGroups.length === 0 ? (
                <div style={card}><p style={mutedText}>Aucun document disponible pour le moment.</p></div>
            ) : docGroups.map(g => (
                <div key={g.title} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 6 }}>{g.title}</div>
                    {g.items.map((doc, i) => (
                        <div key={doc.id ?? doc.url ?? i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${t.divider}` }}>
                            <span style={{ color: t.accent, display: 'flex' }}><Icon name="file" size={17} /></span>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>{doc.name}</div>
                            {isRecent(doc.createdAt) && (
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: t.accent2Tint, color: t.accent2Deep, fontWeight: 600 }}>Nouveau</span>
                            )}
                            {doc.docType && <span style={neutralTag}>{doc.docType}</span>}
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={iconBtn} title="Télécharger"><Icon name="download" size={15} /></a>
                        </div>
                    ))}
                </div>
            ))}
        </section>
    );

    const IncidentsPage = (
        <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <h2 style={{ ...h2, margin: 0 }}>Vos signalements techniques</h2>
                {currentLease && (
                    <Hover onClick={() => setShowForm(v => !v)} base={btnSecondary} hover={btnSecondaryHover}>
                        <Icon name="alert" size={15} />Signaler un incident
                    </Hover>
                )}
            </div>

            {incSuccess && (
                <div style={{ ...card, background: t.accentTint, marginBottom: 12 }}>
                    <span style={{ fontSize: 14, color: t.accentDeep }}>✓ {incSuccess}</span>
                </div>
            )}

            {showForm && currentLease && (
                <form onSubmit={handleReport} style={{ ...card, gap: 10, marginBottom: 12 }}>
                    <div style={{ fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 15 }}>Nouveau signalement</div>
                    <input type="text" value={incTitle} onChange={e => setIncTitle(e.target.value)} placeholder="Objet du problème *" required style={fieldStyle} />
                    <textarea value={incDesc} onChange={e => setIncDesc(e.target.value)} placeholder="Description (optionnel)" rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Hover onClick={() => setShowForm(false)} base={{ ...btnSecondary, flex: 1, justifyContent: 'center' }} hover={btnSecondaryHover} type="button">Annuler</Hover>
                        <Hover base={{ ...btnPrimary, flex: 1, opacity: submittingInc || !incTitle.trim() ? 0.5 : 1 }} hover={btnPrimaryHover} type="submit" disabled={submittingInc || !incTitle.trim()}>
                            {submittingInc ? 'Envoi…' : 'Envoyer'}
                        </Hover>
                    </div>
                </form>
            )}

            {tasks.length === 0 ? (
                <div style={card}><p style={mutedText}>Aucun incident signalé.</p></div>
            ) : tasks.map(task => {
                const notes = [...(task.notes ?? []), ...(localTaskNotes[task.id] ?? [])];
                const adding = noteAdding[task.id] ?? false;
                return (
                    <div key={task.id} style={{ ...card, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{task.title}</div>
                                {!task.tenantId && (
                                    <span style={{ ...neutralTag, marginTop: 4, display: 'inline-block' }}>Travaux</span>
                                )}
                            </div>
                            <span style={taskTagStyle(task.status)}>{TASK_LABELS[task.status] ?? task.status}</span>
                        </div>
                        {task.description && <p style={{ ...mutedText, whiteSpace: 'pre-wrap' }}>{task.description}</p>}
                        <div style={{ fontSize: 11.5, color: t.textMuted }}>
                            Signalé le {format(new Date(task.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </div>

                        {notes.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                {notes.map(note => {
                                    const mine = note.authorType === 'TENANT';
                                    return (
                                        <div key={note.id} style={{ padding: '6px 10px', background: dark ? 'rgba(233,233,237,0.05)' : 'rgba(32,30,29,0.04)', borderRadius: t.radiusSm, borderLeft: `2px solid ${mine ? t.accent2 : t.accent}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 11.5, fontWeight: 600, color: mine ? t.accent2Deep : t.accentDeep }}>{mine ? 'Moi' : 'Propriétaire'}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 11, color: t.textMuted }}>{format(new Date(note.createdAt), 'dd/MM HH:mm', { locale: fr })}</span>
                                                    {mine && editingNoteId !== note.id && (
                                                        <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.content); }} title="Modifier"
                                                            style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 11, padding: 0 }}>✎</button>
                                                    )}
                                                </div>
                                            </div>
                                            {editingNoteId === note.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                                    <textarea value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} rows={2} autoFocus style={{ ...fieldStyle, resize: 'vertical', background: t.bg }} />
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <Hover onClick={() => handleSaveNote(task.id)} disabled={savingNote || !editingNoteText.trim()}
                                                            base={{ ...btnPrimary, padding: '5px 12px', fontSize: 12.5, opacity: savingNote || !editingNoteText.trim() ? 0.5 : 1 }} hover={btnPrimaryHover}>
                                                            {savingNote ? '…' : 'Enregistrer'}
                                                        </Hover>
                                                        <Hover onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }} base={{ ...btnSecondary, padding: '5px 12px', fontSize: 12.5 }} hover={btnSecondaryHover}>Annuler</Hover>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: 14, color: t.text, margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input type="text" value={noteInputs[task.id] ?? ''} onChange={e => setNoteInputs(p => ({ ...p, [task.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddNote(task.id); }} placeholder="Ajouter une mise à jour…"
                                style={{ ...fieldStyle, flex: 1, padding: '7px 11px', fontSize: 13.5 }} />
                            <Hover onClick={() => handleAddNote(task.id)} disabled={adding || !(noteInputs[task.id] ?? '').trim()}
                                base={{ ...btnPrimary, padding: '7px 14px', opacity: adding || !(noteInputs[task.id] ?? '').trim() ? 0.5 : 1 }} hover={btnPrimaryHover}>
                                {adding ? '…' : <Icon name="send" size={15} />}
                            </Hover>
                        </div>
                    </div>
                );
            })}
        </section>
    );

    // ─────────────────────────────────────────────────────────
    // Rendu
    // ─────────────────────────────────────────────────────────
    return (
        <div className="tenant-portal-root" style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font, transition: 'background .2s,color .2s', paddingBottom: 60 }}>
            {/* Desktop : barre horizontale complète */}
            <nav className="tenant-portal-desktop-nav" style={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 10, gap: 20, padding: '15px 20px', maxWidth: 1240, margin: '0 auto' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 'auto' }}>
                    <Logo size={26} />
                    <span style={{ fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 19, color: t.text }}>RentMaestro</span>
                </span>
                <button onClick={() => setPage('accueil')} style={navLink('accueil')}><Icon name="home" />Accueil</button>
                <button onClick={() => setPage('paiements')} style={navLink('paiements')}><Icon name="card" />Paiements</button>
                <button onClick={() => setPage('incidents')} style={navLink('incidents')}><Icon name="alert" />Incidents</button>
                <button onClick={() => setPage('messages')} style={navLink('messages')}><Icon name="message" />Messages{hasUnreadMessage && dot}</button>
                <button onClick={() => setPage('documents')} style={navLink('documents')}><Icon name="folder" />Documents{hasNewDoc && dot}</button>
                <Hover onClick={toggleTheme} aria-label="Changer de thème" base={themeToggleBase} hover={{ background: t.accentTint, borderColor: t.accent }}>
                    <Icon name={dark ? 'sun' : 'moon'} size={15} />{dark ? 'Mode clair' : 'Mode sombre'}
                </Hover>
            </nav>

            {/* Mobile : marque à gauche, Accueil puis le thème empilés à droite.
                Les autres sections passent dans la barre fixe du bas. */}
            <div className="tenant-portal-mobile-top" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 2 }}>
                    <Logo size={26} />
                    <span style={{ fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 18, color: t.text }}>RentMaestro</span>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <Hover onClick={() => setPage('accueil')} aria-label="Accueil"
                        base={{ ...themeToggleBase, color: page === 'accueil' ? t.accent : t.text, borderColor: page === 'accueil' ? t.accent : t.divider }}
                        hover={{ background: t.accentTint, borderColor: t.accent }}>
                        <Icon name="home" size={15} />Accueil
                    </Hover>
                    <Hover onClick={toggleTheme} aria-label="Changer de thème" base={themeToggleBase} hover={{ background: t.accentTint, borderColor: t.accent }}>
                        <Icon name={dark ? 'sun' : 'moon'} size={15} />{dark ? 'Mode clair' : 'Mode sombre'}
                    </Hover>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, maxWidth: 1240, margin: '0 auto', padding: 30 }}>
                <aside
                    className={page === 'accueil' ? undefined : 'tenant-portal-sidebar-mobile-hidden'}
                    style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                    <div>
                        <h1 style={{ fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 30, margin: '0 0 4px', color: t.text }}>Bonjour, {firstName}</h1>
                        <div style={{ fontSize: 14, color: t.textMuted }}>Espace locataire</div>
                    </div>

                    {statusTag && <span style={statusTagStyle(statusTag.tone)}>{statusTag.text}</span>}

                    {currentLease ? (
                        <div style={card}>
                            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.accent }}>Votre logement</div>
                            <div style={{ fontFamily: t.font, fontWeight: t.headingWeight, fontSize: 18 }}>{currentLease.apartment.address}</div>
                            <div style={{ margin: 0, fontSize: 13.5, opacity: 0.85, lineHeight: 1.5 }}>
                                {currentLease.apartment.complement && <>{currentLease.apartment.complement}<br /></>}
                                {currentLease.apartment.zipCode} {currentLease.apartment.city}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: t.textMuted }}>
                                {eur(currentLease.rentAmount + currentLease.chargesAmount)}/mois CC · bail depuis {format(new Date(currentLease.startDate), 'dd/MM/yyyy')}
                            </div>
                        </div>
                    ) : (
                        <div style={card}><p style={mutedText}>Aucun bail actif.</p></div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Hover onClick={() => setPage('incidents')} base={{ ...btnSecondary, width: '100%', justifyContent: 'center', padding: '11px 16px' }} hover={btnSecondaryHover}>
                            <Icon name="alert" size={15} />Signaler un incident
                        </Hover>
                        <Hover onClick={() => setPage('messages')} base={{ ...btnSecondary, width: '100%', justifyContent: 'center', padding: '11px 16px' }} hover={btnSecondaryHover}>
                            <Icon name="message" size={15} />Contacter le propriétaire
                        </Hover>
                        {latestPaid && (
                            <Hover as="a" href={`/api/portal/${token}/quittance/${latestPaid.id}`} target="_blank" rel="noopener noreferrer"
                                base={{ ...btnPrimary, width: '100%', padding: '11px 16px', textDecoration: 'none', boxSizing: 'border-box' }} hover={btnPrimaryHover}>
                                <Icon name="download" size={15} />Télécharger la quittance
                            </Hover>
                        )}
                    </div>
                </aside>

                <main style={{ flex: '3 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    {page === 'accueil' && AccueilPage}
                    {page === 'paiements' && PaiementsPage}
                    {page === 'incidents' && IncidentsPage}
                    {page === 'messages' && MessagesPage}
                    {page === 'documents' && DocumentsPage}
                </main>
            </div>

            {/* Barre de navigation fixe (mobile uniquement, cf. globals.css) */}
            <nav className="tenant-portal-bottom-nav" style={{ background: t.surface, borderTop: `1px solid ${t.divider}` }}>
                {bottomNavItems.map(item => {
                    const active = page === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setPage(item.id)}
                            aria-current={active ? 'page' : undefined}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                padding: '9px 0 8px', background: 'transparent', border: 'none', cursor: 'pointer',
                                fontFamily: t.font, color: active ? t.accent : t.textMuted, position: 'relative',
                            }}
                        >
                            <span style={{ position: 'relative', display: 'flex' }}>
                                <Icon name={item.icon} size={20} />
                                {item.dot && (
                                    <span style={{
                                        position: 'absolute', top: -2, right: -4, width: 6, height: 6,
                                        borderRadius: '50%', background: t.accent2,
                                    }} />
                                )}
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
