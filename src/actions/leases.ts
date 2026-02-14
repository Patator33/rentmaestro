'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLease(formData: FormData) {
    const apartmentId = formData.get("apartmentId") as string;
    const tenantId = formData.get("tenantId") as string;
    const startDateStr = formData.get("startDate") as string;
    const startDate = new Date(startDateStr);
    const rentAmount = parseFloat(formData.get("rentAmount") as string);
    const chargesAmount = parseFloat(formData.get("chargesAmount") as string);
    const terminateLeaseId = formData.get("terminateLeaseId") as string;

    if (terminateLeaseId) {
        // Close previous lease the day before the new one starts
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() - 1);

        await prisma.lease.update({
            where: { id: terminateLeaseId },
            data: {
                isActive: false,
                endDate: endDate
            }
        });
    }

    await prisma.lease.create({
        data: {
            apartmentId,
            tenantId,
            startDate,
            rentAmount,
            chargesAmount,
            isActive: true,
        },
    });

    revalidatePath("/leases");
    revalidatePath("/apartments");
    redirect("/leases");
}

export async function terminateLease(id: string, endDateStr?: string) {
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    await prisma.lease.update({
        where: { id },
        data: {
            // We don't set isActive: false anymore, status is derived from dates
            isActive: true,
            endDate: endDate,
        },
    });
    revalidatePath("/apartments");
    revalidatePath(`/apartments`); // Force update all apartments lists
    revalidatePath("/leases");
}

export async function deleteLease(id: string) {
    await prisma.lease.delete({
        where: { id },
    });
    revalidatePath("/leases");
    revalidatePath("/apartments");
}
