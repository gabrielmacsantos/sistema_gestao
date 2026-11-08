import { parseMoneyToCents } from "@/lib/money";

const UF_BY_CODE: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR",
  "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

export type NfceQr = {
  url: string;
  accessKey: string;
  uf: string;
  issuerTaxId: string;
  /** "YYYY-MM" from the access key. */
  issueMonth: string;
  /** Present in offline (contingency) and v1 QR codes. */
  day: number | null;
  totalCents: number | null;
};

/** Mod-11 check digit of the 44-digit access key (chave de acesso). */
export function isValidAccessKey(key: string): boolean {
  if (!/^\d{44}$/.test(key)) return false;
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const digit = rest < 2 ? 0 : 11 - rest;
  return digit === Number(key[43]);
}

function decodeHex(hex: string): string {
  try {
    return Buffer.from(hex, "hex").toString("utf8");
  } catch {
    return "";
  }
}

/**
 * Parses the text of an NFC-e QR Code. Supports v2/v3 (`?p=chave|versao|...`, online and offline)
 * and the legacy v1 format (`?chNFe=...&vNF=...&dhEmi=<hex>`).
 */
export function parseNfceQr(text: string): NfceQr | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  let accessKey: string | null = null;
  let day: number | null = null;
  let totalCents: number | null = null;

  const p = url.searchParams.get("p");
  if (p) {
    const parts = p.split("|");
    accessKey = parts[0];
    // Offline: chave|versao|ambiente|dia|valor|...
    if (parts.length >= 5 && /^\d{1,2}$/.test(parts[3]) && /^\d+(\.\d+)?$/.test(parts[4])) {
      day = Number(parts[3]);
      totalCents = parseMoneyToCents(parts[4]);
    }
  } else if (url.searchParams.get("chNFe")) {
    accessKey = url.searchParams.get("chNFe");
    const vNF = url.searchParams.get("vNF");
    if (vNF) totalCents = parseMoneyToCents(vNF);
    const dhEmi = decodeHex(url.searchParams.get("dhEmi") ?? "");
    const match = dhEmi.match(/^\d{4}-\d{2}-(\d{2})/);
    if (match) day = Number(match[1]);
  }

  if (!accessKey || !isValidAccessKey(accessKey)) return null;
  const uf = UF_BY_CODE[accessKey.slice(0, 2)];
  if (!uf) return null;

  return {
    url: url.toString(),
    accessKey,
    uf,
    issuerTaxId: accessKey.slice(6, 20),
    issueMonth: `20${accessKey.slice(2, 4)}-${accessKey.slice(4, 6)}`,
    day: day && day >= 1 && day <= 31 ? day : null,
    totalCents,
  };
}
