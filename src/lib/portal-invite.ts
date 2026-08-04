export const DEFAULT_PORTAL_INVITE_SUBJECT = 'Accès à votre espace locataire — RentMaestro';

export const DEFAULT_PORTAL_INVITE_BODY = `Bonjour {{prenom_locataire}},

Céline et Nicolas vous invitent à accéder à votre espace locataire RentMaestro.

Vous y trouverez votre historique de paiements et vos quittances, la messagerie avec votre propriétaire, et le signalement d'incidents techniques.

🌐 Accès web
{{lien_portail}}

📱 Application mobile Android
{{lien_application}}

Après installation, entrez ce code d'accès lors du premier lancement :
{{code_acces}}

Ne partagez pas ce code avec d'autres personnes.

Cordialement,
Céline et Nicolas`;

/** Le corps est saisi par l'utilisateur : neutraliser le HTML avant insertion. */
export function escapeHtml(s: string): string {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
