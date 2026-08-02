import fs from "node:fs";

const inputPath = "data.csv";

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value);
  return cells;
}

function serializeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const germanImperialTanks = new Set([
  "G.Pz. Mk. VI (e)"
]);

const westGermanTanks = new Set([
  "SP I C",
  "HWK 12",
  "Ru 251",
  "Rhm. Pzw.",
  "Kampfpanzer 07 RH",
  "Leopard PT A",
  "Leopard 1"
]);

const russianTanks = new Set([
  "БТР-82",
  "БТР-90 Росток",
  "БТР-90М",
  "К-17 Бумеранг"
]);

const imperialRussianTanks = new Set([
  "Руссо-Балт тип C"
]);

const ukrainianSsrTanks = new Set([
  "бт-2",
  "бт-7м",
  "а-20",
  "а-32",
  "т-34",
  "т-34-85",
  "т-44",
  "т-54",
  "т-64",
  "объект 416",
  "объект 430",
  "объект 430б"
]);

const modernJapaneseTanks = new Set([
  "STA-1",
  "Type 61",
  "STB-1",
  "Ju-Nu",
  "Ju-To",
  "Type 57",
  "Type 68",
  "Type 71"
]);

function getDetailFlag(cells) {
  const name = String(cells[0] || "").trim();
  const nation = String(cells[8] || "").trim();
  const level = Number.parseInt(cells[7], 10);

  if (nation.toLowerCase() === "германия") {
    if (germanImperialTanks.has(name)) return "Германия";
    if (westGermanTanks.has(name)) return "ФРГ";
    return "Веймарская республика";
  }

  if (nation.toLowerCase() === "австрия" && level === 1) {
    return "Австро-Венгрия";
  }

  if (nation.toLowerCase() === "ссср" && russianTanks.has(name)) {
    return "Россия";
  }

  if (nation.toLowerCase() === "ссср" && imperialRussianTanks.has(name)) {
    return "Российская империя";
  }

  if (nation.toLowerCase() === "ссср") {
    return ukrainianSsrTanks.has(name.toLowerCase()) ? "УССР" : "РСФСР";
  }

  if (nation.toLowerCase() === "япония") {
    return modernJapaneseTanks.has(name) ? "Япония" : "Японская империя";
  }

  return nation;
}

const rows = fs.readFileSync(inputPath, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter((line) => line.length > 0)
  .map(parseCsvLine);

for (const cells of rows) {
  while (cells.length < 34) cells.push("");
  cells[33] = getDetailFlag(cells);
}

fs.writeFileSync(
  inputPath,
  `${rows.map((cells) => cells.map(serializeCsvCell).join(",")).join("\r\n")}\r\n`,
  "utf8"
);

const distribution = rows.reduce((result, cells) => {
  const flag = cells[33] || "(пусто)";
  result[flag] = (result[flag] || 0) + 1;
  return result;
}, {});

console.log(`Updated ${rows.length} rows in ${inputPath}.`);
console.table(distribution);
