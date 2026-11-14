import "server-only";
import bcrypt from "bcryptjs";
import type { CategoryInput } from "@/lib/validation";
import { createCategories } from "../repositories/categories";
import type { GoogleProfile } from "../integrations/google-oauth";
import { createUser, findUserByEmail, findUserByGoogleSub } from "../repositories/users";
import { DomainError, isUniqueViolation } from "../errors";

const DEFAULT_CATEGORIES: CategoryInput[] = [
  { type: "EXPENSE", name: "Moradia", color: "#6366f1" },
  { type: "EXPENSE", name: "Alimentação", color: "#f59e0b" },
  { type: "EXPENSE", name: "Mercado", color: "#84cc16" },
  { type: "EXPENSE", name: "Transporte", color: "#06b6d4" },
  { type: "EXPENSE", name: "Saúde", color: "#ef4444" },
  { type: "EXPENSE", name: "Educação", color: "#8b5cf6" },
  { type: "EXPENSE", name: "Lazer", color: "#ec4899" },
  { type: "EXPENSE", name: "Assinaturas", color: "#14b8a6" },
  { type: "EXPENSE", name: "Contas e serviços", color: "#0ea5e9" },
  { type: "EXPENSE", name: "Compras", color: "#f97316" },
  { type: "EXPENSE", name: "Outros", color: "#64748b" },
  { type: "INCOME", name: "Salário", color: "#22c55e" },
  { type: "INCOME", name: "Renda extra", color: "#10b981" },
  { type: "INCOME", name: "Investimentos", color: "#0d9488" },
  { type: "INCOME", name: "Outros", color: "#64748b" },
];

export async function signUp(input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await createUser({ name: input.name, email: input.email, passwordHash });
    await createCategories(user.id, DEFAULT_CATEGORIES);
    return user;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("Já existe uma conta com esse e-mail.");
    throw error;
  }
}

/** Why a Google login was refused; the callback turns it into a code for the login page. */
export class GoogleSignInError extends DomainError {
  constructor(
    readonly reason: "email-unverified" | "email-taken",
    message: string,
  ) {
    super(message);
  }
}

/**
 * "Continuar com o Google": the account tied to this Google account (its "sub"), created on the
 * first login. It never takes over an existing e-mail account: sign-up here does not confirm
 * e-mails, so someone could have registered another person's address beforehand.
 */
export async function signInWithGoogle(profile: GoogleProfile): Promise<{ id: string }> {
  const linked = await findUserByGoogleSub(profile.sub);
  if (linked) return linked;
  if (!profile.emailVerified) {
    throw new GoogleSignInError("email-unverified", "Seu e-mail do Google ainda não foi confirmado.");
  }
  if (await findUserByEmail(profile.email)) {
    throw new GoogleSignInError("email-taken", "Já existe uma conta com esse e-mail. Entre com e-mail e senha.");
  }
  try {
    const user = await createUser({
      name: profile.name ?? profile.email.split("@")[0],
      email: profile.email,
      passwordHash: null,
      googleSub: profile.sub,
    });
    await createCategories(user.id, DEFAULT_CATEGORIES);
    return user;
  } catch (error) {
    // Two logins racing for the same new account: the other one created it.
    if (isUniqueViolation(error)) {
      const user = await findUserByGoogleSub(profile.sub);
      if (user) return user;
      throw new GoogleSignInError("email-taken", "Já existe uma conta com esse e-mail. Entre com e-mail e senha.");
    }
    throw error;
  }
}

let dummyHash: Promise<string> | undefined;

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  // Compare against a dummy hash too, so response time does not reveal whether the e-mail exists.
  dummyHash ??= bcrypt.hash("dummy-password", 12);
  const hash = user?.passwordHash ?? (await dummyHash);
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) throw new DomainError("E-mail ou senha incorretos.");
  return { id: user.id };
}
