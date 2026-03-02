import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUser } from '@/lib/auth';
import TotpSetup from '@/components/TotpSetup';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SecuritySettingsPage() {
    const session = await getSession();
    if (!session.userId) redirect('/login');

    const user = await getUser();
    if (!user) redirect('/login');

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>← Tableau de bord</Link>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>🔐 Sécurité</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Gérez l'authentification de votre compte <strong>{user.email}</strong>
            </p>

            <TotpSetup totpEnabled={user.totpEnabled} />
        </div>
    );
}
