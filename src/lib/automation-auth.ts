import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Authentification des appels d'automatisation (n8n).
 *
 * Volontairement distincte du jeton mobile, qui expire au bout de 30 jours :
 * une automatisation cesserait de fonctionner sans prévenir. Le secret est une
 * variable d'environnement, révocable seule, et ne donne accès qu'aux routes
 * /api/automation/*.
 */
export function verifyAutomationSecret(request: Request): boolean {
    const expected = process.env.AUTOMATION_SECRET;
    // Pas de secret configuré : la fonctionnalité reste fermée plutôt que
    // grande ouverte.
    if (!expected || expected.length < 16) return false;

    const provided = request.headers.get('x-automation-secret') ?? '';
    if (provided.length !== expected.length) return false;

    // Comparaison à durée constante : une comparaison naïve laisse deviner le
    // secret caractère par caractère.
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function automationUnauthorized() {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}
