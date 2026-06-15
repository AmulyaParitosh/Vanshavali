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
  const {
    collection,
    data,
    tree: treeId,
  } = body as {
    collection?: unknown;
    data?: unknown;
    tree?: unknown;
  };

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
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local DB write error:", error);
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 });
  }
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
