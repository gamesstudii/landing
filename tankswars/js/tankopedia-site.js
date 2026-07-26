const elements = {
  list: document.querySelector("#tankList"),
  details: document.querySelector("#tankDetails"),
  search: document.querySelector("#searchInput"),
  nation: document.querySelector("#nationFilter"),
  level: document.querySelector("#levelFilter"),
  className: document.querySelector("#classFilter"),
  status: document.querySelector("#statusFilter"),
  visibleCount: document.querySelector("#visibleCount"),
  totalCount: document.querySelector("#totalCount")
};

const state = {
  tanks: [],
  filtered: [],
  selectedId: 0
};

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && nextChar === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function countReplacementCharacters(value) {
  return (value.match(/\uFFFD/g) || []).length;
}

function decodeCsvBuffer(buffer) {
  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  const windows1251Text = new TextDecoder("windows-1251").decode(buffer);

  return countReplacementCharacters(utf8Text) <= countReplacementCharacters(windows1251Text)
    ? utf8Text
    : windows1251Text;
}

function toNumber(value) {
  const number = Number.parseFloat(String(value || "").replace(",", "."));

  return Number.isFinite(number) ? number : 0;
}

function toInt(value) {
  const number = Number.parseInt(value, 10);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function formatNumber(value, decimals = null) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  if (decimals !== null) {
    return number.toFixed(decimals).replace(/\.?0+$/, "");
  }

  return String(Math.round(number));
}

function toRoman(value) {
  const levels = {
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X"
  };

  return levels[toInt(value)] || "-";
}

function formatNationFileName(nation) {
  const normalizedNation = normalizeText(nation);
  const nationFiles = {
    "ссср": "sssr",
    "великобритания": "uk",
    "англия": "uk",
    "польша": "poland",
    "германия": "germany",
    "сша": "usa",
    "франция": "france",
    "китай": "china",
    "япония": "japan",
    "чехословакия": "czechoslovakia",
    "чехия": "czech",
    "швеция": "sweden",
    "италия": "italy",
    "мировая нация": "mirovayanacia",
    "мироваянация": "mirovayanacia",
    "швейцария": "Switzerland",
    "switzerland": "Switzerland"
  };

  return nationFiles[normalizedNation] || normalizedNation.replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

function getTankStatus(tank) {
  if (tank.statusFlag === 2) {
    return "premium";
  }

  if (tank.statusFlag === 3) {
    return "developer";
  }

  if (tank.statusFlag === 4) {
    return "collectible";
  }

  return "regular";
}

function getTankStatusLabel(tank) {
  const labels = {
    regular: "Обычный",
    premium: "Премиум",
    developer: "Разработчик",
    collectible: "Коллекционный"
  };

  return labels[getTankStatus(tank)] || "Обычный";
}

function getRoleInfo(tank) {
  const roles = {
    "ЛТ": ["Разведка", "Светить цели, быстро менять позицию и добирать поврежденных противников."],
    "КТ": ["Рейдер", "Быстро менять фланги, светить и добивать."],
    "БТР": ["Мобильная разведка", "Работать по флангам, держать темп и поддерживать союзников."],
    "СТ": ["Универсал", "Поддерживать тяжелых, наносить урон и брать базу."],
    "ТТ": ["Прорыв", "Давить направление, танковать урон и открывать проход."],
    "ПТ": ["Засада", "Держать дистанцию, наносить урон и сбивать прорыв."],
    "ПТ-САУ": ["Засада", "Держать дистанцию, наносить урон и сбивать прорыв."],
    "САУ": ["Артиллерия", "Поражать цели с карты и помогать по засвету."]
  };

  const role = roles[tank.className] || ["Боевая роль", "Наносить урон и помогать команде."];

  return { title: role[0], text: role[1] };
}

function getMoveSpeed(tank) {
  const movementDelay = toNumber(tank.movementDelay);
  const baseSpeed = movementDelay > 0 ? 7 / movementDelay : 210;
  const wheeled = tank.className === "КТ" || tank.className === "БТР";
  const speed = wheeled
    ? Math.max(120, Math.min(360, baseSpeed * (tank.className === "БТР" ? 1.18 : 1.08)))
    : Math.max(90, Math.min(280, baseSpeed));

  return speed;
}

function getTurnSpeed(tank) {
  const delay = toNumber(tank.hullTurnDelay);
  const degreesPerSecond = delay > 0 ? 1 / delay : 183;

  return Math.max(43, Math.min(241, degreesPerSecond));
}

function getViewRange(tank) {
  const values = {
    "ЛТ": 680,
    "КТ": 690,
    "БТР": 720,
    "СТ": 620,
    "ТТ": 560,
    "ПТ": 585,
    "ПТ-САУ": 585,
    "САУ": 520
  };

  return values[tank.className] || 590;
}

function getCamouflage(tank) {
  const values = {
    "САУ": 62,
    "ЛТ": 68,
    "КТ": 72,
    "БТР": 64,
    "СТ": 100,
    "ПТ": 124,
    "ПТ-САУ": 124,
    "ТТ": 138
  };

  return values[tank.className] || 100;
}

function parseTanks(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const cells = parseCsvLine(line);
      const name = (cells[0] || "").replace(/^\uFEFF/, "");
      const statusFlagRaw = (cells[28] || "").trim();
      const statusFlag = statusFlagRaw === "" ? 1 : toInt(statusFlagRaw);

      return {
        id: index + 1,
        name,
        shells: [
          { type: cells[1] || "-", damage: toInt(cells[4]), penetration: toInt(cells[19]) },
          { type: cells[2] || "-", damage: toInt(cells[5]), penetration: toInt(cells[20]) },
          { type: cells[3] || "-", damage: toInt(cells[6]), penetration: toInt(cells[21]) }
        ].filter((shell) => shell.type !== "-" || shell.damage > 0 || shell.penetration > 0),
        level: toInt(cells[7]),
        nation: cells[8] || "-",
        researchTargets: [cells[9], cells[10], cells[11]].filter(Boolean),
        researchExperiencePrice: toInt(cells[12]),
        researchSilverPrice: toInt(cells[13]),
        className: String(cells[14] || "-").trim().toUpperCase(),
        health: toInt(cells[15]),
        reloadTime: toNumber(cells[16]),
        hullTurnDelay: toNumber(cells[17]),
        movementDelay: toNumber(cells[18]),
        averageArmor: toInt(cells[22]),
        penetrationChance: toInt(cells[23]),
        gunType: toInt(cells[24]) || 1,
        shellsPerShot: toInt(cells[25]) || 1,
        clipSize: toInt(cells[26]),
        gunSpreadDegrees: toNumber(cells[27]),
        statusFlag,
        uniqueFeatures: cells[29] || ""
      };
    })
    .filter((tank) => tank.name && tank.statusFlag !== 0);
}

function compareTanks(first, second) {
  return second.level - first.level
    || first.nation.localeCompare(second.nation, "ru")
    || first.className.localeCompare(second.className, "ru")
    || first.id - second.id;
}

function setImageFallback(image, paths) {
  let index = 0;

  function applyNextPath() {
    if (index >= paths.length) {
      image.removeAttribute("src");
      image.classList.add("imageMissing");
      return;
    }

    image.src = paths[index];
    index += 1;
  }

  image.onerror = applyNextPath;
  applyNextPath();
}

function setTankImage(image, tankName) {
  setImageFallback(image, [
    `./img/tanki/${tankName}.png`,
    `./img/танки/${tankName}.png`,
    `./img/korpus/${tankName}.png`
  ]);
}

function createOption(value, label) {
  const option = document.createElement("option");

  option.value = value;
  option.textContent = label;
  return option;
}

function fillSelect(select, values, formatter = (value) => value) {
  select.textContent = "";
  select.append(createOption("all", "Все"));
  values.forEach((value) => select.append(createOption(value, formatter(value))));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((first, second) => String(first).localeCompare(String(second), "ru", { numeric: true }));
}

function renderFilters() {
  fillSelect(elements.nation, uniqueSorted(state.tanks.map((tank) => tank.nation)));
  fillSelect(elements.level, uniqueSorted(state.tanks.map((tank) => String(tank.level))), toRoman);
  fillSelect(elements.className, uniqueSorted(state.tanks.map((tank) => tank.className)));
}

function getFilteredTanks() {
  const query = normalizeText(elements.search.value);
  const nation = elements.nation.value;
  const level = elements.level.value;
  const className = elements.className.value;
  const status = elements.status.value;

  return state.tanks.filter((tank) => {
    const searchMatches = !query
      || normalizeText(tank.name).includes(query)
      || normalizeText(tank.nation).includes(query)
      || normalizeText(tank.className).includes(query);

    return searchMatches
      && (nation === "all" || tank.nation === nation)
      && (level === "all" || String(tank.level) === level)
      && (className === "all" || tank.className === className)
      && (status === "all" || getTankStatus(tank) === status);
  });
}

function createTankCard(tank, selected) {
  const button = document.createElement("button");
  const image = document.createElement("img");
  const info = document.createElement("span");
  const name = document.createElement("span");
  const meta = document.createElement("span");
  const nationFile = formatNationFileName(tank.nation);

  button.type = "button";
  button.className = `tankCard ${selected ? "selected" : ""} ${getTankStatus(tank)}`.trim();
  button.dataset.tankId = String(tank.id);
  if (nationFile) {
    button.style.backgroundImage = `linear-gradient(90deg, rgba(0, 0, 0, 0.84), rgba(0, 0, 0, 0.48)), url("./img/flagi/${nationFile}.png")`;
  }

  image.className = "tankCardImage";
  image.alt = "";
  setTankImage(image, tank.name);

  info.className = "tankCardInfo";
  name.className = "tankCardName";
  meta.className = "tankCardMeta";
  name.textContent = tank.name;
  meta.textContent = `${toRoman(tank.level)} | ${tank.className} | ${tank.nation}`;
  info.append(name, meta);
  button.append(image, info);
  button.addEventListener("click", () => selectTank(tank.id));
  return button;
}

function selectTank(tankId) {
  const tank = state.filtered.find((item) => item.id === tankId);

  if (!tank) {
    return;
  }

  state.selectedId = tank.id;
  elements.list
    .querySelectorAll(".tankCard.selected")
    .forEach((card) => card.classList.remove("selected"));
  const activeCard = elements.list.querySelector(`[data-tank-id="${tank.id}"]`);

  if (activeCard) {
    activeCard.classList.add("selected");
  }

  renderDetails(tank);
  elements.details.scrollTop = 0;
}

function createStat(label, value) {
  const box = document.createElement("div");
  const title = document.createElement("div");
  const number = document.createElement("div");

  box.className = "statBox";
  title.className = "statLabel";
  number.className = "statValue";
  title.textContent = label;
  number.textContent = value;
  box.append(title, number);
  return box;
}

function createShell(shell, index) {
  const row = document.createElement("div");
  const type = document.createElement("div");
  const damage = document.createElement("div");
  const penetration = document.createElement("div");

  row.className = "shellRow";
  type.className = "shellType";
  damage.className = "shellValue";
  penetration.className = "shellValue";
  type.textContent = `${index + 1}. ${shell.type}`;
  damage.textContent = `Урон ${formatNumber(shell.damage)}`;
  penetration.textContent = `Пробитие ${formatNumber(shell.penetration)}`;
  row.append(type, damage, penetration);
  return row;
}

function renderDetails(tank) {
  const hero = document.createElement("div");
  const image = document.createElement("img");
  const text = document.createElement("div");
  const title = document.createElement("div");
  const meta = document.createElement("div");
  const role = document.createElement("div");
  const stats = document.createElement("div");
  const shellTitle = document.createElement("div");
  const shellList = document.createElement("div");
  const roleInfo = getRoleInfo(tank);
  const firstShell = tank.shells[0] || { damage: 0, penetration: 0 };

  elements.details.textContent = "";
  hero.className = "tankHero";
  image.className = "tankHeroImage";
  image.alt = "";
  setTankImage(image, tank.name);
  title.className = "tankTitle";
  meta.className = "tankMeta";
  role.className = "tankRole";
  title.textContent = tank.name;
  meta.textContent = `${toRoman(tank.level)} уровень | ${tank.className} | ${tank.nation} | ${getTankStatusLabel(tank)}`;
  role.textContent = `${roleInfo.title}: ${roleInfo.text}`;
  text.append(title, meta, role);
  hero.append(image, text);

  stats.className = "statsGrid";
  stats.append(
    createStat("Прочность", formatNumber(tank.health)),
    createStat("Урон", formatNumber(firstShell.damage)),
    createStat("Пробитие", formatNumber(firstShell.penetration)),
    createStat("Перезарядка", `${formatNumber(tank.reloadTime, 1)} с`),
    createStat("Скорость", `${formatNumber(getMoveSpeed(tank))} ед/с`),
    createStat("Поворот корпуса", `${formatNumber(getTurnSpeed(tank))} град/с`),
    createStat("Задержка движения", formatNumber(tank.movementDelay, 3)),
    createStat("Задержка поворота", formatNumber(tank.hullTurnDelay, 3)),
    createStat("Средняя броня", formatNumber(tank.averageArmor)),
    createStat("Шанс пробития", `${formatNumber(tank.penetrationChance)}%`),
    createStat("Тип орудия", formatNumber(tank.gunType)),
    createStat("Снарядов за выстрел", formatNumber(tank.shellsPerShot)),
    createStat("Магазин", tank.clipSize ? formatNumber(tank.clipSize) : "-"),
    createStat("Разброс", `${formatNumber(tank.gunSpreadDegrees, 2)} град`),
    createStat("Обзор", formatNumber(getViewRange(tank))),
    createStat("Маскировка", `${formatNumber(getCamouflage(tank))}%`),
    createStat("Опыт исследования", tank.researchExperiencePrice ? formatNumber(tank.researchExperiencePrice) : "-"),
    createStat("Цена покупки", tank.researchSilverPrice ? formatNumber(tank.researchSilverPrice) : "-"),
    createStat("Продолжение ветки", tank.researchTargets.length ? tank.researchTargets.join(", ") : "-"),
    createStat("Особенности", tank.uniqueFeatures || "-")
  );

  shellTitle.className = "sectionTitle";
  shellTitle.textContent = "Снаряды";
  shellList.className = "shellList";
  tank.shells.forEach((shell, index) => shellList.append(createShell(shell, index)));

  elements.details.append(hero, stats, shellTitle, shellList);
}

function renderList() {
  elements.list.textContent = "";
  state.filtered = getFilteredTanks();

  if (!state.filtered.length) {
    const empty = document.createElement("div");

    empty.className = "emptyState";
    empty.textContent = "Нет танков по выбранным фильтрам";
    elements.list.append(empty);
    elements.details.textContent = "";
    elements.visibleCount.textContent = "0";
    return;
  }

  if (!state.filtered.some((tank) => tank.id === state.selectedId)) {
    state.selectedId = state.filtered[0].id;
  }

  state.filtered.forEach((tank) => {
    elements.list.append(createTankCard(tank, tank.id === state.selectedId));
  });
  elements.visibleCount.textContent = String(state.filtered.length);
  renderDetails(state.filtered.find((tank) => tank.id === state.selectedId));
}

function render() {
  renderList();
}

function attachEvents() {
  [elements.search, elements.nation, elements.level, elements.className, elements.status].forEach((element) => {
    element.addEventListener("input", render);
    element.addEventListener("change", render);
  });
}

async function loadTanks() {
  elements.list.innerHTML = '<div class="loadingState">Загрузка data.csv</div>';
  const response = await fetch("./data.csv", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`CSV loading failed: ${response.status}`);
  }

  const csvText = decodeCsvBuffer(await response.arrayBuffer());
  state.tanks = parseTanks(csvText).sort(compareTanks);
  state.selectedId = state.tanks[0]?.id || 0;
  elements.totalCount.textContent = String(state.tanks.length);
  renderFilters();
  render();
}

attachEvents();
loadTanks().catch((error) => {
  console.error(error);
  elements.list.innerHTML = '<div class="emptyState">Не удалось загрузить data.csv</div>';
});
