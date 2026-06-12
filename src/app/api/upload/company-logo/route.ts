import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 512 * 1024; // 512 KB

export async function POST(request: NextRequest) {
    const session = await readSession(request);
    if (!session.userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Image trop volumineuse (max 512 Ko)' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        return NextResponse.json({ url: dataUrl });
    } catch (error) {
        console.error('Erreur upload logo:', error);
        return NextResponse.json({ error: `Erreur: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
    }
}
