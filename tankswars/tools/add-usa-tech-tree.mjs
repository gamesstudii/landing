import fs from "node:fs";

const file = "data.csv";
const nation = "США";
const nodes = new Map();

function addNode(name, level, className, next = [], ammo = ["ББ", "ПБ", "ОФ"]) {
  const existing = nodes.get(name) || { name, level, className, next: [], ammo };
  existing.level = level;
  existing.className = className;
  existing.ammo = ammo;
  existing.next = [...new Set([...existing.next, ...next])];
  nodes.set(name, existing);
}

function addChain(className, names, startLevel = 2, ammo = ["ББ", "ПБ", "ОФ"]) {
  names.forEach((name, index) => addNode(name, startLevel + index, className, names[index + 1] ? [names[index + 1]] : [], ammo));
}

// Единый корень: от I уровня расходятся все основные классы.
addNode("M2 Light", 1, "ЛТ", ["M3 Stuart", "M2 Medium", "T1 Gun Motor Carriage", "T1 Heavy Tank", "T19 HMC", "M3 Satan"]);
addChain("ЛТ", ["M3 Stuart", "M5 Stuart", "M24 Chaffee Prototype", "M41 Walker Prototype", "M24 Chaffee", "M41 Walker Bulldog", "T49", "T92E1", "M551 Sheridan (ПТУР)"]);
addChain("СТ", ["M2 Medium", "M3 Lee", "M4 Sherman", "M4A1 Sherman", "M4A3E8 Sherman", "M46 Patton", "M48A1 Patton", "M48A2 Patton", "M48 Patton"]);
addChain("ПТ", ["T1 Gun Motor Carriage", "M10 Wolverine", "M18 Hellcat", "M36 Jackson", "T25 AT", "T28", "T95", "T110E3 prototype", "T110E3"]);
addChain("ТТ", ["T1 Heavy Tank", "M6", "T29", "T32", "M103", "T110E5 prototype", "T110E5 early", "T110E5 late", "T110E5"]);
addChain("ТТ", ["T1 Heavy Tank", "M6", "T29", "T32", "M103", "T110E4 prototype", "T110E4 early", "T110E4 late", "T110E4"]);
addChain("ТТ", ["T1 Heavy Tank", "M6", "T29", "T32", "M103", "M6A2E1", "T57 Heavy", "M-V-Y", "Chrysler K"]);
addChain("САУ", ["T19 HMC", "M7 Priest", "M12", "M40", "M53/55", "T92 HMC prototype", "XM2001 Crusader", "T92 HMC B", "T92 HMC"], 2, ["ОФ", "ОФ", "ОФ"]);
addChain("ПТ", ["M3 Satan", "M4A3R3 Zippo", "M67 Zippo", "M132", "M42B1", "M67A1", "M132A1", "T123 Flamethrower", "M67A2"], 2, ["Огонь", "Огонь", "Огонь"]);

function parse(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value); value = ""; }
    else value += char;
  }
  cells.push(value);
  return cells;
}
function quote(value) { return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value; }
function row(node) {
  const cells = Array(34).fill("");
  cells[0] = node.name;
  [cells[1], cells[2], cells[3]] = node.ammo;
  cells[7] = node.level;
  cells[8] = nation;
  cells[9] = node.next[0] || "";
  cells[10] = node.next[1] || "";
  cells[11] = node.next[2] || "";
  cells[14] = node.className;
  cells[28] = "0";
  cells[30] = "3";
  cells[31] = "-6";
  cells[32] = "20";
  cells[33] = nation;
  return cells.map(quote).join(",");
}

const removedBeyondTierX = new Set(["AGS XM8A1", "M1 Abrams", "T110E3B", "T110E5C", "T110E4C"]);
const lines = fs.readFileSync(file, "utf8").trimEnd().split(/\r?\n/)
  .filter((line) => !removedBeyondTierX.has(parse(line)[0]));
const existing = new Set(lines.map(parse).map((cells) => cells[0]));
for (const node of nodes.values()) {
  if (!existing.has(node.name)) lines.push(row(node));
}
const routing = new Map([
  ["M2 Light", ["M3 Stuart", "M2 Medium", "T1 Heavy Tank"]],
  ["M3 Stuart", ["M5 Stuart", "T1 Gun Motor Carriage", "T19 HMC"]],
  ["M5 Stuart", ["M24 Chaffee", "M3 Satan"]]
]);
const output = lines.map((line) => {
  const cells = parse(line);
  const links = routing.get(cells[0]);
  if (links) {
    cells[9] = links[0] || "";
    cells[10] = links[1] || "";
    cells[11] = links[2] || "";
    return cells.map(quote).join(",");
  }
  return line;
});
fs.writeFileSync(file, `${output.join("\n")}\n`, "utf8");
console.log(`Added USA tree nodes: ${[...nodes.values()].filter((node) => !existing.has(node.name)).length}.`);
