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

function premiumTank({ name, nation, className = "СТ", health = 1900, armor = 110, damage = 400, penetration = 255 }) {
  const cells = Array(34).fill("");
  cells[0] = name;
  cells[1] = "ББ";
  cells[2] = "КС";
  cells[3] = "ОФ";
  cells[4] = String(damage);
  cells[5] = String(Math.round(damage * 1.1));
  cells[6] = String(Math.round(damage * 1.5));
  cells[7] = "10";
  cells[8] = nation;
  cells[14] = className;
  cells[15] = String(health);
  cells[16] = "8";
  cells[17] = "0,04";
  cells[18] = "0,04";
  cells[19] = String(penetration);
  cells[20] = String(Math.round(penetration * 1.18));
  cells[21] = "50";
  cells[22] = String(armor);
  cells[23] = "3";
  cells[24] = "1";
  cells[25] = "1";
  cells[26] = "0";
  cells[27] = "3,5";
  cells[28] = "2";
  cells[30] = className === "ТТ" ? "5" : "4";
  cells[31] = "-8";
  cells[32] = "20";
  cells[33] = nation;
  return cells;
}

const premiums = [
  premiumTank({ name: "Leopard C1", nation: "Канада", penetration: 260 }),
  premiumTank({ name: "44M Tas", nation: "Венгрия", className: "ТТ", health: 2200, armor: 180, damage: 460, penetration: 248 }),
  premiumTank({ name: "TR-85M1", nation: "Румыния", armor: 140 }),
  premiumTank({ name: "Arjun Mk.1", nation: "Индия", className: "ТТ", health: 2250, armor: 190, damage: 460, penetration: 260 }),
  premiumTank({ name: "K1", nation: "Южная Корея", armor: 150, penetration: 265 }),
  premiumTank({ name: "Leopard 2A4T1", nation: "Турция", className: "ТТ", health: 2200, armor: 185, damage: 440, penetration: 270 }),
  premiumTank({ name: "Centurion Mk. 5/1 RAAC", nation: "Австралия", armor: 135, penetration: 250 }),
  premiumTank({ name: "Zulfiqar 3", nation: "Иран", className: "ТТ", health: 2200, armor: 180, damage: 440, penetration: 265 }),
  premiumTank({ name: "Al-Khalid", nation: "Пакистан", armor: 155, penetration: 265 }),
  premiumTank({ name: "Ramses II", nation: "Египет", armor: 145, penetration: 255 }),
  premiumTank({ name: "Merkava Mk.1", nation: "Израиль", className: "ТТ", health: 2300, armor: 200, damage: 460, penetration: 270 }),
  premiumTank({ name: "EE-T1 Osório", nation: "Бразилия", armor: 150, penetration: 265 }),
  premiumTank({ name: "Leopard 1BE", nation: "Бельгия", penetration: 260 })
];

const rows = fs.readFileSync(inputPath, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter((line) => line.length > 0)
  .map(parseCsvLine);
const existingNames = new Set(rows.map((cells) => String(cells[0] || "").trim()));
const additions = premiums.filter((cells) => !existingNames.has(cells[0]));

rows.push(...additions);
fs.writeFileSync(inputPath, `${rows.map((cells) => cells.map(serializeCsvCell).join(",")).join("\r\n")}\r\n`, "utf8");
console.log(`Added ${additions.length} international premiums; ${rows.length} total CSV rows.`);
