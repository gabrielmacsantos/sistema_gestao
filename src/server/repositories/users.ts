import "server-only";
import { prisma } from "../db";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserByGoogleSub(googleSub: string) {
  return prisma.user.findUnique({ where: { googleSub }, select: { id: true } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string | null;
  googleSub?: string;
}) {
  return prisma.user.create({ data, select: { id: true } });
}
