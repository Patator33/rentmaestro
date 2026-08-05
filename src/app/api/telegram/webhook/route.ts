import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { expectedRentForPeriod } from '@/lib/rent-period';
import { answerCallbackQuery, editMessageText } from '@/lib/telegram-buttons';
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
 * Reçoit les clics sur les boutons Telegram.
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
    const callback = update?.callback_query;
    if (!callback) return NextResponse.json({ ok: true });

    const data: string = callback.data ?? '';
    const parts = data.split(':');
    if (parts[0] !== 'p' || parts.length < 3) {
        await answerCallbackQuery(callback.id);
        return NextResponse.json({ ok: true });
    }

    const [, shortId, choice] = parts;
    const pending = await prisma.pendingTransfer.findFirst({
        where: { id: { startsWith: shortId } },
    });

    if (!pending) {
        await answerCallbackQuery(callback.id, 'Virement introuvable');
        return NextResponse.json({ ok: true });
    }

    // Le message garde ses boutons si l'édition a échoué : un second clic ne
    // doit pas créditer deux fois.
    if (pending.status !== 'PENDING') {
        await answerCallbackQuery(callback.id, 'Déjà traité');
        return NextResponse.json({ ok: true });
    }

    const header = `💶 Virement de ${fmt(pending.amount)} € — ${pending.sender}`;

    if (choice === 'x') {
        await prisma.pendingTransfer.update({
            where: { id: pending.id },
            data: { status: 'REJECTED', resolvedAt: new Date() },
        });
        await answerCallbackQuery(callback.id, 'Refusé');
        if (pending.chatId && pending.messageId) {
            await editMessageText(pending.chatId, pending.messageId, `${header}\n\n❌ Refusé — aucun loyer n'a été modifié.`);
        }
        return NextResponse.json({ ok: true });
    }

    const options: StoredOption[] = JSON.parse(pending.options || '[]');
    const option = options[Number(choice)];
    if (!option) {
        await answerCallbackQuery(callback.id, 'Choix invalide');
        return NextResponse.json({ ok: true });
    }

    const [y, m] = option.period.split('-').map(Number);
    const period = new Date(Date.UTC(y, m - 1, 1));

    const lease = await prisma.lease.findUnique({
        where: { id: option.leaseId },
        include: { tenant: true },
    });
    if (!lease) {
        await answerCallbackQuery(callback.id, 'Bail introuvable');
        return NextResponse.json({ ok: true });
    }

    const existing = await prisma.rentPayment.findFirst({ where: { leaseId: lease.id, period } });
    const expectedAmount = existing?.amount ?? expectedRentForPeriod(lease, period);
    const alreadyPaid = existing?.status === 'PARTIAL' && existing.paidAmount != null ? existing.paidAmount : 0;
    const totalPaid = alreadyPaid + pending.amount;
    const isPartial = totalPaid < expectedAmount - 0.01;

    const paymentData = {
        status: isPartial ? 'PARTIAL' : 'PAID',
        paidAt: new Date(),
        paidAmount: isPartial ? totalPaid : null,
    };

    const payment = existing
        ? await prisma.rentPayment.update({ where: { id: existing.id }, data: paymentData })
        : await prisma.rentPayment.create({ data: { leaseId: lease.id, period, amount: expectedAmount, ...paymentData } });

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

    await answerCallbackQuery(callback.id, isPartial ? 'Paiement partiel enregistré' : 'Loyer enregistré');
    if (pending.chatId && pending.messageId) {
        await editMessageText(
            pending.chatId,
            pending.messageId,
            `${header}\n\n${summary}${labelSaved ? '\n\nLibellé bancaire mémorisé pour les prochains virements.' : ''}`
        );
    }

    revalidatePath('/rents');
    revalidatePath('/');

    return NextResponse.json({ ok: true });
}
