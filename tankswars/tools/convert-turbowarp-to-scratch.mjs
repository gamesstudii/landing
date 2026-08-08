import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve("scratch/source-1.1.0.0-unpacked");
const outputDir = path.resolve("scratch/1.1.0.0-scratch-compatible-unpacked");
fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

const projectFile = path.join(outputDir, "project.json");
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const stage = project.targets.find(target => target.isStage);
const variablesByName = new Map(Object.entries(stage.variables).map(([id, [name]]) => [name, id]));
let generated = 0;
const stats = {};
const count = opcode => { stats[opcode] = (stats[opcode] || 0) + 1; };
const literal = (type, value) => [1, [type, String(value)]];
const number = value => literal(4, value);
const text = value => literal(10, value);

function inputValue(input) {
  if (!Array.isArray(input)) return "";
  const value = input[1];
  if (Array.isArray(value) && [4, 5, 6, 7, 8, 9, 10, 11].includes(value[0])) return value[1];
  return "";
}
function savedVariable(key) {
  const normalized = String(key || "").trim();
  const preferred = variablesByName.has(normalized) ? normalized : `сохранение//${normalized || "без ключа"}`;
  if (!variablesByName.has(preferred)) {
    const id = `scratch_save_${Buffer.from(preferred).toString("hex").slice(0, 50)}`;
    stage.variables[id] = [preferred, 0];
    variablesByName.set(preferred, id);
  }
  return [preferred, variablesByName.get(preferred)];
}
function noOp(block) {
  block.opcode = "control_wait";
  block.inputs = { DURATION: number(0) };
  block.fields = {};
}
function emptyReporter(block, value = "") {
  block.opcode = "operator_join";
  block.inputs = { STRING1: text(value), STRING2: text("") };
  block.fields = {};
}
function child(blocks, parent, opcode, inputs) {
  const id = `scratch_generated_${++generated}`;
  blocks[id] = { opcode, next: null, parent, inputs, fields: {}, shadow: false, topLevel: false };
  for (const input of Object.values(inputs)) {
    if (Array.isArray(input) && typeof input[1] === "string" && blocks[input[1]]) blocks[input[1]].parent = id;
  }
  return id;
}

for (const target of project.targets) {
  const blocks = target.blocks || {};
  const usedAsInput = new Set();
  for (const block of Object.values(blocks)) {
    for (const input of Object.values(block?.inputs || {})) {
      if (Array.isArray(input) && typeof input[1] === "string") usedAsInput.add(input[1]);
    }
  }
  for (const [id, block] of Object.entries(blocks)) {
    const original = block.opcode;
    if (!original) continue;
    if (original === "localstorage_get") {
      const [name, variableId] = savedVariable(inputValue(block.inputs.KEY));
      block.opcode = "data_variable";
      block.inputs = {};
      block.fields = { VARIABLE: [name, variableId] };
    } else if (original === "localstorage_set") {
      const [name, variableId] = savedVariable(inputValue(block.inputs.KEY));
      block.opcode = "data_setvariableto";
      block.inputs = { VALUE: block.inputs.VALUE || text(0) };
      block.fields = { VARIABLE: [name, variableId] };
    } else if (original === "truefantommath_negative_block") {
      block.opcode = "operator_subtract";
      block.inputs = { NUM1: number(0), NUM2: block.inputs.A || number(0) };
      block.fields = {};
    } else if (original === "truefantommath_less_or_equal_block") {
      const compare = child(blocks, id, "operator_gt", { OPERAND1: block.inputs.A || number(0), OPERAND2: block.inputs.B || number(0) });
      block.opcode = "operator_not";
      block.inputs = { OPERAND: [2, compare] };
      block.fields = {};
    } else if (original === "truefantommath_between_or_equal" || original === "truefantommath_between") {
      const strict = original === "truefantommath_between";
      const lowerOpcode = strict ? "operator_gt" : "operator_not";
      const upperOpcode = strict ? "operator_lt" : "operator_not";
      let lower;
      let upper;
      if (strict) {
        lower = child(blocks, id, lowerOpcode, { OPERAND1: block.inputs.B || number(0), OPERAND2: block.inputs.A || number(0) });
        upper = child(blocks, id, upperOpcode, { OPERAND1: block.inputs.B || number(0), OPERAND2: block.inputs.C || number(0) });
      } else {
        const below = child(blocks, null, "operator_lt", { OPERAND1: block.inputs.B || number(0), OPERAND2: block.inputs.A || number(0) });
        const above = child(blocks, null, "operator_gt", { OPERAND1: block.inputs.B || number(0), OPERAND2: block.inputs.C || number(0) });
        lower = child(blocks, id, "operator_not", { OPERAND: [2, below] });
        upper = child(blocks, id, "operator_not", { OPERAND: [2, above] });
        blocks[below].parent = lower;
        blocks[above].parent = upper;
      }
      block.opcode = "operator_and";
      block.inputs = { OPERAND1: [2, lower], OPERAND2: [2, upper] };
      block.fields = {};
    } else if (original === "text_setText" || original === "text_addLine") {
      block.opcode = "looks_say";
      block.inputs = { MESSAGE: block.inputs.TEXT || text("") };
      block.fields = {};
    } else if (["text_setColor", "text_setFont", "text_setWidth", "runtimeoptions_setFramerate", "runtimeoptions_setEnabled", "runtimeoptions_setCloneLimit", "localstorage_setProjectId", "lmsclonesplus_deleteClonesInSprite", "clipboard_setClipboard", "MouseCursor_setCursorImage"].includes(original)) {
      noOp(block);
    } else if (original === "dogeiscutformatnumbers_formatNumber") {
      block.opcode = "operator_join";
      block.inputs = { STRING1: block.inputs.NUM || block.inputs.NUMBER || number(0), STRING2: text("") };
      block.fields = {};
    } else if (original === "lmsLooksPlus_spriteVisible") {
      block.opcode = "operator_equals";
      block.inputs = { OPERAND1: number(0), OPERAND2: number(1) };
      block.fields = {};
    } else {
      const prefix = original.split("_")[0];
      const allowed = ["motion", "looks", "sound", "event", "control", "sensing", "operator", "data", "procedures", "argument", "pen", "music", "videoSensing", "text2speech", "translate", "makeymakey", "microbit", "ev3", "wedo2", "boost", "gdxfor"].includes(prefix);
      if (!allowed) {
        if (usedAsInput.has(id)) emptyReporter(block, inputValue(Object.values(block.inputs || {})[0]));
        else noOp(block);
      } else {
        continue;
      }
    }
    count(original);
  }
}

project.extensions = (project.extensions || []).filter(extension => ["pen", "music", "videoSensing", "text2speech", "translate", "makeymakey", "microbit", "ev3", "wedo2", "boost", "gdxfor"].includes(extension));
project.meta = { semver: "3.0.0", vm: project.meta?.vm || "11.1.0", agent: "Games Studio — Scratch-compatible conversion" };
stage.variables.scratch_compatibility_mode = ["TW//режим совместимости", "Scratch 3"];
fs.writeFileSync(projectFile, JSON.stringify(project));
console.log(JSON.stringify({ converted: Object.values(stats).reduce((sum, value) => sum + value, 0), generated, stats }, null, 2));
