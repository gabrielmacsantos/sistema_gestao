import "server-only";
import { DomainError } from "../../errors";
import { buildNfceDraft, parserFor } from "./draft";
import { parseNfceQr, type NfceQr } from "./qrcode";

const FETCH_TIMEOUT_MS = 15_000;

function decode(buffer: ArrayBuffer, contentType: string | null): string {
  const headerCharset = contentType?.match(/charset=([\w-]+)/i)?.[1];
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const metaCharset = utf8.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (headerCharset ?? metaCharset ?? "utf-8").toLowerCase();
  if (charset === "utf-8" || charset === "utf8") return utf8;
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return utf8;
  }
}

async function fetchConsultationPage(qr: NfceQr): Promise<string | null> {
  const url = new URL(qr.url);
  // Only government portals: the URL comes from a user-supplied QR Code.
  if (!url.hostname.endsWith(".gov.br")) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; sistema-gestao/1.0)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok || !new URL(response.url).hostname.endsWith(".gov.br")) return null;
    return decode(await response.arrayBuffer(), response.headers.get("content-type"));
  } catch (error) {
    console.error(`NFC-e fetch failed for UF ${qr.uf}: ${(error as Error).name}`);
    return null;
  }
}

/** QR Code text -> draft. Falls back to the data embedded in the QR Code when the page can't be read. */
export async function readNfce(qrText: string) {
  const qr = parseNfceQr(qrText);
  if (!qr) {
    throw new DomainError("Esse QR Code não parece ser de uma NFC-e válida.");
  }

  const html = await fetchConsultationPage(qr);
  let page = null;
  if (html) {
    try {
      page = parserFor(qr.uf)(html);
    } catch (error) {
      console.error(`NFC-e parse failed for UF ${qr.uf}: ${(error as Error).message}`);
    }
  }
  return buildNfceDraft(qr, page);
}
