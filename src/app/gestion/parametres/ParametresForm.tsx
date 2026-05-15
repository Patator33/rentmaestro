'use client';

import { useState, useTransition } from 'react';
import { saveSetting } from '@/actions/settings';
import { setTheme } from '@/actions/theme';
import { THEMES, type ThemeId } from '@/themes/index';

const VARIABLES = [
    { name: '{{prenom_locataire}}', desc: 'Prénom du locataire' },
    { name: '{{nom_locataire}}', desc: 'Nom complet du locataire' },
    { name: '{{nom_colocataire}}', desc: 'Nom complet du co-locataire' },
    { name: '{{adresse_bien}}', desc: 'Adresse du logement' },
    { name: '{{loyer_hc}}', desc: 'Loyer hors charges' },
    { name: '{{charges}}', desc: 'Charges' },
    { name: '{{loyer_cc}}', desc: 'Loyer charges comprises' },
    { name: '{{caution}}', desc: 'Dépôt de garantie' },
    { name: '{{date_debut}}', desc: 'Date de début du bail' },
    { name: '{{prorata_premier_mois}}', desc: 'Montant du premier mois (prorata si entrée en cours de mois)' },
];

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

export default function ParametresForm({
    defaultSubject, defaultBody, defaultHaWebhook, currentTheme,
}: {
    defaultSubject: string;
    defaultBody: string;
    defaultHaWebhook: string;
    currentTheme: ThemeId;
}) {
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [haWebhook, setHaWebhook] = useState(defaultHaWebhook);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [themePending, startThemeTransition] = useTransition();

    const isDirty = subject !== defaultSubject || body !== defaultBody || haWebhook !== defaultHaWebhook;

    const handleChange = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setSaveState('dirty');
    };

    const handleSave = async () => {
        setSaveState('saving');
        await Promise.all([
            saveSetting('welcome_email_subject', subject),
            saveSetting('welcome_email_body', body),
            saveSetting('ha_webhook_url', haWebhook),
        ]);
        setSaveState('saved');
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
            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🎨 Apparence</h2>
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
            </section>

            {/* Home Assistant */}
            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>🏠 Home Assistant</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    URL du webhook appelé lorsqu'un locataire envoie un message.
                </p>
                <input
                    type="url"
                    value={haWebhook}
                    onChange={e => handleChange(setHaWebhook)(e.target.value)}
                    placeholder="https://votre-ha.example.com/api/webhook/rentmaestro-message"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
            </section>

            {/* Email de bienvenue */}
            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📧 Email de bienvenue (nouveau bail)</h2>

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
            </section>

            <div style={{ marginTop: '1.5rem' }}>
                <button
                    onClick={handleSave}
                    disabled={saveState === 'saving' || !isDirty}
                    className="std-add-button"
                    style={btnStyle()}
                >
                    {btnLabel()}
                </button>
            </div>
        </div>
    );
}
