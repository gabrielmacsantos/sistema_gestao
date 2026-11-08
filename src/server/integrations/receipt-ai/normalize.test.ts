import { describe, expect, it } from "vitest";
import { toDraft } from "./normalize";

describe("receipt normalization", () => {
  it("converts the model output into a draft", () => {
    const draft = toDraft(
      {
        is_receipt: true,
        merchant_name: "Farmácia Exemplo",
        merchant_tax_id: "11.222.333/0001-81",
        date: "2026-11-02",
        total: "57.30",
        payment_method: "Pix",
        items: [
          { description: "Dipirona", quantity: 2, unit_price: "8.65", total: "17.30" },
          { description: "Protetor solar", quantity: null, unit_price: null, total: "40.00" },
        ],
      },
      "user/photo.jpg",
    );
    expect(draft).toMatchObject({
      source: "RECEIPT_PHOTO",
      description: "Farmácia Exemplo",
      amountCents: 5730,
      date: "2026-11-02",
      merchantTaxId: "11222333000181",
      paymentMethod: "Pix",
      attachment: "user/photo.jpg",
      warnings: [],
    });
    expect(draft.items[1]).toMatchObject({ quantity: 1, totalCents: 4000, unitPriceCents: null });
  });

  it("warns instead of inventing missing data", () => {
    const draft = toDraft(
      {
        is_receipt: true,
        merchant_name: null,
        merchant_tax_id: null,
        date: "31/02/2026",
        total: null,
        payment_method: null,
        items: [{ description: "Café", quantity: 1, unit_price: null, total: "6.00" }],
      },
      null,
    );
    expect(draft.amountCents).toBe(600);
    expect(draft.date).toBeNull();
    expect(draft.warnings).toHaveLength(2);
  });

  it("returns an empty draft when the photo could not be read", () => {
    const draft = toDraft(null, null);
    expect(draft.amountCents).toBe(0);
    expect(draft.warnings).toHaveLength(1);
  });
});
