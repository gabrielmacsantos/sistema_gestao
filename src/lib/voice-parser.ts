// Same logic as the <voice-parser> block of index.html (tests/voice-parser.test.ts covers both).
export type VoiceCategory = { id: string; type: "EXPENSE" | "INCOME"; name: string };
export type SpokenTransaction = {
  type: "EXPENSE" | "INCOME";
  description: string | null;
  amountCents: number | null;
  date: string | null;
  categoryId: string | null;
  status: "PENDING" | null;
};
type NumberRead = { cents: number; end: number; digits: boolean; decimal: boolean; lone: boolean };
type Found = { cents: number; start: number; end: number; marked: boolean; digits: boolean; lone: boolean };

/**
 * Spoken pt-BR sentence -> transaction fields ("gastei 52,30 no mercado ontem").
 * Only fills the form; a field it is unsure about comes back null. Money stays in integer cents.
 */
export const parseSpokenTransaction = (() => {
  const UNITS: Record<string, number> = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
  const TENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
  const HUNDREDS: Record<string, number> = { cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900 };
  const MONTH_NAMES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const CURRENCY = /^(reais|real|conto|contos|pila|pilas)$/;
  const INCOME = new Set(["recebi", "ganhei", "receita", "entrada", "salario", "pagaram", "depositaram", "reembolso", "rendimento", "rendimentos", "vendi"]);
  const EXPENSE = new Set(["gastei", "paguei", "comprei", "gasto", "despesa", "custou", "saida"]);
  // Dropped from the description; "salário" or "reembolso" stay because they describe the entry.
  const VERBS = new Set(["gastei", "paguei", "comprei", "recebi", "ganhei", "custou", "pagaram", "depositaram", "gasto", "despesa", "entrada", "receita", "saida"]);
  const EDGE = new Set(["de", "do", "da", "dos", "das", "no", "na", "nos", "nas", "em", "com", "pra", "pro", "para", "o", "a", "os", "as", "um", "uma", "e", "foi", "deu", "eu", "que", "hoje", "agora"]);
  // Common words for the default categories, keyed by the normalized category name.
  const HINTS: Record<string, string[]> = {
    "alimentacao": ["almoco", "almocei", "jantar", "jantei", "lanche", "lanchonete", "restaurante", "ifood", "cafe", "padaria", "pizza", "hamburguer", "comida", "marmita"],
    "mercado": ["supermercado", "feira", "hortifruti", "acougue", "sacolao", "atacadao"],
    "transporte": ["uber", "99", "taxi", "onibus", "metro", "gasolina", "combustivel", "estacionamento", "pedagio", "passagem", "trem", "etanol"],
    "saude": ["farmacia", "remedio", "remedios", "medico", "consulta", "dentista", "exame", "exames", "hospital", "plano"],
    "moradia": ["aluguel", "condominio", "iptu", "reforma"],
    "contas e servicos": ["luz", "energia", "agua", "internet", "telefone", "celular", "gas", "conta"],
    "assinaturas": ["netflix", "spotify", "assinatura", "streaming", "prime", "youtube"],
    "lazer": ["cinema", "show", "bar", "cerveja", "passeio", "teatro", "jogo", "balada"],
    "educacao": ["escola", "faculdade", "curso", "livro", "livros", "mensalidade", "material"],
    "compras": ["roupa", "roupas", "sapato", "tenis", "presente", "loja", "shopping"],
    "salario": ["salario"],
    "renda extra": ["freela", "freelance", "bico", "venda", "vendi", "extra"],
    "investimentos": ["rendimento", "rendimentos", "dividendos", "juros"],
  };
  const norm = (s: unknown) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const wordValue = (w: string): [number, number] | null => (w in UNITS ? [UNITS[w], 1] : w in TENS ? [TENS[w], 2] : w in HUNDREDS ? [HUNDREDS[w], w === "cem" ? 9 : 3] : w === "mil" ? [1000, 4] : null);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const validDate = (y: number, m: number, d: number) => { const dt = new Date(Date.UTC(y, m - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d; };
  const iso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
  const shiftDays = (date: string, n: number) => { const [y, m, d] = date.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n)); return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); };

  // The user's own category name first (longest wins), then common words. phrase is " normalized words ".
  const pickCategory = (phrase: string, categories: VoiceCategory[] | undefined, t: "EXPENSE" | "INCOME") => {
    const list = (categories || []).filter((c) => c.type === t);
    const byName = list.filter((c) => phrase.includes(` ${norm(c.name)} `)).sort((x, y) => y.name.length - x.name.length)[0];
    return byName || list.find((c) => (HINTS[norm(c.name)] || []).some((h) => phrase.includes(` ${h} `))) || null;
  };

  function parseSpokenTransaction(text: string, categories: VoiceCategory[], today: string): SpokenTransaction {
    const tokens = String(text ?? "").replace(/R\$/gi, " R$ ").split(/\s+/).filter(Boolean).map((raw: string) => {
      const clean = raw === "R$" ? raw : raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      return { raw: clean, n: norm(clean), used: false };
    }).filter((t) => t.raw);
    const at = (i: number) => (tokens[i] && !tokens[i].used ? tokens[i] : null);
    const consume = (from: number, to: number) => { for (let i = from; i < to; i++) tokens[i].used = true; };

    // A number starting at token i: digits ("52,30", "1.200", "2 mil") or words ("cento e vinte").
    function readNumber(i: number): NumberRead | null {
      const t = at(i); if (!t) return null;
      const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t.n) || /^(\d+)\.(\d{1,2})$/.exec(t.n);
      if (m) {
        let cents = Number(m[1].replace(/\./g, "")) * 100 + Number(((m[2] || "") + "00").slice(0, 2)), end = i + 1;
        if (at(end)?.n === "mil") { cents *= 1000; end++; }
        return { cents, end, digits: true, decimal: m[2] !== undefined, lone: false };
      }
      let total = 0, group = 0, rank = 10, count = 0, end = i;
      for (;;) {
        let k = end;
        if (count && at(k)?.n === "e") k++;
        const wv = at(k) ? wordValue(at(k)!.n) : null; if (!wv) break;
        const [v, r] = wv;
        if (r === 4) { if (total) break; total = (group || 1) * 1000; group = 0; rank = 4; }
        else { if (r >= rank) break; group += v; rank = r === 9 ? 0 : r; }
        count++; end = k + 1;
      }
      if (!count) return null;
      return { cents: (total + group) * 100, end, digits: false, decimal: false, lone: count === 1 && /^uma?$/.test(t.n) };
    }

    // Date: "hoje", "ontem", "anteontem", "dia 5", "dia 5 de março", "5/3".
    let date = null;
    for (let i = 0; i < tokens.length && !date; i++) {
      const w = at(i)?.n; if (!w) continue;
      if (w === "hoje") { date = today; consume(i, i + 1); }
      else if (w === "ontem") { date = shiftDays(today, -1); consume(i, i + 1); }
      else if (w === "anteontem") { date = shiftDays(today, -2); consume(i, i + 1); }
      else if (w === "antes" && at(i + 1)?.n === "de" && at(i + 2)?.n === "ontem") { date = shiftDays(today, -2); consume(i, i + 3); }
      else if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(w)) {
        const [d, m, y] = w.split("/").map(Number), year = y ? (y < 100 ? 2000 + y : y) : Number(today.slice(0, 4));
        if (validDate(year, m, d)) { date = iso(year, m, d); consume(i, i + 1); }
      } else if (w === "dia") {
        const num = at(i + 1)?.n === "primeiro" ? { cents: 100, end: i + 2, decimal: false } : readNumber(i + 1);
        if (!num || num.decimal || num.cents % 100) continue;
        const y = Number(today.slice(0, 4)); let m = Number(today.slice(5, 7)), end = num.end;
        const mi = MONTH_NAMES.indexOf((at(end)?.n === "de" ? at(end + 1)?.n : at(end)?.n) ?? "");
        if (mi >= 0) { m = mi + 1; end += at(end)!.n === "de" ? 2 : 1; }
        if (validDate(y, m, num.cents / 100)) { date = iso(y, m, num.cents / 100); consume(i, end); }
      }
    }

    // Status: only "pendente", "a pagar" or "a receber" change it.
    let status: "PENDING" | null = null;
    for (let i = 0; i < tokens.length; i++) {
      if (at(i)?.n === "pendente") { status = "PENDING"; consume(i, i + 1); }
      else if (at(i)?.n === "a" && /^(pagar|receber)$/.test(at(i + 1)?.n || "")) { status = "PENDING"; consume(i, i + 2); }
    }

    // Amount: "R$ 52,30", "52 reais e 30 centavos", "dois e cinquenta", "cinquenta centavos".
    const found: Found[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const start = i; let marked = false;
      if (at(i)?.raw === "R$") { marked = true; i++; }
      const a = readNumber(i);
      if (!a) { i = start; continue; }
      let cents = a.cents, end = a.end;
      if (CURRENCY.test(at(end)?.n || "")) { marked = true; end++; }
      if (/^centavos?$/.test(at(end)?.n || "")) { cents = a.cents / 100; marked = true; end++; }
      else if (!a.decimal && at(end)?.n === "e") {
        const b = readNumber(end + 1), centWord = b && /^centavos?$/.test(at(b.end)?.n || "");
        if (b && !b.decimal && b.cents < 10000 && (centWord || !b.lone)) {
          cents += b.cents / 100; end = b.end;
          if (centWord) end++;
          if (CURRENCY.test(at(end)?.n || "")) end++;
          marked = true;
        }
      }
      found.push({ cents, start, end, marked, digits: a.digits, lone: a.lone && !marked });
      i = end - 1;
    }
    const amount = found.find((c) => c.marked) || found.find((c) => c.digits) || found.find((c) => !c.lone);
    if (amount) consume(amount.start, amount.end);

    // Type: income only when the sentence says so and has no expense word.
    const words = tokens.filter((t) => !t.used).map((t) => t.n);
    const hasIncome = words.some((w) => INCOME.has(w)), hasExpense = words.some((w) => EXPENSE.has(w));
    let type: "EXPENSE" | "INCOME" = hasIncome && !hasExpense ? "INCOME" : "EXPENSE";

    const phrase = ` ${words.join(" ")} `;
    let category = pickCategory(phrase, categories, type);
    if (!category && !hasIncome && !hasExpense) { const inc = pickCategory(phrase, categories, "INCOME"); if (inc) { category = inc; type = "INCOME"; } }

    // Description: what is left, without verbs and loose words at the edges.
    const rest = tokens.filter((t) => !t.used && !VERBS.has(t.n));
    while (rest.length && EDGE.has(rest[0].n)) rest.shift();
    while (rest.length && EDGE.has(rest[rest.length - 1].n)) rest.pop();
    let description = rest.map((t) => t.raw).join(" ").slice(0, 120).trim() || category?.name || null;
    if (description) description = description[0].toUpperCase() + description.slice(1);

    return { type, description, amountCents: amount && amount.cents > 0 ? amount.cents : null, date, categoryId: category?.id || null, status };
  }
  /** Best category of the given type for a free text such as a store name ("IFOOD *PIZZARIA" -> Alimentação). */
  parseSpokenTransaction.guessCategory = (text: string, categories: VoiceCategory[], type: "EXPENSE" | "INCOME") =>
    pickCategory(` ${norm(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `, categories, type)?.id || null;
  return parseSpokenTransaction;
})();
