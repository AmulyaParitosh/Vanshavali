import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { LOCAL_DATA_CONFIG } from '../../../../constants';

const STORAGE_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.STORAGE_DIR);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('path') as string;

    if (!file || !filePath) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }

    const fullPath = path.join(STORAGE_DIR, filePath);
    await ensureDir(path.dirname(fullPath));

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    // Mock URL - serving via local API
    const url = `/api/local/storage?path=${encodeURIComponent(filePath)}`;
    
    return NextResponse.json({ url, fullPath: filePath });
  } catch (error) {
    console.error('Local Storage upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const fullPath = path.join(STORAGE_DIR, filePath);
  
  try {
    const data = await fs.readFile(fullPath);
    // Simple mime-type detection based on extension
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
