import { getSetting, getTelegramTokenHint } from '@/actions/settings';
import { cookies } from 'next/headers';
import { THEME_COOKIE, DEFAULT_THEME, type ThemeId } from '@/themes/index';
import ParametresForm from './ParametresForm';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { EVENT_LABELS, DEFAULT_TELEGRAM_TEMPLATES } from '@/lib/n8n';
import { DEFAULT_IRL_INDICES, type IrlIndex } from '@/lib/irl';

export const dynamic = 'force-dynamic';

const DEFAULT_IRL_LETTER_SUBJECT = 'Révision annuelle de votre loyer — {{adresse_bien}}';
const DEFAULT_IRL_LETTER_BODY = `Bonjour {{prenom_locataire}},

Conformément à votre bail et à l'indice de référence des loyers (IRL) publié par l'INSEE, nous procédons à la révision annuelle de votre loyer.

- IRL de référence ({{trimestre_ancien}}) : {{irl_ancien}}
- Nouvel IRL ({{trimestre_nouveau}}) : {{irl_nouveau}}
- Ancien loyer hors charges : {{ancien_loyer}} €
- Nouveau loyer hors charges : {{nouveau_loyer}} € (variation de {{augmentation}} €)

À compter de {{date_effet}}, votre loyer charges comprises sera de {{loyer_cc}} €.

Nous restons à votre disposition pour toute question.

Cordialement,
Céline et Nicolas`;

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
    const session = await getSession();
    if (!session.userId) redirect('/login');
    const user = await getUserById(session.userId);
    if (!user) redirect('/login');

    const [subject, body, haWebhook, telegramEnabled, telegramEvents, dbTheme, store, passkeyCount, telegramTemplateRows, irlIndicesRaw, irlSubject, irlBody, telegramChatId, telegramThreadId, telegramParseMode, telegramSilent, telegramToken] = await Promise.all([
        getSetting('welcome_email_subject').then(v => v ?? DEFAULT_SUBJECT),
        getSetting('welcome_email_body').then(v => v ?? DEFAULT_BODY),
        getSetting('ha_webhook_url').then(v => v ?? ''),
        getSetting('telegram_enabled').then(v => v === 'true'),
        getSetting('telegram_events').then(v => v ? JSON.parse(v) as string[] : null),
        getSetting('theme'),
        cookies(),
        prisma.passkey.count({ where: { userId: session.userId } }),
        Promise.all(Object.keys(EVENT_LABELS).map(async ev => [ev, (await getSetting(`telegram_template_${ev}`)) ?? DEFAULT_TELEGRAM_TEMPLATES[ev] ?? ''] as [string, string])),
        getSetting('irl_indices'),
        getSetting('irl_letter_subject').then(v => v ?? DEFAULT_IRL_LETTER_SUBJECT),
        getSetting('irl_letter_body').then(v => v ?? DEFAULT_IRL_LETTER_BODY),
        getSetting('telegram_chat_id').then(v => v ?? process.env.TELEGRAM_CHAT_ID ?? ''),
        getSetting('telegram_thread_id').then(v => v ?? ''),
        getSetting('telegram_parse_mode').then(v => v ?? 'Markdown'),
        getSetting('telegram_silent').then(v => v === 'true'),
        getTelegramTokenHint(),
    ]);
    const currentTheme = (dbTheme ?? store.get(THEME_COOKIE)?.value ?? DEFAULT_THEME) as ThemeId;
    const telegramTemplates = Object.fromEntries(telegramTemplateRows) as Record<string, string>;
    let irlIndices: IrlIndex[];
    try { irlIndices = irlIndicesRaw ? JSON.parse(irlIndicesRaw) : DEFAULT_IRL_INDICES; }
    catch { irlIndices = DEFAULT_IRL_INDICES; }
    return (
        <ParametresForm
            defaultSubject={subject}
            defaultBody={body}
            defaultHaWebhook={haWebhook}
            currentTheme={currentTheme}
            defaultTelegramEnabled={telegramEnabled}
            defaultTelegramEvents={telegramEvents}
            defaultTelegramTemplates={telegramTemplates}
            defaultTelegramChatId={telegramChatId}
            defaultTelegramThreadId={telegramThreadId}
            defaultTelegramParseMode={telegramParseMode}
            defaultTelegramSilent={telegramSilent}
            telegramTokenConfigured={telegramToken.configured}
            telegramTokenHint={telegramToken.hint}
            defaultIrlIndices={irlIndices}
            defaultIrlSubject={irlSubject}
            defaultIrlBody={irlBody}
            userEmail={user.email}
            userId={session.userId}
            totpEnabled={user.totpEnabled}
            passkeyCount={passkeyCount}
        />
    );
}
