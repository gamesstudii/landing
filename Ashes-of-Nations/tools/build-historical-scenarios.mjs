import fs from "node:fs/promises";

const MAP_PATH = "maps/мир.json";
const COUNTRIES_PATH = "data/ne_10m_admin_0_countries.geojson";
const PLACES_PATH = "data/ne_10m_populated_places.geojson";
const YEARS = [2008, 1994, 1980, 1960, 1945, 1941, 1939, 1936, 1933, 1922, 1919, 1918, 1914, 1912, 1904];

const COLORS = [
  "#c33f37", "#3978a8", "#55a05a", "#c79a32",
  "#8b5bb1", "#d36d2f", "#2f9c95", "#be5686",
  "#6d7f32", "#5164bd", "#a66b42", "#4e9bc2",
];

const NAME_RU = new Map([
  ["Afghanistan", "Афганистан"], ["Albania", "Албания"], ["Argentina", "Аргентина"],
  ["Australia", "Австралия"], ["Austria", "Австрия"], ["Austria-Hungary", "Австро-Венгрия"],
  ["Belgium", "Бельгия"], ["Belgian Empire", "Бельгийская колониальная империя"],
  ["Brazil", "Бразилия"], ["British Empire", "Британская империя"], ["Bulgaria", "Болгария"],
  ["Canada", "Канада"], ["Chile", "Чили"], ["China", "Китай"], ["Czechoslovakia", "Чехословакия"],
  ["Denmark", "Дания"], ["Dutch Empire", "Нидерландская колониальная империя"], ["Egypt", "Египет"],
  ["Finland", "Финляндия"], ["France", "Франция"], ["French Empire", "Французская колониальная империя"],
  ["German Empire", "Германская империя"], ["Germany", "Германия"], ["Greece", "Греция"],
  ["India", "Индия"], ["Ireland", "Ирландия"], ["Italy", "Италия"], ["Japan", "Япония"],
  ["Japanese Empire", "Японская империя"], ["Korea", "Корея"], ["Korean Empire", "Корейская империя"],
  ["Mexico", "Мексика"], ["Netherlands", "Нидерланды"],
  ["New Zealand", "Новая Зеландия"], ["Norway", "Норвегия"], ["Ottoman Empire", "Османская империя"],
  ["Pakistan", "Пакистан"], ["Persia", "Персия"], ["Poland", "Польша"],
  ["Portuguese Empire", "Португальская колониальная империя"], ["Qing Empire", "Империя Цин"], ["Republic of China", "Китайская Республика"], ["Romania", "Румыния"],
  ["Russian Empire", "Российская империя"], ["Soviet Russia", "Советская Россия"], ["Soviet Union", "СССР"],
  ["South Africa", "Южная Африка"], ["South Korea", "Южная Корея"], ["Spain", "Испания"],
  ["Spanish Empire", "Испанская колониальная империя"], ["Sweden", "Швеция"], ["Sweden-Norway", "Шведско-норвежская уния"], ["Switzerland", "Швейцария"],
  ["Nejd and Hejaz", "Неджд и Хиджаз"], ["No man's land", "Нейтральная территория"], ["Tannu Tuva", "Танну-Тува"], ["Turkey", "Турция"], ["United Kingdom", "Великобритания"], ["United States of America", "США"],
  ["Yugoslavia", "Югославия"], ["Macedonia", "Северная Македония"], ["Swaziland", "Свазиленд"],
]);

const MODERN_RU = new Intl.DisplayNames(["ru"], { type: "region" });
const OWNER_OVERRIDES = new Map([
  ["Филиппины", "Philippines"], ["Aland", "Finland"],
  ["Аландские острова", "Finland"], ["Northern Cyprus", "Cyprus"], ["Somaliland", "Somalia"],
  ["Western Sahara", "Morocco"], ["Gaza Strip", "Palestine"], ["West Bank", "Palestine"],
  ["Akrotiri Sovereign Base Area", "United Kingdom"], ["Dhekelia Sovereign Base Area", "United Kingdom"],
  ["Baykonur Cosmodrome", "Russia"], ["US Naval Base Guantanamo Bay", "United States of America"],
  ["Caribbean Netherlands", "Netherlands"], ["Aruba", "Netherlands"], ["Curaçao", "Netherlands"],
  ["Sint Maarten", "Netherlands"], ["Saint Martin", "France"], ["Южное Патагонское ледниковое плато", "Argentina"],
]);

const USSR = new Set(["Armenia", "Azerbaijan", "Belarus", "Estonia", "Georgia", "Kazakhstan", "Kyrgyzstan", "Latvia", "Lithuania", "Moldova", "Russia", "Tajikistan", "Turkmenistan", "Ukraine", "Uzbekistan"]);
const RUSSIAN_EMPIRE = new Set(["Armenia", "Azerbaijan", "Belarus", "Estonia", "Finland", "Georgia", "Kazakhstan", "Kyrgyzstan", "Latvia", "Lithuania", "Moldova", "Russia", "Tajikistan", "Turkmenistan", "Ukraine", "Uzbekistan"]);
const YUGOSLAVIA = new Set(["Bosnia and Herzegovina", "Croatia", "Kosovo", "Macedonia", "Montenegro", "Republic of Serbia", "Slovenia"]);
const CZECHOSLOVAKIA = new Set(["Czech Republic", "Slovakia"]);
const AUSTRIA_HUNGARY = new Set(["Austria", "Hungary", "Czech Republic", "Slovakia", "Slovenia", "Croatia", "Bosnia and Herzegovina"]);
const OTTOMAN = new Set(["Turkey", "Syria", "Lebanon", "Iraq", "Jordan", "Israel", "Palestine", "Gaza Strip", "West Bank"]);
const JAPANESE = new Set(["North Korea", "South Korea", "Taiwan"]);
const KOREA = new Set(["North Korea", "South Korea"]);

const DEPENDENCIES = new Map(Object.entries({
  "Akrotiri Sovereign Base Area": "United Kingdom", "Dhekelia Sovereign Base Area": "United Kingdom",
  "Anguilla": "United Kingdom", "Bermuda": "United Kingdom", "British Virgin Islands": "United Kingdom",
  "Cayman Islands": "United Kingdom", "Falkland Islands": "United Kingdom", "Guernsey": "United Kingdom",
  "Isle of Man": "United Kingdom", "Jersey": "United Kingdom", "Montserrat": "United Kingdom",
  "Saint Helena": "United Kingdom", "South Georgia and the Islands": "United Kingdom",
  "Turks and Caicos Islands": "United Kingdom",
  "American Samoa": "United States of America", "Guam": "United States of America",
  "Northern Mariana Islands": "United States of America", "Puerto Rico": "United States of America",
  "United States Minor Outlying Islands": "United States of America", "United States Virgin Islands": "United States of America",
  "French Polynesia": "France", "French Southern and Antarctic Lands": "France", "New Caledonia": "France",
  "Saint Martin": "France", "Saint Pierre and Miquelon": "France", "Wallis and Futuna": "France",
  "Aruba": "Netherlands", "Caribbean Netherlands": "Netherlands", "Curaçao": "Netherlands", "Sint Maarten": "Netherlands",
  "Faroe Islands": "Denmark", "Greenland": "Denmark",
  "Australian Indian Ocean Territories": "Australia", "Heard Island and McDonald Islands": "Australia",
  "Indian Ocean Territories": "Australia",
  "Cook Islands": "New Zealand", "Niue": "New Zealand",
  "Svalbard": "Norway",
}));

const COLONIES = new Map(Object.entries({
  "Angola": [1975, "Portuguese Empire"], "Cape Verde": [1975, "Portuguese Empire"], "Guinea Bissau": [1974, "Portuguese Empire"],
  "Mozambique": [1975, "Portuguese Empire"], "Sao Tome and Principe": [1975, "Portuguese Empire"], "East Timor": [1975, "Portuguese Empire"],
  "Algeria": [1962, "French Empire"], "Benin": [1960, "French Empire"], "Burkina Faso": [1960, "French Empire"], "Cambodia": [1953, "French Empire"],
  "Cameroon": [1960, "French Empire"], "Central African Republic": [1960, "French Empire"], "Chad": [1960, "French Empire"], "Comoros": [1975, "French Empire"],
  "Djibouti": [1977, "French Empire"], "Gabon": [1960, "French Empire"], "Guinea": [1958, "French Empire"], "Ivory Coast": [1960, "French Empire"],
  "Laos": [1953, "French Empire"], "Madagascar": [1960, "French Empire"], "Mali": [1960, "French Empire"], "Mauritania": [1960, "French Empire"],
  "Lebanon": [1943, "French Empire"], "Morocco": [1956, "French Empire"], "Niger": [1960, "French Empire"], "Senegal": [1960, "French Empire"], "Syria": [1946, "French Empire"],
  "Tunisia": [1956, "French Empire"], "Vietnam": [1954, "French Empire"], "Togo": [1960, "French Empire"],
  "Botswana": [1966, "British Empire"], "Belize": [1981, "British Empire"], "Ghana": [1957, "British Empire"], "Kenya": [1963, "British Empire"],
  "Iraq": [1932, "British Empire"], "Jordan": [1946, "British Empire"], "Kuwait": [1961, "British Empire"], "Lesotho": [1966, "British Empire"], "Malawi": [1964, "British Empire"], "Malaysia": [1957, "British Empire"],
  "Maldives": [1965, "British Empire"], "Malta": [1964, "British Empire"], "Mauritius": [1968, "British Empire"], "Myanmar": [1948, "British Empire"], "Nigeria": [1960, "British Empire"],
  "Pakistan": [1947, "British Empire"], "Papua New Guinea": [1975, "British Empire"], "Qatar": [1971, "British Empire"], "Sierra Leone": [1961, "British Empire"],
  "Singapore": [1965, "British Empire"], "Somalia": [1960, "British Empire"], "Sri Lanka": [1948, "British Empire"], "Sudan": [1956, "British Empire"],
  "Uganda": [1962, "British Empire"], "United Arab Emirates": [1971, "British Empire"], "United Republic of Tanzania": [1961, "British Empire"],
  "Yemen": [1967, "British Empire"], "Zambia": [1964, "British Empire"], "Zimbabwe": [1980, "British Empire"],
  "Namibia": [1990, "South Africa"], "South Africa": [1910, "British Empire"], "India": [1947, "British Empire"], "Bangladesh": [1947, "British Empire"],
  "Democratic Republic of the Congo": [1960, "Belgian Empire"], "Rwanda": [1962, "Belgian Empire"], "Burundi": [1962, "Belgian Empire"],
  "Republic of the Congo": [1960, "French Empire"],
  "Indonesia": [1949, "Dutch Empire"], "Suriname": [1975, "Dutch Empire"], "Philippines": [1946, "United States of America"],
  "Equatorial Guinea": [1968, "Spanish Empire"], "Western Sahara": [1975, "Spanish Empire"], "Eritrea": [1993, "Ethiopia"],
  "Antigua and Barbuda": [1981, "British Empire"], "The Bahamas": [1973, "British Empire"], "Barbados": [1966, "British Empire"],
  "Bahrain": [1971, "British Empire"], "Brunei": [1984, "British Empire"], "Dominica": [1978, "British Empire"],
  "Fiji": [1970, "British Empire"], "Gambia": [1965, "British Empire"], "Grenada": [1974, "British Empire"],
  "Guyana": [1966, "British Empire"], "Jamaica": [1962, "British Empire"], "Kiribati": [1979, "British Empire"],
  "Saint Kitts and Nevis": [1983, "British Empire"], "Saint Lucia": [1979, "British Empire"],
  "Saint Vincent and the Grenadines": [1979, "British Empire"], "Seychelles": [1976, "British Empire"],
  "Solomon Islands": [1978, "British Empire"], "Tonga": [1970, "British Empire"], "Trinidad and Tobago": [1962, "British Empire"],
  "Tuvalu": [1978, "British Empire"], "Vanuatu": [1980, "British Empire"], "Oman": [1970, "British Empire"],
  "S. Sudan": [2011, "British Empire"],
  "Marshall Islands": [1986, "United States of America"], "Federated States of Micronesia": [1986, "United States of America"],
  "Palau": [1994, "United States of America"],
  "Samoa": [1962, "New Zealand"], "Nauru": [1968, "Australia"],
  "Cuba": [1902, "Spanish Empire"], "Dominican Republic": [1865, "Spanish Empire"],
  "Cape Verde": [1975, "Portuguese Empire"], "Guinea Bissau": [1974, "Portuguese Empire"], "Swaziland": [1968, "British Empire"],
}));

function imperialOwner(owner, year) {
  if (owner === "United Kingdom" && year < 1947) return "British Empire";
  if (["Canada", "Australia", "New Zealand", "South Africa"].includes(owner) && year < 1931) return "British Empire";
  if (owner === "France" && year < 1960) return "French Empire";
  if (owner === "Netherlands" && year < 1949) return "Dutch Empire";
  if (owner === "Portugal" && year < 1975) return "Portuguese Empire";
  if (owner === "Spain" && year < 1975) return "Spanish Empire";
  return owner;
}

function partitionedPolandOwner(regionName) {
  if (/Greater Poland|Kuyavian-Pomeranian|Lower Silesian|Lubusz|Opole|Pomeranian|Silesian|Warmian-Masurian|West Pomeranian/i.test(regionName)) {
    return "German Empire";
  }
  if (/Lesser Poland|Subcarpathian/i.test(regionName)) return "Austria-Hungary";
  return "Russian Empire";
}

function baseOwner(regionName) {
  const prefix = String(regionName).split(":")[0].trim();
  return OWNER_OVERRIDES.get(prefix) || prefix;
}

function ownerForYear(regionName, year) {
  const owner = baseOwner(regionName);

  if (DEPENDENCIES.has(owner)) return imperialOwner(DEPENDENCIES.get(owner), year);
  if (/Svalbard/i.test(regionName) && year < 1925) return "No man's land";
  if (owner === "Antarctica") return "Antarctica";
  if (owner === "Siachen Glacier") return year < 1947 ? "British Empire" : "India";
  if (owner === "United Kingdom" && year < 1947) return "British Empire";
  if (["Canada", "Australia", "New Zealand", "South Africa"].includes(owner) && year < 1931) return "British Empire";
  if (owner === "Iceland" && year < 1944) return "Denmark";
  if (owner === "Cyprus" && year < 1960) return "British Empire";
  if (owner === "Taiwan") {
    if (year < 1895) return "Qing Empire";
    if (year < 1945) return "Japanese Empire";
    if (year < 1949) return "Republic of China";
    return "China";
  }
  if (owner === "Hong Kong S.A.R.") return year < 1997 ? imperialOwner("United Kingdom", year) : "China";
  if (owner === "Macau S.A.R") return year < 1999 ? imperialOwner("Portugal", year) : "China";
  if (owner === "Kosovo") {
    if (year < 1912) return "Ottoman Empire";
    if (year < 1918) return "Republic of Serbia";
    if (year < 1992) return "Yugoslavia";
    if (year < 2008) return "Republic of Serbia";
    return "Kosovo";
  }
  if (owner === "Montenegro") {
    if (year < 1918) return "Montenegro";
    if (year < 1992) return "Yugoslavia";
    if (year < 2006) return "Yugoslavia";
    return "Montenegro";
  }
  if (owner === "Macedonia") {
    if (year < 1912) return "Ottoman Empire";
    if (year < 1992) return "Yugoslavia";
    return "Macedonia";
  }
  if (owner === "Saudi Arabia" && year < 1932) return year < 1918 ? "Ottoman Empire" : "Nejd and Hejaz";

  if (owner === "China") {
    if (year < 1912) return "Qing Empire";
    if (year < 1949) return "Republic of China";
  }
  if (owner === "Mongolia" && year < 1912) return "Qing Empire";
  if (owner === "Russia" && /Республика Тыва|Tuva|Tyva|Tannu|Тува/i.test(regionName)) {
    if (year < 1912) return "Qing Empire";
    if (year < 1914) return "Mongolia";
    if (year <= 1917) return "Russian Empire";
    if (year <= 1919) return "Soviet Russia";
    if (year < 1944) return "Tannu Tuva";
  }
  if (owner === "Ukraine" && year <= 1917) return "Russian Empire";
  if (owner === "Poland") {
    if (year < 1918) return partitionedPolandOwner(regionName);
    if (year === 1941) return "Germany";
    if (year === 1945) return "Poland";
  }
  if (KOREA.has(owner)) {
    if (year < 1910) return "Korean Empire";
    if (year < 1945) return "Japanese Empire";
    if (year < 1948) return "Korea";
  }
  if (owner === "Norway" && year < 1905) return "Sweden-Norway";
  if (owner === "Ireland" && year < 1922) return "United Kingdom";
  if (owner === "Albania" && year < 1912) return "Ottoman Empire";
  if (owner === "Egypt" && year < 1922) return "British Empire";
  if (owner === "Libya" && year < 1912) return "Ottoman Empire";
  if (owner === "Libya" && year < 1951) return "Italy";

  if (year <= 1917 && RUSSIAN_EMPIRE.has(owner)) return "Russian Empire";
  if (year === 1918 || year === 1919) {
    if (["Russia", "Belarus", "Ukraine"].includes(owner)) return "Soviet Russia";
    if (RUSSIAN_EMPIRE.has(owner)) return owner;
  }
  if (year >= 1922 && year < 1992 && USSR.has(owner)) return "Soviet Union";

  if (year <= 1918 && AUSTRIA_HUNGARY.has(owner)) return "Austria-Hungary";
  if (year >= 1918 && year < 1992 && YUGOSLAVIA.has(owner)) return "Yugoslavia";
  if (year >= 1918 && year < 1993 && CZECHOSLOVAKIA.has(owner)) return "Czechoslovakia";
  if (year < 1918 && OTTOMAN.has(owner)) return "Ottoman Empire";
  if (year >= 1910 && year < 1945 && JAPANESE.has(owner)) return "Japanese Empire";
  if (year < 1948 && ["Israel", "Palestine"].includes(owner)) return "British Empire";

  if (year <= 1918 && owner === "Germany") return "German Empire";
  if (year <= 1918 && ["Namibia", "Cameroon", "United Republic of Tanzania"].includes(owner)) return "German Empire";
  if (year < 1935 && owner === "Iran") return "Persia";
  if (year < 1923 && owner === "Turkey") return "Ottoman Empire";
  if (year < 1949 && owner === "China" && /Taiwan|Hong Kong|Macau/i.test(regionName)) return "Japanese Empire";
  if (year === 1994 && owner === "South Sudan") return "Sudan";
  if (year < 2008 && owner === "Kosovo") return "Republic of Serbia";

  const colony = COLONIES.get(owner);
  if (colony && year < colony[0]) return colony[1];
  return owner;
}

function flagEmoji(iso2) {
  if (!/^[A-Z]{2}$/.test(iso2 || "")) return "";
  return [...iso2].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("");
}

function flagDataUri(iso2) {
  const emoji = flagEmoji(iso2);
  if (!emoji) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#f4f1e8"/><text x="32" y="31" text-anchor="middle" font-size="28">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function project([lon, lat], width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(((lon + 180) / 360) * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor(((90 - lat) / 180) * height))),
  };
}

function buildRegionAtPixel(mapData) {
  const regionAtPixel = new Uint32Array(mapData.width * mapData.height);
  for (const region of mapData.regions) {
    for (const pixel of region.pixels || []) regionAtPixel[pixel.y * mapData.width + pixel.x] = Number(region.id);
  }
  return regionAtPixel;
}

function nearestRegionToPoint(regions, point) {
  let bestRegionId = Number(regions[0]?.id || 0) || null;
  let bestDistance = Infinity;
  for (const region of regions) {
    for (const pixel of region.pixels || []) {
      const distance = (pixel.x - point.x) ** 2 + (pixel.y - point.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestRegionId = Number(region.id);
      }
    }
  }
  return bestRegionId;
}

async function loadCountryMeta() {
  const geojson = JSON.parse(await fs.readFile(COUNTRIES_PATH, "utf8"));
  const meta = new Map();
  for (const feature of geojson.features || []) {
    const p = feature.properties || {};
    const item = {
      nameRu: p.NAME_RU || null,
      iso2: /^[A-Z]{2}$/.test(p.ISO_A2) ? p.ISO_A2 : null,
      sovereign: p.SOVEREIGNT || null,
    };
    [p.ADMIN, p.NAME, p.NAME_LONG, p.SOVEREIGNT, p.BRK_NAME].filter(Boolean).forEach((name) => meta.set(name, item));
  }
  meta.set("Republic of Serbia", { nameRu: "Сербия", iso2: "RS" });
  return meta;
}

async function loadCapitals() {
  const geojson = JSON.parse(await fs.readFile(PLACES_PATH, "utf8"));
  const byIso = new Map();
  const byCountry = new Map();
  for (const feature of geojson.features || []) {
    const p = feature.properties || {};
    if (p.FEATURECLA !== "Admin-0 capital" || feature.geometry?.type !== "Point") continue;
    const capital = { coordinates: feature.geometry.coordinates };
    if (p.ISO_A2 && !byIso.has(p.ISO_A2)) byIso.set(p.ISO_A2, capital);
    if (p.ADM0NAME && !byCountry.has(p.ADM0NAME)) byCountry.set(p.ADM0NAME, capital);
  }
  return { byIso, byCountry };
}

function countryName(owner, meta) {
  if (NAME_RU.has(owner)) return NAME_RU.get(owner);
  if (meta?.nameRu) return meta.nameRu;
  if (/^[A-Z]{2}$/.test(meta?.iso2 || "")) return MODERN_RU.of(meta.iso2) || owner;
  return owner;
}

function capitalRegionId(owner, regions, meta, capitals, mapData, regionAtPixel) {
  const capital = capitals.byIso.get(meta?.iso2) || capitals.byCountry.get(owner);
  if (!capital) return Number(regions[0]?.id || null);
  const point = project(capital.coordinates, mapData.width, mapData.height);
  const direct = regionAtPixel[point.y * mapData.width + point.x];
  if (regions.some((region) => Number(region.id) === direct)) return direct;
  return nearestRegionToPoint(regions, point);
}

function buildScenario(mapData, year, countryMeta, capitals) {
  const regionAtPixel = buildRegionAtPixel(mapData);
  const byOwner = new Map();
  for (const region of mapData.regions.filter((item) => item.type === "land")) {
    const owner = ownerForYear(region.name, year);
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner).push(region);
  }

  const countries = [...byOwner.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .map(([owner, regions], index) => {
      const meta = countryMeta.get(owner) || countryMeta.get(baseOwner(regions[0]?.name || ""));
      const name = countryName(owner, meta);
      return {
        id: index + 1,
        name,
        ruler: "",
        rulerData: null,
        ideology: "neutral",
        capitalRegionId: capitalRegionId(owner, regions, meta, capitals, mapData, regionAtPixel),
        color: COLORS[index % COLORS.length],
        flag: flagDataUri(meta?.iso2),
        flagId: meta?.iso2 ? `iso:${meta.iso2}` : "",
        regionIds: regions.map((region) => Number(region.id)).sort((a, b) => a - b),
      };
    });

  return {
    format: "ashes-of-nations-scenario",
    version: 1,
    name: `Мир ${year}`,
    year,
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

const [mapData, countryMeta, capitals] = await Promise.all([
  fs.readFile(MAP_PATH, "utf8").then(JSON.parse),
  loadCountryMeta(),
  loadCapitals(),
]);

for (const year of YEARS) {
  const scenario = buildScenario(mapData, year, countryMeta, capitals);
  await fs.writeFile(`scenarios/${year}.json`, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
  console.log(`Wrote scenarios/${year}.json (${scenario.countries.length} countries)`);
}
