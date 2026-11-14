/**
 * Messages for /login?erro=<code>. The URL only ever carries one of these codes, never free text,
 * so a crafted link cannot put its own words on the login page.
 */
export const LOGIN_ERRORS = {
  cancelado: "Login com o Google cancelado. Quando quiser, é só tentar de novo.",
  rede: "Sem conexão com o Google. Confira a internet e tente de novo.",
  google: "Não foi possível entrar com o Google. Tente de novo em instantes.",
  expirou: "O login demorou demais ou foi aberto em outra aba. Tente de novo.",
  "email-nao-confirmado": "Seu e-mail do Google ainda não foi confirmado.",
  "conta-existe": "Já existe uma conta com esse e-mail. Entre com e-mail e senha.",
  "google-indisponivel": "O login com o Google ainda não foi configurado aqui. Use e-mail e senha.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export function loginErrorMessage(code: string | undefined): string | null {
  return code && Object.hasOwn(LOGIN_ERRORS, code) ? LOGIN_ERRORS[code as LoginErrorCode] : null;
}
