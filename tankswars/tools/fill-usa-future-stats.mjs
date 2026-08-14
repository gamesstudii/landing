import fs from "node:fs";

const file = "data.csv";
function parse(line) { const out=[]; let v="", q=false; for(let i=0;i<line.length;i+=1){const c=line[i]; if(c==='"') q=!q; else if(c===","&&!q){out.push(v);v="";} else v+=c;} out.push(v); return out; }
function quote(v) { return /[",\n]/.test(v) ? `"${String(v).replaceAll('"','""')}"` : String(v ?? ""); }
function decimal(value) { return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ","); }
function setStats(row) {
  const level = Number(row[7]) || 1;
  const className = row[14];
  const flame = row[1].toLowerCase() === "огонь" || row[2].toLowerCase() === "огонь";
  const artillery = className === "САУ";
  const td = className === "ПТ";
  const heavy = className === "ТТ";
  const light = className === "ЛТ";
  if (!row[1]) {
    [row[1], row[2], row[3]] = flame ? ["огонь", "огонь", "огонь"] : artillery ? ["ОФ", "ОФ", "ОФ"] : td ? ["ББ", "КС", "ОФ"] : ["ББ", "ПБ", "ОФ"];
  }
  const damage = flame ? [8 + level * 3, 8 + level * 3, 8 + level * 3] : artillery ? [100 + level * 45, 100 + level * 45, 135 + level * 55] : td ? [90 + level * 42, 90 + level * 42, 120 + level * 48] : [45 + level * 28, 38 + level * 25, 65 + level * 34];
  [row[4], row[5], row[6]] = damage.map(String);
  row[12] = String(level * 1800);
  row[13] = String(level * level * 9000);
  row[15] = String((light ? 260 : heavy ? 720 : artillery ? 340 : td ? 430 : 520) + level * (heavy ? 180 : 105));
  row[16] = decimal(Math.max(1.8, (flame ? 2.8 : artillery ? 8.5 : td ? 6.2 : 5.8) - level * 0.14));
  row[17] = decimal(Math.max(0.018, (light ? 0.032 : heavy ? 0.06 : 0.045) - level * 0.001));
  row[18] = decimal(Math.max(0.018, (light ? 0.03 : heavy ? 0.052 : 0.04) - level * 0.001));
  row[19] = String(35 + level * (td ? 22 : 16));
  row[20] = String(45 + level * (td ? 24 : 18));
  row[21] = String(25 + level * 12);
  row[22] = String((light ? 18 : heavy ? 75 : td ? 45 : 35) + level * (heavy ? 16 : 9));
  row[23] = String(Math.max(1, 12 - Math.floor(level / 2)));
  row[24] = artillery ? "6" : flame ? "5" : "1";
  row[25] = "1";
  row[26] = "0";
  row[27] = decimal(Math.max(1.2, (artillery ? 5.2 : td ? 3.6 : 3.2) - level * 0.08));
  row[28] = "0";
  row[29] = row[29] || "";
  row[30] = row[30] || "3";
  row[31] = row[31] || "-6";
  row[32] = row[32] || "20";
  row[33] = row[33] || "США";
}

const lines = fs.readFileSync(file, "utf8").trimEnd().split(/\r?\n/);
let changed = 0;
const output = lines.map((line) => {
  const row = parse(line);
  if (row[8] === "США" && row[28] === "0") { setStats(row); changed += 1; return row.map(quote).join(","); }
  return line;
});
fs.writeFileSync(file, `${output.join("\n")}\n`, "utf8");
console.log(`Filled combat characteristics for ${changed} future USA tanks; AC remains 0.`);
