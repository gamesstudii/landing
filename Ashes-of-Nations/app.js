(function () {
  "use strict";

  const mainScreen = document.getElementById("mainScreen");
  const setupScreen = document.getElementById("setupScreen");
  const gameScreen = document.getElementById("gameScreen");
  const playButton = document.getElementById("playButton");
  const continueButton = document.getElementById("continueButton");
  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("settingsModal");
  const settingsClose = document.getElementById("settingsClose");
  const settingsLanguage = document.getElementById("settingsLanguage");
  const settingsSmoothing = document.getElementById("settingsSmoothing");
  const settingsPlayer = document.getElementById("settingsPlayer");
  const settingsFullscreen = document.getElementById("settingsFullscreen");
  const settingsApplyPlayer = document.getElementById("settingsApplyPlayer");
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
  const gameMapViewport = document.getElementById("gameMapViewport");
  const gameCanvasStack = document.getElementById("gameCanvasStack");
  const gameMapCanvas = document.getElementById("gameMapCanvas");
  const gameMapCtx = gameMapCanvas.getContext("2d");
  const gameOverlayCanvas = document.getElementById("gameOverlayCanvas");
  const gameOverlayCtx = gameOverlayCanvas.getContext("2d");
  const gameZoomOut = document.getElementById("gameZoomOut");
  const gameZoomIn = document.getElementById("gameZoomIn");
  const gameZoomLabel = document.getElementById("gameZoomLabel");
  const pauseButton = document.getElementById("pauseButton");
  const stateSummary = document.getElementById("stateSummary");
  const selectedRegionSummary = document.getElementById("selectedRegionSummary");
  const strategyTabs = document.getElementById("strategyTabs");
  const strategyContent = document.getElementById("strategyContent");
  const strategyFullscreenButton = document.getElementById("strategyFullscreenButton");
  const nextTurnButton = document.getElementById("nextTurnButton");
  const turnStatus = document.getElementById("turnStatus");
  let relationMapBackButton = null;

  const GAME_SPEEDS = {
    1: 10000,
    2: 5000,
    4: 2500,
  };

  const PLAYABLE_SCENARIO_YEAR = 2026;
  const RUSSIAN_TERRITORY_TRANSFER_LOCKED = true;
  const SAVE_STORAGE_KEY = "ashes-of-nations.autosave.v1";
  const SETTINGS_STORAGE_KEY = "ashes-of-nations.settings.v1";
  const FOCUS_CSV_DIR = "focuses";
  const CATALOG_REFRESH_MS = 30000;
  const NUCLEAR_CAPABLE_COUNTRIES = new Set(["Россия", "США", "Китай", "Китайская Народная Республика", "Франция", "Великобритания", "Индия", "Пакистан", "КНДР", "Израиль"]);

  const RESOURCE_LABELS = {
    oil: "Нефть",
    steel: "Сталь",
    food: "Продовольствие",
    rare: "Редкие ресурсы",
  };

  const TRADE_CATEGORIES = {
    energy: { label: "Энергетика", resources: { oil: 14 }, amount: 14, price: 11 },
    raw: { label: "Сырье", resources: { steel: 10, rare: 4 }, amount: 14, price: 10 },
    food: { label: "Продукты", resources: { food: 18 }, amount: 18, price: 8 },
    industry: { label: "Промышленные товары", resources: { steel: 5, rare: 5 }, factories: 0.08, amount: 10, price: 14 },
  };

  const INTERNATIONAL_TREATIES = [
    {
      id: "antarctic",
      name: "Договор об Антарктике",
      status: "действует",
      text: "Антарктида считается нейтральной ничейной зоной. Страны не могут оккупировать, присоединять или получать ее регионы по мирному договору.",
      start: 1961,
      effects: [
        "Антарктические регионы не имеют владельца.",
        "Оккупация, интеграция, передача по миру и иностранные базы в Антарктике запрещены.",
      ],
      global: true,
    },
    {
      id: "un_charter",
      name: "Устав ООН",
      status: "действует",
      text: "Запрещает агрессивные войны без сильного политического обоснования и ухудшает отношения с большинством стран при нарушении.",
      start: 1945,
      effects: [
        "Объявление войны при отношениях выше -25 требует больше политической силы и поддержки войны.",
        "Нейтральные страны хуже относятся к инициатору такой войны.",
      ],
      global: true,
    },
    {
      id: "geneva",
      name: "Женевские конвенции",
      status: "действует",
      text: "Ограничивают обращение с оккупированными территориями и повышают цену немедленной аннексии.",
      start: 1949,
      effects: [
        "Интеграция оккупации дороже и снижает стабильность.",
        "Ботам сложнее требовать массовую аннексию на мирной конференции.",
      ],
      global: true,
    },
    {
      id: "npt",
      name: "Договор о нераспространении ядерного оружия",
      status: "действует",
      text: "После 1970 года неядерным странам сложнее создавать боеголовки, а нарушение портит отношения.",
      start: 1970,
      effects: [
        "Неядерные страны платят больше за запуск ядерной программы и боеголовки.",
        "Создание боеголовки неядерной страной ухудшает отношения с участниками ООН.",
      ],
      global: true,
    },
    {
      id: "paris_climate",
      name: "Парижское соглашение",
      status: "действует",
      text: "После 2016 года торговля и дипломатия получают небольшой штраф при закрытой экономике и агрессивной ресурсной политике.",
      start: 2016,
      effects: [
        "Странам с закрытой экономикой труднее улучшать отношения с участниками ООН.",
      ],
      global: true,
    },
  ];

  const SANCTION_TYPES = [
    {
      id: "economic",
      name: "Экономические санкции",
      text: "Ограничивают торговлю, бюджет и рост экономики.",
      cost: 25,
      severity: 1.4,
      relationPenalty: 10,
      daily: { budget: 2.4, stability: 0.08, gdp: 0.01 },
      researchPenalty: 0.03,
    },
    {
      id: "tech",
      name: "Технологические ограничения",
      text: "Бьют по исследованиям, оборудованию и промышленной модернизации.",
      cost: 20,
      severity: 1.1,
      relationPenalty: 8,
      daily: { budget: 1.1, stability: 0.05 },
      researchPenalty: 0.15,
    },
    {
      id: "travel",
      name: "Визовые ограничения",
      text: "Сужают дипломатические каналы и ухудшают международный фон.",
      cost: 14,
      severity: 0.9,
      relationPenalty: 6,
      daily: { politicalPower: 0.12, stability: 0.03 },
      researchPenalty: 0.02,
    },
    {
      id: "asset_freeze",
      name: "Заморозка активов",
      text: "Снижают доходы от внешних активов и доступ к ликвидности.",
      cost: 22,
      severity: 1.2,
      relationPenalty: 9,
      daily: { budget: 1.8, foreignAssetYield: 0.45 },
      researchPenalty: 0.04,
    },
    {
      id: "arms",
      name: "Эмбарго на оружие",
      text: "Ломает военное снабжение и замедляет наращивание военной мощи.",
      cost: 28,
      severity: 1.3,
      relationPenalty: 12,
      daily: { commandPower: 0.15, warSupport: 0.08, manpower: 0.02 },
      researchPenalty: 0.05,
    },
  ];

  const CURRENCY_POLICIES = [
    { id: "floating", name: "Плавающий курс", stability: 0, trade: 0, ppp: 1 },
    { id: "usd-peg", name: "Привязка к доллару", stability: 5, trade: 0.08, ppp: 1.03 },
    { id: "gold-peg", name: "Привязка к золоту", stability: 8, trade: -0.04, ppp: 1.01 },
    { id: "currency-bloc", name: "Региональный валютный блок", stability: 3, trade: 0.12, ppp: 1.04 },
  ];

  const DEMOCRATIC_IDEOLOGIES = new Set(["democratic", "liberal", "conservative", "social_democratic"]);
  const RESERVED_IDEOLOGY_OPTIONS = [
    { id: "fascist", name: "Национал-социализм", cost: 125, reserved: true, effects: { warSupport: 12, recruitable: 0.025, armyAttack: 0.08, stability: -4 } },
  ];

  const IDEOLOGY_OPTIONS = [
    { id: "neutral", name: "Нейтральный курс", cost: 0, effects: { stability: 2, relationsGain: 0.03 } },
    { id: "democratic", name: "Демократия", cost: 80, democracy: true, effects: { stability: 5, relationsGain: 0.08, politicalPowerDaily: 0.1 } },
    { id: "liberal", name: "Либерализм", cost: 95, democracy: true, effects: { stability: 4, relationsGain: 0.1, factoryOutput: 0.03 } },
    { id: "conservative", name: "Консерватизм", cost: 85, democracy: true, effects: { stability: 7, politicalPowerDaily: 0.15 } },
    { id: "socialist", name: "Социализм", cost: 90, effects: { stability: 3, recruitable: 0.01, factoryOutput: 0.04 } },
    { id: "communist", name: "Коммунизм", cost: 120, effects: { stability: 4, recruitable: 0.015, factoryOutput: 0.06, resourceGain: 0.04, focusSlots: 1 } },
    { id: "social_democratic", name: "Социал-демократия", cost: 100, democracy: true, effects: { stability: 6, relationsGain: 0.05, resourceGain: 0.02 } },
    { id: "national", name: "Национализм", cost: 90, effects: { warSupport: 6, recruitable: 0.015, armyAttack: 0.04 } },
    { id: "monarchist", name: "Монархия", cost: 120, effects: { stability: 5, warSupport: 4, politicalPowerDaily: 0.2 } },
    { id: "theocratic", name: "Теократия", cost: 110, effects: { stability: 8, warSupport: 4, recruitable: 0.01, relationsGain: -0.03 } },
    { id: "technocratic", name: "Технократия", cost: 130, effects: { factoryOutput: 0.08, resourceGain: 0.03, focusSlots: 1 } },
    { id: "military_junta", name: "Военная хунта", cost: 115, effects: { commandPower: 25, warSupport: 10, armyAttack: 0.06, politicalPowerDaily: -0.05 } },
    { id: "corporatist", name: "Корпоратократия", cost: 120, effects: { factoryOutput: 0.1, politicalPowerDaily: 0.15, relationsGain: -0.02 } },
  ];

  const GOVERNMENT_REFORMS = [
    { id: "central-planning", name: "Централизованное планирование", cost: 70, effects: { factoryOutput: 0.05, stability: 2 } },
    { id: "union-treaty", name: "Союзный договор", cost: 95, effects: { politicalPower: 20, stability: 4 } },
    { id: "regional-autonomy", name: "Региональная автономия", cost: 65, effects: { stability: 5, gdp: 15 } },
    { id: "security-council", name: "Совет безопасности", cost: 75, effects: { commandPower: 20, warSupport: 3 } },
  ];

  const ARMY_MINISTERS = [
    { id: "none", name: "Ручное командование", cost: 0, mode: "manual", text: "Игрок сам создает армии и отдает приказы." },
    { id: "defense-staff", name: "Министр обороны", cost: 65, mode: "balanced", text: "Сам создает армии, занимает доступные регионы противника и держит бюджетный резерв." },
    { id: "general-staff", name: "Начальник Генштаба", cost: 95, mode: "aggressive", text: "Агрессивно набирает войска, атакует несколькими армиями и быстро оформляет оккупации." },
    { id: "mobilization-chief", name: "Министр мобилизации", cost: 85, mode: "mobilization", text: "Массово создает новые армии и постоянно подбрасывает их на фронт." },
  ];

  const REGION_MINISTERS = [
    { id: "none", name: "Без министра", budgetShare: 0, effects: {} },
    { id: "industrialist", name: "Промышленник", budgetShare: 0.18, effects: { economy: 0.08, steel: 0.08 } },
    { id: "energy", name: "Энергетик", budgetShare: 0.16, effects: { oil: 0.14, economy: 0.03 } },
    { id: "agronomist", name: "Аграрий", budgetShare: 0.12, effects: { food: 0.16, population: 0.01 } },
    { id: "governor", name: "Губернатор-развития", budgetShare: 0.14, effects: { gdp: 0.06, stability: 0.02 } },
  ];

  const FOREIGN_ASSET_TYPES = [
    { id: "energy", name: "Энергетические активы", value: 35 },
    { id: "industry", name: "Промышленные активы", value: 30 },
    { id: "finance", name: "Финансовые активы", value: 25 },
    { id: "logistics", name: "Логистические активы", value: 20 },
  ];

  const FORMABLE_NATIONS = {
    ussr: {
      name: "СССР",
      requiredCountry: "Россия",
      requiredFocus: "restore-union-state",
      requirements: {
        ideology: "socialist",
        reforms: ["central-planning", "union-treaty"],
        laws: { economy: ["war", "total"], conscription: ["extensive", "service"] },
        controlCountries: ["Белоруссия", "Казахстан", "Украина"],
      },
      color: "#b71924",
      description: "Восстановить союзное государство после завершения политической ветки фокусов.",
      reward: { politicalPower: 120, stability: 8, factories: 8, manpower: 300, steel: 40, oil: 25 },
    },
    european_federation: {
      name: "Европейская федерация",
      requiredCountry: "Германия",
      requiredFocus: "de-grand-design",
      color: "#2454a6",
      description: "Объединить европейский блок в федеративный проект.",
      reward: { politicalPower: 90, stability: 8, factories: 6, rare: 25 },
    },
    pan_asian_union: {
      name: "Паназиатский союз",
      requiredCountry: "Китайская Народная Республика",
      requiredFocus: "asian-commonwealth",
      color: "#b83b2d",
      description: "Оформить долгосрочный экономический и военный союз Азии.",
      reward: { politicalPower: 100, factories: 8, food: 60, rare: 35 },
    },
  };

  const ORGANIZATION_TEMPLATES = [
    { id: "un", name: "ООН", global: true, rule: () => true },
    { id: "nato", name: "НАТО", global: false, relation: 35, rule: (country) => /США|Канада|Великобритания|Франция|Германия|Италия|Испания|Польша|Норвегия|Финляндия|Швеция|Турция|Нидерланды|Бельгия|Дания|Португалия|Чехия|Румыния|Болгария|Греция|Эстония|Латвия|Литва|Словакия|Словения|Хорватия|Албания|Черногория|Северная Македония|Исландия|Люксембург|Венгрия/i.test(country.name) },
    { id: "csto", name: "ОДКБ", global: false, relation: 30, rule: (country) => /Россия|Беларусь|Белоруссия|Казахстан|Киргизия|Таджикистан|Армения/i.test(country.name) },
    { id: "eu", name: "Европейский союз", global: false, relation: 25, rule: (country) => /Германия|Франция|Италия|Испания|Польша|Нидерланды|Бельгия|Дания|Швеция|Финляндия|Австрия|Ирландия|Португалия|Греция|Чехия|Словакия|Словения|Хорватия|Румыния|Болгария|Венгрия|Литва|Латвия|Эстония|Кипр|Мальта|Люксембург/i.test(country.name) },
    { id: "brics", name: "БРИКС", global: false, relation: 20, rule: (country) => /Бразилия|Россия|Индия|Китай|ЮАР|Египет|Эфиопия|Иран|ОАЭ|Сауд/i.test(country.name) },
    { id: "au", name: "Африканский союз", global: false, relation: 15, rule: (country) => /Африка|Алжир|Ангола|Египет|Эфиопия|Кения|Марокко|Нигерия|ЮАР|Судан|Танзания|Тунис|Уганда|Гана|Сенегал|Мали|Нигер|Чад|Конго|Камерун|Ливия/i.test(country.name) },
    { id: "sco", name: "ШОС", global: false, relation: 20, rule: (country) => /Россия|Китай|Индия|Пакистан|Казахстан|Киргизия|Таджикистан|Узбекистан|Иран|Беларусь|Белоруссия/i.test(country.name) },
    { id: "eaeu", name: "ЕАЭС", global: false, relation: 25, rule: (country) => /Россия|Беларусь|Белоруссия|Казахстан|Киргизия|Армения/i.test(country.name) },
    { id: "cis", name: "СНГ", global: false, relation: 15, rule: (country) => /Россия|Беларусь|Белоруссия|Казахстан|Киргизия|Таджикистан|Узбекистан|Азербайджан|Армения|Молдавия/i.test(country.name) },
    { id: "asean", name: "АСЕАН", global: false, relation: 18, rule: (country) => /Индонезия|Малайзия|Филиппины|Сингапур|Таиланд|Бруней|Вьетнам|Лаос|Мьянма|Камбоджа/i.test(country.name) },
    { id: "arab_league", name: "Лига арабских государств", global: false, relation: 15, rule: (country) => /Алжир|Бахрейн|Коморы|Джибути|Египет|Ирак|Иордания|Кувейт|Ливан|Ливия|Мавритания|Марокко|Оман|Палестина|Катар|Сауд|Сомали|Судан|Сирия|Тунис|ОАЭ|Йемен/i.test(country.name) },
    { id: "gcc", name: "Совет сотрудничества арабских государств Залива", global: false, relation: 22, rule: (country) => /Бахрейн|Кувейт|Оман|Катар|Сауд|ОАЭ/i.test(country.name) },
    { id: "opec", name: "ОПЕК", global: false, relation: 12, rule: (country) => /Алжир|Конго|Экваториальная Гвинея|Габон|Иран|Ирак|Кувейт|Ливия|Нигерия|Сауд|ОАЭ|Венесуэла/i.test(country.name) },
    { id: "oecd", name: "ОЭСР", global: false, relation: 18, rule: (country) => /США|Канада|Мексика|Чили|Колумбия|Коста-Рика|Великобритания|Франция|Германия|Италия|Испания|Польша|Нидерланды|Бельгия|Дания|Швеция|Финляндия|Норвегия|Исландия|Ирландия|Португалия|Греция|Чехия|Словакия|Словения|Эстония|Латвия|Литва|Австрия|Швейцария|Турция|Израиль|Япония|Южная Корея|Австралия|Новая Зеландия/i.test(country.name) },
    { id: "g7", name: "G7", global: false, relation: 30, rule: (country) => /США|Канада|Великобритания|Франция|Германия|Италия|Япония/i.test(country.name) },
    { id: "g20", name: "G20", global: false, relation: 10, rule: (country) => /США|Канада|Мексика|Бразилия|Аргентина|Великобритания|Франция|Германия|Италия|Россия|Турция|Сауд|ЮАР|Индия|Китай|Япония|Южная Корея|Индонезия|Австралия/i.test(country.name) },
    { id: "mercosur", name: "МЕРКОСУР", global: false, relation: 18, rule: (country) => /Аргентина|Бразилия|Парагвай|Уругвай|Боливия/i.test(country.name) },
    { id: "oas", name: "ОАГ", global: false, relation: 12, rule: (country) => /США|Канада|Мексика|Белиз|Гватемала|Гондурас|Сальвадор|Никарагуа|Коста-Рика|Панама|Куба|Доминикан|Гаити|Ямайка|Багам|Барбадос|Тринидад|Гренада|Колумбия|Венесуэла|Гайана|Суринам|Эквадор|Перу|Боливия|Чили|Аргентина|Уругвай|Парагвай|Бразилия/i.test(country.name) },
  ];

  const ORGANIZATION_ACTIVE_YEARS = {
    un: [1945, Infinity],
    nato: [1949, Infinity],
    csto: [2002, Infinity],
    eu: [1993, Infinity],
    brics: [2009, Infinity],
    au: [2002, Infinity],
    sco: [2001, Infinity],
    eaeu: [2015, Infinity],
    cis: [1991, Infinity],
    asean: [1967, Infinity],
    arab_league: [1945, Infinity],
    gcc: [1981, Infinity],
    opec: [1960, Infinity],
    oecd: [1961, Infinity],
    g7: [1975, Infinity],
    g20: [1999, Infinity],
    mercosur: [1991, Infinity],
    oas: [1948, Infinity],
  };

  const MILITARY_ORGANIZATION_IDS = new Set([
    "nato",
    "csto",
    "protestant_union",
    "catholic_league",
    "allies_ww1",
    "central_powers",
    "allies_ww2",
    "axis",
    "warsaw_pact",
  ]);

  const HISTORICAL_ORGANIZATION_TEMPLATES = [
    { id: "hre", name: "Священная Римская империя", start: 1600, end: 1806, relation: 18, rule: (country) => /Австрия|Германия|Чехия|Швейцария|Нидерланды|Бельгия|Люксембург|Словения|Италия/i.test(country.name) },
    { id: "hanseatic", name: "Ганзейская торговая зона", start: 1600, end: 1669, relation: 14, trade: true, rule: (country) => /Германия|Нидерланды|Дания|Швеция|Норвегия|Польша|Литва|Латвия|Эстония/i.test(country.name) },
    { id: "protestant_union", name: "Протестантский союз", start: 1608, end: 1621, relation: 25, rule: (country) => /Германия|Дания|Швеция|Нидерланды|Великобритания|Чехия/i.test(country.name) },
    { id: "catholic_league", name: "Католическая лига", start: 1609, end: 1635, relation: 25, rule: (country) => /Австрия|Испания|Бавария|Польша|Италия|Бельгия/i.test(country.name) },
    { id: "league_of_nations", name: "Лига Наций", start: 1920, end: 1946, global: true, rule: () => true },
    { id: "allies_ww1", name: "Антанта", start: 1914, end: 1918, relation: 35, rule: (country) => /Россия|Франция|Великобритания|Сербия|Бельгия|Италия|США|Румыния|Греция|Япония/i.test(country.name) },
    { id: "central_powers", name: "Центральные державы", start: 1914, end: 1918, relation: 35, rule: (country) => /Германия|Австрия|Венгрия|Осман|Турция|Болгария/i.test(country.name) },
    { id: "allies_ww2", name: "Антигитлеровская коалиция", start: 1939, end: 1945, relation: 35, rule: (country) => /США|Великобритания|Франция|СССР|Россия|Китай|Польша|Канада|Австралия|Новая Зеландия|Индия|Бразилия|ЮАР/i.test(country.name) },
    { id: "axis", name: "Ось", start: 1936, end: 1945, relation: 35, rule: (country) => /Германия|Италия|Япония|Венгрия|Румыния|Болгария|Словакия|Хорватия|Таиланд/i.test(country.name) },
    { id: "warsaw_pact", name: "Варшавский договор", start: 1955, end: 1991, relation: 32, rule: (country) => /Россия|СССР|Польша|ГДР|Германия|Чех|Словакия|Венгрия|Румыния|Болгария|Албания/i.test(country.name) },
    { id: "comecon", name: "СЭВ", start: 1949, end: 1991, relation: 20, trade: true, rule: (country) => /Россия|СССР|Польша|Германия|Чех|Словакия|Венгрия|Румыния|Болгария|Куба|Монголия|Вьетнам/i.test(country.name) },
    { id: "non_aligned", name: "Движение неприсоединения", start: 1961, end: Infinity, relation: 12, rule: (country) => /Индия|Индонезия|Египет|Югослав|Сербия|Гана|Алжир|Куба|Иран|Ирак|Сирия|Вьетнам|ЮАР|Эфиопия|Венесуэла/i.test(country.name) },
  ];

  const HISTORICAL_WAR_TEMPLATES = [
    { id: "eighty_years", name: "Восьмидесятилетняя война", start: 1600, end: 1648, attackers: /Нидерланды/i, defenders: /Испания/i },
    { id: "thirty_years", name: "Тридцатилетняя война", start: 1618, end: 1648, attackers: /Швеция|Франция|Дания|Нидерланды|Чехия/i, defenders: /Австрия|Испания|Германия/i },
    { id: "russo_polish_1609", name: "Русско-польская война", start: 1609, end: 1618, attackers: /Польша/i, defenders: /Россия/i },
    { id: "franco_spanish", name: "Франко-испанская война", start: 1635, end: 1659, attackers: /Франция/i, defenders: /Испания/i },
    { id: "great_northern", name: "Северная война", start: 1700, end: 1721, attackers: /Россия|Дания|Польша|Саксония/i, defenders: /Швеция/i },
    { id: "spanish_succession", name: "Война за испанское наследство", start: 1701, end: 1714, attackers: /Австрия|Великобритания|Нидерланды|Португалия/i, defenders: /Франция|Испания/i },
    { id: "seven_years", name: "Семилетняя война", start: 1756, end: 1763, attackers: /Великобритания|Пруссия|Германия|Португалия/i, defenders: /Франция|Австрия|Россия|Испания|Швеция/i },
    { id: "american_revolution", name: "Война за независимость США", start: 1775, end: 1783, attackers: /США/i, defenders: /Великобритания/i },
    { id: "napoleonic", name: "Наполеоновские войны", start: 1803, end: 1815, attackers: /Франция/i, defenders: /Великобритания|Россия|Австрия|Пруссия|Германия|Испания|Португалия|Швеция/i },
    { id: "crimean", name: "Крымская война", start: 1853, end: 1856, attackers: /Великобритания|Франция|Осман|Турция|Сардиния|Италия/i, defenders: /Россия/i },
    { id: "ww1_west", name: "Первая мировая война", start: 1914, end: 1918, attackers: /Германия|Австрия|Венгрия|Осман|Турция|Болгария/i, defenders: /Россия|Франция|Великобритания|Сербия|Бельгия|Италия|США|Румыния|Греция/i },
    { id: "russian_civil", name: "Гражданская война в России", start: 1918, end: 1922, attackers: /Россия/i, defenders: /Украина|Польша|Финляндия|Эстония|Латвия|Литва|Грузия|Армения|Азербайджан/i },
    { id: "ww2_europe", name: "Вторая мировая война в Европе", start: 1939, end: 1945, attackers: /Германия|Италия|Венгрия|Румыния|Болгария|Словакия|Хорватия/i, defenders: /Польша|Франция|Великобритания|Россия|СССР|США|Канада|Бельгия|Нидерланды|Греция|Югослав|Сербия/i },
    { id: "ww2_pacific", name: "Вторая мировая война на Тихом океане", start: 1941, end: 1945, attackers: /Япония/i, defenders: /США|Китай|Великобритания|Австралия|Новая Зеландия|Филиппины|Нидерланды/i },
    { id: "korean_war", name: "Корейская война", start: 1950, end: 1953, attackers: /Северная Корея|КНДР|Китай/i, defenders: /Южная Корея|США/i },
    { id: "vietnam_war", name: "Война во Вьетнаме", start: 1955, end: 1975, attackers: /Вьетнам/i, defenders: /США|Южный Вьетнам/i },
    { id: "iran_iraq", name: "Ирано-иракская война", start: 1980, end: 1988, attackers: /Ирак/i, defenders: /Иран/i },
    { id: "gulf_war", name: "Война в Персидском заливе", start: 1990, end: 1991, attackers: /Ирак/i, defenders: /Кувейт|США|Сауд|Великобритания|Франция/i },
    { id: "afghanistan_2001", name: "Война в Афганистане", start: 2001, end: 2021, attackers: /США|Великобритания|Канада|Германия|Франция|Италия/i, defenders: /Афганистан/i },
    { id: "iraq_2003", name: "Иракская война", start: 2003, end: 2011, attackers: /США|Великобритания|Польша|Австралия/i, defenders: /Ирак/i },
    { id: "syria", name: "Сирийская война", start: 2011, end: Infinity, attackers: /Сирия/i, defenders: /США|Турция|Израиль/i },
    { id: "yemen", name: "Война в Йемене", start: 2015, end: Infinity, attackers: /Сауд|ОАЭ/i, defenders: /Йемен/i },
    { id: "russia_ukraine", name: "Российско-украинский конфликт", start: 2014, end: Infinity, attackers: /Россия/i, defenders: /Украина/i },
  ];

  const HISTORICAL_RELATION_RULES = [
    { start: 1600, end: 1700, a: /Франция/i, b: /Испания|Австрия/i, value: -45 },
    { start: 1700, end: 1815, a: /Великобритания/i, b: /Франция/i, value: -55 },
    { start: 1815, end: 1853, a: /Великобритания|Франция|Австрия/i, b: /Россия/i, value: -25 },
    { start: 1914, end: 1918, a: /Германия|Австрия|Венгрия|Осман|Турция|Болгария/i, b: /Россия|Франция|Великобритания|США|Сербия|Бельгия/i, value: -100 },
    { start: 1939, end: 1945, a: /Германия|Италия|Япония/i, b: /США|Великобритания|Франция|Россия|СССР|Китай|Польша/i, value: -100 },
    { start: 1947, end: 1991, a: /США|Великобритания|Франция|Германия|Канада/i, b: /Россия|СССР|Польша|Китай|Куба|Вьетнам/i, value: -45 },
    { start: 1947, end: Infinity, a: /Индия/i, b: /Пакистан/i, value: -55 },
    { start: 1948, end: Infinity, a: /Израиль/i, b: /Палестина|Сирия|Ливан|Иран/i, value: -60 },
    { start: 1979, end: Infinity, a: /США/i, b: /Иран/i, value: -60 },
    { start: 1991, end: Infinity, a: /Россия/i, b: /Беларусь|Белоруссия/i, value: 90 },
    { start: 1991, end: Infinity, a: /Россия/i, b: /Казахстан|Киргизия|Таджикистан|Китай|Индия|Иран/i, value: 35 },
    { start: 2014, end: Infinity, a: /Россия/i, b: /Украина|США|Великобритания|Польша|Литва|Латвия|Эстония/i, value: -80 },
  ];

  const HISTORICAL_TRADE_RULES = [
    { start: 1600, end: 1800, from: /Нидерланды|Великобритания|Испания|Португалия/i, to: /Франция|Германия|Дания|Швеция/i, category: "raw" },
    { start: 1800, end: 1914, from: /Великобритания|Франция|Германия|США/i, to: /Россия|Осман|Турция|Китай|Япония|Бразилия|Аргентина/i, category: "industry" },
    { start: 1945, end: 1991, from: /США|Канада|Великобритания|Франция|Германия|Япония/i, to: /США|Канада|Великобритания|Франция|Германия|Япония|Италия/i, category: "industry" },
    { start: 1949, end: 1991, from: /Россия|СССР|Польша|Румыния|Болгария|Венгрия/i, to: /Россия|СССР|Польша|Румыния|Болгария|Венгрия|Куба|Вьетнам/i, category: "raw" },
    { start: 1960, end: Infinity, from: /Сауд|ОАЭ|Кувейт|Ирак|Иран|Алжир|Нигерия|Венесуэла/i, to: /США|Китай|Индия|Япония|Германия|Франция|Италия|Южная Корея/i, category: "energy" },
    { start: 1991, end: Infinity, from: /Китай|Германия|США|Япония|Южная Корея/i, to: /США|Китай|Россия|Германия|Франция|Индия|Бразилия|Казахстан/i, category: "industry" },
    { start: 1991, end: Infinity, from: /Россия|Казахстан|Бразилия|Аргентина|Украина/i, to: /Китай|Индия|Турция|Германия|Египет/i, category: "food" },
  ];

  const DOMESTIC_DECISIONS = [
    {
      id: "mobilize",
      name: "Частичная мобилизация",
      cost: 45,
      text: "Увеличивает людские ресурсы и поддержку войны, но снижает стабильность.",
      apply(state) {
        state.manpower += 80;
        state.warSupport += 8;
        state.stability -= 4;
      },
    },
    {
      id: "industry",
      name: "Военные заказы",
      cost: 55,
      text: "Добавляет фабрики и ускоряет военную экономику.",
      apply(state) {
        state.factories += 3;
        state.resources.steel += 12;
      },
    },
    {
      id: "welfare",
      name: "Социальная программа",
      cost: 35,
      text: "Повышает стабильность и снижает внутреннее напряжение.",
      apply(state) {
        state.stability += 7;
        state.warSupport -= 2;
      },
    },
    {
      id: "security",
      name: "Контрразведка",
      cost: 40,
      text: "Укрепляет внутреннюю безопасность и дипломатическую устойчивость.",
      apply(state) {
        state.stability += 3;
        state.politicalPower += 10;
      },
    },
  ];

  const LAW_GROUPS = {
    economy: {
      label: "Экономический закон",
      options: [
        { id: "civilian", name: "Гражданская экономика", cost: 0, effects: { stability: 4, factoryOutput: -0.05, consumerGoods: 0.35 } },
        { id: "partial", name: "Частичная мобилизация", cost: 80, effects: { warSupport: 4, factoryOutput: 0.08, consumerGoods: 0.25 } },
        { id: "war", name: "Военная экономика", cost: 140, effects: { warSupport: 8, factoryOutput: 0.18, consumerGoods: 0.16 } },
        { id: "total", name: "Тотальная мобилизация", cost: 220, effects: { warSupport: 12, stability: -5, factoryOutput: 0.3, consumerGoods: 0.08 } },
      ],
    },
    conscription: {
      label: "Закон о призыве",
      options: [
        { id: "volunteer", name: "Добровольцы", cost: 0, effects: { recruitable: 0.01, stability: 3 } },
        { id: "limited", name: "Ограниченный призыв", cost: 70, effects: { recruitable: 0.025, warSupport: 3 } },
        { id: "extensive", name: "Расширенный призыв", cost: 130, effects: { recruitable: 0.05, stability: -2, warSupport: 5 } },
        { id: "service", name: "Служба по требованию", cost: 210, effects: { recruitable: 0.09, stability: -6, factoryOutput: -0.06 } },
      ],
    },
    trade: {
      label: "Торговый закон",
      options: [
        { id: "closed", name: "Закрытая экономика", cost: 0, effects: { resourceGain: 0.12, relationsGain: -0.05 } },
        { id: "limited", name: "Ограниченный экспорт", cost: 60, effects: { resourceGain: 0.04, factoryOutput: 0.03 } },
        { id: "export", name: "Экспортный фокус", cost: 100, effects: { resourceGain: -0.04, factoryOutput: 0.08, relationsGain: 0.06 } },
        { id: "free", name: "Свободная торговля", cost: 140, effects: { resourceGain: -0.1, factoryOutput: 0.14, relationsGain: 0.1 } },
      ],
    },
  };

  const ADVISORS = [
    { id: "captain-industry", name: "Капитан промышленности", role: "экономика", cost: 90, effects: { factories: 1, factoryOutput: 0.07 } },
    { id: "army-reformer", name: "Реформатор армии", role: "армия", cost: 90, effects: { commandPower: 20, armyXp: 18 } },
    { id: "silent-workhorse", name: "Тихий администратор", role: "политика", cost: 110, effects: { politicalPowerDaily: 0.4 } },
    { id: "diplomat", name: "Опытный дипломат", role: "дипломатия", cost: 80, effects: { relationsGain: 0.12, intel: 10 } },
    { id: "intelligence-chief", name: "Глава разведки", role: "разведка", cost: 85, effects: { intel: 25 } },
  ];

  const DOCTRINES = [
    { id: "mobile-warfare", name: "Маневренная война", cost: 35, effects: { armySpeed: 0.18, commandPower: 10 } },
    { id: "superior-firepower", name: "Превосходство огня", cost: 35, effects: { armyAttack: 0.16, steel: -5 } },
    { id: "grand-battleplan", name: "Глубокое планирование", cost: 35, effects: { entrenchment: 0.2, stability: 2 } },
    { id: "mass-assault", name: "Массовый натиск", cost: 35, effects: { manpower: 120, armyAttack: 0.05 } },
  ];

  const CONSTRUCTION_PROJECTS = [
    { id: "infrastructure", name: "Инфраструктура", cost: { budget: 18, steel: 4 }, days: 45, effects: { economy: 5, gdp: 3, food: 4 } },
    { id: "civilian-factory", name: "Гражданская фабрика", cost: { budget: 28, steel: 8 }, days: 70, effects: { factories: 1, gdp: 6 } },
    { id: "military-factory", name: "Военный завод", cost: { budget: 32, steel: 12 }, days: 80, effects: { factories: 1, warSupport: 1, steel: 3 } },
    { id: "air-defense", name: "ПВО региона", cost: { budget: 24, steel: 7, rare: 2 }, days: 55, effects: { airDefense: 1, stability: 1 } },
    { id: "supply-hub", name: "Узел снабжения", cost: { budget: 26, steel: 6, oil: 2 }, days: 60, effects: { supply: 1, readySoldiers: 120 } },
    { id: "naval-base", name: "Военная база", cost: { budget: 30, steel: 9 }, days: 75, effects: { base: true, commandPower: 8 } },
    { id: "refinery", name: "НПЗ", cost: { budget: 36, steel: 10, oil: 4 }, days: 85, effects: { building: "refinery", oil: 12, economy: 4, gdp: 5 } },
    { id: "mine", name: "Добывающий комплекс", cost: { budget: 34, steel: 8 }, days: 80, effects: { building: "mine", steel: 10, rare: 4, economy: 3 } },
    { id: "agro-complex", name: "Агрокомплекс", cost: { budget: 22, steel: 3 }, days: 50, effects: { building: "agro", food: 16, economy: 2 } },
    { id: "tech-park", name: "Технопарк", cost: { budget: 42, steel: 8, rare: 4 }, days: 95, effects: { building: "tech", rare: 8, gdp: 9, economy: 5 } },
  ];

  const INTELLIGENCE_OPERATIONS = [
    { id: "network", name: "Создать сеть агентов", cost: { intel: 15, politicalPower: 25 }, days: 35, effects: { intel: 35 } },
    { id: "propaganda", name: "Пропагандистская кампания", cost: { intel: 10, politicalPower: 20 }, days: 28, effects: { targetStability: -4, relation: -8 } },
    { id: "sabotage", name: "Саботаж заводов", cost: { intel: 25, politicalPower: 35 }, days: 45, effects: { targetFactories: -1, relation: -18 } },
    { id: "steal-blueprints", name: "Похитить чертежи", cost: { intel: 30, politicalPower: 30 }, days: 50, effects: { rare: 15, armyXp: 10 } },
  ];

  const PRODUCTION_LINES = [
    {
      id: "infantry",
      name: "Пехотное оснащение",
      text: "Дешевое вооружение для мобилизации и обороны.",
      cost: { steel: 2 },
      days: 18,
      apply(state) {
        state.manpower += 12;
        state.commandPower = clamp(state.commandPower + 2, 0, 100);
      },
    },
    {
      id: "armor",
      name: "Бронетехника",
      text: "Тяжелая линия для наступательных операций.",
      cost: { steel: 7, oil: 3 },
      days: 42,
      apply(state) {
        state.warSupport = clamp(state.warSupport + 2, 0, 100);
        state.commandPower = clamp(state.commandPower + 7, 0, 100);
      },
    },
    {
      id: "air",
      name: "Авиация",
      text: "Повышает оперативный потенциал и расход редких ресурсов.",
      cost: { steel: 4, rare: 4, oil: 2 },
      days: 36,
      apply(state) {
        state.commandPower = clamp(state.commandPower + 6, 0, 100);
      },
    },
    {
      id: "civilian",
      name: "Гражданские заводы",
      text: "Долгая инвестиция в экономику и будущие ресурсы.",
      cost: { steel: 5, food: 2 },
      days: 55,
      apply(state) {
        state.factories += 1;
        state.stability = clamp(state.stability + 1, 0, 100);
      },
    },
  ];

  const RESEARCH_PROJECTS = [
    {
      id: "logistics",
      name: "Военная логистика",
      days: 80,
      text: "Снижает ежедневный расход нефти и стали во время войн.",
    },
    {
      id: "automation",
      name: "Автоматизация заводов",
      days: 95,
      text: "Ускоряет производство на 20%.",
    },
    {
      id: "cyber",
      name: "Киберразведка",
      days: 70,
      text: "Удешевляет улучшение отношений и разведоперации.",
    },
    {
      id: "agrotech",
      name: "Агротехнологии",
      days: 65,
      text: "Повышает ежемесячный прирост продовольствия.",
    },
    {
      id: "nuclear-engineering",
      name: "Ядерная инженерия",
      days: 120,
      text: "Открывает национальную ядерную программу для стран без арсенала.",
    },
  ];

  const MAJOR_FOCUS_TREES = {
    "Россия": [
      { id: "sovereign-course", name: "Суверенный курс", text: "Сконцентрировать политическую власть и открыть ключевые направления стратегии.", reward: { politicalPower: 35, stability: 4 }, x: 3, y: 1 },
      { id: "national-projects", name: "Национальные проекты", text: "Ускорить гражданское строительство, инфраструктуру и региональную экономику.", reward: { factories: 3, stability: 3 }, x: 1, y: 2, requires: ["sovereign-course"] },
      { id: "industrial-clusters", name: "Промышленные кластеры", text: "Развернуть новые производственные цепочки вокруг ключевых городов.", reward: { factories: 5, steel: 20 }, x: 1, y: 3, requires: ["national-projects"] },
      { id: "import-substitution", name: "Импортозамещение", text: "Снизить зависимость от внешней торговли за счет внутреннего производства.", reward: { factories: 3, rare: 15, politicalPower: 15 }, x: 1, y: 4, requires: ["industrial-clusters"] },
      { id: "energy-superpower", name: "Энергетическая держава", text: "Увеличить добычу и использовать энергоресурсы как экономический рычаг.", reward: { oil: 45, politicalPower: 20 }, x: 2, y: 2, requires: ["sovereign-course"] },
      { id: "arctic-logistics", name: "Арктическая логистика", text: "Развить северные маршруты и ресурсные регионы.", reward: { oil: 25, steel: 15, gdp: 20 }, x: 2, y: 3, requires: ["energy-superpower"] },
      { id: "strategic-deterrence", name: "Стратегическое сдерживание", text: "Укрепить оборонную готовность и командный резерв.", reward: { warSupport: 8, commandPower: 30 }, x: 4, y: 2, requires: ["sovereign-course"] },
      { id: "army-modernization", name: "Модернизация армии", text: "Обновить оснащение, структуру войск и систему снабжения.", reward: { manpower: 120, commandPower: 25, steel: 20 }, x: 4, y: 3, requires: ["strategic-deterrence"] },
      { id: "mobilization-reserve", name: "Мобилизационный резерв", text: "Подготовить резервы и склады длительного конфликта.", reward: { manpower: 180, warSupport: 6 }, x: 4, y: 4, requires: ["army-modernization"] },
      { id: "eurasian-partnership", name: "Евразийское партнерство", text: "Расширить связи с союзниками и торговыми коридорами.", reward: { politicalPower: 35, food: 25 }, x: 5, y: 2, requires: ["sovereign-course"] },
      { id: "brics-agenda", name: "Повестка БРИКС", text: "Укрепить многополярные институты и финансовые связи.", reward: { politicalPower: 45, rare: 20 }, x: 5, y: 3, requires: ["eurasian-partnership"] },
      { id: "union-memory", name: "Союзная память", text: "Подготовить политическую базу для нового интеграционного проекта.", reward: { politicalPower: 45, stability: 3 }, x: 6, y: 2, requires: ["sovereign-course"] },
      { id: "common-security-space", name: "Общее пространство безопасности", text: "Согласовать оборонные механизмы с ближайшими партнерами.", reward: { commandPower: 35, warSupport: 5 }, x: 6, y: 3, requires: ["union-memory", "eurasian-partnership"] },
      { id: "common-ruble-zone", name: "Общая расчетная зона", text: "Свести торговлю и валютные расчеты союзников в единую систему.", reward: { politicalPower: 35, gdp: 35 }, x: 6, y: 4, requires: ["common-security-space", "brics-agenda"] },
      { id: "union-referendums", name: "Союзные референдумы", text: "Провести политическую подготовку к новому союзному договору.", reward: { stability: 6, politicalPower: 60 }, x: 5, y: 5, requires: ["common-ruble-zone", "mobilization-reserve"] },
      { id: "restore-union-state", name: "Восстановить СССР", text: "Открывает решение формирования СССР во вкладке внутренней политики.", reward: { politicalPower: 100, stability: 5 }, x: 4, y: 6, requires: ["union-referendums", "multipolar-architecture"] },
      { id: "multipolar-architecture", name: "Многополярная архитектура", text: "Свести экономику, дипломатию и оборону в единый стратегический курс.", reward: { politicalPower: 70, stability: 6, factories: 3 }, x: 3, y: 5, requires: ["import-substitution", "arctic-logistics", "mobilization-reserve", "brics-agenda"] },
    ],
    "США": [
      { id: "global-leadership", name: "Глобальное лидерство", text: "Собрать политический капитал для внешнеполитического курса.", reward: { politicalPower: 45, stability: 2 }, x: 3, y: 1 },
      { id: "nato-readiness", name: "Готовность НАТО", text: "Усилить союзную координацию и военное планирование.", reward: { commandPower: 25, warSupport: 5 }, x: 1, y: 2, requires: ["global-leadership"] },
      { id: "atlantic-bases", name: "Атлантические базы", text: "Расширить сеть баз и логистику союзников.", reward: { commandPower: 25, oil: 15 }, x: 1, y: 3, requires: ["nato-readiness"] },
      { id: "arsenal-contracts", name: "Арсенал контрактов", text: "Увеличить оборонное производство и складские запасы.", reward: { factories: 6, steel: 35 }, x: 2, y: 2, requires: ["global-leadership"] },
      { id: "shipyards-and-air", name: "Верфи и авиация", text: "Сделать ставку на флот, авиацию и высокоточное производство.", reward: { factories: 4, rare: 25, commandPower: 15 }, x: 2, y: 3, requires: ["arsenal-contracts"] },
      { id: "pacific-pivot", name: "Тихоокеанский разворот", text: "Сместить внимание к Индо-Тихоокеанскому региону.", reward: { politicalPower: 30, oil: 25 }, x: 4, y: 2, requires: ["global-leadership"] },
      { id: "semiconductor-act", name: "Полупроводниковый акт", text: "Нарастить критические технологии и редкие ресурсы.", reward: { rare: 45, factories: 3 }, x: 4, y: 3, requires: ["pacific-pivot"] },
      { id: "energy-independence", name: "Энергетическая независимость", text: "Укрепить добычу, переработку и стратегические резервы.", reward: { oil: 50, stability: 2 }, x: 5, y: 2, requires: ["global-leadership"] },
      { id: "domestic-resilience", name: "Внутренняя устойчивость", text: "Снизить политические риски и социальное напряжение.", reward: { stability: 10, food: 25 }, x: 5, y: 3, requires: ["energy-independence"] },
      { id: "dollar-network", name: "Долларовая сеть", text: "Усилить влияние валюты и иностранных активов.", reward: { politicalPower: 40, budget: 60, gdp: 25 }, x: 6, y: 2, requires: ["global-leadership"] },
      { id: "asset-screening", name: "Контроль активов", text: "Расширить возможности давления через иностранные активы.", reward: { intel: 25, politicalPower: 25 }, x: 6, y: 3, requires: ["dollar-network"] },
      { id: "continental-investment", name: "Континентальные инвестиции", text: "Разогнать внутренний спрос и строительство.", reward: { factories: 4, gdp: 45, stability: 3 }, x: 5, y: 4, requires: ["domestic-resilience", "asset-screening"] },
      { id: "rules-based-order", name: "Порядок союзов", text: "Свести военные, технологические и дипломатические направления.", reward: { politicalPower: 80, warSupport: 8, factories: 3 }, x: 3, y: 5, requires: ["atlantic-bases", "shipyards-and-air", "semiconductor-act", "domestic-resilience"] },
      { id: "global-interoperability", name: "Глобальная совместимость", text: "Сделать союзные армии и базы единой системой.", reward: { commandPower: 45, warSupport: 5, oil: 20 }, x: 2, y: 5, requires: ["rules-based-order", "continental-investment"] },
    ],
    "Китай": [
      { id: "national-rejuvenation", name: "Национальное возрождение", text: "Собрать ресурсы партии, экономики и армии вокруг долгого курса.", reward: { politicalPower: 45, stability: 4 }, x: 3, y: 1 },
      { id: "made-in-china", name: "Сделано в Китае", text: "Укрепить промышленность и экспортные цепочки.", reward: { factories: 7, steel: 30 }, x: 1, y: 2, requires: ["national-rejuvenation"] },
      { id: "automation-drive", name: "Автоматизация заводов", text: "Повысить выпуск и технологичность производства.", reward: { factories: 5, rare: 20 }, x: 1, y: 3, requires: ["made-in-china"] },
      { id: "belt-and-road", name: "Пояс и путь", text: "Развить торговые маршруты, кредиты и инфраструктурные связи.", reward: { politicalPower: 35, food: 35 }, x: 2, y: 2, requires: ["national-rejuvenation"] },
      { id: "resource-security", name: "Безопасность ресурсов", text: "Диверсифицировать поставки нефти, стали и редких ресурсов.", reward: { oil: 30, steel: 20, rare: 25 }, x: 2, y: 3, requires: ["belt-and-road"] },
      { id: "civil-military-fusion", name: "Военно-гражданский сплав", text: "Связать промышленность и оборонные программы.", reward: { commandPower: 30, manpower: 120 }, x: 4, y: 2, requires: ["national-rejuvenation"] },
      { id: "modern-theater-command", name: "Новые округа", text: "Улучшить управление армиями и готовность войск.", reward: { commandPower: 35, warSupport: 7 }, x: 4, y: 3, requires: ["civil-military-fusion"] },
      { id: "internal-harmony", name: "Внутренняя гармония", text: "Стабилизировать общество и региональное развитие.", reward: { stability: 10, gdp: 25 }, x: 5, y: 2, requires: ["national-rejuvenation"] },
      { id: "digital-yuan", name: "Цифровой юань", text: "Усилить финансовую самостоятельность и торговую сеть.", reward: { politicalPower: 45, gdp: 35 }, x: 5, y: 3, requires: ["internal-harmony"] },
      { id: "yuan-clearing", name: "Клиринг в юанях", text: "Расширить расчеты в национальной валюте.", reward: { budget: 55, politicalPower: 35 }, x: 6, y: 3, requires: ["digital-yuan", "belt-and-road"] },
      { id: "regional-development-bank", name: "Банк развития региона", text: "Сконцентрировать инвестиции в инфраструктуру партнеров.", reward: { gdp: 50, factories: 3 }, x: 6, y: 4, requires: ["yuan-clearing"] },
      { id: "asian-commonwealth", name: "Азиатское содружество", text: "Открывает формирование Паназиатского союза.", reward: { politicalPower: 80, stability: 4 }, x: 5, y: 5, requires: ["regional-development-bank", "modern-theater-command"] },
      { id: "shared-future", name: "Сообщество единой судьбы", text: "Объединить промышленный, военный и дипломатический вектор.", reward: { politicalPower: 75, factories: 4, stability: 5 }, x: 3, y: 5, requires: ["automation-drive", "resource-security", "modern-theater-command", "digital-yuan"] },
    ],
    "Украина": [
      { id: "wartime-cabinet", name: "Военный кабинет", text: "Сконцентрировать управление и ресурсы вокруг обороны.", reward: { politicalPower: 35, warSupport: 8 }, x: 3, y: 1 },
      { id: "territorial-defense", name: "Территориальная оборона", text: "Укрепить местные резервы и готовность регионов.", reward: { manpower: 130, stability: 3 }, x: 1, y: 2, requires: ["wartime-cabinet"] },
      { id: "fortified-lines", name: "Укрепленные линии", text: "Построить оборонные позиции и склады снабжения.", reward: { commandPower: 25, steel: 25 }, x: 1, y: 3, requires: ["territorial-defense"] },
      { id: "partner-aid", name: "Помощь партнеров", text: "Получить вооружение, ресурсы и политическую поддержку.", reward: { politicalPower: 35, steel: 30, rare: 20 }, x: 2, y: 2, requires: ["wartime-cabinet"] },
      { id: "security-guarantees", name: "Гарантии безопасности", text: "Сформировать сеть обязательств и военной помощи.", reward: { politicalPower: 45, commandPower: 20 }, x: 2, y: 3, requires: ["partner-aid"] },
      { id: "drone-industry", name: "Индустрия БПЛА", text: "Развернуть массовое производство дронов и электроники.", reward: { factories: 4, rare: 25, commandPower: 15 }, x: 4, y: 2, requires: ["wartime-cabinet"] },
      { id: "distributed-production", name: "Распределенное производство", text: "Сделать промышленность устойчивой к ударам и кризисам.", reward: { factories: 4, stability: 5 }, x: 4, y: 3, requires: ["drone-industry"] },
      { id: "grain-corridors", name: "Зерновые коридоры", text: "Сохранить экспорт продовольствия и доходы бюджета.", reward: { food: 55, gdp: 20 }, x: 5, y: 2, requires: ["wartime-cabinet"] },
      { id: "civil-resilience", name: "Гражданская устойчивость", text: "Укрепить энергетику, города и социальную поддержку.", reward: { stability: 10, politicalPower: 20 }, x: 5, y: 3, requires: ["grain-corridors"] },
      { id: "regional-reconstruction", name: "Восстановление регионов", text: "Направить бюджет и министров на экономический рост областей.", reward: { gdp: 30, factories: 2, stability: 4 }, x: 6, y: 3, requires: ["civil-resilience"] },
      { id: "defense-industrial-compact", name: "Оборонный индустриальный пакт", text: "Связать партнерскую помощь с собственным производством.", reward: { factories: 5, steel: 30, commandPower: 20 }, x: 4, y: 4, requires: ["security-guarantees", "distributed-production"] },
      { id: "black-sea-security", name: "Черноморская безопасность", text: "Сформировать долговременный контур баз и торговли.", reward: { commandPower: 30, food: 30, politicalPower: 25 }, x: 5, y: 4, requires: ["grain-corridors", "defense-industrial-compact"] },
      { id: "european-integration", name: "Европейская интеграция", text: "Свести оборону, экономику и дипломатию в долгосрочный курс.", reward: { politicalPower: 70, factories: 3, stability: 6 }, x: 3, y: 5, requires: ["fortified-lines", "security-guarantees", "distributed-production", "civil-resilience"] },
      { id: "euro-atlantic-lock", name: "Евроатлантическая фиксация", text: "Закрепить долгосрочные гарантии безопасности и экономики.", reward: { politicalPower: 90, stability: 5, rare: 25 }, x: 4, y: 6, requires: ["european-integration", "black-sea-security", "regional-reconstruction"] },
    ],
  };

  function buildBranch(prefix, title, rootId, x, startY, names, rewardFactory) {
    return names.map((name, index) => {
      const id = `${prefix}-${index + 1}`;
      return {
        id,
        name,
        text: `${title}: этап ${index + 1}. Решение усиливает долгую стратегию страны и открывает следующий шаг ветки.`,
        reward: rewardFactory(index),
        x,
        y: startY + index,
        requires: [index === 0 ? rootId : `${prefix}-${index}`],
      };
    });
  }

  function extendRussianFocusTree() {
    const tree = MAJOR_FOCUS_TREES["Россия"];
    if (!tree || tree.some((focus) => focus.id === "ru-economy-1")) return;
    const economy = buildBranch("ru-economy", "Экономическая мобилизация", "import-substitution", 1, 6, [
      "Федеральные индустриальные планы", "Станкостроительный контур", "Гражданские заводы Поволжья", "Сибирская переработка", "Уральский металлургический пояс",
      "Технологический заказ", "Рынок внутренних компонентов", "Большие стройки регионов", "Транспортный каркас", "Новые особые зоны",
      "Сырьевые биржи", "Промышленная кооперация", "Северные промышленные узлы", "Дальневосточные порты", "Национальная электроника",
      "Инвестиционный резерв", "Глубокая переработка", "Экспорт машин", "Производственный суверенитет", "Экономика длинной войны",
    ], (i) => ({ factories: i % 3 === 0 ? 2 : 1, steel: 8 + i, gdp: 4 + i }));
    const army = buildBranch("ru-army", "Военная реформа", "mobilization-reserve", 3, 7, [
      "Корпусная структура", "Единый штаб снабжения", "Резервные полигоны", "Дальняя артиллерия", "Разведывательные контуры",
      "Бронетанковые бригады", "Полевые склады", "Оперативные резервы", "Морская пехота", "Воздушно-космическая связь",
      "Система ПВО округов", "Беспилотные роты", "Штурмовые части", "Медицинская эвакуация", "Военные железные дороги",
      "Единая цифровая карта", "Резерв офицеров", "Боевой ремонт", "Оперативная глубина", "Армия постоянной готовности",
    ], (i) => ({ commandPower: 8 + i, manpower: 25 + i * 4, warSupport: i % 4 === 0 ? 2 : 1 }));
    const regions = buildBranch("ru-regions", "Региональная политика", "national-projects", 5, 6, [
      "Развитие агломераций", "Опорные города", "Северный завоз", "Новые университеты", "Кадровый резерв губернаторов",
      "Регионы роста", "Муниципальная экономика", "Социальные стандарты", "Медицина регионов", "Инженерные школы",
      "Жилищный контур", "Туристические кластеры", "Дорожный рывок", "Модернизация ЖКХ", "Региональные министры",
      "Сельские инвестиции", "Внутренняя миграция", "Макрорегионы", "Бюджетное выравнивание", "Стабильная федерация",
    ], (i) => ({ stability: i % 2 === 0 ? 2 : 1, gdp: 5 + i, food: 5 + i }));
    const diplomacy = buildBranch("ru-diplomacy", "Евразийская дипломатия", "brics-agenda", 7, 5, [
      "Южные коридоры", "Каспийские договоры", "Форум союзников", "Расчеты в нацвалютах", "Контуры БРИКС+",
      "Африканские миссии", "Азиатские рынки", "Ближневосточный баланс", "Латинская повестка", "Новые транспортные соглашения",
      "Экспорт безопасности", "Договоры о базах", "Право прохода союзников", "Совместные учения", "Антикризисная дипломатия",
      "Евразийский арбитраж", "Гуманитарные программы", "Координация в ООН", "Многополярный договор", "Континентальная архитектура",
    ], (i) => ({ politicalPower: 8 + i, oil: i % 3 === 0 ? 10 : 3, rare: i % 4 === 0 ? 8 : 2 }));
    const reforms = buildBranch("ru-reforms", "Союзные реформы", "common-ruble-zone", 9, 6, [
      "Проект союзного договора", "Общие стандарты бюджета", "Совместные министерства", "Союзная таможня", "Единые правила транзита",
      "Общий рынок труда", "Парламентская площадка", "Совет регионов", "Общие резервы", "Суд союзных споров",
      "Согласование валют", "Общие оборонные закупки", "Единая инфраструктура", "Союзные программы развития", "Общие фонды",
      "Синхронизация законов", "Интеграционные референдумы", "Союзная безопасность", "Конституционный пакет", "Государство союзов",
    ], (i) => ({ politicalPower: 10 + i, stability: i % 3 === 0 ? 3 : 1, budget: 6 + i }));
    const nuclear = buildBranch("ru-nuclear", "Ядерный контур", "strategic-deterrence", 11, 4, [
      "Модернизация триады", "Новые шахтные районы", "Мобильные комплексы", "Подводное сдерживание", "Стратегическая авиация",
      "Раннее предупреждение", "Защищенная связь", "Учения триады", "Ядерная доктрина", "Глубокие хранилища",
      "Реакторные мощности", "Обогащение топлива", "Безопасность объектов", "Научные центры", "Боеголовки резерва",
      "Сдерживание союзников", "Космический мониторинг", "Контроль эскалации", "Стратегический паритет", "Неприемлемый ущерб",
    ], (i) => ({ commandPower: 10 + i, warSupport: i % 2 === 0 ? 2 : 1, nuclearWarheads: i % 4 === 0 ? 1 : 0 }));
    tree.push(...economy, ...army, ...regions, ...diplomacy, ...reforms, ...nuclear);
    tree.push(
      { id: "ru-grand-strategy", name: "Единая стратегия России", text: "Свести экономику, армию, регионы, дипломатию и реформы в общий план.", reward: { politicalPower: 120, stability: 8, factories: 6, commandPower: 35 }, x: 6, y: 27, requires: ["ru-economy-20", "ru-army-20", "ru-regions-20", "ru-diplomacy-20", "ru-reforms-20"] },
      { id: "ru-strategic-final", name: "Стратегическое превосходство", text: "Финальный оборонно-ядерный контур повышает цену любой войны.", reward: { nuclearWarheads: 3, commandPower: 60, warSupport: 8 }, x: 10, y: 25, requires: ["ru-nuclear-20", "ru-grand-strategy"] }
    );
  }

  function makeNationalFocusTree(countryName, theme) {
    const root = `${theme}-course`;
    const tree = [
      { id: root, name: `${countryName}: национальный курс`, text: "Определить стратегию государства на 2026 год.", reward: { politicalPower: 40, stability: 3 }, x: 3, y: 1 },
      { id: `${theme}-industry`, name: "Промышленная программа", text: "Расширить заводы и региональные производственные цепочки.", reward: { factories: 4, steel: 20 }, x: 1, y: 2, requires: [root] },
      { id: `${theme}-resources`, name: "Ресурсная безопасность", text: "Закрепить снабжение сырьем, энергией и продовольствием.", reward: { oil: 20, food: 25, rare: 10 }, x: 1, y: 3, requires: [`${theme}-industry`] },
      { id: `${theme}-army`, name: "Реформа армии", text: "Обновить структуру войск и резервы.", reward: { commandPower: 30, manpower: 100, warSupport: 5 }, x: 3, y: 2, requires: [root] },
      { id: `${theme}-bases`, name: "Сеть баз", text: "Развернуть логистику, штабы и военную инфраструктуру.", reward: { commandPower: 25, steel: 15 }, x: 3, y: 3, requires: [`${theme}-army`] },
      { id: `${theme}-diplomacy`, name: "Внешний контур", text: "Усилить союзы, торговые договоры и право прохода.", reward: { politicalPower: 35, stability: 2 }, x: 5, y: 2, requires: [root] },
      { id: `${theme}-trade`, name: "Торговые коридоры", text: "Сделать торговлю категориями устойчивее и прибыльнее.", reward: { budget: 45, gdp: 25, food: 15 }, x: 5, y: 3, requires: [`${theme}-diplomacy`] },
      { id: `${theme}-nuclear-program`, name: "Национальная ядерная программа", text: "Открыть путь к реакторам и собственному ядерному арсеналу.", reward: { politicalPower: 35, rare: 25, nuclearProgram: 1 }, x: 7, y: 2, requires: [root] },
      { id: `${theme}-reactors`, name: "Реакторные мощности", text: "Подготовить промышленную базу для производства боеголовок.", reward: { nuclearReactors: 1, rare: 15, gdp: 15 }, x: 7, y: 3, requires: [`${theme}-nuclear-program`] },
      { id: `${theme}-warheads`, name: "Первые боеголовки", text: "Сформировать ограниченный арсенал сдерживания.", reward: { nuclearWarheads: 2, commandPower: 20, warSupport: 4 }, x: 7, y: 4, requires: [`${theme}-reactors`] },
      { id: `${theme}-doctrine`, name: "Доктрина безопасности", text: "Связать оборону, экономику и дипломатические гарантии.", reward: { politicalPower: 60, stability: 5, commandPower: 30 }, x: 4, y: 5, requires: [`${theme}-resources`, `${theme}-bases`, `${theme}-trade`] },
      { id: `${theme}-grand-design`, name: "Большая стратегия", text: "Финальный курс страны на долгую кампанию.", reward: { politicalPower: 80, factories: 3, gdp: 35, stability: 4 }, x: 4, y: 6, requires: [`${theme}-doctrine`, `${theme}-warheads`] },
    ];
    return tree;
  }

  extendRussianFocusTree();
  MAJOR_FOCUS_TREES["Китайская Народная Республика"] = MAJOR_FOCUS_TREES["Китай"];
  Object.entries({
    "Германия": "de", "Франция": "fr", "Великобритания": "uk", "Индия": "in", "Япония": "jp", "Турция": "tr",
    "Польша": "pl", "Иран": "ir", "Саудовская Аравия": "sa", "Бразилия": "br", "Канада": "ca", "КНДР": "kp",
    "Пакистан": "pk", "Израиль": "il", "ЮАР": "za", "Италия": "it", "Испания": "es", "Казахстан": "kz", "Белоруссия": "by",
  }).forEach(([countryName, theme]) => {
    if (!MAJOR_FOCUS_TREES[countryName]) MAJOR_FOCUS_TREES[countryName] = makeNationalFocusTree(countryName, theme);
  });

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
  let activeTab = "focuses";
  let strategyPanelFullscreen = false;
  let expandedFocusId = null;
  let relationMapMode = false;
  let relationMapCountryId = null;
  let relationPair = null;
  let strategyState = null;
  const csvFocusTrees = new Map();
  const missingCsvFocusTrees = new Set();
  const csvFocusTreeLoads = new Map();
  const csvFocusAvailable = new Set();
  let csvFocusManifestLoaded = false;
  let csvFocusManifestLoad = null;
  let gameTimer = null;
  let gamePaused = false;
  let gameSpeed = 1;
  let audioContext = null;
  let audioEnabled = false;
  let userSettings = loadUserSettings();

  const UI_TEXT = {
    ru: {
      settingsTitle: "Настройки",
      languageLabel: "Язык",
      smoothingLabel: "Сглаживание карты",
      playerLabel: "Игрок",
      fullscreenButton: "Полноэкранный режим",
      applyPlayerButton: "Сменить игрока",
      settingsHint: "Выбор игрока доступен во время партии.",
      play: "Играть",
      continue: "Продолжить",
      mapEditor: "Редактор карт",
      scenarioEditor: "Редактор сценариев",
      settings: "Настройки",
      subtitle: "Перепишите историю наций",
      newGame: "Новая игра",
      worldChoice: "Выбор мира",
      back: "← Назад",
      startGame: "Начать игру",
      nextDay: "Следующий день",
      pause: "Пауза",
    },
    en: {
      settingsTitle: "Settings",
      languageLabel: "Language",
      smoothingLabel: "Map smoothing",
      playerLabel: "Player",
      fullscreenButton: "Fullscreen",
      applyPlayerButton: "Switch player",
      settingsHint: "Player switching is available during a campaign.",
      play: "Play",
      continue: "Continue",
      mapEditor: "Map editor",
      scenarioEditor: "Scenario editor",
      settings: "Settings",
      subtitle: "Rewrite the history of nations",
      newGame: "New game",
      worldChoice: "World selection",
      back: "← Back",
      startGame: "Start game",
      nextDay: "Next day",
      pause: "Pause",
    },
  };

  function showScreen(screen) {
    document.querySelectorAll(".screen").forEach((item) => item.classList.remove("active"));
    screen.classList.add("active");
  }

  function t(key) {
    return UI_TEXT[userSettings.language]?.[key] || UI_TEXT.ru[key] || key;
  }

  function loadUserSettings() {
    const defaults = { language: "ru", smoothing: "off" };
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      return { ...defaults, ...(raw ? JSON.parse(raw) : {}) };
    } catch (error) {
      console.warn("Не удалось прочитать настройки.", error);
      return defaults;
    }
  }

  function saveUserSettings() {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(userSettings));
    } catch (error) {
      console.warn("Не удалось сохранить настройки.", error);
    }
  }

  function applyLanguage() {
    document.documentElement.lang = userSettings.language === "en" ? "en" : "ru";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (key) element.textContent = t(key);
    });
    document.querySelector(".main-screen .eyebrow").textContent = "Grand strategy";
    document.querySelector(".main-screen .subtitle").textContent = t("subtitle");
    playButton.textContent = t("play");
    document.querySelector('a[href="editor/index.html"]').textContent = t("mapEditor");
    document.querySelector('a[href="scenario-editor/index.html"]').textContent = t("scenarioEditor");
    settingsButton.textContent = t("settings");
    settingsSmoothing.querySelector('option[value="off"]').textContent = userSettings.language === "en" ? "Off" : "Отключено";
    settingsSmoothing.querySelector('option[value="msaa"]').textContent = "MSAA";
    settingsSmoothing.querySelector('option[value="ssaa"]').textContent = "SSAA";
    backButton.textContent = t("back");
    document.querySelector(".setup-screen .topbar .eyebrow").textContent = t("newGame");
    document.querySelector(".setup-screen .topbar h2").textContent = t("worldChoice");
    startGameButton.textContent = t("startGame");
    nextTurnButton.textContent = t("nextDay");
    if (!gamePaused) pauseButton.textContent = t("pause");
    updateContinueButton();
  }

  function applySmoothing() {
    const smoothing = userSettings.smoothing || "off";
    gameCanvasStack.classList.toggle("smoothing-off", smoothing === "off");
    gameCanvasStack.classList.toggle("smoothing-msaa", smoothing === "msaa");
    gameCanvasStack.classList.toggle("smoothing-ssaa", smoothing === "ssaa");
    const enabled = smoothing !== "off";
    gameMapCtx.imageSmoothingEnabled = enabled;
    gameOverlayCtx.imageSmoothingEnabled = enabled;
    if (gameData) renderGameMap();
  }

  function updateSettingsPlayerOptions() {
    if (!settingsPlayer) return;
    settingsPlayer.innerHTML = "";
    const countries = gameData?.scenario?.countries || [];
    if (!countries.length || !strategyState) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = userSettings.language === "en" ? "Start a campaign first" : "Сначала начните партию";
      settingsPlayer.append(option);
      settingsPlayer.disabled = true;
      settingsApplyPlayer.disabled = true;
      return;
    }
    countries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .forEach((country) => {
        const option = document.createElement("option");
        option.value = country.id;
        option.textContent = country.name;
        if (Number(country.id) === Number(strategyState.playerCountryId)) option.selected = true;
        settingsPlayer.append(option);
      });
    settingsPlayer.disabled = false;
    settingsApplyPlayer.disabled = false;
  }

  function applyUserSettings() {
    settingsLanguage.value = userSettings.language || "ru";
    settingsSmoothing.value = userSettings.smoothing || "off";
    applyLanguage();
    applySmoothing();
    updateSettingsPlayerOptions();
  }

  function openSettings() {
    updateSettingsPlayerOptions();
    settingsModal.hidden = false;
  }

  function closeSettings() {
    settingsModal.hidden = true;
  }

  function switchPlayerCountry() {
    if (!strategyState || !gameData || !settingsPlayer.value) return;
    const nextCountry = gameData.scenario.countries.find((country) => Number(country.id) === Number(settingsPlayer.value));
    if (!nextCountry) return;
    strategyState.playerCountryId = Number(nextCountry.id);
    gameCountryName.textContent = nextCountry.name;
    selectedCountry = nextCountry;
    addLog(`Игрок переключен на страну: ${nextCountry.name}.`);
    renderGameMap();
    renderStrategyPanel();
    saveGame("switch-player");
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Не удалось переключить полноэкранный режим.", error);
    }
  }

  function ensureAudio() {
    if (audioEnabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = audioContext || new AudioCtx();
    if (audioContext.state === "suspended") audioContext.resume();
    audioEnabled = true;
  }

  function playSound(type = "click") {
    if (!audioEnabled || !audioContext) return;
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    const osc = audioContext.createOscillator();
    const noiseGain = audioContext.createGain();
    gain.connect(audioContext.destination);
    osc.connect(gain);
    const presets = {
      click: { wave: "triangle", start: 520, end: 360, volume: 0.035, length: 0.06 },
      focus: { wave: "sine", start: 440, end: 660, volume: 0.045, length: 0.18 },
      war: { wave: "sawtooth", start: 120, end: 70, volume: 0.075, length: 0.42 },
      occupy: { wave: "square", start: 180, end: 120, volume: 0.055, length: 0.22 },
      peace: { wave: "sine", start: 360, end: 520, volume: 0.05, length: 0.32 },
      save: { wave: "triangle", start: 700, end: 880, volume: 0.035, length: 0.14 },
    };
    const preset = presets[type] || presets.click;
    osc.type = preset.wave;
    osc.frequency.setValueAtTime(preset.start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, preset.end), now + preset.length);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(preset.volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.length);
    osc.start(now);
    osc.stop(now + preset.length + 0.02);
    if (type === "war" || type === "occupy") {
      const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.12), audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      noiseGain.gain.setValueAtTime(type === "war" ? 0.035 : 0.02, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      source.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      source.start(now);
    }
  }

  function savedGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Не удалось прочитать сохранение.", error);
      return null;
    }
  }

  function updateContinueButton() {
    if (!continueButton) return;
    const save = savedGame();
    continueButton.disabled = !save?.strategyState || !save?.scenario || !save?.mapPath;
    continueButton.textContent = save?.savedAt
      ? `${t("continue")} (${new Date(save.savedAt).toLocaleDateString(userSettings.language === "en" ? "en-US" : "ru-RU")})`
      : t("continue");
  }

  function serializeStrategyState() {
    if (!strategyState) return null;
    return {
      ...strategyState,
      date: strategyState.date.toISOString(),
    };
  }

  function restoreStrategyState(savedState) {
    if (!savedState) return null;
    return {
      ...savedState,
      date: new Date(savedState.date),
    };
  }

  function currentGameDayNumber() {
    if (!strategyState || !gameData?.scenario?.year) return 0;
    const start = new Date(Number(gameData.scenario.year) || 2026, 0, 1);
    return Math.max(0, Math.floor((strategyState.date - start) / 86400000));
  }

  function saveGame(reason = "autosave") {
    if (!gameData || !strategyState || !selectedMap || !selectedScenario) return false;
    const payload = {
      version: 1,
      reason,
      savedAt: new Date().toISOString(),
      mapFile: selectedMap.file,
      mapPath: selectedMap.path,
      scenarioFile: selectedScenario.file,
      scenarioPath: selectedScenario.path,
      scenarioName: selectedScenario.name,
      selectedCountryId: strategyState.playerCountryId,
      protectedRussianRegionIds: [...(gameData.protectedRussianRegionIds || [])],
      scenario: gameData.scenario,
      strategyState: serializeStrategyState(),
    };
    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      updateContinueButton();
      return true;
    } catch (error) {
      console.warn("Не удалось сохранить игру.", error);
      addLog("Автосохранение не удалось: браузерный кэш переполнен или недоступен.");
      return false;
    }
  }

  function autosaveIfNeeded() {
    if (!strategyState || !gameData) return;
    const day = currentGameDayNumber();
    if (day > 0 && day % 5 === 0) {
      if (saveGame("autosave")) {
        addLog("Игра автоматически сохранена.");
        playSound("save");
      }
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function treatyActive(treatyId, scenario = gameData?.scenario) {
    const treaty = INTERNATIONAL_TREATIES.find((item) => item.id === treatyId);
    if (!treaty) return false;
    const year = Number(scenario?.year) || 2026;
    if (year < (treaty.start || -Infinity) || year > (treaty.end || Infinity)) return false;
    return (scenario?.treaties || []).includes(treatyId);
  }

  function activeInternationalTreaties(scenario = gameData?.scenario) {
    const year = Number(scenario?.year) || 2026;
    const activeIds = new Set(scenario?.treaties || []);
    return INTERNATIONAL_TREATIES.filter((treaty) =>
      year >= (treaty.start || -Infinity) &&
      year <= (treaty.end || Infinity) &&
      activeIds.has(treaty.id)
    );
  }

  function ensureYearTreaties(scenario) {
    if (!scenario) return;
    const year = Number(scenario.year) || 2026;
    const treatyIds = new Set(scenario.treaties || []);
    INTERNATIONAL_TREATIES.forEach((treaty) => {
      if (year >= (treaty.start || -Infinity) && year <= (treaty.end || Infinity)) treatyIds.add(treaty.id);
    });
    scenario.treaties = [...treatyIds];
  }

  function isRussiaCountry(country) {
    return /^(Россия|Российская империя|Российская Федерация|РСФСР|СССР|Советский Союз)$/i.test(country?.name || "");
  }

  function initialRussianRegionIds(scenario) {
    const protectedRegions = new Set();
    (scenario?.countries || []).filter(isRussiaCountry).forEach((country) => {
      (country.regionIds || []).forEach((regionId) => protectedRegions.add(Number(regionId)));
    });
    return protectedRegions;
  }

  function isProtectedRussianRegion(regionId) {
    return Boolean(gameData?.protectedRussianRegionIds?.has(Number(regionId)));
  }

  function isAntarcticRegion(regionId) {
    return Boolean(gameData?.antarcticRegionIds?.has(Number(regionId)));
  }

  function isAntarcticMapRegion(region, map) {
    if (!region || region.type === "sea") return false;
    if (/Антаркт|Antarct/i.test(region.name || "")) return true;
    const pixels = region.pixels || [];
    if (!pixels.length || !map?.height) return false;
    const sampleStep = Math.max(1, Math.floor(pixels.length / 32));
    let farSouth = 0;
    let sampled = 0;
    for (let index = 0; index < pixels.length; index += sampleStep) {
      sampled += 1;
      if (pixels[index].y >= map.height * 0.88) farSouth += 1;
    }
    return sampled > 0 && farSouth / sampled >= 0.75;
  }

  function applyAntarcticTreaty(scenario, map, regionById) {
    if (!treatyActive("antarctic", scenario)) return new Set();
    const antarcticRegionIds = new Set();
    regionById.forEach((region, id) => {
      if (isAntarcticMapRegion(region, map)) antarcticRegionIds.add(Number(id));
    });
    if (!antarcticRegionIds.size) return antarcticRegionIds;
    scenario.countries.forEach((country) => {
      country.regionIds = (country.regionIds || []).filter((regionId) => !antarcticRegionIds.has(Number(regionId)));
      if (antarcticRegionIds.has(Number(country.capitalRegionId))) {
        country.capitalRegionId = Number(country.regionIds?.[0] || 0);
      }
    });
    scenario.occupations = (scenario.occupations || []).filter((occupation) => !antarcticRegionIds.has(Number(occupation.regionId)));
    return antarcticRegionIds;
  }

  function stateKey(country) {
    return String(country?.id || "");
  }

  function countryPower(country) {
    const regions = Array.isArray(country.regionIds) ? country.regionIds.length : 1;
    return Math.max(1, Math.round(Math.sqrt(regions) * 5));
  }

  function hashNumber(value) {
    let hash = 2166136261;
    String(value).split("").forEach((char) => {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return Math.abs(hash >>> 0);
  }

  function estimatePopulation(country) {
    const regions = Math.max(1, country.regionIds?.length || 1);
    const major = /Китай|Индия/i.test(country.name) ? 900000000
      : /США/i.test(country.name) ? 280000000
        : /Россия/i.test(country.name) ? 120000000
          : /Бразилия|Индонезия|Пакистан|Нигерия/i.test(country.name) ? 140000000
            : /Германия|Франция|Великобритания|Турция|Иран|Египет/i.test(country.name) ? 60000000
              : 0;
    return major || Math.round((regions * 180000) + (hashNumber(country.name) % 9000000) + 900000);
  }

  function estimateGdp(country, population, factories) {
    const multiplier = /США/i.test(country.name) ? 85000
      : /Германия|Франция|Великобритания|Канада|Япония|Австралия/i.test(country.name) ? 52000
        : /Китай|Россия|Турция|Польша|Бразилия/i.test(country.name) ? 22000
          : 9000;
    return Math.round(population * multiplier / 1000000000 + factories * 6);
  }

  function createRegionProfile(regionId, country, runtime) {
    const seed = hashNumber(`${country.id}:${regionId}`);
    const share = 0.45 + (seed % 90) / 100;
    const regionCount = Math.max(1, country.regionIds?.length || 1);
    const population = Math.max(1200, Math.round(runtime.population / regionCount * share));
    const gdp = Math.max(1, Math.round(runtime.gdp / regionCount * (0.55 + (seed % 70) / 100)));
    const oilCountry = /Сауд|Иран|Ирак|Кувейт|ОАЭ|Катар|Россия|США|Канада|Норвег|Венесуэла/i.test(country.name);
    const industrialCountry = /Китай|США|Россия|Германия|Индия|Япония|Франция|Турция|Польша/i.test(country.name);
    const foodCountry = /Россия|США|Китай|Индия|Бразилия|Аргентина|Украина|Франция|Канада|Австралия/i.test(country.name);
    const oil = oilCountry
      ? (seed % 3 === 0 ? 18 + seed % 45 : seed % 5 === 0 ? 6 + seed % 18 : 0)
      : seed % 7 === 0 ? 5 + seed % 18 : 0;
    const steel = industrialCountry
      ? (seed % 4 === 0 ? 10 + seed % 26 : seed % 8 === 0 ? 4 + seed % 12 : 0)
      : seed % 5 === 0 ? 4 + seed % 16 : 0;
    const food = (foodCountry ? 8 : 2) + seed % (foodCountry ? 34 : 20);
    const rare = industrialCountry && seed % 6 === 0 ? 4 + seed % 16 : seed % 11 === 0 ? 2 + seed % 9 : 0;
    return {
      regionId: Number(regionId),
      population,
      readySoldiers: Math.max(20, Math.round(population * (0.006 + (seed % 12) / 10000))),
      gdp,
      economy: Math.max(1, Math.round(gdp / 3)),
      resources: {
        oil,
        steel,
        food,
        rare,
      },
      buildings: [],
      minister: "none",
      ministerBudget: 0,
      base: false,
    };
  }

  function createCountryRuntime(country) {
    const power = countryPower(country);
    const ideology = country.ideology || "neutral";
    const oilBonus = /Россия|США|Сауд|Иран|Ирак|Кувейт|ОАЭ|Катар|Норвег|Канада|Венесуэла/i.test(country.name) ? 35 : 0;
    const steelBonus = /Китай|США|Россия|Германия|Индия|Япония|Франция|Турция/i.test(country.name) ? 25 : 0;
    const foodBonus = /Россия|США|Китай|Индия|Бразилия|Аргентина|Украина|Франция/i.test(country.name) ? 25 : 0;
    const population = estimatePopulation(country);
    const factories = Math.max(2, Math.round(power / 2));
    const gdp = estimateGdp(country, population, factories);
    const nuclearCapable = NUCLEAR_CAPABLE_COUNTRIES.has(country.name);
    return {
      countryId: Number(country.id),
      originCountryName: country.name,
      ideology,
      reforms: [],
      politicalPower: 70 + power,
      commandPower: 25,
      stability: clamp(58 + (ideology === "neutral" ? 6 : 0), 20, 92),
      warSupport: clamp(28 + power / 2, 5, 88),
      manpower: 120 + power * 12,
      factories,
      population,
      gdp,
      pppGdp: Math.round(gdp * (/США|Германия|Франция|Великобритания|Канада|Япония|Австралия/i.test(country.name) ? 1.08 : /Китай|Индия|Россия|Бразилия|Турция/i.test(country.name) ? 1.8 : 1.35)),
      pppPerCapita: 0,
      livingStandard: "средний",
      budget: Math.max(20, Math.round(gdp / 12)),
      taxRate: 22,
      currencyPolicy: "floating",
      currencyStability: 55,
      nuclear: {
        program: nuclearCapable,
        reactors: nuclearCapable ? Math.max(1, Math.round(power / 45)) : 0,
        warheads: nuclearCapable ? Math.max(2, Math.round(power / 18)) : 0,
        progress: 0,
        doctrine: nuclearCapable ? "Сдерживание" : "нет",
      },
      foreignAssets: [],
      seizedAssets: [],
      laws: {
        economy: "civilian",
        conscription: "volunteer",
        trade: "limited",
      },
      modifiers: {
        factoryOutput: 0,
        recruitable: 0.01,
        resourceGain: 0,
        relationsGain: 0,
        politicalPowerDaily: 0,
        armySpeed: 0,
        armyAttack: 0,
        entrenchment: 0,
        focusSlots: 0,
      },
      resources: {
        oil: 20 + oilBonus + Math.round(power / 3),
        steel: 18 + steelBonus + Math.round(power / 2),
        food: 24 + foodBonus + Math.round(power / 2),
        rare: 10 + Math.round(power / 4),
      },
      focusId: null,
      focusProgress: 0,
      activeFocuses: [],
      completedFocuses: [],
      decisions: [],
      production: [
        { lineId: "infantry", assigned: Math.max(1, Math.floor(power / 18)), progress: 0 },
        { lineId: "civilian", assigned: Math.max(1, Math.floor(power / 32)), progress: 0 },
      ],
      activeResearchId: null,
      researchProgress: 0,
      technologies: [],
      intel: 25,
      armyXp: 0,
      advisors: [],
      doctrines: [],
      constructions: [],
      operations: [],
      appliedIdeologyId: ideology,
      democracy: {
        active: Boolean(DEMOCRATIC_IDEOLOGIES.has(ideology)),
        approval: DEMOCRATIC_IDEOLOGIES.has(ideology) ? 56 : 0,
        parliament: DEMOCRATIC_IDEOLOGIES.has(ideology) ? 52 : 0,
        nextElectionAt: null,
        lastElectionAt: null,
      },
      regionProfiles: {},
      armies: [],
      bases: [],
      armyMinister: "none",
      armyAutomationLogDay: "",
      militaryAccess: [],
      visaFree: [],
      allies: [],
    };
  }

  function createInitialStrategyState(scenario, playerCountry) {
    const countryStates = {};
    scenario.countries.forEach((country) => {
      countryStates[stateKey(country)] = createCountryRuntime(country);
      const runtime = countryStates[stateKey(country)];
      (country.regionIds || []).forEach((regionId) => {
        runtime.regionProfiles[String(regionId)] = createRegionProfile(regionId, country, runtime);
      });
      if (country.capitalRegionId) {
        runtime.bases.push({ regionId: Number(country.capitalRegionId), hostCountryId: Number(country.id), ownerCountryId: Number(country.id), level: 2 });
        if (runtime.regionProfiles[String(country.capitalRegionId)]) runtime.regionProfiles[String(country.capitalRegionId)].base = true;
      }
      runtime.armies.push({
        id: `${country.id}-1`,
        name: "1-я армия",
        ownerCountryId: Number(country.id),
        regionId: Number(country.capitalRegionId || country.regionIds?.[0] || 0),
        soldiers: Math.max(1000, Math.round(runtime.population * 0.006)),
        readiness: 72,
        movingTo: null,
        eta: 0,
      });
    });
    const state = {
      date: new Date(Number(scenario.year) || 2026, 0, 1),
      playerCountryId: Number(playerCountry.id),
      countryStates,
      relations: {},
      organizations: [],
      accessTreaties: [],
      visaTreaties: [],
      trades: [],
      sanctions: [],
      wars: [],
      peaceConference: null,
      claims: [],
      selectedRegionId: null,
      lastUNGeneralAssemblyAt: null,
      lastUNGeneralAssembly: null,
      lastRenderedDay: "",
      log: ["Кабинет сформирован. Доступны фокусы, дипломатия, торговля и военные решения."],
    };
    seedOrganizationsAndRelations(state, scenario);
    enforceSpecialRelations(state, scenario);
    seedStartingSanctions(state, scenario);
    seedScenarioArmies(state, scenario);
    seedForeignAssets(state, scenario);
    Object.values(state.countryStates).forEach(updateMacroIndicators);
    normalizeStrategyState(state, scenario);
    return state;
  }

  function updateMacroIndicators(runtime) {
    const currency = CURRENCY_POLICIES.find((item) => item.id === runtime.currencyPolicy) || CURRENCY_POLICIES[0];
    runtime.pppGdp = Math.max(1, Math.round(runtime.gdp * currency.ppp * (1 + runtime.stability / 300)));
    runtime.pppPerCapita = Math.round(runtime.pppGdp * 1000000000 / Math.max(1, runtime.population));
    runtime.livingStandard = runtime.pppPerCapita >= 45000 ? "высокий"
      : runtime.pppPerCapita >= 22000 ? "средний+"
        : runtime.pppPerCapita >= 10000 ? "средний"
          : "низкий";
    runtime.currencyStability = clamp(55 + currency.stability + Math.round((runtime.stability - 50) / 3), 0, 100);
  }

  function isDemocraticIdeology(ideologyId) {
    return DEMOCRATIC_IDEOLOGIES.has(String(ideologyId || ""));
  }

  function normalizeCountryRuntime(runtime, country, gameDate) {
    if (!runtime || !country) return;
    if (!runtime.appliedIdeologyId) runtime.appliedIdeologyId = runtime.ideology || "neutral";
    if (!runtime.democracy) {
      runtime.democracy = {
        active: isDemocraticIdeology(runtime.ideology),
        approval: isDemocraticIdeology(runtime.ideology) ? 56 : 0,
        parliament: isDemocraticIdeology(runtime.ideology) ? 50 : 0,
        nextElectionAt: null,
        lastElectionAt: null,
      };
    }
    runtime.democracy.active = isDemocraticIdeology(runtime.ideology);
    if (runtime.democracy.active) {
      runtime.democracy.approval = clamp(Number(runtime.democracy.approval || 56), 0, 100);
      runtime.democracy.parliament = clamp(Number(runtime.democracy.parliament || 50), 0, 100);
      if (!runtime.democracy.nextElectionAt && gameDate) {
        runtime.democracy.nextElectionAt = new Date(gameDate.getFullYear() + 4, gameDate.getMonth(), gameDate.getDate()).toISOString().slice(0, 10);
      }
    } else {
      runtime.democracy.approval = 0;
      runtime.democracy.parliament = 0;
      runtime.democracy.nextElectionAt = null;
    }
  }

  function normalizeStrategyState(state, scenario) {
    if (!state?.countryStates) return;
    const gameDate = state.date instanceof Date ? state.date : new Date(Number(scenario?.year) || 2026, 0, 1);
    if (!Array.isArray(state.sanctions)) state.sanctions = [];
    if (!Object.prototype.hasOwnProperty.call(state, "lastUNGeneralAssemblyAt")) state.lastUNGeneralAssemblyAt = null;
    if (!Object.prototype.hasOwnProperty.call(state, "lastUNGeneralAssembly")) state.lastUNGeneralAssembly = null;
    scenario?.countries?.forEach((country) => {
      const runtime = state.countryStates[stateKey(country)];
      normalizeCountryRuntime(runtime, country, gameDate);
    });
  }

  function setRuntimeIdeology(runtime, country, ideologyId) {
    const nextIdeology = ideologyById(ideologyId);
    if (!runtime || !country || !nextIdeology) return false;
    const currentIdeology = ideologyById(runtime.appliedIdeologyId || runtime.ideology);
    if (currentIdeology?.id === nextIdeology.id) return false;
    if (currentIdeology?.effects) applyModifierEffects(runtime, currentIdeology.effects, -1);
    runtime.ideology = nextIdeology.id;
    country.ideology = nextIdeology.id;
    runtime.appliedIdeologyId = nextIdeology.id;
    applyModifierEffects(runtime, nextIdeology.effects || {}, 1);
    normalizeCountryRuntime(runtime, country, strategyState?.date || new Date());
    return true;
  }

  function averagePositiveRelations(countryId, limit = 6) {
    if (!gameData?.scenario?.countries?.length) return 0;
    return gameData.scenario.countries
      .filter((country) => Number(country.id) !== Number(countryId))
      .map((country) => getRelation(countryId, country.id))
      .sort((a, b) => b - a)
      .slice(0, limit)
      .reduce((sum, value) => sum + value, 0) / Math.max(1, Math.min(limit, gameData.scenario.countries.length - 1));
  }

  function democracyElectionChoice(runtime, country) {
    const approval = runtime.democracy?.approval ?? 50;
    const stability = runtime.stability;
    const warSupport = runtime.warSupport;
    const relations = averagePositiveRelations(country.id);
    const economyPressure = runtime.budget < 0 ? 12 : 0;
    const candidates = [
      {
        id: "democratic",
        score: approval * 0.9 + stability * 0.2 + relations * 0.1 - economyPressure,
      },
      {
        id: "liberal",
        score: approval * 0.75 + relations * 0.35 + runtime.modifiers.factoryOutput * 100 + runtime.gdp / 5000,
      },
      {
        id: "social_democratic",
        score: approval * 0.8 + stability * 0.35 + Math.max(0, 70 - warSupport) * 0.25 + Math.max(0, 30 - runtime.budget / 10) * 0.3,
      },
      {
        id: "conservative",
        score: approval * 0.7 + warSupport * 0.4 + stability * 0.25 + Math.max(0, 40 - relations) * 0.1,
      },
    ];
    return candidates.sort((a, b) => b.score - a.score)[0]?.id || runtime.ideology;
  }

  function scheduleNextElection(runtime, gameDate) {
    runtime.democracy.nextElectionAt = new Date(gameDate.getFullYear() + 4, gameDate.getMonth(), gameDate.getDate()).toISOString().slice(0, 10);
  }

  function runDemocraticElection(runtime, country, { forced = false, silent = false } = {}) {
    if (!runtime || !country || !runtime.democracy?.active) return false;
    const nextElectionDate = runtime.democracy.nextElectionAt ? new Date(`${runtime.democracy.nextElectionAt}T00:00:00`) : null;
    if (!forced && nextElectionDate && strategyState.date < nextElectionDate) return false;
    const winnerId = democracyElectionChoice(runtime, country);
    const oldIdeology = runtime.ideology;
    const changed = setRuntimeIdeology(runtime, country, winnerId);
    runtime.democracy.approval = clamp(Math.round((runtime.democracy.approval + runtime.stability / 2 + averagePositiveRelations(country.id, 4) / 3) / 2), 35, 85);
    runtime.democracy.parliament = clamp(Math.round(40 + runtime.democracy.approval * 0.45 + runtime.stability * 0.15), 0, 100);
    scheduleNextElection(runtime, strategyState.date);
    runtime.democracy.lastElectionAt = strategyState.date.toISOString().slice(0, 10);
    if (!silent) {
      const oldName = ideologyById(oldIdeology)?.name || oldIdeology;
      const newName = ideologyById(runtime.ideology)?.name || runtime.ideology;
      addLog(`Выборы в ${country.name}: ${changed ? `победили ${newName}` : `курс сохранился (${newName})`} вместо ${oldName}.`);
    }
    return true;
  }

  function updateDemocracy(runtime, country) {
    if (!runtime?.democracy?.active || !country) return;
    const activeWars = strategyState.wars.filter((war) => war.active && (Number(war.attackerId) === Number(country.id) || Number(war.defenderId) === Number(country.id))).length;
    const relationFactor = averagePositiveRelations(country.id, 5) / 40;
    const approvalShift = ((runtime.stability - 50) / 35) + relationFactor - (Math.max(0, runtime.warSupport - 40) / 55) - (activeWars * 1.6);
    runtime.democracy.approval = clamp(runtime.democracy.approval + approvalShift, 0, 100);
    runtime.democracy.parliament = clamp(Math.round(30 + runtime.democracy.approval * 0.55 + runtime.stability * 0.12), 0, 100);
    if (runtime.democracy.approval >= 70) runtime.politicalPower += 0.35;
    if (runtime.democracy.approval < 35) runtime.stability = clamp(runtime.stability - 0.08, 0, 100);
    const nextElectionDate = runtime.democracy.nextElectionAt ? new Date(`${runtime.democracy.nextElectionAt}T00:00:00`) : null;
    if (nextElectionDate && strategyState.date >= nextElectionDate) {
      runDemocraticElection(runtime, country, { silent: Number(country.id) !== Number(strategyState.playerCountryId) });
    }
  }

  function seedForeignAssets(state, scenario) {
    const countries = scenario.countries.slice().sort((a, b) => countryPower(b) - countryPower(a)).slice(0, 24);
    countries.forEach((owner, index) => {
      const ownerRuntime = state.countryStates[String(owner.id)];
      if (!ownerRuntime) return;
      const hosts = countries.filter((country) => Number(country.id) !== Number(owner.id)).slice(index % 5, index % 5 + 4);
      hosts.forEach((host, hostIndex) => {
        const type = FOREIGN_ASSET_TYPES[(index + hostIndex) % FOREIGN_ASSET_TYPES.length];
        ownerRuntime.foreignAssets.push({
          id: `${owner.id}-${host.id}-${type.id}`,
          type: type.id,
          hostCountryId: Number(host.id),
          value: type.value + (hashNumber(`${owner.name}:${host.name}:${type.id}`) % 30),
          seized: false,
        });
      });
    });
  }

  function currentPlayerCountry() {
    return gameData?.scenario.countries.find((country) => Number(country.id) === Number(strategyState?.playerCountryId)) || null;
  }

  function currentPlayerState() {
    return strategyState?.countryStates[stateKey(currentPlayerCountry())] || null;
  }

  function allCountryStates() {
    return Object.values(strategyState?.countryStates || {});
  }

  function relationKey(a, b) {
    return [Number(a), Number(b)].sort((left, right) => left - right).join(":");
  }

  function getRelation(a, b) {
    return strategyState?.relations[relationKey(a, b)] ?? 0;
  }

  function setRelation(a, b, value) {
    strategyState.relations[relationKey(a, b)] = clamp(value, -100, 100);
  }

  function setInitialRelation(state, a, b, value) {
    state.relations[relationKey(a, b)] = clamp(value, -100, 100);
  }

  function addAlliance(state, a, b) {
    const left = state.countryStates[String(a)];
    const right = state.countryStates[String(b)];
    if (!left || !right) return;
    if (!left.allies.includes(Number(b))) left.allies.push(Number(b));
    if (!right.allies.includes(Number(a))) right.allies.push(Number(a));
  }

  function sanctionKey(issuerId, targetId, typeId) {
    return `${Number(issuerId)}:${Number(targetId)}:${String(typeId)}`;
  }

  function sanctionTypeById(typeId) {
    return SANCTION_TYPES.find((type) => type.id === typeId) || SANCTION_TYPES[0];
  }

  function activeSanctions() {
    return (strategyState?.sanctions || []).filter((sanction) => sanction && sanction.active !== false);
  }

  function sanctionsAgainst(countryId) {
    return activeSanctions().filter((sanction) => Number(sanction.targetId) === Number(countryId));
  }

  function sanctionsByIssuer(countryId) {
    return activeSanctions().filter((sanction) => Number(sanction.issuerId) === Number(countryId));
  }

  function sanctionTitle(sanction) {
    const type = sanctionTypeById(sanction.type);
    const issuer = countryById(sanction.issuerId)?.name || `Страна ${sanction.issuerId}`;
    const target = countryById(sanction.targetId)?.name || `Страна ${sanction.targetId}`;
    return `${type.name}: ${issuer} → ${target}`;
  }

  function applySanctionEffects(runtime, country) {
    if (!runtime || !country) return;
    const sanctions = sanctionsAgainst(country.id);
    runtime.sanctionResearchPenalty = 0;
    runtime.sanctionForeignAssetPenalty = 0;
    runtime.sanctionBudgetDrain = 0;
    runtime.sanctionPoliticalPowerDrain = 0;
    runtime.sanctionCommandDrain = 0;
    runtime.sanctionStabilityDrain = 0;
    runtime.sanctionWarSupportDrain = 0;
    runtime.sanctionManpowerDrain = 0;
    if (!sanctions.length) return;
    sanctions.forEach((sanction) => {
      const type = sanctionTypeById(sanction.type);
      const severity = Number(sanction.severity || type.severity || 1);
      runtime.sanctionBudgetDrain += (type.daily?.budget || 0) * severity;
      runtime.sanctionPoliticalPowerDrain += (type.daily?.politicalPower || 0) * severity;
      runtime.sanctionCommandDrain += (type.daily?.commandPower || 0) * severity;
      runtime.sanctionStabilityDrain += (type.daily?.stability || 0) * severity;
      runtime.sanctionWarSupportDrain += (type.daily?.warSupport || 0) * severity;
      runtime.sanctionManpowerDrain += (type.daily?.manpower || 0) * severity;
      runtime.sanctionForeignAssetPenalty = Math.max(runtime.sanctionForeignAssetPenalty, Number(type.daily?.foreignAssetYield || 0));
      runtime.sanctionResearchPenalty += Number(type.researchPenalty || 0) * severity;
    });
    runtime.budget = Math.max(0, runtime.budget - runtime.sanctionBudgetDrain);
    runtime.politicalPower = Math.max(0, runtime.politicalPower - runtime.sanctionPoliticalPowerDrain);
    runtime.commandPower = clamp(runtime.commandPower - runtime.sanctionCommandDrain, 0, 100);
    runtime.stability = clamp(runtime.stability - runtime.sanctionStabilityDrain, 0, 100);
    runtime.warSupport = clamp(runtime.warSupport - runtime.sanctionWarSupportDrain, 0, 100);
    runtime.manpower = Math.max(0, runtime.manpower - runtime.sanctionManpowerDrain);
  }

  function imposeSanction(targetId, typeId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    const type = sanctionTypeById(typeId);
    if (!player || !runtime || !target || Number(player.id) === Number(target.id)) return;
    if (runtime.politicalPower < type.cost) return;
    const key = sanctionKey(player.id, target.id, type.id);
    if (activeSanctions().some((sanction) => sanction.key === key || (Number(sanction.issuerId) === Number(player.id) && Number(sanction.targetId) === Number(target.id) && sanction.type === type.id))) {
      addLog("Такие санкции уже действуют.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= type.cost;
    const currentRelation = getRelation(player.id, target.id);
    setRelation(player.id, target.id, currentRelation - type.relationPenalty);
    strategyState.sanctions.push({
      id: key,
      key,
      issuerId: Number(player.id),
      targetId: Number(target.id),
      type: type.id,
      severity: type.severity,
      active: true,
      imposedAt: strategyState.date.toISOString().slice(0, 10),
    });
    addLog(`Введены санкции: ${type.name} против ${target.name}.`);
    renderStrategyPanel();
  }

  function liftSanction(sanctionId) {
    const runtime = currentPlayerState();
    if (!runtime) return;
    const sanction = strategyState.sanctions.find((item) => item.id === sanctionId && item.active !== false);
    if (!sanction || Number(sanction.issuerId) !== Number(strategyState.playerCountryId)) return;
    if (runtime.politicalPower < 15) return;
    runtime.politicalPower -= 15;
    sanction.active = false;
    const target = countryById(sanction.targetId);
    if (target) setRelation(strategyState.playerCountryId, target.id, getRelation(strategyState.playerCountryId, target.id) + 8);
    addLog(`Санкции сняты: ${sanctionTypeById(sanction.type).name} против ${target?.name || "страны"}.`);
    renderStrategyPanel();
  }

  function seedStartingSanctions(state, scenario) {
    const countries = (scenario?.countries || []).slice().sort((a, b) => countryPower(b) - countryPower(a));
    const candidates = [];
    const considerPair = (issuerId, targetId, typeId, severity, reason) => {
      if (!issuerId || !targetId || Number(issuerId) === Number(targetId)) return;
      const type = sanctionTypeById(typeId);
      const key = sanctionKey(issuerId, targetId, type.id);
      if (state.sanctions.some((sanction) => sanction.id === key)) return;
      state.sanctions.push({
        id: key,
        key,
        issuerId: Number(issuerId),
        targetId: Number(targetId),
        type: type.id,
        severity: severity || type.severity,
        active: true,
        imposedAt: `${scenarioYear(scenario)}-01-01`,
        reason,
      });
      setInitialRelationAtMost(state, issuerId, targetId, Math.min(-15, relationValue(state, issuerId, targetId) - type.relationPenalty));
    };

    const namedSeeds = [
      { issuer: /США|United States|USA/i, target: /Россия|Российская Федерация|СССР/i, type: "economic", severity: 1.5, reason: "исторический политический конфликт" },
      { issuer: /США|United States|USA/i, target: /Беларус|Белоруссия/i, type: "travel", severity: 1.2, reason: "ограничения на поездки" },
      { issuer: /ЕС|European Union|Евросоюз/i, target: /Россия|Российская Федерация|СССР/i, type: "tech", severity: 1.1, reason: "технологические ограничения" },
      { issuer: /Польша/i, target: /Россия|Российская Федерация|СССР/i, type: "asset_freeze", severity: 1.0, reason: "заморозка активов" },
      { issuer: /Великобритания/i, target: /Россия|Российская Федерация|СССР/i, type: "economic", severity: 1.0, reason: "экономическое давление" },
      { issuer: /Япония/i, target: /КНДР|Северная Корея|Корейская Народно-Демократическая Республика/i, type: "arms", severity: 1.3, reason: "военное эмбарго" },
      { issuer: /США|United States|USA/i, target: /Иран/i, type: "economic", severity: 1.4, reason: "нефтяные ограничения" },
    ];
    namedSeeds.forEach((seed) => {
      const issuerId = matchingCountryIds(scenario, seed.issuer)[0];
      const targetId = matchingCountryIds(scenario, seed.target)[0];
      if (!issuerId || !targetId || issuerId === targetId) return;
      considerPair(issuerId, targetId, seed.type, seed.severity, seed.reason);
    });

    countries.slice(0, 20).forEach((left, leftIndex) => {
      countries.slice(leftIndex + 1, leftIndex + 8).forEach((right) => {
        const relation = relationValue(state, left.id, right.id);
        const warActive = isHistoricalWarPairActive(state, left.id, right.id);
        if (relation > -10 && !warActive) return;
        const issuerId = countryPower(left) >= countryPower(right) ? left.id : right.id;
        const targetId = Number(issuerId) === Number(left.id) ? right.id : left.id;
        const type = SANCTION_TYPES[(Math.abs(relation) + leftIndex) % SANCTION_TYPES.length];
        candidates.push({
          issuerId,
          targetId,
          type: type.id,
          severity: warActive ? Math.max(1.2, type.severity) : type.severity,
          reason: warActive ? "военная эскалация" : "плохие отношения",
          score: Math.abs(relation) + countryPower(left) + countryPower(right) / 2,
        });
      });
    });

    candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .forEach((item) => considerPair(item.issuerId, item.targetId, item.type, item.severity, item.reason));
  }

  function nextUNGeneralAssemblyDate(date = strategyState?.date) {
    if (!date) return null;
    const candidate = new Date(date.getFullYear(), 8, 21);
    return date <= candidate ? candidate : new Date(date.getFullYear() + 1, 8, 21);
  }

  function buildUNGeneralAssemblyAgenda() {
    const activeWars = (strategyState?.wars || []).filter((war) => war.active);
    const activeSanctionsList = activeSanctions();
    const agenda = [];
    if (activeWars.length) agenda.push("Прекращение вооруженных конфликтов");
    if (activeSanctionsList.length) agenda.push("Пересмотр санкционных режимов");
    if (activeWars.length || activeSanctionsList.length) agenda.push("Гуманитарные коридоры и помощь");
    agenda.push("Развитие, торговля и международная координация");
    agenda.push("Климат, ресурсы и безопасность цепочек поставок");
    if (gameData?.scenario?.countries?.some((country) => isDemocraticIdeology(country?.ideology))) {
      agenda.push("Демократические институты и наблюдение за выборами");
    }
    return [...new Set(agenda)];
  }

  function runAnnualUNGeneralAssembly() {
    if (!strategyState?.date || strategyState.date.getMonth() !== 8 || strategyState.date.getDate() !== 21) return;
    const stamp = strategyState.date.toISOString().slice(0, 10);
    if (strategyState.lastUNGeneralAssemblyAt === stamp) return;
    const year = strategyState.date.getFullYear();
    const agenda = buildUNGeneralAssemblyAgenda();
    const activeWars = (strategyState.wars || []).filter((war) => war.active);
    const activeSanctionsList = activeSanctions();
    const affectedCountries = new Set();
    activeSanctionsList.forEach((sanction) => {
      affectedCountries.add(Number(sanction.issuerId));
      affectedCountries.add(Number(sanction.targetId));
      const issuer = countryById(sanction.issuerId);
      const target = countryById(sanction.targetId);
      if (issuer && target) setRelation(issuer.id, target.id, getRelation(issuer.id, target.id) - 1);
      const targetRuntime = strategyState.countryStates[String(sanction.targetId)];
      if (targetRuntime) targetRuntime.stability = clamp(targetRuntime.stability - 0.25, 0, 100);
    });
    activeWars.forEach((war) => {
      const attackerRuntime = strategyState.countryStates[String(war.attackerId)];
      const defenderRuntime = strategyState.countryStates[String(war.defenderId)];
      if (attackerRuntime) attackerRuntime.warSupport = clamp(attackerRuntime.warSupport - 0.15, 0, 100);
      if (defenderRuntime) defenderRuntime.warSupport = clamp(defenderRuntime.warSupport - 0.15, 0, 100);
    });
    const resolutions = [];
    if (activeWars.length) resolutions.push("Призыв к прекращению огня и переговорам");
    if (activeSanctionsList.length) resolutions.push("Призыв к пересмотру санкций и гуманитарным исключениям");
    if (!resolutions.length) resolutions.push("Резолюция о сотрудничестве и экономическом развитии");
    strategyState.lastUNGeneralAssemblyAt = stamp;
    strategyState.lastUNGeneralAssembly = {
      year,
      date: stamp,
      agenda,
      resolutions,
      wars: activeWars.length,
      sanctions: activeSanctionsList.length,
      countries: [...affectedCountries].filter(Boolean).length,
    };
    const playerRuntime = currentPlayerState();
    if (playerRuntime) {
      playerRuntime.politicalPower += activeWars.length ? 2 : 1;
      if (isDemocraticIdeology(playerRuntime.ideology)) playerRuntime.democracy.approval = clamp((playerRuntime.democracy.approval || 0) + 2, 0, 100);
    }
    addLog(`Генеральная Ассамблея ООН ${year}: ${agenda.slice(0, 3).join(" · ")}.`);
  }

  function yearInRange(year, start = -Infinity, end = Infinity) {
    return year >= start && year <= end;
  }

  function scenarioYear(scenario) {
    return Number(scenario?.year) || 2026;
  }

  function organizationActive(template, year) {
    const [start, end] = ORGANIZATION_ACTIVE_YEARS[template.id] || [template.start ?? -Infinity, template.end ?? Infinity];
    return yearInRange(year, start, end);
  }

  function matchingCountryIds(scenario, rule) {
    return scenario.countries
      .filter((country) => rule.test ? rule.test(country.name) : rule(country))
      .map((country) => Number(country.id));
  }

  function relationValue(state, a, b) {
    return state.relations[relationKey(a, b)] || 0;
  }

  function setInitialRelationAtLeast(state, a, b, value) {
    setInitialRelation(state, a, b, Math.max(relationValue(state, a, b), value));
  }

  function setInitialRelationAtMost(state, a, b, value) {
    setInitialRelation(state, a, b, Math.min(relationValue(state, a, b), value));
  }

  function addHistoricalWar(state, scenario, war) {
    const attackers = matchingCountryIds(scenario, war.attackers);
    const defenders = matchingCountryIds(scenario, war.defenders);
    attackers.slice(0, 8).forEach((attackerId) => {
      defenders.slice(0, 12).forEach((defenderId) => {
        if (attackerId === defenderId || isHistoricalWarPairActive(state, attackerId, defenderId)) return;
        state.wars.push({
          id: `${war.id}-${attackerId}-${defenderId}`,
          name: war.name,
          attackerId,
          defenderId,
          start: `${war.start}-01-01`,
          active: true,
        });
        setInitialRelationAtMost(state, attackerId, defenderId, -100);
      });
    });
  }

  function isHistoricalWarPairActive(state, a, b) {
    return state.wars.some((war) => war.active &&
      ((Number(war.attackerId) === Number(a) && Number(war.defenderId) === Number(b)) ||
      (Number(war.attackerId) === Number(b) && Number(war.defenderId) === Number(a))));
  }

  function addHistoricalTrade(state, fromId, toId, categoryId) {
    if (!fromId || !toId || Number(fromId) === Number(toId)) return;
    if (isHistoricalWarPairActive(state, fromId, toId)) return;
    if (state.trades.some((trade) => Number(trade.from) === Number(fromId) && Number(trade.to) === Number(toId) && trade.category === categoryId)) return;
    const category = TRADE_CATEGORIES[categoryId] || TRADE_CATEGORIES.raw;
    state.trades.push({
      from: Number(fromId),
      to: Number(toId),
      category: categoryId,
      resource: Object.keys(category.resources)[0],
      amount: category.amount,
    });
    setInitialRelationAtLeast(state, fromId, toId, Math.min(45, relationValue(state, fromId, toId) + 8));
  }

  function seedOrganizationsAndRelations(state, scenario) {
    const year = scenarioYear(scenario);
    const activeTemplates = [...ORGANIZATION_TEMPLATES, ...HISTORICAL_ORGANIZATION_TEMPLATES]
      .filter((template) => organizationActive(template, year));

    activeTemplates.forEach((template) => {
      const members = scenario.countries.filter(template.rule).map((country) => Number(country.id));
      if (members.length < 2 && !template.global) return;
      if (state.organizations.some((organization) => organization.id === template.id)) return;
      state.organizations.push({ id: template.id, name: template.name, global: template.global, members });
      if (template.global) return;
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          setInitialRelation(state, members[i], members[j], Math.max(state.relations[relationKey(members[i], members[j])] || 0, template.relation || 15));
          if (MILITARY_ORGANIZATION_IDS.has(template.id)) addAlliance(state, members[i], members[j]);
        }
      }
      if (template.trade) seedOrganizationTrade(state, members, template.id);
    });

    seedHistoricalRelations(state, scenario, year);
    seedHistoricalWars(state, scenario, year);
    seedHistoricalTrade(state, scenario, year);
  }

  function seedOrganizationTrade(state, members, organizationId) {
    const categories = ["raw", "food", "industry", "energy"];
    members.slice(0, 18).forEach((fromId, index) => {
      const toId = members[(index + 1) % members.length];
      addHistoricalTrade(state, fromId, toId, categories[(hashNumber(`${organizationId}:${fromId}:${toId}`) % categories.length)]);
    });
  }

  function seedHistoricalRelations(state, scenario, year) {
    HISTORICAL_RELATION_RULES
      .filter((rule) => yearInRange(year, rule.start, rule.end))
      .forEach((rule) => {
        const left = matchingCountryIds(scenario, rule.a);
        const right = matchingCountryIds(scenario, rule.b);
        left.forEach((a) => {
          right.forEach((b) => {
            if (a === b) return;
            if (rule.value >= 0) setInitialRelationAtLeast(state, a, b, rule.value);
            else setInitialRelationAtMost(state, a, b, rule.value);
          });
        });
      });
  }

  function enforceSpecialRelations(state, scenario) {
    const year = scenarioYear(scenario);
    if (year >= 1991) {
      const russiaIds = matchingCountryIds(scenario, /Россия|Российская Федерация/i);
      const belarusIds = matchingCountryIds(scenario, /Беларусь|Белоруссия/i);
      russiaIds.forEach((russiaId) => {
        belarusIds.forEach((belarusId) => {
          if (russiaId === belarusId) return;
          setInitialRelationAtLeast(state, russiaId, belarusId, 90);
          addAlliance(state, russiaId, belarusId);
        });
      });
    }
  }

  function seedHistoricalWars(state, scenario, year) {
    HISTORICAL_WAR_TEMPLATES
      .filter((war) => yearInRange(year, war.start, war.end))
      .forEach((war) => addHistoricalWar(state, scenario, war));
  }

  function seedHistoricalTrade(state, scenario, year) {
    HISTORICAL_TRADE_RULES
      .filter((rule) => yearInRange(year, rule.start, rule.end))
      .forEach((rule) => {
        const exporters = matchingCountryIds(scenario, rule.from).slice(0, 10);
        const importers = matchingCountryIds(scenario, rule.to).slice(0, 14);
        exporters.forEach((fromId, index) => {
          const toId = importers[index % Math.max(1, importers.length)];
          if (relationValue(state, fromId, toId) >= -20) addHistoricalTrade(state, fromId, toId, rule.category);
        });
      });

    state.organizations
      .filter((organization) => !organization.global && organization.members.length >= 3)
      .forEach((organization) => seedOrganizationTrade(state, organization.members, organization.id));
  }

  function seedScenarioArmies(state, scenario) {
    (scenario.armies || []).forEach((army, index) => {
      const ownerId = Number(army.countryId || army.ownerCountryId);
      const runtime = state.countryStates[String(ownerId)];
      if (!runtime) return;
      runtime.armies.push({
        id: `${ownerId}-scenario-${index}`,
        name: army.name || `${runtime.armies.length + 1}-я армия`,
        ownerCountryId: ownerId,
        regionId: Number(army.regionId),
        soldiers: Math.max(500, Number(army.strength || 1) * 1000),
        readiness: 70,
        movingTo: null,
        eta: 0,
      });
    });
  }

  function addLog(text) {
    if (!strategyState) return;
    strategyState.log.unshift(text);
    strategyState.log = strategyState.log.slice(0, 8);
    showNotification(text);
  }

  function showNotification(text) {
    if (!gameScreen?.classList.contains("active")) return;
    let stack = document.getElementById("notificationStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "notificationStack";
      stack.className = "notification-stack";
      gameScreen.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = "game-notification";
    item.textContent = text;
    stack.prepend(item);
    window.setTimeout(() => item.classList.add("hide"), 4200);
    window.setTimeout(() => item.remove(), 5000);
    while (stack.children.length > 5) stack.lastElementChild?.remove();
  }

  function countryById(id) {
    return gameData?.scenario.countries.find((country) => Number(country.id) === Number(id)) || null;
  }

  function directOwnerOfRegion(regionId) {
    return gameData?.scenario.countries.find((country) => (country.regionIds || []).some((id) => Number(id) === Number(regionId))) || null;
  }

  function rebuildOwnerByRegion() {
    if (!gameData?.scenario) return new Map();
    const ownerByRegion = new Map();
    gameData.scenario.countries.forEach((country) => {
      (country.regionIds || []).forEach((regionId) => ownerByRegion.set(Number(regionId), country));
    });
    gameData.ownerByRegion = ownerByRegion;
    return ownerByRegion;
  }

  function ownerOfRegion(regionId) {
    const cached = gameData?.ownerByRegion?.get(Number(regionId));
    return cached || directOwnerOfRegion(regionId);
  }

  function controllerOfRegion(regionId) {
    const occupation = (gameData?.scenario.occupations || []).find((item) => Number(item.regionId) === Number(regionId));
    return occupation ? countryById(occupation.controllerCountryId) : ownerOfRegion(regionId);
  }

  function hasMilitaryAccess(countryId, hostId) {
    return Number(countryId) === Number(hostId) ||
      strategyState?.accessTreaties.some((item) => Number(item.from) === Number(countryId) && Number(item.host) === Number(hostId)) ||
      strategyState?.countryStates[String(countryId)]?.allies.includes(Number(hostId));
  }

  function isAtWar(a, b) {
    return strategyState?.wars.some((war) => war.active &&
      ((Number(war.attackerId) === Number(a) && Number(war.defenderId) === Number(b)) ||
      (Number(war.attackerId) === Number(b) && Number(war.defenderId) === Number(a))));
  }

  function applyFocusReward(runtime, reward) {
    const country = countryById(runtime.countryId);
    runtime.politicalPower += reward.politicalPower || 0;
    runtime.commandPower += reward.commandPower || 0;
    runtime.stability = clamp(runtime.stability + (reward.stability || 0), 0, 100);
    runtime.warSupport = clamp(runtime.warSupport + (reward.warSupport || 0), 0, 100);
    runtime.manpower += reward.manpower || 0;
    runtime.factories += reward.factories || 0;
    runtime.gdp += reward.gdp || 0;
    runtime.budget += reward.budget || 0;
    if (reward.nuclearProgram && runtime.nuclear) {
      const nptPenalty = treatyActive("npt") && !NUCLEAR_CAPABLE_COUNTRIES.has(country?.name || "");
      if (nptPenalty) {
        runtime.politicalPower = Math.max(0, runtime.politicalPower - 60);
        gameData?.scenario?.countries?.forEach((other) => {
          if (Number(other.id) !== Number(runtime.countryId)) setRelation(runtime.countryId, other.id, getRelation(runtime.countryId, other.id) - 4);
        });
      }
      runtime.nuclear.program = true;
      runtime.nuclear.doctrine = runtime.nuclear.doctrine === "нет" ? "создание арсенала" : runtime.nuclear.doctrine;
    }
    if (reward.nuclearReactors && runtime.nuclear) runtime.nuclear.reactors += reward.nuclearReactors;
    if (reward.nuclearWarheads && runtime.nuclear) runtime.nuclear.warheads += reward.nuclearWarheads;
    Object.keys(RESOURCE_LABELS).forEach((resource) => {
      runtime.resources[resource] += reward[resource] || 0;
    });
    if (reward.ideology && IDEOLOGY_OPTIONS.some((item) => item.id === reward.ideology)) setRuntimeIdeology(runtime, country, reward.ideology);
    if (reward.reform) {
      String(reward.reform).split(/[;|]/).map((item) => item.trim()).filter(Boolean).forEach((reformId) => {
        const reform = GOVERNMENT_REFORMS.find((item) => item.id === reformId);
        if (reform && !runtime.reforms.includes(reform.id)) {
          runtime.reforms.push(reform.id);
          applyModifierEffects(runtime, reform.effects || {});
        }
      });
    }
    Object.entries(reward).forEach(([key, value]) => {
      const match = key.match(/^law:(.+)$/);
      if (!match || !LAW_GROUPS[match[1]]) return;
      const law = LAW_GROUPS[match[1]].options.find((item) => item.id === value);
      if (law && runtime.laws[match[1]] !== law.id) {
        runtime.laws[match[1]] = law.id;
        applyModifierEffects(runtime, law.effects || {});
      }
    });
    if (country && reward.rename) {
      country.name = String(reward.rename);
      gameCountryName.textContent = country.name;
    }
    if (country && reward.color) country.color = String(reward.color);
    if (reward.formedNation) runtime.formedNation = String(reward.formedNation);
    if (reward.integrateCountry && country) {
      const transferred = integrateCountryIntoActor(String(reward.integrateCountry), country.id);
      if (transferred) addLog(`Объединены территории страны ${reward.integrateCountry}: ${transferred} рег.`);
    }
  }

  function applyModifierEffects(runtime, effects, sign = 1) {
    runtime.politicalPower += (effects.politicalPower || 0) * sign;
    runtime.commandPower = clamp(runtime.commandPower + (effects.commandPower || 0) * sign, 0, 100);
    runtime.stability = clamp(runtime.stability + (effects.stability || 0) * sign, 0, 100);
    runtime.warSupport = clamp(runtime.warSupport + (effects.warSupport || 0) * sign, 0, 100);
    runtime.manpower += (effects.manpower || 0) * sign;
    runtime.factories = Math.max(0, runtime.factories + (effects.factories || 0) * sign);
    runtime.gdp += (effects.gdp || 0) * sign;
    runtime.budget += (effects.budget || 0) * sign;
    runtime.intel += (effects.intel || 0) * sign;
    runtime.armyXp += (effects.armyXp || 0) * sign;
    Object.keys(runtime.modifiers).forEach((key) => {
      if (key === "focusSlots") return;
      runtime.modifiers[key] += (effects[key] || 0) * sign;
    });
    Object.keys(RESOURCE_LABELS).forEach((resource) => {
      runtime.resources[resource] += (effects[resource] || 0) * sign;
    });
  }

  function recalculateRuntimeFromRegions(runtime) {
    if (!runtime) return;
    const profiles = Object.values(runtime.regionProfiles || {});
    if (!profiles.length) return;
    runtime.population = profiles.reduce((sum, profile) => sum + (profile.population || 0), 0);
    runtime.gdp = Math.max(1, Math.round(profiles.reduce((sum, profile) => sum + (profile.gdp || 0), 0)));
    updateMacroIndicators(runtime);
  }

  function moveRegionOwnership(regionId, actorId) {
    const region = Number(regionId);
    const actor = countryById(actorId);
    const previousOwner = directOwnerOfRegion(region);
    if (isAntarcticRegion(region)) return false;
    if (!actor || Number(actor.id) === Number(previousOwner?.id)) return false;
    if (RUSSIAN_TERRITORY_TRANSFER_LOCKED && isProtectedRussianRegion(region) && actor && !isRussiaCountry(actor)) return false;
    const previousRuntime = previousOwner ? strategyState.countryStates[String(previousOwner.id)] : null;
    const actorRuntime = strategyState.countryStates[String(actor.id)];
    if (!actorRuntime) return false;

    gameData.scenario.countries.forEach((country) => {
      country.regionIds = (country.regionIds || []).filter((id) => Number(id) !== region);
    });
    actor.regionIds = [...new Set([...(actor.regionIds || []).map(Number), region])];
    if (!actor.capitalRegionId) actor.capitalRegionId = region;
    if (previousOwner && Number(previousOwner.capitalRegionId) === region) {
      previousOwner.capitalRegionId = Number(previousOwner.regionIds?.[0] || 0);
    }
    if (previousRuntime?.regionProfiles[String(region)]) {
      actorRuntime.regionProfiles[String(region)] = previousRuntime.regionProfiles[String(region)];
      delete previousRuntime.regionProfiles[String(region)];
    } else if (!actorRuntime.regionProfiles[String(region)]) {
      actorRuntime.regionProfiles[String(region)] = createRegionProfile(region, actor, actorRuntime);
    }
    gameData.scenario.occupations = (gameData.scenario.occupations || []).filter((occupation) => Number(occupation.regionId) !== region);
    rebuildOwnerByRegion();
    recalculateRuntimeFromRegions(previousRuntime);
    recalculateRuntimeFromRegions(actorRuntime);
    return true;
  }

  function canPayRuntimeCost(runtime, cost) {
    return Object.keys(cost).every((key) => {
      if (key === "budget") return runtime.budget >= cost[key];
      if (key === "intel") return runtime.intel >= cost[key];
      if (key === "politicalPower") return runtime.politicalPower >= cost[key];
      return runtime.resources[key] >= cost[key];
    });
  }

  function payRuntimeCost(runtime, cost) {
    Object.keys(cost).forEach((key) => {
      if (key === "budget") runtime.budget -= cost[key];
      else if (key === "intel") runtime.intel -= cost[key];
      else if (key === "politicalPower") runtime.politicalPower -= cost[key];
      else runtime.resources[key] -= cost[key];
    });
  }

  function focusCsvKey(countryName, scenarioYear) {
    return `${countryName}[${Number(scenarioYear) || scenarioYear}]`;
  }

  function focusCsvPath(countryName, scenarioYear) {
    return `${FOCUS_CSV_DIR}/${encodeURIComponent(`${focusCsvKey(countryName, scenarioYear)}.csv`)}`;
  }

  async function loadFocusManifest() {
    if (csvFocusManifestLoaded) return;
    if (csvFocusManifestLoad) return csvFocusManifestLoad;

    csvFocusManifestLoad = fetch(`${FOCUS_CSV_DIR}/manifest.json?v=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const manifest = await response.json();
        (Array.isArray(manifest.files) ? manifest.files : []).forEach((file) => {
          const name = String(file || "").replace(/\.csv$/i, "");
          if (name) csvFocusAvailable.add(name);
        });
      })
      .catch((error) => {
        console.warn("Не удалось загрузить manifest CSV-фокусов.", error);
      })
      .finally(() => {
        csvFocusManifestLoaded = true;
        csvFocusManifestLoad = null;
      });
    return csvFocusManifestLoad;
  }

  function normalizeCsvHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/ё/g, "е");
  }

  function normalizeFocusLookup(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е");
  }

  function focusRawIdFromName(name, fallback) {
    const slug = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
    return slug || fallback;
  }

  function parseCsvTable(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (quoted) {
        if (char === "\"" && next === "\"") {
          cell += "\"";
          index += 1;
        } else if (char === "\"") {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === "\"") {
        quoted = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== "\r") {
        cell += char;
      }
    }

    row.push(cell);
    if (row.some((item) => item.trim())) rows.push(row);
    return rows.filter((items) => items.some((item) => item.trim()));
  }

  function csvValue(row, headerMap, aliases) {
    for (const alias of aliases) {
      const index = headerMap.get(normalizeCsvHeader(alias));
      if (index !== undefined && row[index] !== undefined && String(row[index]).trim()) return String(row[index]).trim();
    }
    return "";
  }

  function csvSeries(row, headerMap, prefixes, count) {
    const values = [];
    for (let index = 1; index <= count; index += 1) {
      const value = csvValue(row, headerMap, prefixes.map((prefix) => `${prefix}${index}`));
      if (value) values.push(value);
    }
    return values;
  }

  function parseFocusAvailableDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const ruMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ruMatch) {
      return `${ruMatch[3]}-${ruMatch[2].padStart(2, "0")}-${ruMatch[1].padStart(2, "0")}`;
    }
    const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }

  function gameDateLabel(date = strategyState?.date, options = {}) {
    if (!date) return "";
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: options.short ? "2-digit" : "long",
      year: "numeric",
    });
  }

  function isFocusDateAvailable(focus) {
    if (!focus?.availableFrom || !strategyState?.date) return true;
    return strategyState.date >= new Date(`${focus.availableFrom}T00:00:00`);
  }

  const FOCUS_REWARD_ALIASES = {
    politicalPower: ["politicalpower", "политвласть", "политическаявласть", "пп"],
    commandPower: ["commandpower", "командование", "команднаявласть"],
    stability: ["stability", "стабильность"],
    warSupport: ["warsupport", "поддержкавойны"],
    manpower: ["manpower", "людскойресурс", "людскиересурсы", "рекруты"],
    factories: ["factories", "фабрики", "заводы"],
    gdp: ["gdp", "ввп"],
    budget: ["budget", "бюджет"],
    oil: ["oil", "нефть"],
    steel: ["steel", "сталь"],
    food: ["food", "продовольствие", "еда"],
    rare: ["rare", "редкиересурсы", "редкие"],
    nuclearProgram: ["nuclearprogram", "ядернаяпрограмма"],
    nuclearReactors: ["nuclearreactors", "реакторы", "ядерныереакторы"],
    nuclearWarheads: ["nuclearwarheads", "боеголовки", "ядерныебоеголовки"],
    ideology: ["ideology", "идеология", "курсивласти", "формаправления"],
    reform: ["reform", "реформа"],
    rename: ["rename", "name", "названиестраны", "переименовать"],
    color: ["color", "цвет"],
    formedNation: ["formednation", "formed", "государство", "сформировано"],
    integrateCountry: ["integratecountry", "annexcountry", "объединитьстрану", "присоединитьстрану"],
  };

  function focusRewardKey(rawKey) {
    const normalized = normalizeCsvHeader(rawKey);
    return Object.entries(FOCUS_REWARD_ALIASES)
      .find(([, aliases]) => aliases.includes(normalized))?.[0] || null;
  }

  function parseFocusRewardCell(cell) {
    const text = String(cell || "").trim();
    if (!text) return null;
    const fullLawMatch = text.match(/^(?:law|закон)[:.\-](.+?)\s*=\s*(.+)$/i);
    if (fullLawMatch) return [`law:${normalizeCsvHeader(fullLawMatch[1])}`, String(fullLawMatch[2]).trim()];
    const match = text.match(/^(.+?)(?:\s*[=:]\s*|\s+)(.+)$/);
    if (!match) return null;
    const rawKey = match[1];
    const lawMatch = normalizeCsvHeader(rawKey).match(/^law[:.\-]?(.+)$/) || normalizeCsvHeader(rawKey).match(/^закон[:.\-]?(.+)$/);
    if (lawMatch) return [`law:${lawMatch[1]}`, String(match[2]).trim()];
    const key = focusRewardKey(rawKey);
    if (!key) return null;
    const value = String(match[2]).trim();
    const numeric = value.match(/^[-+]?\d+(?:[.,]\d+)?$/);
    return [key, numeric ? Number(value.replace(",", ".")) || 0 : value];
  }

  function parseFocusRewards(cells) {
    return cells.reduce((reward, cell) => {
      String(cell || "")
        .split(/[;|]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          const parsed = parseFocusRewardCell(part);
          if (!parsed) return;
          if (typeof parsed[1] === "number") reward[parsed[0]] = (Number(reward[parsed[0]]) || 0) + parsed[1];
          else reward[parsed[0]] = parsed[1];
        });
      return reward;
    }, {});
  }

  function parseCsvFocusTree(text) {
    const table = parseCsvTable(text);
    if (table.length < 2) return [];
    const headers = table[0];
    const headerMap = new Map(headers.map((header, index) => [normalizeCsvHeader(header), index]));
    const rows = table.slice(1);
    const focuses = rows.map((row, index) => {
      const name = csvValue(row, headerMap, ["название", "name", "title"]);
      if (!name) return null;
      const rawId = focusRawIdFromName(csvValue(row, headerMap, ["id", "ид"]) || name, `focus-${index + 1}`);
      return {
        id: rawId,
        name,
        text: csvValue(row, headerMap, ["описание", "description", "text"]) || "Фокус без описания.",
        details: csvValue(row, headerMap, ["подробно", "полноеописание", "развернутоеописание", "details", "fulltext", "longtext"]),
        days: Number(csvValue(row, headerMap, ["дни", "days"])) || 70,
        availableFrom: parseFocusAvailableDate(csvValue(row, headerMap, ["доступнос", "доступенс", "открывается", "availablefrom", "available", "date"])),
        x: Number(csvValue(row, headerMap, ["x", "столбец", "колонка"])) || undefined,
        y: Number(csvValue(row, headerMap, ["y", "строка"])) || undefined,
        branch: csvValue(row, headerMap, ["ответвление", "branch"]),
        blocksBranches: csvSeries(row, headerMap, ["блокировать", "block", "blockbranch"], 3),
        reward: parseFocusRewards(csvSeries(row, headerMap, ["награда", "reward"], 10)),
        csvRandomCompletions: csvSeries(row, headerMap, ["случайно", "random", "randomcomplete", "randomfocus"], 10),
        csvRequires: csvSeries(row, headerMap, ["требование", "requires", "requirement"], 10),
        csvNext: csvSeries(row, headerMap, ["после", "after", "next"], 10),
      };
    }).filter(Boolean);

    const lookup = new Map();
    focuses.forEach((focus) => {
      lookup.set(normalizeFocusLookup(focus.id), focus.id);
      lookup.set(normalizeFocusLookup(focus.name), focus.id);
    });

    focuses.forEach((focus) => {
      focus.requires = focus.csvRequires
        .map((value) => lookup.get(normalizeFocusLookup(value)))
        .filter(Boolean);
      focus.randomCompletions = focus.csvRandomCompletions
        .map((value) => lookup.get(normalizeFocusLookup(value)))
        .filter(Boolean);
    });
    focuses.forEach((focus) => {
      focus.csvNext
        .map((value) => lookup.get(normalizeFocusLookup(value)))
        .filter(Boolean)
        .forEach((nextId) => {
          const nextFocus = focuses.find((item) => item.id === nextId);
          if (nextFocus && !nextFocus.requires.includes(focus.id)) nextFocus.requires.push(focus.id);
        });
    });

    const branchColumns = new Map();
    let nextBranchColumn = 1;
    const rowByBranch = new Map();
    focuses.forEach((focus, index) => {
      const branch = focus.branch || "main";
      if (!branchColumns.has(branch)) {
        branchColumns.set(branch, focus.x || nextBranchColumn);
        nextBranchColumn = Math.max(nextBranchColumn, branchColumns.get(branch) + 1);
      }
      const branchRow = (rowByBranch.get(branch) || 0) + 1;
      rowByBranch.set(branch, branchRow);
      focus.x = focus.x || branchColumns.get(branch);
      focus.y = focus.y || branchRow;
      focus.requires = [...new Set(focus.requires)];
      delete focus.csvRequires;
      delete focus.csvRandomCompletions;
      delete focus.csvNext;
      if (!focus.branch) delete focus.branch;
      if (!focus.blocksBranches.length) delete focus.blocksBranches;
      if (focuses.some((other, otherIndex) => other.id === focus.id && otherIndex !== index)) {
        focus.id = `${focus.id}-${index + 1}`;
      }
    });

    return focuses;
  }

  async function loadCsvFocusTree(countryName, scenarioYear) {
    const key = focusCsvKey(countryName, scenarioYear);
    if (csvFocusTrees.has(key) || missingCsvFocusTrees.has(key)) return csvFocusTrees.get(key) || null;
    await loadFocusManifest();
    if (csvFocusManifestLoaded && csvFocusAvailable.size && !csvFocusAvailable.has(key)) {
      missingCsvFocusTrees.add(key);
      return null;
    }
    if (csvFocusTreeLoads.has(key)) return csvFocusTreeLoads.get(key);

    const load = fetch(`${focusCsvPath(countryName, scenarioYear)}?v=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          missingCsvFocusTrees.add(key);
          return null;
        }
        const tree = parseCsvFocusTree(await response.text());
        if (tree.length) csvFocusTrees.set(key, tree);
        else missingCsvFocusTrees.add(key);
        return tree.length ? tree : null;
      })
      .catch((error) => {
        missingCsvFocusTrees.add(key);
        console.warn(`Не удалось загрузить CSV-фокусы ${key}.`, error);
        return null;
      })
      .finally(() => csvFocusTreeLoads.delete(key));
    csvFocusTreeLoads.set(key, load);
    return load;
  }

  function getFocusTree(country, scenarioYear) {
    const csvTree = csvFocusTrees.get(focusCsvKey(country.name, scenarioYear));
    const base = csvTree || (Number(scenarioYear) === 2026 ? MAJOR_FOCUS_TREES[country.name] : null);
    if (!base) return [];
    return base.map((focus) => ({
      ...focus,
      id: `${country.id}-${focus.id}`,
      rawId: focus.id,
      reward: focus.reward || {},
      days: focus.days || 70,
      availableFrom: focus.availableFrom,
      requires: (focus.requires || []).map((id) => `${country.id}-${id}`),
      randomCompletions: (focus.randomCompletions || []).map((id) => `${country.id}-${id}`),
    }));
  }

  function hasUniqueFocusTree(country, scenarioYear = selectedScenario?.year || PLAYABLE_SCENARIO_YEAR) {
    if (!country) return false;
    const key = focusCsvKey(country.name, scenarioYear);
    return Boolean(csvFocusTrees.has(key) ||
      csvFocusAvailable.has(key) ||
      (Number(scenarioYear) === 2026 && MAJOR_FOCUS_TREES[country.name]));
  }

  function focusIdFor(country, rawId) {
    return `${country.id}-${rawId}`;
  }

  function availableFormables(country, runtime) {
    if (!country || !runtime) return [];
    const originName = runtime.originCountryName || country.name;
    return Object.entries(FORMABLE_NATIONS)
      .filter(([, formable]) => formable.requiredCountry === originName)
      .map(([id, formable]) => ({ id, ...formable }));
  }

  function controlsCountryTerritory(runtime, countryName) {
    const target = gameData?.scenario.countries.find((country) => country.name === countryName);
    if (!runtime || !target) return false;
    const regions = target.regionIds || [];
    if (!regions.length) return true;
    return regions.every((regionId) => Number(controllerOfRegion(regionId)?.id) === Number(runtime.countryId) ||
      Number(ownerOfRegion(regionId)?.id) === Number(runtime.countryId));
  }

  function formableRequirementStatus(formable, player, runtime) {
    if (!formable || !player || !runtime) return [];
    const requirements = formable.requirements || {};
    const statuses = [
      {
        ok: runtime.completedFocuses.includes(focusIdFor(player, formable.requiredFocus)),
        text: `Завершить фокус: ${formable.requiredFocus}`,
      },
    ];
    if (requirements.ideology) {
      const ideology = IDEOLOGY_OPTIONS.find((item) => item.id === requirements.ideology);
      statuses.push({
        ok: runtime.ideology === requirements.ideology,
        text: `Курс власти: ${ideology?.name || requirements.ideology}`,
      });
    }
    (requirements.reforms || []).forEach((reformId) => {
      const reform = GOVERNMENT_REFORMS.find((item) => item.id === reformId);
      statuses.push({
        ok: runtime.reforms.includes(reformId),
        text: `Реформа: ${reform?.name || reformId}`,
      });
    });
    Object.entries(requirements.laws || {}).forEach(([groupId, allowed]) => {
      const group = LAW_GROUPS[groupId];
      const current = group?.options.find((item) => item.id === runtime.laws[groupId]);
      statuses.push({
        ok: allowed.includes(runtime.laws[groupId]),
        text: `${group?.label || groupId}: ${current?.name || runtime.laws[groupId]}`,
      });
    });
    (requirements.controlCountries || []).forEach((countryName) => {
      statuses.push({
        ok: controlsCountryTerritory(runtime, countryName),
        text: `Контролировать территории: ${countryName}`,
      });
    });
    return statuses;
  }

  function canFormNation(formable, player, runtime) {
    return formableRequirementStatus(formable, player, runtime).every((item) => item.ok);
  }

  function sanitizeRussianTerritory(scenario, protectedRegions = gameData?.protectedRussianRegionIds || initialRussianRegionIds(scenario)) {
    if (!RUSSIAN_TERRITORY_TRANSFER_LOCKED) return;
    if (!protectedRegions?.size) return;
    scenario.occupations = (scenario.occupations || []).filter((occupation) => {
      const regionId = Number(occupation.regionId);
      if (!protectedRegions.has(regionId)) return true;
      const owner = scenario.countries.find((country) => (country.regionIds || []).some((id) => Number(id) === regionId));
      return owner && Number(occupation.controllerCountryId) === Number(owner.id);
    });
  }

  function canOccupyRegion(regionId, controllerCountryId) {
    const owner = gameData?.ownerByRegion?.get(Number(regionId));
    if (treatyActive("antarctic") && isAntarcticRegion(regionId)) {
      addLog("Операция отменена: Договор об Антарктике запрещает оккупацию этих регионов.");
      return false;
    }
    if (RUSSIAN_TERRITORY_TRANSFER_LOCKED && isProtectedRussianRegion(regionId) && owner && Number(owner.id) !== Number(controllerCountryId)) {
      addLog("Операция отменена: исходные регионы России защищены правилом территориальной целостности.");
      return false;
    }
    return true;
  }

  function ideologyById(id) {
    return [...IDEOLOGY_OPTIONS, ...RESERVED_IDEOLOGY_OPTIONS].find((item) => item.id === id) || IDEOLOGY_OPTIONS[0];
  }

  function reservedIdeologyVisible(country, runtime, ideologyId) {
    if (!RESERVED_IDEOLOGY_OPTIONS.some((item) => item.id === ideologyId)) return true;
    if (runtime?.ideology === ideologyId) return true;
    return Boolean(country && /Германи/i.test(country.name || ""));
  }

  function availableIdeologyOptions(country, runtime) {
    return [
      ...IDEOLOGY_OPTIONS,
      ...RESERVED_IDEOLOGY_OPTIONS.filter((item) => reservedIdeologyVisible(country, runtime, item.id)),
    ];
  }

  function maxActiveFocuses(runtime) {
    const ideology = ideologyById(runtime?.ideology);
    return Math.max(1, 1 + (ideology?.effects?.focusSlots || 0) + (runtime?.modifiers?.focusSlots || 0));
  }

  function getActiveFocuses(runtime) {
    if (!runtime) return [];
    if (!Array.isArray(runtime.activeFocuses)) runtime.activeFocuses = [];
    if (runtime.focusId && !runtime.activeFocuses.some((item) => item.id === runtime.focusId)) {
      runtime.activeFocuses.push({ id: runtime.focusId, progress: runtime.focusProgress || 0 });
    }
    runtime.activeFocuses = runtime.activeFocuses.slice(0, maxActiveFocuses(runtime));
    syncLegacyFocus(runtime);
    return runtime.activeFocuses;
  }

  function syncLegacyFocus(runtime) {
    const first = runtime?.activeFocuses?.[0];
    if (!runtime) return;
    runtime.focusId = first?.id || null;
    runtime.focusProgress = first?.progress || 0;
  }

  function startFocus(focusId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const focus = getFocusTree(player, gameData.scenario.year).find((item) => item.id === focusId);
    if (!focus || !runtime) return;
    if (!isFocusDateAvailable(focus)) {
      addLog(`Фокус станет доступен ${gameDateLabel(new Date(`${focus.availableFrom}T00:00:00`))}.`);
      renderStrategyPanel();
      return;
    }
    if (focus.branch && (runtime.blockedFocusBranches || []).includes(focus.branch)) {
      addLog("Это ответвление фокусов заблокировано другим выбранным курсом.");
      renderStrategyPanel();
      return;
    }
    if (focus.requires.some((id) => !runtime.completedFocuses.includes(id))) {
      addLog("Сначала завершите предыдущий фокус ветки.");
      renderStrategyPanel();
      return;
    }
    if (runtime.completedFocuses.includes(focus.id)) return;
    const activeFocuses = getActiveFocuses(runtime);
    if (activeFocuses.some((item) => item.id === focus.id)) return;
    const focusSlots = maxActiveFocuses(runtime);
    if (activeFocuses.length >= focusSlots) {
      addLog(`Нет свободного слота фокуса. Текущий лимит: ${focusSlots}.`);
      renderStrategyPanel();
      return;
    }
    activeFocuses.push({ id: focus.id, progress: 0 });
    syncLegacyFocus(runtime);
    addLog(`Начат фокус: ${focus.name}.`);
    playSound("focus");
    renderStrategyPanel();
  }

  function completeFocusResult(runtime, focus, prefix = "Фокус завершен") {
    if (!runtime || !focus || runtime.completedFocuses.includes(focus.id)) return false;
    runtime.completedFocuses.push(focus.id);
    applyFocusReward(runtime, focus.reward);
    if (focus.blocksBranches?.length) {
      runtime.blockedFocusBranches = [...new Set([...(runtime.blockedFocusBranches || []), ...focus.blocksBranches])];
    }
    addLog(`${prefix}: ${focus.name}.`);
    return true;
  }

  function completeFocusIfReady(runtime, player) {
    const activeFocuses = getActiveFocuses(runtime);
    if (!activeFocuses.length) return;
    const focuses = getFocusTree(player, gameData.scenario.year);
    let completedAny = false;
    runtime.activeFocuses = activeFocuses.filter((activeFocus) => {
      const focus = focuses.find((item) => item.id === activeFocus.id);
      if (!focus) return false;
      activeFocus.progress += 1;
      if (activeFocus.progress < focus.days) return true;
      completeFocusResult(runtime, focus);
      const randomTargets = (focus.randomCompletions || [])
        .map((id) => focuses.find((item) => item.id === id))
        .filter((item) => item && !runtime.completedFocuses.includes(item.id));
      if (randomTargets.length) {
        const selected = randomTargets[Math.floor(Math.random() * randomTargets.length)];
        completeFocusResult(runtime, selected, "Случайный исход");
      }
      completedAny = true;
      return false;
    });
    syncLegacyFocus(runtime);
    if (completedAny && Number(runtime.countryId) === Number(strategyState.playerCountryId)) playSound("focus");
  }

  function hasTechnology(runtime, techId) {
    return runtime.technologies.includes(techId);
  }

  function canPayCost(runtime, cost) {
    return Object.keys(cost).every((resource) => runtime.resources[resource] >= cost[resource]);
  }

  function payCost(runtime, cost) {
    Object.keys(cost).forEach((resource) => {
      runtime.resources[resource] -= cost[resource];
    });
  }

  function advanceProduction(runtime, options = {}) {
    const factoryTotal = Math.max(1, runtime.factories);
    let assignedTotal = runtime.production.reduce((sum, line) => sum + line.assigned, 0);
    if (assignedTotal > factoryTotal) {
      runtime.production.forEach((line) => {
        line.assigned = Math.max(0, Math.floor(line.assigned * factoryTotal / assignedTotal));
      });
      assignedTotal = runtime.production.reduce((sum, line) => sum + line.assigned, 0);
      if (assignedTotal === 0 && runtime.production[0]) runtime.production[0].assigned = 1;
    }
    runtime.production.forEach((line) => {
      const template = PRODUCTION_LINES.find((item) => item.id === line.lineId);
      if (!template || line.assigned <= 0) return;
      const speed = hasTechnology(runtime, "automation") ? 1.2 : 1;
      line.progress += line.assigned * speed;
      while (line.progress >= template.days) {
        if (!canPayCost(runtime, template.cost)) {
          line.progress = template.days - 1;
          return;
        }
        payCost(runtime, template.cost);
        line.progress -= template.days;
        template.apply(runtime);
        if (!options.silent) addLog(`Производство завершило выпуск: ${template.name}.`);
      }
    });
  }

  function advanceResearch(runtime, options = {}) {
    if (!runtime.activeResearchId) return;
    const project = RESEARCH_PROJECTS.find((item) => item.id === runtime.activeResearchId);
    if (!project) return;
    const sanctionPenalty = clamp(Number(runtime.sanctionResearchPenalty || 0), 0, 0.75);
    runtime.researchProgress += Math.max(0.25, 1 - sanctionPenalty);
    if (runtime.researchProgress < project.days) return;
    runtime.technologies.push(project.id);
    if (project.id === "nuclear-engineering" && runtime.nuclear) {
      if (!treatyActive("npt") || NUCLEAR_CAPABLE_COUNTRIES.has(countryById(runtime.countryId)?.name || "")) {
        runtime.nuclear.program = true;
        runtime.nuclear.doctrine = runtime.nuclear.doctrine === "нет" ? "создание арсенала" : runtime.nuclear.doctrine;
      }
    }
    runtime.activeResearchId = null;
    runtime.researchProgress = 0;
    if (!options.silent) addLog(`Исследование завершено: ${project.name}.`);
  }

  function advanceConstruction(runtime, options = {}) {
    runtime.constructions.forEach((project) => {
      if (project.done) return;
      project.progress += Math.max(1, runtime.factories * 0.08 * (1 + runtime.modifiers.factoryOutput));
      if (project.progress < project.days) return;
      project.done = true;
      const profile = runtime.regionProfiles[String(project.regionId)];
      const template = CONSTRUCTION_PROJECTS.find((item) => item.id === project.projectId);
      if (!profile || !template) return;
      profile.economy += template.effects.economy || 0;
      profile.gdp += template.effects.gdp || 0;
      profile.readySoldiers += template.effects.readySoldiers || 0;
      if (template.effects.building) profile.buildings.push(template.effects.building);
      if (template.effects.base) {
        profile.base = true;
        runtime.bases.push({ regionId: Number(project.regionId), hostCountryId: runtime.countryId, ownerCountryId: runtime.countryId, level: 1 });
      }
      runtime.gdp += template.effects.gdp || 0;
      runtime.factories += template.effects.factories || 0;
      runtime.commandPower = clamp(runtime.commandPower + (template.effects.commandPower || 0), 0, 100);
      runtime.stability = clamp(runtime.stability + (template.effects.stability || 0), 0, 100);
      Object.keys(RESOURCE_LABELS).forEach((resource) => {
        profile.resources[resource] += template.effects[resource] || 0;
      });
      if (!options.silent && Number(runtime.countryId) === Number(strategyState.playerCountryId)) addLog(`Строительство завершено: ${template.name}.`);
    });
    runtime.constructions = runtime.constructions.filter((project) => !project.done);
  }

  function advanceOperations(runtime, options = {}) {
    runtime.operations.forEach((operation) => {
      if (operation.done) return;
      operation.progress += 1;
      if (operation.progress < operation.days) return;
      operation.done = true;
      const template = INTELLIGENCE_OPERATIONS.find((item) => item.id === operation.operationId);
      const target = strategyState.countryStates[String(operation.targetId)];
      if (!template || !target) return;
      target.stability = clamp(target.stability + (template.effects.targetStability || 0), 0, 100);
      target.factories = Math.max(0, target.factories + (template.effects.targetFactories || 0));
      setRelation(runtime.countryId, operation.targetId, getRelation(runtime.countryId, operation.targetId) + (template.effects.relation || 0));
      applyModifierEffects(runtime, template.effects);
      if (!options.silent && Number(runtime.countryId) === Number(strategyState.playerCountryId)) addLog(`Операция завершена: ${template.name}.`);
    });
    runtime.operations = runtime.operations.filter((operation) => !operation.done);
  }

  function applyDailyEconomy(runtime) {
    const country = countryById(runtime.countryId);
    runtime.politicalPower += 1 + runtime.modifiers.politicalPowerDaily;
    runtime.commandPower = clamp(runtime.commandPower + 1, 0, 100);
    const economyLaw = LAW_GROUPS.economy.options.find((item) => item.id === runtime.laws.economy);
    const consumerGoods = economyLaw?.effects.consumerGoods ?? 0.25;
    runtime.budget += Math.max(1, runtime.gdp * runtime.taxRate / 36500 * (1 - consumerGoods * 0.35));
    runtime.manpower += Math.max(0, Math.round(runtime.population * runtime.modifiers.recruitable / 3650));
    if (country) updateDemocracy(runtime, country);
    if (strategyState.date.getDate() !== 1) return;
    runtime.politicalPower += 8 + Math.floor(runtime.stability / 25);
    const output = 1 + runtime.modifiers.factoryOutput;
    const resourceGain = 1 + runtime.modifiers.resourceGain;
    runtime.gdp = Math.max(1, Math.round(runtime.gdp * (1 + (runtime.stability - 45) / 12000) + runtime.factories * 0.15 * output));
    const currency = CURRENCY_POLICIES.find((item) => item.id === runtime.currencyPolicy) || CURRENCY_POLICIES[0];
    runtime.resources.food += Math.round((hasTechnology(runtime, "agrotech") ? 16 : 8) * resourceGain);
    runtime.resources.steel += Math.max(1, Math.floor(runtime.factories / 3 * resourceGain));
    runtime.resources.oil += Math.max(1, Math.floor(runtime.factories / 5 * resourceGain));
    runtime.resources.rare += Math.max(0, Math.floor(runtime.factories / 8 * resourceGain));
    const foreignYield = runtime.foreignAssets.filter((asset) => !asset.seized).reduce((sum, asset) => sum + asset.value, 0);
    const assetPenalty = clamp(Number(runtime.sanctionForeignAssetPenalty || 0), 0, 0.9);
    runtime.budget += Math.max(0, foreignYield * (1 - assetPenalty) / 80);
    runtime.gdp = Math.round(runtime.gdp * (1 + currency.trade / 500));
    runtime.resources.food = Math.max(0, runtime.resources.food - Math.max(1, Math.round(runtime.manpower / 260)));
    applyRegionalMinisters(runtime);
    updateMacroIndicators(runtime);
  }

  function applyRegionalMinisters(runtime) {
    Object.values(runtime.regionProfiles).forEach((profile) => {
      const minister = REGION_MINISTERS.find((item) => item.id === profile.minister) || REGION_MINISTERS[0];
      if (!minister.budgetShare || runtime.budget <= 1) return;
      const spend = Math.min(runtime.budget, Math.max(1, profile.economy * minister.budgetShare));
      runtime.budget -= spend;
      profile.ministerBudget += spend;
      profile.economy += minister.effects.economy || 0;
      profile.gdp += minister.effects.gdp || spend / 20;
      profile.population += Math.round(profile.population * (minister.effects.population || 0) / 12);
      Object.keys(RESOURCE_LABELS).forEach((resource) => {
        profile.resources[resource] += minister.effects[resource] || 0;
      });
      runtime.gdp += spend / 30;
    });
  }

  function advanceArmies() {
    allCountryStates().forEach((runtime) => {
      runtime.armies.forEach((army) => {
        if (!army.movingTo) return;
        army.eta -= 1;
        army.readiness = clamp(army.readiness - 0.4, 5, 100);
        if (army.eta > 0) return;
        army.regionId = Number(army.movingTo);
        army.movingTo = null;
        army.eta = 0;
        army.readiness = clamp(army.readiness + 6, 0, 100);
        if (Number(runtime.countryId) === Number(strategyState.playerCountryId)) {
          addLog(`${army.name} прибыла в регион.`);
        }
      });
    });
  }

  function targetArmyCount(country, runtime, minister = null) {
    const base = Math.max(3, Math.floor((country.regionIds || []).length / 55));
    if (minister?.mode === "aggressive") return base + 8;
    if (minister?.mode === "mobilization") return base + 10;
    if (minister?.mode === "balanced") return base + 5;
    return base;
  }

  function bestRecruitRegion(country, runtime, minimumSoldiers = 500) {
    return (country.regionIds || [])
      .map((regionId) => ({ regionId: Number(regionId), profile: runtime.regionProfiles[String(regionId)] }))
      .filter((item) => item.profile && item.profile.readySoldiers >= minimumSoldiers)
      .sort((a, b) => b.profile.readySoldiers - a.profile.readySoldiers)[0] || null;
  }

  function createAutomatedArmy(country, runtime, minister = null) {
    const minimum = minister?.mode === "mobilization" ? 250 : minister?.mode === "aggressive" ? 300 : 400;
    const picked = bestRecruitRegion(country, runtime, minimum);
    if (!picked) return null;
    const soldiers = Math.min(minister?.mode === "aggressive" ? 1200 : minister?.mode === "mobilization" ? 900 : 750, Math.floor(picked.profile.readySoldiers));
    const cost = Math.max(6, Math.ceil(soldiers / 70));
    const budgetFloor = minister?.mode === "aggressive" ? 4 : minister?.mode === "mobilization" ? 10 : 20;
    if (runtime.budget - cost < budgetFloor || soldiers < 100) return null;
    runtime.budget -= cost;
    picked.profile.readySoldiers -= soldiers;
    const army = {
      id: `${country.id}-auto-${Date.now()}-${runtime.armies.length}`,
      name: `${runtime.armies.length + 1}-я армия`,
      ownerCountryId: Number(country.id),
      regionId: picked.regionId,
      soldiers,
      readiness: minister?.mode === "aggressive" ? 66 : minister?.mode === "mobilization" ? 56 : 58,
      movingTo: null,
      eta: 0,
    };
    runtime.armies.push(army);
    return army;
  }

  function canAutoTargetRegion(regionId, controllerCountryId) {
    const owner = ownerOfRegion(regionId);
    if (!owner) return false;
    if (isAntarcticRegion(regionId)) return false;
    if (RUSSIAN_TERRITORY_TRANSFER_LOCKED && isProtectedRussianRegion(regionId) && Number(owner.id) !== Number(controllerCountryId)) return false;
    return true;
  }

  function adjacentRegionIds(regionId) {
    return gameData?.regionAdjacency?.get(Number(regionId)) || new Set();
  }

  function controlledRegionSet(countryId) {
    const regions = new Set();
    gameData.scenario.countries.forEach((country) => {
      (country.regionIds || []).forEach((regionId) => {
        if (Number(controllerOfRegion(regionId)?.id) === Number(countryId)) regions.add(Number(regionId));
      });
    });
    return regions;
  }

  function frontTargetRegions(country, enemy, limit = 8, army = null) {
    if (!enemy) return [];
    const occupied = new Set((gameData.scenario.occupations || []).map((occupation) => Number(occupation.regionId)));
    const controlled = controlledRegionSet(country.id);
    const armyAdjacent = army ? adjacentRegionIds(army.regionId) : new Set();
    const targetable = (enemy.regionIds || [])
      .map(Number)
      .filter((regionId) => !occupied.has(regionId) && canAutoTargetRegion(regionId, country.id));
    const borderTargets = targetable.filter((regionId) => {
      if (armyAdjacent.has(regionId)) return true;
      const neighbors = adjacentRegionIds(regionId);
      return [...neighbors].some((neighborId) => controlled.has(Number(neighborId)));
    });
    return (borderTargets.length ? borderTargets : targetable).slice(0, limit);
  }

  function autoOccupyArmyRegion(country, runtime, army, minister, logForPlayer) {
    const regionId = Number(army.regionId);
    const owner = ownerOfRegion(regionId);
    if (!owner || Number(owner.id) === Number(country.id) || !isAtWar(country.id, owner.id)) return false;
    if (!canAutoTargetRegion(regionId, country.id)) return false;
    const alreadyOccupied = (gameData.scenario.occupations || []).some((occupation) => Number(occupation.regionId) === regionId);
    if (alreadyOccupied) return false;
    const readinessNeed = minister.mode === "aggressive" ? 35 : minister.mode === "mobilization" ? 42 : 48;
    if (army.readiness < readinessNeed) return false;
    gameData.scenario.occupations.push({ regionId, controllerCountryId: Number(country.id) });
    army.readiness = clamp(army.readiness - 10, 5, 100);
    if (logForPlayer) addLog(`${minister.name} установил оккупацию региона ${gameData.regionById.get(regionId)?.name || regionId}. Территория не присоединена.`);
    return true;
  }

  function automateCountryArmies(country, runtime, options = {}) {
    const minister = options.minister || ARMY_MINISTERS.find((item) => item.id === runtime.armyMinister) || ARMY_MINISTERS[0];
    const activeWar = strategyState.wars.find((war) => war.active && (Number(war.attackerId) === Number(country.id) || Number(war.defenderId) === Number(country.id)));
    const desiredArmies = targetArmyCount(country, runtime, minister);
    const recruitmentBursts = minister.mode === "aggressive" ? 3 : minister.mode === "mobilization" ? 4 : 2;
    for (let index = 0; index < recruitmentBursts; index += 1) {
      const canRecruit = runtime.budget > (minister.mode === "aggressive" ? 12 : 22) && runtime.armies.length < desiredArmies;
      if (!canRecruit) break;
      const created = createAutomatedArmy(country, runtime, minister);
      if (created && options.logForPlayer) addLog(`${minister.name} сформировал ${created.name}.`);
      if (!created) break;
    }
    runtime.armies.forEach((army) => autoOccupyArmyRegion(country, runtime, army, minister, options.logForPlayer));
    if (!activeWar || !runtime.armies.length) return;
    const enemyId = Number(activeWar.attackerId) === Number(country.id) ? activeWar.defenderId : activeWar.attackerId;
    const enemy = countryById(enemyId);
    const freeArmies = runtime.armies.filter((item) => !item.movingTo);
    const ordersPerTick = minister.mode === "aggressive" ? 5 : minister.mode === "mobilization" ? 4 : 3;
    const assignedTargets = new Set();
    freeArmies
      .sort((a, b) => b.readiness - a.readiness)
      .slice(0, ordersPerTick)
      .forEach((army) => {
      const targetRegions = frontTargetRegions(country, enemy, Math.max(ordersPerTick * 3, 10), army);
      const targetRegion = targetRegions.find((regionId) => !assignedTargets.has(regionId)) || targetRegions[0];
      if (!targetRegion) return;
      assignedTargets.add(Number(targetRegion));
      army.movingTo = Number(targetRegion);
      army.eta = minister.mode === "aggressive" ? 4 : minister.mode === "mobilization" ? 6 : 8;
      if (options.logForPlayer) addLog(`${minister.name} отправил ${army.name} на фронт против ${enemy?.name || "противника"}.`);
    });
  }

  function runPlayerArmyMinister() {
    const runtime = currentPlayerState();
    const country = currentPlayerCountry();
    const minister = ARMY_MINISTERS.find((item) => item.id === runtime?.armyMinister);
    if (!runtime || !country || !minister || minister.id === "none") return;
    const day = strategyState.date.toISOString().slice(0, 10);
    automateCountryArmies(country, runtime, { minister, logForPlayer: runtime.armyAutomationLogDay !== day });
    if (minister.mode === "aggressive") automateCountryArmies(country, runtime, { minister, logForPlayer: false });
    runtime.armyAutomationLogDay = day;
  }

  function aiWarScore(attacker, defender) {
    const relation = getRelation(attacker.id, defender.id);
    const attackerRuntime = strategyState.countryStates[String(attacker.id)];
    const defenderRuntime = strategyState.countryStates[String(defender.id)];
    if (!attackerRuntime || !defenderRuntime || isAtWar(attacker.id, defender.id)) return -999;
    if (Number(attacker.id) === Number(defender.id)) return -999;
    const democracyPenalty = isDemocraticIdeology(attackerRuntime.ideology) ? Math.max(0, 80 - (attackerRuntime.democracy?.approval || 50)) * 1.8 : 0;
    if (attackerRuntime.warSupport < 35 || attackerRuntime.stability < 28) return -999 - democracyPenalty;
    const activeWars = strategyState.wars.filter((war) => war.active && (Number(war.attackerId) === Number(attacker.id) || Number(war.defenderId) === Number(attacker.id))).length;
    if (activeWars >= 2) return -999;
    const sharedBorder = (attacker.regionIds || []).some((regionId) =>
      [...adjacentRegionIds(regionId)].some((neighborId) => Number(ownerOfRegion(neighborId)?.id) === Number(defender.id)));
    const hostility = Math.max(0, -relation);
    const powerBalance = (attackerRuntime.factories + attackerRuntime.armies.length * 2 + attackerRuntime.warSupport / 12) -
      (defenderRuntime.factories + defenderRuntime.armies.length * 2 + defenderRuntime.warSupport / 14);
    const borderBonus = sharedBorder ? 35 : -25;
    const randomTension = hashNumber(`${attacker.id}:${defender.id}:${strategyState.date.toISOString().slice(0, 7)}`) % 24;
    const democracyCooldown = isDemocraticIdeology(attackerRuntime.ideology) ? Math.max(0, 65 - (attackerRuntime.democracy?.approval || 50)) * 1.3 : 0;
    return hostility + powerBalance + borderBonus + randomTension - activeWars * 25 - democracyCooldown;
  }

  function isCountryAtWar(countryId) {
    return strategyState.wars.some((war) => war.active && (Number(war.attackerId) === Number(countryId) || Number(war.defenderId) === Number(countryId)));
  }

  function aiChooseResearchProject(country, runtime) {
    const available = RESEARCH_PROJECTS.filter((project) => !runtime.technologies.includes(project.id));
    if (!available.length) return null;
    const atWar = isCountryAtWar(country.id);
    const weights = new Map([
      ["logistics", atWar ? 110 : 45],
      ["automation", runtime.factories > 6 ? 85 : 55],
      ["cyber", isDemocraticIdeology(runtime.ideology) ? 90 : 60],
      ["agrotech", runtime.resources.food < 80 ? 80 : 35],
      ["nuclear-engineering", NUCLEAR_CAPABLE_COUNTRIES.has(country.name) ? 100 : 15],
    ]);
    return available
      .map((project) => ({ project, score: (weights.get(project.id) || 25) + hashNumber(`${country.id}:${project.id}:${strategyState.date.toISOString().slice(0, 7)}`) % 12 }))
      .sort((a, b) => b.score - a.score)[0]?.project || null;
  }

  function aiRebalanceProduction(country, runtime) {
    const atWar = isCountryAtWar(country.id);
    const weights = atWar
      ? { infantry: 3, armor: 2, air: 1, civilian: 1 }
      : isDemocraticIdeology(runtime.ideology)
        ? { infantry: 1, armor: 0.4, air: 0.6, civilian: 3 }
        : { infantry: 2, armor: 1, air: 0.8, civilian: 2 };
    const total = Math.max(1, runtime.factories);
    const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
    const nextPlan = [
      ["infantry", Math.max(1, Math.round(total * (weights.infantry / weightTotal)))],
      ["armor", Math.max(0, Math.round(total * (weights.armor / weightTotal)))],
      ["air", Math.max(0, Math.round(total * (weights.air / weightTotal)))],
      ["civilian", Math.max(1, Math.round(total * (weights.civilian / weightTotal)))],
    ];
    const cap = total;
    let assigned = 0;
    runtime.production.forEach((line) => { line.assigned = 0; });
    nextPlan.forEach(([lineId, desired]) => {
      const line = runtime.production.find((item) => item.lineId === lineId);
      if (!line) return;
      const value = Math.max(0, Math.min(cap - assigned, desired));
      line.assigned = value;
      assigned += value;
    });
    if (assigned < cap) {
      const filler = runtime.production.find((item) => item.lineId === "infantry") || runtime.production[0];
      if (filler) filler.assigned += cap - assigned;
    }
  }

  function aiMaybeDiplomacy(country, runtime) {
    const candidates = gameData.scenario.countries
      .filter((candidate) => Number(candidate.id) !== Number(country.id) && !isAtWar(country.id, candidate.id))
      .map((candidate) => ({ candidate, relation: getRelation(country.id, candidate.id) }))
      .sort((a, b) => b.relation - a.relation);
    const best = candidates[0];
    if (!best) return;
    if (isDemocraticIdeology(runtime.ideology)) {
      if (best.relation < 15) return;
      setRelation(country.id, best.candidate.id, clamp(best.relation + 3, -100, 100));
      if (best.relation > 35 && !runtime.allies.includes(Number(best.candidate.id))) addAlliance(strategyState, country.id, best.candidate.id);
      return;
    }
    if (runtime.politicalPower > 120 && best.relation >= 0) {
      runtime.politicalPower -= 10;
      setRelation(country.id, best.candidate.id, best.relation + 5);
      if (best.relation > 30 && !runtime.allies.includes(Number(best.candidate.id))) addAlliance(strategyState, country.id, best.candidate.id);
    }
  }

  function aiMaybeStartWars() {
    if (strategyState.date.getDate() !== 7) return;
    const currentMonth = strategyState.date.toISOString().slice(0, 7);
    if (strategyState.lastAiWarMonth === currentMonth) return;
    const candidates = gameData.scenario.countries
      .filter((country) => Number(country.id) !== Number(strategyState.playerCountryId))
      .map((attacker) => {
        const target = gameData.scenario.countries
          .filter((country) => Number(country.id) !== Number(attacker.id))
          .map((defender) => ({ defender, score: aiWarScore(attacker, defender) }))
          .sort((a, b) => b.score - a.score)[0];
        return { attacker, defender: target?.defender, score: target?.score ?? -999 };
      })
      .filter((item) => item.defender && item.score >= 72)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    candidates.forEach(({ attacker, defender }) => {
      if (isAtWar(attacker.id, defender.id)) return;
      const runtime = strategyState.countryStates[String(attacker.id)];
      if (!runtime) return;
      runtime.politicalPower = Math.max(0, runtime.politicalPower - 35);
      runtime.warSupport = clamp(runtime.warSupport + 4, 0, 100);
      setRelation(attacker.id, defender.id, -100);
      strategyState.wars.push({
        attackerId: Number(attacker.id),
        defenderId: Number(defender.id),
        start: strategyState.date.toISOString().slice(0, 10),
        active: true,
      });
      addLog(`ИИ начал войну: ${attacker.name} против ${defender.name}.`);
      if (Number(defender.id) === Number(strategyState.playerCountryId) || Number(attacker.id) === Number(strategyState.playerCountryId)) playSound("war");
    });
    if (candidates.length) strategyState.lastAiWarMonth = currentMonth;
  }

  function aiMaybeJoinWars() {
    if (strategyState.date.getDate() !== 14) return;
    const currentMonth = strategyState.date.toISOString().slice(0, 7);
    if (strategyState.lastAiJoinWarMonth === currentMonth) return;
    let joined = false;
    strategyState.wars.filter((war) => war.active).forEach((war) => {
      const attacker = countryById(war.attackerId);
      const defender = countryById(war.defenderId);
      if (!attacker || !defender) return;
      [attacker, defender].forEach((side) => {
        const enemy = Number(side.id) === Number(attacker.id) ? defender : attacker;
        const sideRuntime = strategyState.countryStates[String(side.id)];
        (sideRuntime?.allies || []).forEach((allyId) => {
          if (Number(allyId) === Number(strategyState.playerCountryId) || isAtWar(allyId, enemy.id)) return;
          const ally = countryById(allyId);
          const allyRuntime = strategyState.countryStates[String(allyId)];
          if (!ally || !allyRuntime || allyRuntime.warSupport < 28 || getRelation(ally.id, side.id) < 25 || getRelation(ally.id, enemy.id) > -15) return;
          strategyState.wars.push({
            attackerId: Number(side.id) === Number(attacker.id) ? Number(ally.id) : Number(enemy.id),
            defenderId: Number(side.id) === Number(defender.id) ? Number(ally.id) : Number(enemy.id),
            start: strategyState.date.toISOString().slice(0, 10),
            active: true,
          });
          allyRuntime.warSupport = clamp(allyRuntime.warSupport + 3, 0, 100);
          joined = true;
          if (Number(side.id) === Number(strategyState.playerCountryId) || Number(enemy.id) === Number(strategyState.playerCountryId)) {
            addLog(`${ally.name} подключилась к вашей войне против ${enemy.name}.`);
            playSound("war");
          } else {
            addLog(`${ally.name} подключилась к войне на стороне ${side.name}.`);
          }
        });
      });
    });
    if (joined) strategyState.lastAiJoinWarMonth = currentMonth;
  }

  function warDurationDays(war) {
    const started = new Date(`${war.start || strategyState.date.toISOString().slice(0, 10)}T00:00:00`);
    return Math.max(0, Math.floor((strategyState.date - started) / 86400000));
  }

  function groupHasPlayer(group) {
    return group.participants.some((id) => Number(id) === Number(strategyState.playerCountryId));
  }

  function aiPeaceScore(actorId, group) {
    const runtime = strategyState.countryStates[String(actorId)];
    if (!runtime) return -999;
    const longestWar = Math.max(0, ...group.warIds.map((index) => warDurationDays(strategyState.wars[index])));
    const enemies = warEnemies(actorId, group);
    const lostRegions = (gameData.scenario.occupations || []).filter((occupation) => {
      const owner = ownerOfRegion(occupation.regionId);
      return Number(owner?.id) === Number(actorId) && enemies.includes(Number(occupation.controllerCountryId));
    }).length;
    const ownOccupations = occupiedRegionsControlledBy(actorId).filter((regionId) => enemies.includes(Number(ownerOfRegion(regionId)?.id))).length;
    return longestWar / 3 + Math.max(0, 55 - runtime.warSupport) + Math.max(0, 45 - runtime.stability) + lostRegions * 18 - ownOccupations * 8;
  }

  function finalizePeaceGroup(group, proposerId) {
    const conference = {
      opened: strategyState.date.toISOString().slice(0, 10),
      participants: group.participants,
      warIds: group.warIds,
      demands: generateBotPeaceDemands(group),
    };
    conference.demands.forEach(applyPeaceDemand);
    conference.warIds.forEach((warIndex) => {
      if (strategyState.wars[warIndex]) strategyState.wars[warIndex].active = false;
    });
    const proposer = countryById(proposerId);
    addLog(`${proposer?.name || "ИИ"} подписала мирный договор. Связанная война завершена.`);
    renderGameMap();
  }

  function aiMaybeProposePeace() {
    if (strategyState.date.getDate() !== 21 || strategyState.peaceConference) return;
    const currentMonth = strategyState.date.toISOString().slice(0, 7);
    if (strategyState.lastAiPeaceMonth === currentMonth) return;
    const checkedWars = new Set();
    const candidates = [];
    strategyState.wars.forEach((war, index) => {
      if (!war.active || checkedWars.has(index)) return;
      const group = activeWarGroup(war.attackerId);
      group.warIds.forEach((warIndex) => checkedWars.add(warIndex));
      const proposer = group.participants
        .filter((id) => Number(id) !== Number(strategyState.playerCountryId))
        .map((id) => ({ id, score: aiPeaceScore(id, group) }))
        .sort((a, b) => b.score - a.score)[0];
      if (proposer?.score >= 70) candidates.push({ group, proposer });
    });
    const best = candidates.sort((a, b) => b.proposer.score - a.proposer.score)[0];
    if (!best) return;
    const proposer = countryById(best.proposer.id);
    if (groupHasPlayer(best.group)) {
      strategyState.peaceConference = {
        opened: strategyState.date.toISOString().slice(0, 10),
        participants: best.group.participants,
        warIds: best.group.warIds,
        demands: generateBotPeaceDemands(best.group),
      };
      addLog(`${proposer?.name || "ИИ"} предложила мир. Мирная конференция открыта во вкладке войн.`);
      playSound("peace");
    } else {
      finalizePeaceGroup(best.group, best.proposer.id);
    }
    strategyState.lastAiPeaceMonth = currentMonth;
  }

  function runAiTurn() {
    if (!gameData || strategyState.date.getDate() % 7 !== 0) return;
    aiMaybeStartWars();
    aiMaybeJoinWars();
    aiMaybeProposePeace();
    gameData.scenario.countries.forEach((country) => {
      if (Number(country.id) === Number(strategyState.playerCountryId)) return;
      const runtime = strategyState.countryStates[String(country.id)];
      if (!runtime) return;
      if (!runtime.activeResearchId) {
        const nextTech = aiChooseResearchProject(country, runtime);
        if (nextTech) runtime.activeResearchId = nextTech.id;
      }
      aiRebalanceProduction(country, runtime);
      aiMaybeDiplomacy(country, runtime);
      advanceResearch(runtime, { silent: true });
      advanceProduction(runtime, { silent: true });
      advanceConstruction(runtime, { silent: true });
      advanceOperations(runtime, { silent: true });
      automateCountryArmies(country, runtime, { minister: ARMY_MINISTERS[1] });
      runtime.politicalPower += 2;
    });
  }

  function advanceDay() {
    if (!strategyState || !gameData) return;
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    if (!player || !runtime) return;
    applyDailyEconomy(runtime);
    allCountryStates().forEach((aiRuntime) => {
      if (aiRuntime === runtime) return;
      applyDailyEconomy(aiRuntime);
    });
    allCountryStates().forEach((countryRuntime) => {
      const country = countryById(countryRuntime.countryId);
      applySanctionEffects(countryRuntime, country);
    });
    strategyState.trades.forEach((trade) => {
      const from = strategyState.countryStates[String(trade.from)];
      const to = strategyState.countryStates[String(trade.to)];
      if (!from || !to) return;
      const category = TRADE_CATEGORIES[trade.category] || { resources: { [trade.resource]: trade.amount || 0 } };
      Object.entries(category.resources).forEach(([resource, amountWanted]) => {
        const amount = Math.min(amountWanted, from.resources[resource] || 0);
        from.resources[resource] -= amount;
        to.resources[resource] += amount;
      });
      from.budget += (category.price || 8) / 30;
      to.budget = Math.max(0, to.budget - (category.price || 8) / 30);
    });
    completeFocusIfReady(runtime, player);
    advanceProduction(runtime);
    advanceResearch(runtime);
    advanceConstruction(runtime);
    advanceOperations(runtime);
    runPlayerArmyMinister();
    advanceArmies();
    runAnnualUNGeneralAssembly();
    runAiTurn();
    strategyState.date.setDate(strategyState.date.getDate() + 1);
    autosaveIfNeeded();
    resolveWarPressure();
    if (strategyState.date.getDate() === 1) renderGameMap();
    renderStrategyPanel({ refreshContent: !isStrategyControlFocused() });
  }

  function resolveWarPressure() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const activeWars = strategyState.wars.filter((war) => war.active && (war.attackerId === player.id || war.defenderId === player.id));
    if (!activeWars.length) return;
    const logistics = hasTechnology(runtime, "logistics") ? 0.7 : 1;
    runtime.warSupport = clamp(runtime.warSupport + 0.05, 0, 100);
    runtime.manpower = Math.max(0, runtime.manpower - activeWars.length * 0.8);
    runtime.resources.oil = Math.max(0, runtime.resources.oil - activeWars.length * logistics);
    runtime.resources.steel = Math.max(0, runtime.resources.steel - activeWars.length * 0.6 * logistics);
  }

  function improveRelations(targetId) {
    const runtime = currentPlayerState();
    const closedEconomyPenalty = treatyActive("paris_climate") && runtime.laws?.trade === "closed" ? 8 : 0;
    const cost = (hasTechnology(runtime, "cyber") ? 10 : 15) + closedEconomyPenalty;
    if (!targetId || runtime.politicalPower < cost) return;
    runtime.politicalPower -= cost;
    setRelation(strategyState.playerCountryId, targetId, getRelation(strategyState.playerCountryId, targetId) + 18);
    addLog("Дипломаты улучшили отношения.");
    renderStrategyPanel();
  }

  function ensureRelationMapBackButton() {
    if (relationMapBackButton) return relationMapBackButton;
    relationMapBackButton = document.createElement("button");
    relationMapBackButton.id = "relationMapBackButton";
    relationMapBackButton.className = "relation-map-back";
    relationMapBackButton.type = "button";
    relationMapBackButton.textContent = "Назад в дипломатию";
    relationMapBackButton.addEventListener("click", (event) => {
      event.stopPropagation();
      ensureAudio();
      playSound("click");
      exitRelationMapMode(true);
    });
    gameScreen.appendChild(relationMapBackButton);
    return relationMapBackButton;
  }

  function updateRelationMapUi() {
    gameScreen.classList.toggle("relation-map-active", relationMapMode);
    ensureRelationMapBackButton().hidden = !relationMapMode;
  }

  function enterRelationMapMode() {
    relationMapMode = true;
    relationMapCountryId = relationMapCountryId || strategyState.playerCountryId;
    relationPair = null;
    activeTab = null;
    setStrategyPanelFullscreen(false);
    updateRelationMapUi();
    addLog(`Включена карта отношений: ${countryById(relationMapCountryId)?.name || "страна"}.`);
    renderGameMap();
    renderStrategyPanel();
  }

  function exitRelationMapMode(returnToForeign = false) {
    if (!relationMapMode) return;
    relationMapMode = false;
    relationPair = null;
    if (returnToForeign) activeTab = "foreign";
    updateRelationMapUi();
    renderGameMap();
    renderStrategyPanel();
  }

  function toggleRelationMapMode() {
    if (relationMapMode) exitRelationMapMode(true);
    else enterRelationMapMode();
  }

  function signAlliance(targetId) {
    const runtime = currentPlayerState();
    if (!targetId || runtime.politicalPower < 35) return;
    const relation = getRelation(strategyState.playerCountryId, targetId);
    if (relation < 30) {
      addLog("Для союза нужны отношения не ниже +30.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= 35;
    setRelation(strategyState.playerCountryId, targetId, relation + 10);
    addAlliance(strategyState, strategyState.playerCountryId, targetId);
    addLog("Подписан союзный договор.");
    renderStrategyPanel();
  }

  function declareWar(targetId) {
    const runtime = currentPlayerState();
    const target = gameData.scenario.countries.find((country) => Number(country.id) === Number(targetId));
    if (!target || runtime.politicalPower < 50 || runtime.warSupport < 25) return;
    const duplicate = strategyState.wars.some((war) => war.active && war.attackerId === strategyState.playerCountryId && war.defenderId === Number(targetId));
    if (duplicate) return;
    if (runtime.democracy?.active && runtime.democracy.approval < 45) {
      addLog("Демократический режим не готов к войне: нужна поддержка общества не ниже 45%.");
      renderStrategyPanel();
      return;
    }
    const unCharterPenalty = treatyActive("un_charter") && getRelation(strategyState.playerCountryId, targetId) > -25;
    if (unCharterPenalty && (runtime.politicalPower < 85 || runtime.warSupport < 40)) {
      addLog("Устав ООН ограничивает агрессивную войну: нужны 85 ПП и 40% поддержки войны либо серьёзный конфликт отношений.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= unCharterPenalty ? 85 : 50;
    runtime.warSupport = clamp(runtime.warSupport + 5, 0, 100);
    setRelation(strategyState.playerCountryId, targetId, -100);
    if (unCharterPenalty) {
      gameData.scenario.countries.forEach((country) => {
        if (Number(country.id) !== Number(strategyState.playerCountryId) && Number(country.id) !== Number(targetId)) {
          setRelation(strategyState.playerCountryId, country.id, getRelation(strategyState.playerCountryId, country.id) - 8);
        }
      });
    }
    (runtime.allies || []).forEach((allyId) => {
      setRelation(allyId, targetId, Math.min(getRelation(allyId, targetId), -40));
    });
    strategyState.wars.push({
      attackerId: strategyState.playerCountryId,
      defenderId: Number(targetId),
      start: strategyState.date.toISOString().slice(0, 10),
      active: true,
    });
    addLog(`Объявлена война: ${currentPlayerCountry().name} против ${target.name}.`);
    playSound("war");
    renderStrategyPanel();
  }

  function inviteToWar(allyId, enemyId) {
    const ally = countryById(allyId);
    const enemy = countryById(enemyId);
    const player = currentPlayerCountry();
    if (!ally || !enemy || !player) return;
    if (!isAtWar(player.id, enemy.id)) {
      addLog("Сначала объявите войну выбранной стране.");
      renderStrategyPanel();
      return;
    }
    if (getRelation(player.id, ally.id) < 0 || getRelation(ally.id, enemy.id) > -10) {
      addLog("Страна отказалась вступать в войну: нужны нейтральные отношения с вами и плохие с врагом.");
      renderStrategyPanel();
      return;
    }
    strategyState.wars.push({ attackerId: Number(ally.id), defenderId: Number(enemy.id), start: strategyState.date.toISOString().slice(0, 10), active: true });
    addLog(`${ally.name} вступает в войну против ${enemy.name}.`);
    renderStrategyPanel();
  }

  function joinWarOnSide(sideCountryId) {
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    const side = countryById(sideCountryId);
    if (!runtime || !player || !side || Number(side.id) === Number(player.id)) return;
    const war = strategyState.wars.find((item) => item.active &&
      (Number(item.attackerId) === Number(side.id) || Number(item.defenderId) === Number(side.id)) &&
      Number(item.attackerId) !== Number(player.id) &&
      Number(item.defenderId) !== Number(player.id));
    if (!war) {
      addLog("У выбранной страны нет войны, в которую можно вступить.");
      renderStrategyPanel();
      return;
    }
    if (runtime.politicalPower < 25 || runtime.warSupport < 18) {
      addLog("Для вступления в войну нужно 25 ПП и 18% поддержки войны.");
      renderStrategyPanel();
      return;
    }
    const enemyId = Number(war.attackerId) === Number(side.id) ? Number(war.defenderId) : Number(war.attackerId);
    const enemy = countryById(enemyId);
    if (!enemy || isAtWar(player.id, enemy.id)) return;
    runtime.politicalPower -= 25;
    runtime.warSupport = clamp(runtime.warSupport + 4, 0, 100);
    setRelation(player.id, side.id, getRelation(player.id, side.id) + 24);
    setRelation(player.id, enemy.id, Math.min(getRelation(player.id, enemy.id), -45));
    strategyState.wars.push({
      attackerId: Number(war.attackerId) === Number(side.id) ? Number(player.id) : Number(enemy.id),
      defenderId: Number(war.defenderId) === Number(side.id) ? Number(player.id) : Number(enemy.id),
      start: strategyState.date.toISOString().slice(0, 10),
      active: true,
    });
    addLog(`${player.name} вступает в войну на стороне ${side.name} против ${enemy.name}. Отношения с союзной стороной улучшены.`);
    playSound("war");
    renderStrategyPanel();
  }

  function occupyEnemyRegion(targetId) {
    const player = currentPlayerCountry();
    const target = gameData.scenario.countries.find((country) => Number(country.id) === Number(targetId));
    if (!player || !target) return;
    const activeWar = strategyState.wars.some((war) => war.active &&
      ((Number(war.attackerId) === Number(player.id) && Number(war.defenderId) === Number(target.id)) ||
      (Number(war.defenderId) === Number(player.id) && Number(war.attackerId) === Number(target.id))));
    if (!activeWar) {
      addLog("Для операции сначала объявите войну.");
      renderStrategyPanel();
      return;
    }
    const occupied = new Set((gameData.scenario.occupations || []).map((occupation) => Number(occupation.regionId)));
    const playerArmyRegions = new Set((strategyState.countryStates[String(player.id)]?.armies || [])
      .filter((army) => !army.movingTo)
      .map((army) => Number(army.regionId)));
    const regionId = (target.regionIds || []).map(Number).find((id) => !occupied.has(id) && playerArmyRegions.has(id));
    if (!regionId) {
      addLog("Для оккупации сначала переместите армию в регион противника.");
      renderStrategyPanel();
      return;
    }
    if (!regionId || !canOccupyRegion(regionId, player.id)) {
      renderStrategyPanel();
      return;
    }
    gameData.scenario.occupations.push({ regionId, controllerCountryId: player.id });
    addLog(`Установлена оккупация региона: ${gameData.regionById.get(regionId)?.name || regionId}. Присоединение возможно позже отдельным решением.`);
    playSound("occupy");
    renderGameMap();
    renderStrategyPanel();
  }

  function integrateOccupation(regionId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const occupation = (gameData.scenario.occupations || []).find((item) => Number(item.regionId) === Number(regionId) && Number(item.controllerCountryId) === Number(player.id));
    const integrationCost = treatyActive("geneva") ? 115 : 80;
    if (!occupation || runtime.politicalPower < integrationCost) return;
    const owner = ownerOfRegion(regionId);
    if (treatyActive("antarctic") && isAntarcticRegion(regionId)) {
      addLog("Интеграция невозможна: регион находится под Договором об Антарктике.");
      renderStrategyPanel();
      return;
    }
    if (RUSSIAN_TERRITORY_TRANSFER_LOCKED && isProtectedRussianRegion(regionId) && owner && Number(owner.id) !== Number(player.id)) {
      addLog("Интеграция невозможна: исходный регион России защищен правилом территориальной целостности.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= integrationCost;
    if (treatyActive("geneva")) {
      runtime.stability = clamp(runtime.stability - 3, 0, 100);
      if (owner) setRelation(player.id, owner.id, getRelation(player.id, owner.id) - 10);
    }
    if (!transferRegionOwnership(regionId, player.id)) {
      addLog("Интеграция не удалась: регион нельзя передать.");
      renderStrategyPanel();
      return;
    }
    updateMacroIndicators(runtime);
    addLog("Оккупированный регион интегрирован в государство.");
    renderGameMap();
    renderStrategyPanel();
  }

  function signTrade(targetId, categoryId) {
    const player = currentPlayerCountry();
    const target = gameData.scenario.countries.find((country) => Number(country.id) === Number(targetId));
    const runtime = currentPlayerState();
    const category = TRADE_CATEGORIES[categoryId];
    if (!player || !target || !runtime || runtime.politicalPower < 10) return;
    runtime.politicalPower -= 10;
    strategyState.trades.push({
      from: Number(target.id),
      to: Number(player.id),
      category: categoryId,
      resource: Object.keys(category.resources)[0],
      amount: category.amount,
    });
    setRelation(player.id, target.id, getRelation(player.id, target.id) + 5);
    addLog(`Заключен торговый контракт: ${category.label} из ${target.name}.`);
    renderStrategyPanel();
  }

  function requestAccess(targetId) {
    const player = currentPlayerCountry();
    const target = countryById(targetId);
    if (!player || !target) return;
    if (getRelation(player.id, target.id) < 0) {
      addLog("Проход войск отклонен: отношения ниже нейтральных.");
      renderStrategyPanel();
      return;
    }
    strategyState.accessTreaties.push({ from: Number(player.id), host: Number(target.id) });
    currentPlayerState().militaryAccess.push(Number(target.id));
    addLog(`Получено право прохода войск через ${target.name}.`);
    renderStrategyPanel();
  }

  function signVisaFree(targetId) {
    const player = currentPlayerCountry();
    const target = countryById(targetId);
    if (!player || !target) return;
    if (getRelation(player.id, target.id) < -10) {
      addLog("Безвизовый режим отклонен: отношения слишком плохие.");
      renderStrategyPanel();
      return;
    }
    strategyState.visaTreaties.push({ a: Number(player.id), b: Number(target.id) });
    currentPlayerState().visaFree.push(Number(target.id));
    setRelation(player.id, target.id, getRelation(player.id, target.id) + 8);
    addLog(`Заключен безвизовый режим с ${target.name}.`);
    renderStrategyPanel();
  }

  function requestForeignBase(targetId) {
    const player = currentPlayerCountry();
    const target = countryById(targetId);
    const runtime = currentPlayerState();
    if (!player || !target || runtime.budget < 25) return;
    if (getRelation(player.id, target.id) < 20) {
      addLog("База отклонена: нужны отношения не ниже +20.");
      renderStrategyPanel();
      return;
    }
    const regionId = Number(target.capitalRegionId || target.regionIds?.[0]);
    if (treatyActive("antarctic") && isAntarcticRegion(regionId)) {
      addLog("База отклонена: Договор об Антарктике запрещает военную инфраструктуру в этих регионах.");
      renderStrategyPanel();
      return;
    }
    runtime.budget -= 25;
    runtime.bases.push({ regionId, hostCountryId: Number(target.id), ownerCountryId: Number(player.id), level: 1 });
    strategyState.countryStates[String(target.id)]?.bases.push({ regionId, hostCountryId: Number(target.id), ownerCountryId: Number(player.id), level: 1 });
    addLog(`Размещена военная база в стране ${target.name}.`);
    renderStrategyPanel();
  }

  function recruitArmy(regionId, options = {}) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const profile = runtime.regionProfiles[String(regionId)];
    if (!player || !runtime || !profile) return null;
    const soldiers = Math.min(500, Math.floor(profile.readySoldiers));
    const cost = Math.max(5, Math.ceil(soldiers / 60));
    if (runtime.budget < cost || soldiers < 100) {
      addLog("Недостаточно бюджета или готовых солдат в выбранном регионе.");
      renderStrategyPanel();
      return null;
    }
    runtime.budget -= cost;
    profile.readySoldiers -= soldiers;
    const army = {
      id: `${player.id}-${Date.now()}`,
      name: `${runtime.armies.length + 1}-я армия`,
      ownerCountryId: Number(player.id),
      regionId: Number(regionId),
      soldiers,
      readiness: 55,
      movingTo: null,
      eta: 0,
    };
    runtime.armies.push(army);
    addLog(`Сформирована ${army.name}.`);
    if (!options.silent) {
      renderStrategyPanel();
      renderGameMap();
    }
    return army;
  }

  function recruitAndDeployArmy(originRegionId, targetCountryId) {
    const player = currentPlayerCountry();
    const target = countryById(targetCountryId);
    if (!player || !target) return;
    if (!isAtWar(player.id, target.id)) {
      addLog("Для отправки на военные действия сначала должна идти война с выбранной страной.");
      renderStrategyPanel();
      return;
    }
    const targetRegionId = (target.regionIds || []).find((regionId) => canOccupyRegion(regionId, player.id));
    if (!targetRegionId) {
      addLog("Нет доступного региона для военного приказа.");
      renderStrategyPanel();
      return;
    }
    const army = recruitArmy(originRegionId, { silent: true });
    if (!army) return;
    moveArmy(army.id, targetRegionId);
    renderGameMap();
  }

  function moveArmy(armyId, regionId) {
    const runtime = currentPlayerState();
    const army = runtime?.armies.find((item) => item.id === armyId);
    const targetOwner = ownerOfRegion(regionId);
    if (!army || !targetOwner) return;
    if (!hasMilitaryAccess(runtime.countryId, targetOwner.id) && !isAtWar(runtime.countryId, targetOwner.id)) {
      addLog("Нельзя двигать армию: нет права прохода, союза или войны.");
      renderStrategyPanel();
      return;
    }
    army.movingTo = Number(regionId);
    army.eta = Math.max(3, Math.min(30, Math.round(Math.abs(Number(regionId) - Number(army.regionId)) / 400) + 5));
    addLog(`${army.name} получила приказ на перемещение.`);
    renderStrategyPanel();
  }

  function applyDomesticDecision(decisionId) {
    const runtime = currentPlayerState();
    const decision = DOMESTIC_DECISIONS.find((item) => item.id === decisionId);
    if (!runtime || !decision || runtime.politicalPower < decision.cost) return;
    runtime.politicalPower -= decision.cost;
    decision.apply(runtime);
    runtime.stability = clamp(runtime.stability, 0, 100);
    runtime.warSupport = clamp(runtime.warSupport, 0, 100);
    runtime.decisions.push(decision.id);
    addLog(`Принято решение: ${decision.name}.`);
    renderStrategyPanel();
  }

  function formNation(formableId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const formable = FORMABLE_NATIONS[formableId];
    if (!player || !runtime || !formable) return;
    if ((runtime.originCountryName || player.name) !== formable.requiredCountry) {
      addLog("Эта страна не может сформировать выбранное государство.");
      renderStrategyPanel();
      return;
    }
    if (runtime.formedNation === formableId) return;
    const missing = formableRequirementStatus(formable, player, runtime).filter((item) => !item.ok);
    if (missing.length) {
      addLog(`Формирование недоступно: ${missing[0].text}.`);
      renderStrategyPanel();
      return;
    }
    player.name = formable.name;
    player.color = formable.color || player.color;
    runtime.formedNation = formableId;
    applyFocusReward(runtime, formable.reward || {});
    gameCountryName.textContent = player.name;
    addLog(`Провозглашено новое государство: ${formable.name}.`);
    renderGameMap();
    renderStrategyPanel();
  }

  function changeIdeology(ideologyId) {
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    const ideology = IDEOLOGY_OPTIONS.find((item) => item.id === ideologyId);
    if (!runtime || !player || !ideology || runtime.ideology === ideology.id) return;
    if (runtime.politicalPower < ideology.cost) {
      addLog("Недостаточно политической власти для смены курса.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= ideology.cost;
    setRuntimeIdeology(runtime, player, ideology.id);
    normalizeCountryRuntime(runtime, player, strategyState?.date || new Date());
    addLog(`Изменен курс власти: ${ideology.name}.`);
    renderStrategyPanel();
  }

  function democracyCampaign() {
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    if (!runtime || !player || !runtime.democracy?.active || runtime.politicalPower < 20) return;
    runtime.politicalPower -= 20;
    runtime.democracy.approval = clamp(runtime.democracy.approval + 10, 0, 100);
    runtime.stability = clamp(runtime.stability + 1, 0, 100);
    addLog("Запущена предвыборная кампания.");
    renderStrategyPanel();
  }

  function democracyReform() {
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    if (!runtime || !player || !runtime.democracy?.active || runtime.politicalPower < 35) return;
    runtime.politicalPower -= 35;
    runtime.democracy.approval = clamp(runtime.democracy.approval + 14, 0, 100);
    runtime.democracy.parliament = clamp(runtime.democracy.parliament + 8, 0, 100);
    runtime.stability = clamp(runtime.stability + 2, 0, 100);
    addLog("Проведена реформа демократических институтов.");
    renderStrategyPanel();
  }

  function democracyElection(force = false) {
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    if (!runtime || !player || !runtime.democracy?.active || runtime.politicalPower < 15) return;
    const nextElectionDate = runtime.democracy.nextElectionAt ? new Date(`${runtime.democracy.nextElectionAt}T00:00:00`) : null;
    if (!force && nextElectionDate && strategyState.date < nextElectionDate) {
      addLog(`Очередные выборы пройдут ${gameDateLabel(nextElectionDate, { short: true })}.`);
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= 15;
    runDemocraticElection(runtime, player, { forced: true });
    renderGameMap();
    renderStrategyPanel();
  }

  function enactReform(reformId) {
    const runtime = currentPlayerState();
    const reform = GOVERNMENT_REFORMS.find((item) => item.id === reformId);
    if (!runtime || !reform || runtime.reforms.includes(reform.id)) return;
    if (runtime.politicalPower < reform.cost) {
      addLog("Недостаточно политической власти для реформы.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= reform.cost;
    runtime.reforms.push(reform.id);
    applyModifierEffects(runtime, reform.effects || {});
    addLog(`Внедрена реформа: ${reform.name}.`);
    renderStrategyPanel();
  }

  function activeWarGroup(seedCountryId = strategyState?.playerCountryId) {
    if (!strategyState || !seedCountryId) return { warIds: [], participants: [] };
    const activeWars = strategyState.wars
      .map((war, index) => ({ ...war, index }))
      .filter((war) => war.active);
    const participants = new Set([Number(seedCountryId)]);
    const warIds = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      activeWars.forEach((war) => {
        const attackerId = Number(war.attackerId);
        const defenderId = Number(war.defenderId);
        if (!participants.has(attackerId) && !participants.has(defenderId)) return;
        if (!warIds.has(war.index)) {
          warIds.add(war.index);
          changed = true;
        }
        if (!participants.has(attackerId)) {
          participants.add(attackerId);
          changed = true;
        }
        if (!participants.has(defenderId)) {
          participants.add(defenderId);
          changed = true;
        }
      });
    }
    return {
      warIds: [...warIds],
      participants: [...participants].filter((id) => activeWars.some((war) => Number(war.attackerId) === id || Number(war.defenderId) === id)),
    };
  }

  function warEnemies(countryId, group) {
    const enemies = new Set();
    group.warIds.forEach((warIndex) => {
      const war = strategyState.wars[warIndex];
      if (!war?.active) return;
      if (Number(war.attackerId) === Number(countryId)) enemies.add(Number(war.defenderId));
      if (Number(war.defenderId) === Number(countryId)) enemies.add(Number(war.attackerId));
    });
    return [...enemies];
  }

  function occupiedRegionsControlledBy(actorId, targetId = null) {
    return (gameData?.scenario.occupations || [])
      .filter((occupation) => Number(occupation.controllerCountryId) === Number(actorId))
      .filter((occupation) => !targetId || Number(ownerOfRegion(occupation.regionId)?.id) === Number(targetId))
      .map((occupation) => Number(occupation.regionId));
  }

  function peaceDemandText(demand) {
    const actor = countryById(demand.actorId);
    const target = countryById(demand.targetId);
    if (demand.type === "annex_occupied") return `${actor?.name || "Страна"} требует закрепить оккупации у ${target?.name || "противника"} (${demand.regionIds?.length || 0} рег.)`;
    if (demand.type === "reparations") return `${actor?.name || "Страна"} требует репарации от ${target?.name || "противника"}: ${demand.value} бюджета`;
    if (demand.type === "demilitarize") return `${actor?.name || "Страна"} требует демилитаризацию ${target?.name || "противника"}`;
    return `${actor?.name || "Страна"} предлагает статус-кво`;
  }

  function generateBotPeaceDemands(group) {
    const demands = [];
    group.participants
      .filter((id) => Number(id) !== Number(strategyState.playerCountryId))
      .forEach((actorId) => {
        const enemies = warEnemies(actorId, group);
        if (!enemies.length) return;
        const targetId = enemies.sort((a, b) => getRelation(actorId, a) - getRelation(actorId, b))[0];
        const occupied = occupiedRegionsControlledBy(actorId, targetId).slice(0, 4);
        if (occupied.length) {
          demands.push({ source: "bot", actorId, targetId, type: "annex_occupied", regionIds: occupied });
          return;
        }
        if (getRelation(actorId, targetId) < -35) {
          demands.push({ source: "bot", actorId, targetId, type: "demilitarize" });
          return;
        }
        demands.push({ source: "bot", actorId, targetId, type: "reparations", value: 20 });
      });
    return demands;
  }

  function openPeaceConference() {
    const group = activeWarGroup();
    if (!group.warIds.length) {
      addLog("Нет активной войны для мирной конференции.");
      renderStrategyPanel();
      return;
    }
    strategyState.peaceConference = {
      opened: strategyState.date.toISOString().slice(0, 10),
      participants: group.participants,
      warIds: group.warIds,
      demands: generateBotPeaceDemands(group),
    };
    addLog("Открыта мирная конференция. Боты выдвинули требования.");
    renderStrategyPanel();
  }

  function selectedPeaceRegionIds() {
    return [...strategyContent.querySelectorAll("input[data-peace-region]:checked")]
      .map((input) => Number(input.dataset.peaceRegion))
      .filter(Boolean);
  }

  function releaseSelectedOccupation(regionId) {
    const region = gameData.regionById.get(Number(regionId));
    if (!releaseOccupation(regionId)) {
      addLog("Выбранный регион не находится под вашей оккупацией.");
      renderStrategyPanel();
      return;
    }
    addLog(`Оккупация снята: ${region?.name || `регион ${regionId}`}.`);
    renderGameMap();
    renderStrategyPanel();
  }

  function createOccupationCountry(regionIds, name = "") {
    const country = createCountryFromOccupiedRegions(regionIds, name.trim());
    if (!country) {
      addLog("Нет выбранных оккупированных регионов для создания страны.");
      renderStrategyPanel();
      return;
    }
    addLog(`Создана страна на территории оккупации: ${country.name}.`);
    renderGameMap();
    renderStrategyPanel();
  }

  function addPlayerPeaceDemand(type, targetId, selectedRegionIds = []) {
    const conference = strategyState?.peaceConference;
    const playerId = strategyState?.playerCountryId;
    if (!conference || !playerId) return;
    const target = countryById(targetId);
    if (!target || Number(target.id) === Number(playerId)) return;
    const demand = { source: "player", actorId: Number(playerId), targetId: Number(target.id), type };
    if (type === "annex_occupied") {
      const availableRegions = occupiedRegionsControlledBy(playerId, target.id);
      demand.regionIds = selectedRegionIds.length
        ? selectedRegionIds.filter((regionId) => availableRegions.includes(Number(regionId)))
        : availableRegions.slice(0, 6);
      if (!demand.regionIds.length) {
        addLog("Выберите оккупированные регионы для закрепления.");
        renderStrategyPanel();
        return;
      }
    }
    if (type === "reparations") demand.value = 25;
    conference.demands.push(demand);
    addLog(`Добавлено требование игрока: ${peaceDemandText(demand)}.`);
    renderStrategyPanel();
  }

  function transferRegionOwnership(regionId, actorId) {
    return moveRegionOwnership(regionId, actorId);
  }

  function integrateCountryIntoActor(targetName, actorId) {
    const actor = countryById(actorId);
    const target = gameData?.scenario.countries.find((country) => country.name === targetName);
    if (!actor || !target || Number(actor.id) === Number(target.id)) return 0;
    const regions = [...(target.regionIds || [])].map(Number);
    const transferred = regions.filter((regionId) => transferRegionOwnership(regionId, actor.id)).length;
    if (transferred) {
      target.regionIds = [];
      target.capitalRegionId = 0;
      setRelation(actor.id, target.id, 100);
    }
    return transferred;
  }

  function releaseOccupation(regionId, controllerId = strategyState?.playerCountryId) {
    const before = gameData?.scenario.occupations?.length || 0;
    gameData.scenario.occupations = (gameData.scenario.occupations || [])
      .filter((occupation) => !(Number(occupation.regionId) === Number(regionId) && Number(occupation.controllerCountryId) === Number(controllerId)));
    return (gameData.scenario.occupations || []).length < before;
  }

  function createCountryFromOccupiedRegions(regionIds, name) {
    const player = currentPlayerCountry();
    if (!player || !regionIds.length) return null;
    const validRegionIds = [...new Set(regionIds.map(Number))]
      .filter((regionId) => (gameData.scenario.occupations || []).some((occupation) =>
        Number(occupation.regionId) === Number(regionId) && Number(occupation.controllerCountryId) === Number(player.id)));
    if (!validRegionIds.length) return null;

    const newId = Math.max(0, ...gameData.scenario.countries.map((country) => Number(country.id) || 0)) + 1;
    const newCountry = {
      id: newId,
      name: name || `Новое государство ${newId}`,
      color: `#${((hashNumber(`${name || "released"}:${validRegionIds.join("-")}`) & 0xffffff) || 0x667799).toString(16).padStart(6, "0")}`,
      ideology: currentPlayerState()?.ideology || "neutral",
      ruler: "временное правительство",
      capitalRegionId: validRegionIds[0],
      regionIds: [],
    };
    gameData.scenario.countries.push(newCountry);
    strategyState.countryStates[String(newId)] = createCountryRuntime(newCountry);
    const newRuntime = strategyState.countryStates[String(newId)];
    validRegionIds.forEach((regionId) => {
      const previousOwner = directOwnerOfRegion(regionId);
      const previousRuntime = previousOwner ? strategyState.countryStates[String(previousOwner.id)] : null;
      if (previousOwner) previousOwner.regionIds = (previousOwner.regionIds || []).filter((id) => Number(id) !== Number(regionId));
      if (previousOwner && Number(previousOwner.capitalRegionId) === Number(regionId)) previousOwner.capitalRegionId = Number(previousOwner.regionIds?.[0] || 0);
      newCountry.regionIds.push(Number(regionId));
      if (previousRuntime?.regionProfiles[String(regionId)]) {
        newRuntime.regionProfiles[String(regionId)] = previousRuntime.regionProfiles[String(regionId)];
        delete previousRuntime.regionProfiles[String(regionId)];
      } else {
        newRuntime.regionProfiles[String(regionId)] = createRegionProfile(regionId, newCountry, newRuntime);
      }
    });
    gameData.scenario.occupations = (gameData.scenario.occupations || [])
      .filter((occupation) => !validRegionIds.includes(Number(occupation.regionId)));
    rebuildOwnerByRegion();
    const profiles = Object.values(newRuntime.regionProfiles);
    if (profiles.length) newRuntime.factories = Math.max(1, Math.round(profiles.reduce((sum, profile) => sum + (profile.economy || 0), 0) / 12));
    gameData.scenario.countries.forEach((country) => recalculateRuntimeFromRegions(strategyState.countryStates[String(country.id)]));
    setRelation(player.id, newId, 35);
    addAlliance(strategyState, player.id, newId);
    return newCountry;
  }

  function applyPeaceDemand(demand) {
    const actorRuntime = strategyState.countryStates[String(demand.actorId)];
    const targetRuntime = strategyState.countryStates[String(demand.targetId)];
    if (!actorRuntime || !targetRuntime) return;
    if (demand.type === "annex_occupied") {
      const transferredRegions = (demand.regionIds || []).filter((regionId) => transferRegionOwnership(regionId, demand.actorId));
      if (transferredRegions.length) {
        const names = transferredRegions.map((regionId) => gameData.regionById.get(Number(regionId))?.name || regionId).join(", ");
        addLog(`Переданы регионы по мирному договору: ${names}.`);
      }
    }
    if (demand.type === "reparations") {
      const value = Math.min(demand.value || 20, Math.max(0, targetRuntime.budget));
      targetRuntime.budget -= value;
      actorRuntime.budget += value;
    }
    if (demand.type === "demilitarize") {
      targetRuntime.warSupport = clamp(targetRuntime.warSupport - 10, 0, 100);
      targetRuntime.commandPower = clamp(targetRuntime.commandPower - 20, 0, 100);
      targetRuntime.armies.forEach((army) => {
        army.readiness = clamp(army.readiness - 15, 0, 100);
      });
    }
  }

  function finalizePeaceConference() {
    const conference = strategyState?.peaceConference;
    if (!conference) return;
    conference.demands.forEach(applyPeaceDemand);
    const participantIds = new Set((conference.participants || []).map((id) => Number(id)));
    const beforeOccupations = (gameData?.scenario.occupations || []).length;
    gameData.scenario.occupations = (gameData.scenario.occupations || []).filter((occupation) => !participantIds.has(Number(occupation.controllerCountryId)));
    const clearedOccupations = beforeOccupations - (gameData?.scenario.occupations || []).length;
    conference.warIds.forEach((warIndex) => {
      if (strategyState.wars[warIndex]) strategyState.wars[warIndex].active = false;
    });
    strategyState.peaceConference = null;
    rebuildOwnerByRegion();
    renderGameMap();
    addLog(`Мирный договор подписан. Снято оккупаций: ${clearedOccupations}. Все связанные войны завершены одновременно.`);
    playSound("peace");
    renderStrategyPanel();
  }

  function setGameSpeed(speed) {
    gameSpeed = Number(speed) || 1;
    document.querySelectorAll("[data-speed]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.speed) === gameSpeed);
    });
    startRealtimeClock();
    renderStrategyPanel();
  }

  function startRealtimeClock() {
    if (gameTimer) {
      window.clearInterval(gameTimer);
      gameTimer = null;
    }
    if (!strategyState || gamePaused) return;
    gameTimer = window.setInterval(advanceDay, GAME_SPEEDS[gameSpeed] || GAME_SPEEDS[1]);
  }

  function stopRealtimeClock() {
    if (!gameTimer) return;
    window.clearInterval(gameTimer);
    gameTimer = null;
  }

  function togglePause() {
    gamePaused = !gamePaused;
    pauseButton.textContent = gamePaused ? t("continue") : t("pause");
    startRealtimeClock();
    renderStrategyPanel();
  }

  function setProductionLine(lineId, delta) {
    const runtime = currentPlayerState();
    if (!runtime) return;
    let line = runtime.production.find((item) => item.lineId === lineId);
    if (!line) {
      line = { lineId, assigned: 0, progress: 0 };
      runtime.production.push(line);
    }
    const used = runtime.production.reduce((sum, item) => sum + item.assigned, 0);
    if (delta > 0 && used >= runtime.factories) {
      addLog("Нет свободных заводов для этой линии.");
      renderStrategyPanel();
      return;
    }
    line.assigned = clamp(line.assigned + delta, 0, runtime.factories);
    addLog("Назначение заводов обновлено.");
    renderStrategyPanel();
  }

  function startResearch(projectId) {
    const runtime = currentPlayerState();
    const project = RESEARCH_PROJECTS.find((item) => item.id === projectId);
    if (!runtime || !project || runtime.technologies.includes(project.id)) return;
    runtime.activeResearchId = project.id;
    runtime.researchProgress = 0;
    addLog(`Начато исследование: ${project.name}.`);
    renderStrategyPanel();
  }

  function enableNuclearProgram() {
    const runtime = currentPlayerState();
    if (!runtime) return;
    const nptPenalty = treatyActive("npt") && !NUCLEAR_CAPABLE_COUNTRIES.has(currentPlayerCountry()?.name || "");
    if (nptPenalty && runtime.politicalPower < 80) {
      addLog("ДНЯО ограничивает новую ядерную программу: нужно 80 ПП для политического выхода из режима нераспространения.");
      renderStrategyPanel();
      return;
    }
    if (!runtime.technologies.includes("nuclear-engineering") && !runtime.nuclear.program) {
      addLog("Сначала нужен фокус ядерной программы или исследование ядерной инженерии.");
      renderStrategyPanel();
      return;
    }
    if (nptPenalty) {
      runtime.politicalPower -= 80;
      gameData.scenario.countries.forEach((country) => {
        if (Number(country.id) !== Number(runtime.countryId)) setRelation(runtime.countryId, country.id, getRelation(runtime.countryId, country.id) - 6);
      });
    }
    runtime.nuclear.program = true;
    runtime.nuclear.doctrine = runtime.nuclear.doctrine === "нет" ? "создание арсенала" : runtime.nuclear.doctrine;
    addLog("Национальная ядерная программа запущена.");
    renderStrategyPanel();
  }

  function buildNuclearReactor() {
    const runtime = currentPlayerState();
    if (!runtime || !runtime.nuclear.program) return;
    if (runtime.budget < 120 || runtime.resources.rare < 35 || runtime.resources.steel < 45) {
      addLog("Недостаточно бюджета, редких ресурсов или стали для реактора.");
      renderStrategyPanel();
      return;
    }
    runtime.budget -= 120;
    runtime.resources.rare -= 35;
    runtime.resources.steel -= 45;
    runtime.nuclear.reactors += 1;
    runtime.gdp += 20;
    addLog("Построен ядерный реактор.");
    renderStrategyPanel();
  }

  function buildNuclearWarhead() {
    const runtime = currentPlayerState();
    if (!runtime || !runtime.nuclear.program || runtime.nuclear.reactors < 1) return;
    const nptPenalty = treatyActive("npt") && !NUCLEAR_CAPABLE_COUNTRIES.has(currentPlayerCountry()?.name || "");
    const budgetCost = nptPenalty ? 115 : 70;
    const commandCost = nptPenalty ? 35 : 20;
    if (runtime.budget < budgetCost || runtime.resources.rare < 25 || runtime.commandPower < commandCost) {
      addLog("Недостаточно бюджета, редких ресурсов или командного ресурса для боеголовки.");
      renderStrategyPanel();
      return;
    }
    runtime.budget -= budgetCost;
    runtime.resources.rare -= 25;
    runtime.commandPower -= commandCost;
    runtime.nuclear.warheads += 1;
    runtime.warSupport = clamp(runtime.warSupport + 2, 0, 100);
    if (nptPenalty) {
      gameData.scenario.countries.forEach((country) => {
        if (Number(country.id) !== Number(runtime.countryId)) setRelation(runtime.countryId, country.id, getRelation(runtime.countryId, country.id) - 4);
      });
    }
    addLog("Создана ядерная боеголовка.");
    renderStrategyPanel();
  }

  function nuclearDeterrence(targetId) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    const targetRuntime = strategyState?.countryStates[String(targetId)];
    if (!runtime || !target || !targetRuntime || runtime.nuclear.warheads < 1) return;
    if (!isAtWar(runtime.countryId, target.id)) {
      addLog("Ядерное сдерживание доступно только против страны, с которой идет война.");
      renderStrategyPanel();
      return;
    }
    runtime.nuclear.warheads -= 1;
    runtime.commandPower = clamp(runtime.commandPower - 25, 0, 100);
    targetRuntime.warSupport = clamp(targetRuntime.warSupport - 18, 0, 100);
    targetRuntime.stability = clamp(targetRuntime.stability - 10, 0, 100);
    setRelation(runtime.countryId, target.id, getRelation(runtime.countryId, target.id) - 80);
    addLog(`Применено ядерное сдерживание против ${target.name}: боевой дух и стабильность противника резко снижены.`);
    renderStrategyPanel();
  }

  function enactLaw(groupId, lawId) {
    const runtime = currentPlayerState();
    const law = LAW_GROUPS[groupId]?.options.find((item) => item.id === lawId);
    if (!runtime || !law || runtime.laws[groupId] === law.id || runtime.politicalPower < law.cost) return;
    runtime.politicalPower -= law.cost;
    runtime.laws[groupId] = law.id;
    applyModifierEffects(runtime, law.effects || {});
    addLog(`Принят закон: ${law.name}.`);
    renderStrategyPanel();
  }

  function hireAdvisor(advisorId) {
    const runtime = currentPlayerState();
    const advisor = ADVISORS.find((item) => item.id === advisorId);
    if (!runtime || !advisor || runtime.advisors.includes(advisor.id) || runtime.politicalPower < advisor.cost) return;
    runtime.politicalPower -= advisor.cost;
    runtime.advisors.push(advisor.id);
    applyModifierEffects(runtime, advisor.effects || {});
    addLog(`Назначен советник: ${advisor.name}.`);
    renderStrategyPanel();
  }

  function chooseDoctrine(doctrineId) {
    const runtime = currentPlayerState();
    const doctrine = DOCTRINES.find((item) => item.id === doctrineId);
    if (!runtime || !doctrine || runtime.doctrines.includes(doctrine.id) || runtime.armyXp < doctrine.cost) return;
    runtime.armyXp -= doctrine.cost;
    runtime.doctrines.push(doctrine.id);
    applyModifierEffects(runtime, doctrine.effects || {});
    addLog(`Изучена доктрина: ${doctrine.name}.`);
    renderStrategyPanel();
  }

  function appointArmyMinister(ministerId) {
    const runtime = currentPlayerState();
    const minister = ARMY_MINISTERS.find((item) => item.id === ministerId);
    if (!runtime || !minister || runtime.armyMinister === minister.id) return;
    if (minister.cost && runtime.politicalPower < minister.cost) {
      addLog("Недостаточно политической власти для назначения военного министра.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= minister.cost || 0;
    runtime.armyMinister = minister.id;
    runtime.armyAutomationLogDay = "";
    addLog(minister.id === "none" ? "Армия переведена на ручное командование." : `Назначен ${minister.name}: армии будут управляться автоматически.`);
    renderStrategyPanel();
  }

  function startConstruction(projectId, regionId) {
    const runtime = currentPlayerState();
    const template = CONSTRUCTION_PROJECTS.find((item) => item.id === projectId);
    const profile = runtime?.regionProfiles[String(regionId)];
    if (!runtime || !template || !profile || !canPayRuntimeCost(runtime, template.cost)) return;
    payRuntimeCost(runtime, template.cost);
    runtime.constructions.push({
      projectId,
      regionId: Number(regionId),
      progress: 0,
      days: template.days,
    });
    addLog(`Начато строительство: ${template.name}.`);
    renderStrategyPanel();
  }

  function startOperation(operationId, targetId) {
    const runtime = currentPlayerState();
    const operation = INTELLIGENCE_OPERATIONS.find((item) => item.id === operationId);
    if (!runtime || !operation || !targetId || !canPayRuntimeCost(runtime, operation.cost)) return;
    payRuntimeCost(runtime, operation.cost);
    runtime.operations.push({
      operationId,
      targetId: Number(targetId),
      progress: 0,
      days: operation.days,
    });
    addLog(`Начата разведоперация: ${operation.name}.`);
    renderStrategyPanel();
  }

  function changeCurrencyPolicy(policyId) {
    const runtime = currentPlayerState();
    const policy = CURRENCY_POLICIES.find((item) => item.id === policyId);
    if (!runtime || !policy || runtime.politicalPower < 45) return;
    runtime.politicalPower -= 45;
    runtime.currencyPolicy = policy.id;
    updateMacroIndicators(runtime);
    addLog(`Валютный режим изменен: ${policy.name}.`);
    renderStrategyPanel();
  }

  function seizeForeignAssets(ownerCountryId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const owner = countryById(ownerCountryId);
    const ownerRuntime = strategyState.countryStates[String(ownerCountryId)];
    if (!player || !runtime || !owner || !ownerRuntime || runtime.politicalPower < 35) return;
    const assets = ownerRuntime.foreignAssets.filter((asset) => Number(asset.hostCountryId) === Number(player.id) && !asset.seized);
    if (!assets.length) {
      addLog("У выбранной страны нет активов на вашей территории.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= 35;
    const value = assets.reduce((sum, asset) => sum + asset.value, 0);
    assets.forEach((asset) => {
      asset.seized = true;
      runtime.seizedAssets.push({ ...asset, originalOwnerId: Number(owner.id) });
    });
    runtime.budget += value;
    setRelation(player.id, owner.id, getRelation(player.id, owner.id) - 35);
    addLog(`Арестованы иностранные активы страны ${owner.name}: +${Math.round(value)} бюджета.`);
    renderStrategyPanel();
  }

  function appointRegionMinister(regionId, ministerId) {
    const runtime = currentPlayerState();
    const profile = runtime?.regionProfiles[String(regionId)];
    const minister = REGION_MINISTERS.find((item) => item.id === ministerId);
    if (!runtime || !profile || !minister || runtime.politicalPower < 15) return;
    runtime.politicalPower -= 15;
    profile.minister = minister.id;
    addLog(`В регион назначен министр: ${minister.name}.`);
    renderStrategyPanel();
  }

  function rewardText(reward) {
    const parts = [];
    if (reward.politicalPower) parts.push(`Политвласть +${reward.politicalPower}`);
    if (reward.commandPower) parts.push(`Командование +${reward.commandPower}`);
    if (reward.stability) parts.push(`Стабильность +${reward.stability}`);
    if (reward.warSupport) parts.push(`Поддержка войны +${reward.warSupport}`);
    if (reward.manpower) parts.push(`Людской ресурс +${reward.manpower}`);
    if (reward.factories) parts.push(`Фабрики +${reward.factories}`);
    if (reward.nuclearProgram) parts.push("Ядерная программа");
    if (reward.nuclearReactors) parts.push(`Реакторы +${reward.nuclearReactors}`);
    if (reward.nuclearWarheads) parts.push(`Боеголовки +${reward.nuclearWarheads}`);
    if (reward.ideology) parts.push(`Курс: ${IDEOLOGY_OPTIONS.find((item) => item.id === reward.ideology)?.name || reward.ideology}`);
    if (reward.rename) parts.push(`Название: ${reward.rename}`);
    if (reward.reform) parts.push("Госреформа");
    Object.entries(reward).forEach(([key, value]) => {
      const match = key.match(/^law:(.+)$/);
      if (!match) return;
      const lawName = LAW_GROUPS[match[1]]?.options.find((item) => item.id === value)?.name || value;
      parts.push(`Закон: ${lawName}`);
    });
    Object.keys(RESOURCE_LABELS).forEach((resource) => {
      if (reward[resource]) parts.push(`${RESOURCE_LABELS[resource]} +${reward[resource]}`);
    });
    return parts.join(" · ");
  }

  function effectsText(effects = {}) {
    const parts = [];
    if (effects.politicalPowerDaily) parts.push(`ПП/день ${effects.politicalPowerDaily > 0 ? "+" : ""}${effects.politicalPowerDaily}`);
    if (effects.stability) parts.push(`Стабильность ${effects.stability > 0 ? "+" : ""}${effects.stability}`);
    if (effects.warSupport) parts.push(`Поддержка войны ${effects.warSupport > 0 ? "+" : ""}${effects.warSupport}`);
    if (effects.commandPower) parts.push(`Командование ${effects.commandPower > 0 ? "+" : ""}${effects.commandPower}`);
    if (effects.factoryOutput) parts.push(`Производство ${Math.round(effects.factoryOutput * 100) > 0 ? "+" : ""}${Math.round(effects.factoryOutput * 100)}%`);
    if (effects.recruitable) parts.push(`Призыв ${Math.round(effects.recruitable * 1000) / 10 > 0 ? "+" : ""}${Math.round(effects.recruitable * 1000) / 10}%`);
    if (effects.resourceGain) parts.push(`Ресурсы ${Math.round(effects.resourceGain * 100) > 0 ? "+" : ""}${Math.round(effects.resourceGain * 100)}%`);
    if (effects.relationsGain) parts.push(`Дипломатия ${Math.round(effects.relationsGain * 100) > 0 ? "+" : ""}${Math.round(effects.relationsGain * 100)}%`);
    if (effects.armyAttack) parts.push(`Атака ${Math.round(effects.armyAttack * 100) > 0 ? "+" : ""}${Math.round(effects.armyAttack * 100)}%`);
    if (effects.focusSlots) parts.push(`Слоты фокусов +${effects.focusSlots}`);
    return parts.join(" · ") || "Без особых бонусов";
  }

  function focusExpandedText(focus, requirementsText = "") {
    if (focus.details) return focus.details;
    const branchText = focus.branch ? ` Направление ветки: ${focus.branch}.` : "";
    const requirementText = requirementsText ? ` Для доступа нужны завершенные фокусы: ${requirementsText}.` : "";
    const reward = rewardText(focus.reward) || "без немедленной награды";
    return `${focus.text}

Подробно: этот фокус раскрывает выбранный курс через последовательные решения, подготовку ресурсов и настройку государственных механизмов. Он нужен не только как отдельная награда, но и как часть общей логики ветки: открывает следующие шаги, задает темп развития и помогает специализировать страну под выбранную стратегию.${branchText}${requirementText}

Игровой итог: ${reward}.`.trim();
  }

  function countryOptions(excludePlayer = true) {
    const playerId = Number(strategyState?.playerCountryId);
    return (gameData?.scenario.countries || [])
      .filter((country) => !excludePlayer || Number(country.id) !== playerId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .map((country) => `<option value="${country.id}">${country.name}</option>`)
      .join("");
  }

  function renderStateSummary(player, runtime) {
    if (!player || !runtime) {
      stateSummary.innerHTML = "";
      return;
    }
    const dateLabel = gameDateLabel(strategyState.date);
    stateSummary.innerHTML = `
      <div class="state-title">
        <strong>${player.name}</strong>
        <span>${dateLabel} · ${player.ruler || "правитель не указан"}</span>
      </div>
      <div class="resource-grid">
        <span class="resource-pill"><small>Политвласть</small><strong>${Math.floor(runtime.politicalPower)}</strong></span>
        <span class="resource-pill"><small>Стабильность</small><strong>${Math.round(runtime.stability)}%</strong></span>
        <span class="resource-pill"><small>Поддержка войны</small><strong>${Math.round(runtime.warSupport)}%</strong></span>
        <span class="resource-pill"><small>Людской ресурс</small><strong>${Math.floor(runtime.manpower)}</strong></span>
        <span class="resource-pill"><small>Фабрики</small><strong>${runtime.factories}</strong></span>
        <span class="resource-pill"><small>Командование</small><strong>${Math.floor(runtime.commandPower)}</strong></span>
        <span class="resource-pill"><small>Население</small><strong>${Math.round(runtime.population / 1000000)} млн</strong></span>
        <span class="resource-pill"><small>ВВП</small><strong>${Math.round(runtime.gdp)} млрд</strong></span>
        <span class="resource-pill"><small>ВВП ППС/душу</small><strong>${runtime.pppPerCapita.toLocaleString("ru-RU")}</strong></span>
        <span class="resource-pill"><small>Уровень жизни</small><strong>${runtime.livingStandard}</strong></span>
        <span class="resource-pill"><small>Бюджет</small><strong>${Math.floor(runtime.budget)}</strong></span>
        ${runtime.democracy?.active ? `<span class="resource-pill"><small>Демократия</small><strong>${Math.round(runtime.democracy.approval || 0)}%</strong></span>` : ""}
        ${Object.keys(RESOURCE_LABELS).map((resource) => `
          <span class="resource-pill"><small>${RESOURCE_LABELS[resource]}</small><strong>${Math.floor(runtime.resources[resource])}</strong></span>
        `).join("")}
      </div>
    `;
  }

  function renderSelectedRegionSummary() {
    if (!gameData || !strategyState) {
      selectedRegionSummary.innerHTML = "";
      return;
    }
    const regionId = Number(strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId);
    const region = gameData.regionById.get(regionId);
    const owner = ownerOfRegion(regionId);
    const controller = controllerOfRegion(regionId);
    const runtime = owner ? strategyState.countryStates[String(owner.id)] : null;
    const profile = runtime?.regionProfiles[String(regionId)];
    selectedRegionSummary.innerHTML = `
      <strong>${region?.name || `Регион ${regionId}`}</strong>
      <small>${owner?.name || "нет владельца"}${controller && owner && Number(controller.id) !== Number(owner.id) ? ` · оккупант: ${controller.name}` : ""}</small>
      ${profile ? `
        <small>Население: ${Math.floor(profile.population).toLocaleString("ru-RU")}</small>
        <small>Готовые солдаты: ${Math.floor(profile.readySoldiers).toLocaleString("ru-RU")}</small>
        <small>ВВП: ${profile.gdp} млрд · экономика ${profile.economy}</small>
      ` : "<small>Нет данных региона</small>"}
    `;
  }

  function buildFocusDisplayLayout(focuses) {
    const focusById = new Map(focuses.map((focus) => [focus.id, focus]));
    const layoutById = new Map();
    const resolving = new Set();

    const resolveLayout = (focus) => {
      if (!focus) return { x: 1, y: 1 };
      if (layoutById.has(focus.id)) return layoutById.get(focus.id);
      if (resolving.has(focus.id)) return { x: focus.x || 1, y: focus.y || 1 };

      resolving.add(focus.id);
      const requiredLayouts = (focus.requires || [])
        .map((requiredId) => focusById.get(requiredId))
        .filter(Boolean)
        .map((required) => resolveLayout(required));
      resolving.delete(focus.id);

      const requiredRow = requiredLayouts.length
        ? Math.max(...requiredLayouts.map((layout) => layout.y)) + 1
        : 1;
      const layout = {
        x: focus.x || 1,
        y: Math.max(focus.y || 1, requiredRow),
      };
      layoutById.set(focus.id, layout);
      return layout;
    };

    focuses.forEach(resolveLayout);

    const occupied = new Map();
    const orderedFocuses = [...focuses].sort((first, second) => {
      const firstLayout = layoutById.get(first.id) || { x: first.x || 1, y: first.y || 1 };
      const secondLayout = layoutById.get(second.id) || { x: second.x || 1, y: second.y || 1 };
      return firstLayout.y - secondLayout.y
        || firstLayout.x - secondLayout.x
        || first.name.localeCompare(second.name);
    });

    orderedFocuses.forEach((focus) => {
      const current = layoutById.get(focus.id) || { x: focus.x || 1, y: focus.y || 1 };
      const row = current.y;
      const rowSlots = occupied.get(row) || new Set();
      let column = current.x;

      while (rowSlots.has(column)) column += 1;
      rowSlots.add(column);
      occupied.set(row, rowSlots);
      layoutById.set(focus.id, { x: column, y: row });
    });

    return {
      byId: layoutById,
      columns: Math.max(...[...layoutById.values()].map((layout) => layout.x)),
      rows: Math.max(...[...layoutById.values()].map((layout) => layout.y)),
    };
  }

  function renderFocuses(player, runtime) {
    const focuses = getFocusTree(player, gameData.scenario.year);
    if (!focuses.length) {
      strategyContent.innerHTML = '<section class="tab-section"><h3>Национальные фокусы</h3><article class="strategy-card"><p>У этой страны пока нет уникальной ветки фокусов.</p></article></section>';
      return;
    }
    const focusLayout = buildFocusDisplayLayout(focuses);
    const maxX = focusLayout.columns;
    const maxY = focusLayout.rows;
    const cellWidth = 188;
    const cellHeight = 224;
    const columnGap = 42;
    const rowGap = 58;
    const treePadding = 18;
    const connectorOffset = Math.round(cellHeight / 2 - 28);
    const treeWidth = treePadding * 2 + maxX * cellWidth + (maxX - 1) * columnGap;
    const treeHeight = treePadding * 2 + maxY * cellHeight + (maxY - 1) * rowGap;
    const focusById = new Map(focuses.map((focus) => [focus.id, focus]));
    const activeFocuses = getActiveFocuses(runtime);
    const activeFocusById = new Map(activeFocuses.map((focus) => [focus.id, focus]));
    const focusSlots = maxActiveFocuses(runtime);
    const expandedFocus = focuses.find((focus) => focus.id === expandedFocusId) || null;
    const expandedRequirements = expandedFocus
      ? expandedFocus.requires.map((id) => focusById.get(id)?.name).filter(Boolean).join(", ")
      : "";
    const focusCenter = (focus) => ({
      x: treePadding + ((focusLayout.byId.get(focus.id)?.x || 1) - 1) * (cellWidth + columnGap) + cellWidth / 2,
      y: treePadding + ((focusLayout.byId.get(focus.id)?.y || 1) - 1) * (cellHeight + rowGap) + cellHeight / 2,
    });
    const focusLinks = focuses.flatMap((focus) => (focus.requires || [])
      .map((requiredId) => focusById.get(requiredId))
      .filter(Boolean)
      .map((required) => {
        const from = focusCenter(required);
        const to = focusCenter(focus);
        const fromY = from.y + connectorOffset;
        const toY = to.y - connectorOffset;
        const laneY = fromY + Math.max(24, (toY - fromY) / 2);
        return {
          d: Math.abs(from.x - to.x) < 1
            ? `M ${from.x} ${fromY} V ${toY}`
            : `M ${from.x} ${fromY} V ${laneY} H ${to.x} V ${toY}`,
        };
      }));
    strategyContent.innerHTML = `
      <section class="tab-section focus-section">
        <h3>Национальные фокусы · слоты ${activeFocuses.length}/${focusSlots}</h3>
        <div class="focus-tree" style="--focus-columns:${maxX};--focus-rows:${maxY};--focus-cell-width:${cellWidth}px;--focus-cell-height:${cellHeight}px;--focus-column-gap:${columnGap}px;--focus-row-gap:${rowGap}px;width:${treeWidth}px;min-height:${treeHeight}px">
          <svg class="focus-links" width="${treeWidth}" height="${treeHeight}" viewBox="0 0 ${treeWidth} ${treeHeight}" aria-hidden="true">
            ${focusLinks.map((link) => `
              <path d="${link.d}" />
            `).join("")}
          </svg>
          ${focuses.map((focus) => {
          const done = runtime.completedFocuses.includes(focus.id);
          const activeFocus = activeFocusById.get(focus.id);
          const active = Boolean(activeFocus);
          const branchBlocked = focus.branch && (runtime.blockedFocusBranches || []).includes(focus.branch);
          const dateLocked = !isFocusDateAvailable(focus);
          const noFreeSlot = !active && activeFocuses.length >= focusSlots;
          const locked = dateLocked || branchBlocked || noFreeSlot || focus.requires.some((id) => !runtime.completedFocuses.includes(id));
          const requiredNames = focus.requires
            .map((id) => focuses.find((item) => item.id === id)?.name)
            .filter(Boolean)
            .join(", ");
          const layout = focusLayout.byId.get(focus.id) || { x: focus.x || 1, y: focus.y || 1 };
          return `
            <article class="strategy-card focus-card ${done ? "done" : ""} ${active ? "active-focus" : ""} ${locked ? "locked" : ""} ${expandedFocus?.id === focus.id ? "expanded-focus-source" : ""}" data-focus-id="${focus.id}" style="grid-column:${layout.x};grid-row:${layout.y}">
              <header>
                <strong>${focus.name}</strong>
                <small>${done ? "Готово" : active ? `${activeFocus.progress}/${focus.days} дн.` : `${focus.days} дн.`}</small>
              </header>
              <div class="progress-bar"><span style="width:${active ? Math.min(100, Math.round(activeFocus.progress / focus.days * 100)) : done ? 100 : 0}%"></span></div>
              <p>${focus.text}</p>
              <small>${rewardText(focus.reward)}</small>
              ${focus.branch ? `<small>Ответвление: ${focus.branch}</small>` : ""}
              ${dateLocked ? `<small>Доступно с ${gameDateLabel(new Date(`${focus.availableFrom}T00:00:00`), { short: true })}</small>` : branchBlocked ? `<small>Ответвление заблокировано</small>` : noFreeSlot ? `<small>Нет свободного слота фокуса (${activeFocuses.length}/${focusSlots})</small>` : requiredNames ? `<small>Требует: ${requiredNames}</small>` : ""}
              <button class="mini-button" type="button" data-action="focus" data-id="${focus.id}" ${done || active || locked ? "disabled" : ""}>Начать</button>
            </article>
          `;
        }).join("")}
          ${expandedFocus ? `
            <aside class="strategy-card focus-expanded-card">
              <button class="focus-expanded-close" type="button" data-close-focus-details aria-label="Свернуть">×</button>
              <header>
                <strong>${expandedFocus.name}</strong>
                <small>${expandedFocus.days || 70} дн.</small>
              </header>
              <p>${focusExpandedText(expandedFocus, expandedRequirements)}</p>
              <small>${rewardText(expandedFocus.reward)}</small>
              ${expandedFocus.branch ? `<small>Ответвление: ${expandedFocus.branch}</small>` : ""}
              ${expandedRequirements ? `<small>Требует: ${expandedRequirements}</small>` : ""}
            </aside>
          ` : ""}
        </div>
      </section>
    `;
  }

  function renderInternal(runtime) {
    const player = currentPlayerCountry();
    const formables = availableFormables(player, runtime);
    const currentIdeology = ideologyById(runtime.ideology);
    const democracy = runtime.democracy || {};
    const nextElectionLabel = democracy.nextElectionAt ? gameDateLabel(new Date(`${democracy.nextElectionAt}T00:00:00`), { short: true }) : "нет";
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Внутренняя политика</h3>
        <article class="strategy-card accent-card">
          <header><strong>Формируемые страны</strong><small>${formables.length ? "условия" : "нет проектов"}</small></header>
          ${formables.length ? formables.map((formable) => `
            <div class="advisor-row formable-row">
              <span>
                <strong>${formable.name}</strong>
                <small>${formable.description}</small>
                ${formableRequirementStatus(formable, player, runtime).map((item) => `<small class="${item.ok ? "status-ok" : "status-bad"}">${item.ok ? "✓" : "•"} ${item.text}</small>`).join("")}
              </span>
              <button class="mini-button" type="button" data-action="form-nation" data-id="${formable.id}" ${runtime.formedNation === formable.id || !canFormNation(formable, player, runtime) ? "disabled" : ""}>Сформировать</button>
            </div>
          `).join("") : "<p>Для этой страны нет проекта формирования нового государства.</p>"}
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Курс власти и реформы</strong><small>${currentIdeology?.name || runtime.ideology}</small></header>
          <div class="law-row">
            <small>Идеология / форма власти</small>
            <select class="strategy-select" id="ideologySelect">
              ${availableIdeologyOptions(player, runtime).map((ideology) => `<option value="${ideology.id}" ${runtime.ideology === ideology.id ? "selected" : ""}>${ideology.name} · ${ideology.cost} ПП · ${effectsText(ideology.effects)}</option>`).join("")}
            </select>
            <button class="mini-button" type="button" data-action="ideology">Сменить</button>
          </div>
          <small>Текущий бонус: ${effectsText(currentIdeology?.effects)}</small>
          ${GOVERNMENT_REFORMS.map((reform) => `
            <div class="advisor-row">
              <span><strong>${reform.name}</strong><small>${reform.cost} ПП</small></span>
              <button class="mini-button" type="button" data-action="reform" data-id="${reform.id}" ${runtime.reforms.includes(reform.id) || runtime.politicalPower < reform.cost ? "disabled" : ""}>Внедрить</button>
            </div>
          `).join("")}
        </article>
        ${isDemocraticIdeology(runtime.ideology) ? `
          <article class="strategy-card accent-card">
            <header><strong>Демократический цикл</strong><small>${Math.round(democracy.approval || 0)}% доверия</small></header>
            <div class="resource-grid">
              <span class="resource-pill"><small>Поддержка</small><strong>${Math.round(democracy.approval || 0)}%</strong></span>
              <span class="resource-pill"><small>Парламент</small><strong>${Math.round(democracy.parliament || 0)}%</strong></span>
              <span class="resource-pill"><small>Выборы</small><strong>${nextElectionLabel}</strong></span>
            </div>
            <div class="inline-actions">
              <button class="mini-button" type="button" data-action="democracy-campaign" ${runtime.politicalPower < 20 ? "disabled" : ""}>Кампания</button>
              <button class="mini-button" type="button" data-action="democracy-reform" ${runtime.politicalPower < 35 ? "disabled" : ""}>Реформа</button>
              <button class="mini-button" type="button" data-action="democracy-election" ${runtime.politicalPower < 15 ? "disabled" : ""}>Провести выборы</button>
            </div>
            <small>Демократия дает дипломатическую гибкость, но низкая поддержка бьет по стабильности и может изменить курс на выборах.</small>
          </article>
        ` : ""}
        <article class="strategy-card accent-card">
          <header><strong>Законы государства</strong><small>ПП: ${Math.floor(runtime.politicalPower)}</small></header>
          ${Object.entries(LAW_GROUPS).map(([groupId, group]) => `
            <div class="law-row">
              <small>${group.label}</small>
              <select class="strategy-select" id="law-${groupId}">
                ${group.options.map((law) => `<option value="${law.id}" ${runtime.laws[groupId] === law.id ? "selected" : ""}>${law.name} · ${law.cost} ПП</option>`).join("")}
              </select>
              <button class="mini-button" type="button" data-action="law" data-id="${groupId}">Принять</button>
            </div>
          `).join("")}
        </article>
        <article class="strategy-card">
          <strong>Советники</strong>
          ${ADVISORS.map((advisor) => `
            <div class="advisor-row">
              <span><strong>${advisor.name}</strong><small>${advisor.role} · ${advisor.cost} ПП</small></span>
              <button class="mini-button" type="button" data-action="advisor" data-id="${advisor.id}" ${runtime.advisors.includes(advisor.id) || runtime.politicalPower < advisor.cost ? "disabled" : ""}>Назначить</button>
            </div>
          `).join("")}
        </article>
        ${DOMESTIC_DECISIONS.map((decision) => `
          <article class="strategy-card">
            <header>
              <strong>${decision.name}</strong>
              <small>${decision.cost} ПП</small>
            </header>
            <p>${decision.text}</p>
            <button class="mini-button" type="button" data-action="decision" data-id="${decision.id}" ${runtime.politicalPower < decision.cost ? "disabled" : ""}>Принять</button>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderProduction(runtime) {
    const used = runtime.production.reduce((sum, line) => sum + line.assigned, 0);
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Производство</h3>
        <article class="strategy-card accent-card">
          <header><strong>Заводы</strong><small>${used}/${runtime.factories} занято</small></header>
          <p>Назначайте заводы на линии. Выпуск идет автоматически каждый день, пока хватает ресурсов.</p>
        </article>
        ${PRODUCTION_LINES.map((line) => {
          const runtimeLine = runtime.production.find((item) => item.lineId === line.id) || { assigned: 0, progress: 0 };
          const pct = Math.min(100, Math.round(runtimeLine.progress / line.days * 100));
          const cost = Object.keys(line.cost).map((resource) => `${RESOURCE_LABELS[resource]} ${line.cost[resource]}`).join(" · ");
          return `
            <article class="strategy-card">
              <header>
                <strong>${line.name}</strong>
                <small>${runtimeLine.assigned} зав. · ${pct}%</small>
              </header>
              <div class="progress-bar"><span style="width:${pct}%"></span></div>
              <p>${line.text}</p>
              <small>Стоимость выпуска: ${cost}</small>
              <div class="inline-actions">
                <button class="mini-button" type="button" data-action="prod-minus" data-id="${line.id}" ${runtimeLine.assigned <= 0 ? "disabled" : ""}>−</button>
                <button class="mini-button" type="button" data-action="prod-plus" data-id="${line.id}" ${used >= runtime.factories ? "disabled" : ""}>+</button>
              </div>
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderResearch(runtime) {
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Исследования</h3>
        <article class="strategy-card accent-card">
          <header><strong>Военные доктрины</strong><small>Опыт армии: ${Math.floor(runtime.armyXp)}</small></header>
          ${DOCTRINES.map((doctrine) => `
            <div class="advisor-row">
              <span><strong>${doctrine.name}</strong><small>${doctrine.cost} опыта</small></span>
              <button class="mini-button" type="button" data-action="doctrine" data-id="${doctrine.id}" ${runtime.doctrines.includes(doctrine.id) || runtime.armyXp < doctrine.cost ? "disabled" : ""}>Выбрать</button>
            </div>
          `).join("")}
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Ядерная программа</strong><small>${runtime.nuclear.warheads} боеголовок · ${runtime.nuclear.reactors} реакторов</small></header>
          <div class="resource-grid">
            <span class="resource-pill"><small>Статус</small><strong>${runtime.nuclear.program ? "активна" : "нет"}</strong></span>
            <span class="resource-pill"><small>Доктрина</small><strong>${runtime.nuclear.doctrine}</strong></span>
          </div>
          <div class="inline-actions">
            <button class="mini-button" type="button" data-action="nuclear-program" ${runtime.nuclear.program || !runtime.technologies.includes("nuclear-engineering") ? "disabled" : ""}>Запустить программу</button>
            <button class="mini-button" type="button" data-action="nuclear-reactor" ${!runtime.nuclear.program ? "disabled" : ""}>Построить реактор</button>
            <button class="danger-button" type="button" data-action="nuclear-warhead" ${!runtime.nuclear.program || runtime.nuclear.reactors < 1 ? "disabled" : ""}>Создать боеголовку</button>
          </div>
          <small>Страны без ядерного арсенала сначала проходят ядерный фокус или исследуют ядерную инженерию.</small>
        </article>
        ${RESEARCH_PROJECTS.map((project) => {
          const done = runtime.technologies.includes(project.id);
          const active = runtime.activeResearchId === project.id;
          const pct = active ? Math.min(100, Math.round(runtime.researchProgress / project.days * 100)) : done ? 100 : 0;
          return `
            <article class="strategy-card ${done ? "done" : ""}">
              <header>
                <strong>${project.name}</strong>
                <small>${done ? "Изучено" : active ? `${runtime.researchProgress}/${project.days} дн.` : `${project.days} дн.`}</small>
              </header>
              <div class="progress-bar"><span style="width:${pct}%"></span></div>
              <p>${project.text}</p>
              <button class="mini-button" type="button" data-action="research" data-id="${project.id}" ${done || active || runtime.activeResearchId ? "disabled" : ""}>Исследовать</button>
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderForeign() {
    const relationSource = countryById(relationMapCountryId || strategyState.playerCountryId) || currentPlayerCountry();
    const pairSource = relationPair ? countryById(relationPair.sourceId) : null;
    const pairTarget = relationPair ? countryById(relationPair.targetId) : null;
    const pairValue = pairSource && pairTarget ? getRelation(pairSource.id, pairTarget.id) : null;
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Внешняя политика</h3>
        <article class="strategy-card accent-card">
          <header><strong>Карта отношений</strong><small>${relationMapMode ? `выбрана: ${relationSource?.name || "страна"}` : "выключена"}</small></header>
          <button class="mini-button" type="button" data-action="relation-map">${relationMapMode ? "Выключить" : "Показать на карте"}</button>
          <small>ЛКМ по стране выбирает ее как источник отношений. ПКМ по другой стране показывает отношения между выбранной и нажатой страной.</small>
          ${relationMapMode && pairSource && pairTarget ? `<small>${pairSource.name} ↔ ${pairTarget.name}: ${pairValue > 0 ? "+" : ""}${pairValue}</small>` : ""}
        </article>
        <article class="strategy-card">
          <strong>Отношения и союзы</strong>
          <div class="form-row">
            <select id="foreignTarget" class="strategy-select">${countryOptions()}</select>
            <button class="mini-button" type="button" data-action="improve">Улучшить</button>
          </div>
          <button class="mini-button" type="button" data-action="alliance">Союз</button>
          <small>Улучшение стоит 15 ПП. Союз стоит 35 ПП и требует отношения +30.</small>
        </article>
        <article class="strategy-card">
          <strong>Договоры</strong>
          <select id="treatyTarget" class="strategy-select">${countryOptions()}</select>
          <div class="inline-actions treaty-actions">
            <button class="mini-button" type="button" data-action="access">Проход</button>
            <button class="mini-button" type="button" data-action="visa">Безвиз</button>
            <button class="mini-button" type="button" data-action="base">База</button>
          </div>
          <small>Проход и безвиз доступны при нейтральных отношениях. База требует +20 и бюджет.</small>
        </article>
        <article class="strategy-card">
          <strong>Санкции</strong>
          <div class="form-row">
            <select id="sanctionTarget" class="strategy-select">${countryOptions()}</select>
            <select id="sanctionType" class="strategy-select">
              ${SANCTION_TYPES.map((type) => `<option value="${type.id}">${type.name} · ${type.cost} ПП</option>`).join("")}
            </select>
          </div>
          <button class="danger-button" type="button" data-action="sanction">Ввести санкции</button>
          <small>Санкции сразу портят отношения и каждый день бьют по экономике, технологиям, власти или армии.</small>
        </article>
        ${renderSanctionsList()}
        <article class="strategy-card">
          <header><strong>Разведоперации</strong><small>Разведданные: ${Math.floor(currentPlayerState().intel)}</small></header>
          <select id="operationTarget" class="strategy-select">${countryOptions()}</select>
          <select id="operationType" class="strategy-select">
            ${INTELLIGENCE_OPERATIONS.map((operation) => `<option value="${operation.id}">${operation.name} · ${operation.days} дн.</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="operation">Начать операцию</button>
          ${currentPlayerState().operations.length ? currentPlayerState().operations.map((operation) => {
            const template = INTELLIGENCE_OPERATIONS.find((item) => item.id === operation.operationId);
            const target = countryById(operation.targetId);
            return `<small>${template?.name || "Операция"} против ${target?.name || "?"}: ${operation.progress}/${operation.days}</small>`;
          }).join("") : "<small>Активных операций нет.</small>"}
        </article>
        ${renderRelationsList()}
      </section>
    `;
  }

  function renderSanctionsList() {
    const playerId = Number(strategyState.playerCountryId);
    const outgoing = sanctionsByIssuer(playerId);
    const incoming = sanctionsAgainst(playerId);
    const list = [...outgoing.map((item) => ({ ...item, side: "out" })), ...incoming.map((item) => ({ ...item, side: "in" }))];
    if (!list.length) {
      return `<article class="strategy-card"><p>Активных санкций нет.</p></article>`;
    }
    return `
      <article class="strategy-card">
        <strong>Активные санкции</strong>
        ${list.slice(0, 8).map((sanction) => {
          const type = sanctionTypeById(sanction.type);
          const issuer = countryById(sanction.issuerId);
          const target = countryById(sanction.targetId);
          const canLift = sanction.side === "out" && sanction.active !== false;
          return `
            <div class="advisor-row">
              <span>
                <strong>${type.name}</strong>
                <small>${issuer?.name || sanction.issuerId} → ${target?.name || sanction.targetId}</small>
                <small>${type.text}</small>
              </span>
              ${canLift ? `<button class="mini-button" type="button" data-action="lift-sanction" data-id="${sanction.id}">Снять</button>` : ""}
            </div>
          `;
        }).join("")}
      </article>
    `;
  }

  function renderRelationsList() {
    const sourceId = Number(relationMapCountryId || strategyState.playerCountryId);
    const source = countryById(sourceId);
    const rows = gameData.scenario.countries
      .filter((country) => Number(country.id) !== Number(sourceId))
      .map((country) => ({ country, relation: getRelation(sourceId, country.id) }))
      .filter((row) => row.relation !== 0)
      .sort((a, b) => Math.abs(b.relation) - Math.abs(a.relation))
      .slice(0, 8);
    if (!rows.length) return `<article class="strategy-card"><p>Значимых отношений для ${source?.name || "страны"} пока нет.</p></article>`;
    return `
      <article class="strategy-card accent-card">
        <header><strong>Значимые отношения</strong><small>${source?.name || "страна"}</small></header>
      </article>
      ${rows.map(({ country, relation }) => `
      <article class="strategy-card">
        <header><strong>${country.name}</strong><small>${relation > 0 ? "+" : ""}${relation}</small></header>
      </article>
    `).join("")}`;
  }

  function renderTrade() {
    const runtime = currentPlayerState();
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Торговля и макроэкономика</h3>
        <article class="strategy-card accent-card">
          <header><strong>Валютный режим</strong><small>${CURRENCY_POLICIES.find((item) => item.id === runtime.currencyPolicy)?.name || "Плавающий курс"}</small></header>
          <div class="resource-grid">
            <span class="resource-pill"><small>ВВП ППС</small><strong>${runtime.pppGdp} млрд</strong></span>
            <span class="resource-pill"><small>ППС на душу</small><strong>${runtime.pppPerCapita.toLocaleString("ru-RU")}</strong></span>
            <span class="resource-pill"><small>Уровень жизни</small><strong>${runtime.livingStandard}</strong></span>
            <span class="resource-pill"><small>Стабильность валюты</small><strong>${runtime.currencyStability}%</strong></span>
          </div>
          <select id="currencyPolicy" class="strategy-select">
            ${CURRENCY_POLICIES.map((policy) => `<option value="${policy.id}" ${runtime.currencyPolicy === policy.id ? "selected" : ""}>${policy.name}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="currency">Сменить валютный режим</button>
          <small>Модель без ЦБ: режим влияет на торговлю, ППС и стабильность валюты.</small>
        </article>
        <article class="strategy-card">
          <strong>Новый импорт</strong>
          <select id="tradeTarget" class="strategy-select">${countryOptions()}</select>
          <select id="tradeCategory" class="strategy-select">
            ${Object.entries(TRADE_CATEGORIES).map(([id, category]) => `<option value="${id}">${category.label}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="trade">Заключить контракт</button>
          <small>Контракты идут по категориям: энергетика, сырье, продукты, промышленность.</small>
        </article>
        <article class="strategy-card">
          <strong>Иностранные активы</strong>
          <select id="assetOwner" class="strategy-select">${countryOptions()}</select>
          <button class="danger-button" type="button" data-action="seize-assets">Арестовать активы</button>
          <small>Арест дает бюджет, но резко ухудшает отношения.</small>
        </article>
        ${strategyState.trades.length ? strategyState.trades.map((trade) => {
          const from = gameData.scenario.countries.find((country) => Number(country.id) === Number(trade.from));
          const category = TRADE_CATEGORIES[trade.category];
          return `<article class="strategy-card"><p>${category?.label || RESOURCE_LABELS[trade.resource]}: ${from?.name || "страна"} → ежедневно</p></article>`;
        }).join("") : '<article class="strategy-card"><p>Активных торговых контрактов нет.</p></article>'}
      </section>
    `;
  }

  function renderWars() {
    const activeWars = strategyState.wars.filter((war) => war.active);
    const conference = strategyState.peaceConference;
    const peaceTargets = conference
      ? warEnemies(strategyState.playerCountryId, conference).map((id) => countryById(id)).filter(Boolean)
      : [];
    const peaceRegionChoices = conference
      ? peaceTargets.flatMap((country) => occupiedRegionsControlledBy(strategyState.playerCountryId, country.id).map((regionId) => ({ country, regionId })))
      : [];
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Войны</h3>
        <article class="strategy-card">
          <strong>Объявить войну</strong>
          <select id="warTarget" class="strategy-select">${countryOptions()}</select>
          <button class="danger-button" type="button" data-action="war">Объявить</button>
          <button class="mini-button" type="button" data-action="occupy">Операция</button>
          <button class="danger-button" type="button" data-action="nuclear-deterrence">Ядерное сдерживание</button>
          <small>Война стоит 50 ПП и требует поддержку войны 25%. Операция занимает один регион противника, кроме защищенных регионов России.</small>
        </article>
        <article class="strategy-card">
          <strong>Пригласить к войне</strong>
          <select id="inviteTarget" class="strategy-select">${countryOptions()}</select>
          <select id="inviteEnemy" class="strategy-select">${countryOptions()}</select>
          <button class="mini-button" type="button" data-action="invite-war">Пригласить</button>
          <small>Согласие возможно при отношениях с вами от 0 и отношениях с врагом ниже -10.</small>
        </article>
        <article class="strategy-card">
          <strong>Вступить в чужую войну</strong>
          <select id="joinWarSide" class="strategy-select">${countryOptions()}</select>
          <button class="mini-button" type="button" data-action="join-war">Вступить</button>
          <small>Вы вступаете на стороне выбранной страны против ее противника. Отношения с выбранной стороной улучшаются.</small>
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Мирная конференция</strong><small>${conference ? "идет" : activeWars.length ? "доступна" : "нет войны"}</small></header>
          ${conference ? `
            <p>Участники: ${conference.participants.map((id) => countryById(id)?.name).filter(Boolean).join(", ")}</p>
            ${conference.demands.length ? conference.demands.map((demand) => `<small>${demand.source === "bot" ? "Бот" : "Игрок"}: ${peaceDemandText(demand)}</small>`).join("") : "<small>Требований пока нет.</small>"}
            <div class="form-row">
              <select id="peaceTarget" class="strategy-select">
                ${peaceTargets.map((country) => `<option value="${country.id}">${country.name}</option>`).join("")}
              </select>
              <select id="peaceDemandType" class="strategy-select">
                <option value="reparations">Репарации</option>
                <option value="annex_occupied">Закрепить оккупации</option>
                <option value="demilitarize">Демилитаризация</option>
                <option value="status_quo">Статус-кво</option>
              </select>
            </div>
            <input id="releasedCountryName" class="strategy-select" type="text" placeholder="Название новой страны">
            <div class="peace-region-list">
              <strong>Оккупированные регионы</strong>
              ${peaceRegionChoices.length ? peaceRegionChoices.map(({ country, regionId }) => {
                const region = gameData.regionById.get(Number(regionId));
                return `
                  <label class="peace-region-option">
                    <input type="checkbox" data-peace-region="${regionId}" data-owner-id="${country.id}" checked>
                    <span>${region?.name || `Регион ${regionId}`}</span>
                    <small>${country.name}</small>
                  </label>
                `;
              }).join("") : "<small>Ваших оккупированных регионов у противников пока нет.</small>"}
            </div>
            <div class="inline-actions">
              <button class="mini-button" type="button" data-action="add-peace-demand">Добавить требование</button>
              <button class="mini-button" type="button" data-action="create-occupation-country" ${peaceRegionChoices.length ? "" : "disabled"}>Создать страну</button>
              <button class="danger-button" type="button" data-action="finalize-peace">Подписать мир</button>
            </div>
          ` : `
            <p>При мирном договоре боты сами выдвигают требования, игрок добавляет свои, затем весь связанный конфликт завершается одновременно.</p>
            <button class="mini-button" type="button" data-action="open-peace" ${activeWars.length ? "" : "disabled"}>Открыть конференцию</button>
          `}
        </article>
        ${activeWars.length ? activeWars.map((war) => {
          const attacker = gameData.scenario.countries.find((country) => Number(country.id) === Number(war.attackerId));
          const defender = gameData.scenario.countries.find((country) => Number(country.id) === Number(war.defenderId));
          return `<article class="strategy-card"><header><strong>${attacker?.name || "?"} vs ${defender?.name || "?"}</strong><small>с ${war.start}</small></header></article>`;
        }).join("") : '<article class="strategy-card"><p>Активных войн нет.</p></article>'}
      </section>
    `;
  }

  function renderArmy(runtime) {
    const ownRegions = currentPlayerCountry().regionIds || [];
    const currentMinister = ARMY_MINISTERS.find((item) => item.id === runtime.armyMinister) || ARMY_MINISTERS[0];
    const regionOptions = ownRegions.map((regionId) => {
      const region = gameData.regionById.get(Number(regionId));
      return `<option value="${regionId}">${region?.name || `Регион ${regionId}`}</option>`;
    }).join("");
    const reachableRegions = gameData.scenario.countries
      .filter((country) => hasMilitaryAccess(runtime.countryId, country.id) || isAtWar(runtime.countryId, country.id))
      .flatMap((country) => (country.regionIds || []).slice(0, 25).map((regionId) => ({ country, regionId })));
    const moveOptions = reachableRegions.map(({ country, regionId }) => {
      const region = gameData.regionById.get(Number(regionId));
      return `<option value="${regionId}">${country.name}: ${region?.name || regionId}</option>`;
    }).join("");
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Армия и базы</h3>
        <article class="strategy-card accent-card">
          <header><strong>Сухопутные силы</strong><small>${runtime.armies.length} армий · ${runtime.bases.length} баз</small></header>
          <p>${currentMinister.id === "none" ? "Ручной режим: армии формируются и двигаются игроком." : `${currentMinister.name} сам формирует армии и отправляет их на фронт. Игрок может помогать вручную.`}</p>
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Военный министр</strong><small>${currentMinister.name}</small></header>
          <select id="armyMinister" class="strategy-select">
            ${ARMY_MINISTERS.map((minister) => `<option value="${minister.id}" ${runtime.armyMinister === minister.id ? "selected" : ""}>${minister.name}${minister.cost ? ` · ${minister.cost} ПП` : ""}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="army-minister">Назначить</button>
          <small>${currentMinister.text}</small>
          <small>Автокомандование работает каждый игровой день: набирает армии, отправляет несколько отрядов на разные регионы противника и автоматически оформляет оккупации.</small>
        </article>
        <article class="strategy-card">
          <strong>Сформировать армию</strong>
          <select id="recruitRegion" class="strategy-select">${regionOptions}</select>
          <button class="mini-button" type="button" data-action="recruit">Сформировать</button>
          <small>Стоимость зависит от размера отряда. Нужно минимум 100 готовых солдат в регионе.</small>
        </article>
        <article class="strategy-card accent-card">
          <strong>Сформировать и отправить на фронт</strong>
          <select id="deployRecruitRegion" class="strategy-select">${regionOptions}</select>
          <select id="deployTargetCountry" class="strategy-select">${countryOptions()}</select>
          <button class="danger-button" type="button" data-action="recruit-deploy">Создать и отправить</button>
          <small>Работает, если с выбранной страной уже идет война. Армия получит приказ на первый доступный регион противника.</small>
        </article>
        ${runtime.armies.map((army) => {
          const location = gameData.regionById.get(Number(army.regionId));
          return `
            <article class="strategy-card">
              <header><strong>${army.name}</strong><small>${Math.floor(army.soldiers)} солд. · ${Math.round(army.readiness)}%</small></header>
              <p>${army.movingTo ? `Движется: ${army.eta} дн.` : `Регион: ${location?.name || army.regionId}`}</p>
              <div class="form-row">
                <select class="strategy-select" id="move-${army.id}">${moveOptions || regionOptions}</select>
                <button class="mini-button" type="button" data-action="move-army" data-id="${army.id}">Марш</button>
              </div>
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function selectedRegionProfile() {
    const id = strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId;
    const owner = ownerOfRegion(id);
    const runtime = owner ? strategyState.countryStates[String(owner.id)] : null;
    return { id: Number(id), owner, runtime, profile: runtime?.regionProfiles[String(id)] || null };
  }

  function renderRegions() {
    const player = currentPlayerCountry();
    const { id, owner, profile } = selectedRegionProfile();
    const region = gameData.regionById.get(Number(id));
    const controller = controllerOfRegion(id);
    const occupiedByPlayer = (gameData.scenario.occupations || []).some((occupation) => Number(occupation.regionId) === Number(id) && Number(occupation.controllerCountryId) === Number(player.id));
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Регионы</h3>
        <article class="strategy-card accent-card">
          <header><strong>${region?.name || `Регион ${id}`}</strong><small>${owner?.name || "нет владельца"}${controller && owner && Number(controller.id) !== Number(owner.id) ? ` · оккупант: ${controller.name}` : ""}</small></header>
          ${profile ? `
            <div class="resource-grid">
              <span class="resource-pill"><small>Население</small><strong>${Math.floor(profile.population).toLocaleString("ru-RU")}</strong></span>
              <span class="resource-pill"><small>Готовые солдаты</small><strong>${Math.floor(profile.readySoldiers).toLocaleString("ru-RU")}</strong></span>
              <span class="resource-pill"><small>ВВП региона</small><strong>${profile.gdp} млрд</strong></span>
              <span class="resource-pill"><small>Экономика</small><strong>${profile.economy}</strong></span>
              <span class="resource-pill"><small>Министр</small><strong>${REGION_MINISTERS.find((item) => item.id === profile.minister)?.name || "нет"}</strong></span>
              <span class="resource-pill"><small>Здания</small><strong>${profile.buildings.length}</strong></span>
              ${Object.keys(RESOURCE_LABELS).map((resource) => `<span class="resource-pill"><small>${RESOURCE_LABELS[resource]}</small><strong>${profile.resources[resource]}</strong></span>`).join("")}
            </div>
          ` : "<p>Нет данных региона.</p>"}
          <button class="mini-button" type="button" data-action="recruit-selected" ${owner?.id !== player.id || !profile ? "disabled" : ""}>Сформировать армию здесь</button>
          <button class="mini-button" type="button" data-action="integrate" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Интегрировать оккупацию</button>
          <button class="mini-button" type="button" data-action="release-occupation" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Деоккупировать</button>
          <button class="mini-button" type="button" data-action="create-region-country" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Создать страну</button>
        </article>
        <article class="strategy-card">
          <strong>Министр региона</strong>
          <select id="regionMinister" class="strategy-select">
            ${REGION_MINISTERS.map((minister) => `<option value="${minister.id}" ${profile?.minister === minister.id ? "selected" : ""}>${minister.name}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="region-minister" data-id="${id}" ${owner?.id !== player.id || !profile ? "disabled" : ""}>Назначить</button>
          <small>Министр использует часть бюджета на развитие региона автоматически.</small>
        </article>
        <article class="strategy-card">
          <strong>Строительство в регионе</strong>
          <select id="constructionProject" class="strategy-select">
            ${CONSTRUCTION_PROJECTS.map((project) => `<option value="${project.id}">${project.name} · ${project.days} дн.</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="construction" data-id="${id}" ${owner?.id !== player.id ? "disabled" : ""}>Строить</button>
          ${currentPlayerState().constructions.length ? currentPlayerState().constructions.map((project) => {
            const template = CONSTRUCTION_PROJECTS.find((item) => item.id === project.projectId);
            const place = gameData.regionById.get(Number(project.regionId));
            return `<small>${template?.name || "Проект"}: ${place?.name || project.regionId} · ${Math.round(project.progress)}/${project.days}</small>`;
          }).join("") : "<small>Очередь строительства пуста.</small>"}
        </article>
        <article class="strategy-card">
          <strong>Ваши регионы</strong>
          <select id="regionPicker" class="strategy-select">
            ${(player.regionIds || []).map((regionId) => `<option value="${regionId}" ${Number(regionId) === Number(id) ? "selected" : ""}>${gameData.regionById.get(Number(regionId))?.name || regionId}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="select-region">Показать</button>
        </article>
      </section>
    `;
  }

  function renderOrganizations() {
    const playerId = Number(strategyState.playerCountryId);
    const treaties = activeInternationalTreaties();
    const nextAssembly = nextUNGeneralAssemblyDate(strategyState.date);
    const assembly = strategyState.lastUNGeneralAssembly;
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Организации</h3>
        <article class="strategy-card accent-card">
          <header><strong>Международные договоры</strong><small>${treaties.length}</small></header>
          <p>Договоры задают глобальные правила, которые действуют независимо от союзов и отношений.</p>
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Генеральная Ассамблея ООН</strong><small>${nextAssembly ? gameDateLabel(nextAssembly, { short: true }) : "нет даты"}</small></header>
          <p>Ежегодная дипломатическая сессия проводится автоматически и формирует повестку, резолюции и мягкое давление на участников конфликтов.</p>
          ${assembly ? `
            <small>Последняя сессия: ${gameDateLabel(new Date(`${assembly.date}T00:00:00`), { short: true })}</small>
            <small>Повестка: ${assembly.agenda.join(" · ")}</small>
            <small>Резолюции: ${assembly.resolutions.join(" · ")}</small>
            <small>Кризисы: ${assembly.wars} войн, ${assembly.sanctions} санкционных пакетов, ${assembly.countries} затронутых стран.</small>
          ` : `<small>${strategyState.lastUNGeneralAssemblyAt ? `Последняя сессия: ${gameDateLabel(new Date(`${strategyState.lastUNGeneralAssemblyAt}T00:00:00`), { short: true })}` : "Сессий в этом сохранении ещё не было."}</small>`}
        </article>
        ${treaties.map((treaty) => `
          <article class="strategy-card done">
            <header><strong>${treaty.name}</strong><small>${treaty.status}</small></header>
            <p>${treaty.text}</p>
            ${(treaty.effects || []).map((effect) => `<small>${effect}</small>`).join("")}
            ${treaty.id === "antarctic" ? `<small>Нейтральных регионов: ${gameData?.antarcticRegionIds?.size || 0}</small>` : ""}
          </article>
        `).join("")}
        ${strategyState.organizations.map((org) => {
          const isMember = org.members.includes(playerId);
          const members = org.members.map((id) => countryById(id)?.name).filter(Boolean).slice(0, 12).join(", ");
          return `
            <article class="strategy-card ${isMember ? "done" : ""}">
              <header><strong>${org.name}</strong><small>${org.global ? "мировая" : "союзная"}</small></header>
              <p>${members}${org.members.length > 12 ? "..." : ""}</p>
              <small>${org.global ? "Мировые организации не задают союзные отношения." : "Членство задает положительные отношения и стартовые союзы."}</small>
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function renderEventLog() {
    return `
      <section class="tab-section">
        <h3>События</h3>
        <div class="event-log">
          ${strategyState.log.map((entry) => `<div>${entry}</div>`).join("")}
        </div>
      </section>
    `;
  }

  function isStrategyControlFocused() {
    const element = document.activeElement;
    return Boolean(element && strategyContent.contains(element) && /^(SELECT|INPUT|BUTTON|TEXTAREA)$/.test(element.tagName));
  }

  function updateStrategyFullscreenButton() {
    strategyFullscreenButton.hidden = !activeTab;
    strategyFullscreenButton.classList.toggle("active", strategyPanelFullscreen);
    strategyFullscreenButton.title = strategyPanelFullscreen ? "Вернуть панель" : "Развернуть панель";
    strategyFullscreenButton.setAttribute("aria-label", strategyFullscreenButton.title);
    strategyFullscreenButton.textContent = strategyPanelFullscreen ? "×" : "⛶";
  }

  function setStrategyPanelFullscreen(enabled) {
    strategyPanelFullscreen = Boolean(enabled && activeTab);
    gameScreen.classList.toggle("strategy-panel-fullscreen", strategyPanelFullscreen);
    updateStrategyFullscreenButton();
  }

  function renderStrategyPanel(options = {}) {
    const refreshContent = options.refreshContent !== false;
    if (!gameData || !strategyState) return;
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    renderStateSummary(player, runtime);
    renderSelectedRegionSummary();
    strategyTabs.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === activeTab);
    });
    strategyContent.classList.toggle("hidden", !activeTab);
    if (!activeTab && strategyPanelFullscreen) setStrategyPanelFullscreen(false);
    updateStrategyFullscreenButton();
    if (!activeTab) {
      strategyContent.innerHTML = "";
      const speedLabel = gamePaused ? "пауза" : `${gameSpeed}x, 1 день за ${GAME_SPEEDS[gameSpeed] / 1000} сек.`;
      turnStatus.textContent = `${gameDateLabel(strategyState.date, { short: true })} · ${speedLabel} · панель скрыта`;
      return;
    }
    const speedLabel = gamePaused ? "пауза" : `${gameSpeed}x, 1 день за ${GAME_SPEEDS[gameSpeed] / 1000} сек.`;
    const activeFocusCount = getActiveFocuses(runtime).length;
    turnStatus.textContent = `${gameDateLabel(strategyState.date, { short: true })} · ${speedLabel} · ${activeFocusCount ? `фокусы: ${activeFocusCount}/${maxActiveFocuses(runtime)}` : "фокус не выбран"}`;
    if (!refreshContent) return;
    if (activeTab === "focuses") renderFocuses(player, runtime);
    if (activeTab === "internal") renderInternal(runtime);
    if (activeTab === "production") renderProduction(runtime);
    if (activeTab === "research") renderResearch(runtime);
    if (activeTab === "foreign") renderForeign();
    if (activeTab === "trade") renderTrade();
    if (activeTab === "wars") renderWars();
    if (activeTab === "army") renderArmy(runtime);
    if (activeTab === "regions") renderRegions();
    if (activeTab === "orgs") renderOrganizations();
    strategyContent.insertAdjacentHTML("beforeend", renderEventLog());
  }

  function compatibleScenarios() {
    if (!selectedMap) return [];
    return scenarios.filter((scenario) =>
      Number(scenario.year) === PLAYABLE_SCENARIO_YEAR &&
      (!scenario.mapFile ||
      scenario.mapFile === selectedMap.file ||
      scenario.mapName === selectedMap.name)
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
    if (gameScreen.classList.contains("active")) return;
    try {
      const stamp = Date.now();
      const [mapsResponse, scenariosResponse] = await Promise.all([
        fetch(`maps/manifest.json?v=${stamp}`, { cache: "no-store" }),
        fetch(`scenarios/manifest.json?v=${stamp}`, { cache: "no-store" }),
      ]);
      if (!mapsResponse.ok || !scenariosResponse.ok) return;

      const mapsManifest = await mapsResponse.json();
      const scenariosManifest = await scenariosResponse.json();
      const rawScenarios = Array.isArray(scenariosManifest.scenarios) ? scenariosManifest.scenarios : [];
      const nextScenarios = rawScenarios.filter((scenario) => Number(scenario.year) === PLAYABLE_SCENARIO_YEAR);
      const playableMapFiles = new Set(nextScenarios.map((scenario) => scenario.mapFile).filter(Boolean));
      const nextMaps = (Array.isArray(mapsManifest.maps) ? mapsManifest.maps : [])
        .filter((map) => playableMapFiles.size === 0 || playableMapFiles.has(map.file));
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
      countriesList.innerHTML = '<div class="empty-state"><strong>Нет стран с уникальными фокусами</strong><p>Для игры доступны только страны с полноценным деревом фокусов.</p></div>';
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
      await loadFocusManifest();
      if (loadId !== scenarioLoadId || selectedScenario?.file !== scenario.file) return;
      const scenarioYear = data.year || scenario.year || PLAYABLE_SCENARIO_YEAR;
      scenarioCountries = (Array.isArray(data.countries) ? data.countries : [])
        .filter((country) => hasUniqueFocusTree(country, scenarioYear));
      selectedCountry = scenarioCountries[0] || null;
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

  function blendRgb(left, right, amount = 0.5) {
    return [
      Math.round(left[0] * (1 - amount) + right[0] * amount),
      Math.round(left[1] * (1 - amount) + right[1] * amount),
      Math.round(left[2] * (1 - amount) + right[2] * amount),
    ];
  }

  function relationMapColor(countryId, baseColor) {
    if (!relationMapMode || !strategyState) return baseColor;
    const sourceId = Number(relationMapCountryId || strategyState.playerCountryId);
    const targetId = Number(countryId);
    if (sourceId === targetId) return blendRgb(baseColor, [245, 220, 92], 0.5);
    const relation = getRelation(sourceId, targetId);
    const strength = Math.min(1, Math.abs(relation) / 100);
    const neutral = [118, 118, 118];
    const target = relation < 0 ? [255, 0, 0] : relation > 0 ? [0, 255, 0] : neutral;
    return blendRgb(neutral, target, strength);
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

  function addCountryLabelSample(stats, country, x, y) {
    if (!country) return;
    const id = Number(country.id);
    if (!stats.has(id)) {
      stats.set(id, {
        country,
        x: 0,
        y: 0,
        count: 0,
        minX: x,
        maxX: x,
        minY: y,
        maxY: y,
      });
    }
    const item = stats.get(id);
    item.x += x;
    item.y += y;
    item.count += 1;
    item.minX = Math.min(item.minX, x);
    item.maxX = Math.max(item.maxX, x);
    item.minY = Math.min(item.minY, y);
    item.maxY = Math.max(item.maxY, y);
  }

  function drawCountryLabels(countryStats) {
    gameOverlayCtx.save();
    gameOverlayCtx.textAlign = "center";
    gameOverlayCtx.textBaseline = "middle";
    [...countryStats.values()]
      .filter((item) => item.count >= 1600)
      .sort((a, b) => b.count - a.count)
      .forEach((item) => {
        const width = Math.max(1, item.maxX - item.minX);
        const height = Math.max(1, item.maxY - item.minY);
        const maxLabelWidth = Math.max(28, Math.min(width * 0.78, Math.sqrt(item.count) * 3.2));
        let fontSize = Math.max(10, Math.min(42, Math.round(Math.sqrt(item.count) / 5.8)));
        const name = String(item.country.name || "").toUpperCase();
        if (!name || width < 34 || height < 12) return;

        do {
          gameOverlayCtx.font = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
          if (gameOverlayCtx.measureText(name).width <= maxLabelWidth || fontSize <= 9) break;
          fontSize -= 1;
        } while (fontSize > 9);

        if (fontSize < 9) return;
        const x = item.x / item.count;
        const y = item.y / item.count;
        gameOverlayCtx.lineJoin = "round";
        gameOverlayCtx.strokeStyle = "rgba(18, 18, 16, 0.62)";
        gameOverlayCtx.lineWidth = Math.max(2.5, fontSize * 0.18);
        gameOverlayCtx.strokeText(name, x, y);
        gameOverlayCtx.fillStyle = "rgba(244, 238, 218, 0.78)";
        gameOverlayCtx.fillText(name, x, y);
      });
    gameOverlayCtx.restore();
  }

  function renderGameMap() {
    if (!gameData) return;
    const { map, scenario, regionAtPixel, centers, waterRgb } = gameData;
    sanitizeRussianTerritory(scenario);
    const ownerByRegion = new Map();
    const countryById = new Map(scenario.countries.map((country) => [Number(country.id), country]));
    const countryRgbById = new Map(scenario.countries.map((country) => [Number(country.id), gameHexToRgb(country.color)]));
    const regionTypeById = gameData.regionTypeById;
    const regionRgbById = gameData.regionRgbById;
    scenario.countries.forEach((country) => {
      (country.regionIds || []).forEach((regionId) => ownerByRegion.set(Number(regionId), country));
    });
    gameData.ownerByRegion = ownerByRegion;
    const controllerByRegion = new Map(ownerByRegion);
    const occupationByRegion = new Map();
    (scenario.occupations || []).forEach((occupation) => {
      const owner = ownerByRegion.get(Number(occupation.regionId));
      if (RUSSIAN_TERRITORY_TRANSFER_LOCKED && isProtectedRussianRegion(occupation.regionId) && owner && Number(occupation.controllerCountryId) !== Number(owner.id)) return;
      const controller = countryById.get(Number(occupation.controllerCountryId));
      if (controller) {
        controllerByRegion.set(Number(occupation.regionId), controller);
        occupationByRegion.set(Number(occupation.regionId), { owner, controller });
      }
    });

    const image = gameMapCtx.createImageData(map.width, map.height);
    const countryStats = new Map();
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const regionId = regionAtPixel[index];
      const country = controllerByRegion.get(regionId);
      const x = index % map.width;
      const y = Math.floor(index / map.width);
      const occupation = occupationByRegion.get(regionId);
      const ownerColor = occupation?.owner ? countryRgbById.get(Number(occupation.owner.id)) : null;
      const controllerColor = occupation?.controller ? countryRgbById.get(Number(occupation.controller.id)) : null;
      let color = country
        ? countryRgbById.get(Number(country.id))
        : isAntarcticRegion(regionId)
          ? gameHexToRgb("#d7e6ee")
        : regionTypeById.get(regionId) === "sea"
          ? [waterRgb[index * 3], waterRgb[index * 3 + 1], waterRgb[index * 3 + 2]]
          : regionRgbById.get(regionId) || gameHexToRgb("#263238");
      if (occupation && ownerColor && controllerColor && Number(occupation.owner?.id) !== Number(occupation.controller?.id)) {
        color = blendRgb(ownerColor, controllerColor, 0.58);
        if (((x + y) % 11) < 4) color = blendRgb(color, [28, 24, 20], 0.28);
        if (((x - y + 4000) % 17) < 2) color = blendRgb(color, [255, 235, 170], 0.18);
      }
      if (country && relationMapMode) color = relationMapColor(country.id, color);
      if (country && index % 6 === 0) addCountryLabelSample(countryStats, country, x, y);
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
            const isSeaPair = regionTypeById.get(regionA) === "sea" && regionTypeById.get(regionB) === "sea";
            const isCountry = countryA !== countryB && (countryA !== null || countryB !== null);
            if (regionA !== regionB && !isSeaPair && isCountry === countryBorders) {
              gameOverlayCtx.moveTo(x + 1, y);
              gameOverlayCtx.lineTo(x + 1, y + 1);
            }
          }
          if (y < map.height - 1) {
            const regionB = regionAtPixel[index + map.width];
            const countryB = controllerByRegion.get(regionB)?.id ?? null;
            const isSeaPair = regionTypeById.get(regionA) === "sea" && regionTypeById.get(regionB) === "sea";
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

    gameOverlayCtx.strokeStyle = "rgba(18,24,25,.10)";
    gameOverlayCtx.lineWidth = 0.35;
    strokeBorders(false);
    gameOverlayCtx.strokeStyle = "rgba(245,238,211,.26)";
    gameOverlayCtx.lineWidth = 2.2;
    strokeBorders(true);
    gameOverlayCtx.strokeStyle = "rgba(8,10,11,.72)";
    gameOverlayCtx.lineWidth = 1.15;
    strokeBorders(true);

    drawCountryLabels(countryStats);

    scenario.countries.forEach((country) => {
      const center = centers.get(Number(country.capitalRegionId));
      if (center) drawGameCrown(center.x, center.y);
    });

    const runtimeArmies = strategyState ? allCountryStates().flatMap((runtime) => runtime.armies) : (scenario.armies || []);
    runtimeArmies.forEach((army) => {
      const drawRegionId = Number(army.movingTo || army.regionId);
      const center = centers.get(drawRegionId);
      if (!center) return;
      const hasCapital = scenario.countries.some(
        (country) => Number(country.capitalRegionId) === drawRegionId
      );
      const markerX = center.x + (hasCapital ? 8 : 0);
      const markerY = center.y + (hasCapital ? 5 : 0);
      if (soldierImage?.complete && soldierImage.naturalWidth) {
        gameOverlayCtx.imageSmoothingEnabled = userSettings.smoothing !== "off";
        gameOverlayCtx.drawImage(soldierImage, Math.round(markerX) - 8, Math.round(markerY) - 12, 16, 16);
      } else {
        drawFallbackSoldier(markerX, markerY);
      }
      gameOverlayCtx.fillStyle = "#fff";
      gameOverlayCtx.font = "bold 7px Georgia, \"Times New Roman\", serif";
      gameOverlayCtx.textAlign = "center";
      gameOverlayCtx.fillText(String(Math.max(1, Math.round((army.soldiers || army.strength || 1) / 1000))), markerX, markerY + 9);
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
    applySmoothing();
    gameZoomLabel.textContent = `${Math.round(gameZoom * 100)}%`;
  }

  function selectRegionFromMap(event) {
    if (!gameData || !strategyState) return;
    const hit = mapHitFromEvent(event);
    if (!hit) return;
    if (relationMapMode) {
      const country = controllerOfRegion(hit.regionId) || ownerOfRegion(hit.regionId);
      if (!country) return;
      relationMapCountryId = Number(country.id);
      relationPair = null;
      addLog(`Карта отношений: выбрана страна ${country.name}.`);
      renderGameMap();
      renderStrategyPanel();
      return;
    }
    strategyState.selectedRegionId = Number(hit.regionId);
    activeTab = "regions";
    renderStrategyPanel();
  }

  function mapHitFromEvent(event) {
    if (!gameData) return null;
    const rect = gameCanvasStack.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * gameData.map.width);
    const y = Math.floor((event.clientY - rect.top) / rect.height * gameData.map.height);
    if (x < 0 || y < 0 || x >= gameData.map.width || y >= gameData.map.height) return null;
    const regionId = gameData.regionAtPixel[y * gameData.map.width + x];
    if (!regionId) return null;
    return { x, y, regionId: Number(regionId) };
  }

  function inspectRelationPairFromMap(event) {
    if (!gameData || !strategyState || !relationMapMode) return;
    event.preventDefault();
    const hit = mapHitFromEvent(event);
    if (!hit) return;
    const target = controllerOfRegion(hit.regionId) || ownerOfRegion(hit.regionId);
    const source = countryById(relationMapCountryId || strategyState.playerCountryId);
    if (!source || !target || Number(source.id) === Number(target.id)) return;
    relationPair = { sourceId: Number(source.id), targetId: Number(target.id) };
    addLog(`Отношения: ${source.name} и ${target.name}: ${getRelation(source.id, target.id)}.`);
    renderStrategyPanel();
  }

  function buildRuntimeGameData(map, scenario, protectedRussianRegionIds = null) {
    ensureYearTreaties(scenario);
    const protectedRussianRegions = protectedRussianRegionIds
      ? new Set(protectedRussianRegionIds.map(Number))
      : initialRussianRegionIds(scenario);
    sanitizeRussianTerritory(scenario, protectedRussianRegions);
    const regionAtPixel = new Uint32Array(map.width * map.height);
    const regionById = new Map();
    const regionTypeById = new Map();
    const regionRgbById = new Map();
    map.regions.forEach((region) => {
      const id = Number(region.id);
      regionById.set(id, region);
      regionTypeById.set(id, region.type || "");
      regionRgbById.set(id, gameHexToRgb(region.color || "#263238"));
      (region.pixels || []).forEach((pixel) => {
        if (pixel.x >= 0 && pixel.y >= 0 && pixel.x < map.width && pixel.y < map.height) {
          regionAtPixel[pixel.y * map.width + pixel.x] = id;
        }
      });
    });
    const antarcticRegionIds = applyAntarcticTreaty(scenario, map, regionById);
    const regionAdjacency = new Map();
    const addAdjacency = (a, b) => {
      if (!a || !b || a === b) return;
      if (!regionAdjacency.has(a)) regionAdjacency.set(a, new Set());
      if (!regionAdjacency.has(b)) regionAdjacency.set(b, new Set());
      regionAdjacency.get(a).add(b);
      regionAdjacency.get(b).add(a);
    };
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const index = y * map.width + x;
        const regionId = regionAtPixel[index];
        if (x < map.width - 1) addAdjacency(regionId, regionAtPixel[index + 1]);
        if (y < map.height - 1) addAdjacency(regionId, regionAtPixel[index + map.width]);
      }
    }
    const waterRgb = new Uint8ClampedArray(map.width * map.height * 3);
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      if (regionTypeById.get(regionAtPixel[index]) !== "sea") continue;
      const x = index % map.width;
      const y = Math.floor(index / map.width);
      const color = gameWaterRgb(x, y, map.width, map.height);
      const offset = index * 3;
      waterRgb[offset] = color[0];
      waterRgb[offset + 1] = color[1];
      waterRgb[offset + 2] = color[2];
    }
    const allRegionIds = new Set(map.regions.map((region) => Number(region.id)));
    return {
      map,
      scenario,
      regionAtPixel,
      regionAdjacency,
      protectedRussianRegionIds: protectedRussianRegions,
      antarcticRegionIds,
      regionById,
      regionTypeById,
      regionRgbById,
      waterRgb,
      centers: gameRegionCenters(regionAtPixel, map.width, map.height, allRegionIds),
    };
  }

  function enterGame(map, scenario, playerCountry, restoredState = null, protectedRussianRegionIds = null) {
    gameData = buildRuntimeGameData(map, scenario, protectedRussianRegionIds);
    strategyState = restoredState ? restoreStrategyState(restoredState) : createInitialStrategyState(scenario, playerCountry);
    normalizeStrategyState(strategyState, scenario);
    enforceSpecialRelations(strategyState, scenario);
    activeTab = "focuses";
    expandedFocusId = null;
    relationMapMode = false;
    relationMapCountryId = Number(playerCountry.id);
    relationPair = null;
    updateRelationMapUi();
    setStrategyPanelFullscreen(false);
    gamePaused = false;
    gameSpeed = 1;
    pauseButton.textContent = t("pause");
    gameMapCanvas.width = map.width;
    gameMapCanvas.height = map.height;
    gameOverlayCanvas.width = map.width;
    gameOverlayCanvas.height = map.height;
    soldierImage = new Image();
    soldierImage.src = "assets/soldier.png";
    soldierImage.addEventListener("load", renderGameMap, { once: true });
    renderGameMap();
    setGameZoom(Math.min(1.5, 1100 / map.width, 720 / map.height));
    renderStrategyPanel();
    updateSettingsPlayerOptions();
    startRealtimeClock();
    gameLoading.hidden = true;
    gameCanvasStack.hidden = false;
  }

  async function startGame() {
    if (!selectedMap || !selectedScenario || !selectedCountry) return;
    showScreen(gameScreen);
    gameLoading.textContent = "Загрузка карты…";
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
      const playerCountry = scenario.countries.find((country) => Number(country.id) === Number(selectedCountry.id)) || scenario.countries[0];
      await loadCsvFocusTree(playerCountry.name, scenario.year || selectedScenario.year || PLAYABLE_SCENARIO_YEAR);
      enterGame(map, scenario, playerCountry);
      saveGame("new-game");
    } catch (error) {
      gameLoading.textContent = `Ошибка загрузки игры: ${error.message}`;
      console.error(error);
    }
  }

  async function continueGame() {
    const save = savedGame();
    if (!save?.mapPath || !save?.scenario || !save?.strategyState) {
      updateContinueButton();
      return;
    }
    showScreen(gameScreen);
    gameLoading.textContent = "Загрузка сохранения…";
    gameLoading.hidden = false;
    gameCanvasStack.hidden = true;
    try {
      const mapResponse = await fetch(`${save.mapPath}?v=${Date.now()}`, { cache: "no-store" });
      if (!mapResponse.ok) throw new Error("Не удалось загрузить карту сохранения");
      const map = await mapResponse.json();
      const scenario = save.scenario;
      selectedMap = maps.find((mapItem) => mapItem.file === save.mapFile) || { file: save.mapFile, path: save.mapPath, name: map.name };
      selectedScenario = scenarios.find((scenarioItem) => scenarioItem.file === save.scenarioFile) || {
        file: save.scenarioFile,
        path: save.scenarioPath,
        name: save.scenarioName || scenario.name || "Сохраненный сценарий",
        year: scenario.year,
      };
      selectedCountry = scenario.countries.find((country) => Number(country.id) === Number(save.selectedCountryId)) || scenario.countries[0];
      gameCountryName.textContent = selectedCountry?.name || "Страна";
      gameScenarioName.textContent = `${selectedScenario.name} · ${scenario.year || ""}`;
      await loadCsvFocusTree(selectedCountry.name, scenario.year || selectedScenario.year || PLAYABLE_SCENARIO_YEAR);
      enterGame(map, scenario, selectedCountry, save.strategyState, save.protectedRussianRegionIds);
      addLog("Партия загружена из автосохранения.");
      renderStrategyPanel();
    } catch (error) {
      gameLoading.textContent = `Ошибка загрузки сохранения: ${error.message}`;
      console.error(error);
    }
  }

  mapsList.addEventListener("click", (event) => {
    ensureAudio();
    playSound("click");
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
    ensureAudio();
    playSound("click");
    const card = event.target.closest(".scenario-card");
    if (!card) return;
    selectedScenario = scenarios.find((scenario) => scenario.file === card.dataset.file) || null;
    clearCountries();
    renderScenarios();
    updateSelection();
  });

  countriesList.addEventListener("click", (event) => {
    ensureAudio();
    playSound("click");
    const card = event.target.closest(".country-card");
    if (!card) return;
    selectedCountry = scenarioCountries.find((country) => String(country.id) === card.dataset.id) || null;
    renderCountries();
    updateSelection();
  });

  strategyTabs.addEventListener("click", (event) => {
    ensureAudio();
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    playSound("click");
    activeTab = activeTab === button.dataset.tab ? null : button.dataset.tab;
    if (activeTab !== "foreign" && relationMapMode) {
      exitRelationMapMode(false);
    }
    if (!activeTab) setStrategyPanelFullscreen(false);
    renderStrategyPanel();
  });

  strategyFullscreenButton.addEventListener("click", () => {
    ensureAudio();
    if (!activeTab) return;
    playSound("click");
    setStrategyPanelFullscreen(!strategyPanelFullscreen);
  });

  strategyContent.addEventListener("click", (event) => {
    ensureAudio();
    const closeDetails = event.target.closest("[data-close-focus-details]");
    if (closeDetails) {
      expandedFocusId = null;
      playSound("click");
      renderStrategyPanel();
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    playSound("click");
    const action = button.dataset.action;
    if (action === "focus") startFocus(button.dataset.id);
    if (action === "decision") applyDomesticDecision(button.dataset.id);
    if (action === "form-nation") formNation(button.dataset.id);
    if (action === "ideology") changeIdeology(document.getElementById("ideologySelect")?.value);
    if (action === "democracy-campaign") democracyCampaign();
    if (action === "democracy-reform") democracyReform();
    if (action === "democracy-election") democracyElection(true);
    if (action === "reform") enactReform(button.dataset.id);
    if (action === "law") enactLaw(button.dataset.id, document.getElementById(`law-${button.dataset.id}`)?.value);
    if (action === "advisor") hireAdvisor(button.dataset.id);
    if (action === "doctrine") chooseDoctrine(button.dataset.id);
    if (action === "improve") improveRelations(document.getElementById("foreignTarget")?.value);
    if (action === "relation-map") toggleRelationMapMode();
    if (action === "alliance") signAlliance(document.getElementById("foreignTarget")?.value);
    if (action === "trade") signTrade(document.getElementById("tradeTarget")?.value, document.getElementById("tradeCategory")?.value || "energy");
    if (action === "currency") changeCurrencyPolicy(document.getElementById("currencyPolicy")?.value);
    if (action === "sanction") imposeSanction(document.getElementById("sanctionTarget")?.value, document.getElementById("sanctionType")?.value);
    if (action === "lift-sanction") liftSanction(button.dataset.id);
    if (action === "seize-assets") seizeForeignAssets(document.getElementById("assetOwner")?.value);
    if (action === "war") declareWar(document.getElementById("warTarget")?.value);
    if (action === "occupy") occupyEnemyRegion(document.getElementById("warTarget")?.value);
    if (action === "open-peace") openPeaceConference();
    if (action === "add-peace-demand") addPlayerPeaceDemand(document.getElementById("peaceDemandType")?.value, document.getElementById("peaceTarget")?.value, selectedPeaceRegionIds());
    if (action === "finalize-peace") finalizePeaceConference();
    if (action === "nuclear-deterrence") nuclearDeterrence(document.getElementById("warTarget")?.value);
    if (action === "invite-war") inviteToWar(document.getElementById("inviteTarget")?.value, document.getElementById("inviteEnemy")?.value);
    if (action === "join-war") joinWarOnSide(document.getElementById("joinWarSide")?.value);
    if (action === "access") requestAccess(document.getElementById("treatyTarget")?.value);
    if (action === "visa") signVisaFree(document.getElementById("treatyTarget")?.value);
    if (action === "base") requestForeignBase(document.getElementById("treatyTarget")?.value);
    if (action === "operation") startOperation(document.getElementById("operationType")?.value, document.getElementById("operationTarget")?.value);
    if (action === "army-minister") appointArmyMinister(document.getElementById("armyMinister")?.value);
    if (action === "recruit") recruitArmy(document.getElementById("recruitRegion")?.value);
    if (action === "recruit-deploy") recruitAndDeployArmy(document.getElementById("deployRecruitRegion")?.value, document.getElementById("deployTargetCountry")?.value);
    if (action === "recruit-selected") recruitArmy(strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId);
    if (action === "move-army") moveArmy(button.dataset.id, document.getElementById(`move-${button.dataset.id}`)?.value);
    if (action === "integrate") integrateOccupation(button.dataset.id);
    if (action === "release-occupation") releaseSelectedOccupation(button.dataset.id);
    if (action === "create-region-country") createOccupationCountry([button.dataset.id], window.prompt("Название новой страны", gameData.regionById.get(Number(button.dataset.id))?.name || "Новое государство") || "");
    if (action === "create-occupation-country") createOccupationCountry(selectedPeaceRegionIds(), document.getElementById("releasedCountryName")?.value || "");
    if (action === "construction") startConstruction(document.getElementById("constructionProject")?.value, button.dataset.id);
    if (action === "region-minister") appointRegionMinister(button.dataset.id, document.getElementById("regionMinister")?.value);
    if (action === "select-region") {
      strategyState.selectedRegionId = Number(document.getElementById("regionPicker")?.value || currentPlayerCountry()?.capitalRegionId);
      renderStrategyPanel();
    }
    if (action === "prod-minus") setProductionLine(button.dataset.id, -1);
    if (action === "prod-plus") setProductionLine(button.dataset.id, 1);
    if (action === "research") startResearch(button.dataset.id);
    if (action === "nuclear-program") enableNuclearProgram();
    if (action === "nuclear-reactor") buildNuclearReactor();
    if (action === "nuclear-warhead") buildNuclearWarhead();
  });

  strategyContent.addEventListener("dblclick", (event) => {
    ensureAudio();
    if (event.target.closest("button")) return;
    const card = event.target.closest(".focus-card[data-focus-id]");
    if (!card) return;
    expandedFocusId = expandedFocusId === card.dataset.focusId ? null : card.dataset.focusId;
    playSound("click");
    renderStrategyPanel();
  });

  playButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    showScreen(setupScreen);
  });
  continueButton?.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    continueGame();
  });
  backButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    showScreen(mainScreen);
  });
  leaveGameButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    stopRealtimeClock();
    saveGame("leave-menu");
    strategyState = null;
    gameData = null;
    relationMapMode = false;
    relationMapCountryId = null;
    relationPair = null;
    updateRelationMapUi();
    updateSettingsPlayerOptions();
    showScreen(mainScreen);
    updateContinueButton();
  });
  gameZoomOut.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    setGameZoom(gameZoom - 0.25);
  });
  gameZoomIn.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    setGameZoom(gameZoom + 0.25);
  });
  gameCanvasStack.addEventListener("click", selectRegionFromMap);
  gameCanvasStack.addEventListener("contextmenu", inspectRelationPairFromMap);
  document.addEventListener("click", (event) => {
    if (!relationMapMode) return;
    const button = event.target.closest("button");
    if (!button || button.id === "relationMapBackButton" || button.dataset.action === "relation-map") return;
    exitRelationMapMode(false);
  });
  pauseButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    togglePause();
  });
  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => {
      ensureAudio();
      playSound("click");
      setGameSpeed(button.dataset.speed);
    });
  });
  nextTurnButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    advanceDay();
  });
  startGameButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    startGame();
  });
  settingsButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    openSettings();
  });
  settingsClose.addEventListener("click", closeSettings);
  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) closeSettings();
  });
  settingsLanguage.addEventListener("change", () => {
    userSettings.language = settingsLanguage.value;
    saveUserSettings();
    applyLanguage();
    updateSettingsPlayerOptions();
  });
  settingsSmoothing.addEventListener("change", () => {
    userSettings.smoothing = settingsSmoothing.value;
    saveUserSettings();
    applySmoothing();
  });
  settingsFullscreen.addEventListener("click", toggleFullscreen);
  settingsApplyPlayer.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    switchPlayerCountry();
  });

  applyUserSettings();
  renderMaps();
  renderScenarios();
  renderCountries();
  updateSelection();
  updateContinueButton();
  loadCatalogs();
  window.setInterval(loadCatalogs, CATALOG_REFRESH_MS);
})();
