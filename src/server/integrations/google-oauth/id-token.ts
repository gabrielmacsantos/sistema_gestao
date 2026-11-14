// Verifies Google's ID token. Pure apart from the key lookup, which callers pass in (tests use
// their own keys; production uses Google's published JWKS).
import { jwtVerify, type JWTVerifyGetKey } from "jose";

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string | null };

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/**
 * Checks the signature, issuer, audience (our client id), expiry and the nonce sent at the start
 * of this login, then returns the account fields we use. Throws on anything unexpected.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  { clientId, nonce, keys }: { clientId: string; nonce: string; keys: JWTVerifyGetKey },
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, keys, {
    issuer: ISSUERS,
    audience: clientId,
    algorithms: ["RS256"],
    clockTolerance: 60,
  });
  if (payload.nonce !== nonce) throw new Error("ID token nonce mismatch");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("ID token without sub");
  if (typeof payload.email !== "string" || !payload.email) throw new Error("ID token without email");

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
  };
}
