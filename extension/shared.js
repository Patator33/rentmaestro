// Partagé entre popup.js et background.js — stockage de la config et appel
// au même endpoint que l'app mobile (Bearer token, voir src/lib/mobile-auth.ts
// côté serveur).

export const STATUS_COLORS = {
    ok: '#a3e635',      // vert   — payé / à jour
    late: '#ef4444',    // rouge  — en retard
    pending: '#fbbf24', // jaune  — pas encore payé
    vacant: '#fb923c',  // orange — logement vacant
    soon: '#67e8f9',    // cyan   — bail signé, pas encore commencé
};

export const STATUS_LABELS = {
    ok: 'PAYÉ',
    late: 'RETARD',
    pending: 'ATTENTE',
    soon: 'À VENIR',
    vacant: 'VACANT',
};

export async function getConfig() {
    const { baseUrl, token, email } = await chrome.storage.local.get(['baseUrl', 'token', 'email']);
    return { baseUrl: baseUrl || '', token: token || '', email: email || '' };
}

export async function setConfig(config) {
    await chrome.storage.local.set(config);
}

export async function clearConfig() {
    await chrome.storage.local.remove(['baseUrl', 'token', 'email']);
}

function normalizeBaseUrl(url) {
    return url.trim().replace(/\/+$/, '');
}

/** Échange email + mot de passe contre un jeton longue durée (30 jours, même mécanisme que l'app mobile). */
export async function login(baseUrl, email, password) {
    const url = `${normalizeBaseUrl(baseUrl)}/api/auth/mobile-login`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur HTTP ${res.status}`);
    return { token: data.token, email: data.email };
}

/**
 * Résumé du dashboard (occupation, retards) — même endpoint que l'app mobile.
 * Lève une erreur avec `.status = 401` si le jeton est expiré/invalide, pour
 * que l'appelant puisse distinguer "pas connecté" d'une vraie panne réseau.
 */
export async function fetchDashboard() {
    const { baseUrl, token } = await getConfig();
    if (!baseUrl || !token) {
        const err = new Error('Extension non configurée.');
        err.status = 0;
        throw err;
    }
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/api/landlord/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
        const err = new Error('Session expirée.');
        err.status = 401;
        throw err;
    }
    if (!res.ok) {
        const err = new Error(`Erreur serveur (${res.status}).`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}
