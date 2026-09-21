import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret');
    const path = request.nextUrl.searchParams.get('path') || '/';

    const expectedSecret = process.env.REVALIDATION_SECRET || 'revalidate_dev_key_2026';

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}
