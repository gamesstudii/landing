import fs from "node:fs/promises";

const source = JSON.parse(
  await fs.readFile("european-rulers-1550-2026.json", "utf8")
);

if (!Array.isArray(source.rulers)) {
  throw new Error("В european-rulers-1550-2026.json отсутствует массив rulers.");
}

await fs.mkdir("data", { recursive: true });
await fs.writeFile(
  "data/european-rulers.js",
  `window.EUROPEAN_RULERS = ${JSON.stringify(source.rulers)};\n`
);

console.log(`Подготовлено для браузера: ${source.rulers.length} правителей.`);
