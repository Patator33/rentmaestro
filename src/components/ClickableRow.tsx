'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

type Props = { href: string; children: React.ReactNode; style?: React.CSSProperties; className?: string };

const handler = (router: ReturnType<typeof useRouter>, href: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button, [role="button"]')) return;
    router.push(href);
};

export default function ClickableRow({ href, children, style }: Props) {
    const router = useRouter();
    return (
        <tr onClick={handler(router, href)} style={{ cursor: 'pointer', ...style }}>
            {children}
        </tr>
    );
}

export function ClickableCard({ href, children, style, className }: Props) {
    const router = useRouter();
    return (
        <div onClick={handler(router, href)} style={{ cursor: 'pointer', ...style }} className={className}>
            {children}
        </div>
    );
}
