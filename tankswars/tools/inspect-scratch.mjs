import fs from "node:fs";

const project = JSON.parse(fs.readFileSync("scratch/source-unpacked/project.json", "utf8"));
const stage = project.targets.find(target => target.isStage);
console.log(JSON.stringify({
  targets: project.targets.map(target => ({
    name: target.name,
    stage: target.isStage,
    blocks: Object.keys(target.blocks || {}).length,
    costumes: target.costumes?.length || 0,
    sounds: target.sounds?.length || 0,
    variables: Object.keys(target.variables || {}).length,
    lists: Object.keys(target.lists || {}).length
  })),
  monitors: project.monitors.length,
  extensions: project.extensions,
  stageVariables: Object.values(stage.variables || {}).map(([name]) => name),
  stageLists: Object.values(stage.lists || {}).map(([name, value]) => ({ name, length: value.length })),
  broadcasts: Object.values(stage.broadcasts || {}),
  backdrops: stage.costumes.map(costume => costume.name)
}, null, 2));
