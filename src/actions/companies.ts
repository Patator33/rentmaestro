'use server'

import { companySchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCompany(formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        type: formData.get("type") as string,
        siret: formData.get("siret") as string || null,
        address: formData.get("address") as string || null,
    };

    try {
        const validatedData = companySchema.parse(rawData);
        await prisma.company.create({
            data: validatedData,
        });
    } catch (error) {
        console.error("Erreur lors de la création de la société:", error);
        throw new Error("Impossible de créer la société. Vérifiez les données saisies.");
    }

    revalidatePath("/companies");
    redirect("/companies");
}

export async function deleteCompany(id: string) {
    try {
        await prisma.company.delete({
            where: { id },
        });
    } catch (error) {
        console.error("Erreur lors de la suppression de la société:", error);
        throw new Error("Impossible de supprimer la société.");
    }
    revalidatePath("/companies");
}

export async function updateCompany(id: string, formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        type: formData.get("type") as string,
        siret: formData.get("siret") as string || null,
        address: formData.get("address") as string || null,
    };

    try {
        const validatedData = companySchema.parse(rawData);
        await prisma.company.update({
            where: { id },
            data: validatedData,
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la société:", error);
        throw new Error("Impossible de mettre à jour la société.");
    }

    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    redirect(`/companies/${id}`);
}
