'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createApartment(formData: FormData) {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const complement = formData.get("complement") as string;
    const city = formData.get("city") as string;
    const zipCode = formData.get("zipCode") as string;
    const rent = parseFloat(formData.get("rent") as string);
    const charges = parseFloat(formData.get("charges") as string);
    const description = formData.get("description") as string;
    const comment = formData.get("comment") as string;

    await prisma.apartment.create({
        data: {
            name,
            address,
            complement,
            city,
            zipCode,
            rent,
            charges,
            description,
            comment,
        },
    });

    revalidatePath("/apartments");
    redirect("/apartments");
}

export async function deleteApartment(id: string) {
    await prisma.apartment.delete({
        where: { id },
    });
    revalidatePath("/apartments");
}

export async function updateApartment(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const complement = formData.get("complement") as string;
    const city = formData.get("city") as string;
    const zipCode = formData.get("zipCode") as string;
    const rent = parseFloat(formData.get("rent") as string);
    const charges = parseFloat(formData.get("charges") as string);
    const description = formData.get("description") as string;
    const comment = formData.get("comment") as string;

    await prisma.apartment.update({
        where: { id },
        data: {
            name,
            address,
            complement,
            city,
            zipCode,
            rent,
            charges,
            description,
            comment,
        },
    });

    revalidatePath("/apartments");
    revalidatePath(`/apartments/${id}`);
    redirect(`/apartments/${id}`);
}
