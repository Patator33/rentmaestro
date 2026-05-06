'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [dark, setDark] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'light') {
            setDark(false);
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, []);

    const toggle = () => {
        const newTheme = dark ? 'light' : 'dark';
        setDark(!dark);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={dark ? 'Mode clair' : 'Mode sombre'}
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.6rem',
                cursor: 'pointer',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                color: 'var(--text-main)',
            }}
        >
            {dark ? '☀️' : '🌙'}
        </button>
    );
}
