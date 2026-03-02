import { redirect } from 'next/navigation';
import { hasUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    // If no user exists yet, redirect to initial setup
    if (!(await hasUser())) {
        redirect('/setup');
    }

    return <LoginForm />;
}
