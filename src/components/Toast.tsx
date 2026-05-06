'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    exiting?: boolean;
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const TYPE_CLASS: Record<ToastType, string> = {
    success: styles.toastSuccess,
    error: styles.toastError,
    warning: styles.toastWarning,
    info: styles.toastInfo,
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'success', duration: number = 4000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${TYPE_CLASS[toast.type]} ${toast.exiting ? styles.exiting : ''}`}
                        style={{ position: 'relative', overflow: 'hidden' }}
                    >
                        <span className={styles.toastIcon}>{ICONS[toast.type]}</span>
                        <span className={styles.toastMessage}>{toast.message}</span>
                        <button
                            className={styles.toastClose}
                            onClick={() => removeToast(toast.id)}
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                        <div
                            className={styles.progressBar}
                            style={{ animationDuration: `${toast.duration || 4000}ms` }}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
