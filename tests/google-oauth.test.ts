import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { loginErrorMessage } from "@/lib/login-errors";
import { authorizationUrl, googleConfig } from "@/server/integrations/google-oauth";
import { verifyGoogleIdToken } from "@/server/integrations/google-oauth/id-token";
import { codeChallenge, randomToken, sameToken } from "@/server/integrations/google-oauth/pkce";

describe("PKCE helpers", () => {
  it("builds the S256 challenge of RFC 7636's example", async () => {
    expect(await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("makes url-safe random tokens that do not repeat", () => {
    const a = randomToken(), b = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("compares tokens exactly", () => {
    expect(sameToken("abc", "abc")).toBe(true);
    expect(sameToken("abc", "abd")).toBe(false);
    expect(sameToken("abc", "abcd")).toBe(false);
  });
});

describe("Google login URL", () => {
  it("asks only for identity, with PKCE and the nonce, and never carries the secret", () => {
    process.env.GOOGLE_CLIENT_ID = "client-123.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "very-secret";
    process.env.APP_URL = "http://localhost:3000/";
    const config = googleConfig()!;
    expect(config.redirectUri).toBe("http://localhost:3000/api/auth/google/callback");

    const url = new URL(authorizationUrl(config, { state: "s1", nonce: "n1", challenge: "c1" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "client-123.apps.googleusercontent.com",
      redirect_uri: "http://localhost:3000/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
      state: "s1",
      nonce: "n1",
      code_challenge: "c1",
      code_challenge_method: "S256",
    });
    expect(url.toString()).not.toContain("very-secret");
  });

  it("is off when the client is not in .env", () => {
    process.env.GOOGLE_CLIENT_SECRET = "";
    expect(googleConfig()).toBeNull();
  });
});

describe("Google ID token", () => {
  const clientId = "client-123.apps.googleusercontent.com";
  let keys: ReturnType<typeof createLocalJWKSet>;
  let sign: (claims: Record<string, unknown>, options?: { iss?: string; aud?: string; exp?: string | number }) => Promise<string>;

  beforeAll(async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" };
    keys = createLocalJWKSet({ keys: [jwk] });
    sign = (claims, { iss = "https://accounts.google.com", aud = clientId, exp = "1h" } = {}) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setIssuer(iss)
        .setAudience(aud)
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(privateKey);
  });

  const valid = { sub: "1098765", email: "Ana@Gmail.com", email_verified: true, name: "Ana Souza", nonce: "n1" };

  it("returns the stable sub and the account fields", async () => {
    const profile = await verifyGoogleIdToken(await sign(valid), { clientId, nonce: "n1", keys });
    expect(profile).toEqual({ sub: "1098765", email: "ana@gmail.com", emailVerified: true, name: "Ana Souza" });
  });

  it("reports an unconfirmed e-mail instead of trusting it", async () => {
    const profile = await verifyGoogleIdToken(await sign({ ...valid, email_verified: false }), { clientId, nonce: "n1", keys });
    expect(profile.emailVerified).toBe(false);
  });

  it.each([
    ["another app's token", () => sign(valid, { aud: "someone-else" })],
    ["another issuer", () => sign(valid, { iss: "https://evil.example" })],
    ["an expired token", () => sign(valid, { exp: Math.floor(Date.now() / 1000) - 3600 })],
    ["another login's nonce", () => sign({ ...valid, nonce: "other" })],
    ["no e-mail", () => sign({ ...valid, email: undefined })],
    ["no sub", () => sign({ ...valid, sub: undefined })],
  ])("rejects %s", async (_, token) => {
    await expect(verifyGoogleIdToken(await token(), { clientId, nonce: "n1", keys })).rejects.toThrow();
  });

  it("rejects a token signed with a shared secret instead of Google's key", async () => {
    const forged = await new SignJWT(valid)
      .setProtectedHeader({ alg: "HS256", kid: "test" })
      .setIssuer("https://accounts.google.com")
      .setAudience(clientId)
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("x".repeat(32)));
    await expect(verifyGoogleIdToken(forged, { clientId, nonce: "n1", keys })).rejects.toThrow();
  });
});

describe("login error codes", () => {
  it("shows only known messages", () => {
    expect(loginErrorMessage("cancelado")).toMatch(/cancelado/);
    expect(loginErrorMessage("texto qualquer de um link")).toBeNull();
    expect(loginErrorMessage("__proto__")).toBeNull();
    expect(loginErrorMessage(undefined)).toBeNull();
  });
});
