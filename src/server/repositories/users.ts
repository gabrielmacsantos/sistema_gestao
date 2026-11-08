import "server-only";
import { prisma } from "../db";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(data: { name: string; email: string; passwordHash: string }) {
  return prisma.user.create({ data, select: { id: true } });
}
