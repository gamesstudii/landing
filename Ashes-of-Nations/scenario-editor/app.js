(function () {
  "use strict";

  const mapFile = document.getElementById("mapFile");
  const scenarioFile = document.getElementById("scenarioFile");
  const exportButton = document.getElementById("exportButton");
  const newCountryButton = document.getElementById("newCountryButton");
  const colorCountriesButton = document.getElementById("colorCountriesButton");
  const countryList = document.getElementById("countryList");
  const countryCount = document.getElementById("countryCount");
  const mapInfo = document.getElementById("mapInfo");
  const selectionTitle = document.getElementById("selectionTitle");
  const selectionHelp = document.getElementById("selectionHelp");
  const canvasViewport = document.getElementById("canvasViewport");
  const canvasEmpty = canvasViewport.querySelector(".canvas-empty");
  const canvasStack = document.getElementById("canvasStack");
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const borderCanvas = document.getElementById("borderCanvas");
  const borderCtx = borderCanvas.getContext("2d");
  const countryForm = document.getElementById("countryForm");
  const countryEmpty = document.getElementById("countryEmpty");
  const countryName = document.getElementById("countryName");
  const rulerSearch = document.getElementById("rulerSearch");
  const rulerSelect = document.getElementById("rulerSelect");
  const ideology = document.getElementById("ideology");
  const capitalRegion = document.getElementById("capitalRegion");
  const countryColor = document.getElementById("countryColor");
  const flagFile = document.getElementById("flagFile");
  const flagSelect = document.getElementById("flagSelect");
  const flagPreview = document.getElementById("flagPreview");
  const selectedRegionCount = document.getElementById("selectedRegionCount");
  const armyStrength = document.getElementById("armyStrength");
  const mapModeHint = document.getElementById("mapModeHint");
  const deleteCountryButton = document.getElementById("deleteCountryButton");
  const scenarioName = document.getElementById("scenarioName");
  const scenarioYear = document.getElementById("scenarioYear");
  const zoomOut = document.getElementById("zoomOut");
  const zoomIn = document.getElementById("zoomIn");
  const zoomLabel = document.getElementById("zoomLabel");

  let mapData = null;
  let regionAtPixel = null;
  let baseImage = null;
  let countries = [];
  let selectedCountryId = null;
  let nextCountryId = 1;
  let zoom = 1;
  let rulers = [];
  let flags = [];
  let occupations = [];
  let armies = [];
  let mapMode = "territory";

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  function selectedCountry() {
    return countries.find((country) => country.id === selectedCountryId) || null;
  }

  function rulerLabel(ruler) {
    const end = ruler.endYear === null ? "н.в." : ruler.endYear;
    const name = ruler.leaderRu && ruler.leaderRu !== ruler.leader
      ? `${ruler.leaderRu} (${ruler.leader})`
      : ruler.leader;
    return `${name} — ${ruler.polity}, ${ruler.title} (${ruler.startYear}–${end})`;
  }

  function renderRulerOptions(country) {
    const year = Number(scenarioYear.value) || 1550;
    const query = rulerSearch.value.trim().toLocaleLowerCase("ru");
    const matches = rulers
      .filter((ruler) => ruler.startYear <= year && (ruler.endYear === null || ruler.endYear >= year))
      .filter((ruler) => !query || `${ruler.leaderRu || ""} ${ruler.leader} ${ruler.polity} ${ruler.title}`.toLocaleLowerCase("ru").includes(query))
      .slice(0, 300);

    rulerSelect.innerHTML = "";
    rulerSelect.add(new Option(matches.length ? "Выберите правителя" : "Ничего не найдено", ""));
    matches.forEach((ruler) => {
      const option = new Option(rulerLabel(ruler), rulerLabel(ruler));
      option.dataset.leader = ruler.leader;
      option.dataset.leaderRu = ruler.leaderRu || "";
      option.dataset.polity = ruler.polity;
      option.dataset.title = ruler.title;
      option.dataset.startYear = String(ruler.startYear);
      option.dataset.endYear = ruler.endYear === null ? "" : String(ruler.endYear);
      rulerSelect.add(option);
    });

    if (country.rulerKey && [...rulerSelect.options].some((option) => option.value === country.rulerKey)) {
      rulerSelect.value = country.rulerKey;
    }
  }

  async function loadReferenceData() {
    rulers = Array.isArray(window.EUROPEAN_RULERS) ? window.EUROPEAN_RULERS : [];
    const uploadedFlags = Array.isArray(window.FLAGS_CATALOG)
      ? window.FLAGS_CATALOG
      : window.FLAGS_CATALOG && window.FLAGS_CATALOG.file
        ? [window.FLAGS_CATALOG]
        : [];
    const modernFlags = Array.isArray(window.MODERN_EUROPE_FLAGS) ? window.MODERN_EUROPE_FLAGS : [];
    flags = [...modernFlags, ...uploadedFlags.map((flag) => ({
      ...flag,
      id: `file:${flag.file}`,
      src: `../flags/${flag.file}`,
    }))];
    flags.forEach((flag) => {
      const option = new Option(flag.name || flag.file, flag.id);
      option.dataset.src = flag.src;
      flagSelect.add(option);
    });

    if (rulers.length === 0) {
      console.warn("База правителей пуста или не подключена.");
    }
    if (flags.length === 0) {
      flagSelect.options[0].textContent = "В папке flags пока нет флагов";
    }
    if (selectedCountry()) renderCountryForm();
  }

  function setZoom(value) {
    zoom = Math.max(0.25, Math.min(4, value));
    if (mapData) {
      const displayWidth = Math.max(1, Math.round(mapData.width * zoom));
      const displayHeight = Math.max(1, Math.round(mapData.height * zoom));
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvasStack.style.width = `${displayWidth}px`;
      canvasStack.style.height = `${displayHeight}px`;
      borderCanvas.width = displayWidth;
      borderCanvas.height = displayHeight;
      borderCanvas.style.width = `${displayWidth}px`;
      borderCanvas.style.height = `${displayHeight}px`;
      drawBorders();
    }
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function buildMap(data) {
    mapData = data;
    canvas.width = data.width;
    canvas.height = data.height;
    regionAtPixel = new Uint32Array(data.width * data.height);
    baseImage = ctx.createImageData(data.width, data.height);

    data.regions.forEach((region) => {
      const rgb = hexToRgb(/^#[0-9a-f]{6}$/i.test(region.color) ? region.color : "#777777");
      (region.pixels || []).forEach((pixel) => {
        const x = Number(pixel.x);
        const y = Number(pixel.y);
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= data.width || y >= data.height) {
          return;
        }
        const index = y * data.width + x;
        const offset = index * 4;
        regionAtPixel[index] = Number(region.id);
        baseImage.data[offset] = rgb[0];
        baseImage.data[offset + 1] = rgb[1];
        baseImage.data[offset + 2] = rgb[2];
        baseImage.data[offset + 3] = 255;
      });
    });

    countries = [];
    occupations = [];
    armies = [];
    selectedCountryId = null;
    nextCountryId = 1;
    canvasStack.hidden = false;
    canvasEmpty.hidden = true;
    mapInfo.textContent = `${data.name || "Без названия"} · ${data.width} × ${data.height} · регионов: ${data.regions.length}`;
    selectionTitle.textContent = data.name || "Карта загружена";
    selectionHelp.textContent = "Создайте страну и назначьте ей регионы кликами по карте";
    newCountryButton.disabled = false;
    exportButton.disabled = false;
    setZoom(Math.min(1, 850 / data.width, 650 / data.height));
    renderCountries();
    renderCountryForm();
    renderMap();
  }

  function renderMap() {
    if (!mapData || !baseImage) return;
    const output = new ImageData(new Uint8ClampedArray(baseImage.data), mapData.width, mapData.height);
    const countryByRegion = new Map();
    countries.forEach((country) => {
      country.regionIds.forEach((regionId) => countryByRegion.set(regionId, country));
    });

    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const regionId = regionAtPixel[index];
      const country = countryByRegion.get(regionId);
      if (!country) continue;
      const rgb = hexToRgb(country.color);
      const offset = index * 4;
      const selected = country.id === selectedCountryId;
      output.data[offset] = Math.min(255, rgb[0] + (selected ? 35 : 0));
      output.data[offset + 1] = Math.min(255, rgb[1] + (selected ? 35 : 0));
      output.data[offset + 2] = Math.min(255, rgb[2] + (selected ? 35 : 0));
      output.data[offset + 3] = 255;
    }

    const occupationByRegion = new Map(occupations.map((occupation) => [
      occupation.regionId,
      countries.find((country) => country.id === occupation.controllerCountryId),
    ]));
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const controller = occupationByRegion.get(regionAtPixel[index]);
      if (!controller) continue;
      const x = index % mapData.width;
      const y = Math.floor(index / mapData.width);
      if ((x + y) % 6 > 1) continue;
      const rgb = hexToRgb(controller.color);
      const offset = index * 4;
      output.data[offset] = rgb[0];
      output.data[offset + 1] = rgb[1];
      output.data[offset + 2] = rgb[2];
      output.data[offset + 3] = 255;
    }

    ctx.putImageData(output, 0, 0);
    drawBorders(countryByRegion);
  }

  function drawBorders(existingCountryByRegion) {
    if (!mapData || !regionAtPixel || borderCanvas.width === 0) return;

    const countryByRegion = existingCountryByRegion || new Map();
    if (!existingCountryByRegion) {
      countries.forEach((country) => {
        country.regionIds.forEach((regionId) => countryByRegion.set(regionId, country));
      });
    }

    const scaleX = borderCanvas.width / mapData.width;
    const scaleY = borderCanvas.height / mapData.height;
    borderCtx.clearRect(0, 0, borderCanvas.width, borderCanvas.height);

    function addBoundaries(countryBorders) {
      borderCtx.beginPath();
      for (let y = 0; y < mapData.height; y += 1) {
        for (let x = 0; x < mapData.width; x += 1) {
          const index = y * mapData.width + x;
          const regionId = regionAtPixel[index];

          if (x < mapData.width - 1) {
            const rightId = regionAtPixel[index + 1];
            if (regionId !== rightId && (regionId !== 0 || rightId !== 0)) {
              const countryA = countryByRegion.get(regionId)?.id ?? null;
              const countryB = countryByRegion.get(rightId)?.id ?? null;
              const isCountryBorder = countryA !== countryB && (countryA !== null || countryB !== null);
              if (isCountryBorder === countryBorders) {
                const lineX = (x + 1) * scaleX;
                borderCtx.moveTo(lineX, y * scaleY);
                borderCtx.lineTo(lineX, (y + 1) * scaleY);
              }
            }
          }

          if (y < mapData.height - 1) {
            const bottomId = regionAtPixel[index + mapData.width];
            if (regionId !== bottomId && (regionId !== 0 || bottomId !== 0)) {
              const countryA = countryByRegion.get(regionId)?.id ?? null;
              const countryB = countryByRegion.get(bottomId)?.id ?? null;
              const isCountryBorder = countryA !== countryB && (countryA !== null || countryB !== null);
              if (isCountryBorder === countryBorders) {
                const lineY = (y + 1) * scaleY;
                borderCtx.moveTo(x * scaleX, lineY);
                borderCtx.lineTo((x + 1) * scaleX, lineY);
              }
            }
          }
        }
      }
      borderCtx.stroke();
    }

    borderCtx.strokeStyle = "rgba(34, 38, 40, 0.78)";
    borderCtx.lineWidth = 1;
    addBoundaries(false);

    borderCtx.strokeStyle = "rgba(4, 5, 6, 0.96)";
    borderCtx.lineWidth = Math.max(2, Math.min(4, Math.round(Math.max(scaleX, scaleY))));
    addBoundaries(true);

    const capitalCenters = new Map();
    countries.forEach((country) => {
      if (country.capitalRegionId !== null) {
        capitalCenters.set(country.capitalRegionId, {
          country,
          x: 0,
          y: 0,
          count: 0,
        });
      }
    });

    if (capitalCenters.size > 0) {
      for (let index = 0; index < regionAtPixel.length; index += 1) {
        const center = capitalCenters.get(regionAtPixel[index]);
        if (!center) continue;
        center.x += index % mapData.width + 0.5;
        center.y += Math.floor(index / mapData.width) + 0.5;
        center.count += 1;
      }

      capitalCenters.forEach((center) => {
        if (center.count === 0) return;
        center.averageX = center.x / center.count;
        center.averageY = center.y / center.count;
        center.markerX = center.averageX;
        center.markerY = center.averageY;
        center.distance = Infinity;
      });

      for (let index = 0; index < regionAtPixel.length; index += 1) {
        const center = capitalCenters.get(regionAtPixel[index]);
        if (!center || center.count === 0) continue;
        const pixelX = index % mapData.width + 0.5;
        const pixelY = Math.floor(index / mapData.width) + 0.5;
        const distance = (pixelX - center.averageX) ** 2 + (pixelY - center.averageY) ** 2;
        if (distance < center.distance) {
          center.distance = distance;
          center.markerX = pixelX;
          center.markerY = pixelY;
        }
      }

      capitalCenters.forEach((center) => {
        if (center.count === 0) return;
        const x = center.markerX * scaleX;
        const y = center.markerY * scaleY;
        drawPixelCrown(borderCtx, x, y, Math.max(1, Math.round(Math.max(scaleX, scaleY))));
      });
    }

    drawArmyMarkers(scaleX, scaleY);
  }

  function drawPixelCrown(context, x, y, unit) {
    const pixels = [
      [0, 0], [4, 0], [8, 0],
      [0, 1], [1, 1], [4, 1], [7, 1], [8, 1],
      [1, 2], [2, 2], [4, 2], [6, 2], [7, 2],
      [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
      [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
      [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
    ];
    const size = Math.max(1, Math.min(3, unit));
    const left = Math.round(x - 4.5 * size);
    const top = Math.round(y - 3 * size);
    context.fillStyle = "#17120a";
    pixels.forEach(([px, py]) => context.fillRect(left + px * size - 1, top + py * size - 1, size + 2, size + 2));
    context.fillStyle = "#ffd34d";
    pixels.forEach(([px, py]) => context.fillRect(left + px * size, top + py * size, size, size));
  }

  function regionCenter(regionId) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      if (regionAtPixel[index] !== regionId) continue;
      sumX += index % mapData.width + 0.5;
      sumY += Math.floor(index / mapData.width) + 0.5;
      count += 1;
    }
    if (!count) return null;
    const averageX = sumX / count;
    const averageY = sumY / count;
    let best = null;
    let bestDistance = Infinity;
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      if (regionAtPixel[index] !== regionId) continue;
      const x = index % mapData.width + 0.5;
      const y = Math.floor(index / mapData.width) + 0.5;
      const distance = (x - averageX) ** 2 + (y - averageY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }
    return best;
  }

  function drawArmyMarkers(scaleX, scaleY) {
    armies.forEach((army) => {
      const center = regionCenter(army.regionId);
      if (!center) return;
      const hasCapital = countries.some((country) => country.capitalRegionId === army.regionId);
      const x = center.x * scaleX + (hasCapital ? 10 : 0);
      const y = center.y * scaleY + (hasCapital ? 6 : 0);
      const size = Math.max(2, Math.min(5, Math.round(Math.max(scaleX, scaleY))));
      borderCtx.fillStyle = "#111";
      borderCtx.fillRect(x - size * 2 - 1, y - size * 3 - 1, size * 4 + 2, size * 5 + 2);
      borderCtx.fillStyle = "#d9d0b8";
      borderCtx.fillRect(x - size, y - size * 3, size * 2, size * 2);
      borderCtx.fillStyle = "#4c5f37";
      borderCtx.fillRect(x - size * 2, y - size, size * 4, size * 3);
      borderCtx.fillStyle = "#111";
      borderCtx.font = `bold ${Math.max(9, size * 3)}px Arial`;
      borderCtx.textAlign = "center";
      borderCtx.textBaseline = "top";
      borderCtx.fillText(String(army.strength), x, y + size * 2);
    });
  }

  function renderCountries() {
    countryList.innerHTML = "";
    countryCount.textContent = String(countries.length);
    colorCountriesButton.disabled = !mapData || countries.length === 0;
    if (countries.length === 0) {
      countryList.innerHTML = '<p class="placeholder">Страны ещё не созданы</p>';
      return;
    }

    countries.forEach((country) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `country-item${country.id === selectedCountryId ? " active" : ""}`;
      button.dataset.id = String(country.id);
      const swatch = document.createElement("span");
      swatch.className = "country-swatch";
      swatch.style.background = country.color;
      const name = document.createElement("strong");
      name.textContent = country.name;
      const count = document.createElement("small");
      count.textContent = String(country.regionIds.length);
      button.append(swatch, name, count);
      countryList.append(button);
    });
  }

  function updateCapitalOptions(country) {
    capitalRegion.innerHTML = "";
    if (country.regionIds.length === 0) {
      const option = new Option("Сначала выберите регионы", "");
      capitalRegion.add(option);
      capitalRegion.disabled = true;
      country.capitalRegionId = null;
      return;
    }
    capitalRegion.disabled = false;
    country.regionIds.forEach((id) => {
      const region = mapData.regions.find((item) => Number(item.id) === id);
      capitalRegion.add(new Option(region ? region.name : `Регион ${id}`, String(id)));
    });
    if (!country.regionIds.includes(country.capitalRegionId)) {
      country.capitalRegionId = country.regionIds[0];
    }
    capitalRegion.value = String(country.capitalRegionId);
  }

  function renderFlag(country) {
    flagPreview.innerHTML = "";
    if (!country.flag) {
      flagPreview.textContent = "Флаг не выбран";
      return;
    }
    const image = document.createElement("img");
    image.src = country.flag;
    image.alt = `Флаг: ${country.name}`;
    flagPreview.append(image);
  }

  function renderCountryForm() {
    const country = selectedCountry();
    countryForm.hidden = !country;
    countryEmpty.hidden = Boolean(country);
    if (!country) return;
    countryName.value = country.name;
    rulerSearch.value = "";
    renderRulerOptions(country);
    ideology.value = country.ideology;
    countryColor.value = country.color;
    flagSelect.value = country.flagId || "";
    selectedRegionCount.textContent = String(country.regionIds.length);
    updateCapitalOptions(country);
    renderFlag(country);
  }

  function createCountry() {
    const palette = ["#b94632", "#416f91", "#7b8742", "#7d4f91", "#b0803d", "#39806b"];
    const country = {
      id: nextCountryId++,
      name: `Страна ${countries.length + 1}`,
      ruler: "",
      rulerKey: "",
      rulerData: null,
      ideology: "neutral",
      capitalRegionId: null,
      color: palette[countries.length % palette.length],
      flag: null,
      flagId: "",
      regionIds: [],
    };
    countries.push(country);
    selectedCountryId = country.id;
    renderCountries();
    renderCountryForm();
    renderMap();
  }

  function assignRegion(regionId) {
    const country = selectedCountry();
    if (!country || regionId === 0) return;
    const existingOwner = countries.find((item) => item.regionIds.includes(regionId));
    if (existingOwner && existingOwner.id === country.id) {
      country.regionIds = country.regionIds.filter((id) => id !== regionId);
    } else {
      if (existingOwner) {
        existingOwner.regionIds = existingOwner.regionIds.filter((id) => id !== regionId);
        if (existingOwner.capitalRegionId === regionId) existingOwner.capitalRegionId = existingOwner.regionIds[0] || null;
      }
      country.regionIds.push(regionId);
      country.regionIds.sort((a, b) => a - b);
    }
    renderCountries();
    renderCountryForm();
    renderMap();
  }

  function setOccupation(regionId) {
    const country = selectedCountry();
    if (!country || regionId === 0) return;
    const existing = occupations.find((item) => item.regionId === regionId);
    if (existing?.controllerCountryId === country.id) {
      occupations = occupations.filter((item) => item !== existing);
    } else if (existing) {
      existing.controllerCountryId = country.id;
    } else {
      occupations.push({ regionId, controllerCountryId: country.id });
    }
    renderMap();
  }

  function setArmy(regionId) {
    const country = selectedCountry();
    if (!country || regionId === 0) return;
    const existing = armies.find((item) => item.regionId === regionId);
    if (existing?.countryId === country.id) {
      armies = armies.filter((item) => item !== existing);
    } else {
      armies = armies.filter((item) => item.regionId !== regionId);
      armies.push({
        regionId,
        countryId: country.id,
        strength: Math.max(1, Number(armyStrength.value) || 1),
      });
    }
    renderMap();
  }

  function buildCountryAdjacency() {
    const adjacency = new Map(countries.map((country) => [country.id, new Set()]));
    const countryByRegion = new Map();
    countries.forEach((country) => {
      country.regionIds.forEach((regionId) => countryByRegion.set(regionId, country.id));
    });

    function connect(regionA, regionB) {
      const countryA = countryByRegion.get(regionA);
      const countryB = countryByRegion.get(regionB);
      if (!countryA || !countryB || countryA === countryB) return;
      adjacency.get(countryA).add(countryB);
      adjacency.get(countryB).add(countryA);
    }

    for (let y = 0; y < mapData.height; y += 1) {
      for (let x = 0; x < mapData.width; x += 1) {
        const index = y * mapData.width + x;
        const regionId = regionAtPixel[index];
        if (x < mapData.width - 1) connect(regionId, regionAtPixel[index + 1]);
        if (y < mapData.height - 1) connect(regionId, regionAtPixel[index + mapData.width]);
      }
    }

    return adjacency;
  }

  function countryPalette(count) {
    const palette = [
      "#c33f37", "#3978a8", "#55a05a", "#c79a32",
      "#8b5bb1", "#d36d2f", "#2f9c95", "#be5686",
      "#6d7f32", "#5164bd", "#a66b42", "#4e9bc2",
    ];
    for (let index = palette.length; index < count; index += 1) {
      const hue = Math.round((index * 137.508) % 360);
      const saturation = 0.58;
      const lightness = 0.48;
      const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const segment = hue / 60;
      const secondary = chroma * (1 - Math.abs(segment % 2 - 1));
      const [red, green, blue] =
        segment < 1 ? [chroma, secondary, 0] :
        segment < 2 ? [secondary, chroma, 0] :
        segment < 3 ? [0, chroma, secondary] :
        segment < 4 ? [0, secondary, chroma] :
        segment < 5 ? [secondary, 0, chroma] :
        [chroma, 0, secondary];
      const offset = lightness - chroma / 2;
      palette.push(`#${[red, green, blue]
        .map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, "0"))
        .join("")}`);
    }
    return palette;
  }

  function applyCountryColors() {
    if (!mapData || countries.length === 0) return;

    const adjacency = buildCountryAdjacency();
    const palette = countryPalette(countries.length);
    const colorByCountry = new Map();

    while (colorByCountry.size < countries.length) {
      const nextCountry = countries
        .filter((country) => !colorByCountry.has(country.id))
        .sort((countryA, countryB) => {
          const saturationA = new Set(
            [...adjacency.get(countryA.id)]
              .filter((id) => colorByCountry.has(id))
              .map((id) => colorByCountry.get(id))
          ).size;
          const saturationB = new Set(
            [...adjacency.get(countryB.id)]
              .filter((id) => colorByCountry.has(id))
              .map((id) => colorByCountry.get(id))
          ).size;
          return saturationB - saturationA ||
            adjacency.get(countryB.id).size - adjacency.get(countryA.id).size;
        })[0];

      const blockedColors = new Set(
        [...adjacency.get(nextCountry.id)]
          .filter((id) => colorByCountry.has(id))
          .map((id) => colorByCountry.get(id))
      );
      colorByCountry.set(
        nextCountry.id,
        palette.find((color) => !blockedColors.has(color))
      );
    }

    countries.forEach((country) => {
      country.color = colorByCountry.get(country.id);
    });
    const country = selectedCountry();
    if (country) countryColor.value = country.color;
    renderCountries();
    renderMap();
  }

  async function exportScenario() {
    if (!mapData) return;
    const data = {
      format: "ashes-of-nations-scenario",
      version: 1,
      name: scenarioName.value.trim() || "Новый сценарий",
      year: Number(scenarioYear.value) || 1550,
      map: {
        name: mapData.name || "Карта",
        width: mapData.width,
        height: mapData.height,
        file: mapFile.files[0] ? mapFile.files[0].name : null,
      },
      countries: countries.map((country) => ({
        id: country.id,
        name: country.name,
        ruler: country.ruler,
        rulerData: country.rulerData,
        ideology: country.ideology,
        capitalRegionId: country.capitalRegionId,
        color: country.color,
        flag: country.flag,
        flagId: country.flagId,
        regionIds: country.regionIds,
      })),
      occupations,
      armies,
    };
    const safeName = data.name.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
    const fileName = `${safeName || "scenario"}.scenario.json`;
    const json = JSON.stringify(data, null, 2);

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: "documents",
          types: [{
            description: "Сценарий Ashes of Nations",
            accept: { "application/json": [".json"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        console.warn("Прямое сохранение недоступно, используется скачивание.", error);
      }
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importScenario(data) {
    if (!mapData) {
      throw new Error("Сначала загрузите карту, для которой создан сценарий.");
    }
    if (!data || data.format !== "ashes-of-nations-scenario" || !Array.isArray(data.countries)) {
      throw new Error("Это не файл сценария Ashes of Nations.");
    }
    if (
      data.map &&
      (Number(data.map.width) !== mapData.width || Number(data.map.height) !== mapData.height)
    ) {
      throw new Error(`Сценарий рассчитан на карту ${data.map.width} × ${data.map.height}.`);
    }

    const validRegionIds = new Set(mapData.regions.map((region) => Number(region.id)));
    const occupiedRegionIds = new Set();
    countries = data.countries.map((source, index) => {
      const regionIds = (Array.isArray(source.regionIds) ? source.regionIds : [])
        .map(Number)
        .filter((id) => validRegionIds.has(id) && !occupiedRegionIds.has(id));
      regionIds.forEach((id) => occupiedRegionIds.add(id));
      const capitalRegionId = regionIds.includes(Number(source.capitalRegionId))
        ? Number(source.capitalRegionId)
        : regionIds[0] || null;
      const id = Number.isInteger(Number(source.id)) ? Number(source.id) : index + 1;
      return {
        id,
        name: String(source.name || `Страна ${index + 1}`),
        ruler: String(source.ruler || source.rulerData?.name || ""),
        rulerKey: "",
        rulerData: source.rulerData || null,
        ideology: String(source.ideology || "neutral"),
        capitalRegionId,
        color: /^#[0-9a-f]{6}$/i.test(source.color) ? source.color : "#b94632",
        flag: typeof source.flag === "string" ? source.flag : null,
        flagId: typeof source.flagId === "string" ? source.flagId : "",
        regionIds,
      };
    });
    const countryIds = new Set(countries.map((country) => country.id));
    occupations = (Array.isArray(data.occupations) ? data.occupations : [])
      .map((item) => ({
        regionId: Number(item.regionId),
        controllerCountryId: Number(item.controllerCountryId),
      }))
      .filter((item) => validRegionIds.has(item.regionId) && countryIds.has(item.controllerCountryId));
    armies = (Array.isArray(data.armies) ? data.armies : [])
      .map((item) => ({
        regionId: Number(item.regionId),
        countryId: Number(item.countryId),
        strength: Math.max(1, Number(item.strength) || 1),
      }))
      .filter((item) => validRegionIds.has(item.regionId) && countryIds.has(item.countryId));

    scenarioName.value = String(data.name || "Импортированный сценарий");
    scenarioYear.value = String(Math.max(1550, Math.min(2026, Number(data.year) || 1550)));
    nextCountryId = Math.max(0, ...countries.map((country) => country.id)) + 1;
    selectedCountryId = countries[0]?.id ?? null;
    renderCountries();
    renderCountryForm();
    renderMap();
  }

  mapFile.addEventListener("change", () => {
    const file = mapFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Number.isInteger(data.width) || !Number.isInteger(data.height) || !Array.isArray(data.regions)) {
          throw new Error("Неверный формат карты");
        }
        buildMap(data);
      } catch (error) {
        window.alert(`Не удалось загрузить карту: ${error.message}`);
      }
    });
    reader.readAsText(file);
  });

  scenarioFile.addEventListener("change", () => {
    const file = scenarioFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        importScenario(JSON.parse(reader.result));
      } catch (error) {
        window.alert(`Не удалось импортировать сценарий: ${error.message}`);
      } finally {
        scenarioFile.value = "";
      }
    });
    reader.readAsText(file);
  });

  newCountryButton.addEventListener("click", createCountry);
  colorCountriesButton.addEventListener("click", applyCountryColors);
  exportButton.addEventListener("click", exportScenario);

  countryList.addEventListener("click", (event) => {
    const item = event.target.closest(".country-item");
    if (!item) return;
    selectedCountryId = Number(item.dataset.id);
    renderCountries();
    renderCountryForm();
    renderMap();
  });

  canvas.addEventListener("click", (event) => {
    if (!mapData) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * mapData.width / rect.width);
    const y = Math.floor((event.clientY - rect.top) * mapData.height / rect.height);
    if (x < 0 || y < 0 || x >= mapData.width || y >= mapData.height) return;
    const regionId = regionAtPixel[y * mapData.width + x];
    if (mapMode === "occupation") setOccupation(regionId);
    else if (mapMode === "army") setArmy(regionId);
    else assignRegion(regionId);
  });

  document.querySelectorAll("[data-map-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mapMode = button.dataset.mapMode;
      document.querySelectorAll("[data-map-mode]").forEach((item) => item.classList.toggle("active", item === button));
      mapModeHint.textContent =
        mapMode === "occupation"
          ? "Нажмите регион, чтобы назначить или снять оккупацию выбранной страной."
          : mapMode === "army"
            ? "Нажмите регион, чтобы поставить или убрать армию выбранной страны."
            : "Нажимайте по регионам, чтобы назначать территории выбранной стране.";
    });
  });

  countryName.addEventListener("input", () => {
    const country = selectedCountry();
    if (!country) return;
    country.name = countryName.value || "Без названия";
    renderCountries();
  });

  rulerSearch.addEventListener("input", () => {
    const country = selectedCountry();
    if (country) renderRulerOptions(country);
  });

  rulerSelect.addEventListener("change", () => {
    const country = selectedCountry();
    const option = rulerSelect.selectedOptions[0];
    if (!country || !option || !option.value) return;
    country.ruler = option.dataset.leader;
    country.rulerKey = option.value;
    country.rulerData = {
      name: option.dataset.leader,
      nameRu: option.dataset.leaderRu || null,
      polity: option.dataset.polity,
      title: option.dataset.title,
      startYear: Number(option.dataset.startYear),
      endYear: option.dataset.endYear ? Number(option.dataset.endYear) : null,
    };
  });

  ideology.addEventListener("change", () => {
    const country = selectedCountry();
    if (country) country.ideology = ideology.value;
  });

  capitalRegion.addEventListener("change", () => {
    const country = selectedCountry();
    if (country) {
      country.capitalRegionId = Number(capitalRegion.value) || null;
      renderMap();
    }
  });

  countryColor.addEventListener("input", () => {
    const country = selectedCountry();
    if (!country) return;
    country.color = countryColor.value;
    renderCountries();
    renderMap();
  });

  flagFile.addEventListener("change", () => {
    const country = selectedCountry();
    const file = flagFile.files[0];
    if (!country || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      country.flag = reader.result;
      country.flagId = "";
      flagSelect.value = "";
      renderFlag(country);
    });
    reader.readAsDataURL(file);
  });

  flagSelect.addEventListener("change", () => {
    const country = selectedCountry();
    if (!country) return;
    const option = flagSelect.selectedOptions[0];
    country.flagId = flagSelect.value;
    country.flag = flagSelect.value ? option.dataset.src : null;
    renderFlag(country);
  });

  scenarioYear.addEventListener("input", () => {
    const country = selectedCountry();
    if (country) renderRulerOptions(country);
  });

  deleteCountryButton.addEventListener("click", () => {
    if (!selectedCountry()) return;
    countries = countries.filter((country) => country.id !== selectedCountryId);
    occupations = occupations.filter((item) => item.controllerCountryId !== selectedCountryId);
    armies = armies.filter((item) => item.countryId !== selectedCountryId);
    selectedCountryId = countries[0] ? countries[0].id : null;
    renderCountries();
    renderCountryForm();
    renderMap();
  });

  zoomOut.addEventListener("click", () => setZoom(zoom - 0.25));
  zoomIn.addEventListener("click", () => setZoom(zoom + 0.25));
  loadReferenceData();
})();
