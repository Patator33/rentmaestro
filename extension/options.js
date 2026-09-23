import { getConfig, setConfig, clearConfig, login } from './shared.js';

const connectedBox = document.getElementById('connectedBox');
const connectedUrl = document.getElementById('connectedUrl');
const connectedEmail = document.getElementById('connectedEmail');
const loginForm = document.getElementById('loginForm');
const baseUrlInput = document.getElementById('baseUrl');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');
const disconnectBtn = document.getElementById('disconnectBtn');

async function refresh() {
    const { baseUrl, token, email } = await getConfig();
    if (baseUrl && token) {
        connectedBox.hidden = false;
        connectedUrl.textContent = baseUrl;
        connectedEmail.textContent = email;
        baseUrlInput.value = baseUrl;
        emailInput.value = email;
        loginBtn.textContent = 'Se reconnecter / renouveler le jeton';
    } else {
        connectedBox.hidden = true;
        loginBtn.textContent = 'Se connecter';
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Connexion…';
    try {
        const baseUrl = baseUrlInput.value.trim();
        const { token, email } = await login(baseUrl, emailInput.value.trim(), passwordInput.value);
        await setConfig({ baseUrl, token, email });
        passwordInput.value = '';
        await refresh();
    } catch (err) {
        errorMsg.textContent = err.message || 'Connexion impossible.';
        errorMsg.hidden = false;
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Se connecter';
    }
});

disconnectBtn.addEventListener('click', async () => {
    await clearConfig();
    await refresh();
});

refresh();
