import fs from "node:fs";

const file = "data.csv";
const nation = "США";
const nodes = new Map();
function add(name, level, className, next = [], ammo = ["ББ", "ПБ", "ОФ"]) {
  const node = nodes.get(name) || { name, level, className, next: [], ammo };
  node.level = level; node.className = className; node.ammo = ammo;
  node.next = [...new Set([...node.next, ...next])]; nodes.set(name, node);
}
function chain(className, names, start = 2, ammo) {
  names.forEach((name, index) => add(name, start + index, className, names[index + 1] ? [names[index + 1]] : [], ammo));
}
add("M2 Light", 1, "ЛТ", ["M3 Stuart", "T1 Gun Motor Carriage", "T19 HMC"]);
chain("ЛТ", ["M3 Stuart", "M5 Stuart", "M7", "T21", "M24 Chaffee", "M41 Walker Bulldog", "T49", "T92E1", "M551 Sheridan (ПТУР)"], 2);
chain("СТ", ["M2 Medium", "M3 Lee", "M4 Sherman", "M4A3E8 Sherman", "M26 Pershing", "M46 Patton", "M48A1 Patton", "M48 Patton"], 3);
chain("ТТ", ["T1 Heavy Tank", "M6", "T29", "T32", "M103", "T110E5 prototype", "T110E5 early", "T110E5"], 3);
chain("ТТ", ["T57 Heavy prototype", "T57 Heavy early", "T57 Heavy mid", "T57 Heavy late", "T57 Heavy"], 6);
chain("ТТ", ["M-V-Y prototype", "M-V-Y early", "M-V-Y"], 8);
chain("КТ", ["M8 Greyhound", "M20 Armored Utility Car", "M1128 Stryker MGS", "M10 Booker", "AGS XM8 MGS", "Stryker Dragoon", "M1128A1", "M10 Booker II"], 3);
chain("БТР", ["M3 Scout Car", "M59 APC", "M113 APC", "M114 APC", "M113A1", "M2 Bradley", "M3 Bradley", "XM30"], 3);
chain("ПТ", ["T1 Gun Motor Carriage", "M10 Wolverine", "M18 Hellcat", "T25/2", "T28 Prototype", "T28", "T95", "T110E3 prototype", "T110E3"]);
chain("ПТ", ["T30", "T30 early", "T30 late", "T110E4"], 7);
chain("САУ", ["T19 HMC", "M7 Priest", "M12", "M40", "M53/55", "M55", "XM2001 Crusader", "T92 HMC prototype", "T92 HMC"], 2, ["ОФ", "ОФ", "ОФ"]);
chain("ПТ", ["M3 Satan", "M4A3R3 Zippo", "M67 Zippo", "M132", "M42B1", "M67A1", "M132A1", "T123 Flamethrower", "M67A2"], 2, ["Огонь", "Огонь", "Огонь"]);
// Ответвления с общих узлов Blitz-подобного дерева.
add("M3 Stuart", 2, "ЛТ", ["M5 Stuart", "M2 Medium", "T1 Heavy Tank"]);
add("M5 Stuart", 3, "ЛТ", ["M7", "M8 Greyhound", "M3 Scout Car"]);
add("M2 Medium", 3, "СТ", ["M3 Lee", "M3 Satan"]);
add("M4A3E8 Sherman", 6, "СТ", ["M26 Pershing", "T57 Heavy prototype"]);
add("M103", 7, "ТТ", ["T110E5 prototype", "M-V-Y prototype"]);
add("T28 Prototype", 6, "ПТ", ["T28", "T30"]);

function parse(line) { const out=[]; let v="", q=false; for(let i=0;i<line.length;i+=1){const c=line[i]; if(c==='"') q=!q; else if(c===","&&!q){out.push(v);v="";} else v+=c;} out.push(v); return out; }
function quote(v) { return /[",\n]/.test(v) ? `"${String(v).replaceAll('"','""')}"` : String(v ?? ""); }
function serialize(node) {
  const c = Array(34).fill(""); c[0]=node.name; [c[1],c[2],c[3]]=node.ammo; c[7]=node.level; c[8]=nation; [c[9],c[10],c[11]]=node.next; c[14]=node.className; c[28]="0"; c[30]="3"; c[31]="-6"; c[32]="20"; c[33]=nation; return c.map(quote).join(",");
}
const source = fs.readFileSync(file,"utf8").trimEnd().split(/\r?\n/);
const kept = source.filter((line) => { const c=parse(line); return !(c[8]===nation && c[28]==="0"); });
const existing = new Set(kept.map(parse).map((c)=>c[0]));
for (const node of nodes.values()) if (!existing.has(node.name)) kept.push(serialize(node));
fs.writeFileSync(file, `${kept.join("\n")}\n`, "utf8");
console.log(`Rebuilt USA Blitz-style tree: ${nodes.size} future nodes.`);
