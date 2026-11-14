import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { LoginErrorCode } from "@/lib/login-errors";
import { googleConfig, sameToken, signInProfile } from "@/server/integrations/google-oauth";
import { GoogleSignInError, signInWithGoogle } from "@/server/services/auth";
import { getSession, takeOAuthState } from "@/server/session";

const fail = (code: LoginErrorCode): never => redirect(`/login?erro=${code}`);

/** Errors that mean "could not reach Google" rather than "Google said no". */
function isNetworkError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  return ["TypeError", "AbortError", "TimeoutError", "JWKSTimeout"].includes(name);
}

/**
 * Google sends the person back here. The state must match the one saved when they left; the
 * code is traded for an ID token on the server, and the account comes from its verified "sub".
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = await takeOAuthState();

  const error = params.get("error");
  if (error) fail(error === "access_denied" ? "cancelado" : "google");
  const config = googleConfig();
  if (!config) fail("google-indisponivel");
  const code = params.get("code");
  const state = params.get("state");
  if (!config || !saved || !code || !state || !sameToken(state, saved.state)) return fail("expirou");

  let userId: string;
  try {
    const profile = await signInProfile(config, { code, verifier: saved.verifier, nonce: saved.nonce });
    userId = (await signInWithGoogle(profile)).id;
  } catch (e) {
    if (e instanceof GoogleSignInError) return fail(e.reason === "email-taken" ? "conta-existe" : "email-nao-confirmado");
    // Only the error type goes to the log: messages may carry token details.
    console.error("Google sign-in failed:", e instanceof Error ? e.name : typeof e);
    return fail(isNetworkError(e) ? "rede" : "google");
  }

  const session = await getSession();
  session.userId = userId;
  await session.save();
  redirect("/dashboard");
}
