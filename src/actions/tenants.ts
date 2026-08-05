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
import { DEFAULT_PORTAL_INVITE_SUBJECT, DEFAULT_PORTAL_INVITE_BODY, escapeHtml } from "@/lib/portal-invite";

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
        bankLabel: (formData.get("bankLabel") as string) || undefined,
    };

    const parsed = tenantSchema.safeParse(rawData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
    }

    let newTenant;
    try {
        newTenant = await prisma.tenant.create({ data: parsed.data });
    } catch (error) {
        console.error("Erreur lors de la création du locataire:", error);
        return { success: false, error: "Impossible de créer le locataire (email peut-être déjà utilisé)." };
    }

    // Side effects (webhook, audit log) must not turn a successful creation into a reported failure.
    notifyN8n('TENANT_CREATED', newTenant).catch(() => {});
    logAction({ action: 'CREATE_TENANT', entity: 'Tenant', entityId: newTenant.id, details: `${newTenant.firstName} ${newTenant.lastName}` }).catch(() => {});

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
        bankLabel: (formData.get("bankLabel") as string) || undefined,
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

        const [subjectTpl, bodyTpl] = await Promise.all([
            prisma.setting.findUnique({ where: { key: 'portal_invite_subject' } })
                .then(s => s?.value || DEFAULT_PORTAL_INVITE_SUBJECT),
            prisma.setting.findUnique({ where: { key: 'portal_invite_body' } })
                .then(s => s?.value || DEFAULT_PORTAL_INVITE_BODY),
        ]);

        const vars: Record<string, string> = {
            prenom_locataire: tenant.firstName,
            nom_locataire: `${tenant.firstName} ${tenant.lastName}`,
            lien_portail: portalUrl,
            code_acces: tenant.portalToken,
            lien_application: apkUrl,
        };
        const applyVars = (tpl: string) =>
            Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), tpl);

        const body = applyVars(bodyTpl);
        // Le corps est saisi en texte simple : seuls les liens et les sauts de
        // ligne sont mis en forme, comme pour les autres modèles d'email.
        const htmlBody = escapeHtml(body)
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2b8cee">$1</a>')
            .replace(/\n/g, '<br />');

        await sendEmail({
            to: tenant.email,
            subject: applyVars(subjectTpl),
            html: `<div style="font-family: sans-serif; color: #333; max-width: 560px; line-height: 1.6;">${htmlBody}</div>`,
        });

        return { success: true };
    } catch (error) {
        console.error("Erreur envoi invite portail:", error);
        return { success: false, error: "Impossible d'envoyer l'email" };
    }
}
