import fs from "node:fs";

const project = JSON.parse(fs.readFileSync("scratch/source-1.1.0.0-unpacked/project.json", "utf8"));
const wanted = new Set(process.argv.slice(2));
const seen = new Set();
for (const target of project.targets) {
  for (const [id, block] of Object.entries(target.blocks || {})) {
    if (!wanted.has(block.opcode) || seen.has(block.opcode)) continue;
    seen.add(block.opcode);
    console.log(JSON.stringify({ target: target.name, id, block }, null, 2));
  }
}
