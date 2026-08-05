'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';
import { sendTelegramMessage } from '@/lib/n8n';
import { headers } from 'next/headers';
import { registerWebhook, getWebhookInfo, webhookUrl, type WebhookStatus } from '@/lib/telegram-buttons';

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

async function publicBaseUrl(): Promise<string> {
    const h = await headers();
    const host = h.get('host') || 'localhost:3000';
    const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return process.env.APP_BASE_URL || `${proto}://${host}`;
}

/** État du rappel Telegram, tel que Telegram lui-même le connaît. */
export async function getTelegramWebhookStatus(): Promise<{
    status: WebhookStatus | null;
    expectedUrl: string;
    secretConfigured: boolean;
    error?: string;
}> {
    await requireAuth();
    const expectedUrl = webhookUrl(await publicBaseUrl());
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
    const info = await getWebhookInfo();
    return {
        status: info.status ?? null,
        expectedUrl,
        secretConfigured: secret.length >= 16,
        error: info.error,
    };
}

export async function registerTelegramWebhook(): Promise<{ success: boolean; url?: string; error?: string }> {
    await requireAuth();
    const res = await registerWebhook(await publicBaseUrl());
    if (!res.ok) return { success: false, error: res.error };
    revalidatePath('/gestion/parametres');
    return { success: true, url: res.url };
}
