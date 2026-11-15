import "server-only";
import { prisma } from "../db";

/** Replaces any earlier code: only the latest one is ever valid. */
export function replaceOtp(userId: string, data: { codeHash: string; expiresAt: Date; createdAt: Date }) {
  return prisma.$transaction([
    prisma.emailOtp.deleteMany({ where: { userId } }),
    prisma.emailOtp.create({ data: { userId, ...data } }),
  ]);
}

export function findLatestOtp(userId: string) {
  return prisma.emailOtp.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function countOtpAttempt(id: string, userId: string) {
  return prisma.emailOtp.updateMany({ where: { id, userId }, data: { attempts: { increment: 1 } } });
}

export function deleteOtps(userId: string) {
  return prisma.emailOtp.deleteMany({ where: { userId } });
}

export function markEmailVerified(userId: string) {
  return prisma.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
}
