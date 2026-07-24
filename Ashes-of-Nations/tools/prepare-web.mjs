import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const outDir = new URL("build/web/", root);

const entries = [
  "index.html",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "assets",
  "data",
  "editor",
  "flags",
  "focuses",
  "maps",
  "scenario-editor",
  "scenarios",
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const entry of entries) {
  const source = new URL(entry, root);
  if (!existsSync(source)) continue;
  await cp(source, new URL(entry, outDir), {
    recursive: true,
    force: true,
    filter: (item) => !item.includes("\\node_modules\\") && !item.includes("/node_modules/"),
  });
}

console.log(`Prepared web build in ${outDir.pathname}`);
