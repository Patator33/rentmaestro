import { prisma } from './prisma';
import { getSession } from './session';

export async function logAction(params: {
    action: string;
    entity?: string;
    entityId?: string;
    details?: string;
    ip?: string;
    userEmail?: string;
}) {
    try {
        let userEmail = params.userEmail;
        if (!userEmail) {
            const session = await getSession();
            userEmail = session.email ?? undefined;
        }
        await prisma.auditLog.create({
            data: {
                userEmail,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                details: params.details,
                ip: params.ip,
            },
        });
    } catch {
        // fail silently — never break business logic
    }
}

export const ACTION_LABELS: Record<string, string> = {
    LOGIN_SUCCESS: '✅ Connexion',
    LOGIN_FAILED: '❌ Connexion échouée',
    LOGOUT: '🚪 Déconnexion',
    CREATE_TENANT: '➕ Locataire créé',
    UPDATE_TENANT: '✏️ Locataire modifié',
    DELETE_TENANT: '🗑️ Locataire supprimé',
    ARCHIVE_TENANT: '📦 Locataire archivé',
    REACTIVATE_TENANT: '♻️ Locataire réactivé',
    CREATE_LEASE: '➕ Bail créé',
    UPDATE_LEASE: '✏️ Bail modifié',
    DELETE_LEASE: '🗑️ Bail supprimé',
    TERMINATE_LEASE: '🔚 Bail résilié',
    CREATE_APARTMENT: '➕ Bien créé',
    UPDATE_APARTMENT: '✏️ Bien modifié',
    DELETE_APARTMENT: '🗑️ Bien supprimé',
    CREATE_BUILDING: '➕ Immeuble créé',
    UPDATE_BUILDING: '✏️ Immeuble modifié',
    DELETE_BUILDING: '🗑️ Immeuble supprimé',
    CREATE_COMPANY: '➕ Société créée',
    UPDATE_COMPANY: '✏️ Société modifiée',
    DELETE_COMPANY: '🗑️ Société supprimée',
    MARK_RENT_PAID: '💰 Loyer encaissé',
    CANCEL_RENT_PAYMENT: '↩️ Paiement annulé',
    SEND_RENT_REMINDER: '📧 Relance envoyée',
    GENERATE_PORTAL_TOKEN: '🔑 Token portail généré',
    SEND_PORTAL_INVITE: '📨 Invitation portail envoyée',
};
