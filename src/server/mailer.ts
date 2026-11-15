import "server-only";
import { appendFile } from "node:fs/promises";

export type Mail = { to: string; subject: string; text: string };

/**
 * Sends an e-mail. For now there is no provider: in development the message is printed to the
 * server console (so the OTP can be read there), tests discard it, and production refuses to run
 * without a real transport rather than silently dropping the code. Plug SMTP in here later.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Envio de e-mail ainda não configurado.");
  }
  // Test hook (E2E): one JSON line per message in a file the test can read. Never used in production.
  if (process.env.MAIL_OUTBOX) {
    await appendFile(process.env.MAIL_OUTBOX, `${JSON.stringify(mail)}\n`);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.info(`[dev mail] para ${mail.to}\n${mail.subject}\n${mail.text}`);
  }
}

export function otpMail(to: string, code: string): Mail {
  return {
    to,
    subject: `Seu código de verificação: ${code}`,
    text: `Seu código para confirmar o e-mail é ${code}.\nEle vale por 10 minutos. Se não foi você, ignore esta mensagem.`,
  };
}
