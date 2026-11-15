import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { generateOtp, hashOtp, otpMatches } from "@/server/otp";
import { signInWithGoogle, signUp } from "@/server/services/auth";
import { issueOtp, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, verifyOtp } from "@/server/services/email-otp";

let alice: string;
let bob: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = (await signUp({ name: "Alice", email: `otp-alice-${stamp}@test.dev`, password: "senha-segura" })).id;
  bob = (await signUp({ name: "Bob", email: `otp-bob-${stamp}@test.dev`, password: "senha-segura" })).id;
});

const verifiedAt = async (id: string) => (await prisma.user.findUnique({ where: { id } }))?.emailVerifiedAt;

describe("otp primitives", () => {
  it("always makes six digits and binds the hash to the user", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
    const hash = hashOtp("123456", "u1");
    expect(otpMatches("123456", "u1", hash)).toBe(true);
    expect(otpMatches("123456", "u2", hash)).toBe(false);
    expect(otpMatches("654321", "u1", hash)).toBe(false);
  });
});

describe("e-mail OTP", () => {
  it("starts unconfirmed, stores only a hash, and a right code confirms once", async () => {
    expect(await verifiedAt(alice)).toBeNull();
    const code = await issueOtp(alice);
    const stored = await prisma.emailOtp.findFirstOrThrow({ where: { userId: alice } });
    expect(stored.codeHash).not.toContain(code);
    await verifyOtp(alice, code);
    expect(await verifiedAt(alice)).toBeInstanceOf(Date);
    await expect(verifyOtp(alice, code)).rejects.toThrow(DomainError);
  });

  it("does not let one user's code confirm another", async () => {
    const code = await issueOtp(bob);
    const other = await signUp({ name: "C", email: `otp-c-${Date.now()}@test.dev`, password: "senha-segura" });
    // Even a copy of Bob's stored hash does not validate for another user.
    await prisma.emailOtp.create({
      data: { userId: other.id, codeHash: hashOtp(code, bob), expiresAt: new Date(Date.now() + 60000) },
    });
    await expect(verifyOtp(other.id, code)).rejects.toThrow("incorreto");
    expect(await verifiedAt(other.id)).toBeNull();
  });

  it("expires, limits attempts, enforces the resend cooldown and keeps only the latest code", async () => {
    const user = (await signUp({ name: "D", email: `otp-d-${Date.now()}@test.dev`, password: "senha-segura" })).id;
    const start = new Date();
    await issueOtp(user, start);
    await expect(issueOtp(user, new Date(start.getTime() + 1000))).rejects.toThrow("Aguarde");

    const later = new Date(start.getTime() + OTP_RESEND_COOLDOWN_MS + 1);
    const code = await issueOtp(user, later);
    expect(await prisma.emailOtp.count({ where: { userId: user } })).toBe(1);

    await expect(verifyOtp(user, code, new Date(later.getTime() + OTP_TTL_MS + 1))).rejects.toThrow("expirado");

    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await expect(verifyOtp(user, wrong, later)).rejects.toThrow("incorreto");
    // At the limit the code is burned, so even the right one fails.
    await expect(verifyOtp(user, code, later)).rejects.toThrow("Muitas tentativas");
    await expect(verifyOtp(user, code, later)).rejects.toThrow("expirado");
    expect(await verifiedAt(user)).toBeNull();
  });

  it("creates Google accounts already confirmed", async () => {
    const user = await signInWithGoogle({
      sub: `g-${Date.now()}`,
      email: `otp-g-${Date.now()}@gmail.com`,
      emailVerified: true,
      name: "G",
    });
    expect(await verifiedAt(user.id)).toBeInstanceOf(Date);
  });
});
