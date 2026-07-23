import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendQuittanceEmailCore, sendReminderEmailCore } from "@/lib/rent-emails";
import { generateRentsForCurrentMonth } from "@/lib/rent-generation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");
        const authHeader = request.headers.get("authorization");

        // Validate security token
        // Token can be passed via ?token=secret or Authorization: Bearer secret
        const validToken = process.env.CRON_SECRET;
        if (!validToken) {
            console.error("[CRON] CRON_SECRET is not configured.");
            return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
        }

        const isAuthorized = token === validToken || authHeader === `Bearer ${validToken}`;
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let sentQuittances = 0;
        let sentReminders = 0;

        // -----------------------------------------------------
        // 0. Generate this month's rent payments + mark overdue ones LATE
        // (also reachable manually via /api/generate-rents)
        // -----------------------------------------------------
        const rentGeneration = await generateRentsForCurrentMonth();

        // -----------------------------------------------------
        // 1. Send automated quittances
        // Search for PAID rents that never received a quittance
        // -----------------------------------------------------
        const paidRentsEligibleForQuittance = await prisma.rentPayment.findMany({
            where: {
                status: "PAID",
                receiptSentAt: null,
            },
            include: {
                lease: {
                    include: {
                        tenant: true
                    }
                }
            }
        });

        for (const payment of paidRentsEligibleForQuittance) {
            if (payment.lease.tenant.email) {
                const result = await sendQuittanceEmailCore(payment.id);
                if (result.success) {
                    sentQuittances++;
                } else {
                    console.error(`[CRON] Failed to send quittance for payment ${payment.id}:`, result.error);
                }
            }
        }

        // -----------------------------------------------------
        // 2. Send automated reminders
        // Remind PENDING or LATE rents that haven't been reminded recently
        // -----------------------------------------------------
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Let's assume we remind on the 10th of the month for the current month if not paid
        // For past months, we remind every 7 days.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Active leases
        const activeLeases = await prisma.lease.findMany({
            where: { isActive: true },
            include: { tenant: true }
        });

        for (const lease of activeLeases) {
            if (!lease.tenant.email) continue;

            // Check if current month is paid
            const currentPayment = await prisma.rentPayment.findFirst({
                where: { leaseId: lease.id, period: startOfMonth }
            });

            // If we are past the 9th of the month, and rent is not paid, we should remind
            const isLateForCurrentMonth = today.getDate() > 9 && (!currentPayment || (currentPayment.status !== "PAID"));

            if (isLateForCurrentMonth) {
                const needsReminder = !currentPayment || !currentPayment.sentAt || currentPayment.sentAt < sevenDaysAgo;

                if (needsReminder) {
                    const result = await sendReminderEmailCore(lease.id, startOfMonth.toISOString());
                    if (result.success) {
                        sentReminders++;
                    } else {
                        console.error(`[CRON] Failed to send reminder for lease ${lease.id}:`, result.error);
                    }
                }
            }
        }

        // Purge audit logs older than 1 year
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const { count: deletedLogs } = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: oneYearAgo } },
        });

        return NextResponse.json({
            success: true,
            message: `CRON Job success. Sent ${sentQuittances} quittances and ${sentReminders} reminders.`,
            stats: {
                rentsCreated: rentGeneration.created,
                rentsMarkedLate: rentGeneration.lateMarked,
                quittancesSent: sentQuittances,
                remindersSent: sentReminders,
                auditLogsPurged: deletedLogs,
            }
        });

    } catch (error: any) {
        console.error("[CRON] Global error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
