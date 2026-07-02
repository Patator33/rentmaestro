'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";
import { saveUploadedFile } from "@/lib/uploads";

export async function uploadDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;

    if (!file || !tenantId) {
        throw new Error("File and tenant ID are required");
    }

    const { url, originalName } = await saveUploadedFile(file);

    await prisma.tenantDocument.create({
        data: {
            name: originalName,
            url,
            type: file.type,
            size: file.size,
            tenantId,
        },
    });

    revalidatePath(`/tenants/${tenantId}`);
}

export async function deleteDocument(id: string, tenantId: string) {
    await requireAuth();
    await prisma.tenantDocument.delete({
        where: { id },
    });
    revalidatePath(`/tenants/${tenantId}`);
}

export async function uploadApartmentDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const apartmentId = formData.get("apartmentId") as string;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file || !apartmentId) {
        throw new Error("File and apartment ID are required");
    }

    const { url, originalName } = await saveUploadedFile(file);

    await prisma.apartmentDocument.create({
        data: {
            name: originalName,
            url,
            type: file.type,
            docType,
            size: file.size,
            apartmentId,
        },
    });

    revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteApartmentDocument(id: string, apartmentId: string) {
    await requireAuth();
    await prisma.apartmentDocument.delete({
        where: { id },
    });
    revalidatePath(`/apartments/${apartmentId}`);
}

export async function uploadLeaseDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const leaseId = formData.get("leaseId") as string;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file || !leaseId) throw new Error("File and lease ID are required");

    const { url, originalName } = await saveUploadedFile(file);

    await prisma.leaseDocument.create({
        data: {
            name: originalName,
            url,
            type: file.type,
            docType,
            size: file.size,
            leaseId,
        },
    });

    revalidatePath(`/leases/${leaseId}`);
}

export async function deleteLeaseDocument(id: string, leaseId: string) {
    await requireAuth();
    await prisma.leaseDocument.delete({ where: { id } });
    revalidatePath(`/leases/${leaseId}`);
}

export async function uploadCompanyDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file || !companyId) throw new Error("File and company ID are required");

    const { url, originalName } = await saveUploadedFile(file);

    await prisma.companyDocument.create({
        data: {
            name: originalName,
            url,
            type: file.type,
            docType,
            size: file.size,
            companyId,
        },
    });

    revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyDocument(id: string, companyId: string) {
    await requireAuth();
    await prisma.companyDocument.delete({ where: { id } });
    revalidatePath(`/companies/${companyId}`);
}

export async function uploadGlobalDocument(formData: FormData) {
    await requireAuth();
    const file = formData.get("file") as File;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file) throw new Error("File is required");

    const { url, originalName } = await saveUploadedFile(file);

    await prisma.globalDocument.create({
        data: {
            name: originalName,
            url,
            type: file.type,
            docType,
            size: file.size,
        },
    });

    revalidatePath("/global-ged");
}

export async function deleteGlobalDocument(id: string) {
    await requireAuth();
    await prisma.globalDocument.delete({ where: { id } });
    revalidatePath("/global-ged");
}

export async function ensurePersonalCompany() {
    await requireAuth();
    const existing = await prisma.company.findFirst({ where: { isPersonal: true } });
    if (!existing) {
        await prisma.company.create({
            data: { name: 'Bien en nom propre', type: 'NOM_PROPRE', isPersonal: true },
        });
    }
    revalidatePath('/companies');
}
