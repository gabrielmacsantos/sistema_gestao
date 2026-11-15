import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getPendingVerification } from "@/server/session";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Confirmar e-mail" };

/** "ab***@gmail.com": enough to recognise the address without showing all of it. */
function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export default async function VerifyPage() {
  const userId = await getPendingVerification();
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;
  if (!user) redirect("/login");
  return <VerifyForm maskedEmail={maskEmail(user.email)} />;
}
