'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTenant(formData: FormData) {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const coTenantFirstName = formData.get("coTenantFirstName") as string;
    const coTenantLastName = formData.get("coTenantLastName") as string;
    const coTenantEmail = formData.get("coTenantEmail") as string;
    const coTenantPhone = formData.get("coTenantPhone") as string;

    await prisma.tenant.create({
        data: {
            firstName,
            lastName,
            email,
            phone,
            coTenantFirstName,
            coTenantLastName,
            coTenantEmail,
            coTenantPhone,
        },
    });

    revalidatePath("/tenants");
    redirect("/tenants");
}

export async function deleteTenant(id: string) {
    try {
        await prisma.tenant.delete({
            where: { id },
        });
        revalidatePath("/tenants");
    } catch (error) {
        console.error("Failed to delete tenant:", error);
        // Could handle error feedback
    }
}
