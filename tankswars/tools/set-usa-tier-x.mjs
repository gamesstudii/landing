import fs from "node:fs";

const file = "data.csv";
function parse(line) { const out=[]; let v="", q=false; for(let i=0;i<line.length;i+=1){const c=line[i]; if(c==='"') q=!q; else if(c===","&&!q){out.push(v);v="";} else v+=c;} out.push(v); return out; }
function quote(v) { return /[",\n]/.test(v) ? `"${String(v).replaceAll('"','""')}"` : String(v ?? ""); }
function setRow(rows, name, level, next, ammo) {
  let row = rows.find((item) => item[0] === name);
  if (!row) { row = Array(34).fill(""); rows.push(row); }
  row[0]=name; row[7]=String(level); row[8]="США"; row[9]=next?.[0]||""; row[10]=next?.[1]||""; row[11]=next?.[2]||""; row[28]="0"; row[30]=row[30]||"3"; row[31]=row[31]||"-6"; row[32]=row[32]||"20"; row[33]="США";
  if (ammo) [row[1],row[2],row[3]]=ammo;
}
const remove = new Set(["AGS XM8","T110E3A","T110E4A","T110E4B","T110E5A","T110E5B","M60 Patton","M60A2","Chrysler K","XM2001A"]);
const rows = fs.readFileSync(file,"utf8").trimEnd().split(/\r?\n/).map(parse).filter((row)=>!remove.has(row[0]));
setRow(rows,"T92E1",7,["T92E1A"]);
setRow(rows,"T92E1A",8,["M551 Sheridan"]);
setRow(rows,"M551 Sheridan",9,["M551 Sheridan (ПТУР)"]);
setRow(rows,"M551 Sheridan (ПТУР)",10,[],["ПТУР","ПТУР","ПТУР"]);
setRow(rows,"T110E3 prototype",9,["T110E3"]);
setRow(rows,"T110E3",10,[]);
setRow(rows,"T95",8,["T110E3 prototype"]);
setRow(rows,"T110E4 prototype",8,["T110E4"]);
setRow(rows,"T110E4 early",9,["T110E4"]);
setRow(rows,"T110E4",10,[]);
setRow(rows,"T110E5 prototype",7,["T110E5 early"]);
setRow(rows,"T110E5 early",8,["T110E5"]);
setRow(rows,"T110E5",10,[]);
setRow(rows,"M46 Patton",7,["M48A1 Patton"]);
setRow(rows,"M48A1 Patton",8,["M48A2 Patton"]);
setRow(rows,"M48A2 Patton",9,["M48 Patton"]);
setRow(rows,"M48 Patton",10,[]);
setRow(rows,"M103",6,["T110E5 prototype","T110E4 prototype","M6A2E1"]);
setRow(rows,"T57 Heavy",8,["T57 Heavy A"]);
setRow(rows,"T57 Heavy A",9,["M-V-Y"]);
setRow(rows,"M-V-Y",10,[]);
setRow(rows,"M53/55",6,["XM2001 Crusader"]);
setRow(rows,"XM2001 Crusader",8,["T92 HMC B"]);
setRow(rows,"T92 HMC B",9,["T92 HMC"]);
setRow(rows,"T92 HMC",10,[]);
fs.writeFileSync(file,`${rows.map((row)=>row.map(quote).join(",")).join("\n")}\n`,"utf8");
console.log("Set requested USA vehicles to tier X and rebuilt connector levels.");
