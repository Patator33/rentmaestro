import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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

    if (notifications.length === 0) {
        return NextResponse.json({ sent: 0, message: 'Rien à signaler.' });
    }

    let totalSent = 0;
    for (const notif of notifications) {
        totalSent += await sendToAll(notif);
    }

    return NextResponse.json({ sent: totalSent, notifications: notifications.length });
}
