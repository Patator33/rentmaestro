import { getSetting, saveSetting } from '@/actions/settings';

export const dynamic = 'force-dynamic';

const DEFAULT_WELCOME_SUBJECT = 'Bienvenue dans votre nouveau logement — {{adresse_bien}}';

const DEFAULT_WELCOME_BODY = `Bonjour {{prenom_locataire}},

Nous avons le plaisir de vous accueillir dans votre nouveau logement situé au {{adresse_bien}}.

Voici un récapitulatif de votre contrat :
- Loyer hors charges : {{loyer_hc}} €
- Charges : {{charges}} €
- Loyer charges comprises : {{loyer_cc}} €
- Dépôt de garantie : {{caution}} €
- Date d'entrée : {{date_debut}}

N'hésitez pas à nous contacter pour toute question.

Cordialement,
Céline et Nicolas`;

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
];

export default async function ParametresPage() {
    const subject = await getSetting('welcome_email_subject') ?? DEFAULT_WELCOME_SUBJECT;
    const body = await getSetting('welcome_email_body') ?? DEFAULT_WELCOME_BODY;

    async function save(formData: FormData) {
        'use server';
        await saveSetting('welcome_email_subject', formData.get('subject') as string);
        await saveSetting('welcome_email_body', formData.get('body') as string);
    }

    return (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>⚙️ Paramètres</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Configurez les modèles d'emails envoyés automatiquement.
            </p>

            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem' }}>
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

                <form action={save} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                            Objet
                        </label>
                        <input
                            name="subject"
                            defaultValue={subject}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                            Corps du message
                        </label>
                        <textarea
                            name="body"
                            defaultValue={body}
                            rows={14}
                            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    </div>
                    <div>
                        <button type="submit" className="std-add-button" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                            💾 Enregistrer
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
