import { z } from "zod";

const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
const zipCodeRegex = /^\d{5}$/;

export const tenantSchema = z.object({
    firstName: z.string().min(1, "Le prénom est requis"),
    lastName: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().regex(phoneRegex, "Format de téléphone invalide (ex: 06 12 34 56 78)").optional().or(z.literal("")),
    paymentDay: z.number().min(1).max(31).default(5),
    // Co-tenant fields
    coTenantFirstName: z.string().optional(),
    coTenantLastName: z.string().optional(),
    coTenantEmail: z.string().email("Email du colocataire invalide").optional().or(z.literal("")),
    coTenantPhone: z.string().regex(phoneRegex, "Format de téléphone du colocataire invalide").optional().or(z.literal("")),
});

export const apartmentSchema = z.object({
    name: z.string().optional(),
    address: z.string().min(1, "L'adresse est requise"),
    complement: z.string().optional(),
    city: z.string().min(1, "La ville est requise"),
    zipCode: z.string().regex(zipCodeRegex, "Le code postal doit contenir 5 chiffres"),
    rent: z.number().min(0, "Le loyer doit être positif"),
    charges: z.number().min(0, "Les charges doivent être positives"),
    description: z.string().optional(),
    comment: z.string().optional(),
    mortgageAmount: z.number().min(0, "La mensualité de crédit doit être positive").optional().nullable(),
    insuranceAmount: z.number().min(0, "L'assurance doit être positive").optional().nullable(),
    taxAmount: z.number().min(0, "Les impôts doivent être positifs").optional().nullable(),
});

export const taskSchema = z.object({
    apartmentId: z.string().min(1, "L'appartement est requis"),
    title: z.string().min(1, "Le titre est requis"),
    description: z.string().optional().nullable(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
    cost: z.number().min(0, "Le coût doit être positif").optional().nullable(),
    dueDate: z.date().optional().nullable(),
});
