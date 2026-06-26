(function () {
  "use strict";

  const mainScreen = document.getElementById("mainScreen");
  const setupScreen = document.getElementById("setupScreen");
  const gameScreen = document.getElementById("gameScreen");
  const playButton = document.getElementById("playButton");
  const backButton = document.getElementById("backButton");
  const startGameButton = document.getElementById("startGameButton");
  const mapsList = document.getElementById("mapsList");
  const scenariosList = document.getElementById("scenariosList");
  const countriesList = document.getElementById("countriesList");
  const mapStatus = document.getElementById("mapStatus");
  const setupStatus = document.getElementById("setupStatus");
  const leaveGameButton = document.getElementById("leaveGameButton");
  const gameCountryName = document.getElementById("gameCountryName");
  const gameScenarioName = document.getElementById("gameScenarioName");
  const gameLoading = document.getElementById("gameLoading");
  const gameCanvasStack = document.getElementById("gameCanvasStack");
  const gameMapCanvas = document.getElementById("gameMapCanvas");
  const gameMapCtx = gameMapCanvas.getContext("2d");
  const gameOverlayCanvas = document.getElementById("gameOverlayCanvas");
  const gameOverlayCtx = gameOverlayCanvas.getContext("2d");
  const gameZoomOut = document.getElementById("gameZoomOut");
  const gameZoomIn = document.getElementById("gameZoomIn");
  const gameZoomLabel = document.getElementById("gameZoomLabel");

  let maps = [];
  let scenarios = [];
  let selectedMap = maps[0] || null;
  let selectedScenario = null;
  let scenarioCountries = [];
  let selectedCountry = null;
  let loadedScenarioFile = null;
  let scenarioLoadId = 0;
  let catalogSignature = "";
  let gameZoom = 1;
  let gameData = null;
  let soldierImage = null;

  function showScreen(screen) {
    document.querySelectorAll(".screen").forEach((item) => item.classList.remove("active"));
    screen.classList.add("active");
  }

  function compatibleScenarios() {
    if (!selectedMap) return [];
    return scenarios.filter((scenario) =>
      !scenario.mapFile ||
      scenario.mapFile === selectedMap.file ||
      scenario.mapName === selectedMap.name
    );
  }

  function updateSelection() {
    mapStatus.textContent = selectedMap ? `Выбрано: ${selectedMap.name}` : "Карта не выбрана";
    if (selectedMap && selectedScenario && selectedCountry) {
      setupStatus.textContent = `Выбрана страна: ${selectedCountry.name}`;
      startGameButton.disabled = false;
    } else if (selectedMap && selectedScenario) {
      setupStatus.textContent = "Выберите страну";
      startGameButton.disabled = true;
    } else if (selectedMap) {
      setupStatus.textContent = "Выберите совместимый сценарий";
      startGameButton.disabled = true;
    } else {
      setupStatus.textContent = "Выберите карту, сценарий и страну";
      startGameButton.disabled = true;
    }
  }

  async function loadCatalogs() {
    try {
      const stamp = Date.now();
      const [mapsResponse, scenariosResponse] = await Promise.all([
        fetch(`maps/manifest.json?v=${stamp}`, { cache: "no-store" }),
        fetch(`scenarios/manifest.json?v=${stamp}`, { cache: "no-store" }),
      ]);
      if (!mapsResponse.ok || !scenariosResponse.ok) return;

      const mapsManifest = await mapsResponse.json();
      const scenariosManifest = await scenariosResponse.json();
      const nextMaps = Array.isArray(mapsManifest.maps) ? mapsManifest.maps : [];
      const nextScenarios = Array.isArray(scenariosManifest.scenarios) ? scenariosManifest.scenarios : [];
      const nextSignature = JSON.stringify([nextMaps, nextScenarios]);
      if (nextSignature === catalogSignature) return;

      catalogSignature = nextSignature;
      const selectedMapFile = selectedMap?.file;
      const selectedScenarioFile = selectedScenario?.file;
      maps = nextMaps;
      scenarios = nextScenarios;
      selectedMap = maps.find((map) => map.file === selectedMapFile) || maps[0] || null;
      selectedScenario = scenarios.find((scenario) => scenario.file === selectedScenarioFile) || null;
      if (!selectedScenario) {
        clearCountries();
      }
      renderMaps();
      renderScenarios();
      updateSelection();
    } catch (error) {
      console.warn("Не удалось обновить каталоги контента.", error);
    }
  }

  function renderMaps() {
    mapsList.innerHTML = "";
    if (maps.length === 0) {
      mapsList.innerHTML = '<div class="empty-state"><strong>Карты не найдены</strong><p>Положите JSON-карту в папку maps и запустите игру через «Запустить игру.bat».</p></div>';
      return;
    }
    maps.forEach((map) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-card${selectedMap?.file === map.file ? " selected" : ""}`;
      button.dataset.file = map.file;
      button.innerHTML = `
        <div class="map-preview"><span>MAP</span></div>
        <span class="card-copy">
          <strong></strong>
          <small>${map.width} × ${map.height} · ${map.regions} регионов</small>
        </span>
        <span class="check">✓</span>
      `;
      button.querySelector("strong").textContent = map.name;
      mapsList.append(button);
    });
  }

  function renderScenarios() {
    scenariosList.innerHTML = "";
    const compatible = compatibleScenarios();
    if (!selectedMap) {
      scenariosList.innerHTML = '<div class="empty-state"><strong>Сначала выберите карту</strong></div>';
      return;
    }
    if (compatible.length === 0) {
      selectedScenario = null;
      clearCountries();
      scenariosList.innerHTML = '<div class="empty-state"><strong>Совместимых сценариев нет</strong><p>Положите JSON-сценарий в папку scenarios и снова запустите игру.</p></div>';
      return;
    }
    if (!compatible.some((scenario) => scenario.file === selectedScenario?.file)) {
      selectedScenario = compatible[0];
      clearCountries();
    }
    compatible.forEach((scenario) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `scenario-card${selectedScenario?.file === scenario.file ? " selected" : ""}`;
      button.dataset.file = scenario.file;
      button.innerHTML = `
        <span class="scenario-year">${scenario.year || "—"}</span>
        <span class="card-copy">
          <strong></strong>
          <small>${scenario.mapName || selectedMap.name} · ${scenario.countries} стран</small>
        </span>
        <span class="check">✓</span>
      `;
      button.querySelector("strong").textContent = scenario.name;
      scenariosList.append(button);
    });
    loadSelectedScenarioCountries();
  }

  function clearCountries() {
    scenarioLoadId += 1;
    loadedScenarioFile = null;
    scenarioCountries = [];
    selectedCountry = null;
    renderCountries();
  }

  function renderCountries() {
    countriesList.innerHTML = "";
    if (!selectedScenario) {
      countriesList.innerHTML = '<div class="empty-state"><strong>Сначала выберите сценарий</strong></div>';
      return;
    }
    if (loadedScenarioFile !== selectedScenario.file) {
      countriesList.innerHTML = '<div class="empty-state"><strong>Загрузка стран…</strong></div>';
      return;
    }
    if (scenarioCountries.length === 0) {
      countriesList.innerHTML = '<div class="empty-state"><strong>В сценарии нет стран</strong></div>';
      return;
    }

    scenarioCountries.forEach((country) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `country-card${selectedCountry?.id === country.id ? " selected" : ""}`;
      button.dataset.id = String(country.id);

      const flag = document.createElement("span");
      flag.className = "country-flag";
      if (country.flag) {
        const image = document.createElement("img");
        image.src = country.flag.startsWith("../") ? country.flag.slice(3) : country.flag;
        image.alt = "";
        flag.append(image);
      } else {
        flag.textContent = country.name.slice(0, 2).toUpperCase();
      }

      const copy = document.createElement("span");
      copy.className = "card-copy";
      const name = document.createElement("strong");
      name.textContent = country.name;
      const details = document.createElement("small");
      details.textContent = `${country.ruler || "Правитель не указан"} · ${country.regionIds?.length || 0} регионов`;
      copy.append(name, details);

      const check = document.createElement("span");
      check.className = "check";
      check.textContent = "✓";
      button.append(flag, copy, check);
      countriesList.append(button);
    });
  }

  async function loadSelectedScenarioCountries() {
    if (!selectedScenario || loadedScenarioFile === selectedScenario.file) return;
    const scenario = selectedScenario;
    const loadId = ++scenarioLoadId;
    scenarioCountries = [];
    selectedCountry = null;
    renderCountries();
    try {
      const response = await fetch(`${scenario.path}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (loadId !== scenarioLoadId || selectedScenario?.file !== scenario.file) return;
      loadedScenarioFile = scenario.file;
      scenarioCountries = Array.isArray(data.countries) ? data.countries : [];
      renderCountries();
      updateSelection();
    } catch (error) {
      if (loadId !== scenarioLoadId) return;
      loadedScenarioFile = scenario.file;
      scenarioCountries = [];
      countriesList.innerHTML = '<div class="empty-state"><strong>Не удалось загрузить страны сценария</strong></div>';
      console.warn("Не удалось загрузить сценарий.", error);
      updateSelection();
    }
  }

  function gameHexToRgb(hex) {
    const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "777777";
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  function gameWaterRgb(x, y, width, height) {
    const depth = 0.55 + 0.45 * (y / Math.max(1, height - 1));
    const wave = Math.sin(x * 0.018 + y * 0.011) * 5 + Math.sin(x * 0.006 - y * 0.02) * 3;
    return [
      Math.round(18 + wave * 0.25),
      Math.round(55 + depth * 32 + wave * 0.45),
      Math.round(95 + depth * 58 + wave * 0.65),
    ];
  }

  function gameRegionCenters(regionAtPixel, width, height, regionIds) {
    const centers = new Map([...regionIds].map((id) => [id, { x: 0, y: 0, count: 0 }]));
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const center = centers.get(regionAtPixel[index]);
      if (!center) continue;
      center.x += index % width + 0.5;
      center.y += Math.floor(index / width) + 0.5;
      center.count += 1;
    }
    centers.forEach((center, id) => {
      if (!center.count) centers.delete(id);
      else {
        center.x /= center.count;
        center.y /= center.count;
        center.targetX = center.x;
        center.targetY = center.y;
        center.distance = Infinity;
      }
    });
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const center = centers.get(regionAtPixel[index]);
      if (!center) continue;
      const x = index % width + 0.5;
      const y = Math.floor(index / width) + 0.5;
      const distance = (x - center.targetX) ** 2 + (y - center.targetY) ** 2;
      if (distance < center.distance) {
        center.distance = distance;
        center.x = x;
        center.y = y;
      }
    }
    return centers;
  }

  function drawGameCrown(x, y) {
    const pixels = [
      [0,0],[4,0],[8,0],[0,1],[1,1],[4,1],[7,1],[8,1],
      [1,2],[2,2],[4,2],[6,2],[7,2],[2,3],[3,3],[4,3],[5,3],[6,3],
      [2,4],[3,4],[4,4],[5,4],[6,4],[2,5],[3,5],[4,5],[5,5],[6,5],
    ];
    const left = Math.round(x - 4);
    const top = Math.round(y - 3);
    gameOverlayCtx.fillStyle = "#17120a";
    pixels.forEach(([px, py]) => gameOverlayCtx.fillRect(left + px - 1, top + py - 1, 3, 3));
    gameOverlayCtx.fillStyle = "#ffd34d";
    pixels.forEach(([px, py]) => gameOverlayCtx.fillRect(left + px, top + py, 1, 1));
  }

  function drawFallbackSoldier(x, y) {
    gameOverlayCtx.fillStyle = "#101210";
    gameOverlayCtx.fillRect(Math.round(x) - 4, Math.round(y) - 6, 8, 11);
    gameOverlayCtx.fillStyle = "#d6c7a5";
    gameOverlayCtx.fillRect(Math.round(x) - 2, Math.round(y) - 5, 4, 3);
    gameOverlayCtx.fillStyle = "#52663d";
    gameOverlayCtx.fillRect(Math.round(x) - 3, Math.round(y) - 2, 6, 6);
    gameOverlayCtx.fillStyle = "#8c6a38";
    gameOverlayCtx.fillRect(Math.round(x) + 3, Math.round(y) - 2, 1, 7);
  }

  function renderGameMap() {
    if (!gameData) return;
    const { map, scenario, regionAtPixel, centers } = gameData;
    const ownerByRegion = new Map();
    const countryById = new Map(scenario.countries.map((country) => [Number(country.id), country]));
    scenario.countries.forEach((country) => {
      (country.regionIds || []).forEach((regionId) => ownerByRegion.set(Number(regionId), country));
    });
    const controllerByRegion = new Map(ownerByRegion);
    (scenario.occupations || []).forEach((occupation) => {
      const controller = countryById.get(Number(occupation.controllerCountryId));
      if (controller) controllerByRegion.set(Number(occupation.regionId), controller);
    });

    const image = gameMapCtx.createImageData(map.width, map.height);
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const regionId = regionAtPixel[index];
      const country = controllerByRegion.get(regionId);
      const region = gameData.regionById.get(regionId);
      const x = index % map.width;
      const y = Math.floor(index / map.width);
      const color = country
        ? gameHexToRgb(country.color)
        : region?.type === "sea"
          ? gameWaterRgb(x, y, map.width, map.height)
          : gameHexToRgb(region?.color || "#263238");
      const offset = index * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = regionId ? 255 : 0;
    }
    gameMapCtx.putImageData(image, 0, 0);
    gameOverlayCtx.clearRect(0, 0, map.width, map.height);

    function strokeBorders(countryBorders) {
      gameOverlayCtx.beginPath();
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          const index = y * map.width + x;
          const regionA = regionAtPixel[index];
          const countryA = controllerByRegion.get(regionA)?.id ?? null;
          if (x < map.width - 1) {
            const regionB = regionAtPixel[index + 1];
            const countryB = controllerByRegion.get(regionB)?.id ?? null;
            const isSeaPair = gameData.regionById.get(regionA)?.type === "sea" &&
              gameData.regionById.get(regionB)?.type === "sea";
            const isCountry = countryA !== countryB && (countryA !== null || countryB !== null);
            if (regionA !== regionB && !isSeaPair && isCountry === countryBorders) {
              gameOverlayCtx.moveTo(x + 1, y);
              gameOverlayCtx.lineTo(x + 1, y + 1);
            }
          }
          if (y < map.height - 1) {
            const regionB = regionAtPixel[index + map.width];
            const countryB = controllerByRegion.get(regionB)?.id ?? null;
            const isSeaPair = gameData.regionById.get(regionA)?.type === "sea" &&
              gameData.regionById.get(regionB)?.type === "sea";
            const isCountry = countryA !== countryB && (countryA !== null || countryB !== null);
            if (regionA !== regionB && !isSeaPair && isCountry === countryBorders) {
              gameOverlayCtx.moveTo(x, y + 1);
              gameOverlayCtx.lineTo(x + 1, y + 1);
            }
          }
        }
      }
      gameOverlayCtx.stroke();
    }

    gameOverlayCtx.strokeStyle = "rgba(30,35,37,.75)";
    gameOverlayCtx.lineWidth = 0.55;
    strokeBorders(false);
    gameOverlayCtx.strokeStyle = "#090b0c";
    gameOverlayCtx.lineWidth = 1.6;
    strokeBorders(true);

    scenario.countries.forEach((country) => {
      const center = centers.get(Number(country.capitalRegionId));
      if (center) drawGameCrown(center.x, center.y);
    });

    (scenario.armies || []).forEach((army) => {
      const center = centers.get(Number(army.regionId));
      if (!center) return;
      const hasCapital = scenario.countries.some(
        (country) => Number(country.capitalRegionId) === Number(army.regionId)
      );
      const markerX = center.x + (hasCapital ? 8 : 0);
      const markerY = center.y + (hasCapital ? 5 : 0);
      if (soldierImage?.complete && soldierImage.naturalWidth) {
        gameOverlayCtx.imageSmoothingEnabled = false;
        gameOverlayCtx.drawImage(soldierImage, Math.round(markerX) - 8, Math.round(markerY) - 12, 16, 16);
      } else {
        drawFallbackSoldier(markerX, markerY);
      }
      gameOverlayCtx.fillStyle = "#fff";
      gameOverlayCtx.font = "bold 7px Arial";
      gameOverlayCtx.textAlign = "center";
      gameOverlayCtx.fillText(String(army.strength || 1), markerX, markerY + 9);
    });
  }

  function setGameZoom(value) {
    gameZoom = Math.max(0.5, Math.min(4, value));
    if (gameData) {
      const width = Math.round(gameData.map.width * gameZoom);
      const height = Math.round(gameData.map.height * gameZoom);
      gameCanvasStack.style.width = `${width}px`;
      gameCanvasStack.style.height = `${height}px`;
      [gameMapCanvas, gameOverlayCanvas].forEach((canvas) => {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      });
    }
    gameZoomLabel.textContent = `${Math.round(gameZoom * 100)}%`;
  }

  async function startGame() {
    if (!selectedMap || !selectedScenario || !selectedCountry) return;
    showScreen(gameScreen);
    gameLoading.hidden = false;
    gameCanvasStack.hidden = true;
    gameCountryName.textContent = selectedCountry.name;
    gameScenarioName.textContent = `${selectedScenario.name} · ${selectedScenario.year || ""}`;
    try {
      const stamp = Date.now();
      const [mapResponse, scenarioResponse] = await Promise.all([
        fetch(`${selectedMap.path}?v=${stamp}`, { cache: "no-store" }),
        fetch(`${selectedScenario.path}?v=${stamp}`, { cache: "no-store" }),
      ]);
      if (!mapResponse.ok || !scenarioResponse.ok) throw new Error("Не удалось загрузить файлы игры");
      const [map, scenario] = await Promise.all([mapResponse.json(), scenarioResponse.json()]);
      const regionAtPixel = new Uint32Array(map.width * map.height);
      const regionById = new Map();
      map.regions.forEach((region) => {
        const id = Number(region.id);
        regionById.set(id, region);
        (region.pixels || []).forEach((pixel) => {
          if (pixel.x >= 0 && pixel.y >= 0 && pixel.x < map.width && pixel.y < map.height) {
            regionAtPixel[pixel.y * map.width + pixel.x] = id;
          }
        });
      });
      const importantRegions = new Set([
        ...scenario.countries.map((country) => Number(country.capitalRegionId)),
        ...(scenario.armies || []).map((army) => Number(army.regionId)),
      ]);
      gameData = {
        map,
        scenario,
        regionAtPixel,
        regionById,
        centers: gameRegionCenters(regionAtPixel, map.width, map.height, importantRegions),
      };
      gameMapCanvas.width = map.width;
      gameMapCanvas.height = map.height;
      gameOverlayCanvas.width = map.width;
      gameOverlayCanvas.height = map.height;
      soldierImage = new Image();
      soldierImage.src = "assets/soldier.png";
      soldierImage.addEventListener("load", renderGameMap, { once: true });
      renderGameMap();
      setGameZoom(Math.min(1.5, 1100 / map.width, 720 / map.height));
      gameLoading.hidden = true;
      gameCanvasStack.hidden = false;
    } catch (error) {
      gameLoading.textContent = `Ошибка загрузки игры: ${error.message}`;
      console.error(error);
    }
  }

  mapsList.addEventListener("click", (event) => {
    const card = event.target.closest(".map-card");
    if (!card) return;
    selectedMap = maps.find((map) => map.file === card.dataset.file) || null;
    selectedScenario = null;
    clearCountries();
    renderMaps();
    renderScenarios();
    updateSelection();
  });

  scenariosList.addEventListener("click", (event) => {
    const card = event.target.closest(".scenario-card");
    if (!card) return;
    selectedScenario = scenarios.find((scenario) => scenario.file === card.dataset.file) || null;
    clearCountries();
    renderScenarios();
    updateSelection();
  });

  countriesList.addEventListener("click", (event) => {
    const card = event.target.closest(".country-card");
    if (!card) return;
    selectedCountry = scenarioCountries.find((country) => String(country.id) === card.dataset.id) || null;
    renderCountries();
    updateSelection();
  });

  playButton.addEventListener("click", () => showScreen(setupScreen));
  backButton.addEventListener("click", () => showScreen(mainScreen));
  leaveGameButton.addEventListener("click", () => showScreen(mainScreen));
  gameZoomOut.addEventListener("click", () => setGameZoom(gameZoom - 0.25));
  gameZoomIn.addEventListener("click", () => setGameZoom(gameZoom + 0.25));
  startGameButton.addEventListener("click", startGame);

  renderMaps();
  renderScenarios();
  renderCountries();
  updateSelection();
  loadCatalogs();
  window.setInterval(loadCatalogs, 2000);
})();
