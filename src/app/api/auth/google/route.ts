import { redirect } from "next/navigation";
import { authorizationUrl, codeChallenge, googleConfig, randomToken } from "@/server/integrations/google-oauth";
import { saveOAuthState } from "@/server/session";

/** "Continuar com o Google": remembers state, nonce and PKCE verifier, then sends the person to Google. */
export async function GET() {
  const config = googleConfig();
  if (!config) redirect("/login?erro=google-indisponivel");

  const state = randomToken();
  const nonce = randomToken(16);
  const verifier = randomToken(48);
  await saveOAuthState({ state, nonce, verifier });
  redirect(authorizationUrl(config, { state, nonce, challenge: await codeChallenge(verifier) }));
}
