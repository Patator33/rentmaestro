import { cookies } from 'next/headers'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { THEME_COOKIE, DEFAULT_THEME, type ThemeId } from '@/themes/index'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const store = await cookies()
    const current = (store.get(THEME_COOKIE)?.value ?? DEFAULT_THEME) as ThemeId

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Paramètres
                </p>
                <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                    Apparence
                </h1>
            </div>

            <section style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Thème
                </h2>
                <ThemeSwitcher current={current} />
                <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Le thème est enregistré dans votre navigateur et s'applique immédiatement.
                </p>
            </section>
        </div>
    )
}
