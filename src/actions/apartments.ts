'use server'

import { apartmentSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createApartment(formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        address: formData.get("address") as string,
        complement: formData.get("complement") as string,
        city: formData.get("city") as string,
        zipCode: formData.get("zipCode") as string,
        rent: parseFloat(formData.get("rent") as string),
        charges: parseFloat(formData.get("charges") as string),
        description: formData.get("description") as string,
        comment: formData.get("comment") as string,
        mortgageAmount: formData.get("mortgageAmount") ? parseFloat(formData.get("mortgageAmount") as string) : null,
        insuranceAmount: formData.get("insuranceAmount") ? parseFloat(formData.get("insuranceAmount") as string) : null,
        taxAmount: formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : null,
    };

    try {
        const validatedData = apartmentSchema.parse(rawData);
        await prisma.apartment.create({
            data: validatedData,
        });
    } catch (error) {
        console.error("Erreur lors de la création de l'appartement:", error);
        throw new Error("Impossible de créer l'appartement. Vérifiez les données saisies.");
    }

    revalidatePath("/apartments");
    redirect("/apartments");
}

export async function deleteApartment(id: string) {
    try {
        await prisma.apartment.delete({
            where: { id },
        });
    } catch (error) {
        console.error("Erreur lors de la suppression de l'appartement:", error);
        throw new Error("Impossible de supprimer l'appartement. Il est peut-être encore lié à un bail actif.");
    }
    revalidatePath("/apartments");
}

export async function updateApartment(id: string, formData: FormData) {
    const rawData = {
        name: formData.get("name") as string,
        address: formData.get("address") as string,
        complement: formData.get("complement") as string,
        city: formData.get("city") as string,
        zipCode: formData.get("zipCode") as string,
        rent: parseFloat(formData.get("rent") as string),
        charges: parseFloat(formData.get("charges") as string),
        description: formData.get("description") as string,
        comment: formData.get("comment") as string,
        mortgageAmount: formData.get("mortgageAmount") ? parseFloat(formData.get("mortgageAmount") as string) : null,
        insuranceAmount: formData.get("insuranceAmount") ? parseFloat(formData.get("insuranceAmount") as string) : null,
        taxAmount: formData.get("taxAmount") ? parseFloat(formData.get("taxAmount") as string) : null,
    };

    try {
        await prisma.apartment.update({
            where: { id },
            data: rawData,
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'appartement:", error);
        throw new Error("Impossible de mettre à jour l'appartement.");
    }

    revalidatePath("/apartments");
    revalidatePath(`/apartments/${id}`);
    redirect(`/apartments/${id}`);
}
