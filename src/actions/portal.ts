"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notifyN8n } from "@/lib/n8n";
import { sendEmail } from "@/lib/email";

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

        // Add an entry in the tenant notes journal
        await prisma.tenantNote.create({
            data: {
                tenantId,
                type: "NOTE",
                content: `🔧 Signalement technique : ${title}${description ? ` — ${description}` : ''}`
            }
        });

        const apt = await prisma.apartment.findUnique({ where: { id: apartmentId } });

        // Notify via n8n webhook
        await notifyN8n("INCIDENT_REPORTED", {
            taskId: task.id,
            tenantName: `${tenant.firstName} ${tenant.lastName}`,
            apartment: apt ? apt.address : apartmentId,
            title,
            description
        });

        // Notify landlord via email
        if (process.env.SMTP_USER) {
            try {
                await sendEmail({
                    to: process.env.SMTP_USER,
                    subject: `Nouveau signalement — ${tenant.firstName} ${tenant.lastName}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 500px;">
                            <h2 style="color: #1e293b;">🔧 Nouveau signalement technique</h2>
                            <p><strong>${tenant.firstName} ${tenant.lastName}</strong> a signalé un problème
                            pour le logement au <strong>${apt ? apt.address : apartmentId}</strong>.</p>
                            <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
                                <tr><td style="padding: 0.5rem; font-weight:600; width:120px;">Objet</td><td style="padding: 0.5rem;">${title}</td></tr>
                                ${description ? `<tr><td style="padding: 0.5rem; font-weight:600;">Détail</td><td style="padding: 0.5rem;">${description}</td></tr>` : ''}
                            </table>
                            <p style="color: #64748b; font-size: 0.9rem;"><em>Rentmaestro — Gestion Locative</em></p>
                        </div>
                    `,
                });
            } catch {
                // Email failure is non-blocking
            }
        }

        revalidatePath(`/portal/${token}`);
        revalidatePath(`/apartments/${apartmentId}`);
        revalidatePath(`/tenants/${tenantId}`);
        revalidatePath(`/`);

        return { success: true };
    } catch (error: any) {
        console.error("Erreur reportIncident:", error);
        return { success: false, error: "Impossible de créer le ticket." };
    }
}
