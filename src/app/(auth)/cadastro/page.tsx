import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { GoogleSignIn } from "../google-sign-in";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <>
      <GoogleSignIn />
      <AuthForm mode="signup" />
    </>
  );
}
