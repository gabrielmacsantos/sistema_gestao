import "server-only";
import { cookies } from "next/headers";
import { getIronSession, sealData, unsealData } from "iron-session";

export type SessionData = { userId?: string };

export const SESSION_COOKIE = "fin_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sessionPassword() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres no .env");
  }
  return password;
}

export async function getSession() {
  const password = sessionPassword();
  return getIronSession<SessionData>(await cookies(), {
    password,
    cookieName: SESSION_COOKIE,
    ttl: THIRTY_DAYS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      // Off by default so the app also works over plain HTTP on the local network (e.g. from a phone).
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: THIRTY_DAYS,
    },
  });
}

// "Continuar com o Google" keeps state, nonce and PKCE verifier between leaving for Google and
// coming back, encrypted in a short cookie only the callback reads (and deletes).
export type OAuthState = { state: string; nonce: string; verifier: string };
const OAUTH_COOKIE = "fin_oauth";
const OAUTH_TTL = 60 * 10;
const OAUTH_PATH = "/api/auth/google";

export async function saveOAuthState(data: OAuthState) {
  const sealed = await sealData(data, { password: sessionPassword(), ttl: OAUTH_TTL });
  (await cookies()).set(OAUTH_COOKIE, sealed, {
    httpOnly: true,
    sameSite: "lax", // sent on the top-level redirect back from Google
    secure: process.env.COOKIE_SECURE === "true",
    path: OAUTH_PATH,
    maxAge: OAUTH_TTL,
  });
}

/** The saved state, once: the cookie is deleted. Null when missing, tampered with or expired. */
export async function takeOAuthState(): Promise<OAuthState | null> {
  const store = await cookies();
  const sealed = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: OAUTH_PATH });
  if (!sealed) return null;
  try {
    const data = await unsealData<Partial<OAuthState>>(sealed, { password: sessionPassword(), ttl: OAUTH_TTL });
    return data.state && data.nonce && data.verifier ? { state: data.state, nonce: data.nonce, verifier: data.verifier } : null;
  } catch {
    return null;
  }
}

// Between sign-up (or a sign-in with an unconfirmed e-mail) and typing the code there is no session
// yet. This short sealed cookie says whose code is being entered; it grants nothing else.
const VERIFY_COOKIE = "fin_verify";
const VERIFY_TTL = 60 * 30;
const VERIFY_PATH = "/verificar";

export async function savePendingVerification(userId: string) {
  const sealed = await sealData({ userId }, { password: sessionPassword(), ttl: VERIFY_TTL });
  (await cookies()).set(VERIFY_COOKIE, sealed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: VERIFY_PATH,
    maxAge: VERIFY_TTL,
  });
}

/** The user whose code is pending, or null when the cookie is missing, tampered with or expired. */
export async function getPendingVerification(): Promise<string | null> {
  const sealed = (await cookies()).get(VERIFY_COOKIE)?.value;
  if (!sealed) return null;
  try {
    const data = await unsealData<{ userId?: string }>(sealed, { password: sessionPassword(), ttl: VERIFY_TTL });
    return data.userId ?? null;
  } catch {
    return null;
  }
}

export async function clearPendingVerification() {
  (await cookies()).delete({ name: VERIFY_COOKIE, path: VERIFY_PATH });
}
