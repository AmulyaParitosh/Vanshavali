import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../lib/api";
import { getStorageClient } from "../../../lib/supabase-server";

/**
 * POST /api/upload — upload an image to the public `images` bucket on behalf of
 * a signed-in user, using the service-role client (storage.objects has no RLS
 * policies). Multipart body: `file` (the image) + `path` (object key). Returns
 * { url, fullPath }.
 *
 * Any signed-in user may upload; the image only becomes visible once attached
 * to a person via saveTreeData, which is editor-gated in the service layer.
 */

const BUCKET = "images";

export async function POST(request: NextRequest) {
  return handle(async () => {
    await requireCaller(request);

    const form = await request.formData();
    const file = form.get("file");
    const path = form.get("path");
    if (!(file instanceof File)) throw new HttpError("file is required", 400);
    if (typeof path !== "string" || !path || path.includes("..")) {
      throw new HttpError("a valid path is required", 400);
    }

    const storage = getStorageClient();
    const { data, error } = await storage.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw new HttpError(error.message, 502);

    const fullPath = data?.path ?? path;
    const { data: urlData } = storage.storage.from(BUCKET).getPublicUrl(fullPath);
    return NextResponse.json({ url: urlData.publicUrl, fullPath });
  });
}
