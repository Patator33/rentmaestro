'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { THEME_COOKIE, DEFAULT_THEME, THEMES, type ThemeId } from '@/themes/index'

export async function setTheme(themeId: string) {
    const valid = THEMES.some(t => t.id === themeId)
    const id: ThemeId = valid ? (themeId as ThemeId) : DEFAULT_THEME

    await prisma.setting.upsert({
        where: { key: 'theme' },
        update: { value: id },
        create: { key: 'theme', value: id },
    })

    const store = await cookies()
    store.set(THEME_COOKIE, id, {
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
    })
}
