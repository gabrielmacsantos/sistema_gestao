import { expect, startLocal, test } from "./support";

const trigger = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Atalhos rápidos: chat de lançamentos e calculadora" });

test("leaving the sample from Lançamentos keeps Lançamentos behind the form", async ({ page }) => {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await page.goto("/#/lancamentos");
  await expect(page.getByRole("heading", { name: "Lançamentos", level: 1 })).toBeVisible();

  await page.locator('main [data-act="new-tx"]').first().click();
  await page.getByRole("dialog", { name: "Sair do exemplo?" }).getByRole("button", { name: /Sair do exemplo e continuar/ }).click();

  // The form opens over the same screen, not over the Painel.
  await expect(page.getByRole("dialog", { name: /Novo gasto|Nova entrada/ })).toBeVisible();
  await expect(page).toHaveURL(/#\/lancamentos/);
  await expect(page.getByRole("heading", { name: "Lançamentos", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auditoria & Ritmo Mensal" })).toHaveCount(0);
  // The sample is gone from the list behind it.
  await expect(page.getByText("Aluguel")).toHaveCount(0);
});

test("the chat hint follows the chosen option and every option can be undone", async ({ page }) => {
  await startLocal(page);
  await trigger(page).click();
  await page.getByRole("button", { name: /Chat de lançamentos/ }).click();
  const chat = page.getByRole("dialog", { name: "Chat de lançamentos" });
  const field = chat.getByLabel("Escreva o lançamento");
  await expect(field).toHaveAttribute("placeholder", "Ex.: gastei 45,90 no almoço ou recebi 2500");

  await chat.getByRole("button", { name: "Registrar despesa" }).click();
  await expect(field).toHaveAttribute("placeholder", "Ex.: gastei 45,90 no almoço hoje");
  await expect(chat.getByRole("button", { name: "Voltar e escolher outra opção" })).toBeVisible();

  await chat.getByRole("button", { name: "Voltar e escolher outra opção" }).click();
  await expect(field).toHaveAttribute("placeholder", "Ex.: gastei 45,90 no almoço ou recebi 2500");
  await expect(chat.getByRole("button", { name: "Registrar receita" })).toBeVisible();

  await chat.getByRole("button", { name: "Registrar receita" }).click();
  await expect(field).toHaveAttribute("placeholder", "Ex.: recebi 2.500 de salário hoje");

  // Asking for the amount: the hint becomes an amount, and "Voltar ao início" offers the options again.
  await field.fill("almoço");
  await field.press("Enter");
  await expect(field).toHaveAttribute("placeholder", "Ex.: 45,90");
  await chat.getByRole("button", { name: "Voltar ao início" }).click();
  await expect(chat.getByRole("button", { name: "Registrar despesa" })).toBeVisible();
  await expect(field).toHaveAttribute("placeholder", "Ex.: gastei 45,90 no almoço ou recebi 2500");
});

test("the fixed-expense form has the voice assistant and fills the fields from what is said", async ({ page }) => {
  await page.addInitScript(() => {
    // A fake speech service that "hears" one sentence as soon as it starts.
    class FakeRec {
      lang = ""; interimResults = false; continuous = false; maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: ((e: unknown) => void) | null = null;
      start() {
        setTimeout(() => { this.onresult?.({ results: [[{ transcript: "aluguel 1200 todo dia 8" }]] }); this.onend?.(); }, 50);
      }
      stop() {} abort() {}
    }
    Object.assign(window, { SpeechRecognition: FakeRec, webkitSpeechRecognition: FakeRec });
    localStorage.setItem("mf-voice-ok", "1");
  });
  await startLocal(page);
  await page.goto("/#/fixos");
  await page.getByRole("button", { name: /Novo fixo/ }).click();
  const form = page.getByRole("dialog", { name: "Novo gasto fixo" });
  const card = form.locator("#voice-slot .va-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Assistente de voz");
  await expect(card).toContainText("Qual gasto fixo você quer cadastrar?");
  await expect(card).toContainText("Aluguel 1200 todo dia 5");

  await form.getByRole("radio", { name: "Receita" }).click();
  await expect(card).toContainText("Qual receita fixa você quer cadastrar?");
  await form.getByRole("radio", { name: "Despesa" }).click();

  await card.locator(".va-mic").click();
  await expect(form.getByLabel("Descrição")).toHaveValue("Aluguel");
  await expect(form.getByLabel("Valor mensal")).toHaveValue("1.200,00");
  await expect(form.getByLabel("Dia do vencimento")).toHaveValue("8");
  await expect(card).toContainText("Confira os campos antes de salvar.");

  // Nothing is saved by voice alone: the person still taps Salvar.
  await form.getByRole("button", { name: /Salvar|Cadastrar/ }).click();
  await expect(page.getByText("Gasto fixo cadastrado.")).toBeVisible();
});

test("editing a fixed expense shows no voice card", async ({ page }) => {
  await startLocal(page);
  await page.getByRole("button", { name: /Ver com dados de exemplo/ }).click();
  await page.goto("/#/fixos");
  await page.locator('[data-act="edit-rec"]').first().click();
  await expect(page.getByRole("dialog", { name: "Editar gasto fixo" })).toBeVisible();
  await expect(page.locator("#voice-slot")).toHaveCount(0);
});
