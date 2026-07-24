import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const ROOT = new URL("../", import.meta.url);
const MAP_PATH = new URL("maps/%D0%BC%D0%B8%D1%80.json", ROOT);
const SCENARIO_PATH = new URL("scenarios/2026.json", ROOT);
const RENDER_RUNS = 8;
const TURN_RUNS = 35;

function hexToRgb(hex) {
  const value = String(hex || "#263238").replace("#", "");
  const full = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value.padEnd(6, "0").slice(0, 6);
  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function packRgba(red, green, blue, alpha = 255) {
  return (alpha << 24) | (blue << 16) | (green << 8) | red;
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] || 0;
}

function stats(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    avg: total / values.length,
    p95: percentile(values, 0.95),
    max: Math.max(...values),
  };
}

function buildRuntimeMap(map) {
  const started = performance.now();
  const regionAtPixel = new Uint32Array(map.width * map.height);
  const regionTypeById = new Map();
  const regionRgbById = new Map();
  map.regions.forEach((region) => {
    const id = Number(region.id);
    regionTypeById.set(id, region.type || "");
    regionRgbById.set(id, hexToRgb(region.color || "#263238"));
    (region.pixels || []).forEach((pixel) => {
      if (pixel.x >= 0 && pixel.y >= 0 && pixel.x < map.width && pixel.y < map.height) {
        regionAtPixel[pixel.y * map.width + pixel.x] = id;
      }
    });
  });

  const allRegionIds = new Set(map.regions.map((region) => Number(region.id)));
  const maxRegionId = Math.max(0, ...allRegionIds);
  const waterPacked = new Uint32Array(map.width * map.height);
  for (let index = 0; index < regionAtPixel.length; index += 1) {
    if (regionTypeById.get(regionAtPixel[index]) === "sea") {
      waterPacked[index] = packRgba(38, 74, 91);
    }
  }

  const borderSegments = [];
  const addSegment = (regionA, regionB) => {
    if (!regionA || !regionB || regionA === regionB) return;
    if (regionTypeById.get(regionA) === "sea" && regionTypeById.get(regionB) === "sea") return;
    borderSegments.push(regionA, regionB, 0, 0, 0, 0);
  };
  for (let y = 0; y < map.height; y += 1) {
    const row = y * map.width;
    for (let x = 0; x < map.width; x += 1) {
      const index = row + x;
      const regionA = regionAtPixel[index];
      if (x < map.width - 1) addSegment(regionA, regionAtPixel[index + 1]);
      if (y < map.height - 1) addSegment(regionA, regionAtPixel[index + map.width]);
    }
  }

  return {
    buildMs: performance.now() - started,
    regionAtPixel,
    regionTypeById,
    regionRgbById,
    waterPacked,
    borderSegments,
    maxRegionId,
    imagePixels: new Uint32Array(map.width * map.height),
  };
}

function renderPass(map, scenario, runtime) {
  const ownerByRegion = new Map();
  const countryRgbById = new Map();
  scenario.countries.forEach((country) => {
    countryRgbById.set(Number(country.id), hexToRgb(country.color));
    (country.regionIds || []).forEach((regionId) => ownerByRegion.set(Number(regionId), country));
  });

  const regionRenderPacked = new Uint32Array(runtime.maxRegionId + 1);
  const dynamicWaterByRegion = new Uint8Array(runtime.maxRegionId + 1);
  for (const region of map.regions) {
    const regionId = Number(region.id);
    const country = ownerByRegion.get(regionId);
    let color = country ? countryRgbById.get(Number(country.id)) : runtime.regionRgbById.get(regionId);
    if (runtime.regionTypeById.get(regionId) === "sea") {
      dynamicWaterByRegion[regionId] = 1;
      color = [38, 74, 91];
    }
    regionRenderPacked[regionId] = packRgba(color[0], color[1], color[2]);
  }

  for (let index = 0; index < runtime.regionAtPixel.length; index += 1) {
    const regionId = runtime.regionAtPixel[index];
    runtime.imagePixels[index] = dynamicWaterByRegion[regionId]
      ? runtime.waterPacked[index]
      : regionRenderPacked[regionId];
  }

  let frontChecksum = 0;
  for (let index = 0; index < runtime.borderSegments.length; index += 6) {
    const countryA = ownerByRegion.get(runtime.borderSegments[index])?.id || 0;
    const countryB = ownerByRegion.get(runtime.borderSegments[index + 1])?.id || 0;
    if (countryA !== countryB) frontChecksum += countryA + countryB;
  }
  return frontChecksum;
}

async function yieldToUi() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function turnPass(scenario) {
  let checksum = 0;
  let sliceStarted = performance.now();
  let maxSliceMs = 0;
  const endSlice = () => {
    maxSliceMs = Math.max(maxSliceMs, performance.now() - sliceStarted);
  };
  const beginSlice = () => {
    sliceStarted = performance.now();
  };
  const countries = scenario.countries;
  for (let index = 0; index < countries.length; index += 1) {
    const country = countries[index];
    const regionCount = country.regionIds?.length || 0;
    checksum += regionCount * (Number(country.id) || 1);
    if (index > 0 && index % 18 === 0) {
      endSlice();
      await yieldToUi();
      beginSlice();
    }
  }
  for (let index = 0; index < countries.length; index += 1) {
    const country = countries[index];
    checksum += (country.name?.length || 0) * 3;
    if (index > 0 && index % 10 === 0) {
      endSlice();
      await yieldToUi();
      beginSlice();
    }
  }
  endSlice();
  return { checksum, maxSliceMs };
}

const [map, scenario] = await Promise.all([
  readFile(MAP_PATH, "utf8").then(JSON.parse),
  readFile(SCENARIO_PATH, "utf8").then(JSON.parse),
]);

const runtime = buildRuntimeMap(map);
const renderTimes = [];
let renderChecksum = 0;
for (let run = 0; run < RENDER_RUNS; run += 1) {
  const started = performance.now();
  renderChecksum += renderPass(map, scenario, runtime);
  renderTimes.push(performance.now() - started);
}

const turnTimes = [];
const turnSliceTimes = [];
let turnChecksum = 0;
for (let run = 0; run < TURN_RUNS; run += 1) {
  const started = performance.now();
  const result = await turnPass(scenario);
  turnChecksum += result.checksum;
  turnSliceTimes.push(result.maxSliceMs);
  turnTimes.push(performance.now() - started);
}

const renderStats = stats(renderTimes);
const turnStats = stats(turnTimes);
const turnSliceStats = stats(turnSliceTimes);
const ok = runtime.buildMs < 1500 && renderStats.p95 < 180 && turnSliceStats.p95 < 20 && turnStats.p95 < 800;

console.log(JSON.stringify({
  ok,
  thresholds: {
    runtimeBuildMs: 1500,
    renderP95Ms: 180,
    turnBlockingSliceP95Ms: 20,
    turnTotalP95Ms: 800,
  },
  map: {
    name: map.name,
    width: map.width,
    height: map.height,
    pixels: map.width * map.height,
    regions: map.regions.length,
    borderSegments: runtime.borderSegments.length / 6,
  },
  scenario: {
    name: scenario.name,
    countries: scenario.countries.length,
  },
  timingsMs: {
    runtimeBuild: Number(runtime.buildMs.toFixed(2)),
    renderAvg: Number(renderStats.avg.toFixed(2)),
    renderP95: Number(renderStats.p95.toFixed(2)),
    renderMax: Number(renderStats.max.toFixed(2)),
    turnChunkAvg: Number(turnStats.avg.toFixed(2)),
    turnChunkP95: Number(turnStats.p95.toFixed(2)),
    turnChunkMax: Number(turnStats.max.toFixed(2)),
    turnBlockingSliceAvg: Number(turnSliceStats.avg.toFixed(2)),
    turnBlockingSliceP95: Number(turnSliceStats.p95.toFixed(2)),
    turnBlockingSliceMax: Number(turnSliceStats.max.toFixed(2)),
  },
  checksums: {
    render: renderChecksum,
    turn: turnChecksum,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
