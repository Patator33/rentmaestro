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
            {/* Background circle with gradient */}
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
            </defs>

            {/* House icon */}
            <rect x="20" y="45" width="60" height="45" rx="4" fill="url(#logoGradient)" opacity="0.2" />

            {/* Roof */}
            <path
                d="M50 20 L85 50 L80 50 L80 45 L50 25 L20 45 L20 50 L15 50 Z"
                fill="url(#logoGradient)"
            />

            {/* Door */}
            <rect x="42" y="65" width="16" height="25" rx="2" fill="#6366f1" opacity="0.8" />

            {/* Windows */}
            <rect x="28" y="55" width="10" height="10" rx="1" fill="#8b5cf6" opacity="0.9" />
            <rect x="62" y="55" width="10" height="10" rx="1" fill="#8b5cf6" opacity="0.9" />

            {/* Key accent */}
            <circle cx="70" cy="35" r="8" fill="#f59e0b" opacity="0.9" />
            <rect x="68" y="35" width="2" height="8" fill="#f59e0b" opacity="0.9" />
            <rect x="68" y="41" width="4" height="2" fill="#f59e0b" opacity="0.9" />
        </svg>
    );
}
