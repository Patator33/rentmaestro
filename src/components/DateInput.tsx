'use client';

import { useRef } from 'react';

interface DateInputProps {
    name: string;
    id?: string;
    required?: boolean;
    defaultValue?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
}

export default function DateInput({
    name, id, required, defaultValue, value, onChange, className, style, placeholder
}: DateInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const openPicker = (e: React.MouseEvent) => {
        e.preventDefault();
        if (inputRef.current) {
            try {
                (inputRef.current as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            } catch {
                inputRef.current.focus();
            }
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
                ref={inputRef}
                type="date"
                name={name}
                id={id}
                required={required}
                defaultValue={defaultValue}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={className}
                style={{ ...style, paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
            />
            <button
                type="button"
                onClick={openPicker}
                tabIndex={-1}
                title="Ouvrir le calendrier"
                style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '0.2rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    lineHeight: 1,
                    zIndex: 1,
                    pointerEvents: 'all',
                }}
            >
                📅
            </button>
        </div>
    );
}
