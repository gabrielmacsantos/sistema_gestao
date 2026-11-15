import { afterEach, describe, expect, it, vi } from "vitest";
import { otpMail, sendMail } from "@/server/mailer";

afterEach(() => vi.unstubAllEnvs());

describe("mailer", () => {
  it("puts the code and the validity in the OTP message", () => {
    const mail = otpMail("a@test.dev", "004217");
    expect(mail.to).toBe("a@test.dev");
    expect(mail.subject).toContain("004217");
    expect(mail.text).toContain("10 minutos");
  });

  it("discards mail in tests and refuses to run in production without a transport", async () => {
    await expect(sendMail(otpMail("a@test.dev", "123456"))).resolves.toBeUndefined();
    vi.stubEnv("NODE_ENV", "production");
    await expect(sendMail(otpMail("a@test.dev", "123456"))).rejects.toThrow("não configurado");
  });
});
