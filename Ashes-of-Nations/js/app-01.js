(function () {
  "use strict";

  const mainScreen = document.getElementById("mainScreen");
  const setupScreen = document.getElementById("setupScreen");
  const gameScreen = document.getElementById("gameScreen");
  const peaceScreen = document.getElementById("peaceScreen");
  const peaceContent = document.getElementById("peaceContent");
  const peace3dCanvas = document.getElementById("peace3dCanvas");
  const peaceBackButton = document.getElementById("peaceBackButton");
  const playButton = document.getElementById("playButton");
  const howToPlayButton = document.getElementById("howToPlayButton");
  const continueButton = document.getElementById("continueButton");
  const savesButton = document.getElementById("savesButton");
  const saveSlotButton = document.getElementById("saveSlotButton");
  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("settingsModal");
  const settingsClose = document.getElementById("settingsClose");
  const settingsLanguage = document.getElementById("settingsLanguage");
  const settingsSmoothing = document.getElementById("settingsSmoothing");
  const settingsPoliticalMap = document.getElementById("settingsPoliticalMap");
  const settingsPlayer = document.getElementById("settingsPlayer");
  const settingsFullscreen = document.getElementById("settingsFullscreen");
  const settingsApplyPlayer = document.getElementById("settingsApplyPlayer");
  const saveModal = document.getElementById("saveModal");
  const saveModalClose = document.getElementById("saveModalClose");
  const saveModalTitle = document.getElementById("saveModalTitle");
  const saveModalKicker = document.getElementById("saveModalKicker");
  const saveSlotEditor = document.getElementById("saveSlotEditor");
  const saveSlotName = document.getElementById("saveSlotName");
  const saveSlotConfirm = document.getElementById("saveSlotConfirm");
  const saveSlotsList = document.getElementById("saveSlotsList");
  const saveModalHint = document.getElementById("saveModalHint");
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
  const stateSummary = document.getElementById("stateSummary");
  const selectedRegionSummary = document.getElementById("selectedRegionSummary");
  const strategyTabs = document.getElementById("strategyTabs");
  const strategyContent = document.getElementById("strategyContent");
  const strategyFullscreenButton = document.getElementById("strategyFullscreenButton");
  const gameGuideButton = document.getElementById("gameGuideButton");
  const nextTurnButton = document.getElementById("nextTurnButton");
  const turnStatus = document.getElementById("turnStatus");
  const tutorialModal = document.getElementById("tutorialModal");
  const tutorialClose = document.getElementById("tutorialClose");
  const tutorialKicker = document.getElementById("tutorialKicker");
  const tutorialTitle = document.getElementById("tutorialTitle");
  const tutorialProgress = document.getElementById("tutorialProgress");
  const tutorialContent = document.getElementById("tutorialContent");
  const tutorialBack = document.getElementById("tutorialBack");
  const tutorialAction = document.getElementById("tutorialAction");
  const tutorialNext = document.getElementById("tutorialNext");
  let relationMapBackButton = null;
  let saveDialogMode = "load";

  const MIN_SCENARIO_YEAR = 1500;
  // Default only; the catalog accepts every scenario from 1500 onward.
  const PLAYABLE_SCENARIO_YEAR = 2026;
  const RUSSIAN_TERRITORY_TRANSFER_LOCKED = true;
  const SAVE_STORAGE_KEY = "ashes-of-nations.autosave.v1";
  const SAVE_SLOTS_STORAGE_KEY = "ashes-of-nations.save-slots.v1";
  const SETTINGS_STORAGE_KEY = "ashes-of-nations.settings.v1";
  const FOCUS_CSV_DIR = "focuses";
  const CATALOG_REFRESH_MS = 30000;
  // Change this number whenever bundled UI/assets change to invalidate browser caches.
  const CACHE_VERSION = "20260828-120627";
  const NUCLEAR_CAPABLE_COUNTRIES = new Set(["Россия", "США", "Китай", "Китайская Народная Республика", "Франция", "Великобритания", "Индия", "Пакистан", "КНДР", "Израиль"]);

  let peace3dRenderer = null;
  let peaceVersaillesMesh = null;
  let peaceVersaillesMeshPromise = null;
  let peaceCameraYaw = 0;
  let peaceCameraPitch = 0;
  let peaceCameraDragging = false;
  let peaceCameraPointer = { x: 0, y: 0 };
  const MAP_MODES = [
    { id: "political", label: "Политическая", text: "Страны, оккупации, столицы и армии." },
    { id: "war", label: "Война", text: "Враги, союзный доступ, фронты и маршруты армий." },
    { id: "supply", label: "Снабжение", text: "Общая логистика стран и риск потерь от дефицита." },
    { id: "stability", label: "Стабильность", text: "Внутреннее состояние стран: от кризиса к устойчивости." },
    { id: "economy", label: "Экономика", text: "Сравнительная мощность ВВП стран." },
    { id: "terrain", label: "Рельеф", text: "Горы, равнины, побережья и труднопроходимые районы." },
    { id: "water", label: "Воды и острова", text: "Моря, проливы, острова, полуострова и архипелаги." },
    { id: "strategic", label: "Стратегическая", text: "Что помогает обороне, снабжению, флоту или мешает наступлению." },
    { id: "logistics", label: "Логистика", text: "Базы, столицы, коридоры и районы снабжения." },
    { id: "relations", label: "Отношения", text: "Дипломатическая карта относительно выбранной страны." },
  ];
  // Geographic coordinates keep capital markers exact even when an administrative
  // region is broad or does not contain a separate city polygon.
  const CAPITAL_COORDINATES = {
    "Албания": [41.3275, 19.8187], "Алжир": [36.7538, 3.0588], "Андорра": [42.5063, 1.5218], "Армения": [40.1792, 44.4991],
    "Австрия": [48.2082, 16.3738], "Азербайджан": [40.4093, 49.8671], "Белоруссия": [53.9006, 27.5590], "Бельгия": [50.8503, 4.3517],
    "Босния и Герцеговина": [43.8563, 18.4131], "Болгария": [42.6977, 23.3219], "Хорватия": [45.8150, 15.9819], "Кипр": [35.1856, 33.3823],
    "Чехия": [50.0755, 14.4378], "Дания": [55.6761, 12.5683], "Эстония": [59.4370, 24.7536], "Финляндия": [60.1699, 24.9384],
    "Франция": [48.8566, 2.3522], "Грузия": [41.7151, 44.8271], "Германия": [52.5200, 13.4050], "Греция": [37.9838, 23.7275],
    "Гернси": [49.4554, -2.5369], "Венгрия": [47.4979, 19.0402], "Исландия": [64.1466, -21.9426], "Иран": [35.6892, 51.3890],
    "Ирак": [33.3152, 44.3661], "Ирландия": [53.3498, -6.2603], "остров Мэн": [54.1500, -4.4800], "Италия": [41.9028, 12.4964],
    "Джерси": [49.1868, -2.1066], "Казахстан": [51.1694, 71.4491], "Латвия": [56.9496, 24.1052], "Лихтенштейн": [47.1410, 9.5215],
    "Литва": [54.6872, 25.2797], "Люксембург": [49.6116, 6.1319], "Северная Македония": [41.9981, 21.4254], "Мальта": [35.8989, 14.5146],
    "Молдавия": [47.0105, 28.8638], "Черногория": [42.4304, 19.2594], "Марокко": [34.0209, -6.8416], "Нидерланды": [52.3676, 4.9041],
    "Норвегия": [59.9139, 10.7522], "Польша": [52.2297, 21.0122], "Португалия": [38.7223, -9.1393], "Сербия": [44.7866, 20.4489],
    "Румыния": [44.4268, 26.1025], "Россия": [55.7558, 37.6173], "Сан-Марино": [43.9424, 12.4578], "Словакия": [48.1486, 17.1077],
    "Словения": [46.0569, 14.5058], "Испания": [40.4168, -3.7038], "Швеция": [59.3293, 18.0686], "Швейцария": [46.9480, 7.4474],
    "Сирия": [33.5138, 36.2765], "Тунис": [36.8065, 10.1815], "Турция": [39.9334, 32.8597], "Туркмения": [37.9601, 58.3261],
    "Украина": [50.4501, 30.5234], "Великобритания": [51.5072, -0.1276], "Узбекистан": [41.2995, 69.2401], "Пакистан": [33.6844, 73.0479],
  };

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

  const WAR_GOALS = [
    { id: "border", name: "Пограничное урегулирование", text: "Занять ограниченную территорию и вынудить противника к уступкам.", occupationNeed: 1, scoreNeed: 35 },
    { id: "regime", name: "Смена курса", text: "Добиться политической уступки, контролируя столицу и ключевые регионы.", occupationNeed: 3, scoreNeed: 55 },
    { id: "conquest", name: "Территориальное завоевание", text: "Долгая кампания ради капитуляции и крупных территориальных требований.", occupationNeed: 6, scoreNeed: 75 },
    { id: "blockade", name: "Принуждение блокадой", text: "Подорвать внешнюю торговлю и военную экономику противника без большой наземной кампании.", occupationNeed: 0, scoreNeed: 50 },
  ];

  const AI_AGENDAS = [
    { id: "security", name: "Безопасность границ", text: "Укрепляет соседские связи, оборону и избегает лишних войн." },
    { id: "trade", name: "Торговая экспансия", text: "Ищет рынки, порты и выгодные дипломатические связи." },
    { id: "regional", name: "Региональное лидерство", text: "Стремится собирать союзников и влиять на ближайших соседей." },
    { id: "revisionist", name: "Ревизионизм", text: "Ищет слабых соперников и меняет баланс сил войной." },
    { id: "maritime", name: "Морская держава", text: "Вкладывается во флот, защищает торговлю и давит блокадами." },
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
    { id: "none", name: "Нейтральная администрация", budgetShare: 0, effects: {} },
    { id: "industrialist", name: "Промышленное развитие", budgetShare: 0.18, effects: { economy: 0.08, steel: 0.08 } },
    { id: "energy", name: "Энергетический курс", budgetShare: 0.16, effects: { oil: 0.14, economy: 0.03 } },
    { id: "agronomist", name: "Аграрный курс", budgetShare: 0.12, effects: { food: 0.16, population: 0.01 } },
    { id: "governor", name: "Региональное развитие", budgetShare: 0.14, effects: { gdp: 0.06, stability: 0.02 } },
  ];

  const GOVERNOR_EDUCATIONS = [
    { id: "public_admin", name: "Государственное и муниципальное управление", effects: { stability: 0.12, economy: 0.03 } },
    { id: "economics", name: "Экономика и финансы", effects: { gdp: 0.08, economy: 0.06 } },
    { id: "law", name: "Юриспруденция", effects: { stability: 0.16 } },
    { id: "engineering", name: "Инженерное образование", effects: { economy: 0.08, steel: 0.06 } },
    { id: "agriculture", name: "Аграрное образование", effects: { food: 0.12, population: 0.006 } },
    { id: "military", name: "Военное образование", effects: { readiness: 0.3, supply: 0.04 } },
  ];

  const CHARACTER_TEMPLATES = [
    { id: "security-director", name: "Виктор Соколов", role: "Спецслужбы", trait: "Контрсопротивление", effects: { resistanceSuppression: 2.5, stability: 1 }, cost: 30 },
    { id: "industrial-minister", name: "Николай Орлов", role: "Министр", trait: "Оборонные заказы", effects: { factoryOutput: 0.03, budget: 12 }, cost: 45 },
    { id: "foreign-envoy", name: "Елена Мирская", role: "Дипломат", trait: "Коалиционная работа", effects: { orgInfluence: 10, relations: 6 }, cost: 35 },
  ];

  const REAL_GENERAL_ROSTERS = {
    "Россия": [{ from: 2020, name: "Валерий Герасимов", trait: "Генеральный штаб", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1991, name: "Павел Грачёв", trait: "Реформа вооружённых сил", effects: { armyReadiness: 1, supplyBoost: 300 } }, { from: 1941, name: "Георгий Жуков", trait: "Оперативное наступление", effects: { commandPowerDaily: 0.6, armyReadiness: 3 } }, { from: 1900, name: "Алексей Куропаткин", trait: "Штабное управление", effects: { commandPowerDaily: 0.3, armyReadiness: 1 } }],
    "Украина": [{ from: 2020, name: "Александр Сырский", trait: "Оборона и манёвр", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1991, name: "Виталий Радецкий", trait: "Создание армии", effects: { armyReadiness: 1, supplyBoost: 250 } }, { from: 1917, name: "Симон Петлюра", trait: "Военное строительство", effects: { commandPowerDaily: 0.35, armyReadiness: 1 } }],
    "США": [{ from: 2020, name: "Дэн Кейн", trait: "Объединённое командование", effects: { commandPowerDaily: 0.5, armyReadiness: 2 } }, { from: 1945, name: "Омар Брэдли", trait: "Коалиционное командование", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1914, name: "Джон Першинг", trait: "Экспедиционные силы", effects: { commandPowerDaily: 0.4, armyReadiness: 1 } }],
    "Великобритания": [{ from: 2020, name: "Ричард Найтон", trait: "Объединённая оборона", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1940, name: "Бернард Монтгомери", trait: "Планомерное наступление", effects: { commandPowerDaily: 0.5, armyReadiness: 2 } }, { from: 1900, name: "Дуглас Хейг", trait: "Штабная координация", effects: { commandPowerDaily: 0.3, armyReadiness: 1 } }],
    "Франция": [{ from: 2020, name: "Фабьен Мандон", trait: "Стратегическое командование", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1940, name: "Шарль де Голль", trait: "Маневренные силы", effects: { commandPowerDaily: 0.55, armyReadiness: 2 } }, { from: 1900, name: "Жозеф Жоффр", trait: "Главное командование", effects: { commandPowerDaily: 0.35, armyReadiness: 1 } }],
    "Германия": [{ from: 2020, name: "Карстен Бройер", trait: "Территориальная оборона", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1940, name: "Гейнц Гудериан", trait: "Бронетанковый манёвр", effects: { commandPowerDaily: 0.55, armyReadiness: 2 } }, { from: 1900, name: "Пауль фон Гинденбург", trait: "Верховное командование", effects: { commandPowerDaily: 0.4, armyReadiness: 1 } }],
    "Польша": [{ from: 2020, name: "Веслав Кукула", trait: "Сухопутная оборона", effects: { commandPowerDaily: 0.4, armyReadiness: 2 } }, { from: 1940, name: "Владислав Андерс", trait: "Полевое командование", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1900, name: "Юзеф Пилсудский", trait: "Военное строительство", effects: { commandPowerDaily: 0.4, armyReadiness: 1 } }],
    "Китайская Народная Республика": [{ from: 2020, name: "Чжан Юся", trait: "Центральная военная комиссия", effects: { commandPowerDaily: 0.5, armyReadiness: 2 } }, { from: 1949, name: "Пэн Дэхуай", trait: "Массовая армия", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }],
    "Турция": [{ from: 2020, name: "Метин Гюрак", trait: "Объединённый штаб", effects: { commandPowerDaily: 0.45, armyReadiness: 2 } }, { from: 1919, name: "Мустафа Кемаль", trait: "Оборона и наступление", effects: { commandPowerDaily: 0.55, armyReadiness: 2 } }],
  };

  const ORGANIZATION_ACTIONS = [
    { id: "lobby", name: "Лоббировать", cost: 18, text: "Повышает влияние в организации и улучшает отношения с участниками.", effects: { influence: 12, relation: 3 } },
    { id: "resolution", name: "Резолюция", cost: 35, text: "Запускает голосование и дает политический эффект при поддержке большинства.", effects: { influence: 6, politicalPower: 18 } },
    { id: "aid", name: "Пакет помощи", cost: 28, text: "Тратит бюджет на укрепление союзников и репутации.", effects: { influence: 9, relation: 5, budget: -18 } },
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
        ideologyAny: ["socialist", "communist"],
        reforms: ["central-planning", "union-treaty", "security-council"],
        laws: { economy: ["war", "total"], conscription: ["extensive", "service"] },
        controlCountries: ["Белоруссия", "Украина", "Молдавия", "Эстония", "Латвия", "Литва", "Казахстан", "Киргизия", "Таджикистан", "Туркмения", "Узбекистан", "Армения", "Азербайджан", "Грузия"],
      },
      color: "#b71924",
      description: "Восстановить союзное государство после завершения политической ветки фокусов.",
      reward: { politicalPower: 120, stability: 8, factories: 8, manpower: 300, steel: 40, oil: 25 },
    },
    russian_empire: {
      name: "Российская империя",
      requiredCountry: "Россия",
      requirements: {
        focusAny: ["ru-continuity-second-empire", "ru-patriotic-second-empire"],
        ideology: "monarchist",
        reforms: ["security-council"],
        laws: { economy: ["war", "total"], conscription: ["extensive", "service"] },
        controlCountries: ["Эстония", "Латвия", "Литва", "Финляндия", "Польша", "Белоруссия", "Украина", "Молдавия", "Казахстан", "Киргизия", "Таджикистан", "Туркмения", "Узбекистан", "Армения", "Азербайджан", "Грузия"],
      },
      color: "#6f4b2a",
      description: "Вернуть границы к историческому контуру 1914 года и провозгласить Российскую империю.",
      reward: { politicalPower: 80, stability: 6, commandPower: 25, factories: 3 },
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
    lithuanian_grand_duchy: {
      name: "Великое княжество Литовское",
      requiredCountry: "Литва",
      requiredFocus: "lt-grand-duchy-restoration",
      requirements: { controlCountries: ["Белоруссия", "Украина"] },
      color: "#8c1d2c",
      description: "Восстановить литовско-рутенский государственный проект после установления контроля над его ключевыми историческими землями.",
      reward: { politicalPower: 100, stability: 7, factories: 4, manpower: 180 },
    },
    new_livonia: {
      name: "Новая Ливония",
      requiredCountries: ["Литва", "Латвия", "Эстония"],
      requirements: {
        focusAny: ["lt-new-livonia-project", "lv-new-livonia-project", "ee-new-livonia-project"],
        focusAnyLabel: "Завершить национальный проект «Новая Ливония»",
        controlCountries: ["Литва", "Латвия", "Эстония"],
      },
      color: "#4b6a91",
      description: "Сформировать балтийское государство после объединения Литвы, Латвии и Эстонии.",
      reward: { politicalPower: 85, stability: 6, factories: 3, gdp: 30 },
    },
    yugoslavia: { name: "Югославия", requiredCountry: "Сербия", requiredFocus: "sr-yugoslavia-historical", requirements: { controlCountries: ["Черногория", "Босния и Герцеговина", "Хорватия", "Словения", "Северная Македония"] }, color: "#315b9a", description: "Воссоздать исторический югославский проект.", reward: { politicalPower: 100, stability: 8, factories: 5, manpower: 240 } },
    yugoslavia_bulgaria: { name: "Югославия", requiredCountry: "Сербия", requiredFocus: "sr-yugoslavia-bulgaria", requirements: { controlCountries: ["Черногория", "Босния и Герцеговина", "Хорватия", "Словения", "Северная Македония", "Болгария"] }, color: "#3f4f9c", description: "Создать расширенную Югославию с Болгарией.", reward: { politicalPower: 115, stability: 8, factories: 6, manpower: 290 } },
    balkan_union: { name: "Балканский Союз", requiredCountry: "Сербия", requiredFocus: "sr-balkan-union", requirements: { formedNationAny: ["yugoslavia", "yugoslavia_bulgaria"], controlCountries: ["Румыния", "Греция", "Венгрия"] }, color: "#6a3b78", description: "Объединить балканское пространство после создания Югославии.", reward: { politicalPower: 140, stability: 10, factories: 8, manpower: 360 } },
    great_greece: { name: "Великая Греция", requiredCountry: "Греция", requiredFocus: "gr-great-greece", requirements: { controlCountries: ["Кипр", "Албания", "Северная Македония"] }, color: "#315d9b", description: "Объединить ключевые греческие и балканские земли в национальном проекте Великой Греции.", reward: { politicalPower: 105, stability: 8, factories: 5, manpower: 230 } },
    byzantine_empire: { name: "Византийская империя", requiredCountry: "Греция", requiredFocus: "gr-byzantine-restoration", requirements: { controlRegions: [2231], controlCountries: ["Турция", "Болгария", "Албания", "Северная Македония", "Сербия", "Черногория", "Босния и Герцеговина", "Хорватия", "Словения", "Румыния", "Италия", "Кипр", "Сирия", "Ливан", "Израиль", "Палестина", "Иордания", "Египет", "Ливия", "Тунис", "Алжир", "Испания"] }, color: "#6d3f8d", description: "Возродить Византию в её максимальном историческом территориальном контуре после возвращения Константинополя.", reward: { politicalPower: 135, stability: 10, factories: 6, manpower: 280, capitalRegion: 2231 } },
    greek_balkan_union: { name: "Балканский Союз", requiredCountry: "Греция", requiredFocus: "gr-balkan-union", requirements: { formedNationAny: ["great_greece"], controlCountries: ["Сербия", "Болгария", "Румыния"] }, color: "#487a69", description: "Создать Балканский Союз после объединения Великой Греции.", reward: { politicalPower: 145, stability: 10, factories: 8, manpower: 360 } },
    roman_empire: { name: "Римская империя", requiredCountry: "Италия", requiredFocus: "it-roman-restoration", requirements: { controlCountries: ["Франция", "Испания", "Португалия", "Великобритания", "Греция", "Турция", "Албания", "Сербия", "Черногория", "Босния и Герцеговина", "Хорватия", "Словения", "Болгария", "Румыния", "Кипр", "Сирия", "Ливан", "Израиль", "Палестина", "Иордания", "Египет", "Ливия", "Тунис", "Алжир"] }, color: "#8b2323", description: "Восстановить Римскую империю после возвращения её ключевых исторических земель.", reward: { politicalPower: 160, stability: 12, factories: 10, manpower: 450 } },
    benelux: { name: "Бенилюкс", requiredCountries: ["Бельгия", "Нидерланды", "Люксембург"], requirements: { focusAny: ["be-benelux-unification", "nl-benelux-unification", "lu-benelux-unification"], focusAnyLabel: "Завершить фокус «Военный Бенилюкс»", controlCountries: ["Бельгия", "Нидерланды", "Люксембург"] }, color: "#d58b35", description: "Объединить Бельгию, Нидерланды и Люксембург после военного завоевания их территорий.", reward: { politicalPower: 100, stability: 6, factories: 4, gdp: 45, manpower: 150 } },
    swedish_empire: { name: "Шведская империя", requiredCountry: "Швеция", requiredFocus: "se-swedish-empire", requirements: { controlCountries: ["Финляндия", "Литва", "Латвия", "Эстония"] }, color: "#4568a1", description: "Восстановить Шведскую империю после военного завоевания Финляндии и Прибалтики.", reward: { politicalPower: 125, stability: 8, factories: 5, manpower: 260 } },
    intermarium: { name: "Междуморье", requiredCountry: "Польша", requiredFocus: "pl-form-intermarium", requirements: { controlCountries: ["Литва", "Латвия", "Эстония", "Чехия", "Словакия", "Венгрия", "Румыния", "Болгария", "Украина"] }, color: "#2d5b8f", description: "Центральноевропейский проект от Балтики до Чёрного моря. Россия и её территории не входят в требования.", reward: { politicalPower: 100, stability: 10, factories: 5, manpower: 260 } },
    polish_grand_duchy: { name: "Великое княжество Литовское", requiredCountry: "Польша", requiredFocus: "pl-duchy", requirements: { controlCountries: ["Литва", "Белоруссия", "Украина", "Словакия"] }, color: "#8c1d2c", description: "Польско-литовско-рутенский проект без требований к России/РФ.", reward: { politicalPower: 90, stability: 7, factories: 4, manpower: 180 } },
    new_commonwealth: { name: "Речь Посполитая", requiredCountry: "Польша", requiredFocus: "pl-commonwealth", requirements: { formedNationAny: ["polish_grand_duchy"], controlCountries: ["Литва", "Белоруссия", "Украина", "Латвия", "Словакия"] }, color: "#b51f2f", description: "Новая федеративная Речь Посполитая. Россия и её территории не входят в требования.", reward: { politicalPower: 120, stability: 12, factories: 6, manpower: 300 } },
    baltic_league_poland: { name: "Балтийская лига", requiredCountry: "Польша", requiredFocus: "pl-form-baltic", requirements: { controlCountries: ["Литва", "Латвия", "Эстония", "Финляндия"] }, color: "#276b74", description: "Балтийский государственный проект без требований к России/РФ.", reward: { politicalPower: 90, stability: 8, factories: 4, gdp: 40 } },
    east_asian_commonwealth: { name: "Восточноазиатское содружество", requiredCountry: "Китайская Народная Республика", requiredFocus: "cn-form-commonwealth", requirements: { controlCountries: ["Монголия", "КНДР", "Япония", "Республика Корея"] }, color: "#a52f2f", description: "Китайский восточноазиатский проект: Монголия и КНДР входят добровольно через союз, Япония и Республика Корея — после войны и мирного оформления.", reward: { politicalPower: 140, stability: 10, factories: 10, gdp: 100, manpower: 420 } },
    great_east_asian_federation: { name: "Великая Восточноазиатская федерация", requiredCountry: "Китайская Народная Республика", requiredFocus: "cn-form-great-federation", requirements: { focusAny: ["cn-unify-by-war"], focusAnyLabel: "Завершить военное объединение Тайваня", formedNationAny: ["east_asian_commonwealth"], controlCountries: ["Монголия", "КНДР", "Япония", "Республика Корея"] }, color: "#7e202c", description: "Позднее китайское формирование после Восточноазиатского содружества и военного объединения Тайваня.", reward: { politicalPower: 190, stability: 12, factories: 14, gdp: 140, manpower: 520, rare: 50 } },
    german_commonwealth: { name: "Германское содружество", requiredCountry: "Германия", requiredFocus: "de-form-german-commonwealth", requirements: { controlCountries: ["Австрия", "Лихтенштейн", "Швейцария"] }, color: "#294f8f", description: "Добровольное федеративное объединение Германии, Австрии, Лихтенштейна и Швейцарии.", reward: { politicalPower: 120, stability: 12, factories: 7, gdp: 80, manpower: 300 } },
    german_empire_1914: { name: "Германская империя", requiredCountry: "Германия", requiredFocus: "de-form-german-empire", requirements: { controlRegions: [245, 748, 749, 206, 269, 309, 324, 326, 405, 816, 818, 1319, 3835, 3836] }, color: "#252525", description: "Восстановление германских границ до Первой мировой войны: Эльзас–Лотарингия, Эйпен–Мальмеди, Северный Шлезвиг и прусские земли в Польше. Калининград не требуется.", reward: { politicalPower: 150, stability: 8, factories: 9, gdp: 95, manpower: 420, commandPower: 60 } },
    austrian_european_confederation: { name: "Европейская конфедерация", requiredCountry: "Австрия", requiredFocus: "at-form-eu", requirements: { controlCountries: ["Германия", "Франция", "Италия", "Бельгия", "Нидерланды", "Люксембург"] }, color: "#2a5da8", description: "Австрийский европейский проект после объединения ключевых западноевропейских стран. Россия и её территории не входят в требования.", reward: { politicalPower: 100, stability: 10, factories: 6, manpower: 250 } },
    alpine_league: { name: "Альпийская лига", requiredCountry: "Австрия", requiredFocus: "at-alpine-league", requirements: { controlCountries: ["Швейцария", "Лихтенштейн", "Словения"] }, color: "#3d7a62", description: "Лига альпийских государств, создаваемая через добровольную унию либо контроль её участников.", reward: { politicalPower: 90, stability: 12, factories: 3, gdp: 35 } },
    danube_federation: { name: "Дунайская федерация", requiredCountry: "Австрия", requiredFocus: "at-form-danube", requirements: { controlCountries: ["Чехия", "Словакия", "Венгрия", "Словения", "Хорватия", "Румыния"] }, color: "#4767a5", description: "Федеральный центральноевропейский проект на Дунае. Россия и её территории не входят в требования.", reward: { politicalPower: 115, stability: 10, factories: 6, manpower: 300 } },
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
    { id: "railway", name: "Железная дорога", cost: { budget: 22, steel: 12 }, days: 55, effects: { building: "railway", supplyCapacity: 450, economy: 3, gdp: 4 } },
    { id: "port", name: "Порт", cost: { budget: 34, steel: 10, oil: 2 }, days: 70, effects: { building: "port", navalAccess: 1, supplyCapacity: 600, economy: 4, gdp: 5 } },
    { id: "airfield", name: "Аэродром", cost: { budget: 30, steel: 8, rare: 2 }, days: 65, effects: { building: "airfield", airCapacity: 1, commandPower: 6 } },
    { id: "shipyard", name: "Верфь", cost: { budget: 42, steel: 14 }, days: 90, effects: { building: "shipyard", navalCapacity: 1, factories: 1, economy: 3 } },
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
        const design = state.equipmentDesigns?.tank || DEFAULT_EQUIPMENT_DESIGNS.tank;
        state.warSupport = clamp(state.warSupport + Math.max(1, Math.round(2 * designPower(design))), 0, 100);
        state.commandPower = clamp(state.commandPower + Math.max(4, Math.round(7 * designPower(design))), 0, 100);
      },
    },
    {
      id: "air",
      name: "Авиация",
      text: "Повышает оперативный потенциал и расход редких ресурсов.",
      cost: { steel: 4, rare: 4, oil: 2 },
      days: 36,
      apply(state) {
        const design = state.equipmentDesigns?.aircraft || DEFAULT_EQUIPMENT_DESIGNS.aircraft;
        state.commandPower = clamp(state.commandPower + Math.max(3, Math.round(6 * designPower(design))), 0, 100);
      },
    },
    {
      id: "navy",
      name: "Корабли",
      text: "Флот для морского контроля, десантов и защиты перевозок.",
      cost: { steel: 8, oil: 5, rare: 2 },
      days: 58,
      apply(state) {
        const design = state.equipmentDesigns?.ship || DEFAULT_EQUIPMENT_DESIGNS.ship;
        state.navyPower = (state.navyPower || 0) + Math.max(1, Math.round(6 * designPower(design)));
        state.commandPower = clamp(state.commandPower + 5, 0, 100);
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

  const EQUIPMENT_DESIGN_OPTIONS = {
    tank: {
      label: "Танк",
      fields: {
        chassis: [
          { id: "light", name: "Легкое шасси", attack: 1, speed: 3, armor: 0, cost: 0 },
          { id: "medium", name: "Среднее шасси", attack: 2, speed: 1, armor: 2, cost: 8 },
          { id: "heavy", name: "Тяжелое шасси", attack: 3, speed: -1, armor: 4, cost: 16 },
        ],
        gun: [
          { id: "short", name: "Короткая пушка", attack: 1, cost: 0 },
          { id: "long", name: "Длинноствольная пушка", attack: 3, cost: 10 },
          { id: "atgm", name: "ПТРК", attack: 4, rare: 2, cost: 16 },
        ],
        engine: [
          { id: "diesel", name: "Дизель", speed: 1, cost: 0 },
          { id: "turbine", name: "Газотурбина", speed: 3, oil: 2, cost: 12 },
          { id: "hybrid", name: "Гибрид", speed: 2, reliability: 2, rare: 2, cost: 16 },
        ],
      },
    },
    aircraft: {
      label: "Самолет",
      fields: {
        frame: [
          { id: "fighter", name: "Истребитель", air: 3, cost: 0 },
          { id: "strike", name: "Ударный самолет", attack: 2, air: 1, cost: 8 },
          { id: "bomber", name: "Бомбардировщик", attack: 4, speed: -1, cost: 14 },
        ],
        engine: [
          { id: "single", name: "Один двигатель", speed: 1, cost: 0 },
          { id: "twin", name: "Два двигателя", speed: 2, reliability: 1, oil: 1, cost: 8 },
          { id: "jet", name: "Реактивный", speed: 4, rare: 2, oil: 2, cost: 18 },
        ],
        avionics: [
          { id: "basic", name: "Базовая авионика", air: 1, cost: 0 },
          { id: "radar", name: "Радар", air: 2, rare: 1, cost: 10 },
          { id: "networked", name: "Сетевая авионика", air: 3, reliability: 1, rare: 2, cost: 16 },
        ],
      },
    },
    ship: {
      label: "Корабль",
      fields: {
        hull: [
          { id: "patrol", name: "Патрульный корпус", naval: 1, speed: 2, cost: 0 },
          { id: "frigate", name: "Фрегат", naval: 3, attack: 1, cost: 12 },
          { id: "destroyer", name: "Эсминец", naval: 4, attack: 2, cost: 20 },
        ],
        weapons: [
          { id: "guns", name: "Артиллерия", attack: 1, cost: 0 },
          { id: "missiles", name: "Ракеты", attack: 3, rare: 2, cost: 14 },
          { id: "airdef", name: "ПВО корабля", naval: 2, air: 2, rare: 2, cost: 16 },
        ],
        engine: [
          { id: "diesel", name: "Дизельная установка", speed: 1, cost: 0 },
          { id: "gas", name: "Газотурбинная установка", speed: 3, oil: 2, cost: 12 },
          { id: "nuclear", name: "Ядерная установка", speed: 2, reliability: 3, rare: 4, cost: 28 },
        ],
      },
    },
  };

  const DEFAULT_EQUIPMENT_DESIGNS = {
    tank: { chassis: "medium", gun: "long", engine: "diesel" },
    aircraft: { frame: "fighter", engine: "single", avionics: "radar" },
    ship: { hull: "frigate", weapons: "guns", engine: "diesel" },
  };

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
      { id: "territorial-commission", name: "Комиссия государственных границ", text: "Собрать единый реестр российских регионов и подготовить правовую основу для их защиты.", reward: { politicalPower: 20, stability: 2 }, x: 1, y: 2, requires: ["sovereign-course"], days: 3 },
      { id: "territorial-framework", name: "Правовой контур рубежей", text: "Закрепить территориальные гарантии в государственных документах и оборонном планировании.", reward: { commandPower: 20, stability: 3, factories: 1 }, x: 1, y: 3, requires: ["territorial-commission"], days: 3 },
      { id: "territorial-integrity", name: "Закрепить территориальную целостность", text: "Закрепить за Россией все регионы, которыми она владеет сейчас. Фокус можно проходить повторно после новых войн.", reward: { territorialIntegrity: 1, politicalPower: 12, stability: 1 }, x: 1, y: 4, requires: ["territorial-framework"], repeatable: true, days: 3 },
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
  let mapMode = "political";
  let strategyPanelFullscreen = false;
  let expandedFocusId = null;
  let relationMapMode = false;
  let relationMapCountryId = null;
  let relationPair = null;
  let strategyState = null;
  let selectedEventId = null;
  let gameWorldStrip = null;
  let gameWorldBefore = null;
  let gameWorldAfter = null;
  let mapDragState = null;
  let armyDragState = null;
  const csvFocusTrees = new Map();
  const missingCsvFocusTrees = new Set();
  const csvFocusTreeLoads = new Map();
  const csvFocusAvailable = new Set();
  let csvFocusManifestLoaded = false;
  let csvFocusManifestLoad = null;
  let gameTimer = null;
  let advancingDay = false;
  let gamePaused = false;
  let gameSpeed = 1;
  let tutorialStep = 0;
  let tutorialCampaign = false;
  let audioContext = null;
  let audioEnabled = false;
  let userSettings = loadUserSettings();
  const flagImageCache = new Map();
  const flagTextureCache = new Map();

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
      nextDay: "Завершить ход (+1 день)",
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
      nextDay: "End turn (+1 day)",
      pause: "Pause",
    },
  };
