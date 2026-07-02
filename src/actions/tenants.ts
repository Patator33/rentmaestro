'use server'

import { tenantSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyN8n } from "@/lib/n8n";
import { sendEmail } from "@/lib/email";
import { logAction } from "@/lib/audit";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/session";

async function getBaseUrl() {
    const h = await headers();
    const host = h.get('host') || 'localhost:3000';
    const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return process.env.APP_BASE_URL || `${proto}://${host}`;
}

export async function createTenant(formData: FormData) {
    await requireAuth();
    const rawData = {
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        coTenantFirstName: formData.get("coTenantFirstName") as string,
        coTenantLastName: formData.get("coTenantLastName") as string,
        coTenantEmail: formData.get("coTenantEmail") as string,
        coTenantPhone: formData.get("coTenantPhone") as string,
        paymentDay: formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : 5,
    };

    try {
        const validatedData = tenantSchema.parse(rawData);
        const newTenant = await prisma.tenant.create({
            data: validatedData,
        });

        // Trigger n8n webhook
        await notifyN8n('TENANT_CREATED', newTenant);
        await logAction({ action: 'CREATE_TENANT', entity: 'Tenant', entityId: newTenant.id, details: `${newTenant.firstName} ${newTenant.lastName}` });
    } catch (error) {
        console.error("Erreur lors de la création du locataire:", error);
        throw new Error("Impossible de créer le locataire. Vérifiez les données saisies.");
    }

    revalidatePath("/", "layout");
    redirect("/tenants");
}

export async function deleteTenant(id: string) {
    await requireAuth();
    const leaseCount = await prisma.lease.count({ where: { tenantId: id } });
    if (leaseCount > 0) {
        throw new Error("le bail associé doit d'abord être supprimé pour pouvoir supprimer l'appartement ou le locataire !");
    }
    try {
        await prisma.tenant.delete({
            where: { id },
        });
        await logAction({ action: 'DELETE_TENANT', entity: 'Tenant', entityId: id });
    } catch (error) {
        console.error("Erreur lors de la suppression du locataire:", error);
        throw new Error("Impossible de supprimer le locataire.");
    }
    revalidatePath("/tenants");
}

export async function updateTenant(id: string, formData: FormData) {
    await requireAuth();
    const rawData = {
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        coTenantFirstName: formData.get("coTenantFirstName") as string,
        coTenantLastName: formData.get("coTenantLastName") as string,
        coTenantEmail: formData.get("coTenantEmail") as string,
        coTenantPhone: formData.get("coTenantPhone") as string,
        paymentDay: formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : 5,
    };

    try {
        await prisma.tenant.update({
            where: { id },
            data: rawData,
        });
        await logAction({ action: 'UPDATE_TENANT', entity: 'Tenant', entityId: id, details: `${rawData.firstName} ${rawData.lastName}` });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du locataire:", error);
        throw new Error("Impossible de mettre à jour le locataire.");
    }

    revalidatePath("/", "layout");
    redirect(`/tenants/${id}`);
}

export async function archiveTenant(id: string) {
    await requireAuth();
    await prisma.tenant.update({
        where: { id },
        data: { isArchived: true, portalToken: null },
    });
    await logAction({ action: 'ARCHIVE_TENANT', entity: 'Tenant', entityId: id });
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${id}`);
}

export async function reactivateTenant(id: string) {
    await requireAuth();
    await prisma.tenant.update({
        where: { id },
        data: { isArchived: false },
    });
    await logAction({ action: 'REACTIVATE_TENANT', entity: 'Tenant', entityId: id });
    revalidatePath('/tenants');
    revalidatePath(`/tenants/${id}`);
}

export async function generatePortalToken(tenantId: string) {
    await requireAuth();
    try {
        const token = crypto.randomUUID();
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { portalToken: token }
        });
        revalidatePath(`/tenants/${tenantId}`);
        return { success: true, token };
    } catch (error) {
        console.error("Erreur gnration token portail:", error);
        return { success: false, error: "Impossible de gnrer le lien du portail" };
    }
}

export async function sendPortalInvite(tenantId: string) {
    await requireAuth();
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || !tenant.portalToken) {
            return { success: false, error: "Locataire introuvable ou pas de token généré" };
        }
        if (!tenant.email) {
            return { success: false, error: "Ce locataire n'a pas d'adresse email" };
        }

        const baseUrl = await getBaseUrl();
        const portalUrl = `${baseUrl}/portal/${tenant.portalToken}`;
        const apkUrl = `${baseUrl}/downloads/rentmaestro-tenant.apk`;

        await sendEmail({
            to: tenant.email,
            subject: `Accès à votre espace locataire — RentMaestro`,
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 560px; line-height: 1.6;">
                    <h2 style="color: #1e293b;">Bonjour ${tenant.firstName},</h2>
                    <p>Céline et Nicolas vous invitent à accéder à votre <strong>espace locataire RentMaestro</strong>.</p>
                    <p>Vous y trouverez :</p>
                    <ul>
                        <li>Votre historique de paiements et quittances</li>
                        <li>La messagerie avec votre propriétaire</li>
                        <li>Le signalement d'incidents techniques</li>
                    </ul>

                    <h3 style="color: #1e293b; margin-top: 2rem;">🌐 Accès web</h3>
                    <p>Cliquez sur le lien ci-dessous pour accéder depuis votre navigateur :</p>
                    <a href="${portalUrl}" style="display: inline-block; padding: 0.7rem 1.4rem; background: #2b8cee; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Accéder à mon espace →
                    </a>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">${portalUrl}</p>

                    <h3 style="color: #1e293b; margin-top: 2rem;">📱 Application mobile Android</h3>
                    <p>Téléchargez l'application RentMaestro sur votre smartphone Android :</p>
                    <a href="${apkUrl}" style="display: inline-block; padding: 0.7rem 1.4rem; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ⬇️ Télécharger l'application Android
                    </a>
                    <p style="color: #64748b; font-size: 0.85rem; margin-top: 0.5rem;">
                        Après installation, entrez ce code d'accès lors du premier lancement :
                    </p>
                    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 1rem; letter-spacing: 0.05em; word-break: break-all; color: #0f172a;">
                        ${tenant.portalToken}
                    </div>

                    <p style="margin-top: 2rem; color: #94a3b8; font-size: 0.8rem;">
                        <em>Ne partagez pas ce code avec d'autres personnes. — RentMaestro</em>
                    </p>
                </div>
            `,
        });

        return { success: true };
    } catch (error) {
        console.error("Erreur envoi invite portail:", error);
        return { success: false, error: "Impossible d'envoyer l'email" };
    }
}
