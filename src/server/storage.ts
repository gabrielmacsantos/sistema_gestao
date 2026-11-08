import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Saves an upload under storage/<userId>/ and returns its path relative to storage/. */
export async function saveUpload(userId: string, data: Buffer, mediaType: string): Promise<string> {
  const ext = EXTENSIONS[mediaType];
  if (!ext) throw new Error(`Unsupported media type: ${mediaType}`);
  const dir = path.join(STORAGE_ROOT, userId);
  await mkdir(dir, { recursive: true });
  const relative = `${userId}/${randomUUID()}.${ext}`;
  await writeFile(path.join(STORAGE_ROOT, relative), data);
  return relative;
}

/** True when `relative` is a file inside the user's own storage folder. */
export function isOwnUpload(userId: string, relative: string): boolean {
  const resolved = path.resolve(STORAGE_ROOT, relative);
  return resolved.startsWith(path.join(STORAGE_ROOT, userId) + path.sep);
}

export async function readUpload(userId: string, relative: string) {
  if (!isOwnUpload(userId, relative)) return null;
  try {
    const data = await readFile(path.resolve(STORAGE_ROOT, relative));
    const ext = path.extname(relative).slice(1);
    const mediaType = Object.entries(EXTENSIONS).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    return { data, mediaType };
  } catch {
    return null;
  }
}
