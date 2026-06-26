import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(projectRoot, "maps", "мир.json");

const EMPTY = 0;
const SEA_TILE_WIDTH = 80;
const SEA_TILE_HEIGHT = 75;
const SEA_COLORS = ["#1e2460", "#082567", "#191970", "#20155e", "#327da8", "#245d88"];

function colorFor(index) {
  return SEA_COLORS[index % SEA_COLORS.length];
}

async function writeMap(filePath, data) {
  const temporaryPath = `${filePath}.tmp`;
  const stream = fs.createWriteStream(temporaryPath, { encoding: "utf8" });
  stream.write(`{"name":${JSON.stringify(data.name)},"width":${data.width},"height":${data.height},"regions":[`);

  for (let index = 0; index < data.regions.length; index += 1) {
    const region = data.regions[index];
    if (index > 0) stream.write(",");
    stream.write(`{"id":${region.id},"name":${JSON.stringify(region.name)},"type":${JSON.stringify(region.type)},"color":${JSON.stringify(region.color)},"pixels":[`);
    for (let pixelIndex = 0; pixelIndex < region.pixels.length; pixelIndex += 1) {
      const pixel = region.pixels[pixelIndex];
      if (pixelIndex > 0) stream.write(",");
      stream.write(`{"x":${pixel.x},"y":${pixel.y}}`);
    }
    stream.write("]}");
  }

  stream.end("]}\n");
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  fs.renameSync(temporaryPath, filePath);
}

function buildSeaRegions(regionAtPixel, width, height, nextId) {
  const queue = new Uint32Array(width * height);
  const seaRegions = [];
  let seaIndex = 0;

  function enqueue(index, writeRef, regionId, tileX, tileY) {
    if (regionAtPixel[index] !== EMPTY) return writeRef;
    if (Math.floor((index % width) / SEA_TILE_WIDTH) !== tileX) return writeRef;
    if (Math.floor(Math.floor(index / width) / SEA_TILE_HEIGHT) !== tileY) return writeRef;
    regionAtPixel[index] = regionId;
    queue[writeRef] = index;
    return writeRef + 1;
  }

  for (let start = 0; start < regionAtPixel.length; start += 1) {
    if (regionAtPixel[start] !== EMPTY) continue;

    const tileX = Math.floor((start % width) / SEA_TILE_WIDTH);
    const tileY = Math.floor(Math.floor(start / width) / SEA_TILE_HEIGHT);
    const id = nextId++;
    const pixels = [];
    seaIndex += 1;

    regionAtPixel[start] = id;
    let read = 0;
    let write = 1;
    queue[0] = start;

    while (read < write) {
      const index = queue[read++];
      const x = index % width;
      pixels.push({ x, y: Math.floor(index / width) });

      write = enqueue(index - x + ((x + width - 1) % width), write, id, tileX, tileY);
      write = enqueue(index - x + ((x + 1) % width), write, id, tileX, tileY);
      if (index >= width) write = enqueue(index - width, write, id, tileX, tileY);
      if (index < regionAtPixel.length - width) write = enqueue(index + width, write, id, tileX, tileY);
    }

    seaRegions.push({
      id,
      name: `Водный регион ${seaIndex}`,
      type: "sea",
      color: colorFor(seaIndex - 1),
      pixels,
    });
  }

  return seaRegions;
}

const mapData = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const width = Number(mapData.width);
const height = Number(mapData.height);
const landRegions = mapData.regions.filter((region) => region.type === "land");
const regionAtPixel = new Uint32Array(width * height);

for (const region of landRegions) {
  const id = Number(region.id);
  for (const pixel of region.pixels || []) {
    if (pixel.x >= 0 && pixel.y >= 0 && pixel.x < width && pixel.y < height) {
      regionAtPixel[pixel.y * width + pixel.x] = id;
    }
  }
}

const nextId = Math.max(0, ...landRegions.map((region) => Number(region.id))) + 1;
const seaRegions = buildSeaRegions(regionAtPixel, width, height, nextId);

await writeMap(mapPath, {
  name: mapData.name,
  width,
  height,
  regions: [...landRegions, ...seaRegions],
});

console.log(`Wrote ${mapPath}`);
console.log(`Land regions: ${landRegions.length}`);
console.log(`Sea regions: ${seaRegions.length}`);
console.log(`Total regions: ${landRegions.length + seaRegions.length}`);
