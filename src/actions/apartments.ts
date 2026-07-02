'use server'

import { apartmentSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAction } from "@/lib/audit";
import { requireAuth } from "@/lib/session";

export async function createApartment(formData: FormData) {
    await requireAuth();
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
        companyId: formData.get("companyId") as string || null,
        buildingId: formData.get("buildingId") as string || null,
        availableFrom: formData.get("availableFrom") ? new Date(formData.get("availableFrom") as string) : null,
        surface: formData.get("surface") ? parseFloat(formData.get("surface") as string) : null,
        dpe: formData.get("dpe") as string || null,
    };

    try {
        const validatedData = apartmentSchema.parse(rawData);
        const apt = await prisma.apartment.create({
            data: { ...validatedData, availableFrom: rawData.availableFrom, buildingId: rawData.buildingId },
        });
        await logAction({ action: 'CREATE_APARTMENT', entity: 'Apartment', entityId: apt.id, details: rawData.name || rawData.address });
    } catch (error) {
        console.error("Erreur lors de la création de l'appartement:", error);
        throw new Error("Impossible de créer l'appartement. Vérifiez les données saisies.");
    }

    revalidatePath("/", "layout");
    redirect("/apartments");
}

export async function deleteApartment(id: string) {
    await requireAuth();
    const leaseCount = await prisma.lease.count({ where: { apartmentId: id } });
    if (leaseCount > 0) {
        throw new Error("le bail associé doit d'abord être supprimé pour pouvoir supprimer l'appartement ou le locataire !");
    }
    try {
        await prisma.apartment.delete({
            where: { id },
        });
        await logAction({ action: 'DELETE_APARTMENT', entity: 'Apartment', entityId: id });
    } catch (error) {
        console.error("Erreur lors de la suppression de l'appartement:", error);
        throw new Error("Impossible de supprimer l'appartement.");
    }
    revalidatePath("/apartments");
}

export async function updateApartment(id: string, formData: FormData) {
    await requireAuth();
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
        defaultDeposit: formData.get("defaultDeposit") ? parseFloat(formData.get("defaultDeposit") as string) : null,
        companyId: formData.get("companyId") as string || null,
        buildingId: formData.get("buildingId") as string || null,
        availableFrom: formData.get("availableFrom") ? new Date(formData.get("availableFrom") as string) : null,
        soldAt: formData.get("soldAt") ? new Date(formData.get("soldAt") as string) : null,
        surface: formData.get("surface") ? parseFloat(formData.get("surface") as string) : null,
        dpe: formData.get("dpe") as string || null,
    };

    try {
        await prisma.apartment.update({
            where: { id },
            data: rawData,
        });
        await logAction({ action: 'UPDATE_APARTMENT', entity: 'Apartment', entityId: id, details: rawData.name || rawData.address });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'appartement:", error);
        throw new Error("Impossible de mettre à jour l'appartement.");
    }

    revalidatePath("/", "layout");
    redirect(`/apartments/${id}`);
}
