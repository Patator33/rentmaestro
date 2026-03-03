import { NextResponse } from 'next/server';

// Returns the VAPID public key to the client (it's a public value by design)
export async function GET() {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return NextResponse.json({ error: 'Push notifications non configurées.' }, { status: 503 });
    }
    return NextResponse.json({ publicKey: key });
}
