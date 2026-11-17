// Runs Vitest and Playwright and files the evidence of one run under test-evidence/<stamp>/.
// Usage: npm run test:evidence            (unit + integration, and the E2E of the site: index.html)
//        npm run test:evidence -- --next  (also the E2E of the Next.js version, which needs a server)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EVIDENCE_ROOT = join(ROOT, "test-evidence");
const KEEP_RUNS = 10;

const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
})
  .format(new Date())
  .replace(" ", "_")
  .replace(":", "-");
const runDir = join(EVIDENCE_ROOT, stamp);
const unitDir = join(runDir, "unit");
mkdirSync(unitDir, { recursive: true });

// The site (index.html) is what runs on GitHub Pages and in the app; the Next.js version is opt-in.
const E2E_SUITES = [
  { key: "site", label: "E2E do site (index.html)", config: "playwright.config.ts" },
  ...(process.argv.includes("--next")
    ? [{ key: "next", label: "E2E do Next.js (login por código)", config: "playwright.next.config.ts" }]
    : []),
].map((suite) => ({ ...suite, dir: join(runDir, `e2e-${suite.key}`), passed: [], failed: [], skipped: [], ms: 0 }));

function run(command, env = {}) {
  return spawnSync(command, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  }).status;
}

const unitJson = join(unitDir, "results.json");
let started = Date.now();
run(`npx vitest run --reporter=default --reporter=json --outputFile.json="${unitJson}"`);
const unitMs = Date.now() - started;
for (const suite of E2E_SUITES) {
  mkdirSync(suite.dir, { recursive: true });
  started = Date.now();
  run(`npx playwright test -c ${suite.config}`, { EVIDENCE_DIR: suite.dir });
  suite.ms = Date.now() - started;
}

// Playwright colours its error messages with terminal escape codes.
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

const slug = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const rel = (path) => path.replace(runDir, ".").replaceAll("\\", "/");

// ---- Vitest -------------------------------------------------------------
const unit = { passed: [], failed: [], skipped: [] };
for (const file of readJson(unitJson)?.testResults ?? []) {
  const name = file.name.replace(ROOT, "").replace(/^[\\/]/, "").replaceAll("\\", "/");
  for (const test of file.assertionResults) {
    const row = { file: name, title: test.fullName, message: (test.failureMessages ?? []).join("\n") };
    if (test.status === "passed") unit.passed.push(row);
    else if (test.status === "failed") unit.failed.push(row);
    else unit.skipped.push(row);
  }
}

function groupByFile(rows) {
  const groups = new Map();
  for (const row of rows) groups.set(row.file, [...(groups.get(row.file) ?? []), row]);
  return groups;
}

let passedMd = `# Testes de unidade e integração que passaram (${unit.passed.length})\n`;
for (const [file, rows] of groupByFile(unit.passed)) {
  passedMd += `\n## ${file}\n\n${rows.map((r) => `- ${r.title}`).join("\n")}\n`;
}
writeFileSync(join(unitDir, "passed.md"), passedMd);
if (unit.failed.length > 0) {
  let failedMd = `# Testes de unidade e integração que falharam (${unit.failed.length})\n`;
  for (const row of unit.failed) {
    failedMd += `\n## ${row.title}\n\nArquivo: \`${row.file}\`\n\n\`\`\`\n${row.message}\n\`\`\`\n`;
  }
  writeFileSync(join(unitDir, "failed.md"), failedMd);
}

// ---- Playwright ---------------------------------------------------------
function walk(suite, trail, visit) {
  const next = suite.title && !suite.file ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) visit(spec, next);
  for (const child of suite.suites ?? []) walk(child, child.file ? trail : next, visit);
}

for (const e2e of E2E_SUITES) {
  for (const suite of readJson(join(e2e.dir, "results.json"))?.suites ?? []) {
    walk(suite, [], (spec, trail) => {
      for (const test of spec.tests) {
        const last = test.results.at(-1);
        const status = test.status === "expected" ? "passed" : test.status === "skipped" ? "skipped" : "failed";
        const title = [...trail, spec.title].join(" › ");
        const folder = join(e2e.dir, status === "failed" ? "failed" : "passed", test.projectName, slug(`${spec.file}-${title}`));
        if (status !== "skipped") {
          mkdirSync(folder, { recursive: true });
          for (const attachment of (last?.attachments ?? []).filter((a) => a.path)) {
            const target = attachment.name === "screenshot" ? "screenshot.png" : attachment.name === "video" ? "video.webm" : basename(attachment.path);
            cpSync(attachment.path, join(folder, target));
          }
        }
        const message = stripAnsi((last?.errors ?? []).map((e) => e.message ?? "").join("\n\n"));
        if (status === "failed") writeFileSync(join(folder, "error.txt"), `${title}\n${spec.file} [${test.projectName}]\n\n${message}\n`);
        e2e[status].push({ title, file: spec.file, project: test.projectName, folder, message });
      }
    });
  }
  // The raw attachments were copied by name above; the run folder keeps only the organised copy.
  rmSync(join(e2e.dir, "artifacts"), { recursive: true, force: true });

  let passed = `# Testes E2E que passaram (${e2e.passed.length})\n`;
  for (const row of e2e.passed) passed += `\n- [${row.project}] ${row.title} (${row.file})`;
  writeFileSync(join(e2e.dir, "passed.md"), `${passed}\n`);
  if (e2e.skipped.length > 0) {
    let skipped = `# Testes E2E pulados (${e2e.skipped.length})\n`;
    for (const row of e2e.skipped) skipped += `\n- [${row.project}] ${row.title} (${row.file})`;
    writeFileSync(join(e2e.dir, "skipped.md"), `${skipped}\n`);
  }
  if (e2e.failed.length > 0) {
    let failedMd = `# Testes E2E que falharam (${e2e.failed.length})\n`;
    for (const row of e2e.failed) {
      failedMd += `\n## [${row.project}] ${row.title}\n\nArquivo: \`${row.file}\`\nEvidência: \`${rel(row.folder)}\`\n\n\`\`\`\n${row.message}\n\`\`\`\n`;
    }
    writeFileSync(join(e2e.dir, "failed.md"), failedMd);
  }
}

// ---- Summary ------------------------------------------------------------
const commit = spawnSync("git rev-parse --short HEAD", { cwd: ROOT, shell: true, encoding: "utf8" }).stdout.trim();
const branch = spawnSync("git branch --show-current", { cwd: ROOT, shell: true, encoding: "utf8" }).stdout.trim();
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const failures = unit.failed.length + E2E_SUITES.reduce((total, e2e) => total + e2e.failed.length, 0);

const [day, time] = stamp.split("_");
let summary = `# Evidências de teste · ${day} ${time.replace("-", ":")}\n\n`;
summary += `- Branch: \`${branch}\` (commit \`${commit}\`)\n`;
summary += `- Resultado geral: **${failures === 0 ? "tudo passou" : `${failures} falha(s)`}**\n\n`;
summary += "| Suíte | Passou | Falhou | Pulou | Tempo |\n|---|---:|---:|---:|---:|\n";
summary += `| Unidade e integração (Vitest) | ${unit.passed.length} | ${unit.failed.length} | ${unit.skipped.length} | ${seconds(unitMs)} |\n`;
for (const e2e of E2E_SUITES) {
  summary += `| ${e2e.label} | ${e2e.passed.length} | ${e2e.failed.length} | ${e2e.skipped.length} | ${seconds(e2e.ms)} |\n`;
}
summary += "\n## Falhas\n\n";
if (failures === 0) summary += "Nenhuma.\n";
for (const row of unit.failed) summary += `- Vitest: ${row.title} (\`${row.file}\`), detalhes em \`unit/failed.md\`\n`;
for (const e2e of E2E_SUITES) {
  for (const row of e2e.failed) summary += `- ${e2e.label} [${row.project}]: ${row.title}, evidência em \`${rel(row.folder)}\`\n`;
}
summary += "\n## Onde está cada coisa\n\n";
summary += "- `unit/`: `results.json`, `passed.md` e, se houver, `failed.md`\n";
summary += "- `e2e-site/` (e `e2e-next/` com `--next`): `passed/` e `failed/` com uma pasta por teste e por tamanho de tela (`site-desktop`, `site-mobile`), cada uma com print e, na falha, também `error.txt`, trace e vídeo; `passed.md`, `skipped.md` e `failed.md`\n";
summary += `- \`e2e-site/report/\`: relatório HTML (\`npx playwright show-report test-evidence/${stamp}/e2e-site/report\`)\n`;
writeFileSync(join(runDir, "RESUMO.md"), summary);

// Keep only the newest runs.
const runs = readdirSync(EVIDENCE_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const old of runs.slice(0, Math.max(0, runs.length - KEEP_RUNS))) {
  rmSync(join(EVIDENCE_ROOT, old), { recursive: true, force: true });
}

console.log(`\nEvidências em ${runDir}`);
console.log(summary.split("## Falhas")[0]);
process.exit(failures === 0 ? 0 : 1);
