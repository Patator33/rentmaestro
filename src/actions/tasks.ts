'use server'

import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { requireAuth } from "@/lib/session";
import { saveUploadedFile } from "@/lib/uploads";

function formatGCalDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

const INCIDENT_STATUS_LABELS: Record<string, string> = {
    TODO: 'Reçu',
    IN_PROGRESS: 'En cours',
    DONE: 'Résolu',
};

// When a tenant-linked incident changes status, keep the tenant informed by
// posting a message in their portal conversation thread.
async function notifyTenantStatusChange(taskId: string, oldStatus: string | undefined, newStatus: string) {
    if (!oldStatus || oldStatus === newStatus) return;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task?.tenantId) return;
    const label = INCIDENT_STATUS_LABELS[newStatus] ?? newStatus;
    await prisma.message.create({
        data: {
            tenantId: task.tenantId,
            content: `🔧 Votre signalement « ${task.title} » est maintenant : ${label}.`,
            fromTenant: false,
        },
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: task.tenantId } });
    if (tenant?.portalToken) revalidatePath(`/portal/${tenant.portalToken}`);
}

async function sendScheduledAtEmail(task: { title: string; description?: string | null; scheduledAt: Date; tenantId: string; apartmentId: string }) {
    try {
        const [tenant, apartment] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: task.tenantId } }),
            prisma.apartment.findUnique({ where: { id: task.apartmentId } }),
        ]);
        if (!tenant?.email || !apartment) return;

        const start = formatGCalDate(task.scheduledAt);
        const end = formatGCalDate(new Date(task.scheduledAt.getTime() + 3600000));
        const location = `${apartment.address}, ${apartment.city}`;
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${start}/${end}&details=${encodeURIComponent(task.description || '')}&location=${encodeURIComponent(location)}`;
        const dateStr = task.scheduledAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        await sendEmail({
            to: tenant.email,
            subject: `Intervention planifiée : ${task.title}`,
            html: `
                <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 500px;">
                    <h2>Bonjour ${tenant.firstName},</h2>
                    <p>Une intervention a été planifiée dans votre logement au <strong>${location}</strong>.</p>
                    <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
                        <tr><td style="padding: 0.5rem; font-weight:600; width:120px;">Objet</td><td style="padding: 0.5rem;">${task.title}</td></tr>
                        <tr><td style="padding: 0.5rem; font-weight:600;">Date</td><td style="padding: 0.5rem;">${dateStr}</td></tr>
                        ${task.description ? `<tr><td style="padding: 0.5rem; font-weight:600;">Détail</td><td style="padding: 0.5rem;">${task.description}</td></tr>` : ''}
                    </table>
                    <p><a href="${gcalUrl}" style="display:inline-block; background:#2b8cee; color:#fff; padding:0.6rem 1.2rem; border-radius:6px; text-decoration:none; font-weight:600;">📅 Ajouter à Google Agenda</a></p>
                    <p style="color: #64748b; font-size: 0.9rem;"><em>Rentmaestro — Gestion Locative</em></p>
                </div>
            `,
        });
    } catch {
        // email failure is non-blocking
    }
}

export async function getTasksByApartmentId(apartmentId: string) {
    await requireAuth();
    try {
        const tasks = await prisma.task.findMany({
            where: { apartmentId },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, tasks };
    } catch (error) {
        console.error("Erreur getTasks:", error);
        return { success: false, error: "Erreur lors de la récupération des tâches" };
    }
}

export async function createTask(data: any) {
    await requireAuth();
    const { notifyTenant, ...taskData } = data;
    const parsed = taskSchema.safeParse(taskData);
    if (!parsed.success) {
        return { success: false, error: "Données invalides", issues: parsed.error.issues };
    }

    try {
        const task = await prisma.task.create({
            data: parsed.data as any,
            include: { notes: true, documents: true },
        });
        if (notifyTenant && parsed.data.scheduledAt && parsed.data.tenantId) {
            await sendScheduledAtEmail({
                title: parsed.data.title,
                description: parsed.data.description,
                scheduledAt: parsed.data.scheduledAt,
                tenantId: parsed.data.tenantId,
                apartmentId: parsed.data.apartmentId,
            });
        }
        // Auto-message in tenant thread when task linked to tenant
        if (parsed.data.tenantId) {
            await prisma.message.create({
                data: {
                    tenantId: parsed.data.tenantId,
                    content: `🔧 Intervention créée : « ${parsed.data.title} »${parsed.data.description ? `\n${parsed.data.description}` : ''}`,
                    fromTenant: false,
                },
            });
        }
        revalidatePath(`/apartments/${data.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur createTask:", error);
        return { success: false, error: "Impossible de créer la tâche" };
    }
}

export async function addTaskNote(taskId: string, content: string, authorType: 'LANDLORD' | 'TENANT') {
    await requireAuth();
    if (!content.trim()) return { success: false, error: 'Contenu requis' };
    try {
        const note = await prisma.taskNote.create({
            data: { taskId, content: content.trim(), authorType },
        });
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
            revalidatePath(`/apartments/${task.apartmentId}`);
            revalidatePath('/travaux');
        }
        return { success: true, note };
    } catch (error) {
        console.error("Erreur addTaskNote:", error);
        return { success: false, error: "Impossible d'ajouter la note" };
    }
}

export async function updateTaskNote(noteId: string, content: string) {
    await requireAuth();
    if (!content.trim()) return { success: false, error: 'Contenu requis' };
    try {
        const note = await prisma.taskNote.update({
            where: { id: noteId },
            data: { content: content.trim() },
        });
        const task = await prisma.task.findUnique({ where: { id: note.taskId } });
        if (task) {
            revalidatePath(`/apartments/${task.apartmentId}`);
            revalidatePath('/travaux');
        }
        return { success: true, note };
    } catch (error) {
        console.error("Erreur updateTaskNote:", error);
        return { success: false, error: "Impossible de modifier la note" };
    }
}

export async function updatePortalTaskNote(noteId: string, content: string, token: string) {
    if (!content.trim()) return { success: false, error: 'Contenu requis' };
    try {
        const existing = await prisma.taskNote.findUnique({
            where: { id: noteId },
            include: { task: { include: { tenant: { select: { portalToken: true } } } } },
        });
        if (!existing || existing.authorType !== 'TENANT' || existing.task.tenant?.portalToken !== token) {
            return { success: false, error: 'Non autorisé' };
        }
        const note = await prisma.taskNote.update({
            where: { id: noteId },
            data: { content: content.trim() },
        });
        return { success: true, note };
    } catch (error) {
        console.error("Erreur updatePortalTaskNote:", error);
        return { success: false, error: "Impossible de modifier la note" };
    }
}

export async function addPortalTaskNote(taskId: string, content: string, token: string) {
    if (!content.trim()) return { success: false, error: 'Contenu requis' };
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { tenant: { select: { portalToken: true } } },
        });
        if (!task || task.tenant?.portalToken !== token) {
            return { success: false, error: 'Non autorisé' };
        }
        const note = await prisma.taskNote.create({
            data: { taskId, content: content.trim(), authorType: 'TENANT' },
        });
        return { success: true, note };
    } catch (error) {
        console.error("Erreur addPortalTaskNote:", error);
        return { success: false, error: "Impossible d'ajouter la note" };
    }
}

export async function updateTask(taskId: string, data: {
    title: string;
    description?: string | null;
    cost?: number | null;
    status: string;
    scheduledAt?: Date | null;
    notifyTenant?: boolean;
}) {
    await requireAuth();
    if (!data.title?.trim()) {
        return { success: false, error: "Le titre est requis" };
    }
    try {
        const existing = await prisma.task.findUnique({ where: { id: taskId } });
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                title: data.title.trim(),
                description: data.description || null,
                cost: data.cost ?? null,
                status: data.status,
                scheduledAt: data.scheduledAt ?? null,
            } as any
        });
        // Send email if notifyTenant checked, or if scheduledAt was changed
        const scheduledAtChanged = data.scheduledAt && existing?.scheduledAt?.getTime() !== data.scheduledAt.getTime();
        if ((data.notifyTenant || scheduledAtChanged) && data.scheduledAt && task.tenantId) {
            await sendScheduledAtEmail({
                title: task.title,
                description: task.description,
                scheduledAt: data.scheduledAt,
                tenantId: task.tenantId,
                apartmentId: task.apartmentId,
            });
        }
        await notifyTenantStatusChange(taskId, existing?.status, data.status);
        revalidatePath(`/apartments/${task.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur updateTask:", error);
        return { success: false, error: "Impossible de modifier la tâche" };
    }
}

export async function updateTaskStatus(taskId: string, status: string) {
    await requireAuth();
    try {
        const existing = await prisma.task.findUnique({ where: { id: taskId } });
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { status }
        });
        await notifyTenantStatusChange(taskId, existing?.status, status);
        revalidatePath(`/apartments/${task.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur updateTaskStatus:", error);
        return { success: false, error: "Impossible de mettre à jour le statut" };
    }
}

export async function deleteTask(taskId: string) {
    await requireAuth();
    try {
        const task = await prisma.task.delete({
            where: { id: taskId }
        });
        revalidatePath(`/apartments/${task.apartmentId}`);
        return { success: true };
    } catch (error) {
        console.error("Erreur deleteTask:", error);
        return { success: false, error: "Impossible de supprimer la tâche" };
    }
}

export async function uploadTaskDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const taskId = formData.get("taskId") as string;
    if (!file || !taskId) return { success: false, error: "Fichier et tâche requis" };

    try {
        const { url, originalName } = await saveUploadedFile(file);
        const document = await prisma.taskDocument.create({
            data: { taskId, name: originalName, url, type: file.type, size: file.size },
        });
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
            revalidatePath(`/apartments/${task.apartmentId}`);
            revalidatePath('/travaux');
        }
        return { success: true, document };
    } catch (error) {
        console.error("Erreur uploadTaskDocument:", error);
        return { success: false, error: error instanceof Error ? error.message : "Impossible d'ajouter le document" };
    }
}

export async function deleteTaskDocument(documentId: string) {
    await requireAuth();
    try {
        const document = await prisma.taskDocument.delete({ where: { id: documentId } });
        const task = await prisma.task.findUnique({ where: { id: document.taskId } });
        if (task) {
            revalidatePath(`/apartments/${task.apartmentId}`);
            revalidatePath('/travaux');
        }
        return { success: true };
    } catch (error) {
        console.error("Erreur deleteTaskDocument:", error);
        return { success: false, error: "Impossible de supprimer le document" };
    }
}

export async function cycleTaskStatusForTravaux(taskId: string, currentStatus: string) {
    await requireAuth();
    const next = currentStatus === 'TODO' ? 'IN_PROGRESS' : currentStatus === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    const task = await prisma.task.update({ where: { id: taskId }, data: { status: next } });
    revalidatePath(`/apartments/${task.apartmentId}`);
    revalidatePath('/travaux');
}

export async function convertTaskToExpense(taskId: string) {
    await requireAuth();
    try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return { success: false, error: "Tâche introuvable" };
        if (!task.cost) return { success: false, error: "Impossible de convertir une tâche sans coût" };

        const expense = await prisma.expense.create({
            data: {
                apartmentId: task.apartmentId,
                category: "MAINTENANCE",
                description: `Intervention : ${task.title}`,
                amount: task.cost,
                date: new Date(),
                recurring: false
            }
        });

        revalidatePath(`/apartments/${task.apartmentId}`);
        revalidatePath(`/stats`);
        return { success: true, expense };
    } catch (error) {
        console.error("Erreur convertTaskToExpense:", error);
        return { success: false, error: "Impossible de convertir la tâche en dépense" };
    }
}
