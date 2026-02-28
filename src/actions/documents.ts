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
    const filename = `${Date.now()}-${file.name}`;
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
    const filename = `${Date.now()}-${file.name}`;
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
