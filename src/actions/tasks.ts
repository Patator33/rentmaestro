'use server'

import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

function formatGCalDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    const { notifyTenant, ...taskData } = data;
    const parsed = taskSchema.safeParse(taskData);
    if (!parsed.success) {
        return { success: false, error: "Données invalides", issues: parsed.error.issues };
    }

    try {
        const task = await prisma.task.create({
            data: parsed.data as any
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
        revalidatePath(`/apartments/${data.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur createTask:", error);
        return { success: false, error: "Impossible de créer la tâche" };
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
        revalidatePath(`/apartments/${task.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur updateTask:", error);
        return { success: false, error: "Impossible de modifier la tâche" };
    }
}

export async function updateTaskStatus(taskId: string, status: string) {
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: { status }
        });
        revalidatePath(`/apartments/${task.apartmentId}`);
        return { success: true, task };
    } catch (error) {
        console.error("Erreur updateTaskStatus:", error);
        return { success: false, error: "Impossible de mettre à jour le statut" };
    }
}

export async function deleteTask(taskId: string) {
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

export async function cycleTaskStatusForTravaux(taskId: string, currentStatus: string) {
    const next = currentStatus === 'TODO' ? 'IN_PROGRESS' : currentStatus === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    const task = await prisma.task.update({ where: { id: taskId }, data: { status: next } });
    revalidatePath(`/apartments/${task.apartmentId}`);
    revalidatePath('/travaux');
}

export async function convertTaskToExpense(taskId: string) {
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
