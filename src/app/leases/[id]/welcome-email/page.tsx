import { notFound, redirect } from 'next/navigation';
import WelcomeEmailForm from './WelcomeEmailForm';
import { buildWelcomeEmail } from '@/lib/welcome-email';

export const dynamic = 'force-dynamic';

export default async function WelcomeEmailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const email = await buildWelcomeEmail(id);
    if (!email) notFound();
    if (!email.hasEmail) redirect(`/leases/${id}`);

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>📧 Email de bienvenue</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Vérifiez et modifiez le contenu avant envoi.
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <WelcomeEmailForm
                    leaseId={id}
                    defaultSubject={email.subject}
                    defaultBody={email.body}
                    recipients={email.recipients}
                />
            </div>
        </div>
    );
}
