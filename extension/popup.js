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

    const EVENT_COLORS = {
        LEASE_END: STATUS_COLORS.late,
        RENT_REVIEW: STATUS_COLORS.pending,
        TASK_DUE: STATUS_COLORS.vacant,
        LEASE_START: STATUS_COLORS.ok,
        PRE_INSPECTION: STATUS_COLORS.soon,
    };
    const upcoming = data.upcoming ?? [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let upcomingHtml;
    if (upcoming.length === 0) {
        upcomingHtml = `<div class="empty" data-open="/agenda">Rien de prévu dans les 2 prochains mois</div>`;
    } else {
        upcomingHtml = `<div class="lateList">${upcoming.map(ev => {
            const d = new Date(ev.date);
            const days = Math.round((d.getTime() - startOfToday.getTime()) / 86400000);
            const color = EVENT_COLORS[ev.type] ?? STATUS_COLORS.soon;
            const href = `${appBaseUrl}${ev.href}`;
            return `
                <a class="eventRow" href="${escapeHtml(href)}" target="_blank" rel="noopener" style="border-left:3px solid ${color}">
                    <div class="eventDate">
                        <div class="eventDay" style="color:${color}">${d.getDate()}</div>
                        <div class="eventMonth">${escapeHtml(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))}</div>
                    </div>
                    <div class="lateInfo">
                        <div class="lateName">${escapeHtml(ev.label)}</div>
                        ${ev.sublabel ? `<div class="lateSub">${escapeHtml(ev.sublabel)}</div>` : ''}
                    </div>
                    <div class="eventDays">${days <= 0 ? "auj." : `J−${days}`}</div>
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
        </div>
        <div>
            <div class="sectionTitle" data-open="/agenda">À venir</div>
            ${upcomingHtml}
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
