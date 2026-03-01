'use server'

import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

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
    const parsed = taskSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: "Données invalides", issues: parsed.error.issues };
    }

    try {
        const task = await prisma.task.create({
            data: parsed.data
        });
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
}) {
    if (!data.title?.trim()) {
        return { success: false, error: "Le titre est requis" };
    }
    try {
        const task = await prisma.task.update({
            where: { id: taskId },
            data: {
                title: data.title.trim(),
                description: data.description || null,
                cost: data.cost ?? null,
                status: data.status,
            }
        });
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
