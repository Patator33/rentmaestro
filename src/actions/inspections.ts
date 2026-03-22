'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function uploadInspection(formData: FormData) {
    const leaseId = formData.get('leaseId') as string;
    const apartmentId = formData.get('apartmentId') as string;
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const notes = formData.get('notes') as string;
    const file = formData.get('file') as File;

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filename = `edl-${Date.now()}-${file.name}`;
        await writeFile(path.join(uploadDir, filename), buffer);
        fileUrl = `/uploads/${filename}`;
        fileName = file.name;
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
