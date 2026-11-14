import "server-only";
import { createRemoteJWKSet } from "jose";
import { verifyGoogleIdToken, type GoogleProfile } from "./id-token";

export { codeChallenge, randomToken, sameToken } from "./pkce";
export type { GoogleProfile } from "./id-token";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
// Google's signing keys; jose caches them and refetches when Google rotates.
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

/** The OAuth client from .env, or null when "Continuar com o Google" is not set up. */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/auth/google/callback` };
}

/** Google's consent page for this login: identity only (openid, email, profile). */
export function authorizationUrl(
  config: GoogleConfig,
  { state, nonce, challenge }: { state: string; nonce: string; challenge: string },
): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Trades the one-time code for tokens (server to server, with the secret) and verifies the ID token. */
export async function signInProfile(
  config: GoogleConfig,
  { code, verifier, nonce }: { code: string; verifier: string; nonce: string },
): Promise<GoogleProfile> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // Only the status is logged by callers: the body may carry tokens.
  if (!response.ok) throw new Error(`Google token endpoint answered ${response.status}`);
  const tokens: unknown = await response.json();
  const idToken = typeof tokens === "object" && tokens && "id_token" in tokens ? tokens.id_token : null;
  if (typeof idToken !== "string") throw new Error("Google token response without id_token");
  return verifyGoogleIdToken(idToken, { clientId: config.clientId, nonce, keys: googleKeys });
}
