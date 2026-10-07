import { fetchDashboard, getConfig, STATUS_COLORS, STATUS_LABELS } from './shared.js';

const content = document.getElementById('content');
const updatedAtEl = document.getElementById('updatedAt');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');

settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
refreshBtn.addEventListener('click', () => load());

// Adresse du serveur, connue une fois le tableau de bord affiché.
let appBaseUrl = null;

function openApp(path) {
    if (!appBaseUrl) return;
    chrome.tabs.create({ url: `${appBaseUrl}${path}` });
    window.close();
}

// Un clic n'importe où (carte, barre, chiffres, titre, en-tête…) ouvre RentMaestro,
// sauf sur les loyers en retard (liens vers la fiche du locataire) et les boutons.
// `data-open` précise la page visée ; à défaut, le tableau de bord.
document.addEventListener('click', (e) => {
    if (!appBaseUrl) return;
    const target = e.target;
    if (target.closest('a, button')) return;
    const zone = target.closest('[data-open]');
    if (zone) {
        openApp(zone.dataset.open);
    } else if (target.closest('#content')) {
        openApp('/');
    }
});

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtEur(n) {
    return Math.round(n).toLocaleString('fr-FR') + ' €';
}

function fmtPeriod(period) {
    // "YYYY-MM" -> "mois année"
    const [y, m] = period.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function renderNotConfigured() {
    content.innerHTML = `
        <div class="errorBox">
            <span>Extension non configurée.</span>
            <button class="primaryBtn" id="goToOptions">⚙️ Configurer</button>
        </div>`;
    document.getElementById('goToOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function renderSessionExpired() {
    content.innerHTML = `
        <div class="errorBox">
            <span>Session expirée — reconnecte-toi.</span>
            <button class="primaryBtn" id="goToOptions">🔑 Se reconnecter</button>
        </div>`;
    document.getElementById('goToOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function renderError(message) {
    content.innerHTML = `<div class="errorBox"><span>⚠ ${escapeHtml(message)}</span></div>`;
}

function renderDashboard(data, baseUrl) {
    appBaseUrl = baseUrl.replace(/\/+$/, '');
    const occ = data.occupancy;
    const slotsHtml = occ.slots.map(s => `<div class="occupancySlot" style="background:${STATUS_COLORS[s]}" title="${STATUS_LABELS[s]}"></div>`).join('');
    const legendHtml = ['ok', 'late', 'pending', 'soon', 'vacant']
        .filter(k => occ[k] > 0)
        .map(k => `<span style="color:${STATUS_COLORS[k]}">${STATUS_LABELS[k]} ${occ[k]}</span>`)
        .join('');

    const loues = occ.total - occ.vacant;

    let lateHtml;
    if (data.unpaidThisMonth.length === 0) {
        lateHtml = `<div class="empty" data-open="/rents">Aucun impayé 🎉</div>`;
    } else {
        lateHtml = `<div class="lateList">${data.unpaidThisMonth.map(p => {
            const initials = `${p.tenant.firstName?.[0] ?? ''}${p.tenant.lastName?.[0] ?? ''}`.toUpperCase();
            const apt = p.apartment.name || p.apartment.address;
            const href = `${baseUrl}/tenants/${p.tenant.id}`;
            const pillClass = p.late ? 'pill-err' : 'pill-warn';
            const pillLabel = p.late ? 'RETARD' : 'ATTENTE';
            return `
                <a class="lateRow" href="${escapeHtml(href)}" target="_blank" rel="noopener">
                    <div class="lateAvatar">${escapeHtml(initials)}</div>
                    <div class="lateInfo">
                        <div class="lateName">${escapeHtml(p.tenant.firstName)} ${escapeHtml(p.tenant.lastName)}</div>
                        <div class="lateSub">${escapeHtml(apt)} · ${escapeHtml(fmtPeriod(p.period))}</div>
                    </div>
                    <div class="lateAmount">${fmtEur(p.amount)}</div>
                    <span class="pill ${pillClass}">${pillLabel}</span>
                </a>`;
        }).join('')}</div>`;
    }

    content.innerHTML = `
        <div class="card" data-open="/">
            <div class="sectionTitle">Occupation</div>
            <div class="occupancyBig">${data.occupancyRate}<span class="pct">%</span></div>
            <div class="occupancySub">${loues} LOUÉS · ${occ.vacant} VACANT${occ.vacant !== 1 ? 'S' : ''}</div>
            <div class="occupancyBar">${slotsHtml}</div>
            <div class="occupancyLegend">${legendHtml}</div>
        </div>
        <div>
            <div class="sectionTitle" data-open="/rents">Loyers en attente (${data.unpaidThisMonth.length})</div>
            ${lateHtml}
        </div>`;
}

async function load() {
    content.innerHTML = '<p class="muted">Chargement…</p>';
    const { baseUrl, token } = await getConfig();
    if (!baseUrl || !token) {
        renderNotConfigured();
        return;
    }
    try {
        const data = await fetchDashboard();
        renderDashboard(data, baseUrl);
        updatedAtEl.textContent = `Actualisé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (err) {
        if (err.status === 401) renderSessionExpired();
        else renderError(err.message || 'Erreur inconnue.');
    }
}

load();
