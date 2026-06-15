import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { LOCAL_DATA_CONFIG } from '../../../../constants';

const DATA_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.DB_DIR);

const ALLOWED_COLLECTIONS: ReadonlySet<string> = new Set(
  Object.values(LOCAL_DATA_CONFIG.COLLECTIONS)
);

function isAllowedCollection(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_COLLECTIONS.has(value);
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');

  if (!isAllowedCollection(collection)) {
    return NextResponse.json(
      { error: 'Unknown collection' },
      { status: 400 }
    );
  }

  const filePath = path.join(DATA_DIR, `${collection}.json`);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      // First-run / never-saved collection — empty is the right default.
      return NextResponse.json([]);
    }
    console.error('Local DB read error:', error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { collection, data } = body as { collection?: unknown; data?: unknown };

  if (!isAllowedCollection(collection)) {
    return NextResponse.json(
      { error: 'Unknown collection' },
      { status: 400 }
    );
  }

  await ensureDir();
  const filePath = path.join(DATA_DIR, `${collection}.json`);

  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Local DB write error:', error);
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}
