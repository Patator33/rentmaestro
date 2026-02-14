'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markRentAsPaid(leaseId: string, periodStr: string, amount: number) {
    const period = new Date(periodStr); // Expecting YYYY-MM-DD which parses to UTC 00:00 if ISO

    // Check if payment exists
    const existing = await prisma.rentPayment.findFirst({
        where: {
            leaseId,
            period,
        }
    });

    if (existing) {
        await prisma.rentPayment.update({
            where: { id: existing.id },
            data: {
                status: "PAID",
                paidAt: new Date(),
                amount, // Update amount if changed
            }
        });
    } else {
        await prisma.rentPayment.create({
            data: {
                leaseId,
                period,
                amount,
                status: "PAID",
                paidAt: new Date(),
            }
        });
    }

    revalidatePath("/rents");
}

export async function sendRentReminder(leaseId: string, periodStr: string) {
    // Simulate email sending
    console.log(`Sending reminder for lease ${leaseId} period ${periodStr}`);

    const period = new Date(periodStr);

    const existing = await prisma.rentPayment.findFirst({
        where: { leaseId, period }
    });

    if (existing) {
        await prisma.rentPayment.update({
            where: { id: existing.id },
            data: { sentAt: new Date() }
        });
    } else {
        // Create pending record
        const lease = await prisma.lease.findUnique({ where: { id: leaseId } });
        if (!lease) return;

        await prisma.rentPayment.create({
            data: {
                leaseId,
                period,
                amount: lease.rentAmount + lease.chargesAmount,
                status: "PENDING",
                sentAt: new Date(),
            }
        });
    }

    revalidatePath("/rents");
}
