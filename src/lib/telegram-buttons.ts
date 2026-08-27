import { getTelegramConfig, telegramApiBase, type TelegramConfig } from '@/lib/n8n';

export interface InlineButton {
    text: string;
    /** Limité à 64 octets par Telegram : garder des identifiants courts. */
    callback_data: string;
}

async function callTelegram(
    method: string,
    payload: Record<string, unknown>,
    config?: TelegramConfig
): Promise<{ ok: boolean; result?: any; error?: string }> {
    const cfg = config ?? await getTelegramConfig();
    if (!cfg.botToken) return { ok: false, error: 'Token du bot manquant' };

    try {
        const res = await fetch(`${telegramApiBase()}/bot${cfg.botToken}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
            return { ok: false, error: data?.description || `Erreur HTTP ${res.status}` };
        }
        return { ok: true, result: data.result };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Erreur réseau' };
    }
}

/** Message avec un bouton par ligne, pour rester lisible sur mobile. */
export async function sendMessageWithButtons(text: string, buttons: InlineButton[]) {
    const cfg = await getTelegramConfig();
    if (!cfg.botToken || !cfg.chatId) {
        return { ok: false as const, error: 'Telegram non configuré' };
    }

    const payload: Record<string, unknown> = {
        chat_id: cfg.chatId,
        text,
        disable_notification: cfg.silent,
        reply_markup: { inline_keyboard: buttons.map(b => [b]) },
    };
    if (cfg.parseMode && cfg.parseMode !== 'none') payload.parse_mode = cfg.parseMode;
    if (cfg.threadId) payload.message_thread_id = Number(cfg.threadId);

    const res = await callTelegram('sendMessage', payload, cfg);
    return res.ok
        ? { ok: true as const, chatId: String(res.result.chat.id), messageId: String(res.result.message_id) }
        : { ok: false as const, error: res.error };
}

/** Message texte simple, sans bouton — réponse à une réponse rapide ambiguë. */
export async function sendPlainMessage(chatId: string, text: string) {
    const cfg = await getTelegramConfig();
    const payload: Record<string, unknown> = { chat_id: chatId, text };
    if (cfg.parseMode && cfg.parseMode !== 'none') payload.parse_mode = cfg.parseMode;
    return callTelegram('sendMessage', payload, cfg);
}

/** Retire les boutons après décision pour empêcher un second clic. */
export async function editMessageText(chatId: string, messageId: string, text: string) {
    const cfg = await getTelegramConfig();
    const payload: Record<string, unknown> = {
        chat_id: chatId,
        message_id: Number(messageId),
        text,
        reply_markup: { inline_keyboard: [] },
    };
    if (cfg.parseMode && cfg.parseMode !== 'none') payload.parse_mode = cfg.parseMode;
    return callTelegram('editMessageText', payload, cfg);
}

export interface WebhookStatus {
    configured: boolean;
    url: string;
    pendingUpdates: number;
    lastError: string | null;
}

/** Adresse que Telegram doit appeler, dérivée de l'URL publique de l'application. */
export function webhookUrl(baseUrl: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
}

export async function getWebhookInfo(): Promise<{ ok: boolean; status?: WebhookStatus; error?: string }> {
    const res = await callTelegram('getWebhookInfo', {});
    if (!res.ok) return { ok: false, error: res.error };
    return {
        ok: true,
        status: {
            configured: !!res.result.url,
            url: res.result.url || '',
            pendingUpdates: res.result.pending_update_count ?? 0,
            lastError: res.result.last_error_message ?? null,
        },
    };
}

/**
 * Déclare l'adresse de rappel auprès de Telegram.
 *
 * `allowed_updates` limité aux clics sur boutons : le bot n'a pas à recevoir
 * les messages de la conversation.
 */
export async function registerWebhook(baseUrl: string): Promise<{ ok: boolean; url?: string; error?: string }> {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret || secret.length < 16) {
        return { ok: false, error: "TELEGRAM_WEBHOOK_SECRET manquant ou trop court (16 caractères minimum)." };
    }

    const url = webhookUrl(baseUrl);
    if (!url.startsWith('https://')) {
        // Telegram refuse le HTTP simple : autant le dire clairement.
        return { ok: false, error: `Telegram exige une adresse HTTPS publique (reçu : ${url}).` };
    }

    const res = await callTelegram('setWebhook', {
        url,
        secret_token: secret,
        // 'message' en plus de 'callback_query' : certains clients Telegram
        // (montres connectées notamment) n'affichent pas les vrais boutons
        // inline et proposent à la place des réponses rapides ("Oui"/"Non"/
        // "Ok") qui envoient un simple message texte — sans ça, Telegram ne
        // livrait même pas ces messages au webhook.
        allowed_updates: ['callback_query', 'message'],
    });
    return res.ok ? { ok: true, url } : { ok: false, error: res.error };
}

/** Sans cette réponse, Telegram laisse le bouton en état de chargement. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    return callTelegram('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
    });
}
