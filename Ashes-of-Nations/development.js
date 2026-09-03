(() => {
  const TARGET_SCENARIOS_PER_MAP = 10;
  const TARGET_FLAGS = 500;
  const CURRENT_FLAGS = 286;
  const overview = document.getElementById("overviewRings");
  const mapGrid = document.getElementById("mapProgress");
  const scenarioGrid = document.getElementById("scenarioProgress");

  const parseCsvRows = (text) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    return Math.max(0, lines.length - 1);
  };
  const ring = (value, label, detail) => `<div class="ring" style="--value:${Math.max(0, Math.min(100, value))}"><span>${Math.round(value)}%</span></div><strong>${label}</strong><small>${detail}</small>`;
  const fetchJson = (path) => fetch(`${path}?v=${Date.now()}`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  async function render() {
    try {
      const [maps, scenarios, focusManifest] = await Promise.all([
        fetchJson("maps/manifest.json"), fetchJson("scenarios/manifest.json"), fetchJson("focuses/manifest.json"),
      ]);
      const mapCount = maps.maps?.length || 0;
      const scenarioCount = scenarios.scenarios?.length || 0;
      const focusFiles = focusManifest.files || [];
      const focusRows = await Promise.all(focusFiles.map((file) => fetchJson(`focuses/${encodeURIComponent(file)}`).catch(async () => parseCsvRows(await fetch(`focuses/${encodeURIComponent(file)}?v=${Date.now()}`).then((r) => r.text())))));
      const totalFocuses = focusRows.reduce((sum, count) => sum + Number(count || 0), 0);
      const scenarioPct = (scenarioCount / Math.max(1, mapCount * TARGET_SCENARIOS_PER_MAP)) * 100;
      const flagPct = CURRENT_FLAGS / TARGET_FLAGS * 100;
      const focusCountries = new Set(focusFiles.map((file) => file.replace(/\[\d{4}\]\.csv$/u, ""))).size;
      const currentCountries = scenarios.scenarios.find((item) => item.file === "2026.json")?.countries || 220;
      const focusPct = focusCountries / currentCountries * 100;
      overview.innerHTML = [
        `<div class="ring-card">${ring(scenarioPct, "Сценарии", `${scenarioCount} из ${mapCount * TARGET_SCENARIOS_PER_MAP} плановых`)}</div>`,
        `<div class="ring-card">${ring(focusPct, "Фокусные деревья", `${focusCountries} из ${currentCountries} стран · ${totalFocuses} фокусов`)}</div>`,
        `<div class="ring-card">${ring(flagPct, "Исторические флаги", `${CURRENT_FLAGS} из ${TARGET_FLAGS} плановых`)}</div>`,
      ].join("");
      const scenariosByMap = new Map();
      scenarios.scenarios.forEach((scenario) => scenariosByMap.set(scenario.mapFile, (scenariosByMap.get(scenario.mapFile) || 0) + 1));
      mapGrid.innerHTML = maps.maps.map((map) => {
        const count = scenariosByMap.get(map.file) || 0;
        const pct = count / TARGET_SCENARIOS_PER_MAP * 100;
        return `<article class="map-card"><div class="ring" style="--value:${Math.min(100, pct)}"><span>${Math.round(pct)}%</span></div><div><p class="map-kicker">КАРТА</p><h3>${map.name}</h3><p>${count} из ${TARGET_SCENARIOS_PER_MAP} плановых сценариев</p><small>${map.regions || "—"} регионов</small></div></article>`;
      }).join("");
      const focusByYear = new Map();
      focusFiles.forEach((file, index) => { const year = file.match(/\[(\d{4})\]/u)?.[1] || "2026"; focusByYear.set(year, (focusByYear.get(year) || 0) + Number(focusRows[index] || 0)); });
      const scenarioCards = scenarios.scenarios.map((scenario) => {
        const available = focusFiles.filter((file) => file.includes(`[${scenario.year}]`)).length;
        const pct = scenario.countries ? available / scenario.countries * 100 : 0;
        const count = focusByYear.get(String(scenario.year)) || 0;
        return { year: Number(scenario.year) || 0, html: `<article class="scenario-card"><div class="ring" style="--value:${Math.min(100, pct)}"><span>${Math.round(pct)}%</span></div><div><h3>${scenario.name}</h3><p>${available} из ${scenario.countries || "?"} стран с фокусами · ${count} фокусов</p></div></article>` };
      });
      const years = [...new Set(scenarioCards.map((item) => item.year))].sort((a, b) => b - a);
      scenarioGrid.innerHTML = years.map((year) => `<section class="year-group"><h3 class="year-heading"><span>${year || "Без года"}</span><i></i></h3><div class="year-cards">${scenarioCards.filter((item) => item.year === year).map((item) => item.html).join("")}</div></section>`).join("");
    } catch (error) {
      overview.innerHTML = `<p class="empty-state">Не удалось загрузить статистику разработки.</p>`;
      scenarioGrid.innerHTML = `<p class="empty-state">Статистика появится после загрузки каталогов игры.</p>`;
      console.error("Development stats error", error);
    }
  }
  render();
})();


