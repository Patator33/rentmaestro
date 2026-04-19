'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import path from "path";

export async function uploadDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;

    if (!file || !tenantId) {
        throw new Error("File and tenant ID are required");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Save to database
    await prisma.tenantDocument.create({
        data: {
            name: file.name,
            url: `/uploads/${filename}`,
            type: file.type,
            size: file.size,
            tenantId,
        },
    });

    revalidatePath(`/tenants/${tenantId}`);
}

export async function deleteDocument(id: string, tenantId: string) {
    await prisma.tenantDocument.delete({
        where: { id },
    });
    revalidatePath(`/tenants/${tenantId}`);
}

export async function uploadApartmentDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const apartmentId = formData.get("apartmentId") as string;

    if (!file || !apartmentId) {
        throw new Error("File and apartment ID are required");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Save to database
    await prisma.apartmentDocument.create({
        data: {
            name: file.name,
            url: `/uploads/${filename}`,
            type: file.type,
            size: file.size,
            apartmentId,
        },
    });

    revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteApartmentDocument(id: string, apartmentId: string) {
    await prisma.apartmentDocument.delete({
        where: { id },
    });
    revalidatePath(`/apartments/${apartmentId}`);
}

export async function uploadLeaseDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const leaseId = formData.get("leaseId") as string;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file || !leaseId) throw new Error("File and lease ID are required");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    await prisma.leaseDocument.create({
        data: {
            name: file.name,
            url: `/uploads/${filename}`,
            type: file.type,
            docType,
            size: file.size,
            leaseId,
        },
    });

    revalidatePath(`/leases/${leaseId}`);
}

export async function deleteLeaseDocument(id: string, leaseId: string) {
    await prisma.leaseDocument.delete({ where: { id } });
    revalidatePath(`/leases/${leaseId}`);
}

export async function uploadCompanyDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const companyId = formData.get("companyId") as string;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file || !companyId) throw new Error("File and company ID are required");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    await prisma.companyDocument.create({
        data: {
            name: file.name,
            url: `/uploads/${filename}`,
            type: file.type,
            docType,
            size: file.size,
            companyId,
        },
    });

    revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyDocument(id: string, companyId: string) {
    await prisma.companyDocument.delete({ where: { id } });
    revalidatePath(`/companies/${companyId}`);
}

export async function uploadGlobalDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const docType = (formData.get("docType") as string) || "AUTRE";

    if (!file) throw new Error("File is required");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    await prisma.globalDocument.create({
        data: {
            name: file.name,
            url: `/uploads/${filename}`,
            type: file.type,
            docType,
            size: file.size,
        },
    });

    revalidatePath("/global-ged");
}

export async function deleteGlobalDocument(id: string) {
    await prisma.globalDocument.delete({ where: { id } });
    revalidatePath("/global-ged");
}

export async function ensurePersonalCompany() {
    const existing = await prisma.company.findFirst({ where: { isPersonal: true } });
    if (!existing) {
        await prisma.company.create({
            data: { name: 'Bien en nom propre', type: 'NOM_PROPRE', isPersonal: true },
        });
    }
    revalidatePath('/companies');
}
