// Pure helpers for the OAuth 2.0 authorization code flow with PKCE (RFC 7636). Testable, no I/O.

/** Random base64url string with `bytes` bytes of entropy (state, nonce, code verifier). */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** S256 code challenge for a code verifier. */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function base64url(data: Uint8Array): string {
  return Buffer.from(data).toString("base64url");
}

/** Constant-time comparison, so a forged state cannot be guessed byte by byte. */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
