import { getSetting } from '@/actions/settings';
import { cookies } from 'next/headers';
import { THEME_COOKIE, DEFAULT_THEME, type ThemeId } from '@/themes/index';
import ParametresForm from './ParametresForm';

export const dynamic = 'force-dynamic';

const DEFAULT_SUBJECT = 'Bienvenue dans votre nouveau logement — {{adresse_bien}}';
const DEFAULT_BODY = `Bonjour {{prenom_locataire}},

Nous avons le plaisir de vous accueillir dans votre nouveau logement situé au {{adresse_bien}}.

Voici un récapitulatif de votre contrat :
- Loyer hors charges : {{loyer_hc}} €
- Charges : {{charges}} €
- Loyer charges comprises : {{loyer_cc}} €
- Dépôt de garantie : {{caution}} €
- Date d'entrée : {{date_debut}}

N'hésitez pas à nous contacter pour toute question.

Cordialement,
Céline et Nicolas`;

export default async function ParametresPage() {
    const [subject, body, haWebhook, dbTheme, store] = await Promise.all([
        getSetting('welcome_email_subject').then(v => v ?? DEFAULT_SUBJECT),
        getSetting('welcome_email_body').then(v => v ?? DEFAULT_BODY),
        getSetting('ha_webhook_url').then(v => v ?? ''),
        getSetting('theme'),
        cookies(),
    ]);
    const currentTheme = (dbTheme ?? store.get(THEME_COOKIE)?.value ?? DEFAULT_THEME) as ThemeId;
    return <ParametresForm defaultSubject={subject} defaultBody={body} defaultHaWebhook={haWebhook} currentTheme={currentTheme} />;
}
