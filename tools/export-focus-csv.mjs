import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const appPath = path.join(root, "Ashes-of-Nations", "app.js");
const outputDir = path.join(root, "Ashes-of-Nations", "focuses");
const app = fs.readFileSync(appPath, "utf8");
const start = app.indexOf("  const MAJOR_FOCUS_TREES = {");
const end = app.indexOf("  let maps = [];");

if (start === -1 || end === -1 || end <= start) {
  throw new Error("Could not find MAJOR_FOCUS_TREES block in app.js");
}

const source = `${app.slice(start, end)}\nresult = MAJOR_FOCUS_TREES;`;
const context = { result: null };
vm.createContext(context);
vm.runInContext(source, context);

const trees = context.result;
const headers = [
  "id",
  "название",
  "описание",
  "подробно",
  "дни",
  "доступно с",
  "ответвление",
  "x",
  "y",
  ...Array.from({ length: 10 }, (_, index) => `после${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `требование${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `награда${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `блокировать${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `случайно${index + 1}`),
];

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function branchForFocus(focus) {
  const numericSuffix = String(focus.id || "").match(/^(.+)-\d+$/);
  if (numericSuffix) return numericSuffix[1];
  if (focus.id?.includes("-")) return focus.id.split("-")[0];
  return focus.x ? `колонка-${focus.x}` : "";
}

function rewardCells(reward = {}) {
  return Object.entries(reward)
    .filter(([, value]) => value !== undefined && value !== null && value !== 0)
    .map(([key, value]) => `${key}=${value}`)
    .slice(0, 10);
}

function rowForFocus(focus, childrenById) {
  const next = childrenById.get(focus.id) || [];
  const requires = focus.requires || [];
  const rewards = rewardCells(focus.reward);
  const blocks = focus.blocksBranches || [];
  const randomCompletions = focus.randomCompletions || [];
  return [
    focus.id,
    focus.name,
    focus.text,
    focus.details || "",
    focus.days || 70,
    focus.availableFrom || "",
    focus.branch || branchForFocus(focus),
    focus.x || "",
    focus.y || "",
    ...Array.from({ length: 10 }, (_, index) => next[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => requires[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => rewards[index] || ""),
    ...Array.from({ length: 3 }, (_, index) => blocks[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => randomCompletions[index] || ""),
  ].map(csvEscape).join(",");
}

fs.mkdirSync(outputDir, { recursive: true });

const files = [];
Object.entries(trees).forEach(([countryName, tree]) => {
  if (!Array.isArray(tree) || !tree.length) return;
  const childrenById = new Map();
  tree.forEach((focus) => {
    (focus.requires || []).forEach((requiredId) => {
      if (!childrenById.has(requiredId)) childrenById.set(requiredId, []);
      childrenById.get(requiredId).push(focus.id);
    });
  });

  const rows = [
    headers.map(csvEscape).join(","),
    ...tree.map((focus) => rowForFocus(focus, childrenById)),
  ];
  const fileName = `${countryName}[2026].csv`;
  files.push(fileName);
  fs.writeFileSync(path.join(outputDir, fileName), `${rows.join("\n")}\n`, "utf8");
});

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify({ files: files.sort((a, b) => a.localeCompare(b, "ru")) }, null, 2)}\n`,
  "utf8"
);

console.log(`Exported ${Object.keys(trees).length} focus CSV files to ${path.relative(root, outputDir)}`);
