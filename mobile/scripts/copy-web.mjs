// Copies the site (root index.html) into www/, the folder Capacitor bundles into the app.
// index.html stays the single source: never edit www/ by hand.
//
// The app copy also gets Capacitor's core (capacitor.js). Inside the app it provides Capacitor.registerPlugin,
// without which index.html cannot reach any native plugin (voice, share, browser, app info). The site on GitHub
// Pages does not load it.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const mobile = fileURLToPath(new URL("../", import.meta.url));
const www = `${mobile}www/`;
mkdirSync(www, { recursive: true });

copyFileSync(`${mobile}node_modules/@capacitor/core/dist/capacitor.js`, `${www}capacitor.js`);

const html = readFileSync(`${root}index.html`, "utf8");
const tag = '<script src="capacitor.js"></script>\n';
if (!html.includes("</head>")) throw new Error("index.html has no </head> to put capacitor.js before");
writeFileSync(`${www}index.html`, html.replace("</head>", `${tag}</head>`));
console.log("index.html + capacitor.js -> mobile/www/");
