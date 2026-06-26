import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapsDirectory = path.join(projectRoot, "maps");
const scenariosDirectory = path.join(projectRoot, "scenarios");
const dataDirectory = path.join(projectRoot, "data");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function jsonFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "ru"));
}

async function buildMaps() {
  const maps = [];
  for (const file of await jsonFiles(mapsDirectory)) {
    if (file === "manifest.json") continue;
    try {
      const data = await readJson(path.join(mapsDirectory, file));
      if (data?.width && data?.height && Array.isArray(data.regions)) {
        maps.push({
          name: data.name || path.basename(file, ".json"),
          file,
          path: `maps/${file}`,
          width: Number(data.width),
          height: Number(data.height),
          regions: data.regions.length,
        });
      }
    } catch {
      console.warn(`Skipped invalid map: ${file}`);
    }
  }
  return maps;
}

async function buildScenarios() {
  const scenarios = [];
  for (const file of await jsonFiles(scenariosDirectory)) {
    if (file === "manifest.json") continue;
    try {
      const data = await readJson(path.join(scenariosDirectory, file));
      if (data?.format === "ashes-of-nations-scenario" && Array.isArray(data.countries)) {
        scenarios.push({
          name: data.name || path.basename(file, ".json"),
          year: data.year ? Number(data.year) : null,
          file,
          path: `scenarios/${file}`,
          mapFile: data.map?.file ? path.basename(String(data.map.file)) : null,
          mapName: data.map?.name || null,
          countries: data.countries.length,
        });
      }
    } catch {
      console.warn(`Skipped invalid scenario: ${file}`);
    }
  }
  return scenarios.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}

await fs.mkdir(dataDirectory, { recursive: true });
const [maps, scenarios] = await Promise.all([buildMaps(), buildScenarios()]);

await fs.writeFile(
  path.join(dataDirectory, "maps-catalog.js"),
  `window.MAPS_CATALOG = ${JSON.stringify(maps)};\n`,
  "utf8",
);
await fs.writeFile(
  path.join(dataDirectory, "scenarios-catalog.js"),
  `window.SCENARIOS_CATALOG = ${JSON.stringify(scenarios)};\n`,
  "utf8",
);
await fs.writeFile(path.join(mapsDirectory, "manifest.json"), `${JSON.stringify({ maps }, null, 2)}\n`, "utf8");
await fs.writeFile(
  path.join(scenariosDirectory, "manifest.json"),
  `${JSON.stringify({ scenarios }, null, 2)}\n`,
  "utf8",
);

console.log(`Content catalog updated: ${maps.length} maps, ${scenarios.length} scenarios.`);
