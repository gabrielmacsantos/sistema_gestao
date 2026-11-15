import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { listCategories } from "@/server/repositories/categories";
import { findTransaction, listTransactions } from "@/server/repositories/transactions";
import { GoogleSignInError, signInWithGoogle, signUp, verifyCredentials } from "@/server/services/auth";
import { setBudget } from "@/server/services/budgets";
import { confirmDrafts } from "@/server/services/imports";
import { ensureOccurrences, saveRecurring } from "@/server/services/recurring";
import { expensesByCategory, forecastByCategory, monthlySeries, monthSummary } from "@/server/services/reports";
import { removeTransaction, saveTransaction, searchTransactions } from "@/server/services/transactions";
import { addMonths, currentMonth, monthRange, parseDateInput } from "@/lib/dates";
import { formatBRL } from "@/lib/money";

let alice: string;
let bob: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = (await signUp({ name: "Alice", email: `alice-${stamp}@test.dev`, password: "senha-segura" })).id;
  bob = (await signUp({ name: "Bob", email: `bob-${stamp}@test.dev`, password: "senha-segura" })).id;
});

const expense = (overrides = {}) => ({
  type: "EXPENSE" as const,
  description: "Mercado",
  amountCents: 15000,
  date: parseDateInput(`${currentMonth()}-01`)!,
  status: "PAID" as const,
  categoryId: null,
  paymentMethod: null,
  notes: null,
  ...overrides,
});

describe("auth", () => {
  it("creates default categories and rejects duplicate e-mails and wrong passwords", async () => {
    expect((await listCategories(alice)).length).toBeGreaterThan(5);
    const email = `dup-${Date.now()}@test.dev`;
    const created = await signUp({ name: "A", email, password: "senha-segura" });
    // An unconfirmed address can be claimed again, so confirm it first (see tests/verification.test.ts).
    await prisma.user.update({ where: { id: created.id }, data: { emailVerifiedAt: new Date() } });
    await expect(signUp({ name: "B", email, password: "outra-senha" })).rejects.toThrow(DomainError);
    await expect(verifyCredentials(email, "errada")).rejects.toThrow(DomainError);
    await expect(verifyCredentials(email, "senha-segura")).resolves.toHaveProperty("id");
  });
});

describe("Google sign-in", () => {
  const google = (overrides = {}) => ({
    sub: `g-${Date.now()}-${Math.random()}`,
    email: `google-${Date.now()}-${Math.random()}@gmail.com`,
    emailVerified: true,
    name: "Pessoa Google",
    ...overrides,
  });

  it("creates the account on the first login and finds it again by the Google sub", async () => {
    const profile = google();
    const first = await signInWithGoogle(profile);
    expect((await listCategories(first.id)).length).toBeGreaterThan(5);
    expect(await signInWithGoogle({ ...profile, name: "Outro nome" })).toEqual(first);
    const stored = await prisma.user.findUnique({ where: { id: first.id } });
    expect(stored).toMatchObject({ googleSub: profile.sub, email: profile.email, passwordHash: null });
  });

  it("keeps two Google accounts apart", async () => {
    const ana = await signInWithGoogle(google());
    const bia = await signInWithGoogle(google());
    expect(ana.id).not.toBe(bia.id);
    const tx = await saveTransaction(ana.id, expense());
    expect(await findTransaction(bia.id, tx!.id)).toBeNull();
  });

  it("never takes over an existing e-mail account", async () => {
    const email = `existente-${Date.now()}@gmail.com`;
    const owner = await signUp({ name: "Dona", email, password: "senha-segura" });
    const attempt = signInWithGoogle(google({ email }));
    await expect(attempt).rejects.toThrow(GoogleSignInError);
    await expect(attempt).rejects.toMatchObject({ reason: "email-taken" });
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toMatchObject({ googleSub: null });
  });

  it("refuses an e-mail Google has not confirmed", async () => {
    await expect(signInWithGoogle(google({ emailVerified: false }))).rejects.toMatchObject({ reason: "email-unverified" });
  });

  it("does not let a Google-only account in with any password", async () => {
    const profile = google();
    await signInWithGoogle(profile);
    await expect(verifyCredentials(profile.email, "")).rejects.toThrow(DomainError);
    await expect(verifyCredentials(profile.email, "qualquer-senha")).rejects.toThrow(DomainError);
  });
});

describe("multi-user isolation", () => {
  it("never exposes or changes another user's transaction", async () => {
    const tx = await saveTransaction(alice, expense());
    expect(await findTransaction(bob, tx!.id)).toBeNull();
    await expect(saveTransaction(bob, expense({ amountCents: 1 }), tx!.id)).rejects.toThrow(DomainError);
    await expect(removeTransaction(bob, tx!.id)).rejects.toThrow(DomainError);
    expect((await findTransaction(alice, tx!.id))?.amountCents).toBe(15000);

    const { start, end } = monthRange(currentMonth());
    expect((await listTransactions(bob, { start, end })).some((t) => t.id === tx!.id)).toBe(false);
  });

  it("searches only the user's own entries, even with the same text", async () => {
    const mine = await saveTransaction(alice, expense({ description: "Açaí da Praça Única", amountCents: 4590 }));
    const theirs = await saveTransaction(bob, expense({ description: "Açaí da Praça Única", amountCents: 4590 }));
    const { start, end } = monthRange(currentMonth());

    const found = await searchTransactions(alice, { start, end }, "acai praca unica");
    expect(found.map((t) => t.id)).toEqual([mine!.id]);
    expect((await searchTransactions(alice, { start, end }, "45,90")).some((t) => t.id === theirs!.id)).toBe(false);
    expect((await searchTransactions(bob, { start, end }, "unica")).map((t) => t.id)).toEqual([theirs!.id]);
  });

  it("rejects another user's category everywhere", async () => {
    const [bobCategory] = await listCategories(bob, "EXPENSE");
    await expect(saveTransaction(alice, expense({ categoryId: bobCategory.id }))).rejects.toThrow(DomainError);
    await expect(setBudget(alice, bobCategory.id, 1000)).rejects.toThrow(DomainError);
    await expect(
      confirmDrafts(alice, [
        {
          source: "BANK_IMPORT",
          type: "EXPENSE",
          description: "x",
          amountCents: 100,
          date: new Date(),
          categoryId: bobCategory.id,
          paymentMethod: null,
          merchantName: null,
          merchantTaxId: null,
          externalId: "csv:abc",
          attachment: null,
          items: [],
        },
      ]),
    ).rejects.toThrow(DomainError);
  });

  it("rejects attachments outside the user's folder", async () => {
    await expect(
      confirmDrafts(alice, [
        {
          source: "RECEIPT_PHOTO",
          type: "EXPENSE",
          description: "x",
          amountCents: 100,
          date: new Date(),
          categoryId: null,
          paymentMethod: null,
          merchantName: null,
          merchantTaxId: null,
          externalId: null,
          attachment: `${bob}/foto.jpg`,
          items: [],
        },
      ]),
    ).rejects.toThrow(DomainError);
  });
});

describe("imports", () => {
  it("does not duplicate an already imported externalId", async () => {
    const draft = {
      source: "NFCE" as const,
      type: "EXPENSE" as const,
      description: "Mercado",
      amountCents: 3253,
      date: new Date(),
      categoryId: null,
      paymentMethod: null,
      merchantName: null,
      merchantTaxId: null,
      externalId: `key-${Date.now()}`,
      attachment: null,
      items: [{ description: "Arroz", quantity: 1, unit: null, unitPriceCents: 3253, totalCents: 3253 }],
    };
    expect(await confirmDrafts(alice, [draft])).toEqual({ created: 1, skipped: 0 });
    expect(await confirmDrafts(alice, [draft])).toEqual({ created: 0, skipped: 1 });
    // The same note can still be imported by another user.
    expect(await confirmDrafts(bob, [draft])).toEqual({ created: 1, skipped: 0 });
  });
});

describe("month summary", () => {
  it("computes the free balance in integer cents and only from the user's own entries", async () => {
    const userId = (await signUp({ name: "Painel", email: `painel-${Date.now()}@test.dev`, password: "senha-segura" })).id;
    await saveTransaction(userId, expense({ type: "INCOME", description: "Salário", amountCents: 700000 }));
    await saveTransaction(userId, expense({ type: "INCOME", description: "Freela", amountCents: 150000, status: "PENDING" }));
    await saveTransaction(userId, expense({ amountCents: 400000 }));
    await saveTransaction(userId, expense({ amountCents: 82050, status: "PENDING" }));
    await saveTransaction(bob, expense({ type: "INCOME", amountCents: 999999 }));
    await saveTransaction(bob, expense({ amountCents: 123457 }));

    const summary = await monthSummary(userId, currentMonth());
    expect(summary.incomePaid + summary.incomePending).toBe(850000);
    expect(summary.expensePaid + summary.expensePending).toBe(482050);
    expect(summary.forecast).toBe(367950);
    expect(Object.values(summary).every(Number.isSafeInteger)).toBe(true);
    expect(formatBRL(summary.forecast)).toBe("R$ 3.679,50");
  });
});

describe("monthly series", () => {
  it("counts projected recurring entries in future months, like the month summary", async () => {
    const userId = (await signUp({ name: "Serie", email: `serie-${Date.now()}@test.dev`, password: "senha-segura" })).id;
    await saveRecurring(userId, {
      type: "INCOME",
      description: "Salário",
      amountCents: 720000,
      dayOfMonth: 5,
      startMonth: currentMonth(),
      endMonth: null,
      categoryId: null,
      paymentMethod: null,
    });
    await saveRecurring(bob, {
      type: "EXPENSE",
      description: "Aluguel",
      amountCents: 240000,
      dayOfMonth: 5,
      startMonth: currentMonth(),
      endMonth: null,
      categoryId: null,
      paymentMethod: null,
    });

    const future = addMonths(currentMonth(), 2);
    const series = await monthlySeries(userId, future);
    const summary = await monthSummary(userId, future);
    expect(series.at(-1)).toEqual({ month: future, income: 720000, expense: 0 });
    expect(series.at(-1)?.income).toBe(summary.incomePaid + summary.incomePending);
    expect(series.at(-2)?.income).toBe(720000);
  });
});

describe("distribution by category", () => {
  it("adds projected recurring expenses only to the dashboard's forecast base", async () => {
    const userId = (await signUp({ name: "Dist", email: `dist-${Date.now()}@test.dev`, password: "senha-segura" })).id;
    const [housing] = await listCategories(userId, "EXPENSE");
    await saveRecurring(userId, {
      type: "EXPENSE",
      description: "Aluguel",
      amountCents: 240000,
      dayOfMonth: 5,
      startMonth: currentMonth(),
      endMonth: null,
      categoryId: housing.id,
      paymentMethod: null,
    });

    const future = addMonths(currentMonth(), 1);
    expect(await forecastByCategory(userId, future)).toEqual([
      { categoryId: housing.id, name: housing.name, color: housing.color, totalCents: 240000 },
    ]);
    expect(await expensesByCategory(userId, future)).toEqual([]);
    expect((await monthSummary(userId, future)).expensePending).toBe(240000);
  });
});

describe("recurring", () => {
  it("generates one pending occurrence per month, idempotently, and respects removals", async () => {
    const userId = (await signUp({ name: "Rec", email: `rec-${Date.now()}@test.dev`, password: "senha-segura" })).id;
    await saveRecurring(userId, {
      type: "EXPENSE",
      description: "Aluguel",
      amountCents: 200000,
      dayOfMonth: 31,
      startMonth: currentMonth(),
      endMonth: null,
      categoryId: null,
      paymentMethod: null,
    });

    await ensureOccurrences(userId);
    await ensureOccurrences(userId);
    const { start, end } = monthRange(currentMonth());
    const occurrences = await listTransactions(userId, { start, end });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({ status: "PENDING", source: "RECURRING", amountCents: 200000 });

    expect((await monthSummary(userId, currentMonth())).expensePending).toBe(200000);

    await removeTransaction(userId, occurrences[0].id);
    await ensureOccurrences(userId);
    expect(await listTransactions(userId, { start, end })).toHaveLength(0);
    expect(await prisma.transaction.count({ where: { userId, status: "SKIPPED" } })).toBe(1);
  });
});
