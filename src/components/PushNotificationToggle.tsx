'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export default function PushNotificationToggle() {
    const [state, setState] = useState<State>('loading');
    const [busy, setBusy] = useState(false);
    const [vapidKey, setVapidKey] = useState<string | null>(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setState('unsupported');
            return;
        }
        if (Notification.permission === 'denied') {
            setState('denied');
            return;
        }
        fetch('/api/push/vapid-key')
            .then((r) => r.json())
            .then((data) => { if (data.publicKey) setVapidKey(data.publicKey); })
            .catch(() => setState('unsupported'));

        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'));
    }, []);

    const subscribe = async () => {
        if (!vapidKey) return;
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') { setState('denied'); setBusy(false); return; }
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sub.toJSON()),
            });
            setState('subscribed');
        } catch (err) { console.error('Push subscribe error:', err); }
        setBusy(false);
    };

    const unsubscribe = async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setState('unsubscribed');
        } catch (err) { console.error('Push unsubscribe error:', err); }
        setBusy(false);
    };

    if (state === 'loading') return null;

    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                🔔 Notifications push
            </h2>
            {state === 'unsupported' && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Votre navigateur ne supporte pas les notifications push.
                </p>
            )}
            {state === 'denied' && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                    Les notifications sont bloquées. Autorisez-les dans les paramètres du navigateur puis rechargez.
                </p>
            )}
            {state === 'unsubscribed' && (
                <>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        Alertes pour loyers impayés, baux expirants et tâches en retard.
                    </p>
                    <button onClick={subscribe} disabled={busy || !vapidKey}
                        style={{ padding: '0.6rem 1.2rem', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
                        {busy ? 'Activation…' : 'Activer les notifications'}
                    </button>
                </>
            )}
            {state === 'subscribed' && (
                <>
                    <p style={{ color: '#22c55e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        ✓ Notifications activées sur cet appareil.
                    </p>
                    <button onClick={unsubscribe} disabled={busy}
                        style={{ padding: '0.6rem 1.2rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
                        {busy ? 'Désactivation…' : 'Désactiver'}
                    </button>
                </>
            )}
        </div>
    );
}
