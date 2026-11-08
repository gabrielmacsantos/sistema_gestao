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
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/login");

  return user;
});

export async function requireUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
