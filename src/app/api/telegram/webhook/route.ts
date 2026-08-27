import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { expectedRentForPeriod } from '@/lib/rent-period';
import { answerCallbackQuery, editMessageText, sendPlainMessage } from '@/lib/telegram-buttons';
import { logAction } from '@/lib/audit';

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
    if (parts[0] !== 'p' || parts.length < 3) {
        await answerCallbackQuery(callback.id);
        return;
    }

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
}

const YES_WORDS = ['oui', 'ok', 'okay', 'yes', 'valider', 'confirmer', 'confirmé', 'd\'accord'];
const NO_WORDS = ['non', 'no', 'refuser', 'annuler'];

/**
 * Réponse texte de secours : certains clients Telegram (montres connectées
 * notamment) n'affichent pas les vrais boutons inline et proposent des
 * réponses rapides ("Oui"/"Non"/"Ok") qui arrivent ici comme un simple
 * message, pas un clic de bouton. On résout alors le virement PENDING le
 * plus récent de cette conversation — fiable tant qu'un seul virement est en
 * attente à la fois, ce qui est le cas normal.
 */
async function handleTextMessage(message: any) {
    const chatId = message.chat?.id != null ? String(message.chat.id) : null;
    const text = String(message.text ?? '').trim().toLowerCase();
    if (!chatId || !text) return;

    const isYes = YES_WORDS.includes(text);
    const isNo = NO_WORDS.includes(text);
    if (!isYes && !isNo) return;

    const pending = await prisma.pendingTransfer.findFirst({
        where: { chatId, status: 'PENDING' },
        orderBy: { receivedAt: 'desc' },
    });
    if (!pending) return;

    if (isNo) {
        await resolvePendingTransfer(pending, 'x');
        return;
    }

    const options: StoredOption[] = JSON.parse(pending.options || '[]');
    if (options.length !== 1) {
        // Plusieurs correspondances possibles : un "oui" générique ne peut
        // pas dire laquelle choisir en toute sécurité — on ne devine pas.
        await sendPlainMessage(chatId, "Plusieurs correspondances possibles pour ce virement : réponds depuis le téléphone ou l'ordinateur pour choisir la bonne.");
        return;
    }

    await resolvePendingTransfer(pending, 0);
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
