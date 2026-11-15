import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSession } from "./session";

export type CurrentUser = { id: string; name: string; email: string };

/**
 * Data Access Layer entry point: the only place that turns the session cookie into a user.
 * Every page, action and route handler gets the userId from here, never from the client.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });
  // Sessions are only opened after the e-mail is confirmed; this is a second lock.
  if (!user?.emailVerifiedAt) redirect("/login");

  return { id: user.id, name: user.name, email: user.email };
});

export async function requireUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
