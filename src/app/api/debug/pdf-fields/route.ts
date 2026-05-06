import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'Paramètre url manquant' }, { status: 400 });

    try {
        const filePath = path.join(process.cwd(), 'public', url.startsWith('/') ? url.slice(1) : url);
        const bytes = await readFile(filePath);
        const doc = await PDFDocument.load(bytes);
        const form = doc.getForm();
        const fields = form.getFields();

        return NextResponse.json({
            fieldCount: fields.length,
            fields: fields.map(f => ({ name: f.getName(), type: f.constructor.name })),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
