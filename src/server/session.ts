import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";

export type SessionData = { userId?: string };

export const SESSION_COOKIE = "fin_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function getSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres no .env");
  }
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
