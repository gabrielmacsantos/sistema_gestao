import { parseDateInput } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import type { TransactionDraft } from "@/lib/validation";

function tag(block: string, name: string): string | null {
  // OFX 1.x is SGML: closing tags are optional, so read up to the next tag or line break.
  const match = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return match ? match[1].trim() : null;
}

/** Parses OFX (1.x SGML or 2.x XML) bank/credit card statements into drafts. */
export function parseOfx(content: string): TransactionDraft[] {
  const account = tag(content, "ACCTID") ?? "";
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  return blocks.flatMap((raw) => {
    const block = raw.split(/<\/STMTTRN>/i)[0];
    const amount = parseMoneyToCents(tag(block, "TRNAMT") ?? "");
    const posted = tag(block, "DTPOSTED") ?? "";
    if (amount === null || amount === 0 || !/^\d{8}/.test(posted)) return [];

    const dateValue = `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}`;
    const date = parseDateInput(dateValue) ? dateValue : null;
    const description = (tag(block, "MEMO") || tag(block, "NAME") || "Lançamento importado").slice(0, 120);
    const fitid = tag(block, "FITID");

    return [
      {
        source: "BANK_IMPORT" as const,
        type: amount < 0 ? ("EXPENSE" as const) : ("INCOME" as const),
        description,
        amountCents: Math.abs(amount),
        date,
        merchantName: null,
        merchantTaxId: null,
        paymentMethod: null,
        externalId: fitid ? `ofx:${account}:${fitid}`.slice(0, 100) : null,
        attachment: null,
        items: [],
        warnings: date ? [] : ["Data inválida no arquivo."],
        duplicate: false,
      },
    ];
  });
}
