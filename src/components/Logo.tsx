import React from 'react';

export default function Logo({ className = "", size = 32 }: { className?: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan Néon */}
                    <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet Électrique */}
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Abstract Modern "R" / Architecture Structure */}
            <g filter="url(#glow)">
                <path
                    d="M30 20 L30 80 L45 80 L45 55 L65 55 L80 80 L95 80 L75 50 C85 45 90 35 90 25 L90 20 L30 20 Z M45 35 L75 35 L75 40 L45 40 L45 35 Z"
                    fill="url(#logoGradient)"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                />
            </g>

            {/* Accent Elements */}
            <circle cx="20" cy="20" r="5" fill="#f472b6" filter="url(#glow)" opacity="0.8" />
            <circle cx="90" cy="90" r="3" fill="#06b6d4" filter="url(#glow)" opacity="0.8" />
        </svg>
    );
}
