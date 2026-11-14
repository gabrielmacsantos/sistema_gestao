import type { Metadata } from "next";
import { param, type SearchParams } from "@/lib/search-params";
import { AuthForm } from "../auth-form";
import { GoogleSignIn } from "../google-sign-in";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <GoogleSignIn error={param(await searchParams, "erro")} />
      <AuthForm mode="login" />
    </>
  );
}
