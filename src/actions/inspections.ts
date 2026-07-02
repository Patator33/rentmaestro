'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/session';
import { saveUploadedFile } from '@/lib/uploads';

export async function uploadInspection(formData: FormData) {
    await requireAuth();
    const leaseId = formData.get('leaseId') as string;
    const apartmentId = formData.get('apartmentId') as string;
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const notes = formData.get('notes') as string;
    const file = formData.get('file') as File;

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file && file.size > 0) {
        const saved = await saveUploadedFile(file);
        fileUrl = saved.url;
        fileName = saved.originalName;
    }

    const inspection = await prisma.inspection.create({
        data: {
            leaseId,
            type,
            date: new Date(date),
            rooms: '[]',
            notes: notes || null,
            fileUrl,
            fileName,
        },
    });

    revalidatePath(`/apartments/${apartmentId}`);
    return { success: true, inspection };
}

export async function getInspectionsByLease(leaseId: string) {
    await requireAuth();
    return prisma.inspection.findMany({
        where: { leaseId },
        orderBy: { date: 'desc' },
    });
}

export async function deleteInspection(id: string, apartmentId: string) {
    await requireAuth();
    await prisma.inspection.delete({ where: { id } });
    revalidatePath(`/apartments/${apartmentId}`);
    return { success: true };
}
