import "server-only";
import { prisma } from "../db";

export function createUpload(userId: string, id: string, mediaType: string, data: Buffer) {
  return prisma.upload.create({ data: { id, userId, mediaType, data: new Uint8Array(data) } });
}

export function findUpload(userId: string, id: string) {
  return prisma.upload.findFirst({ where: { id, userId }, select: { data: true, mediaType: true } });
}
