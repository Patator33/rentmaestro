import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Les locataires n'ont pas de session propriétaire : un lien direct vers
 * /uploads/... se fait rediriger vers /login par le middleware. Il faut
 * passer par /api/portal/[token]/file, qui authentifie via le token portail
 * et vérifie que le document appartient bien à ce locataire.
 */
export async function ensurePortalToken(tenantId: string, existingToken: string | null): Promise<string> {
    if (existingToken) return existingToken;
    const token = crypto.randomUUID();
    await prisma.tenant.update({ where: { id: tenantId }, data: { portalToken: token } });
    return token;
}

export function buildPortalFileLink(baseUrl: string, portalToken: string, docUrl: string): string {
    return `${baseUrl}/api/portal/${portalToken}/file?u=${encodeURIComponent(docUrl)}`;
}
