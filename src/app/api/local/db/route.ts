import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { ALL_LOCAL_COLLECTIONS, LOCAL_DATA_CONFIG } from "../../../../constants";

const DATA_DIR = path.join(process.cwd(), LOCAL_DATA_CONFIG.DB_DIR);

const ALLOWED_COLLECTIONS = new Set<string>(ALL_LOCAL_COLLECTIONS);
const TREE_SCOPED = new Set<string>(Object.values(LOCAL_DATA_CONFIG.TREE_COLLECTIONS));

function isAllowedCollection(value: unknown): value is string {
  return typeof value === "string" && ALLOWED_COLLECTIONS.has(value);
}

/** Only `[a-z0-9_-]` ids allowed, max 80 chars. Defends against path traversal. */
function isValidTreeId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]{1,80}$/i.test(value);
}

function resolveFilePath(collection: string, treeId: string | null): string | null {
  const isTreeScoped = TREE_SCOPED.has(collection);
  if (isTreeScoped) {
    if (!treeId || !isValidTreeId(treeId)) return null;
    return path.join(DATA_DIR, "trees", treeId, `${collection}.json`);
  }
  if (treeId) return null; // global collection passed a tree id — reject ambiguity
  return path.join(DATA_DIR, `${collection}.json`);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get("collection");
  const treeId = searchParams.get("tree");

  if (!isAllowedCollection(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 400 });
  }

  const filePath = resolveFilePath(collection, treeId);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      // First-run / never-saved collection — empty is the right default.
      return NextResponse.json([]);
    }
    console.error("Local DB read error:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Batch form: { writes: [{ collection, data, tree? }, ...] } — written
  // atomically as a temp-file-then-rename sequence so a mid-batch failure
  // doesn't leave half-applied state.
  const writes = Array.isArray((body as { writes?: unknown }).writes)
    ? (body as { writes: Array<{ collection?: unknown; data?: unknown; tree?: unknown }> }).writes
    : null;

  if (writes) {
    return handleBatchWrite(writes);
  }

  // Single-write form (legacy): { collection, data, tree? }
  const {
    collection,
    data,
    tree: treeId,
  } = body as { collection?: unknown; data?: unknown; tree?: unknown };

  if (!isAllowedCollection(collection)) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 400 });
  }
  const normalizedTreeId = typeof treeId === "string" && treeId.length > 0 ? treeId : null;
  const filePath = resolveFilePath(collection, normalizedTreeId);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await ensureDir(path.dirname(filePath));
  try {
    await writeAtomic(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local DB write error:", error);
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 });
  }
}

async function handleBatchWrite(
  writes: Array<{ collection?: unknown; data?: unknown; tree?: unknown }>
) {
  // Validate everything before any write so we fail fast on bad input.
  const planned: Array<{ filePath: string; contents: string }> = [];
  for (const op of writes) {
    if (!isAllowedCollection(op.collection)) {
      return NextResponse.json(
        { error: `Unknown collection in batch: ${String(op.collection)}` },
        { status: 400 }
      );
    }
    const treeId = typeof op.tree === "string" && op.tree.length > 0 ? op.tree : null;
    const filePath = resolveFilePath(op.collection, treeId);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid batch entry" }, { status: 400 });
    }
    planned.push({ filePath, contents: JSON.stringify(op.data, null, 2) });
  }

  // Write all temp files first; rename them into place at the end. If any
  // write fails, clean up the temp files and report. (Not a true cross-file
  // transaction — Postgres on Supabase is — but it eliminates the "half a
  // batch persisted" failure mode.)
  const tempFiles: string[] = [];
  try {
    for (const { filePath, contents } of planned) {
      await ensureDir(path.dirname(filePath));
      const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
      await fs.writeFile(tempPath, contents);
      tempFiles.push(tempPath);
    }
    for (let i = 0; i < planned.length; i++) {
      await fs.rename(tempFiles[i]!, planned[i]!.filePath);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local DB batch write error:", error);
    await Promise.all(tempFiles.map((p) => fs.unlink(p).catch(() => undefined)));
    return NextResponse.json({ error: "Failed batch write" }, { status: 500 });
  }
}

async function writeAtomic(filePath: string, contents: string): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, contents);
  await fs.rename(tempPath, filePath);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const treeId = searchParams.get("tree");

  if (!treeId || !isValidTreeId(treeId)) {
    return NextResponse.json({ error: "Invalid tree id" }, { status: 400 });
  }

  const treeDir = path.join(DATA_DIR, "trees", treeId);
  try {
    await fs.rm(treeDir, { recursive: true, force: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local DB delete error:", error);
    return NextResponse.json({ error: "Failed to delete tree" }, { status: 500 });
  }
}
