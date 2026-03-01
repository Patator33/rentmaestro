'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyN8n } from '@/lib/n8n';
import { sendEmail } from '@/lib/email';

export async function getMessages(tenantId: string) {
    return prisma.message.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function sendAdminMessage(tenantId: string, content: string) {
    if (!content.trim()) return { success: false, error: 'Message vide' };
    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: false },
    });
    revalidatePath(`/tenants/${tenantId}`);
    return { success: true, message };
}

export async function sendPortalMessage(tenantId: string, content: string, token: string) {
    if (!content.trim()) return { success: false, error: 'Message vide' };

    // Verify token ownership
    const tenant = await prisma.tenant.findUnique({ where: { portalToken: token } });
    if (!tenant || tenant.id !== tenantId) return { success: false, error: 'Non autorisé' };

    const message = await prisma.message.create({
        data: { tenantId, content: content.trim(), fromTenant: true },
    });

    // Notify landlord
    await notifyN8n('TENANT_MESSAGE', {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        message: content.trim(),
    }).catch(() => {});

    if (process.env.SMTP_USER) {
        sendEmail({
            to: process.env.SMTP_USER,
            subject: `Nouveau message de ${tenant.firstName} ${tenant.lastName}`,
            html: `
                <div style="font-family:sans-serif;color:#333;max-width:500px;">
                    <h2 style="color:#1e293b;">Message de votre locataire</h2>
                    <p><strong>${tenant.firstName} ${tenant.lastName}</strong> vous a envoyé un message :</p>
                    <blockquote style="border-left:3px solid #2b8cee;padding:0.75rem 1rem;margin:1rem 0;background:#f8fafc;color:#334155;">
                        ${content.trim().replace(/\n/g, '<br>')}
                    </blockquote>
                    <p style="color:#64748b;font-size:0.9rem;">Connectez-vous à Rentmaestro pour répondre.</p>
                </div>
            `,
        }).catch(() => {});
    }

    return { success: true, message };
}

export async function markMessagesRead(tenantId: string, fromTenant: boolean) {
    await prisma.message.updateMany({
        where: { tenantId, fromTenant, readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath(`/tenants/${tenantId}`);
}
