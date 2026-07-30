import fs from "node:fs";

const INPUT = "data.csv";
const OUTPUT = "BALANCE_REPORT.md";

function parseRow(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value);
  return cells;
}

const num = (value) => Number.parseFloat(String(value || "").replace(",", ".")) || 0;
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const fmt = (value, digits = 0) => Number(value || 0).toFixed(digits).replace(".", ",");
const range = (value, tolerance = 0.15) =>
  `${fmt(value * (1 - tolerance))}–${fmt(value * (1 + tolerance))}`;

const rows = fs.readFileSync(INPUT, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)
  .filter((line) => line.trim())
  .map(parseRow);

const tanks = rows.map((cells, index) => ({
  row: index + 1,
  name: String(cells[0] || "").trim(),
  shellTypes: cells.slice(1, 4).map((value) => String(value || "").trim()),
  damages: cells.slice(4, 7).map(num),
  tier: num(cells[7]),
  nation: String(cells[8] || "").trim(),
  targets: cells.slice(9, 12).map((value) => String(value || "").trim()).filter(Boolean),
  researchXp: num(cells[12]),
  silverPrice: num(cells[13]),
  className: String(cells[14] || "").trim().toUpperCase(),
  hp: num(cells[15]),
  reload: num(cells[16]),
  turnDelay: num(cells[17]),
  moveDelay: num(cells[18]),
  penetrations: cells.slice(19, 22).map(num),
  armor: num(cells[22]),
  chance: num(cells[23]),
  gunType: num(cells[24]) || 1,
  shellsPerShot: Math.max(1, num(cells[25]) || 1),
  clipSize: num(cells[26]),
  spread: num(cells[27]),
  availability: String(cells[28] || "").trim(),
  ability: String(cells[29] || "").trim(),
  size: num(cells[30]) || 3,
  depression: Math.abs(num(cells[31])),
  elevation: Math.abs(num(cells[32]))
})).filter((tank) => tank.name && tank.tier >= 1 && tank.tier <= 11);

const byName = new Map(tanks.map((tank) => [tank.name, tank]));
const parents = new Map();
for (const tank of tanks) {
  for (const target of tank.targets) {
    if (!parents.has(target)) parents.set(target, []);
    parents.get(target).push(tank);
  }
}

function reloadTime(tank) {
  if (tank.shellTypes.some((type) => ["ОГОНЬ", "FIRE"].includes(type.toUpperCase()))) return 0;
  return tank.reload || 0.75;
}

function speed(tank) {
  const base = tank.moveDelay > 0 ? 7 / tank.moveDelay : 210;
  const wheeled = ["КТ", "БТР"].includes(tank.className);
  const adjusted = wheeled ? base * (tank.className === "БТР" ? 1.18 : 1.08) : base;
  return Math.max(wheeled ? 120 : 90, Math.min(wheeled ? 360 : 280, adjusted));
}

function turnDegrees(tank) {
  return Math.max(0.75, Math.min(4.2, (tank.turnDelay > 0 ? 1 / tank.turnDelay : 183) * Math.PI / 180))
    * 180 / Math.PI;
}

function penetrationProbability(shellType, penetration, target) {
  if (target.armor <= 0 || target.chance <= 0) return 1;
  let denominator = Math.max(1, Math.round(target.chance));
  if (shellType.toUpperCase() === "ОФ") denominator *= 3;
  return penetration >= target.armor ? (denominator - 1) / denominator : 1 / denominator;
}

function effectiveShotDamage(tank, target) {
  let best = 0;
  for (let index = 0; index < 3; index += 1) {
    const damage = tank.damages[index] || 0;
    if (!damage) continue;
    const type = tank.shellTypes[index] || "";
    const probability = penetrationProbability(type, tank.penetrations[index], target);
    const nonPenFraction = type.toUpperCase() === "ОФ" ? 0.25 : 0;
    const expected = damage * (probability + (1 - probability) * nonPenFraction);
    best = Math.max(best, expected);
  }
  return best * tank.shellsPerShot;
}

function dpmAgainstPeers(tank, peers) {
  if (!peers.length) return 0;
  const averageShot = peers.reduce((sum, target) => sum + effectiveShotDamage(tank, target), 0) / peers.length;
  const reload = reloadTime(tank);
  if (tank.gunType === 2 && tank.clipSize > 0) {
    const cycle = (tank.clipSize - 1) + reload;
    return averageShot * tank.clipSize / Math.max(0.1, cycle) * 60;
  }
  if (tank.gunType === 3 && tank.clipSize > 0) {
    return averageShot / Math.max(1, reload) * 60;
  }
  if (reload === 0) return averageShot / 0.045 * 60;
  return averageShot / reload * 60;
}

function nominalDpm(tank) {
  const damage = Math.max(...tank.damages) * tank.shellsPerShot;
  const reload = reloadTime(tank);
  if (tank.gunType === 2 && tank.clipSize > 0) {
    return damage * tank.clipSize / Math.max(0.1, tank.clipSize - 1 + reload) * 60;
  }
  if (tank.gunType === 3 && tank.clipSize > 0) return damage / Math.max(1, reload) * 60;
  if (reload === 0) return damage / 0.045 * 60;
  return damage / reload * 60;
}

const eligible = tanks.filter((tank) => tank.availability !== "0");
for (const tank of tanks) {
  const peers = eligible.filter((candidate) => candidate.tier === tank.tier);
  tank.speed = speed(tank);
  tank.turn = turnDegrees(tank);
  tank.nominalDpm = nominalDpm(tank);
  tank.effectiveDpm = dpmAgainstPeers(tank, peers);
}

const referenceGroups = new Map();
for (const tank of eligible) {
  const key = `${tank.tier}|${tank.className}`;
  if (!referenceGroups.has(key)) referenceGroups.set(key, []);
  referenceGroups.get(key).push(tank);
}

function groupReference(tank) {
  let group = referenceGroups.get(`${tank.tier}|${tank.className}`) || [];
  if (group.length < 3) group = eligible.filter((candidate) => candidate.tier === tank.tier);
  return {
    hp: median(group.map((item) => item.hp)),
    dpm: median(group.map((item) => item.effectiveDpm)),
    armor: median(group.map((item) => item.armor)),
    speed: median(group.map((item) => item.speed))
  };
}

function balanceRatio(tank) {
  const ref = groupReference(tank);
  const offense = ref.dpm > 0 ? tank.effectiveDpm / ref.dpm : 1;
  const health = ref.hp > 0 ? tank.hp / ref.hp : 1;
  const armor = ref.armor > 0 ? (tank.armor + ref.armor) / (2 * ref.armor) : 1;
  const mobility = ref.speed > 0 ? tank.speed / ref.speed : 1;
  const sizePenalty = tank.size > 3 ? 1 - (tank.size - 3) * 0.05 : 1 + (3 - tank.size) * 0.03;
  return offense ** 0.48 * health ** 0.25 * armor ** 0.14 * mobility ** 0.08 * sizePenalty ** 0.05;
}

function labelFor(ratio) {
  if (ratio >= 1.55) return "ИМБА";
  if (ratio >= 1.22) return "Сильный";
  if (ratio >= 0.78) return "В балансе";
  if (ratio >= 0.58) return "Слабый";
  return "В ГОВНЕ";
}

function branchNotes(tank) {
  const notes = [];
  const linked = [...(parents.get(tank.name) || []), ...tank.targets.map((name) => byName.get(name)).filter(Boolean)];
  if (linked.length) {
    const sameClass = linked.filter((item) => item.className === tank.className).length;
    if (sameClass === 0) notes.push(`смена класса: ${tank.className} между ${[...new Set(linked.map((item) => item.className))].join("/")}`);
    const sameNation = linked.filter((item) => item.nation === tank.nation).length;
    if (sameNation === 0) notes.push("смена нации внутри связи");
  }
  const tierPeers = eligible.filter((item) => item.tier === tank.tier);
  const tierHp = median(tierPeers.map((item) => item.hp));
  const tierDpm = median(tierPeers.map((item) => item.effectiveDpm));
  if (tierHp && (tank.hp > tierHp * 1.8 || tank.hp < tierHp * 0.45)) notes.push("резкий выброс HP для уровня");
  if (tierDpm && (tank.effectiveDpm > tierDpm * 2.2 || tank.effectiveDpm < tierDpm * 0.35)) notes.push("резкий выброс DPM для уровня");
  if (!tank.targets.length && !(parents.get(tank.name) || []).length && tank.availability === "1") notes.push("обычный танк не связан с веткой");
  return notes;
}

for (const tank of tanks) {
  tank.ratio = balanceRatio(tank);
  tank.label = tank.availability === "0" ? "Будущий / не балансируется" : labelFor(tank.ratio);
  tank.notes = branchNotes(tank);
}

const lines = [];
lines.push("# Аудит баланса Tanks Wars", "");
lines.push(`Снимок рассчитан по \`${INPUT}\`. Всего корректных строк техники: **${tanks.length}**, участвуют в текущем подборе: **${eligible.length}**, будущие \`AC=0\`: **${tanks.length - eligible.length}**.`, "");
lines.push("> Это расчётный аудит текущего кода, а не статистика живых игроков. Карта, укрытия, качество ИИ и навык игрока не моделируются. Оценка сравнивает танк с его классом и уровнем; границы: ИМБА ≥ 1,55, сильный ≥ 1,22, баланс 0,78–1,21, слабый 0,58–0,77, В ГОВНЕ < 0,58.", "");
lines.push("## Что реально делают столбцы", "");
lines.push("| Колонки | Фактическая роль | Влияние на баланс |", "|---|---|---|");
lines.push("| A | Название и ключ текстур/ссылок | Ошибка имени ломает связи и изображения |");
lines.push("| B–D | Типы трёх снарядов | ОФ получает непробивной урон 20–30%; ОГОНЬ/FIRE — поток; ПТУР/ATGM — управляемый полёт |");
lines.push("| E–G | Номинальный урон | Каждый снаряд получает случайно 75–125% |");
lines.push("| H–O | Уровень, нация, связи ветки, цены, класс | Уровень задаёт пул ботов; класс влияет на башню, ИИ и скорость башни |");
lines.push("| P | HP | Прямая живучесть |");
lines.push("| Q | Перезарядка | Обычный цикл; `0` подменяется на 0,75 с игроку и 1,6 с боту, кроме огня |");
lines.push("| R | Задержка поворота | `1/R` град/с с жёстким пределом примерно 43–241 град/с; меньше лучше |");
lines.push("| S | Задержка движения | Скорость `7/S`, ограничена 90–280; для колёсных 120–360; меньше лучше |");
lines.push("| T–V | Пробитие каждого слота | Сравнивается со средней бронёй цели |");
lines.push("| W | Средняя броня | Один показатель на весь танк, углов и зон брони нет |");
lines.push("| X | Знаменатель броска, а не процент | При `пробитие ≥ броня`: шанс = `1 − 1/X`; иначе `1/X`. Для ОФ X утраивается. UI называет это процентом ошибочно |");
lines.push("| Y | Тип орудия | 1 обычное; 2 барабан с полной зарядкой; 3 дозарядка по одному. Значения 4–7 почти не меняют цикл сами по себе |");
lines.push("| Z | Снарядов за выстрел | Умножает разовый урон и расход БК; добавляет разлёт |");
lines.push("| AA | Магазин | Используется только для типов Y=2/3; задержка между выстрелами фиксирована 1 с |");
lines.push("| AB | Разброс | Случайное отклонение в пределах ±AB/2; меньше лучше |");
lines.push("| AC | Доступность | 0 будущий, 1 дерево, 2 прем/контейнер, 3 developer, 4 коллекционный |");
lines.push("| AD | Доп. способности | Парсится как пары кодов и показывается; боевого применения сейчас нет |");
lines.push("| AE | Размер 1–5 | Масштаб 0,70/0,85/1,00/1,15/1,30; меняет коллизию и заметность цели |");
lines.push("| AF–AG | УВН вниз/вверх | Парсятся, но боевое наведение ими сейчас не ограничено; баланс-ценности нет |", "");

lines.push("## Рекомендуемые средние характеристики по классам и уровням", "");
lines.push("Это медианы текущих доступных машин, очищающие влияние единичных выбросов. Рекомендуемый коридор — ±15%; если группа меньше трёх машин, используется медиана всего уровня.", "");
lines.push("| Ур. | Класс | Танков | HP, цель | эфф. DPM, цель | Броня, цель | Скорость, цель |", "|---:|---|---:|---:|---:|---:|---:|");
for (const [key, group] of [...referenceGroups].sort((a, b) => {
  const [ta, ca] = a[0].split("|");
  const [tb, cb] = b[0].split("|");
  return Number(ta) - Number(tb) || ca.localeCompare(cb, "ru");
})) {
  const [tier, className] = key.split("|");
  const ref = groupReference(group[0]);
  lines.push(`| ${tier} | ${className || "—"} | ${group.length} | ${range(ref.hp)} | ${range(ref.dpm)} | ${range(ref.armor)} | ${range(ref.speed)} |`);
}

lines.push("", "## Короткий список главных проблем", "");
const worst = eligible.filter((tank) => tank.label === "В ГОВНЕ").sort((a, b) => a.ratio - b.ratio).slice(0, 20);
const best = eligible.filter((tank) => tank.label === "ИМБА").sort((a, b) => b.ratio - a.ratio).slice(0, 20);
lines.push(`**Главные имбы:** ${best.map((tank) => `${tank.name} (${tank.tier})`).join(", ") || "нет по выбранному порогу"}.`, "");
lines.push(`**Самые провальные:** ${worst.map((tank) => `${tank.name} (${tank.tier})`).join(", ") || "нет по выбранному порогу"}.`, "");
lines.push("Приоритет исправления: сначала разовый урон/эффективный DPM, затем HP и броня. Скорость уже часто упирается в ограничитель, поэтому правка очень малых значений S может вообще ничего не изменить.", "");

lines.push("## Лучшие и худшие на каждом уровне", "");
lines.push("| Ур. | Верх уровня | Низ уровня | Особое замечание |", "|---:|---|---|---|");
for (let tier = 1; tier <= 10; tier += 1) {
  const tierTanks = eligible.filter((tank) => tank.tier === tier).sort((a, b) => b.ratio - a.ratio);
  if (!tierTanks.length) continue;
  const top = tierTanks.slice(0, 3).map((tank) => `${tank.name} (${tank.label}, ${fmt(tank.ratio, 2)})`).join("; ");
  const bottom = tierTanks.slice(-3).reverse().map((tank) => `${tank.name} (${tank.label}, ${fmt(tank.ratio, 2)})`).join("; ");
  let warning = "—";
  if (tier === 6) warning = "КВ-2/КВ-2 НГ имеют 850 альфы: даже без статуса ИМБА способны удалить одноуровневую цель одним удачным ОФ.";
  if (tier === 8) warning = "ИС-2-II даёт залп 800, поэтому опаснее своего среднего DPM.";
  if (tier === 9) warning = "Jagdtiger резко опережает большинство ПТ по сочетанию HP и DPM.";
  if (tier === 10) warning = "Sturmtiger с 4500 альфы — главный аварийный выброс всей таблицы.";
  lines.push(`| ${tier} | ${top} | ${bottom} | ${warning} |`);
}
lines.push("");

lines.push("## Все доступные танки", "");
lines.push("| Ур. | Танк | Нация | Класс | Вердикт | Индекс | HP | эфф. DPM | ном. DPM | Урон залпа | Проб. | Броня/X | Скорость | Ветка/заметка |", "|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|");
for (const tank of eligible.sort((a, b) => a.tier - b.tier || a.nation.localeCompare(b.nation, "ru") || a.name.localeCompare(b.name, "ru"))) {
  const burst = Math.max(...tank.damages) * tank.shellsPerShot;
  const bestPen = Math.max(...tank.penetrations);
  lines.push(`| ${tank.tier} | ${tank.name} | ${tank.nation || "—"} | ${tank.className || "—"} | **${tank.label}** | ${fmt(tank.ratio, 2)} | ${tank.hp} | ${fmt(tank.effectiveDpm)} | ${fmt(tank.nominalDpm)} | ${burst} | ${bestPen} | ${tank.armor}/${tank.chance} | ${fmt(tank.speed)} | ${tank.notes.join("; ") || "вписывается"} |`);
}

lines.push("", "## Будущие танки (`AC=0`)", "");
lines.push("Они не выбираются ботами и не должны влиять на целевые медианы. Их цифры перечислены для подготовки, но вердикт до включения не присваивается.", "");
lines.push("| Ур. | Танк | Нация | Класс | HP | ном. DPM | Урон залпа | Пробитие | Броня/X | Проблема ветки |", "|---:|---|---|---|---:|---:|---:|---:|---:|---|");
for (const tank of tanks.filter((item) => item.availability === "0").sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, "ru"))) {
  lines.push(`| ${tank.tier} | ${tank.name} | ${tank.nation || "—"} | ${tank.className || "—"} | ${tank.hp} | ${fmt(tank.nominalDpm)} | ${Math.max(...tank.damages) * tank.shellsPerShot} | ${Math.max(...tank.penetrations)} | ${tank.armor}/${tank.chance} | ${tank.notes.join("; ") || "явного разрыва нет"} |`);
}

lines.push("", "## Как пересчитать", "", "```powershell", "node tools/generate-balance-report.mjs", "```", "");
lines.push("После изменения формул генератора или `data.csv` обязательно перечитать верхние выбросы вручную: математический индекс не понимает прострел камней, ценность артиллерийского обзора, управляемость ПТУР и реальную геометрию карты.", "");

fs.writeFileSync(OUTPUT, `${lines.join("\n").trimEnd()}\n`, "utf8");
console.log(`Generated ${OUTPUT}: ${lines.length} lines, ${tanks.length} tanks.`);
