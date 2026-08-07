'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logAction } from '@/lib/audit';
import { requireAuth } from '@/lib/session';
import { BUILDING_EXPENSE_FIELDS, BUILDING_FIXED_COST_FIELDS } from '@/lib/building-expenses';

function readNumberFields(formData: FormData, fields: ReadonlyArray<{ key: string }>) {
    const out: Record<string, number> = {};
    for (const f of fields) {
        const raw = formData.get(f.key) as string;
        const n = parseFloat(raw);
        out[f.key] = isNaN(n) ? 0 : n;
    }
    return out;
}

function readBuildingCostFields(formData: FormData) {
    return { ...readNumberFields(formData, BUILDING_EXPENSE_FIELDS), ...readNumberFields(formData, BUILDING_FIXED_COST_FIELDS) };
}

export async function createBuilding(formData: FormData) {
    await requireAuth();
    const name = (formData.get('name') as string).trim();
    const address = (formData.get('address') as string).trim();
    const complement = (formData.get('complement') as string)?.trim() || null;
    const zipCode = (formData.get('zipCode') as string)?.trim() || null;
    const city = (formData.get('city') as string)?.trim() || null;
    const companyId = (formData.get('companyId') as string) || null;
    const b = await prisma.building.create({ data: { name, address, complement, zipCode, city, companyId, ...readBuildingCostFields(formData) } });
    await logAction({ action: 'CREATE_BUILDING', entity: 'Building', entityId: b.id, details: `${name} — ${address}` });
    revalidatePath('/buildings');
    revalidatePath('/apartments');
    redirect('/buildings');
}

export async function createBuildingQuick(formData: FormData): Promise<{ id: string; name: string; address: string; complement: string | null; zipCode: string | null; city: string | null }> {
    await requireAuth();
    const name = (formData.get('name') as string).trim();
    const address = (formData.get('address') as string).trim();
    const complement = (formData.get('complement') as string)?.trim() || null;
    const zipCode = (formData.get('zipCode') as string)?.trim() || null;
    const city = (formData.get('city') as string)?.trim() || null;
    const companyId = (formData.get('companyId') as string) || null;
    const building = await prisma.building.create({ data: { name, address, complement, zipCode, city, companyId } });
    revalidatePath('/buildings');
    revalidatePath('/apartments');
    return { id: building.id, name: building.name, address: building.address, complement: building.complement, zipCode: building.zipCode, city: building.city };
}

export async function updateBuilding(id: string, formData: FormData) {
    await requireAuth();
    const name = (formData.get('name') as string).trim();
    const address = (formData.get('address') as string).trim();
    const complement = (formData.get('complement') as string)?.trim() || null;
    const zipCode = (formData.get('zipCode') as string)?.trim() || null;
    const city = (formData.get('city') as string)?.trim() || null;
    const companyId = (formData.get('companyId') as string) || null;
    await prisma.building.update({ where: { id }, data: { name, address, complement, zipCode, city, companyId, ...readBuildingCostFields(formData) } });
    await logAction({ action: 'UPDATE_BUILDING', entity: 'Building', entityId: id, details: `${name} — ${address}` });
    revalidatePath('/buildings');
    revalidatePath('/apartments');
    redirect('/buildings');
}

export async function deleteBuilding(id: string) {
    await requireAuth();
    await prisma.building.delete({ where: { id } });
    await logAction({ action: 'DELETE_BUILDING', entity: 'Building', entityId: id });
    revalidatePath('/buildings');
    revalidatePath('/apartments');
}
