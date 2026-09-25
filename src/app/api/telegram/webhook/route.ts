import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { expectedRentForPeriod } from '@/lib/rent-period';
import { answerCallbackQuery, editMessageText, sendPlainMessage, sendMessageWithButtons } from '@/lib/telegram-buttons';
import { logAction } from '@/lib/audit';
import { deliverAdminMessage } from '@/actions/messages';

const REPLY_EXPIRY_MS = 30 * 60 * 1000;

export const dynamic = 'force-dynamic';

interface StoredOption {
    leaseId: string;
    period: string;
    tenantName: string;
    apartment: string;
    remaining: number;
}

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Applique la décision (accepter une option du virement, ou le refuser) et
 * édite le message Telegram d'origine. Partagé entre le clic sur bouton
 * (callback_query) et la réponse texte de secours (message) : les deux
 * mènent au même état final.
 */
async function resolvePendingTransfer(
    pending: { id: string; amount: number; sender: string; options: string; chatId: string | null; messageId: string | null },
    choice: number | 'x'
): Promise<string> {
    const header = `💶 Virement de ${fmt(pending.amount)} € — ${pending.sender}`;

    if (choice === 'x') {
        await prisma.pendingTransfer.update({
            where: { id: pending.id },
            data: { status: 'REJECTED', resolvedAt: new Date() },
        });
        if (pending.chatId && pending.messageId) {
            await editMessageText(pending.chatId, pending.messageId, `${header}\n\n❌ Refusé — aucun loyer n'a été modifié.`);
        }
        return 'Refusé';
    }

    const options: StoredOption[] = JSON.parse(pending.options || '[]');
    const option = options[choice];
    if (!option) return 'Choix invalide';

    const [y, m] = option.period.split('-').map(Number);
    const period = new Date(Date.UTC(y, m - 1, 1));

    const lease = await prisma.lease.findUnique({
        where: { id: option.leaseId },
        include: { tenant: true },
    });
    if (!lease) return 'Bail introuvable';

    const existing = await prisma.rentPayment.findFirst({ where: { leaseId: lease.id, period } });
    // Recalculé depuis le bail plutôt que réutilisé depuis la ligne existante :
    // une ligne générée avant l'enregistrement d'un départ restait figée au
    // loyer plein, le prorata de sortie n'était jamais repris.
    const expectedAmount = expectedRentForPeriod(lease, period);
    const alreadyPaid = existing?.status === 'PARTIAL' && existing.paidAmount != null ? existing.paidAmount : 0;
    const totalPaid = alreadyPaid + pending.amount;
    const isPartial = totalPaid < expectedAmount - 0.01;

    const paymentData = {
        amount: expectedAmount,
        status: isPartial ? 'PARTIAL' : 'PAID',
        paidAt: new Date(),
        paidAmount: isPartial ? totalPaid : null,
    };

    const payment = existing
        ? await prisma.rentPayment.update({ where: { id: existing.id }, data: paymentData })
        : await prisma.rentPayment.create({ data: { leaseId: lease.id, period, ...paymentData } });

    // Le libellé mémorisé rend les rapprochements suivants certains.
    let labelSaved = false;
    if (!lease.tenant.bankLabel) {
        await prisma.tenant.update({ where: { id: lease.tenantId }, data: { bankLabel: pending.sender } });
        labelSaved = true;
    }

    await prisma.pendingTransfer.update({
        where: { id: pending.id },
        data: { status: 'CONFIRMED', resolvedAt: new Date() },
    });

    const periodLabel = period.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    await logAction({
        action: 'AUTO_RENT_PAID',
        entity: 'RentPayment',
        entityId: payment.id,
        details: `Virement ${fmt(pending.amount)} € — ${option.tenantName} — ${periodLabel} — ${paymentData.status}`,
    }).catch(() => {});

    const summary = isPartial
        ? `💰 Paiement partiel enregistré\n${option.tenantName} — ${periodLabel}\nReçu ${fmt(totalPaid)} € sur ${fmt(expectedAmount)} € — reste ${fmt(expectedAmount - totalPaid)} €`
        : `✅ Loyer enregistré\n${option.tenantName} — ${periodLabel}\n${fmt(expectedAmount)} €`;

    if (pending.chatId && pending.messageId) {
        await editMessageText(
            pending.chatId,
            pending.messageId,
            `${header}\n\n${summary}${labelSaved ? '\n\nLibellé bancaire mémorisé pour les prochains virements.' : ''}`
        );
    }

    revalidatePath('/rents');
    revalidatePath('/');

    return isPartial ? 'Paiement partiel enregistré' : 'Loyer enregistré';
}

async function handleCallbackQuery(callback: any) {
    const data: string = callback.data ?? '';
    const parts = data.split(':');
    const prefix = parts[0];

    if (prefix === 'p' && parts.length >= 3) {
        const [, shortId, choiceStr] = parts;
        const pending = await prisma.pendingTransfer.findFirst({ where: { id: { startsWith: shortId } } });
        if (!pending) {
            await answerCallbackQuery(callback.id, 'Virement introuvable');
            return;
        }
        // Le message garde ses boutons si l'édition a échoué : un second clic ne
        // doit pas créditer deux fois.
        if (pending.status !== 'PENDING') {
            await answerCallbackQuery(callback.id, 'Déjà traité');
            return;
        }
        const choice = choiceStr === 'x' ? 'x' as const : Number(choiceStr);
        const result = await resolvePendingTransfer(pending, choice);
        await answerCallbackQuery(callback.id, result);
        return;
    }

    if (prefix === 'r' && parts.length >= 2) {
        await openReplyMode(callback, parts[1]);
        return;
    }

    if (prefix === 'rc' && parts.length >= 2) {
        await cancelReplyMode(callback, parts[1]);
        return;
    }

    if (prefix === 'dv' && parts.length >= 3) {
        await resolveDisambiguatedTransfer(callback, parts[1], parts[2]);
        return;
    }

    if (prefix === 'dr' && parts.length >= 3) {
        await resolveDisambiguatedReply(callback, parts[1], parts.slice(2).join(':'));
        return;
    }

    await answerCallbackQuery(callback.id);
}

/** Ouvre le mode "réponse en cours" : le prochain texte libre du chat part au locataire. */
async function openReplyMode(callback: any, tenantShortId: string) {
    const chatId = callback.message?.chat?.id != null ? String(callback.message.chat.id) : null;
    const tenant = await prisma.tenant.findFirst({ where: { id: { startsWith: tenantShortId } } });
    if (!chatId || !tenant) {
        await answerCallbackQuery(callback.id, 'Locataire introuvable');
        return;
    }

    // Un seul mode réponse actif à la fois sur ce chat : une attente oubliée
    // est abandonnée au profit de la nouvelle plutôt que de coexister.
    await prisma.pendingReply.updateMany({
        where: { chatId, status: 'PENDING' },
        data: { status: 'CANCELLED', resolvedAt: new Date() },
    });
    const pending = await prisma.pendingReply.create({ data: { tenantId: tenant.id, chatId } });

    const originalMessageId = callback.message?.message_id != null ? String(callback.message.message_id) : null;
    if (originalMessageId) {
        // Retire le bouton Répondre : un second clic ne doit pas rouvrir le mode.
        await editMessageText(chatId, originalMessageId, callback.message?.text ?? '');
    }

    const shortId = pending.id.slice(0, 8);
    await sendMessageWithButtons(
        `✍️ Tape ta réponse pour ${tenant.firstName} ${tenant.lastName}\n(annule avec /annuler ou le bouton ci-dessous — expire dans 30 min)`,
        [{ text: '❌ Annuler', callback_data: `rc:${shortId}` }]
    );
    await answerCallbackQuery(callback.id);
}

async function cancelReplyMode(callback: any, shortId: string) {
    const pending = await prisma.pendingReply.findFirst({ where: { id: { startsWith: shortId }, status: 'PENDING' } });
    if (!pending) {
        await answerCallbackQuery(callback.id, 'Déjà traité');
        return;
    }
    await prisma.pendingReply.update({ where: { id: pending.id }, data: { status: 'CANCELLED', resolvedAt: new Date() } });

    const chatId = callback.message?.chat?.id != null ? String(callback.message.chat.id) : null;
    const messageId = callback.message?.message_id != null ? String(callback.message.message_id) : null;
    if (chatId && messageId) {
        await editMessageText(chatId, messageId, 'Annulé.');
    }
    await answerCallbackQuery(callback.id, 'Annulé');
}

/** Le texte tapé était ambigu (virement ou réponse) : ici on sait lequel a été choisi. */
async function resolveDisambiguatedTransfer(callback: any, shortId: string, word: string) {
    const pending = await prisma.pendingTransfer.findFirst({ where: { id: { startsWith: shortId } } });
    if (!pending || pending.status !== 'PENDING') {
        await answerCallbackQuery(callback.id, 'Déjà traité');
        return;
    }
    if (NO_WORDS.includes(word)) {
        const result = await resolvePendingTransfer(pending, 'x');
        await answerCallbackQuery(callback.id, result);
        return;
    }
    const options: StoredOption[] = JSON.parse(pending.options || '[]');
    if (options.length !== 1) {
        await answerCallbackQuery(callback.id, 'Plusieurs correspondances : réponds depuis le téléphone ou l\'ordinateur.');
        return;
    }
    const result = await resolvePendingTransfer(pending, 0);
    await answerCallbackQuery(callback.id, result);
}

async function resolveDisambiguatedReply(callback: any, shortId: string, rawText: string) {
    const pending = await prisma.pendingReply.findFirst({ where: { id: { startsWith: shortId }, status: 'PENDING' } });
    if (!pending) {
        await answerCallbackQuery(callback.id, 'Déjà traité');
        return;
    }
    const result = await deliverAdminMessage(pending.tenantId, rawText);
    await prisma.pendingReply.update({ where: { id: pending.id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    await answerCallbackQuery(callback.id, result.success ? 'Message envoyé' : (result.error ?? 'Erreur'));
}

const YES_WORDS = ['oui', 'ok', 'okay', 'yes', 'valider', 'confirmer', 'confirmé', 'd\'accord'];
const NO_WORDS = ['non', 'no', 'refuser', 'annuler'];

/**
 * Réponse texte de secours (virement) et canal de réponse au locataire
 * (mode ouvert par le bouton "Répondre") partagent le même texte libre : la
 * priorité est réglée ici. Le texte n'est ambigu que s'il ressemble à une
 * confirmation de virement ("oui"/"non"/...) ET qu'une réponse locataire est
 * aussi en attente — tout autre texte ne peut être qu'une réponse, le
 * virement ignorant déjà tout ce qui n'est pas oui/non.
 */
async function handleTextMessage(message: any) {
    const chatId = message.chat?.id != null ? String(message.chat.id) : null;
    const rawText = String(message.text ?? '').trim();
    const text = rawText.toLowerCase();
    if (!chatId || !rawText) return;

    const pendingReply = await prisma.pendingReply.findFirst({
        where: { chatId, status: 'PENDING', createdAt: { gte: new Date(Date.now() - REPLY_EXPIRY_MS) } },
        orderBy: { createdAt: 'desc' },
    });

    if (pendingReply && text === '/annuler') {
        await prisma.pendingReply.update({ where: { id: pendingReply.id }, data: { status: 'CANCELLED', resolvedAt: new Date() } });
        await sendPlainMessage(chatId, 'Annulé.');
        return;
    }

    const isYes = YES_WORDS.includes(text);
    const isNo = NO_WORDS.includes(text);

    const pendingTransfer = (isYes || isNo)
        ? await prisma.pendingTransfer.findFirst({ where: { chatId, status: 'PENDING' }, orderBy: { receivedAt: 'desc' } })
        : null;

    if (pendingReply && pendingTransfer) {
        const transferShortId = pendingTransfer.id.slice(0, 8);
        const replyShortId = pendingReply.id.slice(0, 8);
        await sendMessageWithButtons('Ce texte concerne quoi ?', [
            { text: '💶 Virement', callback_data: `dv:${transferShortId}:${text}` },
            { text: '💬 Réponse locataire', callback_data: `dr:${replyShortId}:${rawText}` },
        ]);
        return;
    }

    if (pendingReply) {
        const result = await deliverAdminMessage(pendingReply.tenantId, rawText);
        await prisma.pendingReply.update({ where: { id: pendingReply.id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
        await sendPlainMessage(chatId, result.success ? '✅ Message envoyé au locataire.' : `Erreur : ${result.error}`);
        return;
    }

    if (!pendingTransfer) return;

    if (isNo) {
        await resolvePendingTransfer(pendingTransfer, 'x');
        return;
    }

    const options: StoredOption[] = JSON.parse(pendingTransfer.options || '[]');
    if (options.length !== 1) {
        // Plusieurs correspondances possibles : un "oui" générique ne peut
        // pas dire laquelle choisir en toute sécurité — on ne devine pas.
        await sendPlainMessage(chatId, "Plusieurs correspondances possibles pour ce virement : réponds depuis le téléphone ou l'ordinateur pour choisir la bonne.");
        return;
    }

    await resolvePendingTransfer(pendingTransfer, 0);
}

/**
 * Reçoit les clics sur les boutons Telegram (et, en secours, les réponses
 * texte des clients qui n'affichent pas les vrais boutons — ex. montres
 * connectées).
 *
 * Telegram appelle cette adresse sans session : l'authenticité est vérifiée par
 * le jeton secret que Telegram renvoie dans un en-tête, tel que déclaré lors de
 * l'enregistrement du webhook. Toujours répondre 200 : un code d'erreur
 * pousserait Telegram à réessayer en boucle.
 */
export async function POST(request: Request) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected || expected.length < 16) {
        return NextResponse.json({ ok: true, ignored: 'webhook non configuré' });
    }
    if (request.headers.get('x-telegram-bot-api-secret-token') !== expected) {
        return NextResponse.json({ ok: true, ignored: 'jeton invalide' });
    }

    const update = await request.json().catch(() => null);

    try {
        if (update?.callback_query) {
            await handleCallbackQuery(update.callback_query);
        } else if (update?.message) {
            await handleTextMessage(update.message);
        }
    } catch (error) {
        console.error('Erreur webhook Telegram:', error);
    }

    return NextResponse.json({ ok: true });
}
