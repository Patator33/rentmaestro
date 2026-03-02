'use client';

import { usePathname } from 'next/navigation';
import NavBar from './NavBar';

export default function NavBarWrapper() {
    const pathname = usePathname();
    if (pathname.startsWith('/portal') || pathname.startsWith('/login') || pathname === '/setup') return null;
    return <NavBar />;
}
