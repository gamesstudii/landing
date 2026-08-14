import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || "scratch/source-1.1.0.0-unpacked/project.json";
const project = JSON.parse(fs.readFileSync(file, "utf8"));
const corePrefixes = new Set(["motion", "looks", "sound", "event", "control", "sensing", "operator", "data", "procedures", "argument"]);
const officialPrefixes = new Set(["pen", "music", "videoSensing", "text2speech", "translate", "makeymakey", "microbit", "ev3", "wedo2", "boost", "gdxfor"]);
const opcodeCounts = new Map();
let blocks = 0;
for (const target of project.targets) {
  for (const block of Object.values(target.blocks || {})) {
    if (!block?.opcode) continue;
    blocks += 1;
    const prefix = block.opcode.split("_")[0];
    if (!corePrefixes.has(prefix) && !officialPrefixes.has(prefix)) {
      opcodeCounts.set(block.opcode, (opcodeCounts.get(block.opcode) || 0) + 1);
    }
  }
}
const unsupported = [...opcodeCounts].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({
  file,
  targets: project.targets.length,
  blocks,
  assets: fs.readdirSync(path.dirname(file)).length - 1,
  extensions: project.extensions || [],
  unsupported,
  turboWarp: project.meta?.platform || project.meta?.agent || null
}, null, 2));
