// Copies the site (root index.html) into www/, the folder Capacitor bundles into the app.
// index.html stays the single source: never edit www/ by hand.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const www = fileURLToPath(new URL("../www/", import.meta.url));
mkdirSync(www, { recursive: true });
copyFileSync(`${root}index.html`, `${www}index.html`);
console.log("index.html -> mobile/www/index.html");
