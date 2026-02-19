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

    // Validate with Zod
    const validatedData = tenantSchema.parse(rawData);

    await prisma.tenant.create({
        data: validatedData,
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

export async function updateTenant(id: string, formData: FormData) {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const coTenantFirstName = formData.get("coTenantFirstName") as string;
    const coTenantLastName = formData.get("coTenantLastName") as string;
    const coTenantEmail = formData.get("coTenantEmail") as string;
    const coTenantPhone = formData.get("coTenantPhone") as string;
    const paymentDayStr = formData.get("paymentDay") as string;
    const paymentDay = paymentDayStr ? parseInt(paymentDayStr) : 5;

    await prisma.tenant.update({
        where: { id },
        data: {
            firstName,
            lastName,
            email,
            phone,
            coTenantFirstName,
            coTenantLastName,
            coTenantEmail,
            coTenantPhone,
            paymentDay,
        },
    });

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${id}`);
    redirect(`/tenants/${id}`);
}
