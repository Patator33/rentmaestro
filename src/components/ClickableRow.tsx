'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

export default function ClickableRow({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) {
    const router = useRouter();
    return (
        <tr
            onClick={e => {
                if ((e.target as HTMLElement).closest('a, button, [role="button"]')) return;
                router.push(href);
            }}
            style={{ cursor: 'pointer', ...style }}
        >
            {children}
        </tr>
    );
}
