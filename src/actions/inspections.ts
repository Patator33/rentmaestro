'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface RoomEntry {
    name: string;
    condition: 'BON' | 'MOYEN' | 'MAUVAIS';
    notes: string;
}

export async function createInspection(data: {
    leaseId: string;
    apartmentId: string;
    type: 'ENTRY' | 'EXIT';
    date: string;
    rooms: RoomEntry[];
    notes?: string;
}) {
    const inspection = await prisma.inspection.create({
        data: {
            leaseId: data.leaseId,
            type: data.type,
            date: new Date(data.date),
            rooms: JSON.stringify(data.rooms),
            notes: data.notes || null,
        },
    });
    revalidatePath(`/apartments/${data.apartmentId}`);
    return { success: true, inspection };
}

export async function getInspectionsByLease(leaseId: string) {
    return prisma.inspection.findMany({
        where: { leaseId },
        orderBy: { date: 'desc' },
    });
}

export async function deleteInspection(id: string, apartmentId: string) {
    await prisma.inspection.delete({ where: { id } });
    revalidatePath(`/apartments/${apartmentId}`);
    return { success: true };
}
