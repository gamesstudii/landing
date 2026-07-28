(function () {
  const STORAGE_PREFIX = "tankswars-devlab:";
  const defaultVectorProject = () => ({
    image: null,
    imageName: "",
    imageWidth: 1200,
    imageHeight: 800,
    tool: "select",
    partFilter: "all",
    hasTurret: true,
    shapes: [],
    selectedShapeId: "",
    centers: {
      tank: { x: 600, y: 400 },
      hull: { x: 600, y: 430 },
      turret: { x: 660, y: 330 }
    },
    centerVisibility: {
      tank: true,
      hull: true,
      turret: true
    }
  });

  const csvColumns = {
    name: 0,
    shell1Type: 1,
    shell2Type: 2,
    shell3Type: 3,
    shell1Damage: 4,
    shell2Damage: 5,
    shell3Damage: 6,
    level: 7,
    nation: 8,
    research1: 9,
    research2: 10,
    research3: 11,
    expPrice: 12,
    silverPrice: 13,
    className: 14,
    health: 15,
    reloadTime: 16,
    hullTurnDelay: 17,
    movementDelay: 18,
    pen1: 19,
    pen2: 20,
    pen3: 21,
    armor: 22,
    penChance: 23,
    gunType: 24,
    shellsPerShot: 25,
    clipSize: 26,
    spread: 27,
    kind: 28,
    uniqueFeatures: 29,
    gunDepression: 30,
    gunElevation: 31
  };

  const state = {
    activeTab: "vector",
    vector: loadJson(`${STORAGE_PREFIX}vectorProject`, defaultVectorProject()),
    colorPickTarget: null,
    csv: {
      rows: [],
      widths: [],
      filteredIndexes: [],
      selectedIndex: 0,
      search: "",
      sourceName: "data.csv",
      dirty: false,
      loadError: ""
    },
    csvHelper: {
      turnDegPerSec: "",
      kmh: ""
    },
    nations: [],
    tankNames: [],
    shellTypes: [],
    drag: null,
    drawing: null
  };

  const dom = {};

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function createEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not store state", error);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function snapLinePoint(start, point) {
    const dx = point.x - start.x;
    const dy = point.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) {
      return { x: start.x, y: start.y };
    }

    const angleStep = Math.PI / 4;
    const snappedAngle = Math.round(Math.atan2(dy, dx) / angleStep) * angleStep;
    return {
      x: start.x + Math.cos(snappedAngle) * length,
      y: start.y + Math.sin(snappedAngle) * length
    };
  }

  function getConstrainedBox(start, point, keepSquare) {
    const dx = point.x - start.x;
    const dy = point.y - start.y;

    if (!keepSquare) {
      return {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.max(1, Math.abs(dx)),
        h: Math.max(1, Math.abs(dy))
      };
    }

    const size = Math.max(1, Math.max(Math.abs(dx), Math.abs(dy)));
    return {
      x: dx < 0 ? start.x - size : start.x,
      y: dy < 0 ? start.y - size : start.y,
      w: size,
      h: size
    };
  }

  function getConstrainedCornerBounds(initial, corner, point, keepSquare) {
    const x1 = initial.x;
    const y1 = initial.y;
    const x2 = initial.x + initial.w;
    const y2 = initial.y + initial.h;

    if (!keepSquare) {
      const next = {
        x: x1,
        y: y1,
        w: initial.w,
        h: initial.h
      };

      if (corner === 0) {
        next.x = point.x;
        next.y = point.y;
        next.w = x2 - point.x;
        next.h = y2 - point.y;
      } else if (corner === 1) {
        next.y = point.y;
        next.w = point.x - x1;
        next.h = y2 - point.y;
      } else if (corner === 2) {
        next.w = point.x - x1;
        next.h = point.y - y1;
      } else if (corner === 3) {
        next.x = point.x;
        next.w = x2 - point.x;
        next.h = point.y - y1;
      }

      return {
        x: Math.min(next.x, next.x + next.w),
        y: Math.min(next.y, next.y + next.h),
        w: Math.max(1, Math.abs(next.w)),
        h: Math.max(1, Math.abs(next.h))
      };
    }

    if (corner === 0) {
      const size = Math.max(1, Math.max(Math.abs(point.x - x2), Math.abs(point.y - y2)));
      return { x: x2 - size, y: y2 - size, w: size, h: size };
    }
    if (corner === 1) {
      const size = Math.max(1, Math.max(Math.abs(point.x - x1), Math.abs(point.y - y2)));
      return { x: x1, y: y2 - size, w: size, h: size };
    }
    if (corner === 2) {
      const size = Math.max(1, Math.max(Math.abs(point.x - x1), Math.abs(point.y - y1)));
      return { x: x1, y: y1, w: size, h: size };
    }
    const size = Math.max(1, Math.max(Math.abs(point.x - x2), Math.abs(point.y - y1)));
    return { x: x2 - size, y: y1, w: size, h: size };
  }

  function toNumber(value, fallback = 0) {
    const normalized = String(value ?? "").replace(",", ".").trim();
    const number = Number.parseFloat(normalized);
    return Number.isFinite(number) ? number : fallback;
  }

  function toInt(value, fallback = 0) {
    const number = Number.parseInt(String(value ?? "").replace(",", "."), 10);
    return Number.isFinite(number) ? number : fallback;
  }

  function formatFixed(value, digits = 4) {
    if (!Number.isFinite(value)) return "";
    return value.toFixed(digits).replace(".", ",");
  }

  function trimTrailingZeros(value) {
    return String(value).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function columnLabel(index) {
    let n = index + 1;
    let label = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return label;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        continue;
      }

      if (ch === ",") {
        row.push(cell);
        cell = "";
        continue;
      }

      if (ch === "\r") {
        continue;
      }

      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += ch;
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }

  function stringifyCsv(rows) {
    return rows
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
  }

  function normalizeRows(rows) {
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return {
      rows: rows.map((row) => {
        const copy = row.slice();
        while (copy.length < width) {
          copy.push("");
        }
        return copy;
      }),
      widths: rows.map((row) => row.length)
    };
  }

  function copyRows(rows) {
    return rows.map((row) => row.slice());
  }

  function getCsvRowWidth() {
    const definedWidth = Object.values(csvColumns).reduce((max, index) => Math.max(max, index + 1), 0);
    const loadedWidth = state.csv.widths.length ? Math.max(...state.csv.widths) : 0;
    return Math.max(definedWidth, loadedWidth);
  }

  function createBlankCsvRow() {
    return Array.from({ length: getCsvRowWidth() }, () => "");
  }

  function getUniqueCsvTankName(baseName = "Новый танк") {
    const existingNames = new Set(
      state.csv.rows
        .map((row) => String(getRowValue(row, csvColumns.name)).trim())
        .filter(Boolean)
    );

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let suffix = 2;
    while (existingNames.has(`${baseName} ${suffix}`)) {
      suffix += 1;
    }
    return `${baseName} ${suffix}`;
  }

  function getRowValue(row, index) {
    return row[index] ?? "";
  }

  function setRowValue(row, index, value) {
    while (row.length <= index) {
      row.push("");
    }
    row[index] = value;
  }

  function getSelectedRow() {
    return state.csv.rows[state.csv.filteredIndexes[state.csv.selectedIndex] ?? 0] || null;
  }

  function createDefaultShape(type, point) {
    const id = `shape_${Math.random().toString(36).slice(2, 10)}`;

    if (type === "rect") {
      return {
        id,
        type,
        part: "hull",
        label: "Контур",
        visible: true,
        fillEnabled: true,
        strokeEnabled: true,
        cornerRadius: 6,
        x: point.x,
        y: point.y,
        w: 120,
        h: 90,
        fill: "rgba(88, 166, 255, 0.12)",
        stroke: "#58a6ff"
      };
    }

    if (type === "line") {
      return {
        id,
        type,
        part: "other",
        label: "Линия",
        visible: true,
        fillEnabled: false,
        strokeEnabled: true,
        strokeWidth: 4,
        lineCap: "butt",
        x1: point.x,
        y1: point.y,
        x2: point.x + 140,
        y2: point.y
      };
    }

    if (type === "ellipse") {
      return {
        id,
        type,
        part: "turret",
        label: "Овал",
        visible: true,
        fillEnabled: true,
        strokeEnabled: true,
        x: point.x,
        y: point.y,
        w: 100,
        h: 100,
        fill: "rgba(54, 179, 126, 0.14)",
        stroke: "#36b37e"
      };
    }

    return {
      id,
      type: "polygon",
      part: "hull",
      label: "Полигон",
      visible: true,
      fillEnabled: true,
      strokeEnabled: true,
      points: [
        { x: point.x, y: point.y },
        { x: point.x + 90, y: point.y + 12 },
        { x: point.x + 60, y: point.y + 80 }
      ],
      fill: "rgba(227, 179, 65, 0.12)",
      stroke: "#e3b341"
    };
  }

  function currentVectorImageSize() {
    return {
      width: Number.isFinite(state.vector.imageWidth) ? state.vector.imageWidth : 1200,
      height: Number.isFinite(state.vector.imageHeight) ? state.vector.imageHeight : 800
    };
  }

  function getStageFrame() {
    const stage = dom.stageWrap;
    const rect = stage.getBoundingClientRect();
    const { width: sourceWidth, height: sourceHeight } = currentVectorImageSize();
    const scale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const left = rect.left + (rect.width - width) / 2;
    const top = rect.top + (rect.height - height) / 2;
    return { left, top, width, height, scale, sourceWidth, sourceHeight };
  }

  function pointerToImagePoint(event) {
    const frame = getStageFrame();
    const x = (event.clientX - frame.left) / frame.scale;
    const y = (event.clientY - frame.top) / frame.scale;
    return {
      x: clamp(x, 0, frame.sourceWidth),
      y: clamp(y, 0, frame.sourceHeight),
      inside: x >= 0 && y >= 0 && x <= frame.sourceWidth && y <= frame.sourceHeight
    };
  }

  function isShapeVisible(shape) {
    if (!shape.visible) return false;
    if (state.vector.partFilter === "all") return true;
    return shape.part === state.vector.partFilter;
  }

  function findShapeById(id) {
    return state.vector.shapes.find((shape) => shape.id === id) || null;
  }

  function getSelectedShape() {
    return findShapeById(state.vector.selectedShapeId);
  }

  function selectShape(id) {
    state.vector.selectedShapeId = id || "";
    renderVector();
  }

  function getSelectedShapeIndex() {
    return state.vector.shapes.findIndex((shape) => shape.id === state.vector.selectedShapeId);
  }

  function moveSelectedShape(direction) {
    const index = getSelectedShapeIndex();
    if (index < 0) return;

    const shapes = state.vector.shapes;
    const [shape] = shapes.splice(index, 1);
    if (!shape) return;

    let targetIndex = index;
    if (direction === "up") {
      targetIndex = Math.min(shapes.length, index + 1);
    } else if (direction === "down") {
      targetIndex = Math.max(0, index - 1);
    } else if (direction === "top") {
      targetIndex = shapes.length;
    } else if (direction === "bottom") {
      targetIndex = 0;
    }

    shapes.splice(targetIndex, 0, shape);
    updateVectorStorage();
    renderVector();
  }

  function updateVectorStorage() {
    saveJson(`${STORAGE_PREFIX}vectorProject`, state.vector);
  }

  function setStatus(message) {
    dom.statusText.textContent = message;
  }

  function updateImageStatus() {
    if (state.vector.imageName) {
      setStatus(`PNG: ${state.vector.imageName} | CSV: ${state.csv.rows.length} строк`);
    } else {
      setStatus(`PNG не загружен | CSV: ${state.csv.rows.length} строк`);
    }
  }

  function renderTabs() {
    dom.tabVector.classList.toggle("active", state.activeTab === "vector");
    dom.tabCsv.classList.toggle("active", state.activeTab === "csv");
    dom.vectorView.classList.toggle("active", state.activeTab === "vector");
    dom.csvView.classList.toggle("active", state.activeTab === "csv");
  }

  function renderLayerList() {
    const list = dom.layerList;
    list.textContent = "";

    if (!state.vector.shapes.length) {
      const empty = createEl("div", "inspectorEmpty", "Слоёв пока нет.");
      list.append(empty);
      return;
    }

    state.vector.shapes.slice().reverse().forEach((shape) => {
      const item = createEl("div", `layerItem ${shape.id === state.vector.selectedShapeId ? "selected" : ""}`);
      const top = createEl("div", "layerItemTop");
      const titleWrap = document.createElement("div");
      const controls = createEl("div", "layerMoveControls");
      const title = createEl("div", "", shape.label || shape.type);
      const meta = createEl("div", "layerMeta", `${shape.type} | ${shape.part}`);
      const visibility = createEl("button", "miniButton", shape.visible ? "Скрыт" : "Виден");
      const select = createEl("button", "miniButton", "Выбрать");
      const moveTop = createEl("button", "miniButton", "В самый верх");
      const moveUp = createEl("button", "miniButton", "Выше");
      const moveDown = createEl("button", "miniButton", "Ниже");
      const moveBottom = createEl("button", "miniButton", "В самый низ");
      const partSelect = document.createElement("select");

      partSelect.className = "fieldSelect";
      ["hull", "turret", "other"].forEach((part) => {
        const option = document.createElement("option");
        option.value = part;
        option.textContent = part === "hull" ? "Корпус" : part === "turret" ? "Башня" : "Прочее";
        if (shape.part === part) option.selected = true;
        partSelect.append(option);
      });

      titleWrap.append(title, meta);
      controls.append(moveTop, moveUp, moveDown, moveBottom);
      top.append(titleWrap, controls, select);
      item.append(top, visibility, partSelect);

      visibility.addEventListener("click", () => {
        shape.visible = !shape.visible;
        updateVectorStorage();
        renderVector();
      });

      select.addEventListener("click", () => {
        selectShape(shape.id);
      });

      moveTop.addEventListener("click", () => {
        selectShape(shape.id);
        moveSelectedShape("top");
      });

      moveUp.addEventListener("click", () => {
        selectShape(shape.id);
        moveSelectedShape("up");
      });

      moveDown.addEventListener("click", () => {
        selectShape(shape.id);
        moveSelectedShape("down");
      });

      moveBottom.addEventListener("click", () => {
        selectShape(shape.id);
        moveSelectedShape("bottom");
      });

      partSelect.addEventListener("change", () => {
        shape.part = partSelect.value;
        updateVectorStorage();
        renderVector();
      });

      item.addEventListener("click", (event) => {
        if (event.target === visibility || event.target === select || event.target === partSelect) return;
        selectShape(shape.id);
      });

      list.append(item);
    });
  }

  function renderCenterInspector() {
    const list = dom.centerInspector;
    list.textContent = "";

    ["tank", "hull", "turret"].forEach((key) => {
      const center = state.vector.centers[key];
      const card = createEl("div", "centerCard");
      const title = createEl("div", "centerCardTitle", key === "tank" ? "Центр танка" : key === "hull" ? "Центр корпуса" : "Центр башни");
      const meta = createEl("div", "centerCardMeta", `X: ${center.x.toFixed(1)} | Y: ${center.y.toFixed(1)}`);
      const button = createEl("button", "smallButton", "Переместить");
      const toggle = createEl("button", `miniButton ${state.vector.centerVisibility?.[key] ? "active" : ""}`, state.vector.centerVisibility?.[key] ? "Скрыть" : "Показать");

      button.addEventListener("click", () => {
        state.vector.tool = `${key}Center`;
        syncToolButtons();
      });

      toggle.addEventListener("click", () => {
        if (!state.vector.centerVisibility) {
          state.vector.centerVisibility = { tank: true, hull: true, turret: true };
        }
        state.vector.centerVisibility[key] = !state.vector.centerVisibility[key];
        updateVectorStorage();
        renderVector();
      });

      card.append(title, meta, button, toggle);
      list.append(card);
    });
  }

  function renderShapeInspector() {
    const root = dom.shapeInspector;
    const shape = getSelectedShape();
    root.textContent = "";

    if (!shape) {
      root.append(createEl("div", "inspectorEmpty", "Выберите слой для редактирования."));
      return;
    }

    const form = createEl("div", "propGrid");

    const titleField = fieldText("Название слоя", shape.label || "", (value) => {
      shape.label = value;
      updateVectorStorage();
      renderLayerList();
    });

    const partField = fieldSelect("Часть", [
      { value: "hull", label: "Корпус" },
      { value: "turret", label: "Башня" },
      { value: "other", label: "Прочее" }
    ], shape.part, (value) => {
      shape.part = value;
      updateVectorStorage();
      renderLayerList();
    });

    const visibleField = fieldCheck("Виден", shape.visible, (value) => {
      shape.visible = value;
      updateVectorStorage();
      renderLayerList();
    });

    const supportsFill = shape.type !== "line";
    const fillEnabledField = supportsFill ? fieldCheck("Есть заливка", shape.fillEnabled !== false, (value) => {
      shape.fillEnabled = value;
      updateVectorStorage();
      renderVectorSvg();
    }) : null;

    const fillField = supportsFill ? colorField("Заливка", shape.fill || "#58a6ff", (value) => {
      shape.fill = value;
      updateVectorStorage();
      renderVectorSvg();
    }, shape, "fill") : null;

    const strokeEnabledField = fieldCheck("Есть обводка", shape.strokeEnabled !== false, (value) => {
      shape.strokeEnabled = value;
      updateVectorStorage();
      renderVectorSvg();
    });

    const strokeField = colorField("Обводка", shape.stroke || "#58a6ff", (value) => {
      shape.stroke = value;
      updateVectorStorage();
      renderVectorSvg();
    }, shape, "stroke");

    const strokeWidthField = rangeField(shape.type === "line" ? "Толщина линии" : "Толщина обводки", getShapeStrokeWidth(shape), 1, 40, 1, (value) => {
      shape.strokeWidth = value;
      updateVectorStorage();
      renderVectorSvg();
    });

    const lineCapField = shape.type === "line"
      ? fieldSelect("Конец линии", [
        { value: "butt", label: "Острый" },
        { value: "round", label: "Тупой" }
      ], shape.lineCap || "butt", (value) => {
        shape.lineCap = value;
        updateVectorStorage();
        renderVectorSvg();
      })
      : null;

    const cornerField = shape.type === "rect"
      ? rangeField("Скругление углов", shape.cornerRadius ?? 6, 0, 40, 1, (value) => {
        shape.cornerRadius = value;
        updateVectorStorage();
        renderVectorSvg();
      })
      : null;

    const deleteButton = createEl("button", "actionButton danger", "Удалить слой");
    deleteButton.addEventListener("click", () => {
      state.vector.shapes = state.vector.shapes.filter((item) => item.id !== shape.id);
      state.vector.selectedShapeId = "";
      updateVectorStorage();
      renderVector();
    });

    form.append(titleField, partField, visibleField);
    if (fillEnabledField) form.append(fillEnabledField);
    if (fillField) form.append(fillField);
    form.append(strokeEnabledField, strokeField, strokeWidthField);
    if (lineCapField) form.append(lineCapField);
    if (cornerField) {
      form.append(cornerField);
    }
    form.append(deleteButton);
    root.append(form);
  }

  function fieldText(label, value, onInput, hint) {
    const field = createEl("label", "propField");
    const head = createEl("div", "fieldLabel");
    head.append(createEl("span", "", label), createEl("span", "formulaValue", hint || ""));
    const input = document.createElement("input");
    input.className = "fieldInput";
    input.type = "text";
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(head, input);
    return field;
  }

  function fieldSelect(label, options, value, onChange) {
    const field = createEl("label", "propField");
    const head = createEl("div", "fieldLabel", label);
    const select = document.createElement("select");
    select.className = "fieldSelect";
    options.forEach((optionSpec) => {
      const option = document.createElement("option");
      option.value = optionSpec.value;
      option.textContent = optionSpec.label;
      if (optionSpec.value === value) option.selected = true;
      select.append(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    field.append(head, select);
    return field;
  }

  function fieldCheck(label, checked, onChange) {
    const field = createEl("label", "propField");
    const wrap = createEl("div", "toggleGroup");
    const button = createEl("button", `toggleButton ${checked ? "active" : ""}`, label);
    button.type = "button";
    button.addEventListener("click", () => {
      checked = !checked;
      button.classList.toggle("active", checked);
      onChange(checked);
    });
    wrap.append(button);
    field.append(createEl("div", "fieldLabel", label), wrap);
    return field;
  }

  function rangeField(label, value, min, max, step, onInput, hint) {
    const field = createEl("label", "propField");
    const head = createEl("div", "fieldLabel");
    const current = createEl("span", "formulaValue", `${value}`);
    head.append(createEl("span", "", label), current);
    const input = document.createElement("input");
    input.className = "shapeRange";
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.addEventListener("input", () => {
      current.textContent = String(input.value);
      onInput(Number(input.value));
    });
    if (hint) {
      head.append(createEl("span", "formulaValue", hint));
    }
    field.append(head, input);
    return field;
  }

  const colorSwatches = [
    "#58a6ff",
    "#36b37e",
    "#e3b341",
    "#f26d6d",
    "#9f7aea",
    "#f59e0b",
    "#e879f9",
    "#22c55e",
    "#14b8a6",
    "#cbd5e1",
    "#111827",
    "#ffffff"
  ];

  function normalizeColor(value, fallback = "#58a6ff") {
    const text = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(text)) {
      return text.toUpperCase();
    }
    if (/^#[0-9a-fA-F]{3}$/.test(text)) {
      return `#${text.slice(1).split("").map((ch) => ch + ch).join("")}`.toUpperCase();
    }
    const rgbMatch = text.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgbMatch) {
      return rgbaToHex(
        clamp(Number.parseInt(rgbMatch[1], 10), 0, 255),
        clamp(Number.parseInt(rgbMatch[2], 10), 0, 255),
        clamp(Number.parseInt(rgbMatch[3], 10), 0, 255)
      );
    }
    return fallback;
  }

  function componentToHex(component) {
    return component.toString(16).padStart(2, "0");
  }

  function rgbaToHex(r, g, b) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();
  }

  function colorField(label, value, onChange, shape, key) {
    const field = createEl("label", "propField");
    const head = createEl("div", "fieldLabel");
    head.append(createEl("span", "", label), createEl("span", "formulaValue", normalizeColor(value)));

    const previewRow = createEl("div", "colorFieldRow");
    const preview = createEl("button", "colorPreview");
    preview.type = "button";
    preview.style.background = normalizeColor(value);
    preview.title = normalizeColor(value);

    const input = document.createElement("input");
    input.className = "fieldInput colorInput";
    input.type = "color";
    input.value = normalizeColor(value);

    const eyedropperButton = createEl("button", "miniButton", "Пипетка");
    eyedropperButton.type = "button";
    eyedropperButton.addEventListener("click", async () => {
      if (window.EyeDropper) {
        try {
          const picker = new EyeDropper();
          const result = await picker.open();
          onChange(result.sRGBHex);
          input.value = result.sRGBHex;
          preview.style.background = result.sRGBHex;
          preview.title = result.sRGBHex;
          return;
        } catch (error) {
          // fallback to stage pick
        }
      }

      state.colorPickTarget = { shapeId: shape?.id || "", key };
      setStatus("Кликните по цвету на сцене");
    });

    input.addEventListener("input", () => {
      const color = normalizeColor(input.value);
      preview.style.background = color;
      preview.title = color;
      head.lastChild.textContent = color;
      onChange(color);
    });

    preview.addEventListener("click", () => {
      input.click();
    });

    const swatchRow = createEl("div", "swatchRow");
    colorSwatches.forEach((swatch) => {
      const swatchButton = createEl("button", "swatchButton");
      swatchButton.type = "button";
      swatchButton.style.background = swatch;
      swatchButton.title = swatch;
      swatchButton.addEventListener("click", () => {
        input.value = swatch;
        preview.style.background = swatch;
        preview.title = swatch;
        head.lastChild.textContent = swatch;
        onChange(swatch);
      });
      swatchRow.append(swatchButton);
    });

    previewRow.append(preview, input, eyedropperButton);
    field.append(head, previewRow, swatchRow);
    return field;
  }

  function renderCentersOnSvg(svg) {
    Object.entries(state.vector.centers).forEach(([key, center]) => {
      if (state.vector.centerVisibility && state.vector.centerVisibility[key] === false) {
        return;
      }
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const crossH = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const crossV = document.createElementNS("http://www.w3.org/2000/svg", "line");

      group.setAttribute("data-center", key);
      group.style.cursor = "move";
      circle.setAttribute("cx", center.x);
      circle.setAttribute("cy", center.y);
      circle.setAttribute("r", key === "tank" ? 12 : 10);
      circle.setAttribute("fill", key === "tank" ? "rgba(88,166,255,0.18)" : key === "hull" ? "rgba(54,179,126,0.18)" : "rgba(227,179,65,0.18)");
      circle.setAttribute("stroke", key === "tank" ? "#58a6ff" : key === "hull" ? "#36b37e" : "#e3b341");
      circle.setAttribute("stroke-width", "2");
      crossH.setAttribute("x1", center.x - 14);
      crossH.setAttribute("x2", center.x + 14);
      crossH.setAttribute("y1", center.y);
      crossH.setAttribute("y2", center.y);
      crossH.setAttribute("stroke", circle.getAttribute("stroke"));
      crossH.setAttribute("stroke-width", "1");
      crossV.setAttribute("x1", center.x);
      crossV.setAttribute("x2", center.x);
      crossV.setAttribute("y1", center.y - 14);
      crossV.setAttribute("y2", center.y + 14);
      crossV.setAttribute("stroke", circle.getAttribute("stroke"));
      crossV.setAttribute("stroke-width", "1");

      group.append(circle, crossH, crossV);
      group.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.drag = {
          mode: "center",
          key,
          origin: pointerToImagePoint(event),
          initial: { ...state.vector.centers[key] }
        };
        svg.setPointerCapture(event.pointerId);
      });

      svg.append(group);
    });
  }

  function shapeToSvg(shape) {
    const ns = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(ns, "g");
    group.setAttribute("data-id", shape.id);
    group.style.cursor = "move";

    if (shape.type === "rect") {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", shape.x);
      rect.setAttribute("y", shape.y);
      rect.setAttribute("width", Math.max(1, shape.w));
      rect.setAttribute("height", Math.max(1, shape.h));
      rect.setAttribute("rx", String(Math.max(0, Number(shape.cornerRadius || 0))));
      rect.setAttribute("fill", getShapeFill(shape));
      rect.setAttribute("stroke", getShapeStroke(shape));
      rect.setAttribute("stroke-width", shapeHasStroke(shape) ? String(getShapeStrokeWidth(shape)) : "0");
      group.append(rect);
    } else if (shape.type === "ellipse") {
      const ellipse = document.createElementNS(ns, "ellipse");
      ellipse.setAttribute("cx", shape.x + shape.w / 2);
      ellipse.setAttribute("cy", shape.y + shape.h / 2);
      ellipse.setAttribute("rx", Math.max(1, shape.w / 2));
      ellipse.setAttribute("ry", Math.max(1, shape.h / 2));
      ellipse.setAttribute("fill", getShapeFill(shape));
      ellipse.setAttribute("stroke", getShapeStroke(shape));
      ellipse.setAttribute("stroke-width", shapeHasStroke(shape) ? String(getShapeStrokeWidth(shape)) : "0");
      group.append(ellipse);
    } else if (shape.type === "line") {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", shape.x1);
      line.setAttribute("y1", shape.y1);
      line.setAttribute("x2", shape.x2);
      line.setAttribute("y2", shape.y2);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", getShapeStroke(shape));
      line.setAttribute("stroke-width", shapeHasStroke(shape) ? String(getShapeStrokeWidth(shape)) : "0");
      line.setAttribute("stroke-linecap", shape.lineCap || "butt");
      group.append(line);
    } else {
      const polygon = document.createElementNS(ns, "polygon");
      polygon.setAttribute("points", (shape.points || []).map((point) => `${point.x},${point.y}`).join(" "));
      polygon.setAttribute("fill", getShapeFill(shape));
      polygon.setAttribute("stroke", getShapeStroke(shape));
      polygon.setAttribute("stroke-width", shapeHasStroke(shape) ? String(getShapeStrokeWidth(shape)) : "0");
      group.append(polygon);
    }

    if (shape.id === state.vector.selectedShapeId) {
      const outline = document.createElementNS(ns, "rect");
      const bounds = shapeBounds(shape);
      outline.setAttribute("x", bounds.x - 4);
      outline.setAttribute("y", bounds.y - 4);
      outline.setAttribute("width", bounds.w + 8);
      outline.setAttribute("height", bounds.h + 8);
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", "#58a6ff");
      outline.setAttribute("stroke-dasharray", "6 4");
      outline.setAttribute("stroke-width", "1.5");
      group.append(outline);
    }

    if (shape.id === state.vector.selectedShapeId) {
      if (shape.type === "polygon") {
        (shape.points || []).forEach((point, index) => {
          addSvgHandle(group, ns, point.x, point.y, "#ffffff", "vertex", index);
        });
      } else if (shape.type === "line") {
        addSvgHandle(group, ns, shape.x1, shape.y1, "#ffffff", "line-end", 0);
        addSvgHandle(group, ns, shape.x2, shape.y2, "#ffffff", "line-end", 1);
      } else {
        const bounds = shapeBounds(shape);
        const corners = [
          [bounds.x, bounds.y],
          [bounds.x + bounds.w, bounds.y],
          [bounds.x + bounds.w, bounds.y + bounds.h],
          [bounds.x, bounds.y + bounds.h]
        ];
        corners.forEach(([x, y], index) => {
          addSvgHandle(group, ns, x, y, "#ffffff", "corner", index);
        });
      }
    }

    group.addEventListener("pointerdown", (event) => {
      if (event.target?.dataset?.handleKind) return;
      if (state.vector.tool !== "select") return;
      event.preventDefault();
      event.stopPropagation();
      selectShape(shape.id);
      state.drag = {
        mode: "shape",
        id: shape.id,
        origin: pointerToImagePoint(event),
        initial: cloneShape(shape)
      };
      dom.vectorSvg.setPointerCapture(event.pointerId);
    });

    return group;
  }

  function cloneShape(shape) {
    return JSON.parse(JSON.stringify(shape));
  }

  function shapeBounds(shape) {
    if (shape.type === "rect" || shape.type === "ellipse") {
      return {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h
      };
    }

    if (shape.type === "line") {
      const minX = Math.min(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      const maxX = Math.max(shape.x1, shape.x2);
      const maxY = Math.max(shape.y1, shape.y2);
      return {
        x: minX,
        y: minY,
        w: Math.max(1, maxX - minX),
        h: Math.max(1, maxY - minY)
      };
    }

    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function shapeHasFill(shape) {
    return shape.type !== "line" && shape.fillEnabled !== false;
  }

  function shapeHasStroke(shape) {
    return shape.strokeEnabled !== false;
  }

  function getShapeFill(shape) {
    return shapeHasFill(shape) ? (shape.fill || "rgba(88, 166, 255, 0.12)") : "none";
  }

  function getShapeStroke(shape) {
    return shapeHasStroke(shape) ? (shape.stroke || "#58a6ff") : "none";
  }

  function getShapeStrokeWidth(shape) {
    return Math.max(1, Number(shape.strokeWidth || 2));
  }

  function addSvgHandle(group, ns, x, y, color, kind, index) {
    const handle = document.createElementNS(ns, "circle");
    handle.setAttribute("cx", x);
    handle.setAttribute("cy", y);
    handle.setAttribute("r", "5.5");
    handle.setAttribute("fill", color);
    handle.setAttribute("stroke", "#0b1117");
    handle.setAttribute("stroke-width", "1.5");
    handle.setAttribute("data-handle-kind", kind);
    handle.setAttribute("data-handle-index", String(index));
    handle.style.cursor = "grab";
    handle.addEventListener("pointerdown", (event) => {
      if (state.vector.tool !== "select") return;
      event.preventDefault();
      event.stopPropagation();
      const shapeId = group.getAttribute("data-id");
      const point = pointerToImagePoint(event);
      const mode = kind === "vertex" ? "vertex" : kind === "line-end" ? "lineEnd" : "resizeCorner";
      state.drag = {
        mode,
        id: shapeId,
        corner: kind === "corner" ? index : null,
        lineEnd: kind === "line-end" ? index : null,
        vertexIndex: kind === "vertex" ? index : null,
        origin: point,
        initial: cloneShape(findShapeById(shapeId))
      };
      dom.vectorSvg.setPointerCapture(event.pointerId);
    });
    group.append(handle);
  }

  function renderVectorSvg() {
    const svg = dom.vectorSvg;
    const ns = "http://www.w3.org/2000/svg";
    svg.textContent = "";
    const { width, height } = currentVectorImageSize();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const defs = document.createElementNS(ns, "defs");
    const style = document.createElementNS(ns, "style");
    style.textContent = `
      .shapeHidden { opacity: 0.18; }
    `;
    defs.append(style);
    svg.append(defs);

    state.vector.shapes.forEach((shape) => {
      if (!isShapeVisible(shape)) return;
      const group = shapeToSvg(shape);
      svg.append(group);
    });

    if (state.vector.tool === "polygon" && state.drawing?.shape?.type === "polygon") {
      const preview = document.createElementNS(ns, "polyline");
      preview.setAttribute("fill", "none");
      preview.setAttribute("stroke", "#ffffff");
      preview.setAttribute("stroke-width", "1.5");
      preview.setAttribute("stroke-dasharray", "5 4");
      preview.setAttribute(
        "points",
        [...state.drawing.shape.points, state.drawing.previewPoint].filter(Boolean).map((point) => `${point.x},${point.y}`).join(" ")
      );
      svg.append(preview);
    }

    renderCentersOnSvg(svg);

    if (state.vector.selectedShapeId) {
      const selected = getSelectedShape();
      if (selected) {
        const bounds = shapeBounds(selected);
        const focus = document.createElementNS(ns, "rect");
        focus.setAttribute("x", bounds.x);
        focus.setAttribute("y", bounds.y);
        focus.setAttribute("width", Math.max(1, bounds.w));
        focus.setAttribute("height", Math.max(1, bounds.h));
        focus.setAttribute("fill", "none");
        focus.setAttribute("stroke", "rgba(88,166,255,0.7)");
        focus.setAttribute("stroke-width", "1.2");
        svg.append(focus);
      }
    }
  }

  function renderVector() {
    dom.vectorImage.src = state.vector.image || "";
    dom.vectorImage.style.display = state.vector.image ? "block" : "none";
    dom.stageHint.style.display = state.vector.image ? "none" : "block";
    renderLayerList();
    renderShapeInspector();
    renderCenterInspector();
    renderVectorSvg();
    syncToolButtons();
    syncFilterButtons();
    updateVectorStorage();
    updateImageStatus();
  }

  function syncToolButtons() {
    if (state.vector.hasTurret === false && state.vector.tool === "turretCenter") {
      state.vector.tool = "select";
    }
    document.querySelectorAll(".toolButton").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === state.vector.tool);
      if (button.dataset.tool === "turretCenter") {
        button.disabled = state.vector.hasTurret === false;
      }
    });
    dom.showTankCenterBtn.classList.toggle("active", state.vector.centerVisibility?.tank !== false);
    dom.showHullCenterBtn.classList.toggle("active", state.vector.centerVisibility?.hull !== false);
    dom.showTurretCenterBtn.classList.toggle("active", state.vector.centerVisibility?.turret !== false);
    dom.showTurretCenterBtn.disabled = state.vector.hasTurret === false;
    dom.hasTurretBtn.classList.toggle("active", state.vector.hasTurret !== false);
    dom.hasTurretBtn.textContent = state.vector.hasTurret === false ? "Башни нет" : "Есть башня";
  }

  function syncFilterButtons() {
    document.querySelectorAll(".chipButton[data-part-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.partFilter === state.vector.partFilter);
    });
  }

  function updateShapeFromDrag(point, shiftKey = false) {
    if (!state.drag) return;

    if (state.drag.mode === "center") {
      state.vector.centers[state.drag.key] = {
        x: point.x,
        y: point.y
      };
      renderVectorSvg();
      renderCenterInspector();
      updateVectorStorage();
      return;
    }

    if (state.drag.mode === "vertex") {
      const shape = findShapeById(state.drag.id);
      if (!shape || shape.type !== "polygon") return;
      const initial = state.drag.initial;
      const nextPoints = (initial.points || []).map((item, index) => (
        index === state.drag.vertexIndex ? { x: point.x, y: point.y } : { x: item.x, y: item.y }
      ));
      shape.points = nextPoints;
      renderVectorSvg();
      renderShapeInspector();
      updateVectorStorage();
      return;
    }

    if (state.drag.mode === "resizeCorner") {
      const shape = findShapeById(state.drag.id);
      if (!shape || (shape.type !== "rect" && shape.type !== "ellipse")) return;
      const initial = state.drag.initial;
      const corner = state.drag.corner;
      const next = getConstrainedCornerBounds(initial, corner, point, shiftKey);

      shape.x = Math.min(next.x, next.x + next.w);
      shape.y = Math.min(next.y, next.y + next.h);
      shape.w = Math.max(1, Math.abs(next.w));
      shape.h = Math.max(1, Math.abs(next.h));
      if (shape.type === "rect") {
        shape.cornerRadius = clamp(shape.cornerRadius ?? 0, 0, Math.min(shape.w, shape.h) / 2);
      }
      renderVectorSvg();
      renderShapeInspector();
      updateVectorStorage();
      return;
    }

    if (state.drag.mode === "lineEnd") {
      const shape = findShapeById(state.drag.id);
      if (!shape || shape.type !== "line") return;
      const anchor = state.drag.lineEnd === 0
        ? { x: shape.x2, y: shape.y2 }
        : { x: shape.x1, y: shape.y1 };
      const snappedPoint = shiftKey ? snapLinePoint(anchor, point) : point;
      if (state.drag.lineEnd === 0) {
        shape.x1 = snappedPoint.x;
        shape.y1 = snappedPoint.y;
      } else {
        shape.x2 = snappedPoint.x;
        shape.y2 = snappedPoint.y;
      }
      renderVectorSvg();
      renderShapeInspector();
      updateVectorStorage();
      return;
    }

    if (state.drag.mode !== "shape") return;
    const shape = findShapeById(state.drag.id);
    if (!shape) return;
    const origin = state.drag.origin;
    const initial = state.drag.initial;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    if (shape.type === "rect" || shape.type === "ellipse") {
      shape.x = initial.x + dx;
      shape.y = initial.y + dy;
    } else if (shape.type === "line") {
      shape.x1 = initial.x1 + dx;
      shape.y1 = initial.y1 + dy;
      shape.x2 = initial.x2 + dx;
      shape.y2 = initial.y2 + dy;
    } else {
      shape.points = initial.points.map((item) => ({
        x: item.x + dx,
        y: item.y + dy
      }));
    }

    renderVectorSvg();
    renderShapeInspector();
    updateVectorStorage();
  }

  function finishDrag() {
    state.drag = null;
    state.drawing = null;
  }

  function onSvgPointerDown(event) {
    const point = pointerToImagePoint(event);
    if (!point.inside) return;

    if (state.colorPickTarget) {
      sampleSceneColorAtPoint(point).then((color) => {
        applyPickedColor(color);
      }).catch(() => {
        applyPickedColor("#58A6FF");
      });
      return;
    }

    if (state.vector.tool === "select") {
      if (event.target === dom.vectorSvg || event.target === dom.stageWrap || event.target.classList.contains("checkerboard")) {
        state.vector.selectedShapeId = "";
        renderVector();
      }
      return;
    }

    if (state.vector.tool === "tankCenter" || state.vector.tool === "hullCenter" || state.vector.tool === "turretCenter") {
      if (state.vector.tool === "turretCenter" && state.vector.hasTurret === false) {
        return;
      }
      const key = state.vector.tool.replace("Center", "");
      state.vector.centers[key] = { x: point.x, y: point.y };
      updateVectorStorage();
      renderVector();
      return;
    }

    if (state.vector.tool === "polygon") {
      if (!state.drawing) {
        const shape = createDefaultShape("polygon", point);
        shape.points = [{ x: point.x, y: point.y }];
        state.drawing = {
          shape,
          previewPoint: { x: point.x, y: point.y }
        };
        return;
      }

      state.drawing.shape.points.push({ x: point.x, y: point.y });
      state.drawing.previewPoint = { x: point.x, y: point.y };
      renderVectorSvg();
      return;
    }

    if (state.vector.tool === "rect" || state.vector.tool === "ellipse") {
      const shape = createDefaultShape(state.vector.tool, point);
      shape.x = point.x;
      shape.y = point.y;
      shape.w = 1;
      shape.h = 1;
      state.vector.shapes.push(shape);
      state.vector.selectedShapeId = shape.id;
      state.drawing = {
        mode: "resize",
        id: shape.id,
        origin: point,
        initial: cloneShape(shape)
      };
      updateVectorStorage();
      renderVector();
      return;
    }

    if (state.vector.tool === "line") {
      const shape = createDefaultShape("line", point);
      shape.x2 = point.x;
      shape.y2 = point.y;
      state.vector.shapes.push(shape);
      state.vector.selectedShapeId = shape.id;
      state.drawing = {
        mode: "line",
        id: shape.id,
        origin: point,
        initial: cloneShape(shape)
      };
      updateVectorStorage();
      renderVector();
      return;
    }

    const shape = createDefaultShape(state.vector.tool, point);
    state.vector.shapes.push(shape);
    state.vector.selectedShapeId = shape.id;
    state.drag = {
      mode: "shape",
      id: shape.id,
      origin: point,
      initial: cloneShape(shape)
    };
    updateVectorStorage();
    renderVector();
  }

  function onSvgPointerMove(event) {
    const point = pointerToImagePoint(event);
    if (!point.inside && !state.drag && !state.drawing) return;

    if (state.drag) {
      updateShapeFromDrag(point, event.shiftKey);
      return;
    }

    if (state.drawing?.mode === "resize") {
      const shape = findShapeById(state.drawing.id);
      if (!shape) return;
      const start = state.drawing.origin;
      const box = getConstrainedBox(start, point, event.shiftKey);
      shape.x = box.x;
      shape.y = box.y;
      shape.w = box.w;
      shape.h = box.h;
      renderVectorSvg();
      return;
    }

    if (state.drawing?.mode === "line") {
      const shape = findShapeById(state.drawing.id);
      if (!shape || shape.type !== "line") return;
      const snappedPoint = event.shiftKey ? snapLinePoint(state.drawing.origin, point) : point;
      shape.x2 = snappedPoint.x;
      shape.y2 = snappedPoint.y;
      renderVectorSvg();
      return;
    }

    if (state.drawing?.shape?.type === "polygon") {
      state.drawing.previewPoint = { x: point.x, y: point.y };
      renderVectorSvg();
      return;
    }

    if (state.vector.tool === "rect" || state.vector.tool === "ellipse") {
      const shape = getSelectedShape();
      if (!shape) return;
      const start = state.drag?.origin || point;
      const box = getConstrainedBox(start, point, event.shiftKey);
      shape.x = box.x;
      shape.y = box.y;
      shape.w = box.w;
      shape.h = box.h;
      renderVectorSvg();
      return;
    }
  }

  function onSvgPointerUp(event) {
    if (state.drag) {
      updateVectorStorage();
    }

    if (state.drawing?.mode === "resize") {
      state.drawing = null;
      state.vector.tool = "select";
      syncToolButtons();
      updateVectorStorage();
      renderVector();
      return;
    }

    if (state.drawing?.mode === "line") {
      state.drawing = null;
      state.vector.tool = "select";
      syncToolButtons();
      updateVectorStorage();
      renderVector();
      return;
    }

    if (state.drawing?.shape?.type === "polygon" && event.detail === 2) {
      finalizePolygon();
    }

    finishDrag();
    renderShapeInspector();
    renderCenterInspector();
    renderLayerList();
  }

  function finalizePolygon() {
    if (!state.drawing?.shape) return;
    if ((state.drawing.shape.points || []).length < 3) {
      state.drawing = null;
      renderVectorSvg();
      return;
    }
    state.vector.shapes.push(state.drawing.shape);
    state.vector.selectedShapeId = state.drawing.shape.id;
    state.drawing = null;
    state.vector.tool = "select";
    syncToolButtons();
    updateVectorStorage();
    renderVector();
  }

  function onSvgDoubleClick(event) {
    if (state.vector.tool === "polygon") {
      event.preventDefault();
      finalizePolygon();
    }
  }

  function drawVectorScene(ctx, width, height, options = {}) {
    const { partMode = null } = options;

    return (async () => {
      if (state.vector.image) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = state.vector.image;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        ctx.drawImage(img, 0, 0, width, height);
      }

      state.vector.shapes.forEach((shape) => {
        if (!isShapeVisible(shape)) return;
        if (partMode === "turret" && !(state.vector.hasTurret !== false && shape.part === "turret")) return;
        if (partMode === "hull" && shape.part === "turret") return;
        if (partMode === "all" && state.vector.hasTurret === false && shape.part === "turret") return;
        ctx.save();
        ctx.lineWidth = getShapeStrokeWidth(shape);
        ctx.strokeStyle = getShapeStroke(shape);
        ctx.fillStyle = getShapeFill(shape);

        if (shape.type === "rect") {
          const radius = Math.max(0, Number(shape.cornerRadius || 0));
          ctx.beginPath();
          if (radius > 0 && ctx.roundRect) {
            ctx.roundRect(shape.x, shape.y, shape.w, shape.h, radius);
          } else {
            ctx.rect(shape.x, shape.y, shape.w, shape.h);
          }
          if (shapeHasFill(shape)) {
            ctx.fill();
          }
          if (shapeHasStroke(shape)) {
            ctx.stroke();
          }
        } else if (shape.type === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.max(1, shape.w / 2), Math.max(1, shape.h / 2), 0, 0, Math.PI * 2);
          if (shapeHasFill(shape)) {
            ctx.fill();
          }
          if (shapeHasStroke(shape)) {
            ctx.stroke();
          }
        } else if (shape.type === "line") {
          if (shapeHasStroke(shape)) {
            ctx.beginPath();
            ctx.lineCap = shape.lineCap || "butt";
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
          }
        } else {
          const pts = shape.points || [];
          if (pts.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i += 1) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();
            if (shapeHasFill(shape)) {
              ctx.fill();
            }
            if (shapeHasStroke(shape)) {
              ctx.stroke();
            }
          }
        }

        ctx.restore();
      });
    })();
  }

  function colorFromPixel(r, g, b, a) {
    if (a === 0) {
      return "#000000";
    }
    return rgbaToHex(r, g, b);
  }

  async function sampleSceneColorAtPoint(point) {
    const { width, height } = currentVectorImageSize();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Canvas unavailable");
    }

    await drawVectorScene(ctx, width, height, { partMode: "all" });
    const x = clamp(Math.round(point.x), 0, width - 1);
    const y = clamp(Math.round(point.y), 0, height - 1);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return colorFromPixel(pixel[0], pixel[1], pixel[2], pixel[3]);
  }

  function applyPickedColor(color) {
    const target = state.colorPickTarget;
    state.colorPickTarget = null;
    if (!target) {
      return;
    }

    const shape = findShapeById(target.shapeId) || getSelectedShape();
    if (!shape) {
      return;
    }

    const normalized = normalizeColor(color, "#58A6FF");
    if (target.key === "fill") {
      shape.fill = normalized;
    } else if (target.key === "stroke") {
      shape.stroke = normalized;
    }
    updateVectorStorage();
    renderVector();
    setStatus(`Цвет выбран: ${normalized}`);
  }

  function getVectorBaseName() {
    return (state.vector.imageName || "vector").replace(/\.[^.]+$/, "") || "vector";
  }

  function exportShapeMatchesPart(shape, partMode) {
    const visible = isShapeVisible(shape);
    if (!visible) {
      return false;
    }

    if (partMode === "turret") {
      return state.vector.hasTurret !== false && shape.part === "turret";
    }

    if (partMode === "hull") {
      return shape.part !== "turret";
    }

    return state.vector.hasTurret !== false ? true : shape.part !== "turret";
  }

  async function downloadVectorPart(partMode, suffix) {
    const { width, height } = currentVectorImageSize();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await drawVectorScene(ctx, width, height, { partMode });
    const link = document.createElement("a");
    link.download = `${getVectorBaseName()}_${suffix}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportVectorPng() {
    await downloadVectorPart("all", "tank");
    await new Promise((resolve) => setTimeout(resolve, 60));
    await downloadVectorPart("hull", "korpus");
    if (state.vector.hasTurret !== false) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      await downloadVectorPart("turret", "bashnya");
    }
  }

  function saveVectorJson() {
    const payload = JSON.stringify(state.vector, null, 2);
    downloadText(`${state.vector.imageName || "vector"}.json`, payload, "application/json");
  }

  function loadVectorJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        state.vector = {
          ...defaultVectorProject(),
          ...parsed
        };
        updateVectorStorage();
        renderVector();
      } catch (error) {
        alert("Не удалось разобрать JSON проекта.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function setImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        state.vector.image = String(reader.result || "");
        state.vector.imageName = file.name || "image.png";
        state.vector.imageWidth = image.naturalWidth || 1200;
        state.vector.imageHeight = image.naturalHeight || 800;
        updateVectorStorage();
        renderVector();
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function clearVectorProject() {
    state.vector = defaultVectorProject();
    updateVectorStorage();
    renderVector();
  }

  function decodeCsvBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    const utf8Text = new TextDecoder("utf-8").decode(bytes);
    const cp1251Text = new TextDecoder("windows-1251").decode(bytes);
    const utf8Score = (utf8Text.match(/[�]/g) || []).length;
    const cp1251Score = (cp1251Text.match(/[�]/g) || []).length;
    return cp1251Score < utf8Score ? cp1251Text : utf8Text;
  }

  async function loadCsvAuto() {
    const sources = ["./data.csv", "./data.scv"];
    for (const source of sources) {
      try {
        const response = await fetch(source, { cache: "no-store" });
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        applyCsvText(decodeCsvBuffer(buffer), source);
        return;
      } catch (error) {
        // try next source
      }
    }

    state.csv.loadError = "Не удалось загрузить data.csv или data.scv.";
    renderCsv();
  }

  function applyCsvText(text, sourceName = "data.csv") {
    const parsed = parseCsv(String(text || "").trim());
    const normalized = normalizeRows(parsed);
    state.csv.rows = normalized.rows;
    state.csv.widths = normalized.widths;
    state.csv.sourceName = sourceName;
    state.csv.loadError = "";
    state.csv.dirty = false;
    state.tankNames = state.csv.rows.map((row) => getRowValue(row, csvColumns.name)).filter(Boolean);
    state.nations = [...new Set(state.csv.rows.map((row) => getRowValue(row, csvColumns.nation)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
    state.shellTypes = [...new Set([
      "ББ",
      "ПБ",
      "КС",
      "ОФ",
      "ОГОНЬ",
      "FIRE",
      "ПТУР",
      "ATGM",
      ...state.csv.rows.flatMap((row) => [getRowValue(row, csvColumns.shell1Type), getRowValue(row, csvColumns.shell2Type), getRowValue(row, csvColumns.shell3Type)])
    ])].filter(Boolean);
    state.csv.rows.forEach((row) => {
      setCsvCell(row, csvColumns.penChance, computePenChance(getRowValue(row, csvColumns.armor)));
    });
    populateDatalists();
    state.csv.filteredIndexes = state.csv.rows.map((_, index) => index);
    state.csv.selectedIndex = 0;
    renderCsv();
  }

  function populateDatalists() {
    dom.nationList.textContent = "";
    state.nations.forEach((nation) => {
      const option = document.createElement("option");
      option.value = nation;
      dom.nationList.append(option);
    });

    dom.tankNameList.textContent = "";
    state.tankNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      dom.tankNameList.append(option);
    });
  }

  function getCsvFilteredIndexes() {
    const query = state.csv.search.trim().toLowerCase();
    if (!query) {
      return state.csv.rows.map((_, index) => index);
    }

    return state.csv.rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        const haystack = [
          getRowValue(row, csvColumns.name),
          getRowValue(row, csvColumns.nation),
          getRowValue(row, csvColumns.className)
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .map(({ index }) => index);
  }

  function renderCsvList() {
    const list = dom.tankRowList;
    list.textContent = "";
    state.csv.filteredIndexes = getCsvFilteredIndexes();
    if (state.csv.filteredIndexes.length) {
      state.csv.selectedIndex = clamp(state.csv.selectedIndex, 0, state.csv.filteredIndexes.length - 1);
    } else {
      state.csv.selectedIndex = 0;
    }

    if (!state.csv.rows.length) {
      list.append(createEl("div", "inspectorEmpty", state.csv.loadError || "CSV еще не загружен."));
      dom.csvMeta.textContent = "0 строк";
      return;
    }

    dom.csvMeta.textContent = `${state.csv.rows.length} строк | ${state.csv.sourceName}${state.csv.dirty ? " | есть изменения" : ""}`;

    state.csv.filteredIndexes.forEach((rowIndex, filteredIndex) => {
      const row = state.csv.rows[rowIndex];
      const item = createEl("div", `tankRowItem ${filteredIndex === state.csv.selectedIndex ? "selected" : ""}`);
      const top = createEl("div", "tankRowTop");
      const titleWrap = document.createElement("div");
      const title = createEl("div", "", getRowValue(row, csvColumns.name) || `Строка ${rowIndex + 1}`);
      const meta = createEl("div", "tankRowMeta", `${getRowValue(row, csvColumns.nation)} | ${getRowValue(row, csvColumns.className)} | kind ${getRowValue(row, csvColumns.kind)}`);
      const openButton = createEl("button", "miniButton", "Открыть");

      titleWrap.append(title, meta);
      top.append(titleWrap, openButton);
      item.append(top);
      openButton.addEventListener("click", () => {
        state.csv.selectedIndex = filteredIndex;
        renderCsv();
      });
      item.addEventListener("click", (event) => {
        if (event.target === openButton) return;
        state.csv.selectedIndex = filteredIndex;
        renderCsv();
      });
      list.append(item);
    });
  }

  function numericField(label, value, onInput, hint = "") {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel");
    head.append(createEl("span", "", label), createEl("span", "formulaValue", hint));
    const input = document.createElement("input");
    input.className = "fieldInput";
    input.type = "text";
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(head, input);
    return field;
  }

  function selectField(label, options, value, onChange) {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel", label);
    const select = document.createElement("select");
    select.className = "fieldSelect";
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      if (String(item.value) === String(value)) option.selected = true;
      select.append(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    field.append(head, select);
    return field;
  }

  function inputListField(label, value, listId, onInput, hint = "") {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel");
    head.append(createEl("span", "", label), createEl("span", "formulaValue", hint));
    const input = document.createElement("input");
    input.className = "fieldInput";
    input.type = "text";
    input.setAttribute("list", listId);
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(head, input);
    return field;
  }

  function shellTypeField(label, value, onChange) {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel", label);
    const select = document.createElement("select");
    select.className = "fieldSelect";
    const options = [...state.shellTypes];
    if (value && !options.includes(value)) {
      options.unshift(value);
    }
    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      if (String(item) === String(value)) option.selected = true;
      select.append(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    field.append(head, select);
    return field;
  }

  function formulaField(label, value, hint = "") {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel");
    head.append(createEl("span", "", label), createEl("span", "formulaValue", hint));
    const input = document.createElement("input");
    input.className = "fieldInput";
    input.type = "text";
    input.readOnly = true;
    input.value = value;
    field.append(head, input);
    return { field, input };
  }

  function computePenChance(armorValue) {
    const armor = toNumber(armorValue);
    if (!(armor > 0)) {
      return "";
    }

    return String(Math.max(2, Math.round(300 / armor)));
  }

  function checkboxField(label, checked, onChange) {
    const field = createEl("label", "csvField");
    const head = createEl("div", "fieldLabel", label);
    const button = createEl("button", `toggleButton ${checked ? "active" : ""}`, checked ? "Да" : "Нет");
    button.type = "button";
    button.addEventListener("click", () => {
      checked = !checked;
      button.textContent = checked ? "Да" : "Нет";
      button.classList.toggle("active", checked);
      onChange(checked);
    });
    field.append(head, button);
    return field;
  }

  function updateCsvRow(rowIndex, updater) {
    const row = state.csv.rows[rowIndex];
    if (!row) return;
    updater(row);
    state.csv.dirty = true;
    state.tankNames = state.csv.rows.map((item) => getRowValue(item, csvColumns.name)).filter(Boolean);
    state.nations = [...new Set(state.csv.rows.map((item) => getRowValue(item, csvColumns.nation)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
    populateDatalists();
    updateImageStatus();
  }

  function addCsvRow() {
    const newRowIndex = state.csv.rows.length;
    const sourceRow = state.csv.rows[0] || createBlankCsvRow();
    const newRow = copyRows([sourceRow])[0] || createBlankCsvRow();

    newRow[csvColumns.name] = getUniqueCsvTankName();
    if (!newRow[csvColumns.level]) newRow[csvColumns.level] = "1";
    if (!newRow[csvColumns.kind]) newRow[csvColumns.kind] = "1";

    state.csv.rows.push(newRow);
    state.csv.search = "";
    if (dom.csvSearch) {
      dom.csvSearch.value = "";
    }
    state.csv.filteredIndexes = state.csv.rows.map((_, index) => index);
    state.csv.selectedIndex = newRowIndex;
    state.csv.dirty = true;
    state.tankNames = state.csv.rows.map((item) => getRowValue(item, csvColumns.name)).filter(Boolean);
    state.nations = [...new Set(state.csv.rows.map((item) => getRowValue(item, csvColumns.nation)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
    populateDatalists();
    renderCsv();
    setStatus(`Добавлен новый танк | ${state.csv.rows.length} строк`);
  }

  function setCsvCell(row, index, value) {
    setRowValue(row, index, value);
  }

  function renderCsvEditor() {
    const root = dom.csvEditor;
    root.textContent = "";
    if (!state.csv.filteredIndexes.length) {
      root.append(createEl("div", "editorEmpty", state.csv.loadError || "Нет подходящих строк."));
      return;
    }
    const rowIndex = state.csv.filteredIndexes[state.csv.selectedIndex] ?? 0;
    const row = state.csv.rows[rowIndex];

    if (!row) {
      root.append(createEl("div", "editorEmpty", state.csv.loadError || "Выберите танк."));
      return;
    }

    const main = createEl("div", "csvSection");
    const title = createEl("h3", "csvSectionTitle", "Основное");
    const grid = createEl("div", "csvFormGrid");

    grid.append(
      inputListField("Название", getRowValue(row, csvColumns.name), "tankNameList", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.name, value))),
      numericField("Уровень", getRowValue(row, csvColumns.level), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.level, value))),
      inputListField("Нация", getRowValue(row, csvColumns.nation), "nationList", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.nation, value))),
      selectField("Класс", [
        { value: "ТТ", label: "ТТ" },
        { value: "СТ", label: "СТ" },
        { value: "ПТ", label: "ПТ" },
        { value: "ЛТ", label: "ЛТ" },
        { value: "САУ", label: "САУ" },
        { value: "SPG", label: "SPG" },
        { value: "MT", label: "MT" }
      ], getRowValue(row, csvColumns.className), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.className, value))),
      selectField("Вид танка", [
        { value: "0", label: "0 - будущий" },
        { value: "1", label: "1 - обычный" },
        { value: "2", label: "2 - премиум/контейнер" },
        { value: "3", label: "3 - dev only" },
        { value: "4", label: "4 - collectible" }
      ], getRowValue(row, csvColumns.kind), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.kind, value))),
      inputListField("Исследование 1", getRowValue(row, csvColumns.research1), "tankNameList", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.research1, value))),
      inputListField("Исследование 2", getRowValue(row, csvColumns.research2), "tankNameList", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.research2, value))),
      inputListField("Исследование 3", getRowValue(row, csvColumns.research3), "tankNameList", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.research3, value)))
    );
    main.append(title, grid);

    const weapons = createEl("div", "csvSection");
    weapons.append(createEl("h3", "csvSectionTitle", "Снаряды"));
    const weaponGrid = createEl("div", "csvFormGrid three");
    weaponGrid.append(
      shellTypeField("Снаряд 1", getRowValue(row, csvColumns.shell1Type), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell1Type, value))),
      shellTypeField("Снаряд 2", getRowValue(row, csvColumns.shell2Type), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell2Type, value))),
      shellTypeField("Снаряд 3", getRowValue(row, csvColumns.shell3Type), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell3Type, value))),
      numericField("Урон 1", getRowValue(row, csvColumns.shell1Damage), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell1Damage, value))),
      numericField("Урон 2", getRowValue(row, csvColumns.shell2Damage), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell2Damage, value))),
      numericField("Урон 3", getRowValue(row, csvColumns.shell3Damage), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shell3Damage, value))),
      numericField("Пробитие 1", getRowValue(row, csvColumns.pen1), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.pen1, value))),
      numericField("Пробитие 2", getRowValue(row, csvColumns.pen2), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.pen2, value))),
      numericField("Пробитие 3", getRowValue(row, csvColumns.pen3), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.pen3, value)))
    );
    weapons.append(weaponGrid);

    const stats = createEl("div", "csvSection");
    stats.append(createEl("h3", "csvSectionTitle", "Характеристики"));
    const statsGrid = createEl("div", "csvFormGrid three");
    const turnDelay = getRowValue(row, csvColumns.hullTurnDelay);
    const moveDelay = getRowValue(row, csvColumns.movementDelay);
    const degPerSec = state.csvHelper.turnDegPerSec;
    const kmh = state.csvHelper.kmh;
    const computedTurn = degPerSec ? formatFixed(1 / Math.max(0.0001, toNumber(degPerSec)), 4) : "";
    const computedMove = kmh ? formatFixed(3600 / (2 * Math.max(0.0001, toNumber(kmh)) * 1000), 4) : "";
    const computedPenChance = computePenChance(getRowValue(row, csvColumns.armor));
    const penChanceField = formulaField("Шанс пробития", computedPenChance, "300 / броня, минимум 2");

    statsGrid.append(
      numericField("HP", getRowValue(row, csvColumns.health), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.health, value))),
      numericField("Перезарядка", getRowValue(row, csvColumns.reloadTime), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.reloadTime, value))),
      numericField("Задержка поворота", turnDelay, (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.hullTurnDelay, value)), "R"),
      numericField("Задержка движения", moveDelay, (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.movementDelay, value)), "S"),
      numericField("Броня", getRowValue(row, csvColumns.armor), (value) => {
        updateCsvRow(rowIndex, (current) => {
          setCsvCell(current, csvColumns.armor, value);
          const derived = computePenChance(value);
          setCsvCell(current, csvColumns.penChance, derived);
        });
        penChanceField.input.value = computePenChance(value);
      }),
      penChanceField.field,
      selectField("Тип орудия", [
        { value: "1", label: "1 - цикличное" },
        { value: "2", label: "2 - барабан" },
        { value: "3", label: "3 - барабан с дозарядкой" },
        { value: "4", label: "4 - ПТУР" },
        { value: "5", label: "5 - огнемёт" },
        { value: "6", label: "6 - арта" }
      ], getRowValue(row, csvColumns.gunType), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.gunType, value))),
      numericField("Снарядов за выстрел", getRowValue(row, csvColumns.shellsPerShot), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.shellsPerShot, value))),
      numericField("Размер магазина", getRowValue(row, csvColumns.clipSize), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.clipSize, value))),
      numericField("Разброс", getRowValue(row, csvColumns.spread), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.spread, value))),
      numericField("Угол склонения", getRowValue(row, csvColumns.gunDepression), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.gunDepression, value))),
      numericField("Угол возвышения", getRowValue(row, csvColumns.gunElevation), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.gunElevation, value)))
    );
    stats.append(statsGrid);

    const helper = createEl("div", "csvSection");
    helper.append(createEl("h3", "csvSectionTitle", "Формулы"));
    const helperGrid = createEl("div", "csvFormGrid");
    const turnHelper = numericField("Градусов в секунду", state.csvHelper.turnDegPerSec, (value) => {
      state.csvHelper.turnDegPerSec = value;
      const computed = value ? formatFixed(1 / Math.max(0.0001, toNumber(value)), 4) : "";
      if (computed) {
        updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.hullTurnDelay, computed));
      }
    }, computedTurn ? `-> ${computedTurn}` : "");
    const speedHelper = numericField("Км/ч", state.csvHelper.kmh, (value) => {
      state.csvHelper.kmh = value;
      const computed = value ? formatFixed(3600 / (2 * Math.max(0.0001, toNumber(value)) * 1000), 4) : "";
      if (computed) {
        updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.movementDelay, computed));
      }
    }, computedMove ? `-> ${computedMove}` : "");

    helperGrid.append(turnHelper, speedHelper);
    helper.append(helperGrid);

    const notes = createEl("div", "csvSection");
    notes.append(createEl("h3", "csvSectionTitle", "Прочее"));
    const notesGrid = createEl("div", "csvFormGrid full");
    notesGrid.append(
      inputListField("Доп. особенности", getRowValue(row, csvColumns.uniqueFeatures), "", (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.uniqueFeatures, value))),
      numericField("Цена опыта", getRowValue(row, csvColumns.expPrice), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.expPrice, value))),
      numericField("Цена серебра", getRowValue(row, csvColumns.silverPrice), (value) => updateCsvRow(rowIndex, (current) => setCsvCell(current, csvColumns.silverPrice, value)))
    );
    notes.append(notesGrid);

    const actions = createEl("div", "csvActions");
    const addButton = createEl("button", "actionButton", "Новый танк");
    const duplicateButton = createEl("button", "actionButton", "Дублировать строку");
    const resetButton = createEl("button", "actionButton danger", "Сбросить редактирование");
    const rowInfo = createEl("div", "statusPill", `Строка ${rowIndex + 1} | ${state.csv.sourceName}`);

    addButton.addEventListener("click", addCsvRow);
    duplicateButton.addEventListener("click", () => {
      const copy = copyRows([row])[0];
      copy[csvColumns.name] = `${getRowValue(row, csvColumns.name)} Copy`;
      state.csv.rows.splice(rowIndex + 1, 0, copy);
      state.csv.selectedIndex = Math.min(state.csv.filteredIndexes.length, state.csv.selectedIndex + 1);
      state.csv.dirty = true;
      populateDatalists();
      renderCsv();
    });

    resetButton.addEventListener("click", () => {
      loadCsvAuto();
    });

    actions.append(addButton, duplicateButton, resetButton, rowInfo);

    root.append(main, weapons, stats, helper, notes, actions);
  }

  function renderCsv() {
    renderCsvList();
    renderCsvEditor();
    updateImageStatus();
  }

  async function exportCsv() {
    const csv = stringifyCsv(state.csv.rows);
    const content = `\uFEFF${csv}`;
    const suggestedName = /\.csv$/i.test(state.csv.sourceName || "")
      ? state.csv.sourceName
      : "data.csv";

    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: "CSV-файл",
            accept: { "text/csv": [".csv"] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        setStatus(`CSV сохранён | ${state.csv.rows.length} строк`);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.warn("Не удалось открыть диалог сохранения CSV:", error);
      }
    }

    downloadText(suggestedName, content, "text/csv;charset=utf-8");
    setStatus(`CSV подготовлен к скачиванию | ${state.csv.rows.length} строк`);
  }

  async function copyCsvToClipboard() {
    const csv = stringifyCsv(state.csv.rows);
    await navigator.clipboard.writeText(csv);
    setStatus(`CSV скопирован | ${state.csv.rows.length} строк`);
  }

  function importCsvFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      applyCsvText(decodeCsvBuffer(reader.result || new ArrayBuffer(0)), file.name || "data.csv");
    };
    reader.readAsArrayBuffer(file);
  }

  function attachEvents() {
    dom.tabVector.addEventListener("click", () => {
      state.activeTab = "vector";
      renderTabs();
      setStatus("Открыт векторный редактор");
    });
    dom.tabCsv.addEventListener("click", () => {
      state.activeTab = "csv";
      renderTabs();
      setStatus("Открыт редактор CSV");
    });

    document.querySelectorAll(".toolButton").forEach((button) => {
      button.addEventListener("click", () => {
        state.vector.tool = button.dataset.tool;
        syncToolButtons();
      });
    });

    document.querySelectorAll(".chipButton[data-part-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.vector.partFilter = button.dataset.partFilter;
        renderVector();
      });
    });

    dom.importImageBtn.addEventListener("click", () => dom.imageInput.click());
    dom.loadProjectBtn.addEventListener("click", () => dom.projectInput.click());
    dom.saveProjectBtn.addEventListener("click", saveVectorJson);
    dom.exportPngBtn.addEventListener("click", exportVectorPng);
    dom.clearVectorBtn.addEventListener("click", clearVectorProject);
    dom.hasTurretBtn.addEventListener("click", () => {
      state.vector.hasTurret = state.vector.hasTurret === false;
      if (state.vector.hasTurret === false) {
        state.vector.centerVisibility.turret = false;
      }
      updateVectorStorage();
      renderVector();
    });
    dom.showTankCenterBtn.addEventListener("click", () => {
      if (!state.vector.centerVisibility) {
        state.vector.centerVisibility = { tank: true, hull: true, turret: true };
      }
      state.vector.centerVisibility.tank = !state.vector.centerVisibility.tank;
      updateVectorStorage();
      renderVector();
    });
    dom.showHullCenterBtn.addEventListener("click", () => {
      if (!state.vector.centerVisibility) {
        state.vector.centerVisibility = { tank: true, hull: true, turret: true };
      }
      state.vector.centerVisibility.hull = !state.vector.centerVisibility.hull;
      updateVectorStorage();
      renderVector();
    });
    dom.showTurretCenterBtn.addEventListener("click", () => {
      if (state.vector.hasTurret === false) {
        return;
      }
      if (!state.vector.centerVisibility) {
        state.vector.centerVisibility = { tank: true, hull: true, turret: true };
      }
      state.vector.centerVisibility.turret = !state.vector.centerVisibility.turret;
      updateVectorStorage();
      renderVector();
    });
    dom.imageInput.addEventListener("change", () => {
      const file = dom.imageInput.files?.[0];
      if (file) setImageFromFile(file);
      dom.imageInput.value = "";
    });
    dom.projectInput.addEventListener("change", () => {
      const file = dom.projectInput.files?.[0];
      if (file) loadVectorJsonFile(file);
      dom.projectInput.value = "";
    });

    dom.stageWrap.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    dom.stageWrap.addEventListener("drop", (event) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      if (file.type.startsWith("image/")) {
        setImageFromFile(file);
        return;
      }
      if (file.name.toLowerCase().endsWith(".json")) {
        loadVectorJsonFile(file);
      }
    });

    dom.vectorSvg.addEventListener("pointerdown", onSvgPointerDown);
    dom.vectorSvg.addEventListener("pointermove", onSvgPointerMove);
    dom.vectorSvg.addEventListener("pointerup", onSvgPointerUp);
    dom.vectorSvg.addEventListener("pointercancel", finishDrag);
    dom.vectorSvg.addEventListener("dblclick", onSvgDoubleClick);

    dom.vectorSvg.addEventListener("pointermove", (event) => {
      if (state.drawing?.shape?.type === "polygon") {
        const point = pointerToImagePoint(event);
        state.drawing.previewPoint = point;
        renderVectorSvg();
      }
    });

    dom.reloadCsvBtn.addEventListener("click", loadCsvAuto);
    dom.importCsvBtn.addEventListener("click", () => dom.csvInput.click());
    dom.addCsvRowBtn.addEventListener("click", addCsvRow);
    dom.downloadCsvBtn.addEventListener("click", exportCsv);
    dom.copyCsvBtn.addEventListener("click", () => {
      copyCsvToClipboard().catch(() => alert("Не удалось скопировать CSV."));
    });
    dom.csvInput.addEventListener("change", () => {
      const file = dom.csvInput.files?.[0];
      if (file) importCsvFile(file);
      dom.csvInput.value = "";
    });
    dom.csvSearch.addEventListener("input", () => {
      state.csv.search = dom.csvSearch.value;
      renderCsvList();
      renderCsvEditor();
    });

    window.addEventListener("resize", () => {
      renderVectorSvg();
    });

    window.addEventListener("keydown", (event) => {
      if (state.activeTab !== "vector") return;
      if (event.key === "Enter" && state.drawing?.shape?.type === "polygon") {
        event.preventDefault();
        finalizePolygon();
      }
      if (event.key === "Escape") {
        state.drawing = null;
        state.drag = null;
        renderVectorSvg();
      }
    });
  }

  function initDom() {
    dom.statusText = $("#statusText");
    dom.tabVector = $("#tabVector");
    dom.tabCsv = $("#tabCsv");
    dom.vectorView = $("#vectorView");
    dom.csvView = $("#csvView");
    dom.importImageBtn = $("#importImageBtn");
    dom.loadProjectBtn = $("#loadProjectBtn");
    dom.saveProjectBtn = $("#saveProjectBtn");
    dom.exportPngBtn = $("#exportPngBtn");
    dom.clearVectorBtn = $("#clearVectorBtn");
    dom.imageInput = $("#imageInput");
    dom.projectInput = $("#projectInput");
    dom.vectorImage = $("#vectorImage");
    dom.vectorSvg = $("#vectorSvg");
    dom.stageWrap = $("#stageWrap");
    dom.stageHint = $("#stageHint");
    dom.layerList = $("#layerList");
    dom.shapeInspector = $("#shapeInspector");
    dom.centerInspector = $("#centerInspector");
    dom.showTankCenterBtn = $("#showTankCenterBtn");
    dom.showHullCenterBtn = $("#showHullCenterBtn");
    dom.showTurretCenterBtn = $("#showTurretCenterBtn");
    dom.hasTurretBtn = $("#hasTurretBtn");
    dom.reloadCsvBtn = $("#reloadCsvBtn");
    dom.importCsvBtn = $("#importCsvBtn");
    dom.addCsvRowBtn = $("#addCsvRowBtn");
    dom.downloadCsvBtn = $("#downloadCsvBtn");
    dom.copyCsvBtn = $("#copyCsvBtn");
    dom.csvInput = $("#csvInput");
    dom.csvSearch = $("#csvSearch");
    dom.csvMeta = $("#csvMeta");
    dom.tankRowList = $("#tankRowList");
    dom.csvEditor = $("#csvEditor");
    dom.nationList = $("#nationList");
    dom.tankNameList = $("#tankNameList");
  }

  async function init() {
    initDom();
    attachEvents();
    renderTabs();
    renderVector();
    updateImageStatus();
    await loadCsvAuto();
    setStatus("Готово");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
