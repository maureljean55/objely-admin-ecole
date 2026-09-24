// Builds public/fonts/material-symbols-outlined.woff2, a subset of Material
// Symbols Outlined limited to the icons the app actually uses, so the borne
// never calls Google at runtime. Re-run after adding an icon:
//   node scripts/build-icon-font.mjs
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const OUT = new URL("../public/fonts/material-symbols-outlined.woff2", import.meta.url).pathname;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(tsx?|css)$/.test(entry.name)) yield path;
  }
}

// name="x", icon="x", icon: "x", trailingIcon="x", badgeIcon: "x", ?? "x"
const PATTERNS = [/\b(?:name|icon|trailingIcon|badgeIcon)\s*[=:]\s*\{?\s*["']([a-z][a-z0-9_]*)["']/g, /\?\?\s*["']([a-z][a-z0-9_]*)["']/g];

const names = new Set();
for await (const file of walk(SRC)) {
  const text = await readFile(file, "utf8");
  for (const re of PATTERNS) for (const m of text.matchAll(re)) names.add(m[1]);
}
// Names written inside ternaries can't be found by the patterns above; list them here.
for (const extra of ["person", "person_off"]) names.add(extra);
names.delete("all");
// The alphabetical order is required by the icon_names parameter.
const list = [...names].sort();
console.log(`${list.length} icons:`, list.join(", "));

const css = await (
  await fetch(
    `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=${list.join(",")}`,
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" } },
  )
).text();
const url = css.match(/url\(([^)]+)\) format\('woff2'\)/)?.[1];
if (!url) throw new Error(`No woff2 url in response:\n${css}`);

const font = Buffer.from(await (await fetch(url)).arrayBuffer());
await mkdir(new URL("../public/fonts/", import.meta.url).pathname, { recursive: true });
await writeFile(OUT, font);
console.log(`wrote ${OUT} (${(font.length / 1024).toFixed(1)} KB)`);
