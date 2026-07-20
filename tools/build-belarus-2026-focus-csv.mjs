import fs from "node:fs";
import path from "node:path";

const output = path.join(process.cwd(), "Ashes-of-Nations", "focuses", "Белоруссия[2026].csv");

const headers = [
  "id",
  "название",
  "описание",
  "подробно",
  "дни",
  "доступно с",
  "ответвление",
  "x",
  "y",
  ...Array.from({ length: 10 }, (_, index) => `после${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `требование${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `награда${index + 1}`),
  ...Array.from({ length: 3 }, (_, index) => `блокировать${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `случайно${index + 1}`),
];

const focuses = [
  {
    id: "by-state-continuity",
    name: "Преемственность государства",
    text: "Сохранить управляемость страны после 2026 года и подготовить длинный политический цикл без немедленной избирательной развилки.",
    days: 35,
    branch: "Старт",
    x: 4,
    y: 1,
    reward: ["politicalPower=45", "stability=4"],
  },
  {
    id: "by-union-balancing",
    name: "Баланс Союзного государства",
    text: "Уточнить экономические и оборонные обязательства в союзных форматах, сохраняя пространство для собственной политики.",
    days: 55,
    branch: "Интеграция",
    x: 2,
    y: 2,
    requires: ["by-state-continuity"],
    reward: ["politicalPower=30", "budget=25", "stability=2"],
  },
  {
    id: "by-industrial-core",
    name: "Промышленное ядро",
    text: "Поддержать машиностроение, калийную логистику, приборостроение и ремонтные мощности через государственные заказы.",
    days: 60,
    branch: "Экономика",
    x: 4,
    y: 2,
    requires: ["by-state-continuity"],
    reward: ["factories=3", "steel=18", "gdp=16"],
  },
  {
    id: "by-social-contract",
    name: "Социальный контракт",
    text: "Сдержать рост недовольства через зарплаты бюджетников, адресные выплаты и коммунальную предсказуемость.",
    days: 50,
    branch: "Общество",
    x: 6,
    y: 2,
    requires: ["by-state-continuity"],
    reward: ["stability=5", "food=20", "budget=-10"],
  },
  {
    id: "by-border-logistics",
    name: "Пограничная логистика",
    text: "Усилить дороги, склады и пограничные переходы для торговли и безопасности без лишней эскалации.",
    days: 55,
    branch: "Интеграция",
    x: 2,
    y: 3,
    requires: ["by-union-balancing"],
    reward: ["gdp=15", "oil=10", "commandPower=15"],
  },
  {
    id: "by-machine-export",
    name: "Экспорт машин",
    text: "Собрать экспортный контур для техники, комплектующих и сервисного обслуживания на дружественных рынках.",
    days: 65,
    branch: "Экономика",
    x: 4,
    y: 3,
    requires: ["by-industrial-core"],
    reward: ["budget=45", "gdp=22", "factories=2"],
  },
  {
    id: "by-regional-stability",
    name: "Стабильные регионы",
    text: "Укрепить районные администрации, больницы, колледжи и локальные рабочие места для удержания населения.",
    days: 60,
    branch: "Общество",
    x: 6,
    y: 3,
    requires: ["by-social-contract"],
    reward: ["stability=4", "manpower=70", "gdp=12"],
  },
  {
    id: "by-security-apparatus",
    name: "Аппарат безопасности",
    text: "Обновить управление внутренней безопасностью и мобилизационным резервом без нарушения базовой экономики.",
    days: 60,
    branch: "Безопасность",
    x: 8,
    y: 3,
    requires: ["by-state-continuity"],
    reward: ["commandPower=35", "warSupport=3", "stability=1"],
  },
  {
    id: "by-pre-election-administration",
    name: "Длинная подготовка кампании",
    text: "Поддерживать аппарат, экономику и общественный порядок до следующего крупного избирательного цикла.",
    days: 70,
    branch: "Политический цикл",
    x: 4,
    y: 4,
    requires: ["by-border-logistics", "by-machine-export", "by-regional-stability", "by-security-apparatus"],
    reward: ["politicalPower=65", "stability=5", "budget=35"],
  },
  {
    id: "by-election-2030",
    name: "Выборы 2030",
    text: "К моменту следующего президентского цикла страна открывает политическую развилку между преемственностью, обновлением и управляемым компромиссом.",
    days: 14,
    availableFrom: "2030-01-26",
    branch: "Выборы 2030",
    x: 4,
    y: 5,
    requires: ["by-pre-election-administration"],
    reward: ["politicalPower=30", "stability=1"],
    random: ["by-continuity-victory", "by-technocratic-renewal", "by-social-compromise"],
  },
  {
    id: "by-continuity-victory",
    name: "Победа преемственности",
    text: "Силовой и административный контур сохраняет ведущую роль, обещая устойчивость и дальнейшую индустриальную политику.",
    days: 35,
    branch: "Выборы 2030",
    x: 2,
    y: 6,
    requires: ["by-election-2030"],
    reward: ["politicalPower=70", "stability=6", "commandPower=25"],
    blocks: ["Выборы 2030"],
  },
  {
    id: "by-technocratic-renewal",
    name: "Технократическое обновление",
    text: "Группа управленцев получает мандат на цифровизацию предприятий, сервисов и бюджетного контроля.",
    days: 35,
    branch: "Выборы 2030",
    x: 4,
    y: 6,
    requires: ["by-election-2030"],
    reward: ["politicalPower=55", "gdp=22", "rare=10"],
    blocks: ["Выборы 2030"],
  },
  {
    id: "by-social-compromise",
    name: "Социальный компромисс",
    text: "Социально ориентированный блок усиливает влияние и требует перераспределить выгоды промышленности в регионы.",
    days: 35,
    branch: "Выборы 2030",
    x: 6,
    y: 6,
    requires: ["by-election-2030"],
    reward: ["politicalPower=55", "stability=5", "food=25"],
    blocks: ["Выборы 2030"],
  },
  {
    id: "by-continuity-union-deepening",
    name: "Глубокая интеграция",
    text: "Победившая преемственность делает ставку на союзные рынки, оборонную логистику и совместные программы.",
    days: 60,
    branch: "Преемственность",
    x: 2,
    y: 7,
    requires: ["by-continuity-victory"],
    reward: ["budget=55", "commandPower=30", "gdp=18"],
  },
  {
    id: "by-continuity-order-state",
    name: "Государство порядка",
    text: "Закрепить модель управляемой стабильности и быстрых решений для администрации и промышленности.",
    days: 75,
    branch: "Преемственность",
    x: 2,
    y: 8,
    requires: ["by-continuity-union-deepening"],
    reward: ["politicalPower=90", "stability=8", "factories=3"],
  },
  {
    id: "by-tech-digital-plants",
    name: "Цифровые заводы",
    text: "Внедрить учет, роботизацию и прозрачные заказы на ключевых промышленных площадках.",
    days: 60,
    branch: "Технократы",
    x: 4,
    y: 7,
    requires: ["by-technocratic-renewal"],
    reward: ["gdp=30", "rare=20", "factories=2"],
  },
  {
    id: "by-tech-service-state",
    name: "Сервисное государство",
    text: "Сократить бумажные процедуры и перевести социальные, налоговые и промышленные сервисы в единую цифровую систему.",
    days: 70,
    branch: "Технократы",
    x: 4,
    y: 8,
    requires: ["by-tech-digital-plants"],
    reward: ["politicalPower=70", "gdp=35", "stability=4"],
  },
  {
    id: "by-social-regional-budget",
    name: "Региональный бюджет",
    text: "Направить часть доходов промышленности на районы, коммунальную инфраструктуру и медицину.",
    days: 60,
    branch: "Социальный курс",
    x: 6,
    y: 7,
    requires: ["by-social-compromise"],
    reward: ["stability=7", "food=35", "budget=20"],
  },
  {
    id: "by-social-people-state",
    name: "Социальное государство",
    text: "Закрепить курс на занятость, доступную медицину и поддержку малых городов как основу легитимности.",
    days: 75,
    branch: "Социальный курс",
    x: 6,
    y: 8,
    requires: ["by-social-regional-budget"],
    reward: ["stability=10", "politicalPower=75", "manpower=120"],
  },
];

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

const childrenById = new Map();
focuses.forEach((focus) => {
  (focus.requires || []).forEach((requiredId) => {
    if (!childrenById.has(requiredId)) childrenById.set(requiredId, []);
    childrenById.get(requiredId).push(focus.id);
  });
});

function detailedText(focus) {
  const branch = focus.branch ? `«${focus.branch}»` : "общего курса";
  const date = focus.availableFrom ? ` Фокус открывается с ${focus.availableFrom}.` : "";
  const rewards = (focus.reward || []).length ? ` Игровой эффект: ${focus.reward.join(", ")}.` : "";
  return `${focus.text}

Подробно: направление ${branch} развивает Беларусь через управляемость, промышленную базу, социальную устойчивость и осторожную внешнюю координацию. ${date}

Для игрока это дает долгую ветку до выборного цикла: ранние фокусы укрепляют страну, а политическая развилка появляется только тогда, когда игровая дата доходит до следующего крупного избирательного периода.${rewards}`.trim();
}

function rowForFocus(focus) {
  const next = childrenById.get(focus.id) || [];
  const requires = focus.requires || [];
  const reward = focus.reward || [];
  const blocks = focus.blocks || [];
  const random = focus.random || [];
  return [
    focus.id,
    focus.name,
    focus.text,
    focus.details || detailedText(focus),
    focus.days || 70,
    focus.availableFrom || "",
    focus.branch || "",
    focus.x || "",
    focus.y || "",
    ...Array.from({ length: 10 }, (_, index) => next[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => requires[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => reward[index] || ""),
    ...Array.from({ length: 3 }, (_, index) => blocks[index] || ""),
    ...Array.from({ length: 10 }, (_, index) => random[index] || ""),
  ].map(csvEscape).join(",");
}

const rows = [
  headers.map(csvEscape).join(","),
  ...focuses.map(rowForFocus),
];

fs.writeFileSync(output, `${rows.join("\n")}\n`, "utf8");
console.log(`Wrote ${focuses.length} Belarus focuses to ${path.relative(process.cwd(), output)}`);
