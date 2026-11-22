// Serves the static site (index.html, privacidade.html and termos.html) for the E2E tests, like GitHub Pages does.
// Usage: node scripts/serve-site.mjs <port>
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PAGES = { "/": "index.html", "/index.html": "index.html", "/privacidade.html": "privacidade.html", "/termos.html": "termos.html" };
const port = Number(process.argv[2]) || 3200;

createServer(async (req, res) => {
  const file = PAGES[new URL(req.url, "http://localhost").pathname];
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(await readFile(join(ROOT, file)));
}).listen(port, () => console.log(`Site on http://localhost:${port}`));
