import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { LOCAL_DATA_CONFIG } from '../../../../constants';

const STORAGE_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.STORAGE_DIR);

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Resolves a user-supplied relative path against STORAGE_DIR, rejecting any
 * input that would escape the root (path traversal via `../` or absolute
 * paths). Returns null when the path is unsafe.
 */
function resolveSafePath(rel: string): string | null {
  if (!rel || typeof rel !== 'string') return null;
  if (path.isAbsolute(rel)) return null;
  const normalized = path.normalize(rel);
  if (normalized.startsWith('..')) return null;
  const fullPath = path.resolve(STORAGE_DIR, normalized);
  const root = path.resolve(STORAGE_DIR) + path.sep;
  if (!fullPath.startsWith(root) && fullPath !== path.resolve(STORAGE_DIR)) {
    return null;
  }
  return fullPath;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const filePath = formData.get('path');

    if (!(file instanceof File) || typeof filePath !== 'string') {
      return NextResponse.json(
        { error: 'File and path are required' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image uploads are accepted' },
        { status: 415 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_UPLOAD_BYTES} bytes` },
        { status: 413 }
      );
    }

    const fullPath = resolveSafePath(filePath);
    if (!fullPath) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    await ensureDir(path.dirname(fullPath));

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

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

  const fullPath = resolveSafePath(filePath);
  if (!fullPath) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
