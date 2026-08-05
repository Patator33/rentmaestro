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

/** Sans cette réponse, Telegram laisse le bouton en état de chargement. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    return callTelegram('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
    });
}
