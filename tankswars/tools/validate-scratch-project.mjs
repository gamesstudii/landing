import fs from "node:fs";
import path from "node:path";

const projectFile = process.argv[2];
if (!projectFile) throw new Error("Usage: node tools/validate-scratch-project.mjs <project.json>");
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const directory = path.dirname(projectFile);
const errors = [];
let blocks = 0;
let assets = 0;
for (const target of project.targets) {
  const targetBlocks = target.blocks || {};
  for (const [id, block] of Object.entries(targetBlocks)) {
    if (!block?.opcode) continue;
    blocks += 1;
    for (const [field, reference] of [["next", block.next], ["parent", block.parent]]) {
      if (reference && !targetBlocks[reference]) errors.push(`${target.name}/${id}: missing ${field} ${reference}`);
    }
    for (const input of Object.values(block.inputs || {})) {
      if (Array.isArray(input) && typeof input[1] === "string" && !targetBlocks[input[1]]) {
        errors.push(`${target.name}/${id}: missing input ${input[1]}`);
      }
    }
  }
  for (const asset of [...(target.costumes || []), ...(target.sounds || [])]) {
    assets += 1;
    if (!fs.existsSync(path.join(directory, asset.md5ext))) errors.push(`${target.name}: missing asset ${asset.md5ext}`);
  }
}
const stage = project.targets.find(target => target.isStage);
const tankList = Object.values(stage.lists).find(([name]) => name === "о танках//танки")?.[1] || [];
console.log(JSON.stringify({ targets: project.targets.length, blocks, assets, tankRecords: tankList.length, extensions: project.extensions, errors: errors.slice(0, 20), errorCount: errors.length }, null, 2));
if (errors.length) process.exitCode = 1;
