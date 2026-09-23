import { fetchDashboard, getConfig } from './shared.js';

const ALARM_NAME = 'rentmaestro-refresh';
const REFRESH_MINUTES = 30;

async function refreshBadge() {
    const { baseUrl, token } = await getConfig();
    if (!baseUrl || !token) {
        chrome.action.setBadgeText({ text: '' });
        return;
    }
    try {
        const data = await fetchDashboard();
        const late = data.occupancy.late;
        if (late > 0) {
            chrome.action.setBadgeText({ text: String(late) });
            chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    } catch {
        // Jeton expiré ou serveur injoignable : pas d'alerte bruyante en
        // arrière-plan, le popup affichera l'erreur en détail à l'ouverture.
        chrome.action.setBadgeText({ text: '' });
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: REFRESH_MINUTES });
    refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
    refreshBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) refreshBadge();
});

// Recalcule tout de suite après une (re)connexion depuis la page de réglages.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.token || changes.baseUrl)) refreshBadge();
});
