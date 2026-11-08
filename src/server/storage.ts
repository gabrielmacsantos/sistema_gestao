import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createUpload, findUpload } from "./repositories/uploads";

// Uploads made before they moved to the database live here (local installs only).
const LEGACY_STORAGE_ROOT = path.join(process.cwd(), "storage");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Saves an upload and returns its path ("<userId>/<uuid>.<ext>"), stored in Transaction.attachment. */
export async function saveUpload(userId: string, data: Buffer, mediaType: string): Promise<string> {
  const ext = EXTENSIONS[mediaType];
  if (!ext) throw new Error(`Unsupported media type: ${mediaType}`);
  const relative = `${userId}/${randomUUID()}.${ext}`;
  await createUpload(userId, relative, mediaType, data);
  return relative;
}

/** True when `relative` is a well-formed path inside the user's own namespace. */
export function isOwnUpload(userId: string, relative: string): boolean {
  const [owner, file, ...rest] = relative.split("/");
  return owner === userId && rest.length === 0 && /^[\w-]+\.(jpg|png|webp)$/.test(file ?? "");
}

export async function readUpload(userId: string, relative: string) {
  if (!isOwnUpload(userId, relative)) return null;

  const stored = await findUpload(userId, relative);
  if (stored) return { data: Buffer.from(stored.data), mediaType: stored.mediaType };

  try {
    const data = await readFile(path.join(LEGACY_STORAGE_ROOT, relative));
    const ext = path.extname(relative).slice(1);
    const mediaType = Object.entries(EXTENSIONS).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    return { data, mediaType };
  } catch {
    return null;
  }
}
