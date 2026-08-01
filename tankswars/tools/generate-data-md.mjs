import fs from "node:fs";

const inputPath = "data.csv";
const outputPath = "data.md";

function parseCsvRow(line) {
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

const columnDefinitions = [
  ["A", "Название", "name", "Название танка, ключ связей и изображений"],
  ["B", "Снаряд 1", "shell1Type", "Тип первого снаряда"],
  ["C", "Снаряд 2", "shell2Type", "Тип второго снаряда"],
  ["D", "Снаряд 3", "shell3Type", "Тип третьего снаряда"],
  ["E", "Урон 1", "damage1", "Номинальный урон первого снаряда"],
  ["F", "Урон 2", "damage2", "Номинальный урон второго снаряда"],
  ["G", "Урон 3", "damage3", "Номинальный урон третьего снаряда"],
  ["H", "Уровень", "level", "Уровень техники и пул подбора ботов"],
  ["I", "Нация", "nation", "Нация в дереве развития"],
  ["J", "Исследование 1", "research1", "Первая следующая машина"],
  ["K", "Исследование 2", "research2", "Вторая следующая машина"],
  ["L", "Исследование 3", "research3", "Третья следующая машина"],
  ["M", "Цена опыта", "researchXp", "Опыт для исследования"],
  ["N", "Цена серебра", "silverPrice", "Серебро для покупки"],
  ["O", "Класс", "className", "ЛТ, СТ, ТТ, ПТ, САУ, КТ, БТР и т. д."],
  ["P", "HP", "health", "Запас прочности"],
  ["Q", "Перезарядка", "reloadTime", "Время перезарядки в секундах"],
  ["R", "Задержка поворота", "hullTurnDelay", "Меньше — быстрее поворот корпуса"],
  ["S", "Задержка движения", "movementDelay", "Меньше — выше скорость"],
  ["T", "Пробитие 1", "penetration1", "Пробитие первого снаряда"],
  ["U", "Пробитие 2", "penetration2", "Пробитие второго снаряда"],
  ["V", "Пробитие 3", "penetration3", "Пробитие третьего снаряда"],
  ["W", "Средняя броня", "averageArmor", "Единое значение брони всей машины"],
  ["X", "Бросок пробития", "penetrationChance", "Знаменатель вероятности, не буквальный процент"],
  ["Y", "Тип орудия", "gunType", "1 обычное, 2 барабан, 3 дозарядка; прочие специальные"],
  ["Z", "Снарядов за выстрел", "shellsPerShot", "Количество одновременно создаваемых снарядов"],
  ["AA", "Размер магазина", "clipSize", "Число снарядов для типов орудия 2 и 3"],
  ["AB", "Разброс", "gunSpread", "Угловой разброс в градусах; меньше лучше"],
  ["AC", "Доступность", "availability", "0 будущий, 1 дерево, 2 премиум, 3 developer, 4 коллекционный"],
  ["AD", "Доп. способности", "abilities", "Коды дополнительных особенностей"],
  ["AE", "Размер", "sizeLevel", "Размер 1–5, влияющий на масштаб и коллизию"],
  ["AF", "УВН вниз", "gunDepression", "Угол склонения; сейчас не ограничивает наведение в бою"],
  ["AG", "УВН вверх", "gunElevation", "Угол возвышения; сейчас не ограничивает наведение в бою"]
];

const escapeCell = (value) => String(value ?? "")
  .replace(/\|/g, "\\|")
  .replace(/\r?\n/g, " ")
  .trim() || "—";

const rawRows = fs.readFileSync(inputPath, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .map(parseCsvRow);

const rows = rawRows
  .filter((cells) => cells[0]?.trim() && /^\d+$/.test(String(cells[7] || "").trim()))
  .map((cells, index) => ({
    csvRow: index + 1,
    cells: Array.from({ length: columnDefinitions.length }, (_, cellIndex) => cells[cellIndex] || "")
  }));

const lines = [
  "# Упрощённая таблица `data.csv`",
  "",
  `Файл создан автоматически из \`${inputPath}\`. Корректных строк техники: **${rows.length}**.`,
  "",
  "Для быстрого просмотра данные разделены на несколько более узких таблиц. Символ `—` означает пустую ячейку.",
  "",
  "## Справочник столбцов A–AG",
  "",
  "| Столбец | Понятное название | Поле в коде | Что означает |",
  "|---|---|---|---|",
  ...columnDefinitions.map(([letter, title, field, description]) =>
    `| ${letter} | ${title} | \`${field}\` | ${description} |`
  ),
  "",
  "## Значения специальных столбцов",
  "",
  "- `AC = 0` — будущая техника, не выбирается ботами.",
  "- `AC = 1` или пусто — обычная техника.",
  "- `AC = 2` — премиумная или контейнерная техника.",
  "- `AC = 3` — техника режима разработчика.",
  "- `AC = 4` — коллекционная техника.",
  "- `Y = 1` — обычное орудие.",
  "- `Y = 2` — барабан: 1 секунда между обычными снарядами или 0,05 секунды для типа `Пулемёт`, затем полная перезарядка `Q`.",
  "- `Y = 3` — магазин с дозарядкой по одному снаряду.",
  "- `ОФ` при непробитии наносит примерно 20–30% выпавшего урона.",
  "- `ОГОНЬ/FIRE` создаёт потоковый огонь; `ПТУР/ATGM` создаёт управляемую ракету.",
  "",
  "## Быстрый список всей техники",
  "",
  "| № CSV | Ур. | Название | Нация | Класс | HP | Урон 1/2/3 | Пробитие 1/2/3 | Броня/X | КД | Скорость S | AC |",
  "|---:|---:|---|---|---|---:|---|---|---|---:|---:|---:|"
];

for (const { csvRow, cells } of rows) {
  lines.push(`| ${csvRow} | ${escapeCell(cells[7])} | ${escapeCell(cells[0])} | ${escapeCell(cells[8])} | ${escapeCell(cells[14])} | ${escapeCell(cells[15])} | ${escapeCell(cells.slice(4, 7).join(" / "))} | ${escapeCell(cells.slice(19, 22).join(" / "))} | ${escapeCell(`${cells[22] || "—"} / ${cells[23] || "—"}`)} | ${escapeCell(cells[16])} | ${escapeCell(cells[18])} | ${escapeCell(cells[28])} |`);
}

for (let tier = 1; tier <= 11; tier += 1) {
  const tierRows = rows.filter(({ cells }) => Number(cells[7]) === tier);
  if (!tierRows.length) continue;

  lines.push("", `## Уровень ${tier}: орудие и мобильность`, "");
  lines.push("| Танк | Снаряды | Урон | Пробитие | HP | КД | Поворот R | Движение S | Броня | X | Тип Y | Залп Z | Магазин AA | Разброс AB | Размер AE | УВН AF/AG |");
  lines.push("|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const { cells } of tierRows) {
    lines.push(`| ${escapeCell(cells[0])} | ${escapeCell(cells.slice(1, 4).join(" / "))} | ${escapeCell(cells.slice(4, 7).join(" / "))} | ${escapeCell(cells.slice(19, 22).join(" / "))} | ${escapeCell(cells[15])} | ${escapeCell(cells[16])} | ${escapeCell(cells[17])} | ${escapeCell(cells[18])} | ${escapeCell(cells[22])} | ${escapeCell(cells[23])} | ${escapeCell(cells[24])} | ${escapeCell(cells[25])} | ${escapeCell(cells[26])} | ${escapeCell(cells[27])} | ${escapeCell(cells[30])} | ${escapeCell(`${cells[31] || "—"} / ${cells[32] || "—"}`)} |`);
  }

  lines.push("", `### Уровень ${tier}: ветка, экономика и доступность`, "");
  lines.push("| Танк | Нация | Класс | Следующие машины J/K/L | Опыт M | Серебро N | Доступность AC | Способности AD |");
  lines.push("|---|---|---|---|---:|---:|---:|---|");
  for (const { cells } of tierRows) {
    lines.push(`| ${escapeCell(cells[0])} | ${escapeCell(cells[8])} | ${escapeCell(cells[14])} | ${escapeCell(cells.slice(9, 12).join(" / "))} | ${escapeCell(cells[12])} | ${escapeCell(cells[13])} | ${escapeCell(cells[28])} | ${escapeCell(cells[29])} |`);
  }
}

lines.push(
  "",
  "## Как обновить файл",
  "",
  "После изменения `data.csv` выполнить:",
  "",
  "```powershell",
  "node tools/generate-data-md.mjs",
  "```"
);

fs.writeFileSync(outputPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
console.log(`Generated ${outputPath}: ${rows.length} tanks, ${lines.length} lines.`);
