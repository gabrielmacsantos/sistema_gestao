import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { listCategories } from "@/server/repositories/categories";
import { findTransaction, listTransactions } from "@/server/repositories/transactions";
import { signUp, verifyCredentials } from "@/server/services/auth";
import { setBudget } from "@/server/services/budgets";
import { confirmDrafts } from "@/server/services/imports";
import { ensureOccurrences, saveRecurring } from "@/server/services/recurring";
import { monthSummary } from "@/server/services/reports";
import { removeTransaction, saveTransaction } from "@/server/services/transactions";
import { currentMonth, monthRange, parseDateInput } from "@/lib/dates";

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
    await signUp({ name: "A", email, password: "senha-segura" });
    await expect(signUp({ name: "B", email, password: "outra-senha" })).rejects.toThrow(DomainError);
    await expect(verifyCredentials(email, "errada")).rejects.toThrow(DomainError);
    await expect(verifyCredentials(email, "senha-segura")).resolves.toHaveProperty("id");
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
