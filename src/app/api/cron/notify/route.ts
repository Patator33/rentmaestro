import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { notifyN8n } from '@/lib/n8n';
import { computeRevision, quarterPlusOneYear, DEFAULT_IRL_INDICES, type IrlIndex } from '@/lib/irl';

async function sendToAll(payload: { title: string; body: string; url: string }) {
    // Set VAPID details at call time so build-time missing env vars don't crash
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );
    const subs = await prisma.pushSubscription.findMany();
    const results = await Promise.allSettled(
        subs.map((sub) =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify(payload)
            ).catch(async (err) => {
                // Remove stale subscriptions (410 Gone)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
                }
                throw err;
            })
        )
    );
    return results.filter((r) => r.status === 'fulfilled').length;
}

export async function POST(request: NextRequest) {
    // Protect the cron route with a shared secret
    const secret = request.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const today = new Date();
    const notifications: { title: string; body: string; url: string }[] = [];

    // 1. Loyers en retard (LATE)
    const lateRents = await prisma.rentPayment.findMany({
        where: { status: 'LATE' },
        include: { lease: { include: { apartment: true, tenant: true } } },
    });
    if (lateRents.length > 0) {
        notifications.push({
            title: `⚠️ ${lateRents.length} loyer${lateRents.length > 1 ? 's' : ''} en retard`,
            body: lateRents.map((r) =>
                `${r.lease.tenant.firstName} ${r.lease.tenant.lastName} — ${r.lease.apartment.address}`
            ).slice(0, 3).join('\n'),
            url: '/rents',
        });
    }

    // 2. Baux expirant dans 90 jours
    const in90 = new Date(today);
    in90.setDate(in90.getDate() + 90);
    const expiringLeases = await prisma.lease.findMany({
        where: { isActive: true, endDate: { lte: in90, gte: today } },
        include: { apartment: true, tenant: true },
    });
    if (expiringLeases.length > 0) {
        notifications.push({
            title: `📅 ${expiringLeases.length} bail${expiringLeases.length > 1 ? 'x' : ''} expirant bientôt`,
            body: expiringLeases.map((l) =>
                `${l.tenant.firstName} — ${l.apartment.address}`
            ).slice(0, 3).join('\n'),
            url: '/leases',
        });
    }

    // 3. Tâches en retard (dueDate passée, pas DONE)
    const overdueTasks = await prisma.task.findMany({
        where: { status: { not: 'DONE' }, dueDate: { lt: today } },
    });
    if (overdueTasks.length > 0) {
        notifications.push({
            title: `🔧 ${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard`,
            body: overdueTasks.map((t) => t.title).slice(0, 3).join('\n'),
            url: '/apartments',
        });
    }

    // 4. Révisions de loyer (IRL) dues — notifiée une seule fois par bail et par an
    const activeLeases = await prisma.lease.findMany({
        where: { isActive: true },
        include: { apartment: true, tenant: true },
    });
    const irlSetting = await prisma.setting.findUnique({ where: { key: 'irl_indices' } });
    const indices: IrlIndex[] = irlSetting?.value ? JSON.parse(irlSetting.value) : DEFAULT_IRL_INDICES;

    for (const lease of activeLeases) {
        const refDate = lease.lastRentReviewDate ? new Date(lease.lastRentReviewDate) : new Date(lease.startDate);
        const nextReview = new Date(refDate);
        nextReview.setFullYear(nextReview.getFullYear() + 1);
        if (nextReview > today) continue;
        if (lease.endDate && new Date(lease.endDate) < nextReview) continue;

        // Déjà notifié pour cette échéance ?
        const dedupKey = `irl_reminder_${lease.id}`;
        const already = await prisma.setting.findUnique({ where: { key: dedupKey } });
        const reviewIso = nextReview.toISOString().slice(0, 10);
        if (already?.value === reviewIso) continue;

        // Estimation du nouveau loyer si on a les indices
        let estimatedRent: number | null = null;
        if (lease.irlBaseQuarter && lease.irlBaseIndex) {
            const newQuarter = quarterPlusOneYear(lease.irlBaseQuarter);
            const newIdx = indices.find(i => i.quarter === newQuarter)?.value;
            if (newIdx) {
                estimatedRent = computeRevision(lease.rentAmount, lease.irlBaseQuarter, lease.irlBaseIndex, newQuarter, newIdx).newRent;
            }
        }

        const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        notifications.push({
            title: `📈 Révision de loyer due — ${tenantName}`,
            body: `${lease.apartment.address}\nLoyer actuel : ${lease.rentAmount.toFixed(2)} €`
                + (estimatedRent ? ` → estimé : ${estimatedRent.toFixed(2)} €` : ''),
            url: `/leases/${lease.id}`,
        });
        notifyN8n('RENT_REVIEW_DUE', {
            tenantName,
            apartment: lease.apartment.address,
            currentRent: lease.rentAmount,
            estimatedRent,
            reviewDate: nextReview.toLocaleDateString('fr-FR'),
            leaseId: lease.id,
        }).catch(() => {});

        await prisma.setting.upsert({
            where: { key: dedupKey },
            update: { value: reviewIso },
            create: { key: dedupKey, value: reviewIso },
        });
    }

    if (notifications.length === 0) {
        return NextResponse.json({ sent: 0, message: 'Rien à signaler.' });
    }

    let totalSent = 0;
    for (const notif of notifications) {
        totalSent += await sendToAll(notif);
    }

    return NextResponse.json({ sent: totalSent, notifications: notifications.length });
}
