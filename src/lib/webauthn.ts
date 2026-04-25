export function getWebAuthnConfig(req: Request) {
    const appUrl = process.env.APP_BASE_URL;
    if (appUrl) {
        const url = new URL(appUrl);
        return { rpID: url.hostname, origin: appUrl.replace(/\/$/, '') };
    }
    // Derive from request host in development
    const host = new URL(req.url).hostname;
    const proto = process.env.COOKIE_SECURE === 'true' ? 'https' : 'http';
    const port = new URL(req.url).port;
    const origin = `${proto}://${host}${port ? `:${port}` : ''}`;
    return { rpID: host, origin };
}
