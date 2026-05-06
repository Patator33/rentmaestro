'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSetting(key: string): Promise<string | null> {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    revalidatePath('/gestion/parametres');
}
