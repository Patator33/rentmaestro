'use server'

import { tenantSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTenant(formData: FormData) {
    const rawData = {
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        coTenantFirstName: formData.get("coTenantFirstName") as string,
        coTenantLastName: formData.get("coTenantLastName") as string,
        coTenantEmail: formData.get("coTenantEmail") as string,
        coTenantPhone: formData.get("coTenantPhone") as string,
        paymentDay: formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : 5,
    };

    try {
        const validatedData = tenantSchema.parse(rawData);
        await prisma.tenant.create({
            data: validatedData,
        });
    } catch (error) {
        console.error("Erreur lors de la création du locataire:", error);
        throw new Error("Impossible de créer le locataire. Vérifiez les données saisies.");
    }

    revalidatePath("/tenants");
    redirect("/tenants");
}

export async function deleteTenant(id: string) {
    try {
        await prisma.tenant.delete({
            where: { id },
        });
    } catch (error) {
        console.error("Erreur lors de la suppression du locataire:", error);
        throw new Error("Impossible de supprimer le locataire. Il est peut-être encore lié à un bail actif.");
    }
    revalidatePath("/tenants");
}

export async function updateTenant(id: string, formData: FormData) {
    const rawData = {
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        coTenantFirstName: formData.get("coTenantFirstName") as string,
        coTenantLastName: formData.get("coTenantLastName") as string,
        coTenantEmail: formData.get("coTenantEmail") as string,
        coTenantPhone: formData.get("coTenantPhone") as string,
        paymentDay: formData.get("paymentDay") ? parseInt(formData.get("paymentDay") as string) : 5,
    };

    try {
        await prisma.tenant.update({
            where: { id },
            data: rawData,
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du locataire:", error);
        throw new Error("Impossible de mettre à jour le locataire.");
    }

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${id}`);
    redirect(`/tenants/${id}`);
}
