'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';
import { sendTelegramMessage } from '@/lib/n8n';

export async function getSetting(key: string): Promise<string | null> {
    await requireAuth();
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
    await requireAuth();
    await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    revalidatePath('/gestion/parametres');
}

/**
 * Le token du bot n'est jamais renvoyé au navigateur : le formulaire n'en
 * connaît que la présence et les derniers caractères, et ne l'écrit que si un
 * nouveau est saisi.
 */
export async function getTelegramTokenHint(): Promise<{ configured: boolean; hint: string }> {
    await requireAuth();
    const row = await prisma.setting.findUnique({ where: { key: 'telegram_bot_token' } });
    const token = row?.value?.trim() || (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
    if (!token) return { configured: false, hint: '' };
    return { configured: true, hint: `…${token.slice(-4)}` };
}

export async function sendTelegramTest(): Promise<{ success: boolean; error?: string }> {
    await requireAuth();
    return sendTelegramMessage('✅ RentMaestro — message de test. La configuration Telegram fonctionne.');
}
