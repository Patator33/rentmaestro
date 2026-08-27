'use client';

import { useState, useTransition } from 'react';
import { saveSetting, sendTelegramTest, registerTelegramWebhook, saveTelegramToken, revealTelegramToken } from '@/actions/settings';
import { setTheme } from '@/actions/theme';
import { THEMES, type ThemeId } from '@/themes/index';
import { EVENT_LABELS, EVENT_VARIABLES } from '@/lib/n8n';
import type { IrlIndex } from '@/lib/irl';
import TotpSetup from '@/components/TotpSetup';
import PasskeySetup from '@/components/PasskeySetup';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import UserManagement from '@/components/UserManagement';
import BackupRestore from '@/components/BackupRestore';
import Link from 'next/link';

const ALL_EVENTS = Object.keys(EVENT_LABELS);

const VARIABLES = [
    { name: '{{prenom_locataire}}', desc: 'Prénom du locataire' },
    { name: '{{nom_locataire}}', desc: 'Nom complet du locataire' },
    { name: '{{nom_colocataire}}', desc: 'Nom complet du co-locataire' },
    { name: '{{adresse_bien}}', desc: 'Adresse du logement (sans le complément)' },
    { name: '{{complement_adresse}}', desc: "Complément d'adresse (bâtiment, étage…), vide si non renseigné" },
    { name: '{{adresse_complete}}', desc: "Adresse complète, complément inclus" },
    { name: '{{loyer_hc}}', desc: 'Loyer hors charges' },
    { name: '{{charges}}', desc: 'Charges' },
    { name: '{{loyer_cc}}', desc: 'Loyer charges comprises' },
    { name: '{{caution}}', desc: 'Dépôt de garantie' },
    { name: '{{date_debut}}', desc: 'Date de début du bail' },
    { name: '{{prorata_premier_mois}}', desc: 'Montant du premier mois (prorata si entrée en cours de mois)' },
];

const PORTAL_INVITE_VARIABLES = [
    { name: '{{prenom_locataire}}', desc: 'Prénom du locataire' },
    { name: '{{nom_locataire}}', desc: 'Nom complet du locataire' },
    { name: '{{lien_portail}}', desc: "Lien vers l'espace locataire" },
    { name: '{{code_acces}}', desc: "Code d'accès pour l'application mobile" },
    { name: '{{lien_application}}', desc: "Lien de téléchargement de l'application Android" },
];

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '0.3rem',
    color: 'var(--text-secondary)',
};

const fieldInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'var(--bg)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
};

const fieldHintStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
};

/**
 * Section repliable. La page empilait une dizaine de blocs dépliés, rendant la
 * recherche d'un réglage pénible : tout est fermé par défaut.
 * `headerRight` reste hors du bouton pour ne pas imbriquer deux contrôles.
 */
function Collapsible({ title, subtitle, headerRight, children }: {
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        textAlign: 'left', color: 'inherit', font: 'inherit',
                    }}
                >
                    <span
                        aria-hidden
                        style={{
                            display: 'inline-block', fontSize: '0.9rem', color: 'var(--text-muted)',
                            transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s',
                        }}
                    >
                        ▶
                    </span>
                    <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>{title}</span>
                        {subtitle && (
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                                {subtitle}
                            </span>
                        )}
                    </span>
                </button>
                {headerRight}
            </div>
            {open && <div style={{ marginTop: '1.25rem' }}>{children}</div>}
        </section>
    );
}

export default function ParametresForm({
    defaultSubject, defaultBody, defaultHaWebhook, currentTheme, defaultTelegramEnabled, defaultTelegramEvents,
    defaultTelegramTemplates, defaultIrlIndices, defaultIrlSubject, defaultIrlBody,
    defaultTelegramChatId, defaultTelegramThreadId, defaultTelegramParseMode, defaultTelegramSilent,
    telegramTokenConfigured, telegramTokenHint,
    defaultPortalSubject, defaultPortalBody,
    userEmail, userId, totpEnabled, passkeyCount,
}: {
    defaultSubject: string;
    defaultBody: string;
    defaultHaWebhook: string;
    currentTheme: ThemeId;
    defaultTelegramEnabled: boolean;
    defaultTelegramEvents: string[] | null;
    defaultTelegramTemplates: Record<string, string>;
    defaultIrlIndices: IrlIndex[];
    defaultIrlSubject: string;
    defaultIrlBody: string;
    defaultTelegramChatId: string;
    defaultTelegramThreadId: string;
    defaultTelegramParseMode: string;
    defaultTelegramSilent: boolean;
    telegramTokenConfigured: boolean;
    telegramTokenHint: string;
    defaultPortalSubject: string;
    defaultPortalBody: string;
    userEmail: string;
    userId: string;
    totpEnabled: boolean;
    passkeyCount: number;
}) {
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [haWebhook, setHaWebhook] = useState(defaultHaWebhook);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [haSaveState, setHaSaveState] = useState<SaveState>('idle');
    const [themePending, startThemeTransition] = useTransition();
    const [telegramEnabled, setTelegramEnabled] = useState(defaultTelegramEnabled);
    const [telegramEvents, setTelegramEvents] = useState<string[]>(defaultTelegramEvents ?? ALL_EVENTS);
    const [telegramTemplates, setTelegramTemplates] = useState<Record<string, string>>(defaultTelegramTemplates);
    const [telegramSaveState, setTelegramSaveState] = useState<SaveState>('idle');
    const [telegramChatId, setTelegramChatId] = useState(defaultTelegramChatId);
    const [telegramThreadId, setTelegramThreadId] = useState(defaultTelegramThreadId);
    const [telegramParseMode, setTelegramParseMode] = useState(defaultTelegramParseMode);
    const [telegramSilent, setTelegramSilent] = useState(defaultTelegramSilent);
    // Vide = on conserve le token déjà enregistré (il n'est jamais renvoyé ici).
    const [telegramToken, setTelegramToken] = useState('');
    const [telegramTestState, setTelegramTestState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [telegramTestError, setTelegramTestError] = useState('');
    const [webhookState, setWebhookState] = useState<'idle' | 'working' | 'ok' | 'error'>('idle');
    const [webhookMessage, setWebhookMessage] = useState('');

    // Sauvegarde et révélation du token indépendantes du bloc "Enregistrer"
    // global : confirmation immédiate que la valeur saisie est bien prise en
    // compte, et moyen de vérifier caractère par caractère ce qui est
    // réellement stocké quand Telegram répond "not found" malgré un token
    // "configuré".
    const [tokenSaveState, setTokenSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [tokenSaveError, setTokenSaveError] = useState('');
    const [tokenHintOverride, setTokenHintOverride] = useState<string | null>(null);
    const [revealState, setRevealState] = useState<'idle' | 'loading' | 'shown' | 'error'>('idle');
    const [revealedToken, setRevealedToken] = useState<string | null>(null);
    const [revealSource, setRevealSource] = useState<'settings' | 'env' | null>(null);

    const handleSaveTokenOnly = async () => {
        if (!telegramToken.trim()) return;
        setTokenSaveState('saving');
        setTokenSaveError('');
        const res = await saveTelegramToken(telegramToken.trim());
        if (res.success) {
            setTokenSaveState('saved');
            setTokenHintOverride(res.hint ?? null);
            setTelegramToken('');
            setRevealState('idle');
            setRevealedToken(null);
        } else {
            setTokenSaveState('error');
            setTokenSaveError(res.error ?? 'Échec de l\'enregistrement.');
        }
    };

    const handleRevealToken = async () => {
        if (revealState === 'shown') {
            setRevealState('idle');
            setRevealedToken(null);
            return;
        }
        setRevealState('loading');
        const res = await revealTelegramToken();
        if (res.token) {
            setRevealedToken(res.token);
            setRevealSource(res.source);
            setRevealState('shown');
        } else {
            setRevealState('error');
        }
    };

    const handleRegisterWebhook = async () => {
        setWebhookState('working');
        setWebhookMessage('');
        // Le token est lu côté serveur : il ne transite jamais par le navigateur.
        const res = await registerTelegramWebhook();
        if (res.success) {
            setWebhookState('ok');
            setWebhookMessage(`Déclaré sur ${res.url}`);
        } else {
            setWebhookState('error');
            setWebhookMessage(res.error ?? 'Échec inconnu');
        }
    };

    const [portalSubject, setPortalSubject] = useState(defaultPortalSubject);
    const [portalBody, setPortalBody] = useState(defaultPortalBody);
    const [portalSaveState, setPortalSaveState] = useState<SaveState>('idle');

    const handleSavePortalInvite = async () => {
        setPortalSaveState('saving');
        await Promise.all([
            saveSetting('portal_invite_subject', portalSubject),
            saveSetting('portal_invite_body', portalBody),
        ]);
        setPortalSaveState('saved');
    };

    const handleSaveTelegram = async () => {
        setTelegramSaveState('saving');
        await Promise.all([
            saveSetting('telegram_enabled', telegramEnabled ? 'true' : 'false'),
            saveSetting('telegram_events', JSON.stringify(telegramEvents)),
            saveSetting('telegram_chat_id', telegramChatId.trim()),
            saveSetting('telegram_thread_id', telegramThreadId.trim()),
            saveSetting('telegram_parse_mode', telegramParseMode),
            saveSetting('telegram_silent', telegramSilent ? 'true' : 'false'),
            ...(telegramToken.trim() ? [saveSetting('telegram_bot_token', telegramToken.trim())] : []),
            ...ALL_EVENTS.map(ev => saveSetting(`telegram_template_${ev}`, telegramTemplates[ev] ?? '')),
        ]);
        setTelegramToken('');
        setTelegramSaveState('saved');
    };

    const handleTestTelegram = async () => {
        setTelegramTestState('sending');
        setTelegramTestError('');
        // Enregistré d'abord : le test doit porter sur ce qui est affiché.
        await handleSaveTelegram();
        const res = await sendTelegramTest();
        if (res.success) {
            setTelegramTestState('ok');
        } else {
            setTelegramTestState('error');
            setTelegramTestError(res.error ?? 'Échec inconnu');
        }
    };

    // IRL settings
    const [irlIndices, setIrlIndices] = useState<IrlIndex[]>(defaultIrlIndices);
    const [irlSubject, setIrlSubject] = useState(defaultIrlSubject);
    const [irlBody, setIrlBody] = useState(defaultIrlBody);
    const [irlSaveState, setIrlSaveState] = useState<SaveState>('idle');

    const handleSaveIrl = async () => {
        setIrlSaveState('saving');
        const clean = irlIndices.filter(i => i.quarter.trim() && !isNaN(Number(i.value)));
        await Promise.all([
            saveSetting('irl_indices', JSON.stringify(clean)),
            saveSetting('irl_letter_subject', irlSubject),
            saveSetting('irl_letter_body', irlBody),
        ]);
        setIrlSaveState('saved');
    };

    const updateIndex = (idx: number, field: 'quarter' | 'value', val: string) => {
        setIrlIndices(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === 'value' ? parseFloat(val) || 0 : val } : it));
        setIrlSaveState('dirty');
    };
    const addIndex = () => { setIrlIndices(prev => [...prev, { quarter: '', value: 0 }]); setIrlSaveState('dirty'); };
    const removeIndex = (idx: number) => { setIrlIndices(prev => prev.filter((_, i) => i !== idx)); setIrlSaveState('dirty'); };

    const toggleEvent = (event: string) => {
        setTelegramEvents(prev =>
            prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
        );
        setTelegramSaveState('dirty');
    };

    const isDirty = subject !== defaultSubject || body !== defaultBody;

    const handleChange = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setSaveState('dirty');
    };

    const handleSave = async () => {
        setSaveState('saving');
        await Promise.all([
            saveSetting('welcome_email_subject', subject),
            saveSetting('welcome_email_body', body),
        ]);
        setSaveState('saved');
    };

    const handleSaveHa = async () => {
        setHaSaveState('saving');
        await saveSetting('ha_webhook_url', haWebhook);
        setHaSaveState('saved');
    };

    const applyTheme = (id: ThemeId) => {
        document.documentElement.setAttribute('data-theme', id);
        startThemeTransition(async () => { await setTheme(id); });
    };

    const btnStyle = (): React.CSSProperties => {
        if (saveState === 'saved') return { background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)' };
        if (saveState === 'dirty' || saveState === 'saving') return { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' };
        return {};
    };

    const btnLabel = () => {
        if (saveState === 'saving') return '⏳ Enregistrement…';
        if (saveState === 'saved') return '✓ Enregistré';
        if (saveState === 'dirty') return '💾 Enregistrer *';
        return '💾 Enregistrer';
    };

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>⚙️ Paramètres</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Configurez les réglages de l'application.
            </p>

            {/* Thème */}
            <Collapsible title="🎨 Apparence" subtitle="Thème de l'interface">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {THEMES.map(theme => {
                        const active = currentTheme === theme.id;
                        return (
                            <button
                                key={theme.id}
                                onClick={() => applyTheme(theme.id as ThemeId)}
                                disabled={themePending}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '1rem 1.25rem',
                                    background: active ? 'var(--surface-hover)' : 'var(--surface)',
                                    border: `1px solid ${active ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: themePending ? 'wait' : 'pointer',
                                    textAlign: 'left', width: '100%',
                                    opacity: themePending ? 0.7 : 1,
                                }}
                            >
                                <div style={{ width: 48, height: 36, borderRadius: 8, background: theme.bg, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.primary }} />
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: active ? 'var(--primary-color)' : 'var(--text-main)', marginBottom: 2 }}>
                                        {theme.label}{active && <span style={{ marginLeft: 8, fontSize: '0.7rem', opacity: 0.7 }}>✓ actif</span>}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{theme.description}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Collapsible>

            {/* Home Assistant */}
            <Collapsible title="🏠 Home Assistant" subtitle="Webhook de notification">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    URL du webhook appelé lorsqu'un locataire envoie un message.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="url"
                        value={haWebhook}
                        onChange={e => { setHaWebhook(e.target.value); setHaSaveState('dirty'); }}
                        placeholder="https://votre-ha.example.com/api/webhook/rentmaestro-message"
                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                    <button
                        onClick={handleSaveHa}
                        disabled={haSaveState === 'saving' || haSaveState === 'idle' || haSaveState === 'saved'}
                        className="std-add-button"
                        style={
                            haSaveState === 'saved' ? { background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)', whiteSpace: 'nowrap' } :
                            haSaveState === 'dirty' ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', whiteSpace: 'nowrap' } :
                            { whiteSpace: 'nowrap' }
                        }
                    >
                        {haSaveState === 'saving' ? '⏳' : haSaveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}
                    </button>
                </div>
            </Collapsible>

            {/* Telegram */}
            <Collapsible
                title="✈️ Notifications Telegram"
                subtitle="Une notification pour chaque événement sélectionné"
                headerRight={
                    <button
                        type="button"
                        onClick={() => { setTelegramEnabled(v => !v); setTelegramSaveState('dirty'); }}
                        style={{
                            flexShrink: 0,
                            width: 48, height: 26,
                            borderRadius: 13,
                            border: 'none',
                            cursor: 'pointer',
                            background: telegramEnabled ? 'var(--primary-color)' : 'var(--border-color)',
                            position: 'relative',
                            transition: 'background 0.2s',
                        }}
                        aria-label="Activer/désactiver Telegram"
                    >
                        <span style={{
                            position: 'absolute',
                            top: 3, left: telegramEnabled ? 25 : 3,
                            width: 20, height: 20,
                            borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.2s',
                        }} />
                    </button>
                }
            >
                {/* Connexion (token, chat, boutons de validation) : toujours visible, même
                    Telegram désactivé — sinon impossible de saisir/mettre à jour le token
                    ou de déclarer le webhook tant que le bascule n'est pas activé. Seules
                    les notifications par événement, en dessous, dépendent du bascule. */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                            Connexion
                        </h3>

                        <div>
                            <label style={fieldLabelStyle}>Token du bot</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="password"
                                    value={telegramToken}
                                    onChange={e => {
                                        setTelegramToken(e.target.value);
                                        setTelegramSaveState('dirty');
                                        setTokenSaveState('idle');
                                    }}
                                    placeholder={
                                        (tokenHintOverride ?? telegramTokenHint) && (tokenHintOverride || telegramTokenConfigured)
                                            ? `Enregistré (${tokenHintOverride ?? telegramTokenHint}) — laisser vide pour conserver`
                                            : '123456789:AA...'
                                    }
                                    autoComplete="off"
                                    style={{ ...fieldInputStyle, flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveTokenOnly}
                                    disabled={!telegramToken.trim() || tokenSaveState === 'saving'}
                                    className="std-add-button"
                                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                    title="Enregistre uniquement le token, indépendamment du reste"
                                >
                                    {tokenSaveState === 'saving' ? '⏳' : tokenSaveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer ce token'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRevealToken}
                                    disabled={revealState === 'loading'}
                                    className="std-add-button"
                                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                                    title="Afficher le token actuellement enregistré, en clair"
                                >
                                    {revealState === 'loading' ? '⏳' : revealState === 'shown' ? '🙈 Masquer' : '👁 Afficher'}
                                </button>
                            </div>
                            {tokenSaveState === 'error' && (
                                <p style={{ ...fieldHintStyle, color: '#ef4444' }}>⚠ {tokenSaveError}</p>
                            )}
                            {revealState === 'shown' && (
                                <p style={{ ...fieldHintStyle, fontFamily: 'monospace', userSelect: 'all', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                                    {revealedToken}
                                    {revealSource === 'env' && ' (depuis la variable d\'environnement TELEGRAM_BOT_TOKEN, pas les Réglages)'}
                                </p>
                            )}
                            {revealState === 'error' && (
                                <p style={{ ...fieldHintStyle, color: '#ef4444' }}>⚠ Aucun token trouvé (ni Réglages, ni variable d'environnement).</p>
                            )}
                            <p style={fieldHintStyle}>
                                Fourni par @BotFather. Laissez vide pour garder celui déjà enregistré.
                            </p>
                        </div>

                        <div>
                            <label style={fieldLabelStyle}>Conversation (chat ID)</label>
                            <input
                                type="text"
                                value={telegramChatId}
                                onChange={e => { setTelegramChatId(e.target.value); setTelegramSaveState('dirty'); }}
                                placeholder="-1001234567890 ou @moncanal"
                                style={fieldInputStyle}
                            />
                            <p style={fieldHintStyle}>
                                Identifiant numérique du groupe ou du canal, ou @nom pour un canal public.
                            </p>
                        </div>

                        <div>
                            <label style={fieldLabelStyle}>Sujet du groupe (optionnel)</label>
                            <input
                                type="text"
                                value={telegramThreadId}
                                onChange={e => { setTelegramThreadId(e.target.value); setTelegramSaveState('dirty'); }}
                                placeholder="12"
                                style={fieldInputStyle}
                            />
                            <p style={fieldHintStyle}>
                                Pour publier dans un sujet précis d'un groupe à sujets.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <label style={fieldLabelStyle}>Mise en forme</label>
                                <select
                                    value={telegramParseMode}
                                    onChange={e => { setTelegramParseMode(e.target.value); setTelegramSaveState('dirty'); }}
                                    style={fieldInputStyle}
                                >
                                    <option value="Markdown">Markdown</option>
                                    <option value="MarkdownV2">MarkdownV2</option>
                                    <option value="HTML">HTML</option>
                                    <option value="none">Aucune (texte brut)</option>
                                </select>
                                <p style={fieldHintStyle}>
                                    « Aucune » évite les échecs quand un nom contient un caractère réservé.
                                </p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', paddingBottom: '1.4rem' }}>
                                <input
                                    type="checkbox"
                                    checked={telegramSilent}
                                    onChange={e => { setTelegramSilent(e.target.checked); setTelegramSaveState('dirty'); }}
                                    style={{ width: 16, height: 16, accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                />
                                Notification silencieuse
                            </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleTestTelegram}
                                disabled={telegramTestState === 'sending'}
                                className="std-add-button"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {telegramTestState === 'sending' ? '⏳ Envoi…' : '✈️ Envoyer un message de test'}
                            </button>
                            {telegramTestState === 'ok' && (
                                <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>✓ Message envoyé</span>
                            )}
                            {telegramTestState === 'error' && (
                                <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠ {telegramTestError}</span>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                            <label style={fieldLabelStyle}>Validation des virements par boutons</label>
                            <p style={fieldHintStyle}>
                                Nécessaire pour répondre aux demandes de validation depuis Telegram.
                                Indique à Telegram où envoyer tes clics.
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                                <button
                                    onClick={handleRegisterWebhook}
                                    disabled={webhookState === 'working'}
                                    className="std-add-button"
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {webhookState === 'working' ? '⏳ …' : '🔗 Déclarer le webhook'}
                                </button>
                                {webhookMessage && (
                                    <span style={{ color: webhookState === 'error' ? '#ef4444' : '#22c55e', fontSize: '0.85rem' }}>
                                        {webhookState === 'error' ? '⚠ ' : '✓ '}{webhookMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                {telegramEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        {ALL_EVENTS.map(event => {
                            const checked = telegramEvents.includes(event);
                            return (
                                <div key={event} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleEvent(event)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                                        />
                                        {EVENT_LABELS[event]}
                                    </label>
                                    {checked && (
                                        <div style={{ marginTop: '0.6rem' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                                                {(EVENT_VARIABLES[event] ?? []).map(v => (
                                                    <span key={v.name} title={v.desc} style={{ fontSize: '0.72rem', fontFamily: 'monospace', background: 'rgba(43,140,238,0.12)', color: '#2b8cee', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                                                        {`{{${v.name}}}`}
                                                    </span>
                                                ))}
                                            </div>
                                            <textarea
                                                value={telegramTemplates[event] ?? ''}
                                                onChange={e => { setTelegramTemplates(prev => ({ ...prev, [event]: e.target.value })); setTelegramSaveState('dirty'); }}
                                                rows={3}
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={handleSaveTelegram}
                    disabled={telegramSaveState === 'saving' || telegramSaveState === 'idle' || telegramSaveState === 'saved'}
                    className="std-add-button"
                    style={
                        telegramSaveState === 'saved' ? { background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)', whiteSpace: 'nowrap' } :
                        telegramSaveState === 'dirty' ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', whiteSpace: 'nowrap' } :
                        { whiteSpace: 'nowrap' }
                    }
                >
                    {telegramSaveState === 'saving' ? '⏳' : telegramSaveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}
                </button>
            </Collapsible>

            {/* Indices IRL */}
            <Collapsible title="📈 Indices IRL & révision de loyer" subtitle="Indices INSEE et modèle de courrier">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Indices de référence des loyers (INSEE) utilisés pour la révision annuelle.
                </p>
                <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: '1rem' }}>
                    ⚠️ Vérifiez ces valeurs sur <a href="https://www.insee.fr" target="_blank" rel="noopener" style={{ color: '#f59e0b', textDecoration: 'underline' }}>insee.fr</a> — elles sont fournies à titre indicatif.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {irlIndices.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                value={it.quarter}
                                onChange={e => updateIndex(idx, 'quarter', e.target.value)}
                                placeholder="2025-T2"
                                style={{ width: 110, padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={Number.isNaN(it.value) ? '' : it.value}
                                onChange={e => updateIndex(idx, 'value', e.target.value)}
                                placeholder="148.10"
                                style={{ width: 110, padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                            <button onClick={() => removeIndex(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }} aria-label="Supprimer">×</button>
                        </div>
                    ))}
                    <button onClick={addIndex} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        + Ajouter un indice
                    </button>
                </div>

                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(43,140,238,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(43,140,238,0.2)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2b8cee', marginBottom: '0.5rem' }}>Variables du courrier de révision :</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {['{{prenom_locataire}}', '{{nom_locataire}}', '{{adresse_bien}}', '{{ancien_loyer}}', '{{nouveau_loyer}}', '{{loyer_cc}}', '{{augmentation}}', '{{irl_ancien}}', '{{irl_nouveau}}', '{{trimestre_ancien}}', '{{trimestre_nouveau}}', '{{date_effet}}'].map(v => (
                            <span key={v} style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(43,140,238,0.12)', color: '#2b8cee', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{v}</span>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Objet du courrier</label>
                        <input
                            value={irlSubject}
                            onChange={e => { setIrlSubject(e.target.value); setIrlSaveState('dirty'); }}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Corps du courrier</label>
                        <textarea
                            value={irlBody}
                            onChange={e => { setIrlBody(e.target.value); setIrlSaveState('dirty'); }}
                            rows={12}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSaveIrl}
                    disabled={irlSaveState === 'saving' || irlSaveState === 'idle' || irlSaveState === 'saved'}
                    className="std-add-button"
                    style={{
                        marginTop: '1rem',
                        ...(irlSaveState === 'saved' ? { background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)' } :
                        irlSaveState === 'dirty' ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' } : {}),
                    }}
                >
                    {irlSaveState === 'saving' ? '⏳' : irlSaveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}
                </button>
            </Collapsible>

            {/* Sécurité */}
            <Collapsible title="🔐 Sécurité" subtitle="Double authentification et clés d'accès">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Authentification et sécurité du compte <strong>{userEmail}</strong>
                </p>
                <PasskeySetup passkeyCount={passkeyCount} />
                <div style={{ marginTop: '1rem' }}>
                    <TotpSetup totpEnabled={totpEnabled} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <PushNotificationToggle />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <UserManagement currentUserId={userId} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <BackupRestore />
                </div>
                <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'var(--bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>📋 Journal d'activité</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Historique horodaté de toutes les connexions et actions. Conservé 1 an.
                    </p>
                    <Link href="/settings/logs" style={{
                        display: 'inline-block', padding: '0.5rem 1rem',
                        background: 'var(--primary)', color: '#fff', fontWeight: 600,
                        borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.875rem',
                    }}>
                        Consulter les logs →
                    </Link>
                </div>
            </Collapsible>

            {/* Email de bienvenue */}
            <Collapsible title="📧 Email de bienvenue (nouveau bail)" subtitle="Modèle envoyé à la signature d'un bail">

                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(43,140,238,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(43,140,238,0.2)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2b8cee', marginBottom: '0.5rem' }}>Variables disponibles :</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {VARIABLES.map(v => (
                            <span key={v.name} title={v.desc} style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(43,140,238,0.12)', color: '#2b8cee', padding: '0.15rem 0.4rem', borderRadius: 4, cursor: 'default' }}>
                                {v.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Objet</label>
                        <input
                            value={subject}
                            onChange={e => handleChange(setSubject)(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Corps du message</label>
                        <textarea
                            value={body}
                            onChange={e => handleChange(setBody)(e.target.value)}
                            rows={14}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    <button
                        onClick={handleSave}
                        disabled={saveState === 'saving' || !isDirty}
                        className="std-add-button"
                        style={btnStyle()}
                    >
                        {btnLabel()}
                    </button>
                </div>
            </Collapsible>

            <Collapsible title="🔑 Email d'accès à l'espace locataire" subtitle="Modèle envoyé lors de la création de l'espace">
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(43,140,238,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(43,140,238,0.2)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2b8cee', marginBottom: '0.5rem' }}>Variables disponibles :</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {PORTAL_INVITE_VARIABLES.map(v => (
                            <span key={v.name} title={v.desc} style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(43,140,238,0.12)', color: '#2b8cee', padding: '0.15rem 0.4rem', borderRadius: 4, cursor: 'default' }}>
                                {v.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Objet</label>
                        <input
                            value={portalSubject}
                            onChange={e => { setPortalSubject(e.target.value); setPortalSaveState('dirty'); }}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Corps du message</label>
                        <textarea
                            value={portalBody}
                            onChange={e => { setPortalBody(e.target.value); setPortalSaveState('dirty'); }}
                            rows={16}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <p style={fieldHintStyle}>
                            Les liens et les sauts de ligne sont mis en forme automatiquement à l'envoi.
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                    <button
                        onClick={handleSavePortalInvite}
                        disabled={portalSaveState === 'saving' || portalSaveState === 'idle' || portalSaveState === 'saved'}
                        className="std-add-button"
                        style={
                            portalSaveState === 'saved' ? { background: 'rgba(43,140,238,0.15)', color: '#2b8cee', borderColor: 'rgba(43,140,238,0.3)' } :
                            portalSaveState === 'dirty' ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' } :
                            undefined
                        }
                    >
                        {portalSaveState === 'saving' ? '⏳' : portalSaveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}
                    </button>
                </div>
            </Collapsible>
        </div>
    );
}
