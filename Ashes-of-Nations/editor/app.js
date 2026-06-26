(function () {
  "use strict";

  let mapWidth = 707;
  let mapHeight = 506;
  let mapName = "Новая карта";
  const EMPTY = 0;
  const BORDER_WIDTH = 1;
  const LAND_COLORS = ["#009b76", "#29ab87", "#3bb08f", "#3eb489"];
  const SEA_COLORS = ["#1e2460", "#082567", "#191970", "#20155e"];
  const MAX_MAP_SIZE = 4000;
  const MAX_REGION_LIST_ITEMS = 1000;

  const canvas = document.getElementById("mapCanvas");
  const borderCanvas = document.getElementById("borderCanvas");
  const canvasStack = document.getElementById("canvasStack");
  const backgroundImage = document.getElementById("backgroundImage");
  const gridOverlay = document.querySelector(".grid-overlay");
  const ctx = canvas.getContext("2d");
  const borderCtx = borderCanvas.getContext("2d");
  let image = ctx.createImageData(mapWidth, mapHeight);
  let cells = new Uint16Array(mapWidth * mapHeight);
  const regions = [];
  const regionById = new Map();
  const undoStack = [];

  let selectedType = "land";
  let selectedRegionId = null;
  let eraserActive = false;
  let fillActive = false;
  let eyedropperActive = false;
  let selectionActive = false;
  let isPainting = false;
  let paintedCount = 0;
  let brushSize = 1;
  let currentZoom = 3;
  let pendingUndoSnapshot = null;
  let pendingMapChanged = false;
  let doubleClickSnapshot = null;
  let doubleClickUndoDepth = 0;
  let selection = null;
  let selectionStart = null;
  let selectionDragOrigin = null;
  let selectionSource = null;
  let selectionMoved = false;
  let selectionResizeActive = false;

  const regionNameInput = document.getElementById("regionName");
  const createRegionButton = document.getElementById("createRegion");
  const renameRegionButton = document.getElementById("renameRegion");
  const regionsList = document.getElementById("regionsList");
  const regionCount = document.getElementById("regionCount");
  const activeRegionName = document.getElementById("activeRegionName");
  const filledCount = document.getElementById("filledCount");
  const coords = document.getElementById("coords");
  const brushSizeInput = document.getElementById("brushSize");
  const brushValue = document.getElementById("brushValue");
  const zoomRange = document.getElementById("zoomRange");
  const zoomValue = document.getElementById("zoomValue");
  const mapOpacityInput = document.getElementById("mapOpacity");
  const mapOpacityValue = document.getElementById("mapOpacityValue");
  const zoomOutButton = document.getElementById("zoomOutButton");
  const zoomInButton = document.getElementById("zoomInButton");
  const fillButton = document.getElementById("fillButton");
  const eraserButton = document.getElementById("eraserButton");
  const eyedropperButton = document.getElementById("eyedropperButton");
  const selectionButton = document.getElementById("selectionButton");
  const backgroundToggle = document.getElementById("backgroundToggle");
  const mapToggle = document.getElementById("mapToggle");
  const undoButton = document.getElementById("undoButton");
  const clearButton = document.getElementById("clearButton");
  const publishColorsButton = document.getElementById("publishColorsButton");
  const downloadButton = document.getElementById("downloadButton");
  const importButton = document.getElementById("importButton");
  const importFile = document.getElementById("importFile");
  const mapNameInput = document.getElementById("mapName");
  const mapWidthInput = document.getElementById("mapWidth");
  const mapHeightInput = document.getElementById("mapHeight");
  const applyMapSettingsButton = document.getElementById("applyMapSettings");
  const backgroundButton = document.getElementById("backgroundButton");
  const clearBackgroundButton = document.getElementById("clearBackgroundButton");
  const backgroundFile = document.getElementById("backgroundFile");
  const gridSize = document.getElementById("gridSize");
  let backgroundImageUrl = "";

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  }

  function setPixelColor(index, color) {
    const offset = index * 4;
    image.data[offset] = color[0];
    image.data[offset + 1] = color[1];
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = color.length > 3 ? color[3] : 255;
  }

  function drawRegionBorders() {
    borderCtx.clearRect(0, 0, borderCanvas.width, borderCanvas.height);
    borderCtx.strokeStyle = "rgba(15, 14, 12, 0.85)";
    borderCtx.lineWidth = BORDER_WIDTH / currentZoom;
    borderCtx.beginPath();

    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        const index = y * mapWidth + x;
        const regionId = cells[index];
        if (regionId === EMPTY) {
          continue;
        }

        const rightId = x < mapWidth - 1 ? cells[index + 1] : EMPTY;
        const bottomId = y < mapHeight - 1 ? cells[index + mapWidth] : EMPTY;

        if (rightId !== EMPTY && rightId !== regionId) {
          const lineX = x + 1;
          borderCtx.moveTo(lineX, y);
          borderCtx.lineTo(lineX, y + 1);
        }
        if (bottomId !== EMPTY && bottomId !== regionId) {
          const lineY = y + 1;
          borderCtx.moveTo(x, lineY);
          borderCtx.lineTo(x + 1, lineY);
        }
      }
    }

    borderCtx.stroke();

    if (selection) {
      borderCtx.save();
      borderCtx.strokeStyle = "#ffd34d";
      borderCtx.lineWidth = 2 / currentZoom;
      borderCtx.setLineDash([6 / currentZoom, 4 / currentZoom]);
      borderCtx.strokeRect(
        selection.x + 1 / currentZoom,
        selection.y + 1 / currentZoom,
        selection.width - 2 / currentZoom,
        selection.height - 2 / currentZoom
      );
      const handleSize = Math.max(8, Math.min(14, currentZoom)) / currentZoom;
      borderCtx.setLineDash([]);
      borderCtx.fillStyle = "#ffd34d";
      borderCtx.strokeStyle = "#17130d";
      borderCtx.lineWidth = 2 / currentZoom;
      borderCtx.fillRect(
        selection.x + selection.width - handleSize / 2,
        selection.y + selection.height - handleSize / 2,
        handleSize,
        handleSize
      );
      borderCtx.strokeRect(
        selection.x + selection.width - handleSize / 2,
        selection.y + selection.height - handleSize / 2,
        handleSize,
        handleSize
      );
      borderCtx.restore();
    }
  }

  function renderCanvas() {
    ctx.putImageData(image, 0, 0);
    drawRegionBorders();
  }

  function updateUndoButton() {
    undoButton.disabled = undoStack.length === 0;
  }

  function beginMapAction() {
    if (pendingUndoSnapshot === null) {
      pendingUndoSnapshot = cells.slice();
      pendingMapChanged = false;
    }
  }

  function commitMapAction() {
    if (pendingUndoSnapshot !== null && pendingMapChanged) {
      undoStack.push(pendingUndoSnapshot);
      if (undoStack.length > 40) {
        undoStack.shift();
      }
    }

    pendingUndoSnapshot = null;
    pendingMapChanged = false;
    updateUndoButton();
  }

  function cancelMapAction() {
    pendingUndoSnapshot = null;
    pendingMapChanged = false;
  }

  function recalculateRegionPixels() {
    const knownRegions = new Map(regions.map((region) => [region.id, region]));
    paintedCount = 0;
    regions.forEach((region) => {
      region.pixels = 0;
    });

    for (let index = 0; index < cells.length; index += 1) {
      const regionId = cells[index];
      if (regionId === EMPTY) {
        continue;
      }

      paintedCount += 1;
      const region = knownRegions.get(regionId);
      if (region) {
        region.pixels += 1;
      }
    }
  }

  function undoLastAction() {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      return;
    }

    cells.set(snapshot);
    recalculateRegionPixels();
    redrawAll();
    renderRegions();
    updateUndoButton();
  }

  function redrawAll() {
    const emptyColor = [0, 0, 0, 0];
    for (let index = 0; index < cells.length; index += 1) {
      const regionId = cells[index];
      const region = regionById.get(regionId);
      setPixelColor(index, region ? region.rgb : emptyColor);
    }
    renderCanvas();
  }

  function renderRegions() {
    regionsList.innerHTML = "";
    regionCount.textContent = String(regions.length);
    renameRegionButton.disabled = !regionById.has(selectedRegionId);

    const fragment = document.createDocumentFragment();
    const visibleRegions = regions.length > MAX_REGION_LIST_ITEMS
      ? regions.slice(0, MAX_REGION_LIST_ITEMS)
      : regions.slice();
    const selectedRegion = regionById.get(selectedRegionId);
    if (selectedRegion && !visibleRegions.includes(selectedRegion)) {
      visibleRegions.push(selectedRegion);
    }

    visibleRegions.forEach((region) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `region-item${region.id === selectedRegionId && !eraserActive ? " active" : ""}`;
      item.dataset.regionId = String(region.id);

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.backgroundColor = region.color;

      const titleWrap = document.createElement("span");
      const title = document.createElement("span");
      title.className = "region-title";
      title.textContent = region.name;
      const meta = document.createElement("span");
      meta.className = "region-meta";
      meta.textContent = region.type === "land" ? "суша" : "море";
      titleWrap.append(title, meta);

      const count = document.createElement("span");
      count.className = "region-meta";
      count.textContent = String(region.pixels);

      item.append(swatch, titleWrap, count);
      fragment.append(item);
    });
    regionsList.append(fragment);

    updateStats();
  }

  function updateStats() {
    const active = regionById.get(selectedRegionId);
    if (selectionActive) {
      activeRegionName.textContent = selection ? "перемещение выделения" : "выделение";
    } else if (eyedropperActive) {
      activeRegionName.textContent = "пипетка";
    } else if (eraserActive) {
      activeRegionName.textContent = fillActive ? "заливка ластиком" : "ластик";
    } else {
      activeRegionName.textContent = active ? `${fillActive ? "заливка: " : ""}${active.name}` : "нет";
    }
    filledCount.textContent = String(paintedCount);
  }

  function setZoom(value) {
    const zoom = Math.max(0.5, Math.min(24, Number(value)));
    const displayWidth = Math.max(1, Math.round(mapWidth * zoom));
    const displayHeight = Math.max(1, Math.round(mapHeight * zoom));
    currentZoom = zoom;
    canvasStack.style.width = `${displayWidth}px`;
    canvasStack.style.height = `${displayHeight}px`;
    backgroundImage.style.width = `${displayWidth}px`;
    backgroundImage.style.height = `${displayHeight}px`;
    gridOverlay.style.backgroundSize = `${Math.max(1, zoom)}px ${Math.max(1, zoom)}px`;
    zoomRange.value = String(zoom);
    zoomValue.textContent = `${zoom}x`;
    drawRegionBorders();
  }

  function setMapOpacity(value) {
    const percent = Math.max(20, Math.min(100, Number(value)));
    canvasStack.style.setProperty("--map-opacity", String(percent / 100));
    mapOpacityInput.value = String(percent);
    mapOpacityValue.textContent = `${percent}%`;
  }

  function setBackgroundImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      window.alert("Выберите файл изображения.");
      return;
    }

    if (backgroundImageUrl) {
      URL.revokeObjectURL(backgroundImageUrl);
    }

    backgroundImageUrl = URL.createObjectURL(file);
    backgroundImage.src = backgroundImageUrl;
    backgroundImage.classList.toggle("hidden-layer", !backgroundToggle.classList.contains("active"));
    clearBackgroundButton.disabled = false;
  }

  function clearBackgroundImage() {
    if (backgroundImageUrl) {
      URL.revokeObjectURL(backgroundImageUrl);
    }
    backgroundImageUrl = "";
    backgroundImage.removeAttribute("src");
    backgroundImage.classList.add("hidden-layer");
    clearBackgroundButton.disabled = true;
    backgroundFile.value = "";
  }

  function nextColor(type) {
    const palette = type === "land" ? LAND_COLORS : SEA_COLORS;
    const used = regions.filter((region) => region.type === type).length;
    return palette[used % palette.length];
  }

  function createRegion() {
    const name = regionNameInput.value.trim() || `Регион ${regions.length + 1}`;
    const color = nextColor(selectedType);
    const id = regions.length + 1;
    regions.push({
      id,
      name,
      type: selectedType,
      color,
      rgb: hexToRgb(color),
      pixels: 0,
    });
    regionById.set(id, regions[regions.length - 1]);
    selectedRegionId = id;
    eraserActive = false;
    eyedropperActive = false;
    eraserButton.classList.remove("active");
    eyedropperButton.classList.remove("active");
    regionNameInput.value = `Регион ${id + 1}`;
    renderRegions();
  }

  function pointInSelection(point) {
    return selection &&
      point.x >= selection.x &&
      point.y >= selection.y &&
      point.x < selection.x + selection.width &&
      point.y < selection.y + selection.height;
  }

  function pointOnSelectionResizeHandle(point) {
    if (!selection) return false;
    const handleRadius = Math.max(1, Math.ceil(7 / currentZoom));
    const right = selection.x + selection.width;
    const bottom = selection.y + selection.height;
    return Math.abs(point.x + 1 - right) <= handleRadius &&
      Math.abs(point.y + 1 - bottom) <= handleRadius;
  }

  function normalizeSelection(start, end) {
    const x = Math.max(0, Math.min(mapWidth - 1, Math.min(start.x, end.x)));
    const y = Math.max(0, Math.min(mapHeight - 1, Math.min(start.y, end.y)));
    const right = Math.min(mapWidth - 1, Math.max(start.x, end.x));
    const bottom = Math.min(mapHeight - 1, Math.max(start.y, end.y));
    return {
      x,
      y,
      width: right - x + 1,
      height: bottom - y + 1,
    };
  }

  function captureSelectionPixels(bounds) {
    const pixels = new Uint16Array(bounds.width * bounds.height);
    for (let y = 0; y < bounds.height; y += 1) {
      const sourceStart = (bounds.y + y) * mapWidth + bounds.x;
      pixels.set(cells.subarray(sourceStart, sourceStart + bounds.width), y * bounds.width);
    }
    return pixels;
  }

  function previewSelectionMove(point) {
    if (!selectionDragOrigin || !selectionSource) return;
    const offsetX = point.x - selectionDragOrigin.x;
    const offsetY = point.y - selectionDragOrigin.y;
    const nextX = Math.max(0, Math.min(mapWidth - selection.width, selectionSource.bounds.x + offsetX));
    const nextY = Math.max(0, Math.min(mapHeight - selection.height, selectionSource.bounds.y + offsetY));
    selectionMoved = nextX !== selectionSource.bounds.x || nextY !== selectionSource.bounds.y;
    selection = { ...selection, x: nextX, y: nextY };
    drawRegionBorders();
  }

  function previewSelectionResize(point, preserveAspect) {
    if (!selectionSource) return;
    const source = selectionSource.bounds;
    const maxWidth = mapWidth - source.x;
    const maxHeight = mapHeight - source.y;
    let width = Math.max(1, Math.min(maxWidth, point.x - source.x + 1));
    let height = Math.max(1, Math.min(maxHeight, point.y - source.y + 1));

    if (preserveAspect) {
      const widthScale = width / source.width;
      const heightScale = height / source.height;
      let scale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
      scale = Math.min(scale, maxWidth / source.width, maxHeight / source.height);
      scale = Math.max(scale, Math.max(1 / source.width, 1 / source.height));
      width = Math.max(1, Math.round(source.width * scale));
      height = Math.max(1, Math.round(source.height * scale));
    }

    selectionMoved = width !== source.width || height !== source.height;
    selection = {
      x: source.x,
      y: source.y,
      width,
      height,
    };
    drawRegionBorders();
  }

  function commitSelectionMove() {
    if (!selectionSource || !selectionMoved) return;
    beginMapAction();

    const source = selectionSource.bounds;
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const sourceIndex = (source.y + y) * mapWidth + source.x + x;
        if (cells[sourceIndex] !== EMPTY) {
          cells[sourceIndex] = EMPTY;
          pendingMapChanged = true;
        }
      }
    }

    for (let y = 0; y < selection.height; y += 1) {
      for (let x = 0; x < selection.width; x += 1) {
        const sourceX = selectionResizeActive
          ? Math.min(source.width - 1, Math.floor(x * source.width / selection.width))
          : x;
        const sourceY = selectionResizeActive
          ? Math.min(source.height - 1, Math.floor(y * source.height / selection.height))
          : y;
        const regionId = selectionSource.pixels[sourceY * source.width + sourceX];
        if (regionId === EMPTY) continue;
        const targetIndex = (selection.y + y) * mapWidth + selection.x + x;
        if (cells[targetIndex] !== regionId) pendingMapChanged = true;
        cells[targetIndex] = regionId;
      }
    }

    recalculateRegionPixels();
    redrawAll();
    renderRegions();
    commitMapAction();
  }

  function renameSelectedRegion() {
    const region = regionById.get(selectedRegionId);
    if (!region) return;
    const name = regionNameInput.value.trim();
    if (!name) {
      window.alert("Введите название региона.");
      return;
    }
    region.name = name;
    renderRegions();
  }

  function setCell(x, y, regionId) {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
      return;
    }

    const index = y * mapWidth + x;
    const previousId = cells[index];
    if (previousId === regionId) {
      return;
    }

    if (pendingUndoSnapshot !== null) {
      pendingMapChanged = true;
    }

    const previousRegion = regionById.get(previousId);
    if (previousRegion) {
      previousRegion.pixels -= 1;
    } else if (previousId === EMPTY && regionId !== EMPTY) {
      paintedCount += 1;
    }

    const nextRegion = regionById.get(regionId);
    if (nextRegion) {
      nextRegion.pixels += 1;
    } else if (previousId !== EMPTY && regionId === EMPTY) {
      paintedCount -= 1;
    }

    cells[index] = regionId;
    setPixelColor(index, nextRegion ? nextRegion.rgb : [0, 0, 0, 0]);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * mapWidth);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * mapHeight);
    return { x, y };
  }

  function paintAt(event) {
    const targetRegionId = eraserActive ? EMPTY : selectedRegionId;
    if (targetRegionId === null) {
      return;
    }

    const point = canvasPoint(event);
    coords.textContent = `${point.x}, ${point.y}`;

    const radius = Math.floor(brushSize / 2);
    for (let y = point.y - radius; y < point.y - radius + brushSize; y += 1) {
      for (let x = point.x - radius; x < point.x - radius + brushSize; x += 1) {
        setCell(x, y, targetRegionId);
      }
    }

    renderCanvas();
    renderRegions();
  }

  function fillAt(event) {
    const targetRegionId = eraserActive ? EMPTY : selectedRegionId;
    if (targetRegionId === null) {
      return;
    }

    const point = canvasPoint(event);
    coords.textContent = `${point.x}, ${point.y}`;
    if (point.x < 0 || point.y < 0 || point.x >= mapWidth || point.y >= mapHeight) {
      return;
    }

    const startIndex = point.y * mapWidth + point.x;
    const sourceRegionId = cells[startIndex];
    if (sourceRegionId === targetRegionId) {
      return;
    }

    const stack = [startIndex];
    const visited = new Uint8Array(cells.length);

    while (stack.length > 0) {
      const index = stack.pop();
      if (visited[index] || cells[index] !== sourceRegionId) {
        continue;
      }

      visited[index] = 1;
      const x = index % mapWidth;
      const y = Math.floor(index / mapWidth);
      setCell(x, y, targetRegionId);

      if (x > 0) {
        stack.push(index - 1);
      }
      if (x < mapWidth - 1) {
        stack.push(index + 1);
      }
      if (y > 0) {
        stack.push(index - mapWidth);
      }
      if (y < mapHeight - 1) {
        stack.push(index + mapWidth);
      }
    }

    renderCanvas();
    renderRegions();
  }

  function pickRegionAt(event) {
    const point = canvasPoint(event);
    coords.textContent = `${point.x}, ${point.y}`;
    if (point.x < 0 || point.y < 0 || point.x >= mapWidth || point.y >= mapHeight) {
      return;
    }

    const regionId = cells[point.y * mapWidth + point.x];
    if (regionId === EMPTY) {
      return;
    }

    selectedRegionId = regionId;
    eraserActive = false;
    eraserButton.classList.remove("active");
    renderRegions();
  }

  function buildRegionAdjacency() {
    const adjacency = new Map(regions.map((region) => [region.id, new Set()]));

    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        const index = y * mapWidth + x;
        const regionId = cells[index];
        if (regionId === EMPTY) {
          continue;
        }

        const rightId = x < mapWidth - 1 ? cells[index + 1] : EMPTY;
        const bottomId = y < mapHeight - 1 ? cells[index + mapWidth] : EMPTY;

        if (rightId !== EMPTY && rightId !== regionId) {
          adjacency.get(regionId).add(rightId);
          adjacency.get(rightId).add(regionId);
        }
        if (bottomId !== EMPTY && bottomId !== regionId) {
          adjacency.get(regionId).add(bottomId);
          adjacency.get(bottomId).add(regionId);
        }
      }
    }

    return adjacency;
  }

  function assignPaletteToType(type, palette, adjacency) {
    const typeRegions = regions
      .filter((region) => region.type === type)
      .sort((a, b) => (adjacency.get(b.id).size - adjacency.get(a.id).size) || (b.pixels - a.pixels));
    const typeIds = new Set(typeRegions.map((region) => region.id));
    const colorByRegion = new Map();

    function chooseNextRegion() {
      let bestRegion = null;
      let bestOptions = null;

      typeRegions.forEach((region) => {
        if (colorByRegion.has(region.id)) {
          return;
        }

        const blockedColors = new Set();
        adjacency.get(region.id).forEach((neighborId) => {
          if (typeIds.has(neighborId) && colorByRegion.has(neighborId)) {
            blockedColors.add(colorByRegion.get(neighborId));
          }
        });

        const options = palette.filter((color) => !blockedColors.has(color));
        if (
          bestRegion === null ||
          options.length < bestOptions.length ||
          (options.length === bestOptions.length && adjacency.get(region.id).size > adjacency.get(bestRegion.id).size)
        ) {
          bestRegion = region;
          bestOptions = options;
        }
      });

      return { region: bestRegion, options: bestOptions || [] };
    }

    function colorNextRegion() {
      if (colorByRegion.size === typeRegions.length) {
        return true;
      }

      const next = chooseNextRegion();
      if (!next.region || next.options.length === 0) {
        return false;
      }

      for (const color of next.options) {
        colorByRegion.set(next.region.id, color);
        if (colorNextRegion()) {
          return true;
        }
        colorByRegion.delete(next.region.id);
      }

      return false;
    }

    if (!colorNextRegion()) {
      typeRegions.forEach((region) => {
        const usedColors = new Set();
        adjacency.get(region.id).forEach((neighborId) => {
          if (typeIds.has(neighborId) && colorByRegion.has(neighborId)) {
            usedColors.add(colorByRegion.get(neighborId));
          }
        });
        colorByRegion.set(region.id, palette.find((color) => !usedColors.has(color)) || palette[0]);
      });
    }

    typeRegions.forEach((region) => {
      const color = colorByRegion.get(region.id);
      region.color = color;
      region.rgb = hexToRgb(color);
    });
  }

  function applyPublishColors() {
    const adjacency = buildRegionAdjacency();
    assignPaletteToType("land", LAND_COLORS, adjacency);
    assignPaletteToType("sea", SEA_COLORS, adjacency);
    redrawAll();
    renderRegions();
  }

  async function downloadRegions() {
    const pixelBuckets = new Map(regions.map((region) => [region.id, []]));
    for (let index = 0; index < cells.length; index += 1) {
      const regionId = cells[index];
      if (regionId === EMPTY) {
        continue;
      }
      pixelBuckets.get(regionId).push({
        x: index % mapWidth,
        y: Math.floor(index / mapWidth),
      });
    }

    const data = {
      name: mapName,
      width: mapWidth,
      height: mapHeight,
      regions: regions.map((region) => ({
        id: region.id,
        name: region.name,
        type: region.type,
        color: region.color,
        pixels: pixelBuckets.get(region.id),
      })),
    };

    const json = JSON.stringify(data, null, 2);
    const safeName = mapName.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
    const fileName = `${safeName || "ashes-of-nations-map"}.json`;

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          startIn: "documents",
          types: [{
            description: "Карта Ashes of Nations",
            accept: { "application/json": [".json"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return;
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
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

  function resetMapData() {
    cells.fill(EMPTY);
    regions.length = 0;
    regionById.clear();
    undoStack.length = 0;
    selectedRegionId = null;
    eraserActive = false;
    fillActive = false;
    eyedropperActive = false;
    selectionActive = false;
    selection = null;
    selectionStart = null;
    selectionDragOrigin = null;
    selectionSource = null;
    selectionResizeActive = false;
    paintedCount = 0;
    fillButton.classList.remove("active");
    eraserButton.classList.remove("active");
    eyedropperButton.classList.remove("active");
    selectionButton.classList.remove("active");
    updateUndoButton();
  }

  function resizeMap(width, height, preserveCells) {
    const oldWidth = mapWidth;
    const oldHeight = mapHeight;
    const oldCells = cells;

    mapWidth = width;
    mapHeight = height;
    cells = new Uint16Array(mapWidth * mapHeight);

    if (preserveCells) {
      const copyWidth = Math.min(oldWidth, mapWidth);
      const copyHeight = Math.min(oldHeight, mapHeight);
      for (let y = 0; y < copyHeight; y += 1) {
        cells.set(oldCells.subarray(y * oldWidth, y * oldWidth + copyWidth), y * mapWidth);
      }
    }

    canvas.width = mapWidth;
    canvas.height = mapHeight;
    borderCanvas.width = mapWidth;
    borderCanvas.height = mapHeight;
    image = ctx.createImageData(mapWidth, mapHeight);
    undoStack.length = 0;
    selection = null;
    selectionStart = null;
    selectionDragOrigin = null;
    selectionSource = null;
    selectionResizeActive = false;
    cancelMapAction();
    recalculateRegionPixels();
    gridSize.textContent = `${mapWidth} x ${mapHeight}`;
    mapWidthInput.value = String(mapWidth);
    mapHeightInput.value = String(mapHeight);
    setZoom(currentZoom);
    redrawAll();
    renderRegions();
    updateUndoButton();
  }

  function applyMapSettings() {
    const width = Number(mapWidthInput.value);
    const height = Number(mapHeightInput.value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > MAX_MAP_SIZE || height > MAX_MAP_SIZE) {
      window.alert(`Ширина и высота карты должны быть целыми числами от 1 до ${MAX_MAP_SIZE}.`);
      return;
    }

    mapName = mapNameInput.value.trim() || "Новая карта";
    mapNameInput.value = mapName;
    if (width !== mapWidth || height !== mapHeight) {
      resizeMap(width, height, true);
    }
  }

  function importRegions(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const data = JSON.parse(reader.result);
        const importedWidth = Number(data && data.width);
        const importedHeight = Number(data && data.height);
        if (
          !data ||
          !Number.isInteger(importedWidth) ||
          !Number.isInteger(importedHeight) ||
          importedWidth < 1 ||
          importedHeight < 1 ||
          importedWidth > MAX_MAP_SIZE ||
          importedHeight > MAX_MAP_SIZE ||
          !Array.isArray(data.regions)
        ) {
          throw new Error(`Нужен JSON карты с размером от 1 до ${MAX_MAP_SIZE} и массивом regions.`);
        }

        resetMapData();
        resizeMap(importedWidth, importedHeight, false);
        mapName = String(data.name || "Новая карта").trim() || "Новая карта";
        mapNameInput.value = mapName;

        data.regions.forEach((sourceRegion, index) => {
          const id = Number(sourceRegion.id);
          const type = sourceRegion.type === "sea" ? "sea" : "land";
          const color = typeof sourceRegion.color === "string" ? sourceRegion.color : nextColor(type);
          const region = {
            id: Number.isInteger(id) && id > 0 ? id : index + 1,
            name: String(sourceRegion.name || `Регион ${index + 1}`),
            type,
            color,
            rgb: hexToRgb(color),
            pixels: 0,
          };
          regions.push(region);
          regionById.set(region.id, region);
        });

        const knownIds = new Set(regions.map((region) => region.id));
        data.regions.forEach((sourceRegion, index) => {
          const regionId = Number.isInteger(Number(sourceRegion.id)) && knownIds.has(Number(sourceRegion.id))
            ? Number(sourceRegion.id)
            : index + 1;
          if (!Array.isArray(sourceRegion.pixels)) {
            return;
          }
          sourceRegion.pixels.forEach((pixel) => {
            const x = Number(pixel.x);
            const y = Number(pixel.y);
            if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < mapWidth && y < mapHeight) {
              setCell(x, y, regionId);
            }
          });
        });

        selectedRegionId = regions.length > 0 ? regions[0].id : null;
        regionNameInput.value = `Регион ${regions.length + 1}`;
        redrawAll();
        renderRegions();
      } catch (error) {
        window.alert(`Не удалось импортировать файл: ${error.message}`);
      } finally {
        importFile.value = "";
      }
    });
    reader.readAsText(file);
  }

  document.querySelectorAll(".type-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedType = button.dataset.type;
      document.querySelectorAll(".type-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  createRegionButton.addEventListener("click", createRegion);
  renameRegionButton.addEventListener("click", renameSelectedRegion);

  mapNameInput.addEventListener("input", () => {
    mapName = mapNameInput.value.trim() || "Новая карта";
  });

  applyMapSettingsButton.addEventListener("click", applyMapSettings);

  regionsList.addEventListener("click", (event) => {
    const item = event.target.closest(".region-item");
    if (!item) {
      return;
    }
    selectedRegionId = Number(item.dataset.regionId);
    const region = regionById.get(selectedRegionId);
    if (region) regionNameInput.value = region.name;
    eraserActive = false;
    eyedropperActive = false;
    selectionActive = false;
    eraserButton.classList.remove("active");
    eyedropperButton.classList.remove("active");
    selectionButton.classList.remove("active");
    renderRegions();
  });

  brushSizeInput.addEventListener("input", () => {
    brushSize = Number(brushSizeInput.value);
    brushValue.textContent = String(brushSize);
  });

  mapOpacityInput.addEventListener("input", () => {
    setMapOpacity(mapOpacityInput.value);
  });

  zoomRange.addEventListener("input", () => {
    setZoom(zoomRange.value);
  });

  zoomOutButton.addEventListener("click", () => {
    const zoom = Number(zoomRange.value);
    setZoom(zoom <= 1 ? zoom - 0.5 : zoom - 1);
  });

  zoomInButton.addEventListener("click", () => {
    const zoom = Number(zoomRange.value);
    setZoom(zoom < 1 ? zoom + 0.5 : zoom + 1);
  });

  fillButton.addEventListener("click", () => {
    fillActive = !fillActive;
    fillButton.classList.toggle("active", fillActive);
    renderRegions();
  });

  eraserButton.addEventListener("click", () => {
    eraserActive = !eraserActive;
    eraserButton.classList.toggle("active", eraserActive);
    if (eraserActive) {
      eyedropperActive = false;
      selectionActive = false;
      eyedropperButton.classList.remove("active");
      selectionButton.classList.remove("active");
    }
    renderRegions();
  });

  eyedropperButton.addEventListener("click", () => {
    eyedropperActive = !eyedropperActive;
    eyedropperButton.classList.toggle("active", eyedropperActive);
    if (eyedropperActive) {
      eraserActive = false;
      selectionActive = false;
      eraserButton.classList.remove("active");
      selectionButton.classList.remove("active");
    }
    renderRegions();
  });

  selectionButton.addEventListener("click", () => {
    selectionActive = !selectionActive;
    selectionButton.classList.toggle("active", selectionActive);
    if (selectionActive) {
      eraserActive = false;
      eyedropperActive = false;
      eraserButton.classList.remove("active");
      eyedropperButton.classList.remove("active");
    } else {
      selection = null;
      selectionStart = null;
      selectionDragOrigin = null;
      selectionSource = null;
      selectionResizeActive = false;
      drawRegionBorders();
    }
    renderRegions();
  });

  mapToggle.addEventListener("click", () => {
    const isVisible = mapToggle.classList.toggle("active");
    canvas.classList.toggle("hidden-layer", !isVisible);
    borderCanvas.classList.toggle("hidden-layer", !isVisible);
  });

  backgroundToggle.addEventListener("click", () => {
    const isVisible = backgroundToggle.classList.toggle("active");
    backgroundImage.classList.toggle("hidden-layer", !isVisible || !backgroundImageUrl);
  });

  undoButton.addEventListener("click", undoLastAction);

  clearButton.addEventListener("click", () => {
    beginMapAction();
    cells.fill(EMPTY);
    regions.forEach((region) => {
      region.pixels = 0;
    });
    pendingMapChanged = paintedCount > 0;
    paintedCount = 0;
    redrawAll();
    renderRegions();
    commitMapAction();
  });

  publishColorsButton.addEventListener("click", applyPublishColors);

  downloadButton.addEventListener("click", downloadRegions);

  importButton.addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (file) {
      importRegions(file);
    }
  });

  backgroundButton.addEventListener("click", () => {
    backgroundFile.click();
  });

  clearBackgroundButton.addEventListener("click", clearBackgroundImage);

  backgroundFile.addEventListener("change", () => {
    const file = backgroundFile.files[0];
    if (file) {
      setBackgroundImage(file);
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (selectionActive) {
      event.preventDefault();
      const point = canvasPoint(event);
      isPainting = true;
      canvas.setPointerCapture(event.pointerId);
      if (pointOnSelectionResizeHandle(point)) {
        selectionSource = {
          bounds: { ...selection },
          pixels: captureSelectionPixels(selection),
        };
        selectionResizeActive = true;
        selectionMoved = false;
      } else if (pointInSelection(point)) {
        selectionDragOrigin = point;
        selectionSource = {
          bounds: { ...selection },
          pixels: captureSelectionPixels(selection),
        };
        selectionResizeActive = false;
        selectionMoved = false;
      } else {
        selectionStart = point;
        selection = normalizeSelection(point, point);
        selectionDragOrigin = null;
        selectionSource = null;
        selectionResizeActive = false;
        drawRegionBorders();
      }
      updateStats();
      return;
    }

    if (event.detail === 1) {
      doubleClickSnapshot = cells.slice();
      doubleClickUndoDepth = undoStack.length;
    }

    isPainting = true;
    canvas.setPointerCapture(event.pointerId);
    if (eyedropperActive) {
      cancelMapAction();
      pickRegionAt(event);
    } else if (fillActive) {
      beginMapAction();
      fillAt(event);
    } else {
      beginMapAction();
      paintAt(event);
    }
  });

  canvas.addEventListener("dblclick", (event) => {
    if (selectionActive || eyedropperActive || doubleClickSnapshot === null) {
      return;
    }

    event.preventDefault();
    isPainting = false;
    cancelMapAction();

    cells.set(doubleClickSnapshot);
    undoStack.length = doubleClickUndoDepth;
    recalculateRegionPixels();
    redrawAll();

    beginMapAction();
    fillAt(event);
    commitMapAction();

    doubleClickSnapshot = null;
  });

  canvas.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event);
    coords.textContent = `${point.x}, ${point.y}`;
    if (isPainting && selectionActive) {
      if (selectionResizeActive) {
        previewSelectionResize(point, event.shiftKey);
      } else if (selectionDragOrigin) {
        previewSelectionMove(point);
      } else if (selectionStart) {
        selection = normalizeSelection(selectionStart, point);
        drawRegionBorders();
      }
    } else if (isPainting && !fillActive && !eyedropperActive) {
      paintAt(event);
    }
  });

  canvas.addEventListener("pointerup", () => {
    if (selectionActive) {
      if (selectionDragOrigin || selectionResizeActive) commitSelectionMove();
      isPainting = false;
      selectionStart = null;
      selectionDragOrigin = null;
      selectionSource = null;
      selectionResizeActive = false;
      selectionMoved = false;
      drawRegionBorders();
      updateStats();
      return;
    }
    isPainting = false;
    commitMapAction();
  });

  canvas.addEventListener("pointercancel", () => {
    if (selectionActive) {
      if (selectionSource) selection = { ...selectionSource.bounds };
      isPainting = false;
      selectionStart = null;
      selectionDragOrigin = null;
      selectionSource = null;
      selectionResizeActive = false;
      selectionMoved = false;
      drawRegionBorders();
      return;
    }
    isPainting = false;
    commitMapAction();
  });

  canvas.addEventListener("pointerleave", () => {
    coords.textContent = "-";
  });

  redrawAll();
  setMapOpacity(65);
  setZoom(3);
  renderRegions();
  updateUndoButton();
})();
