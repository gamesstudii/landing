import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve(process.argv[2] || "scratch/source-unpacked");
const buildDir = path.resolve(process.argv[3] || "scratch/updated-unpacked");
const sourceJson = path.join(sourceDir, "project.json");
const csvPath = path.resolve("data.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(cell => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.trim());
    if (row.some(cell => cell !== "")) rows.push(row);
  }
  return rows;
}

const numeric = value => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"))
  .filter(row => row[0] && row[0].toLowerCase() !== "testing")
  .map(row => [...row, ...Array(Math.max(0, 34 - row.length)).fill("")]);

fs.rmSync(buildDir, { recursive: true, force: true });
fs.cpSync(sourceDir, buildDir, { recursive: true });
const project = JSON.parse(fs.readFileSync(sourceJson, "utf8"));
const stage = project.targets.find(target => target.isStage);
if (!stage) throw new Error("Scratch stage not found");

function listId(name) {
  return `scratch_migration_${Buffer.from(name).toString("hex").slice(0, 40)}`;
}
function setList(name, values) {
  const entry = Object.entries(stage.lists).find(([, [existingName]]) => existingName === name);
  if (entry) entry[1][1] = values;
  else stage.lists[listId(name)] = [name, values];
}
function findShellValue(row, shellType, offset) {
  for (let shell = 0; shell < 3; shell += 1) {
    if (String(row[1 + shell]).toUpperCase() === shellType) return numeric(row[offset + shell]);
  }
  return 0;
}

const names = rows.map(row => row[0]);
setList("о танках//танки", names);
setList("о танках//уровень", rows.map(row => numeric(row[7])));
setList("о танках//жизни", rows.map(row => numeric(row[15])));
setList("о танках//урон ББ", rows.map(row => findShellValue(row, "ББ", 4)));
setList("о танках//урон ПБ", rows.map(row => findShellValue(row, "ПБ", 4)));
setList("о танках//урон ОФ", rows.map(row => findShellValue(row, "ОФ", 4)));
setList("о танках//урон КС", rows.map(row => findShellValue(row, "КС", 4)));
setList("о танках//пробитие ББ", rows.map(row => findShellValue(row, "ББ", 19)));
setList("о танках//пробитие ПБ", rows.map(row => findShellValue(row, "ПБ", 19)));
setList("о танках//пробитие ОФ", rows.map(row => findShellValue(row, "ОФ", 19)));
setList("о танках//пробитие КС", rows.map(row => findShellValue(row, "КС", 19)));
setList("о танках//перезарядка", rows.map(row => numeric(row[16])));
setList("о танках//разброс", rows.map(row => numeric(row[27])));
setList("о танках//снаряд 1", rows.map(row => row[1] || "-"));
setList("о танках//снаряд 2", rows.map(row => row[2] || "-"));
setList("о танках//снаряд 3", rows.map(row => row[3] || "-"));
setList("о танках//броня", rows.map(row => numeric(row[22])));
setList("о танках//шанс пробития", rows.map(row => numeric(row[23])));
setList("о танках//тип танка", rows.map(row => row[14] || "-"));

// Новая часть базы хранится отдельными параллельными списками. Старые блоки
// продолжают работать, а новые экраны могут читать полный набор данных.
setList("TW//нация", rows.map(row => row[8] || "-"));
setList("TW//флаг", rows.map(row => row[33] || row[8] || "-"));
setList("TW//исследование 1", rows.map(row => row[9] || "-"));
setList("TW//исследование 2", rows.map(row => row[10] || "-"));
setList("TW//исследование 3", rows.map(row => row[11] || "-"));
setList("TW//цена опыта", rows.map(row => numeric(row[12])));
setList("TW//цена серебра", rows.map(row => numeric(row[13])));
setList("TW//доступность", rows.map(row => numeric(row[28])));
setList("TW//тип орудия", rows.map(row => numeric(row[24])));
setList("TW//снарядов за выстрел", rows.map(row => numeric(row[25])));
setList("TW//размер магазина", rows.map(row => numeric(row[26])));
setList("TW//задержка поворота", rows.map(row => numeric(row[17])));
setList("TW//задержка движения", rows.map(row => numeric(row[18])));
setList("TW//размер", rows.map(row => numeric(row[30])));
setList("TW//УВН вниз", rows.map(row => numeric(row[31])));
setList("TW//УВН вверх", rows.map(row => numeric(row[32])));

// Личный опыт новых машин начинается с нуля. Значения старых 58 машин
// сохраняются, чтобы структура исходного проекта не потеряла прогресс.
for (const listName of ["о танках//опыт", "о танках//отображение опыта"]) {
  const entry = Object.values(stage.lists).find(([name]) => name === listName);
  const old = entry?.[1] || [];
  setList(listName, names.map((_, index) => old[index] ?? 0));
}

const versionEntry = Object.entries(stage.variables).find(([, [name]]) => name === "TW//версия");
if (versionEntry) versionEntry[1][1] = "1.1.1.1 Scratch";
else stage.variables.scratch_migration_version = ["TW//версия", "1.1.1.1 Scratch"];
stage.variables.scratch_migration_tank_count = ["TW//танков в базе", names.length];
project.meta.agent = "Games Studio — Tanks Wars Scratch migration";

fs.writeFileSync(path.join(buildDir, "project.json"), JSON.stringify(project));
console.log(`Scratch database migrated: ${names.length} tanks, ${Object.keys(stage.lists).length} lists.`);
