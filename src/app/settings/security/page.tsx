import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/auth';
import TotpSetup from '@/components/TotpSetup';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import UserManagement from '@/components/UserManagement';
import BackupRestore from '@/components/BackupRestore';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SecuritySettingsPage() {
    const session = await getSession();
    if (!session.userId) redirect('/login');

    const user = await getUserById(session.userId);
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
            <PushNotificationToggle />

            <UserManagement currentUserId={user.id} />

            <BackupRestore />

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <h2 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', fontSize: '1rem' }}>📋 Journal d'activité</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Historique horodaté de toutes les connexions et actions effectuées sur le compte. Conservé 1 an.
                </p>
                <Link href="/settings/logs" style={{
                    display: 'inline-block', padding: '0.55rem 1.2rem',
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                    borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.9rem',
                }}>
                    Consulter les logs →
                </Link>
            </div>
        </div>
    );
}
