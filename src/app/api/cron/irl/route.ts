import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_IRL_INDICES, type IrlIndex } from '@/lib/irl';

// Série INSEE 001515333 : Indice de référence des loyers (IRL), hexagone.
// L'API SDMX de la Banque de Données Macroéconomiques est publique (pas de clé).
const INSEE_SDMX_URL = 'https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/001515333';

// POST /api/cron/irl — récupère les derniers indices IRL publiés par l'INSEE
// et les fusionne dans le réglage irl_indices. À planifier trimestriellement
// (publication mi-janvier, mi-avril, mi-juillet, mi-octobre).
export async function POST(request: NextRequest) {
    const secret = request.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let xml: string;
    try {
        const res = await fetch(INSEE_SDMX_URL, {
            headers: { Accept: 'application/xml' },
            cache: 'no-store',
        });
        if (!res.ok) {
            return NextResponse.json({ error: `INSEE a répondu ${res.status}` }, { status: 502 });
        }
        xml = await res.text();
    } catch (e: any) {
        return NextResponse.json({ error: `INSEE injoignable : ${e.message}` }, { status: 502 });
    }

    // Observations SDMX : <Obs TIME_PERIOD="2025-Q2" OBS_VALUE="146.68" .../>
    const fetched: IrlIndex[] = [];
    const re = /TIME_PERIOD="(\d{4})-Q(\d)"[^>]*OBS_VALUE="([\d.]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        fetched.push({ quarter: `${m[1]}-T${m[2]}`, value: parseFloat(m[3]) });
    }
    if (fetched.length === 0) {
        return NextResponse.json({ error: 'Aucun indice trouvé dans la réponse INSEE.' }, { status: 502 });
    }

    const setting = await prisma.setting.findUnique({ where: { key: 'irl_indices' } });
    const current: IrlIndex[] = setting?.value ? JSON.parse(setting.value) : [...DEFAULT_IRL_INDICES];

    // Les valeurs officielles INSEE priment sur les valeurs saisies manuellement
    const byQuarter = new Map(current.map(i => [i.quarter, i]));
    let added = 0, updated = 0;
    for (const idx of fetched) {
        const existing = byQuarter.get(idx.quarter);
        if (!existing) { byQuarter.set(idx.quarter, idx); added++; }
        else if (existing.value !== idx.value) { byQuarter.set(idx.quarter, idx); updated++; }
    }

    const merged = [...byQuarter.values()].sort((a, b) => a.quarter.localeCompare(b.quarter));
    await prisma.setting.upsert({
        where: { key: 'irl_indices' },
        update: { value: JSON.stringify(merged) },
        create: { key: 'irl_indices', value: JSON.stringify(merged) },
    });

    return NextResponse.json({ fetched: fetched.length, added, updated, total: merged.length });
}
