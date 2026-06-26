import fs from "node:fs/promises";

const MAP_PATH = "maps/мир.json";
const COUNTRIES_PATH = "data/ne_10m_admin_0_countries.geojson";
const PLACES_PATH = "data/ne_10m_populated_places.geojson";
const OUTPUT_PATH = "scenarios/2026.json";
const YEAR = 2026;

const COLORS = [
  "#c33f37", "#3978a8", "#55a05a", "#c79a32",
  "#8b5bb1", "#d36d2f", "#2f9c95", "#be5686",
  "#6d7f32", "#5164bd", "#a66b42", "#4e9bc2",
];

const OWNER_OVERRIDES = new Map([
  ["Kosovo", "Republic of Serbia"],
  ["Филиппины", "Philippines"],
  ["Южное Патагонское ледниковое плато", "Argentina"],
  ["Taiwan", "China"],
  ["Hong Kong S.A.R.", "China"],
  ["Macau S.A.R", "China"],
  ["Northern Cyprus", "Cyprus"],
  ["Somaliland", "Somalia"],
  ["Western Sahara", "Morocco"],
  ["Siachen Glacier", "India"],
  ["Gaza Strip", "Palestine"],
  ["West Bank", "Palestine"],
  ["Akrotiri Sovereign Base Area", "United Kingdom"],
  ["Dhekelia Sovereign Base Area", "United Kingdom"],
  ["Baykonur Cosmodrome", "Russia"],
  ["US Naval Base Guantanamo Bay", "United States of America"],
  ["Военная база Гуантанамо", "United States of America"],
  ["Caribbean Netherlands", "Netherlands"],
  ["Aruba", "Netherlands"],
  ["Curaçao", "Netherlands"],
  ["Sint Maarten", "Netherlands"],
  ["Синт-Мартен", "Netherlands"],
  ["Aland", "Finland"],
  ["Аландские острова", "Finland"],
]);

const REGION_OWNER_RULES = [
  { test: /^Ukraine: (Donets'k|Luhans'k):/i, owner: "Russia" },
  { test: /^Ukraine: (Kherson|Zaporizhzhya):/i, owner: "Russia" },
  { test: /^Russia: (Crimea|Sevastopol)(:|$)/i, owner: "Russia" },
];

const NAME_OVERRIDES_RU = new Map([
  ["Cuba", "Куба"],
  ["Republic of Serbia", "Сербия"],
  ["United States of America", "США"],
  ["United Kingdom", "Великобритания"],
  ["S. Sudan", "Южный Судан"],
  ["Swaziland", "Эсватини"],
  ["Macedonia", "Северная Македония"],
  ["Ivory Coast", "Кот-д'Ивуар"],
  ["Democratic Republic of the Congo", "ДР Конго"],
  ["Republic of the Congo", "Республика Конго"],
  ["United Republic of Tanzania", "Танзания"],
  ["The Bahamas", "Багамы"],
  ["East Timor", "Восточный Тимор"],
  ["Palestine", "Палестина"],
]);

const LEADER_OVERRIDES = new Map([
  ["China", "Си Цзиньпин"],
  ["Russia", "Владимир Путин"],
  ["France", "Эмманюэль Макрон"],
  ["United Kingdom", "Карл III; Кир Стармер"],
  ["United States of America", "Дональд Трамп"],
  ["Netherlands", "Виллем-Александр; Дик Схоф"],
  ["Norway", "Харальд V; Йонас Гар Стёре"],
  ["Philippines", "Фердинанд Маркос-младший"],
  ["Macedonia", "Гордана Силяновска-Давкова; Христиан Мицкоски"],
  ["Cape Verde", "Жозе Мария Невеш; Улиссеш Коррейя-и-Силва"],
  ["Cuba", "Мигель Диас-Канель"],
  ["Guinea Bissau", "Умару Сисоку Эмбало"],
  ["Swaziland", "Мсвати III; Рассел Дламини"],
  ["Republic of Serbia", "Александар Вучич"],
  ["Cyprus", "Никос Христодулидис"],
  ["Somalia", "Хасан Шейх Мохамуд"],
  ["Morocco", "Мухаммед VI"],
  ["Palestine", "Махмуд Аббас"],
  ["Antarctica", "Договор об Антарктике"],
]);

const displayNames = new Intl.DisplayNames(["ru"], { type: "region" });

function project([lon, lat], width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(((lon + 180) / 360) * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor(((90 - lat) / 180) * height))),
  };
}

function regionPrefix(regionName) {
  return String(regionName).split(":")[0].trim();
}

function scenarioOwner(regionName) {
  for (const rule of REGION_OWNER_RULES) {
    if (rule.test.test(regionName)) return rule.owner;
  }
  const prefix = regionPrefix(regionName);
  return OWNER_OVERRIDES.get(prefix) || prefix;
}

function flagEmoji(iso2) {
  if (!/^[A-Z]{2}$/.test(iso2 || "")) return "";
  return [...iso2].map((letter) =>
    String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)
  ).join("");
}

function flagDataUri(iso2) {
  const emoji = flagEmoji(iso2);
  if (!emoji) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#f4f1e8"/><text x="32" y="31" text-anchor="middle" font-size="28">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function countryNameRu(owner, meta) {
  if (NAME_OVERRIDES_RU.has(owner)) return NAME_OVERRIDES_RU.get(owner);
  if (meta?.nameRu) return meta.nameRu;
  if (/^[A-Z]{2}$/.test(meta?.iso2 || "")) {
    return displayNames.of(meta.iso2) || owner;
  }
  return owner;
}

async function loadCountryMeta() {
  const geojson = JSON.parse(await fs.readFile(COUNTRIES_PATH, "utf8"));
  const meta = new Map();
  for (const feature of geojson.features || []) {
    const properties = feature.properties || {};
    const names = [
      properties.ADMIN,
      properties.NAME,
      properties.NAME_LONG,
      properties.SOVEREIGNT,
      properties.BRK_NAME,
    ].filter(Boolean);
    const item = {
      admin: properties.ADMIN,
      sovereign: properties.SOVEREIGNT,
      nameRu: properties.NAME_RU || null,
      iso2: /^[A-Z]{2}$/.test(properties.ISO_A2) ? properties.ISO_A2 : null,
      iso3: /^[A-Z]{3}$/.test(properties.ISO_A3) ? properties.ISO_A3 : null,
      score: properties.ADMIN === properties.SOVEREIGNT
        ? 4
        : properties.TYPE === "Sovereign country"
          ? 3
          : /^[A-Z]{2}$/.test(properties.ISO_A2)
            ? 2
            : 1,
    };
    for (const name of names) {
      if (!meta.has(name) || item.score > meta.get(name).score) meta.set(name, item);
    }
  }
  meta.set("Palestine", { nameRu: "Палестина", iso2: "PS", iso3: "PSE" });
  return meta;
}

async function loadCapitals() {
  const geojson = JSON.parse(await fs.readFile(PLACES_PATH, "utf8"));
  const byIso = new Map();
  const byCountry = new Map();

  for (const feature of geojson.features || []) {
    const properties = feature.properties || {};
    if (properties.FEATURECLA !== "Admin-0 capital") continue;
    if (feature.geometry?.type !== "Point") continue;

    const capital = {
      name: properties.NAME_RU || properties.NAME || "Capital",
      coordinates: feature.geometry.coordinates,
    };
    if (properties.ISO_A2 && !byIso.has(properties.ISO_A2)) {
      byIso.set(properties.ISO_A2, capital);
    }
    if (properties.ADM0NAME && !byCountry.has(properties.ADM0NAME)) {
      byCountry.set(properties.ADM0NAME, capital);
    }
  }

  return { byIso, byCountry };
}

async function loadWikidataLeaders() {
  const query = `
SELECT ?countryLabel ?iso2 ?headStateLabel ?headGovLabel WHERE {
  ?country wdt:P31/wdt:P279* wd:Q3624078;
           wdt:P297 ?iso2.
  OPTIONAL { ?country wdt:P35 ?headState. }
  OPTIONAL { ?country wdt:P6 ?headGov. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru,en". }
}`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  const response = await fetch(url, {
    headers: { "User-Agent": "AshesOfNationsScenarioBuilder/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Wikidata leaders: HTTP ${response.status}`);
  }
  const data = await response.json();
  const leaders = new Map();
  for (const row of data.results?.bindings || []) {
    const iso2 = row.iso2?.value;
    const headState = row.headStateLabel?.value || "";
    const headGov = row.headGovLabel?.value || "";
    if (!iso2 || leaders.has(iso2)) continue;
    leaders.set(iso2, headGov && headGov !== headState ? `${headState}; ${headGov}` : headState || headGov);
  }
  return leaders;
}

function buildRegionAtPixel(mapData) {
  const regionAtPixel = new Uint32Array(mapData.width * mapData.height);
  for (const region of mapData.regions) {
    const id = Number(region.id);
    for (const pixel of region.pixels || []) {
      if (pixel.x >= 0 && pixel.y >= 0 && pixel.x < mapData.width && pixel.y < mapData.height) {
        regionAtPixel[pixel.y * mapData.width + pixel.x] = id;
      }
    }
  }
  return regionAtPixel;
}

function nearestRegionToPoint(regions, point) {
  let bestRegionId = Number(regions[0]?.id || 0) || null;
  let bestDistance = Infinity;

  for (const region of regions) {
    for (const pixel of region.pixels || []) {
      const dx = pixel.x - point.x;
      const dy = pixel.y - point.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestRegionId = Number(region.id);
      }
    }
  }

  return bestRegionId;
}

function capitalRegionId(owner, regions, meta, sovereignMeta, capitals, mapData, regionAtPixel) {
  const capital =
    capitals.byIso.get(meta?.iso2) ||
    capitals.byCountry.get(owner) ||
    capitals.byIso.get(sovereignMeta?.iso2) ||
    capitals.byCountry.get(meta?.sovereign);

  if (!capital) {
    return Number(regions[0]?.id || null);
  }

  const point = project(capital.coordinates, mapData.width, mapData.height);
  const regionIds = new Set(regions.map((region) => Number(region.id)));
  const directRegionId = regionAtPixel[point.y * mapData.width + point.x];
  if (regionIds.has(directRegionId)) return directRegionId;

  return nearestRegionToPoint(regions, point);
}

function buildScenario(mapData, countryMeta, leadersByIso, capitals) {
  const landRegions = mapData.regions.filter((region) => region.type === "land");
  const regionsByOwner = new Map();
  const regionAtPixel = buildRegionAtPixel(mapData);

  for (const region of landRegions) {
    const owner = scenarioOwner(region.name);
    if (!regionsByOwner.has(owner)) regionsByOwner.set(owner, []);
    regionsByOwner.get(owner).push(region);
  }

  const countries = [...regionsByOwner.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .map(([owner, regions], index) => {
      const meta = countryMeta.get(owner) || countryMeta.get(OWNER_OVERRIDES.get(owner));
      const sovereignMeta = meta?.sovereign ? countryMeta.get(meta.sovereign) : null;
      const leader = LEADER_OVERRIDES.get(owner) ||
        leadersByIso.get(meta?.iso2) ||
        LEADER_OVERRIDES.get(meta?.sovereign) ||
        leadersByIso.get(sovereignMeta?.iso2) ||
        "";
      return {
        id: index + 1,
        name: countryNameRu(owner, meta),
        ruler: leader,
        rulerData: leader ? {
          name: leader,
          nameRu: leader,
          polity: countryNameRu(owner, meta),
          title: "Глава государства / правительства",
          startYear: YEAR,
          endYear: null,
        } : null,
        ideology: "neutral",
        capitalRegionId: capitalRegionId(owner, regions, meta, sovereignMeta, capitals, mapData, regionAtPixel),
        color: COLORS[index % COLORS.length],
        flag: flagDataUri(meta?.iso2 || sovereignMeta?.iso2),
        flagId: meta?.iso2 || sovereignMeta?.iso2 ? `iso:${meta?.iso2 || sovereignMeta?.iso2}` : "",
        regionIds: regions.map((region) => Number(region.id)).sort((a, b) => a - b),
      };
    });

  return {
    format: "ashes-of-nations-scenario",
    version: 1,
    name: "Мир 2026",
    year: YEAR,
    map: {
      name: mapData.name,
      width: mapData.width,
      height: mapData.height,
      file: "мир.json",
    },
    countries,
    occupations: [],
    armies: [],
  };
}

const [mapData, countryMeta] = await Promise.all([
  fs.readFile(MAP_PATH, "utf8").then(JSON.parse),
  loadCountryMeta(),
]);
const capitals = await loadCapitals();

let leadersByIso = new Map();
try {
  leadersByIso = await loadWikidataLeaders();
} catch (error) {
  console.warn(`Не удалось загрузить правителей из Wikidata: ${error.message}`);
}

const scenario = buildScenario(mapData, countryMeta, leadersByIso, capitals);
await fs.writeFile(OUTPUT_PATH, JSON.stringify(scenario, null, 2), "utf8");

console.log(`Wrote ${OUTPUT_PATH}`);
console.log(`Countries: ${scenario.countries.length}`);
console.log(`Countries with leaders: ${scenario.countries.filter((country) => country.ruler).length}`);
console.log(`Countries with flags: ${scenario.countries.filter((country) => country.flag).length}`);
