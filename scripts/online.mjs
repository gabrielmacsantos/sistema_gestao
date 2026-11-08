// `npm run online`: builds the app, serves it in production mode and opens a public
// HTTPS URL through a Cloudflare quick tunnel. Ctrl+C stops everything.
//
// Options:
//   --no-build     reuse the last build (faster when the code did not change)
//   --port=3001    local port of the production server
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const skipBuild = args.includes("--no-build");
const port = Number(args.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3001);
const isWindows = process.platform === "win32";
const children = [];

function log(message) {
  console.log(`\x1b[36m[online]\x1b[0m ${message}`);
}

function fail(message) {
  console.error(`\x1b[31m[online]\x1b[0m ${message}`);
  stopAll(1);
}

function stopAll(code = 0) {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // The server runs through a shell; on Windows kill the whole process tree.
    if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => {
  log("Encerrando o servidor e o túnel...");
  stopAll(0);
});
process.on("SIGTERM", () => stopAll(0));

/** cloudflared from PATH or from the default Windows install folders. */
function findCloudflared() {
  const probe = spawnSync(isWindows ? "where" : "which", ["cloudflared"], { encoding: "utf8" });
  if (probe.status === 0) return probe.stdout.split(/\r?\n/)[0].trim();
  if (isWindows) {
    for (const base of [process.env["ProgramFiles(x86)"], process.env.ProgramFiles]) {
      const candidate = base && path.join(base, "cloudflared", "cloudflared.exe");
      if (candidate && existsSync(candidate)) return candidate;
    }
  }
  return null;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const cloudflared = findCloudflared();
  if (!cloudflared) {
    fail(
      "cloudflared não encontrado. Instale com:\n" +
        "  winget install --id Cloudflare.cloudflared   (Windows)\n" +
        "  brew install cloudflared                     (macOS)",
    );
  }
  if (!existsSync(".env")) fail("Arquivo .env não encontrado. Copie o .env.example e preencha o SESSION_SECRET.");

  if (!skipBuild) {
    log("Gerando o build de produção (use --no-build para pular)...");
    const build = spawnSync("npm run build", { stdio: "inherit", shell: true });
    if (build.status !== 0) fail("O build falhou. Corrija os erros acima e rode de novo.");
  } else if (!existsSync(path.join(".next", "BUILD_ID"))) {
    fail("Nenhum build encontrado. Rode sem --no-build.");
  }

  log(`Iniciando o servidor na porta ${port}...`);
  const server = spawn(`npx next start --port ${port}`, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: true,
    // Served over HTTPS by the tunnel, so the session cookie must be Secure.
    env: { ...process.env, COOKIE_SECURE: "true", NODE_ENV: "production" },
  });
  children.push(server);
  server.on("exit", (code) => fail(`O servidor parou (código ${code}). A porta ${port} pode estar em uso.`));

  if (!(await waitForServer(`http://localhost:${port}/login`))) fail("O servidor não respondeu a tempo.");

  log("Abrindo o túnel Cloudflare...");
  const tunnel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(tunnel);
  tunnel.on("exit", (code) => fail(`O túnel parou (código ${code}).`));

  let announced = false;
  const onOutput = (chunk) => {
    const match = !announced && chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!match) return;
    announced = true;
    const line = "─".repeat(match[0].length + 4);
    console.log(`\n\x1b[32m┌${line}┐\n│  ${match[0]}  │\n└${line}┘\x1b[0m`);
    log("Site online! Um link novo pode levar até 1 minuto para abrir.");
    log('Se aparecer "site não encontrado", espere um pouco (no Windows: ipconfig /flushdns).');
    log("O link muda a cada execução. Ctrl+C para encerrar.\n");
  };
  tunnel.stdout.on("data", onOutput);
  tunnel.stderr.on("data", onOutput);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
