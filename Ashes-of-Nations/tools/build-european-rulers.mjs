import fs from "node:fs/promises";

const API = "https://en.wikipedia.org/w/api.php";
const START_YEAR = 1550;
const CURRENT_YEAR = 2026;
const pages = [
  "List of state leaders in the 16th century",
  "List of state leaders in the 17th century",
  "List of state leaders in the 18th century",
  "List of state leaders in the 19th century (1801–1850)",
  "List of state leaders in the 19th century (1851–1900)",
  "List of state leaders in the 20th century (1901–1950)",
  "List of state leaders in the 20th century (1951–2000)",
  "List of state leaders in the 2000s",
  "List of state leaders in the 2010s",
  "List of state leaders in the 2020s",
];

function cleanWiki(value) {
  return value
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\[(?:https?:\/\/\S+)\s+([^\]]+)\]/g, "$1")
    .replace(/'{2,5}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function europeSection(wikitext) {
  const match = /^==\s*Europe\s*==\s*$/im.exec(wikitext);
  if (!match) return "";
  const rest = wikitext.slice(match.index + match[0].length);
  const next = /^==[^=].*==\s*$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function extractTerm(text) {
  const matches = [...text.matchAll(/\(([^()]*(?:\d{3,4}|present|current|\?)[^()]*)\)/gi)];
  return matches.length ? matches.at(-1) : null;
}

function parseYears(rawTerm) {
  const normalized = rawTerm
    .replace(/[−—]/g, "–")
    .replace(/\b(?:present|current)\b/gi, String(CURRENT_YEAR));
  const years = [...normalized.matchAll(/(?<!\d)(1[0-9]{3}|20[0-9]{2})(?!\d)/g)].map((match) => Number(match[1]));
  if (years.length === 0) return null;
  return {
    startYear: Math.min(...years),
    endYear: /\b(?:present|current)\b/i.test(rawTerm) ? null : Math.max(...years),
    approximate: /[?~]|c\.|circa|unknown/i.test(rawTerm),
  };
}

function polityName(line) {
  return cleanWiki(line.replace(/^\*\s*/, ""))
    .replace(/\s*\([^)]*(?:complete|list)[^)]*\)\s*/gi, " ")
    .replace(/\s*[–-]\s*$/, "")
    .replace(/:\s*$/, "")
    .trim();
}

function parsePage(page, wikitext) {
  const section = europeSection(wikitext);
  const records = [];
  let region = "Europe";
  let polity = null;
  let officeGroup = null;

  for (const rawLine of section.split(/\r?\n/)) {
    const heading = /^(={3,6})\s*(.*?)\s*\1$/.exec(rawLine);
    if (heading) {
      region = cleanWiki(heading[2]);
      continue;
    }

    if (/^\*[^*:]/.test(rawLine)) {
      polity = polityName(rawLine);
      officeGroup = null;
      continue;
    }

    const bullet = /^(:+|\*{2,})\*?\s*(.+)$/.exec(rawLine);
    if (!bullet || !polity) continue;
    const text = cleanWiki(bullet[2]);
    const termMatch = extractTerm(text);

    if (!termMatch) {
      if (/(king|queen|monarch|president|minister|chancellor|secretar|dictator|regent|emperor|duke|prince|doge|pope|ruler|leader|chair|governor|captain|consul|lord|tsar|czar|khan|sultan|protector)/i.test(text)) {
        officeGroup = text.replace(/\s*[–-]\s*$/, "").trim();
      }
      continue;
    }

    const years = parseYears(termMatch[1]);
    if (!years) continue;
    const effectiveEnd = years.endYear ?? CURRENT_YEAR;
    if (effectiveEnd < START_YEAR || years.startYear > CURRENT_YEAR) continue;

    const firstLink = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/.exec(bullet[2]);
    const leaderPage = firstLink ? firstLink[1].trim() : null;
    const beforeTerm = text.slice(0, termMatch.index).replace(/\s*[–-]\s*$/, "").trim();
    const comma = beforeTerm.indexOf(",");
    const leader = (comma >= 0 ? beforeTerm.slice(0, comma) : beforeTerm).trim();
    const title = (comma >= 0 ? beforeTerm.slice(comma + 1) : officeGroup || "Ruler").trim();
    if (!leader || leader.length > 240) continue;

    records.push({
      polity,
      region,
      leader,
      leaderPage,
      title,
      officeGroup,
      startYear: Math.max(START_YEAR, years.startYear),
      endYear: years.endYear,
      term: termMatch[1],
      approximate: years.approximate,
      sourcePage: page,
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(" ", "_"))}`,
    });
  }
  return records;
}

async function fetchRussianTitles(titles) {
  const result = new Map();
  const uniqueTitles = [...new Set(titles.filter(Boolean))];
  for (let index = 0; index < uniqueTitles.length; index += 50) {
    const batch = uniqueTitles.slice(index, index + 50);
    const query = new URLSearchParams({
      action: "query",
      titles: batch.join("|"),
      prop: "langlinks",
      lllang: "ru",
      lllimit: "1",
      redirects: "1",
      format: "json",
      formatversion: "2",
      origin: "*",
    });
    let response = null;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      response = await fetch(`${API}?${query}`, {
        headers: { "User-Agent": "AshesOfNationsDataBuilder/1.0 (local game data tool)" },
      });
      if (response.ok) break;
      if (response.status !== 429 || attempt === 6) {
        throw new Error(`Russian labels: HTTP ${response.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
    const data = await response.json();
    for (const page of data.query?.pages || []) {
      const russianTitle = page.langlinks?.[0]?.title;
      if (russianTitle) result.set(page.title, russianTitle);
    }
    for (const redirect of data.query?.redirects || []) {
      const translated = result.get(redirect.to);
      if (translated) result.set(redirect.from, translated);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return result;
}

async function fetchWikitext(page) {
  const query = new URLSearchParams({
    action: "parse",
    page,
    prop: "wikitext",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${API}?${query}`, {
      headers: { "User-Agent": "AshesOfNationsDataBuilder/1.0 (local game data tool)" },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.error) throw new Error(`${page}: ${data.error.info}`);
      return data.parse.wikitext;
    }
    if (response.status !== 429 || attempt === 4) {
      throw new Error(`${page}: HTTP ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
}

const allRecords = [];
for (const page of pages) {
  const wikitext = await fetchWikitext(page);
  const records = parsePage(page, wikitext);
  console.log(`${page}: ${records.length}`);
  allRecords.push(...records);
  await new Promise((resolve) => setTimeout(resolve, 800));
}

const unique = new Map();
for (const record of allRecords) {
  const key = [
    record.polity,
    record.leader,
    record.title,
    record.startYear,
    record.endYear,
    record.term,
  ].join("|");
  unique.set(key, record);
}

const rulers = [...unique.values()].sort((a, b) =>
  a.startYear - b.startYear ||
  a.polity.localeCompare(b.polity, "en") ||
  a.leader.localeCompare(b.leader, "en")
);

console.log("Loading Russian names...");
const russianTitles = await fetchRussianTitles(rulers.map((record) => record.leaderPage));
for (const ruler of rulers) {
  ruler.leaderRu = ruler.leaderPage
    ? russianTitles.get(ruler.leaderPage) || null
    : null;
}

const output = {
  metadata: {
    id: "european-rulers-1550-2026",
    title: "European rulers and effective political leaders, 1550–2026",
    generatedAt: new Date().toISOString(),
    period: { from: START_YEAR, to: CURRENT_YEAR },
    language: "Source names and titles follow English Wikipedia",
    scope: [
      "Heads of state, heads of government, monarchs, regents, dictators, party leaders and other listed effective rulers.",
      "Includes historical European polities present in the source chronology.",
      "A record can represent multiple people when the source lists a collective or joint office on one line.",
    ],
    limitations: [
      "This is a source-derived game dataset, not a definitive academic prosopography.",
      "Dates marked approximate preserve uncertainty from the source.",
      "End year null means the term was listed as continuing when the source page was retrieved.",
      "The dataset should be reviewed before using a disputed polity or claimant in a scenario.",
    ],
    sources: pages.map((page) => ({
      title: page,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(" ", "_"))}`,
    })),
    recordCount: rulers.length,
  },
  rulers,
};

await fs.writeFile("european-rulers-1550-2026.json", JSON.stringify(output, null, 2));
console.log(`Total: ${rulers.length}`);
