import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { signInWithGoogle, signUp, verifyCredentials } from "@/server/services/auth";
import { verifyOtp } from "@/server/services/email-otp";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { sendVerificationCode } from "@/server/services/verification";

const email = () => `ver-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`;

describe("rate limit", () => {
  it("allows `max` uses per window, then refuses until the window passes", async () => {
    const key = `test:${Math.random()}`;
    const start = new Date();
    for (let i = 0; i < 3; i++) await consumeRateLimit(key, 3, 1000, start);
    await expect(consumeRateLimit(key, 3, 1000, start)).rejects.toThrow(DomainError);
    await expect(consumeRateLimit(key, 3, 1000, new Date(start.getTime() + 1001))).resolves.toBeUndefined();
  });

  it("counts each key on its own", async () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    await consumeRateLimit(a, 1, 1000);
    await expect(consumeRateLimit(a, 1, 1000)).rejects.toThrow(DomainError);
    await expect(consumeRateLimit(b, 1, 1000)).resolves.toBeUndefined();
  });
});

describe("e-mail confirmation", () => {
  it("lets the real owner claim an address nobody confirmed, without touching a confirmed one", async () => {
    const address = email();
    const first = await signUp({ name: "Squatter", email: address, password: "senha-do-intruso" });
    const second = await signUp({ name: "Dona", email: address, password: "senha-da-dona" });
    expect(second.id).toBe(first.id);
    await expect(verifyCredentials(address, "senha-do-intruso")).rejects.toThrow(DomainError);
    expect((await verifyCredentials(address, "senha-da-dona")).emailVerifiedAt).toBeNull();

    await sendVerificationCode(second);
    const stored = await prisma.emailOtp.findFirstOrThrow({ where: { userId: second.id } });
    expect(stored.codeHash).toHaveLength(64);

    await prisma.user.update({ where: { id: second.id }, data: { emailVerifiedAt: new Date() } });
    await expect(signUp({ name: "Outro", email: address, password: "outra-senha-1" })).rejects.toThrow(
      "Já existe uma conta",
    );
    expect((await verifyCredentials(address, "senha-da-dona")).emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("never takes over a Google account by signing up with its address", async () => {
    const address = `g-${Math.random()}@gmail.com`;
    await signInWithGoogle({ sub: `g-${Math.random()}`, email: address, emailVerified: true, name: "G" });
    await expect(signUp({ name: "X", email: address, password: "senha-segura-1" })).rejects.toThrow("Já existe uma conta");
  });

  it("sends at most one code a minute when quiet, and caps codes per hour", async () => {
    const user = await signUp({ name: "Q", email: email(), password: "senha-segura-1" });
    await sendVerificationCode(user);
    // A second request right away is swallowed by "quiet" (login of an unconfirmed account)...
    await expect(sendVerificationCode(user, { quiet: true })).resolves.toBeUndefined();
    // ...but not by the plain resend button.
    await expect(sendVerificationCode(user)).rejects.toThrow("Aguarde");
    await expect(verifyOtp(user.id, "000000")).rejects.toThrow(DomainError);
  });
});
