'use client'

import { useState, useTransition } from 'react'
import { saveDocusealSettings, testDocusealConnection, checkDocusealTemplates, type DocusealSettingsView, type TemplateCheckResult } from '@/actions/docuseal-settings'

const label: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-secondary)' }
const input: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'inherit' }
const hintStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }
const button: React.CSSProperties = { padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }

type TestResult = { success: boolean; error?: string; templates?: { label: string; id: number; name: string; roles: string[] }[] } | null

/** Réglages de la signature des baux : URL/clé DocuSeal, templates, rappels. */
export default function DocusealSettings({ initial }: { initial: DocusealSettingsView }) {
    const [url, setUrl] = useState(initial.url)
    const [apiKey, setApiKey] = useState('')
    const [webhookSecret, setWebhookSecret] = useState('')
    const [tplNu, setTplNu] = useState(initial.tplNu)
    const [tplMeuble, setTplMeuble] = useState(initial.tplMeuble)
    const [tplColoc, setTplColoc] = useState(initial.tplColoc)
    const [tplCaution, setTplCaution] = useState(initial.tplCaution)
    const [reminderDays, setReminderDays] = useState(String(initial.reminderDays))
    const [reminderMax, setReminderMax] = useState(String(initial.reminderMax))
    const [apiKeyHint, setApiKeyHint] = useState(initial.apiKeyConfigured ? initial.apiKeyHint : '')
    const [secretHint, setSecretHint] = useState(initial.webhookSecretConfigured ? initial.webhookSecretHint : '')
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
    const [test, setTest] = useState<TestResult>(null)
    const [pending, startTransition] = useTransition()

    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/docuseal/webhook` : '/api/docuseal/webhook'

    const generateSecret = () => {
        const bytes = new Uint8Array(24)
        crypto.getRandomValues(bytes)
        setWebhookSecret(Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''))
    }

    const save = () => {
        setMessage(null)
        startTransition(async () => {
            const res = await saveDocusealSettings({ url, apiKey, webhookSecret, tplNu, tplMeuble, tplColoc, tplCaution, reminderDays, reminderMax })
            if (!res.success) { setMessage({ ok: false, text: res.error ?? 'Erreur.' }); return }
            if (res.apiKeyHint) setApiKeyHint(res.apiKeyHint)
            if (res.webhookSecretHint) setSecretHint(res.webhookSecretHint)
            setApiKey('')
            setWebhookSecret('')
            setMessage({ ok: true, text: 'Réglages enregistrés.' })
        })
    }

    const runTest = () => {
        setTest(null)
        startTransition(async () => {
            setTest(await testDocusealConnection({ url, apiKey, tplNu, tplMeuble, tplColoc, tplCaution }))
        })
    }

    const [check, setCheck] = useState<{ success: boolean; error?: string; results: TemplateCheckResult[] } | null>(null)
    const runCheck = () => {
        setCheck(null)
        startTransition(async () => { setCheck(await checkDocusealTemplates()) })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Connexion à DocuSeal pour envoyer les baux en signature. Les templates se créent à la main dans DocuSeal ;
                renseignez ici leur numéro (visible dans l'URL du template).
            </p>

            <div>
                <label style={label} htmlFor="ds-url">URL de DocuSeal</label>
                <input id="ds-url" style={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://sign.exemple.fr" />
            </div>

            <div>
                <label style={label} htmlFor="ds-key">Clé API {apiKeyHint && <span style={{ fontWeight: 400 }}>(enregistrée : {apiKeyHint})</span>}</label>
                <input id="ds-key" type="password" autoComplete="off" style={input} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={apiKeyHint ? 'Laisser vide pour conserver la clé actuelle' : 'Collez la clé API DocuSeal'} />
                <p style={hintStyle}>La clé n'est jamais réaffichée après l'enregistrement.</p>
            </div>

            <div>
                <label style={label} htmlFor="ds-secret">Secret du webhook {secretHint && <span style={{ fontWeight: 400 }}>(enregistré : {secretHint})</span>}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="ds-secret" autoComplete="off" style={input} value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder={secretHint ? 'Laisser vide pour conserver le secret actuel' : 'Générez ou saisissez un secret'} />
                    <button type="button" style={button} onClick={generateSecret}>Générer</button>
                </div>
                <p style={hintStyle}>
                    À déclarer dans DocuSeal (Paramètres → Webhooks) : URL <code>{webhookUrl}</code> et un en-tête <code>x-docuseal-secret</code> portant ce secret
                    Événements à cocher : <em>submission.completed</em>, <em>form.declined</em>, <em>submission.expired</em>, <em>submission.archived</em>.
                    Copiez le secret généré avant d'enregistrer. Sans webhook (ou si votre DocuSeal ne sait pas envoyer d'en-tête), l'état se met à jour à l'ouverture de la page du bail.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                    <label style={label} htmlFor="ds-nu">Template bail nu</label>
                    <input id="ds-nu" inputMode="numeric" style={input} value={tplNu} onChange={e => setTplNu(e.target.value)} placeholder="ex. 1" />
                </div>
                <div>
                    <label style={label} htmlFor="ds-meuble">Template bail meublé</label>
                    <input id="ds-meuble" inputMode="numeric" style={input} value={tplMeuble} onChange={e => setTplMeuble(e.target.value)} />
                </div>
                <div>
                    <label style={label} htmlFor="ds-coloc">Template colocation</label>
                    <input id="ds-coloc" inputMode="numeric" style={input} value={tplColoc} onChange={e => setTplColoc(e.target.value)} />
                </div>
                <div>
                    <label style={label} htmlFor="ds-caution">Template acte de cautionnement</label>
                    <input id="ds-caution" inputMode="numeric" style={input} value={tplCaution} onChange={e => setTplCaution(e.target.value)} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                    <label style={label} htmlFor="ds-days">Rappel après (jours)</label>
                    <input id="ds-days" type="number" min={1} max={60} style={input} value={reminderDays} onChange={e => setReminderDays(e.target.value)} />
                    <p style={hintStyle}>Délai sans signature avant de relancer les signataires.</p>
                </div>
                <div>
                    <label style={label} htmlFor="ds-max">Nombre de rappels maximum</label>
                    <input id="ds-max" type="number" min={0} max={10} style={input} value={reminderMax} onChange={e => setReminderMax(e.target.value)} />
                    <p style={hintStyle}>0 = aucun rappel automatique.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={{ ...button, background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }} disabled={pending} onClick={save}>
                    {pending ? '⏳' : '💾 Enregistrer'}
                </button>
                <button type="button" style={button} disabled={pending} onClick={runTest}>Tester la connexion</button>
                <button type="button" style={button} disabled={pending} onClick={runCheck}>Vérifier les modèles</button>
                {message &&<span style={{ fontSize: '0.85rem', color: message.ok ? '#22c55e' : '#ef4444' }}>{message.text}</span>}
            </div>

            {test && (
                <div style={{ fontSize: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${test.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, background: test.success ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)' }}>
                    {test.success ? (
                        <>
                            <strong>Connexion réussie.</strong>
                            {test.templates && test.templates.length > 0 ? (
                                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                                    {test.templates.map(t => (
                                        <li key={t.id}>{t.label} : « {t.name} » (n° {t.id}) — rôles : {t.roles.join(', ') || 'aucun'}</li>
                                    ))}
                                </ul>
                            ) : <span> Aucun template configuré à vérifier.</span>}
                        </>
                    ) : <strong style={{ color: '#ef4444' }}>{test.error}</strong>}
                </div>
            )}

            {check && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {!check.success && <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>{check.error}</strong>}
                    {check.results.map(r => (
                        <div key={r.label} style={{ fontSize: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)' }}>
                            <strong>{r.label}</strong>
                            {!r.templateId && <span style={{ color: 'var(--text-muted)' }}> : template non configuré</span>}
                            {r.error && <div style={{ color: '#ef4444', marginTop: '0.25rem' }}>{r.error}</div>}
                            {r.analysis && (
                                <div style={{ marginTop: '0.35rem', lineHeight: 1.6 }}>
                                    <div>« {r.analysis.name} » (n° {r.analysis.id}) — rôles : {r.analysis.roles.join(', ') || 'aucun'}</div>
                                    {r.analysis.missingRoles.length > 0 && (
                                        <div style={{ color: '#ef4444' }}>❌ Rôle(s) obligatoire(s) absent(s) : {r.analysis.missingRoles.join(', ')}</div>
                                    )}
                                    {r.analysis.extraRoles.length > 0 && (
                                        <div style={{ color: '#f59e0b' }}>⚠️ Rôle(s) non standard (jamais renseignés par RentMaestro) : {r.analysis.extraRoles.join(', ')}</div>
                                    )}
                                    <div style={{ color: r.analysis.matched.length ? '#22c55e' : '#f59e0b' }}>
                                        {r.analysis.matched.length ? '✅' : '⚠️'} {r.analysis.matched.length} champ(s) préremplis par RentMaestro
                                    </div>
                                    {r.analysis.riskyRoleFields.length > 0 && (
                                        <div style={{ color: '#f59e0b' }}>
                                            ⚠️ Champs sur un rôle parfois absent (ils resteraient vides) : {r.analysis.riskyRoleFields.map(f => `${f.name} (${f.role})`).join(', ')}.
                                            Placez-les sur le rôle Bailleur.
                                        </div>
                                    )}
                                    {r.analysis.ambiguousNames.length > 0 && (
                                        <div style={{ color: '#f59e0b' }}>⚠️ Nom de champ utilisé par plusieurs rôles : {r.analysis.ambiguousNames.join(', ')}</div>
                                    )}
                                    {r.analysis.freeFields.length > 0 && (
                                        <details>
                                            <summary style={{ cursor: 'pointer' }}>{r.analysis.freeFields.length} champ(s) hors catalogue (à remplir par le signataire)</summary>
                                            <div style={{ color: 'var(--text-muted)' }}>{r.analysis.freeFields.map(f => `${f.name} [${f.type}${f.role ? `, ${f.role}` : ''}]`).join(' · ')}</div>
                                        </details>
                                    )}
                                    {r.analysis.notInTemplate.length > 0 && (
                                        <details>
                                            <summary style={{ cursor: 'pointer' }}>{r.analysis.notInTemplate.length} champ(s) du catalogue absents du template (information)</summary>
                                            <div style={{ color: 'var(--text-muted)' }}>{r.analysis.notInTemplate.join(' · ')}</div>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
