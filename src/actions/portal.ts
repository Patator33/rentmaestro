"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyN8n } from "@/lib/n8n";

export async function reportIncident(
    apartmentId: string,
    tenantId: string,
    title: string,
    description: string,
    token: string
) {
    try {
        // Validate token matches the tenant
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId, portalToken: token },
        });

        if (!tenant) {
            return { success: false, error: "Non autorisé" };
        }

        const task = await prisma.task.create({
            data: {
                apartmentId,
                tenantId,
                title,
                description,
                status: "TODO"
            }
        });

        // Notify over Webhook (Optional but good)
        // Need apartment info to send a better notification
        const apt = await prisma.apartment.findUnique({ where: { id: apartmentId } });

        await notifyN8n("INCIDENT_REPORTED", {
            taskId: task.id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            apartment: apt ? apt.address : apartmentId,
            title,
            description
        });

        // We revalidate the portal page
        revalidatePath(`/portal/${token}`);

        return { success: true };
    } catch (error: any) {
        console.error("Erreur reportIncident:", error);
        return { success: false, error: "Impossible de créer le ticket." };
    }
}
