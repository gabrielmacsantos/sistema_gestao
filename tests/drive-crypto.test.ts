import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The crypto lives inside the static index.html; load the marked blocks (it uses hasValidMoney) and evaluate them.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const block = (name: string) => {
  const code = new RegExp(`// <${name}>.*\\r?\\n([\\s\\S]*?)// </${name}>`).exec(html)?.[1];
  if (!code) throw new Error(`${name} block not found in index.html`);
  return code;
};
const api = new Function(
  `${block("money-check")}\n${block("drive-crypto")}\n${block("sync-state")}
   return { deriveDriveKey, newDriveSalt, exportDriveKey, importDriveKey, driveFileFormat, driveKeyParams, sealDriveState, openDriveState,
            sealBytes, openBytes, photoAad, passphraseProblem, syncDecision, describeLastSync, DRIVE_MIN_PASSPHRASE,
            newDataKey, wrapDataKey, unwrapDataKey, makePasswordWrap, makeRecoveryWrap, newRecoveryKey, formatRecoveryKey, parseRecoveryKey,
            sealDriveState3, openDriveState3, driveWraps, unlockDrive3, importRecoveryKey };`,
)() as {
  deriveDriveKey: (p: string, salt: string, iter?: number) => Promise<CryptoKey>;
  newDriveSalt: () => string;
  exportDriveKey: (k: CryptoKey) => Promise<string>;
  importDriveKey: (b64: string) => Promise<CryptoKey>;
  driveFileFormat: (text: string) => string;
  driveKeyParams: (text: string) => { salt: string; iter: number };
  sealDriveState: (s: object, k: CryptoKey, salt: string, sub: string, iter?: number) => Promise<string>;
  openDriveState: (text: string, k: CryptoKey, sub: string) => Promise<{ savedAt: number; data: any }>;
  sealBytes: (b: ArrayBuffer | Uint8Array, k: CryptoKey, aad: Uint8Array) => Promise<Uint8Array>;
  openBytes: (b: Uint8Array, k: CryptoKey, aad: Uint8Array) => Promise<ArrayBuffer>;
  photoAad: (sub: string, id: string) => Uint8Array;
  passphraseProblem: (p: string) => string | null;
  syncDecision: (local: number, remote: number, base?: number | null) => string;
  describeLastSync: (at: number | null, now?: number) => string;
  DRIVE_MIN_PASSPHRASE: number;
  newDataKey: () => Promise<CryptoKey>;
  wrapDataKey: (dk: CryptoKey, kek: CryptoKey, sub: string, kind: string) => Promise<{ iv: string; data: string }>;
  unwrapDataKey: (w: unknown, kek: CryptoKey, sub: string, kind: string) => Promise<CryptoKey>;
  makePasswordWrap: (dk: CryptoKey, pass: string, sub: string, iter?: number) => Promise<{ salt: string; iter: number; wrapPass: { iv: string; data: string } }>;
  makeRecoveryWrap: (dk: CryptoKey, bytes: Uint8Array, sub: string, at?: number) => Promise<{ iv: string; data: string; at: number }>;
  newRecoveryKey: () => { bytes: Uint8Array; text: string };
  formatRecoveryKey: (bytes: Uint8Array) => string;
  parseRecoveryKey: (text: string) => Uint8Array;
  sealDriveState3: (s: object, dk: CryptoKey, sub: string, header: object) => Promise<string>;
  openDriveState3: (text: string, dk: CryptoKey, sub: string) => Promise<{ savedAt: number; data: any }>;
  driveWraps: (text: string) => { salt: string; iter: number; wrapPass: object; wrapRec: object | null };
  unlockDrive3: (text: string, how: { passphrase?: string; recoveryBytes?: Uint8Array }, sub: string) => Promise<{ dk: CryptoKey; wraps: object; result: { savedAt: number; data: any } }>;
  importRecoveryKey: (b: Uint8Array) => Promise<CryptoKey>;
};

const ITER = 1000; // tests only: the app uses 310,000
const state = {
  version: 1, savedAt: 1731600000000, categories: [],
  transactions: [{ id: "t1", description: "Mercado do Zé", amountCents: 12345678 }, { id: "t2", description: "Café", amountCents: 450 }],
  recurrings: [], budgets: [], goals: [{ id: "g1", targetCents: 2000000, savedCents: 640000 }], trips: [],
};
const keyFor = async (pass: string, salt = api.newDriveSalt()) => ({ key: await api.deriveDriveKey(pass, salt, ITER), salt });

describe("encrypted Drive file", () => {
  it("scenario 1: nothing financial leaves the device in clear text, and cents stay integers", async () => {
    const { key, salt } = await keyFor("correct horse battery");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    for (const secret of ["12345678", "Mercado", "2000000", "640000", "amountCents", "transactions", "Café"]) expect(text).not.toContain(secret);
    expect(JSON.parse(text)).toMatchObject({ app: "minhas-financas", format: "drive-2", savedAt: 1731600000000, iter: ITER });
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(["app", "data", "format", "iter", "iv", "kdf", "salt", "savedAt"]);
  });

  it("scenario 2: a new device restores everything exactly from the password", async () => {
    const { key, salt } = await keyFor("correct horse battery");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    // New device: only the file, the account id and the password are known.
    const { salt: fileSalt, iter } = api.driveKeyParams(text);
    const restored = await api.openDriveState(text, await api.deriveDriveKey("correct horse battery", fileSalt, iter), "sub-111");
    expect(restored.savedAt).toBe(1731600000000);
    expect(restored.data).toEqual(state);
    expect(restored.data.transactions.every((t: { amountCents: number }) => Number.isInteger(t.amountCents))).toBe(true);
  });

  it("round-trips through an exported and re-imported key (the one kept on the device)", async () => {
    const { key, salt } = await keyFor("another passphrase");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    const again = await api.importDriveKey(await api.exportDriveKey(key));
    expect((await api.openDriveState(text, again, "sub-111")).data).toEqual(state);
  });

  it("refuses a wrong password", async () => {
    const { key, salt } = await keyFor("right password!");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    const wrong = await api.deriveDriveKey("wrong password!", salt, ITER);
    await expect(api.openDriveState(text, wrong, "sub-111")).rejects.toMatchObject({ badKey: true });
  });

  it("is tied to the account: the same file does not open for another user", async () => {
    const { key, salt } = await keyFor("right password!");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    await expect(api.openDriveState(text, key, "sub-222")).rejects.toMatchObject({ badKey: true });
  });

  it("detects tampering with the ciphertext and with the timestamp", async () => {
    const { key, salt } = await keyFor("right password!");
    const file = JSON.parse(await api.sealDriveState(state, key, salt, "sub-111", ITER));
    const flipped = { ...file, data: (file.data[0] === "A" ? "B" : "A") + file.data.slice(1) };
    await expect(api.openDriveState(JSON.stringify(flipped), key, "sub-111")).rejects.toThrow();
    await expect(api.openDriveState(JSON.stringify({ ...file, savedAt: file.savedAt + 1 }), key, "sub-111")).rejects.toMatchObject({ badKey: true });
  });

  it("uses a fresh iv every time", async () => {
    const { key, salt } = await keyFor("right password!");
    const a = JSON.parse(await api.sealDriveState(state, key, salt, "sub-111", ITER));
    const b = JSON.parse(await api.sealDriveState(state, key, salt, "sub-111", ITER));
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("refuses decrypted data whose amounts are not integer cents", async () => {
    const { key, salt } = await keyFor("right password!");
    const bad = { ...state, transactions: [{ id: "t1", amountCents: 45.9 }] };
    const text = await api.sealDriveState(bad, key, salt, "sub-111", ITER);
    await expect(api.openDriveState(text, key, "sub-111")).rejects.toThrow("Arquivo de dados inválido.");
  });

  it("tells an encrypted file from the older plain one and bounds the key-derivation cost", async () => {
    expect(api.driveFileFormat(JSON.stringify({ app: "minhas-financas", format: "drive-3" }))).toBe("drive-3");
    const { key, salt } = await keyFor("right password!");
    const text = await api.sealDriveState(state, key, salt, "sub-111", ITER);
    expect(api.driveFileFormat(text)).toBe("drive-2");
    expect(api.driveFileFormat(JSON.stringify({ app: "minhas-financas", format: "drive-1", state }))).toBe("drive-1");
    expect(() => api.driveFileFormat(JSON.stringify({ app: "other" }))).toThrow("Arquivo de dados inválido.");
    for (const iter of [0, 5, 1.5, 50_000_000]) {
      expect(() => api.driveKeyParams(JSON.stringify({ ...JSON.parse(text), iter }))).toThrow("Arquivo de dados inválido.");
    }
  });
});

describe("encrypted photos", () => {
  it("round-trips bytes and does not open for another account or another photo", async () => {
    const { key } = await keyFor("right password!");
    const bytes = new Uint8Array([1, 2, 3, 250, 251, 252]);
    const sealed = await api.sealBytes(bytes, key, api.photoAad("sub-111", "p1"));
    expect(Array.from(new Uint8Array(await api.openBytes(sealed, key, api.photoAad("sub-111", "p1"))))).toEqual([1, 2, 3, 250, 251, 252]);
    await expect(api.openBytes(sealed, key, api.photoAad("sub-222", "p1"))).rejects.toThrow();
    await expect(api.openBytes(sealed, key, api.photoAad("sub-111", "p2"))).rejects.toThrow();
  });
});

describe("passphraseProblem", () => {
  it("requires at least the minimum length", () => {
    expect(api.passphraseProblem("123456789")).toBe(`Use pelo menos ${api.DRIVE_MIN_PASSPHRASE} caracteres.`);
    expect(api.passphraseProblem("1234567890")).toBeNull();
  });
});

describe("syncDecision", () => {
  it("does nothing when both sides are the same", () => {
    expect(api.syncDecision(100, 100, 100)).toBe("none");
    expect(api.syncDecision(100, 100, null)).toBe("none");
  });
  it("sends when only this device changed, takes when only the cloud changed", () => {
    expect(api.syncDecision(200, 100, 100)).toBe("push");
    expect(api.syncDecision(100, 200, 100)).toBe("pull");
  });
  it("asks the person when both changed since the last agreement", () => {
    expect(api.syncDecision(200, 300, 100)).toBe("conflict");
  });
  it("lets the newer win when there is no base yet (sessions from before)", () => {
    expect(api.syncDecision(200, 100, null)).toBe("push");
    expect(api.syncDecision(100, 200, undefined)).toBe("pull");
  });
});

describe("describeLastSync", () => {
  // 2026-11-17 15:30 in São Paulo (UTC-3)
  const now = Date.UTC(2026, 10, 17, 18, 30);
  it("says today, yesterday or the date, with the São Paulo time", () => {
    expect(api.describeLastSync(now, now)).toBe("Sincronizado hoje às 15:30");
    expect(api.describeLastSync(now - 24 * 3600_000, now)).toBe("Sincronizado ontem às 15:30");
    expect(api.describeLastSync(Date.UTC(2026, 10, 12, 13, 5), now)).toBe("Sincronizado em 12/11 às 10:05");
  });
  it("handles never synced", () => {
    expect(api.describeLastSync(null, now)).toBe("Ainda não sincronizado");
  });
  it("uses São Paulo's calendar day, not UTC's", () => {
    // 01:00 UTC on the 18th is still the 17th at 22:00 in São Paulo.
    expect(api.describeLastSync(Date.UTC(2026, 10, 18, 1, 0), Date.UTC(2026, 10, 18, 2, 0))).toBe("Sincronizado hoje às 22:00");
  });
});

// ---- drive-3: data key wrapped by the password and by the recovery key ----
const SUB = "sub-111";
/** A drive-3 file as the app writes it, with or without a recovery key. */
async function makeFile3(pass: string, opts: { recovery?: boolean; sub?: string; st?: object } = {}) {
  const sub = opts.sub ?? SUB, dk = await api.newDataKey();
  const pw = await api.makePasswordWrap(dk, pass, sub, ITER);
  const rec = opts.recovery ? api.newRecoveryKey() : null;
  const wrapRec = rec ? await api.makeRecoveryWrap(dk, rec.bytes, sub) : null;
  const text = await api.sealDriveState3(opts.st ?? state, dk, sub, { ...pw, wrapRec });
  return { dk, pw, rec, text };
}

describe("recovery key text", () => {
  it("is 54 characters in 9 groups of 6 and round-trips the 32 bytes", () => {
    const { bytes, text } = api.newRecoveryKey();
    expect(text).toMatch(/^([0-9A-HJKMNP-TV-Z]{6}-){8}[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(Array.from(api.parseRecoveryKey(text))).toEqual(Array.from(bytes));
  });
  it("is read in any case, with or without dashes and spaces", () => {
    const { bytes, text } = api.newRecoveryKey();
    expect(Array.from(api.parseRecoveryKey(text.toLowerCase().replace(/-/g, " ")))).toEqual(Array.from(bytes));
    expect(Array.from(api.parseRecoveryKey(text.replace(/-/g, "")))).toEqual(Array.from(bytes));
  });
  it("catches a mistyped character, a missing one and garbage before trying anything", () => {
    const { text } = api.newRecoveryKey();
    const raw = text.replace(/-/g, "");
    const swap = raw[0] === "A" ? "B" : "A";
    expect(() => api.parseRecoveryKey(swap + raw.slice(1))).toThrow(expect.objectContaining({ badFormat: true }));
    expect(() => api.parseRecoveryKey(raw.slice(1))).toThrow(expect.objectContaining({ badFormat: true }));
    expect(() => api.parseRecoveryKey("")).toThrow(expect.objectContaining({ badFormat: true }));
    expect(() => api.parseRecoveryKey("U".repeat(54))).toThrow(expect.objectContaining({ badFormat: true }));
  });
  it("is different every time", () => {
    expect(api.newRecoveryKey().text).not.toBe(api.newRecoveryKey().text);
  });
});

describe("drive-3 file", () => {
  it("holds no financial value in clear text and only the expected fields", async () => {
    const { text } = await makeFile3("right password!", { recovery: true });
    for (const secret of ["12345678", "Mercado", "2000000", "640000", "amountCents", "transactions", "Café"]) expect(text).not.toContain(secret);
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(["app", "data", "format", "iter", "iv", "kdf", "salt", "savedAt", "wrapPass", "wrapRec"]);
  });

  it("opens with the password, restoring everything in integer cents", async () => {
    const { text } = await makeFile3("right password!");
    const opened = await api.unlockDrive3(text, { passphrase: "right password!" }, SUB);
    expect(opened.result.data).toEqual(state);
    expect(opened.result.data.transactions.every((t: { amountCents: number }) => Number.isInteger(t.amountCents))).toBe(true);
  });

  it("opens with the recovery key when the password is forgotten", async () => {
    const { text, rec } = await makeFile3("right password!", { recovery: true });
    const opened = await api.unlockDrive3(text, { recoveryBytes: api.parseRecoveryKey(rec!.text) }, SUB);
    expect(opened.result.data).toEqual(state);
  });

  it("refuses a wrong password, a wrong recovery key and an account without a recovery key", async () => {
    const { text } = await makeFile3("right password!", { recovery: true });
    await expect(api.unlockDrive3(text, { passphrase: "wrong password!" }, SUB)).rejects.toMatchObject({ badKey: true });
    await expect(api.unlockDrive3(text, { recoveryBytes: api.newRecoveryKey().bytes }, SUB)).rejects.toMatchObject({ badKey: true });
    const plain = await makeFile3("right password!");
    await expect(api.unlockDrive3(plain.text, { recoveryBytes: api.newRecoveryKey().bytes }, SUB)).rejects.toMatchObject({ noRecovery: true });
  });

  it("is tied to the account, for the password and the recovery key", async () => {
    const { text, rec } = await makeFile3("right password!", { recovery: true });
    await expect(api.unlockDrive3(text, { passphrase: "right password!" }, "sub-222")).rejects.toMatchObject({ badKey: true });
    await expect(api.unlockDrive3(text, { recoveryBytes: rec!.bytes }, "sub-222")).rejects.toMatchObject({ badKey: true });
  });

  it("does not let a wrap of one kind stand in for the other", async () => {
    const { text } = await makeFile3("right password!", { recovery: true });
    const f = JSON.parse(text);
    const swapped = JSON.stringify({ ...f, wrapPass: { iv: f.wrapRec.iv, data: f.wrapRec.data } });
    await expect(api.unlockDrive3(swapped, { passphrase: "right password!" }, SUB)).rejects.toMatchObject({ badKey: true });
  });

  it("detects tampering with the data and with the timestamp", async () => {
    const { text, dk } = await makeFile3("right password!");
    const f = JSON.parse(text);
    await expect(api.openDriveState3(JSON.stringify({ ...f, savedAt: f.savedAt + 1 }), dk, SUB)).rejects.toMatchObject({ badKey: true });
    const flipped = { ...f, data: (f.data[0] === "A" ? "B" : "A") + f.data.slice(1) };
    await expect(api.openDriveState3(JSON.stringify(flipped), dk, SUB)).rejects.toThrow();
  });

  it("changing the password only re-wraps the data key: the same data and photos still open", async () => {
    const { dk, text } = await makeFile3("old password!!");
    const photo = await api.sealBytes(new Uint8Array([9, 8, 7]), dk, api.photoAad(SUB, "p1"));
    // The person proves the old password and picks a new one: only wrapPass changes.
    const opened = await api.unlockDrive3(text, { passphrase: "old password!!" }, SUB);
    const next = await api.makePasswordWrap(opened.dk, "new password!!", SUB, ITER);
    const text2 = await api.sealDriveState3(state, opened.dk, SUB, { ...next, wrapRec: null });
    await expect(api.unlockDrive3(text2, { passphrase: "old password!!" }, SUB)).rejects.toMatchObject({ badKey: true });
    const again = await api.unlockDrive3(text2, { passphrase: "new password!!" }, SUB);
    expect(again.result.data).toEqual(state);
    expect(Array.from(new Uint8Array(await api.openBytes(photo, again.dk, api.photoAad(SUB, "p1"))))).toEqual([9, 8, 7]);
  });

  it("recovering without the old password lets the person set a new one, keeping the data and the recovery key", async () => {
    const { text, rec } = await makeFile3("forgotten pass", { recovery: true });
    const opened = await api.unlockDrive3(text, { recoveryBytes: rec!.bytes }, SUB);
    const next = await api.makePasswordWrap(opened.dk, "brand new pass", SUB, ITER);
    const text2 = await api.sealDriveState3(opened.result.data, opened.dk, SUB, { ...next, wrapRec: (opened.wraps as { wrapRec: object }).wrapRec });
    expect((await api.unlockDrive3(text2, { passphrase: "brand new pass" }, SUB)).result.data).toEqual(state);
    expect((await api.unlockDrive3(text2, { recoveryBytes: rec!.bytes }, SUB)).result.data).toEqual(state);
    await expect(api.unlockDrive3(text2, { passphrase: "forgotten pass" }, SUB)).rejects.toMatchObject({ badKey: true });
  });

  it("a new recovery key replaces the old one", async () => {
    const first = await makeFile3("right password!", { recovery: true });
    const second = api.newRecoveryKey();
    const f = JSON.parse(first.text);
    const text2 = await api.sealDriveState3(state, first.dk, SUB, { salt: f.salt, iter: f.iter, wrapPass: f.wrapPass, wrapRec: await api.makeRecoveryWrap(first.dk, second.bytes, SUB) });
    await expect(api.unlockDrive3(text2, { recoveryBytes: first.rec!.bytes }, SUB)).rejects.toMatchObject({ badKey: true });
    expect((await api.unlockDrive3(text2, { recoveryBytes: second.bytes }, SUB)).result.data).toEqual(state);
  });

  it("migrating from drive-2 keeps the password: the old derived key is the key of the password wrap", async () => {
    const salt = "AAAAAAAAAAAAAAAAAAAAAA==";
    const oldKey = await api.deriveDriveKey("same password!", salt, ITER); // what a drive-2 session holds
    const dk = await api.newDataKey();
    const wrapPass = await api.wrapDataKey(dk, oldKey, SUB, "pass");
    const text = await api.sealDriveState3(state, dk, SUB, { salt, iter: ITER, wrapPass, wrapRec: null });
    expect((await api.unlockDrive3(text, { passphrase: "same password!" }, SUB)).result.data).toEqual(state);
    const viaOldKey = await api.unwrapDataKey(api.driveWraps(text).wrapPass, oldKey, SUB, "pass");
    expect((await api.openDriveState3(text, viaOldKey, SUB)).data).toEqual(state);
  });

  it("bounds the key-derivation cost and checks the wraps' shape", async () => {
    const { text } = await makeFile3("right password!");
    for (const patch of [{ iter: 5 }, { iter: 50_000_000 }, { wrapPass: null }, { wrapPass: { iv: 1, data: 2 } }, { salt: 7 }]) {
      expect(() => api.driveWraps(JSON.stringify({ ...JSON.parse(text), ...patch }))).toThrow("Arquivo de dados inválido.");
    }
  });
});
