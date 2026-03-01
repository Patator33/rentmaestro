import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createContact(formData: FormData) {
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const comment = formData.get("comment") as string;
    const apartmentId = formData.get("apartmentId") as string;

    await prisma.contact.create({
        data: {
            name,
            role,
            email: email || null,
            phone: phone || null,
            address: address || null,
            comment: comment || null,
            apartmentId: apartmentId || null,
        },
    });

    revalidatePath("/contacts");
    revalidatePath("/apartments");
}

export async function deleteContact(id: string) {
    await prisma.contact.delete({
        where: { id },
    });
    revalidatePath("/contacts");
}
