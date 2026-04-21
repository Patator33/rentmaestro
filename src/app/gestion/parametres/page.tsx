import { getSetting } from '@/actions/settings';
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
    const subject = await getSetting('welcome_email_subject') ?? DEFAULT_SUBJECT;
    const body = await getSetting('welcome_email_body') ?? DEFAULT_BODY;
    return <ParametresForm defaultSubject={subject} defaultBody={body} />;
}
