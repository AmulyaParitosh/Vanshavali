import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { LOCAL_DATA_CONFIG } from '../../../../constants';

const DATA_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.DB_DIR);

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');

  if (!collection) {
    return NextResponse.json({ error: 'Collection is required' }, { status: 400 });
  }

  const filePath = path.join(DATA_DIR, `${collection}.json`);
  
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    // If file doesn't exist, return empty array/object depending on collection
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const { collection, data } = await request.json();

  if (!collection) {
    return NextResponse.json({ error: 'Collection is required' }, { status: 400 });
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
