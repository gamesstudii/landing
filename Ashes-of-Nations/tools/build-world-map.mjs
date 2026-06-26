import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const countriesPath = path.join(projectRoot, "data", "ne_10m_admin_0_countries.geojson");
const admin1Path = path.join(projectRoot, "data", "ne_10m_admin_1_states_provinces.geojson");
const placesPath = path.join(projectRoot, "data", "ne_10m_populated_places.geojson");
const geonamesPath = path.join(projectRoot, "data", "geonames-cities5000", "cities5000.txt");
const outputPath = path.join(projectRoot, "maps", "мир.json");

const width = 4000;
const height = 2400;
const EMPTY = 0;
const MAX_LAND_PIXELS = 320;
const MAX_SEA_PIXELS = 6000;
const SEA_TILE_WIDTH = 80;
const SEA_TILE_HEIGHT = 75;
const LAND_COLORS = ["#009b76", "#29ab87", "#3bb08f", "#3eb489", "#7c9b46", "#98a94d"];
const SEA_COLORS = ["#1e2460", "#082567", "#191970", "#20155e", "#327da8", "#245d88"];

function colorFor(index, palette) {
  return palette[index % palette.length];
}

function project([lon, lat]) {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

function projectedPixel([lon, lat]) {
  const [rawX, rawY] = project([lon, lat]);
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(rawX))),
    y: Math.max(0, Math.min(height - 1, Math.floor(rawY))),
  };
}

function unwrapRing(points) {
  const projected = points.map(project);
  if (projected.length < 2) return projected;

  const unwrapped = [projected[0]];
  for (let index = 1; index < projected.length; index += 1) {
    let [x, y] = projected[index];
    const previousX = unwrapped[index - 1][0];
    while (x - previousX > width / 2) x -= width;
    while (previousX - x > width / 2) x += width;
    unwrapped.push([x, y]);
  }
  return unwrapped;
}

function fillRings(target, value, rings, mask = null, overwrite = true) {
  const unwrappedRings = rings.map(unwrapRing).filter((ring) => ring.length >= 3);
  if (unwrappedRings.length === 0) return 0;

  const allY = unwrappedRings.flatMap((ring) => ring.map(([, y]) => y));
  const minY = Math.max(0, Math.floor(Math.min(...allY)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...allY)));
  let filled = 0;

  for (let y = minY; y <= maxY; y += 1) {
    const sampleY = y + 0.5;
    const intersections = [];

    for (const ring of unwrappedRings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const [x1, y1] = ring[j];
        const [x2, y2] = ring[i];
        if ((y1 > sampleY) === (y2 > sampleY)) continue;
        intersections.push(x1 + ((sampleY - y1) * (x2 - x1)) / (y2 - y1));
      }
    }

    intersections.sort((a, b) => a - b);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index] - 0.5);
      const end = Math.floor(intersections[index + 1] - 0.5);
      for (let rawX = start; rawX <= end; rawX += 1) {
        const x = ((rawX % width) + width) % width;
        const pixelIndex = y * width + x;
        if (mask && !mask[pixelIndex]) continue;
        if (!overwrite && target[pixelIndex] !== EMPTY) continue;
        if (target[pixelIndex] !== value) {
          target[pixelIndex] = value;
          filled += 1;
        }
      }
    }
  }

  return filled;
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function countryName(properties) {
  return properties.NAME_RU ||
    properties.NAME_LONG ||
    properties.ADMIN ||
    properties.NAME_EN ||
    properties.NAME ||
    "Страна";
}

function adminName(properties) {
  const localName = properties.name_local || "";
  const sourceName = properties.name || "";
  const name = /sakha|yakut/i.test(sourceName)
    ? sourceName
    : localName || sourceName || properties.name_alt || "Регион";
  const country = properties.admin || properties.geonunit || properties.iso_a2 || "";
  return country ? `${country}: ${name}` : name;
}

function pixelBucketsById(raster, definitions) {
  definitions.forEach((region) => {
    region.pixels = [];
  });
  const byId = new Map(definitions.map((region) => [region.id, region]));
  for (let index = 0; index < raster.length; index += 1) {
    const region = byId.get(raster[index]);
    if (!region) continue;
    region.pixels.push({ x: index % width, y: Math.floor(index / width) });
  }
}

function regionPlaces(regionAtPixel, places) {
  const byRegion = new Map();

  for (const place of places) {
    const { x, y } = projectedPixel(place.coordinates);
    const regionId = regionAtPixel[y * width + x];
    if (regionId === EMPTY) continue;
    if (!byRegion.has(regionId)) byRegion.set(regionId, []);
    byRegion.get(regionId).push({
      x,
      y,
      name: place.name,
      population: place.population,
    });
  }

  byRegion.forEach((items) => {
    items.sort((a, b) => b.population - a.population);
  });

  return byRegion;
}

function pickGeneratedSeeds(pixels, seedCount, existingSeeds) {
  const stride = Math.max(1, Math.floor(pixels.length / 1800));
  const samples = [];
  for (let index = 0; index < pixels.length; index += stride) {
    samples.push(pixels[index]);
  }

  const seeds = [...existingSeeds];
  if (seeds.length === 0 && samples.length > 0) {
    seeds.push({ ...samples[Math.floor(samples.length / 2)], name: "" });
  }

  while (seeds.length < seedCount && samples.length > 0) {
    let bestSample = samples[0];
    let bestDistance = -1;

    for (const sample of samples) {
      let nearest = Infinity;
      for (const seed of seeds) {
        const dx = sample.x - seed.x;
        const dy = sample.y - seed.y;
        const distance = dx * dx + dy * dy;
        if (distance < nearest) nearest = distance;
      }
      if (nearest > bestDistance) {
        bestDistance = nearest;
        bestSample = sample;
      }
    }

    seeds.push({ ...bestSample, name: "" });
  }

  return seeds.slice(0, seedCount);
}

function splitLargeRegion(region, maxPixels, nextIdRef, places = []) {
  if (region.pixels.length <= maxPixels) return [region];

  const seedCount = Math.min(600, Math.ceil(region.pixels.length / maxPixels));
  const namedSeeds = places.slice(0, seedCount).map((place) => ({
    x: place.x,
    y: place.y,
    name: place.name,
  }));
  const seeds = pickGeneratedSeeds(region.pixels, seedCount, namedSeeds);
  const buckets = seeds.map(() => []);

  for (const pixel of region.pixels) {
    let nearestSeed = 0;
    let nearestDistance = Infinity;
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      const dx = pixel.x - seed.x;
      const dy = pixel.y - seed.y;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSeed = index;
      }
    }
    buckets[nearestSeed].push(pixel);
  }

  const pending = buckets
    .map((pixels, index) => ({
      pixels,
      name: seeds[index]?.name ? `${region.name}: ${seeds[index].name}` : "",
    }))
    .filter((bucket) => bucket.pixels.length > 0);
  const output = [];

  while (pending.length > 0) {
    const bucket = pending.pop();
    if (bucket.pixels.length <= maxPixels) {
      output.push(bucket);
      continue;
    }

    const splitSeeds = pickGeneratedSeeds(bucket.pixels, 2, []);
    const left = [];
    const right = [];
    for (const pixel of bucket.pixels) {
      const leftDx = pixel.x - splitSeeds[0].x;
      const leftDy = pixel.y - splitSeeds[0].y;
      const rightDx = pixel.x - splitSeeds[1].x;
      const rightDy = pixel.y - splitSeeds[1].y;
      const leftDistance = leftDx * leftDx + leftDy * leftDy;
      const rightDistance = rightDx * rightDx + rightDy * rightDy;
      (leftDistance <= rightDistance ? left : right).push(pixel);
    }

    if (left.length === 0 || right.length === 0) {
      output.push(bucket);
    } else {
      pending.push({ pixels: left, name: bucket.name });
      pending.push({ pixels: right, name: "" });
    }
  }

  return output.map((bucket, index) => ({
    ...region,
    id: index === 0 ? region.id : nextIdRef.next++,
    name: bucket.name || `${region.name} ${index + 1}`,
    pixels: bucket.pixels,
  }));
}

function buildSeaRegions(regionAtPixel, regions, nextIdRef) {
  const queue = new Uint32Array(width * height);
  let seaIndex = 0;
  let currentTileX = 0;
  let currentTileY = 0;

  function enqueueNeighbor(index, writeRef, regionId) {
    if (regionAtPixel[index] !== EMPTY) return writeRef;
    if (Math.floor((index % width) / SEA_TILE_WIDTH) !== currentTileX) return writeRef;
    if (Math.floor(Math.floor(index / width) / SEA_TILE_HEIGHT) !== currentTileY) return writeRef;
    regionAtPixel[index] = regionId;
    queue[writeRef] = index;
    return writeRef + 1;
  }

  for (let start = 0; start < regionAtPixel.length; start += 1) {
    if (regionAtPixel[start] !== EMPTY) continue;

    currentTileX = Math.floor((start % width) / SEA_TILE_WIDTH);
    currentTileY = Math.floor(Math.floor(start / width) / SEA_TILE_HEIGHT);
    const id = nextIdRef.next++;
    seaIndex += 1;
    regions.push({
      id,
      name: `Водный регион ${seaIndex}`,
      type: "sea",
      color: colorFor(seaIndex - 1, SEA_COLORS),
      pixels: [],
    });

    regionAtPixel[start] = id;
    let read = 0;
    let write = 1;
    queue[0] = start;

    while (read < write) {
      const index = queue[read];
      read += 1;
      const x = index % width;

      write = enqueueNeighbor(index - x + ((x + width - 1) % width), write, id);
      write = enqueueNeighbor(index - x + ((x + 1) % width), write, id);
      if (index >= width) write = enqueueNeighbor(index - width, write, id);
      if (index < regionAtPixel.length - width) write = enqueueNeighbor(index + width, write, id);
    }
  }
}

function loadPlaces() {
  const naturalEarthPlaces = JSON.parse(fs.readFileSync(placesPath, "utf8")).features
    .filter((feature) => feature.geometry?.type === "Point")
    .map((feature) => ({
      coordinates: feature.geometry.coordinates,
      name: feature.properties?.NAME_RU ||
        feature.properties?.NAME ||
        feature.properties?.NAMEASCII ||
        "Населенный пункт",
      population: Number(feature.properties?.POP_MAX || 0),
    }));

  const geonamesPlaces = fs.readFileSync(geonamesPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => {
      const columns = row.split("\t");
      return {
        coordinates: [Number(columns[5]), Number(columns[4])],
        name: columns[1] || columns[2] || "Населенный пункт",
        population: Number(columns[14] || 0),
      };
    })
    .filter((place) => Number.isFinite(place.coordinates[0]) && Number.isFinite(place.coordinates[1]));

  const seen = new Set();
  return [...naturalEarthPlaces, ...geonamesPlaces]
    .sort((a, b) => b.population - a.population)
    .filter((place) => {
      const key = `${Math.round(place.coordinates[0] * 1000)}:${Math.round(place.coordinates[1] * 1000)}:${place.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function writeMap(data) {
  const temporaryPath = `${outputPath}.tmp`;
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
  fs.renameSync(temporaryPath, outputPath);
}

function buildMap() {
  const countries = JSON.parse(fs.readFileSync(countriesPath, "utf8")).features.filter((feature) => feature.geometry);
  const admin1 = JSON.parse(fs.readFileSync(admin1Path, "utf8")).features.filter((feature) => feature.geometry);
  const places = loadPlaces();
  const countryAtPixel = new Uint16Array(width * height);
  const regionAtPixel = new Uint32Array(width * height);
  const countriesByRasterId = new Map();
  const regions = [];
  const nextIdRef = { next: 1 };

  countries.forEach((feature, index) => {
    const rasterId = index + 1;
    countriesByRasterId.set(rasterId, {
      name: countryName(feature.properties || {}),
      color: colorFor(index, LAND_COLORS),
    });
    for (const polygon of geometryPolygons(feature.geometry)) {
      fillRings(countryAtPixel, rasterId, polygon);
    }
  });

  admin1
    .sort((a, b) => Number(b.properties?.area_sqkm || 0) - Number(a.properties?.area_sqkm || 0))
    .forEach((feature) => {
      const region = {
        id: nextIdRef.next,
        name: adminName(feature.properties || {}),
        type: "land",
        color: colorFor(regions.length, LAND_COLORS),
        pixels: [],
      };
      let filled = 0;
      for (const polygon of geometryPolygons(feature.geometry)) {
        filled += fillRings(regionAtPixel, region.id, polygon, countryAtPixel, true);
      }
      if (filled > 0) {
        regions.push(region);
        nextIdRef.next += 1;
      }
    });

  const fallbackRegionByCountry = new Map();
  for (let index = 0; index < countryAtPixel.length; index += 1) {
    const countryId = countryAtPixel[index];
    if (countryId === EMPTY || regionAtPixel[index] !== EMPTY) continue;
    if (!fallbackRegionByCountry.has(countryId)) {
      const country = countriesByRasterId.get(countryId);
      const region = {
        id: nextIdRef.next++,
        name: country?.name || "Страна",
        type: "land",
        color: country?.color || colorFor(regions.length, LAND_COLORS),
        pixels: [],
      };
      fallbackRegionByCountry.set(countryId, region);
      regions.push(region);
    }
    regionAtPixel[index] = fallbackRegionByCountry.get(countryId).id;
  }

  buildSeaRegions(regionAtPixel, regions, nextIdRef);
  pixelBucketsById(regionAtPixel, regions);
  const placesByRegion = regionPlaces(regionAtPixel, places);

  const splitRegions = [];
  for (const region of regions) {
    const maxPixels = region.type === "sea" ? MAX_SEA_PIXELS : MAX_LAND_PIXELS;
    splitRegions.push(...splitLargeRegion(region, maxPixels, nextIdRef, placesByRegion.get(region.id) || []));
  }

  const data = {
    name: "Мир",
    width,
    height,
    regions: splitRegions.filter((region) => region.pixels.length > 0),
  };

  return writeMap(data).then(() => {
  console.log(`Wrote ${outputPath}`);
  console.log(`Regions: ${data.regions.length}`);
  console.log(`Pixels: ${data.regions.reduce((sum, region) => sum + region.pixels.length, 0)}`);
  console.log(`Land regions: ${data.regions.filter((region) => region.type === "land").length}`);
  console.log(`Sea regions: ${data.regions.filter((region) => region.type === "sea").length}`);
  });
}

await buildMap();
