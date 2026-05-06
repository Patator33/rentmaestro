'use client'

import { useTransition } from 'react'
import { setTheme } from '@/actions/theme'
import { THEMES, type ThemeId } from '@/themes/index'

export default function ThemeSwitcher({ current }: { current: ThemeId }) {
    const [pending, startTransition] = useTransition()

    const apply = (id: ThemeId) => {
        document.documentElement.setAttribute('data-theme', id)
        startTransition(async () => {
            await setTheme(id)
        })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {THEMES.map(theme => {
                const active = current === theme.id
                return (
                    <button
                        key={theme.id}
                        onClick={() => apply(theme.id as ThemeId)}
                        disabled={pending}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem 1.25rem',
                            background: active ? 'var(--surface-hover)' : 'var(--surface)',
                            border: `1px solid ${active ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-lg)',
                            cursor: pending ? 'wait' : 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            opacity: pending ? 0.7 : 1,
                            width: '100%',
                        }}
                    >
                        {/* Swatch */}
                        <div style={{
                            width: 48,
                            height: 36,
                            borderRadius: 8,
                            background: theme.bg,
                            border: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            overflow: 'hidden',
                        }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: theme.primary }} />
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent }} />
                        </div>

                        {/* Labels */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: active ? 'var(--primary-color)' : 'var(--text-main)',
                                marginBottom: 2,
                            }}>
                                {theme.label}
                                {active && <span style={{ marginLeft: 8, fontSize: '0.7rem', opacity: 0.7 }}>✓ actif</span>}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {theme.description}
                            </div>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
