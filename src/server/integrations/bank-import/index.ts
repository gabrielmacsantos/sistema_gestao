import type { TransactionDraft } from "@/lib/validation";
import { CsvFormatError, parseCsv, type CsvSignMode } from "./csv";
import { parseOfx } from "./ofx";

export { CsvFormatError, type CsvSignMode };

/** Brazilian banks often export OFX/CSV in Windows-1252. */
export function decodeStatement(buffer: Buffer): string {
  const head = buffer.subarray(0, 512).toString("latin1");
  if (/CHARSET:\s*1252/i.test(head) || /encoding="(windows-1252|iso-8859-1)"/i.test(head)) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
}

export function parseStatement(fileName: string, content: string, signMode: CsvSignMode): TransactionDraft[] {
  const isOfx = /\.(ofx|qfx)$/i.test(fileName) || /<OFX>/i.test(content);
  return isOfx ? parseOfx(content) : parseCsv(content, signMode);
}
