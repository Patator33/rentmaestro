'use client';

import { useState } from 'react';
import { saveSetting } from '@/actions/settings';

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

export default function ParametresForm({ defaultSubject, defaultBody }: { defaultSubject: string; defaultBody: string }) {
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [saveState, setSaveState] = useState<SaveState>('idle');

    const isDirty = subject !== defaultSubject || body !== defaultBody;

    const handleSubject = (v: string) => { setSubject(v); setSaveState('dirty'); };
    const handleBody = (v: string) => { setBody(v); setSaveState('dirty'); };

    const handleSave = async () => {
        setSaveState('saving');
        await saveSetting('welcome_email_subject', subject);
        await saveSetting('welcome_email_body', body);
        setSaveState('saved');
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
                Configurez les modèles d'emails envoyés automatiquement.
            </p>

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
                            onChange={e => handleSubject(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Corps du message</label>
                        <textarea
                            value={body}
                            onChange={e => handleBody(e.target.value)}
                            rows={14}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>
                    <div>
                        <button
                            onClick={handleSave}
                            disabled={saveState === 'saving' || saveState === 'idle'}
                            className="std-add-button"
                            style={btnStyle()}
                        >
                            {btnLabel()}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
