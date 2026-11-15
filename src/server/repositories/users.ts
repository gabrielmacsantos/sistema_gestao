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
  emailVerifiedAt?: Date;
}) {
  return prisma.user.create({ data, select: { id: true } });
}

/** Only ever touches a still-unconfirmed account (the `emailVerifiedAt: null` guard). */
export function resetUnverifiedUser(id: string, data: { name: string; passwordHash: string }) {
  return prisma.user.updateMany({ where: { id, emailVerifiedAt: null, googleSub: null }, data });
}
