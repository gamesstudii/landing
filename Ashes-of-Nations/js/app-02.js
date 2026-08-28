  function showScreen(screen) {
    document.querySelectorAll(".screen").forEach((item) => item.classList.remove("active"));
    screen.classList.add("active");
  }

  function t(key) {
    return UI_TEXT[userSettings.language]?.[key] || UI_TEXT.ru[key] || key;
  }

  const TUTORIAL_STEPS = [
    {
      title: "Добро пожаловать в учебную партию",
      text: `<p>Вы управляете <strong>Польшей в сценарии «Европа и Передняя Азия 2026»</strong>. Здесь нет таймера: игра идёт только после кнопки «Завершить ход». Поэтому спокойно рассматривайте цифры и пробуйте действия.</p><p class="tutorial-task">Цель урока: один раз выбрать курс страны, настроить экономику и производство, провести дипломатию, познакомиться с армией и закончить ход.</p>`,
    },
    {
      title: "Сначала — прочитайте страну",
      action: "focuses",
      actionLabel: "Открыть фокусы",
      text: `<p>Верхняя карточка слева показывает главное: бюджет, ВВП, стабильность, политическую и командную власть, ресурсы, население и снабжение. Если что-то проседает, именно там вы это заметите.</p><p>Вкладка <strong>«Фокусы»</strong> — долгосрочный план. Выберите доступный фокус: он выполняется по ходам и даёт постоянные бонусы. Линии показывают необходимые предыдущие решения.</p>`,
    },
    {
      title: "Внутренняя политика и регионы",
      action: "internal",
      actionLabel: "Открыть «Внутри»",
      text: `<p>Во вкладке <strong>«Внутри»</strong> меняются налоги, курс валюты, гражданские решения и устойчивость государства. Политическая власть — цена многих решений.</p><p>Нажмите область на карте: откроются её сведения. Во вкладке <strong>«Регионы»</strong> выбирают регион, строят объекты и управляют оккупацией. <strong>«Администрация»</strong> нужна для административных единиц, губернаторов и запросов регионов.</p>`,
    },
    {
      title: "Экономика, исследования и производство",
      action: "production",
      actionLabel: "Открыть «Экономика»",
      text: `<p><strong>«Экономика»</strong> — производство техники, проектирование снаряжения и строительство. Заводы и ресурсы определяют, сколько линий вы можете содержать.</p><p>Внутри этой вкладки доступны <strong>исследования</strong>: технологии открывают улучшения для армии, логистики и промышленности. Очереди производства и стройки продвигаются после завершения хода.</p><p class="tutorial-note">Простой старт: выбрать один фокус, одно исследование и одну производственную линию — этого достаточно для первой партии.</p>`,
    },
    {
      title: "Дипломатия без войны",
      action: "foreign",
      actionLabel: "Открыть «Дипломатию»",
      text: `<p>Во вкладке <strong>«Дипломатия»</strong> выберите другую страну и работайте с отношениями: союз, торговля, доступ войск, безвиз, базы, гарантии, пакт о ненападении, санкции, ультиматумы и операции.</p><p><strong>Организации</strong> показывают международные объединения и доступные действия. Торговля передаёт ресурсы и деньги, а хорошие отношения упрощают договоры.</p><p class="tutorial-task">Для мирного старта выберите соседа, заключите торговый договор или улучшите отношения — война не обязательна.</p>`,
    },
    {
      title: "Карта — не просто фон",
      action: "maps",
      actionLabel: "Открыть режимы карты",
      text: `<p>Карту можно двигать перетаскиванием, приближать кнопками вверху и нажимать регионы для выбора. Во вкладке <strong>«Режимы карты»</strong> есть политический, военный, снабжение, стабильность, экономика, рельеф, воды, стратегический, логистика и отношения.</p><p>Перед войной посмотрите снабжение и рельеф; перед договором — карту отношений. Правый клик по карте отношений помогает сравнить две страны.</p>`,
    },
    {
      title: "Армия и война",
      action: "army",
      actionLabel: "Открыть «Армию»",
      text: `<p>Во вкладке <strong>«Армия»</strong> назначают министра, набирают и развёртывают войска, выбирают армию и задают ей маршрут через регион на карте. Для наступления важны люди, техника, топливо, снабжение и технологии.</p><p>Во вкладке <strong>«Война»</strong> объявляют войну, приглашают союзников, занимают регионы, требуют капитуляцию и открывают мирную конференцию. Война расходует ресурсы и снижает устойчивость — не начинайте её без причины и подготовки.</p>`,
    },
    {
      title: "Ход, события и сохранения",
      text: `<p>Когда выдали приказы, нажмите <strong>«Завершить ход (+1 день)»</strong>. Игра посчитает экономику, исследования, стройки, операции, армии, ИИ и события, затем перейдёт к следующему дню.</p><p>События и журнал появляются внизу панели. Сохранение доступно вверху; «Продолжить» в главном меню загрузит автосохранение. В настройках меняются язык, сглаживание, вид политической карты и управляемая страна.</p><p class="tutorial-task">Теперь нажмите «Завершить ход» в игре. После этого вы уже прошли полный базовый цикл партии.</p>`,
    },
    {
      title: "Короткая памятка: всё в одном месте",
      text: `<ul><li><strong>Фокусы</strong> — долгосрочные национальные курсы.</li><li><strong>Внутри</strong> — налоги, курс, стабильность и внутренние решения.</li><li><strong>Экономика</strong> — производство, проекты, стройка и исследования.</li><li><strong>Дипломатия / Организации</strong> — отношения, договоры, торговля и объединения.</li><li><strong>Война / Армия</strong> — конфликты, войска, маршруты, оккупации и мир.</li><li><strong>Регионы / Администрация</strong> — развитие земли и её управление.</li><li><strong>Режимы карты</strong> — слои для разведки ситуации.</li></ul><p>Эту памятку можно открыть в любой партии кнопкой <strong>«? Как играть»</strong> вверху экрана.</p>`,
    },
  ];

  function renderTutorial() {
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;
    tutorialKicker.textContent = tutorialCampaign ? `УЧЕБНАЯ ПАРТИЯ · ШАГ ${tutorialStep + 1}/${TUTORIAL_STEPS.length}` : "СПРАВКА ПО ИГРЕ";
    tutorialTitle.textContent = step.title;
    tutorialContent.innerHTML = step.text;
    tutorialProgress.innerHTML = TUTORIAL_STEPS.map((_, index) => `<span class="${index <= tutorialStep ? "active" : ""}"></span>`).join("");
    tutorialBack.disabled = tutorialStep === 0;
    tutorialAction.textContent = step.actionLabel || "";
    tutorialAction.hidden = !step.action;
    tutorialAction.dataset.tab = step.action || "";
    tutorialNext.textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? "К игре" : "Далее →";
  }

  function openTutorial(step = 0) {
    tutorialStep = Math.max(0, Math.min(step, TUTORIAL_STEPS.length - 1));
    renderTutorial();
    tutorialModal.hidden = false;
  }

  function closeTutorial() {
    tutorialModal.hidden = true;
  }

  async function startTutorialCampaign() {
    const tutorialMap = maps.find((map) => map.file === "Европа-1500.json");
    const tutorialScenario = scenarios.find((scenario) => scenario.file === "Европа и Передняя Азия 2026.json");
    if (!tutorialMap || !tutorialScenario) {
      window.alert("Учебная карта ещё загружается. Подождите пару секунд и попробуйте снова.");
      return;
    }
    selectedMap = tutorialMap;
    selectedScenario = tutorialScenario;
    try {
      const response = await fetch(`${tutorialScenario.path}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const scenario = await response.json();
      selectedCountry = scenario.countries.find((country) => country.name === "Польша") || scenario.countries[0];
      if (!selectedCountry) throw new Error("В сценарии нет стран");
      tutorialCampaign = true;
      await startGame();
      if (gameData && strategyState) openTutorial(0);
    } catch (error) {
      console.error("Не удалось запустить обучение.", error);
      window.alert("Не удалось запустить учебную партию. Попробуйте ещё раз.");
    }
  }

  function loadUserSettings() {
    const defaults = { language: "ru", smoothing: "off", politicalMap: "standard" };
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
    document.querySelector('a[href^="editor/index.html"]').textContent = t("mapEditor");
    document.querySelector('a[href^="scenario-editor/index.html"]').textContent = t("scenarioEditor");
    settingsButton.textContent = t("settings");
    settingsSmoothing.querySelector('option[value="off"]').textContent = userSettings.language === "en" ? "Off" : "Отключено";
    settingsSmoothing.querySelector('option[value="msaa"]').textContent = "MSAA";
    settingsSmoothing.querySelector('option[value="ssaa"]').textContent = "SSAA";
    backButton.textContent = t("back");
    document.querySelector(".setup-screen .topbar .eyebrow").textContent = t("newGame");
    document.querySelector(".setup-screen .topbar h2").textContent = t("worldChoice");
    startGameButton.textContent = t("startGame");
    nextTurnButton.textContent = t("nextDay");
    updateNextTurnControl();
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
    settingsPoliticalMap.value = userSettings.politicalMap || "standard";
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
        await lockLandscapeOrientation();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Не удалось переключить полноэкранный режим.", error);
    }
  }

  function updateNextTurnControl() {
    const conference = strategyState?.peaceConference;
    const today = strategyState?.date?.toISOString?.().slice(0, 10);
    const ready = conference?.scheduled && conference.negotiationDate <= today;
    nextTurnButton.textContent = ready ? "Перейти к переговорам" : t("nextDay");
    nextTurnButton.dataset.action = ready ? "peace-date" : "next-day";
    nextTurnButton.disabled = false;
  }

  async function lockLandscapeOrientation() {
    const orientation = screen.orientation;
    if (!orientation?.lock) return;
    try {
      await orientation.lock("landscape");
    } catch (error) {
      console.warn("Не удалось закрепить горизонтальную ориентацию.", error);
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
    if (day > 0) {
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
    // Regional maps can end far south without containing Antarctica.  In that
    // case, treating their bottom edge as Antarctic incorrectly clears the
    // owners of countries shown there.
    if (!/мир|world/i.test(map?.name || "")) return false;
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

  function savedSlots() {
    try {
      const raw = window.localStorage.getItem(SAVE_SLOTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("Не удалось прочитать слоты сохранений.", error);
      return [];
    }
  }

  function defaultSaveSlotName() {
    return `${currentPlayerCountry()?.name || "Партия"} · ${strategyState ? gameDateLabel(strategyState.date, { short: true }) : "новая кампания"}`;
  }

  function saveNamedSlot(name = defaultSaveSlotName()) {
    if (!saveGame("manual")) return false;
    name = String(name || "").trim();
    if (!name) return false;
    const payload = { ...savedGame(), name, slotId: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const slots = savedSlots().filter((slot) => slot.name !== name);
    slots.unshift(payload);
    try {
      window.localStorage.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(slots.slice(0, 8)));
      addLog(`Сохранено в слот «${name}».`);
      updateContinueButton();
      return true;
    } catch (error) {
      addLog("Не удалось записать слот сохранения.");
      return false;
    }
  }

  function saveSlotCountry(slot) {
    const country = slot?.scenario?.countries?.find((item) => Number(item.id) === Number(slot.selectedCountryId));
    return country?.name || "Неизвестная страна";
  }

  function saveSlotDate(slot) {
    const savedAt = slot?.savedAt ? new Date(slot.savedAt) : null;
    return savedAt && !Number.isNaN(savedAt.getTime()) ? savedAt.toLocaleString("ru-RU") : "Дата неизвестна";
  }

  function renderSaveDialog() {
    if (!saveModal || !saveSlotsList) return;
    const slots = savedSlots();
    const autosave = savedGame();
    const entries = [
      ...(autosave?.strategyState ? [{ ...autosave, autosave: true }] : []),
      ...slots.map((slot, index) => ({ ...slot, index })),
    ];
    saveModalTitle.textContent = saveDialogMode === "save" ? "Сохранить кампанию" : "Архив сохранений";
    saveModalKicker.textContent = saveDialogMode === "save" ? "ЗАПИСЬ КАМПАНИИ" : "АРХИВ КАМПАНИЙ";
    saveSlotEditor.hidden = saveDialogMode !== "save";
    saveModalHint.textContent = saveDialogMode === "save"
      ? "Автосохранение обновляется отдельно. Именованные слоты можно загрузить из главного меню."
      : "Автосохранение создаётся при игре; именованные записи можно удалить или загрузить.";
    saveSlotsList.innerHTML = entries.length ? entries.map((slot) => {
      const flag = resolveFlagUrl(slot?.scenario?.countries?.find((country) => Number(country.id) === Number(slot.selectedCountryId))?.flag || "");
      return `<article class="save-slot-card ${slot.autosave ? "autosave" : ""}">
        <span class="save-slot-flag" style="--flag:url('${flag}')"></span>
        <div class="save-slot-copy"><small>${slot.autosave ? "АВТОСОХРАНЕНИЕ" : "ИМЕНОВАННЫЙ СЛОТ"}</small><strong>${slot.autosave ? "Продолжить кампанию" : slot.name}</strong><span>${saveSlotCountry(slot)} · ${slot.scenarioName || slot.scenario?.name || "Сценарий"}</span><em>${saveSlotDate(slot)}</em></div>
        <div class="save-slot-actions"><button class="mini-button" type="button" data-save-action="load" data-index="${slot.autosave ? "auto" : slot.index}">Загрузить</button>${slot.autosave || saveDialogMode !== "save" ? "" : `<button class="text-button save-overwrite" type="button" data-save-action="overwrite" data-index="${slot.index}">Перезаписать</button>`}${slot.autosave ? "" : `<button class="text-button save-delete" type="button" data-save-action="delete" data-index="${slot.index}">Удалить</button>`}</div>
      </article>`;
    }).join("") : `<div class="save-empty"><strong>Сохранений пока нет</strong><span>Начните кампанию — автосохранение появится само, а именованный слот можно создать кнопкой «Сохранить» вверху игры.</span></div>`;
  }

  function openSaveDialog(mode = "load") {
    saveDialogMode = mode === "save" && gameData && strategyState ? "save" : "load";
    if (saveSlotName) saveSlotName.value = defaultSaveSlotName();
    renderSaveDialog();
    saveModal.hidden = false;
    if (saveDialogMode === "save") requestAnimationFrame(() => saveSlotName?.focus());
  }

  function closeSaveDialog() {
    if (saveModal) saveModal.hidden = true;
  }

  function deleteSaveSlot(index) {
    const slots = savedSlots();
    if (!slots[Number(index)]) return;
    slots.splice(Number(index), 1);
    try {
      window.localStorage.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(slots));
      renderSaveDialog();
    } catch (error) {
      console.warn("Не удалось удалить слот сохранения.", error);
    }
  }

  const GOVERNOR_FIRST_NAMES = ["Алексей", "Мария", "Ирина", "Дмитрий", "Елена", "Андрей", "София", "Виктор", "Наталья", "Павел"];
  const GOVERNOR_LAST_NAMES = ["Орлова", "Воронцов", "Соколова", "Миронов", "Белова", "Крылов", "Левина", "Громов", "Серова", "Власов"];

  function governorCandidates(regionId, country) {
    return [0, 1, 2].map((index) => {
      const seed = hashNumber(`${country.id}:${regionId}:governor:${index}`);
      return {
        id: `${regionId}-${index}`,
        name: `${GOVERNOR_FIRST_NAMES[seed % GOVERNOR_FIRST_NAMES.length]} ${GOVERNOR_LAST_NAMES[Math.floor(seed / 11) % GOVERNOR_LAST_NAMES.length]}`,
        specialty: REGION_MINISTERS[(seed % (REGION_MINISTERS.length - 1)) + 1].id,
      };
    });
  }

  function createRegionalGovernor(regionId, country) {
    const education = GOVERNOR_EDUCATIONS[hashNumber(`${country.id}:${regionId}:education`) % GOVERNOR_EDUCATIONS.length];
    return {
      id: `administration-${regionId}`,
      name: "Региональная администрация",
      education: education.id,
      appointedAt: null,
      source: "Игровое назначение",
      verified: false,
      approval: 48 + hashNumber(`${country.id}:${regionId}:approval`) % 34,
    };
  }

  function administrativeDescriptor(regionId) {
    const dynamic = strategyState?.administrativeRegions?.find((unit) => unit.regionIds?.includes(Number(regionId)));
    if (dynamic) {
      const labels = { region: "регион / провинция", district: "район / городской округ", city: "город" };
      return { level: labels[dynamic.level] || "регион / провинция", parent: "административная единица", name: dynamic.name };
    }
    const custom = (gameData?.scenario?.administrativeDivisions || []).find((item) => Number(item.regionId) === Number(regionId));
    if (custom) {
      const parent = custom.parentRegionId
        ? gameData?.regionById?.get(Number(custom.parentRegionId))?.name || `регион ${custom.parentRegionId}`
        : "центральная администрация";
      const labels = { region: "регион / провинция", district: "район / городской округ", city: "город" };
      return { level: labels[custom.level] || "регион / провинция", parent, name: custom.name || null };
    }
    const parts = String(gameData?.regionById?.get(Number(regionId))?.name || "").split(":").map((part) => part.trim()).filter(Boolean);
    return {
      level: parts.length >= 3 ? "район / городской округ" : "регион / провинция",
      parent: parts.length >= 3 ? parts.slice(1, -1).join(" · ") : "центральная администрация",
    };
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
      administration: administrativeDescriptor(regionId),
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
      governor: createRegionalGovernor(regionId, country),
      ministerBudget: 0,
      base: false,
      supplyCapacity: 0,
      airCapacity: 0,
      navalCapacity: 0,
      navalAccess: 0,
    };
  }

  function seedRegionInfrastructure(profile, country) {
    const geo = geoProfile(profile.regionId);
    const seed = hashNumber(`${country.id}:${profile.regionId}:infra`);
    if (Number(country.capitalRegionId) === Number(profile.regionId)) {
      profile.buildings.push("railway", "airfield");
      profile.supplyCapacity += 650;
      profile.airCapacity += 1;
    }
    if (geo?.tags.includes("coast") && (seed % 3 === 0 || Number(country.capitalRegionId) === Number(profile.regionId))) {
      profile.buildings.push("port");
      profile.navalAccess += 1;
      profile.supplyCapacity += 420;
    }
    if ((geo?.tags.includes("island") || geo?.tags.includes("archipelago")) && seed % 2 === 0) {
      profile.buildings.push("port");
      profile.navalAccess += 1;
      profile.supplyCapacity += 360;
    }
    if (profile.economy >= 8 && seed % 2 === 0) {
      profile.buildings.push("railway");
      profile.supplyCapacity += 350;
    }
    if (profile.economy >= 12 && seed % 5 === 0) {
      profile.buildings.push("shipyard");
      profile.navalCapacity += 1;
    }
    profile.buildings = [...new Set(profile.buildings)];
  }

  function countryCharacters(country, year) {
    const roster = REAL_GENERAL_ROSTERS[country.name] || [];
    const selected = roster.find((general) => Number(year) >= general.from) || roster[roster.length - 1];
    const generals = selected ? [{
      id: `general-${country.id}-${selected.from}`,
      name: selected.name,
      role: "Генерал",
      trait: selected.trait,
      effects: selected.effects,
      cost: 35,
      source: "Исторический командующий",
    }] : [{
      id: `general-staff-${country.id}`,
      name: `Генеральный штаб: ${country.name}`,
      role: "Генерал",
      trait: "Штабное командование",
      effects: { commandPowerDaily: 0.3, armyReadiness: 1 },
      cost: 30,
      source: "Штабная должность — персональная запись отсутствует",
    }];
    return [...generals, ...CHARACTER_TEMPLATES];
  }

  function createCountryRuntime(country, year = 2026) {
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
        oil: 50 + oilBonus + Math.round(power),
        steel: 45 + steelBonus + power,
        food: 40 + foodBonus + Math.round(power / 1.5),
        rare: 30 + Math.round(power / 2),
      },
      equipmentDesigns: JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_DESIGNS)),
      navyPower: 0,
      navalMission: null,
      aiAgenda: null,
      focusId: null,
      focusProgress: 0,
      activeFocuses: [],
      completedFocuses: [],
      decisions: [],
      production: [
        { lineId: "infantry", assigned: Math.max(1, Math.floor(power / 18)), progress: 0 },
        { lineId: "civilian", assigned: Math.max(1, Math.floor(power / 32)), progress: 0 },
        { lineId: "ship", assigned: 0, progress: 0 },
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
      characters: countryCharacters(country, year).map((template, index) => ({
        ...template,
        loyalty: clamp(58 + (hashNumber(`${country.id}:${template.id}`) % 28) - index * 2, 25, 92),
        active: false,
      })),
      activeGeneralId: null,
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
      supply: {
        level: 100,
        demand: 0,
        capacity: 0,
        lastLosses: 0,
        status: "норма",
      },
      logisticsInvestment: 0,
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
      countryStates[stateKey(country)] = createCountryRuntime(country, scenario.year);
      const runtime = countryStates[stateKey(country)];
      (country.regionIds || []).forEach((regionId) => {
        runtime.regionProfiles[String(regionId)] = createRegionProfile(regionId, country, runtime);
        seedRegionInfrastructure(runtime.regionProfiles[String(regionId)], country);
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
        order: "",
        lastSupply: 100,
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
      guarantees: [],
      nonAggressionPacts: [],
      historicalEvents: [],
      wars: [],
      navalIncidents: [],
      peaceConference: null,
      claims: [],
      crises: [],
      regionalElections: [],
      lastRegionalElectionMonth: "",
      administrativeRegions: [],
      administrativeRequests: [],
      turnNotifications: [],
      selectedAdministrativeUnitId: null,
      lastCrisisMonth: "",
      selectedRegionId: null,
      occupationPolicies: {},
      orgInfluence: {},
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
    runtime.taxRate = clamp(Number.isFinite(Number(runtime.taxRate)) ? Number(runtime.taxRate) : 22, 10, 50);
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
    if (!runtime.supply) {
      runtime.supply = {
        level: 100,
        demand: 0,
        capacity: 0,
        lastLosses: 0,
        status: "норма",
      };
    }
    runtime.logisticsInvestment = Number(runtime.logisticsInvestment || 0);
    runtime.equipmentDesigns = {
      tank: { ...DEFAULT_EQUIPMENT_DESIGNS.tank, ...(runtime.equipmentDesigns?.tank || {}) },
      aircraft: { ...DEFAULT_EQUIPMENT_DESIGNS.aircraft, ...(runtime.equipmentDesigns?.aircraft || {}) },
      ship: { ...DEFAULT_EQUIPMENT_DESIGNS.ship, ...(runtime.equipmentDesigns?.ship || {}) },
    };
    runtime.navyPower = Number(runtime.navyPower || 0);
    if (runtime.navalMission && !["blockade", "escort"].includes(runtime.navalMission.type)) runtime.navalMission = null;
    if (!AI_AGENDAS.some((agenda) => agenda.id === runtime.aiAgenda)) runtime.aiAgenda = null;
    if (runtime.resourceBalanceVersion !== 2) {
      runtime.resources = runtime.resources || {};
      runtime.resources.oil = Math.max(Number(runtime.resources.oil || 0), 50);
      runtime.resources.steel = Math.max(Number(runtime.resources.steel || 0), 45);
      runtime.resources.food = Math.max(Number(runtime.resources.food || 0), 40);
      runtime.resources.rare = Math.max(Number(runtime.resources.rare || 0), 30);
      runtime.resourceBalanceVersion = 2;
    }
    if (!Array.isArray(runtime.production)) runtime.production = [];
    if (!runtime.production.some((line) => line.lineId === "ship")) runtime.production.push({ lineId: "ship", assigned: 0, progress: 0 });
    const hasLegacyGeneral = Array.isArray(runtime.characters) && runtime.characters.some((character) => ["chief-staff", "logistics-general"].includes(character.id));
    runtime.characters = Array.isArray(runtime.characters) && runtime.characters.length && !hasLegacyGeneral
      ? runtime.characters
      : countryCharacters(country, gameDate?.getFullYear?.() || 2026).map((template, index) => ({
        ...template,
        loyalty: clamp(58 + (hashNumber(`${country.id}:${template.id}`) % 28) - index * 2, 25, 92),
        active: false,
      }));
    runtime.activeGeneralId = runtime.activeGeneralId || null;
    if (runtime.activeGeneralId) {
      const assignedGeneral = runtime.characters.find((character) => character.id === runtime.activeGeneralId && character.role === "Генерал");
      if (assignedGeneral) assignedGeneral.active = true;
      else runtime.activeGeneralId = null;
    }
    runtime.armies = Array.isArray(runtime.armies) ? runtime.armies : [];
    runtime.armies.forEach((army) => {
      if (!Object.prototype.hasOwnProperty.call(army, "order")) army.order = "";
      if (!Object.prototype.hasOwnProperty.call(army, "lastSupply")) army.lastSupply = 100;
      if (!Array.isArray(army.route)) army.route = army.movingTo ? [Number(army.movingTo)] : [];
    });
    Object.values(runtime.regionProfiles || {}).forEach((profile) => {
      if (!profile.administration) profile.administration = administrativeDescriptor(profile.regionId);
      if (!profile.governor) profile.governor = createRegionalGovernor(profile.regionId, country);
      if (!GOVERNOR_EDUCATIONS.some((item) => item.id === profile.governor.education)) {
        profile.governor.education = createRegionalGovernor(profile.regionId, country).education;
      }
      profile.governor.approval = clamp(Number(profile.governor.approval || 55), 0, 100);
      profile.governor.source = profile.governor.source || "Игровое назначение";
      profile.buildings = Array.isArray(profile.buildings) ? profile.buildings : [];
      profile.supplyCapacity = Number(profile.supplyCapacity || 0);
      profile.airCapacity = Number(profile.airCapacity || 0);
      profile.navalCapacity = Number(profile.navalCapacity || 0);
      profile.navalAccess = Number(profile.navalAccess || 0);
    });
  }

  function normalizeStrategyState(state, scenario) {
    if (!state?.countryStates) return;
    const gameDate = state.date instanceof Date ? state.date : new Date(Number(scenario?.year) || 2026, 0, 1);
    if (!Array.isArray(state.sanctions)) state.sanctions = [];
    if (!Array.isArray(state.navalIncidents)) state.navalIncidents = [];
    if (!Array.isArray(state.wars)) state.wars = [];
    state.wars.forEach((war) => {
      if (!WAR_GOALS.some((goal) => goal.id === war.goal)) war.goal = "border";
    });
    if (!Array.isArray(state.guarantees)) state.guarantees = [];
    if (!Array.isArray(state.nonAggressionPacts)) state.nonAggressionPacts = [];
    if (!Array.isArray(state.historicalEvents)) state.historicalEvents = [];
    if (!Array.isArray(state.crises)) state.crises = [];
    if (!Array.isArray(state.regionalElections)) state.regionalElections = [];
    if (!Object.prototype.hasOwnProperty.call(state, "lastRegionalElectionMonth")) state.lastRegionalElectionMonth = "";
    if (!Array.isArray(state.administrativeRequests)) state.administrativeRequests = [];
    if (!Array.isArray(state.turnNotifications)) state.turnNotifications = [];
    if (state.peaceConference && !state.peaceConference.negotiationDate) state.peaceConference.negotiationDate = state.peaceConference.opened || gameDate.toISOString().slice(0, 10);
    if (state.peaceConference && !Object.prototype.hasOwnProperty.call(state.peaceConference, "scheduled")) state.peaceConference.scheduled = false;
    if (state.peaceConference && !state.peaceConference.title) state.peaceConference.title = "Мирный договор";
    if (!state.occupationPolicies) state.occupationPolicies = {};
    if (!state.orgInfluence) state.orgInfluence = {};
    state.log = Array.isArray(state.log) ? state.log.map((entry, index) => (
      typeof entry === "string"
        ? { id: `legacy-${index}`, date: "", text: entry, detail: "", action: "", severity: "info" }
        : {
          id: entry.id || `legacy-${index}`,
          date: entry.date || "",
          text: entry.text || "",
          detail: entry.detail || "",
          action: entry.action || "",
          severity: entry.severity || "info",
        }
    )) : [];
    if (!Object.prototype.hasOwnProperty.call(state, "lastCrisisMonth")) state.lastCrisisMonth = "";
    if (!Object.prototype.hasOwnProperty.call(state, "lastUNGeneralAssemblyAt")) state.lastUNGeneralAssemblyAt = null;
    if (!Object.prototype.hasOwnProperty.call(state, "lastUNGeneralAssembly")) state.lastUNGeneralAssembly = null;
    scenario?.countries?.forEach((country) => {
      const runtime = state.countryStates[stateKey(country)];
      normalizeCountryRuntime(runtime, country, gameDate);
      if (runtime && !runtime.aiAgenda) runtime.aiAgenda = chooseAiAgenda(country, runtime);
    });
    normalizeAdministrativeRegions(state, scenario);
  }

  function normalizeAdministrativeRegions(state, scenario) {
    const baseRegions = (gameData?.map?.regions || []).filter((region) => region.type !== "sea").map((region) => Number(region.id));
    const knownRegionIds = new Set(baseRegions);
    const source = Array.isArray(state.administrativeRegions) && state.administrativeRegions.length
      ? state.administrativeRegions
      : (scenario?.administrativeDivisions || []).map((item) => ({
        id: `admin-${item.regionId}`,
        name: item.name || gameData?.regionById?.get(Number(item.regionId))?.name || `Регион ${item.regionId}`,
        level: item.level || "region",
        regionIds: [Number(item.regionId)],
      }));
    const used = new Set();
    state.administrativeRegions = source.map((unit, index) => {
      const regionIds = [...new Set((unit.regionIds || []).map(Number).filter((id) => knownRegionIds.has(id) && !used.has(id)))];
      regionIds.forEach((id) => used.add(id));
      return {
        id: unit.id || `admin-${index + 1}`,
        name: String(unit.name || `Административная единица ${index + 1}`),
        level: ["region", "district", "city"].includes(unit.level) ? unit.level : "region",
        regionIds,
        nextRequestAt: unit.nextRequestAt || null,
      };
    }).filter((unit) => unit.regionIds.length);
    baseRegions.filter((id) => !used.has(id)).forEach((regionId) => {
      state.administrativeRegions.push({
        id: `admin-${regionId}`,
        name: gameData?.regionById?.get(regionId)?.name || `Регион ${regionId}`,
        level: "region",
        regionIds: [regionId],
        nextRequestAt: null,
      });
    });
    if (!state.administrativeRegions.some((unit) => unit.id === state.selectedAdministrativeUnitId)) {
      state.selectedAdministrativeUnitId = state.administrativeRegions[0]?.id || null;
    }
    Object.values(state.countryStates || {}).forEach((runtime) => {
      runtime.administrativeSlots = Math.max(2, Number(runtime.administrativeSlots || 0), Math.ceil(Number(runtime.factories || 0) / 2) + 2);
      runtime.administrativeSlotsUsed = Math.max(0, Number(runtime.administrativeSlotsUsed || 0));
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
    if (runtime.democracy.approval >= 70) runtime.politicalPower += 0.35 * (Number(runtime.politicalPowerDailyMultiplier) || 1);
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

  function removeAlliance(state, a, b) {
    const left = state.countryStates[String(a)];
    const right = state.countryStates[String(b)];
    if (left) left.allies = (left.allies || []).filter((id) => Number(id) !== Number(b));
    if (right) right.allies = (right.allies || []).filter((id) => Number(id) !== Number(a));
  }

  function setOrganizationMembership(countryId, organizationId, joining) {
    if (!strategyState || !countryId || !organizationId) return false;
    const template = [...ORGANIZATION_TEMPLATES, ...HISTORICAL_ORGANIZATION_TEMPLATES].find((item) => item.id === organizationId);
    if (!template || template.global) return false;
    let organization = strategyState.organizations.find((item) => item.id === organizationId);
    if (!organization && joining) {
      organization = { id: template.id, name: template.name, global: false, members: [] };
      strategyState.organizations.push(organization);
    }
    if (!organization) return false;
    const members = organization.members || (organization.members = []);
    const wasMember = members.includes(Number(countryId));
    if (joining) {
      if (wasMember) return false;
      members.push(Number(countryId));
      members.forEach((memberId) => {
        if (Number(memberId) === Number(countryId)) return;
        setRelation(countryId, memberId, Math.max(getRelation(countryId, memberId), template.relation || 15));
        if (MILITARY_ORGANIZATION_IDS.has(organizationId)) addAlliance(strategyState, countryId, memberId);
      });
      return true;
    }
    if (!wasMember) return false;
    members.filter((memberId) => Number(memberId) !== Number(countryId)).forEach((memberId) => {
      if (MILITARY_ORGANIZATION_IDS.has(organizationId)) removeAlliance(strategyState, countryId, memberId);
    });
    organization.members = members.filter((memberId) => Number(memberId) !== Number(countryId));
    return true;
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

  function aiAlliesImposeSanctions(attackerId, defenderId) {
    const defenderRuntime = strategyState.countryStates[String(defenderId)];
    const attacker = countryById(attackerId);
    if (!defenderRuntime || !attacker) return;
    const type = sanctionTypeById("economic");
    (defenderRuntime.allies || []).slice(0, 4).forEach((allyId) => {
      const issuerId = Number(allyId);
      if (issuerId === Number(attackerId) || issuerId === Number(defenderId)) return;
      const issuer = countryById(issuerId);
      const issuerRuntime = strategyState.countryStates[String(issuerId)];
      if (!issuer || !issuerRuntime || issuerRuntime.capitulated) return;
      const key = sanctionKey(issuerId, attackerId, type.id);
      if (activeSanctions().some((sanction) => sanction.key === key)) return;
      strategyState.sanctions.push({
        id: key,
        key,
        issuerId,
        targetId: Number(attackerId),
        type: type.id,
        severity: type.severity,
        active: true,
        imposedAt: strategyState.date.toISOString().slice(0, 10),
        reason: `реакция союзника на войну против ${countryById(defenderId)?.name || "партнёра"}`,
      });
      setRelation(issuerId, attackerId, getRelation(issuerId, attackerId) - type.relationPenalty);
      if (Number(strategyState.playerCountryId) === Number(attackerId)) addLog(`${issuer.name} вводит экономические санкции против ${attacker.name} в поддержку союзника.`);
    });
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

  // A scheduled event changes the world only while its historical prerequisites
  // remain intact. This lets a player create a plausible alternative timeline.
  function historicalCountry(name) {
    return gameData?.scenario?.countries?.find((country) => country.name === name && (country.regionIds || []).length) || null;
  }

  function isAtWarByName(firstName, secondName) {
    const first = historicalCountry(firstName);
    const second = historicalCountry(secondName);
    return Boolean(first && second && isAtWar(first.id, second.id));
  }

  function historicalEventConditionMet(event) {
    const condition = event.when || {};
    if (condition.countryExists && !historicalCountry(condition.countryExists)) return false;
    if (condition.countryControlsOwnLand) {
      const country = historicalCountry(condition.countryControlsOwnLand);
      if (!country || (country.regionIds || []).some((regionId) => {
        const controller = controllerOfRegion(regionId);
        return controller && Number(controller.id) !== Number(country.id);
      })) return false;
    }
    if (condition.atWar && !isAtWarByName(condition.atWar[0], condition.atWar[1])) return false;
    if (condition.notAtWar && isAtWarByName(condition.notAtWar[0], condition.notAtWar[1])) return false;
    if (condition.relationsAbove && condition.relationsAbove.some(([a, b, value]) => {
      const left = historicalCountry(a);
      const right = historicalCountry(b);
      return !left || !right || getRelation(left.id, right.id) < Number(value);
    })) return false;
    return true;
  }

  function addHistoricalEventWar(attackerName, defenderName, title) {
    const attacker = historicalCountry(attackerName);
    const defender = historicalCountry(defenderName);
    if (!attacker || !defender || isAtWar(attacker.id, defender.id)) return false;
    breakNonAggressionPact(attacker.id, defender.id);
    strategyState.wars.push({
      id: `historic-${attacker.id}-${defender.id}-${strategyState.date.toISOString().slice(0, 10)}`,
      name: title || `Война: ${attacker.name} — ${defender.name}`,
      attackerId: Number(attacker.id), defenderId: Number(defender.id),
      start: strategyState.date.toISOString().slice(0, 10), goal: "border", active: true, historical: true,
    });
    setRelation(attacker.id, defender.id, -100);
    return true;
  }

  function applyHistoricalEventEffect(effect, event) {
    if (effect.type === "integrate") {
      const actor = historicalCountry(effect.to);
      if (actor) integrateCountryIntoActor(effect.from, actor.id);
      return;
    }
    if (effect.type === "war") {
      addHistoricalEventWar(effect.attacker, effect.defender, event.title);
      return;
    }
    if (effect.type === "relation") {
      const left = historicalCountry(effect.a); const right = historicalCountry(effect.b);
      if (left && right) setRelation(left.id, right.id, Number(effect.value));
      return;
    }
    if (effect.type === "alliance") {
      const left = historicalCountry(effect.a); const right = historicalCountry(effect.b);
      if (left && right) addAlliance(strategyState, left.id, right.id);
      return;
    }
    if (effect.type === "nonAggression") {
      const left = historicalCountry(effect.a); const right = historicalCountry(effect.b);
      if (left && right && !hasNonAggressionPact(left.id, right.id)) {
        const expires = new Date(strategyState.date); expires.setDate(expires.getDate() + Number(effect.days || 365));
        strategyState.nonAggressionPacts.push({ a: left.id, b: right.id, signed: strategyState.date.toISOString().slice(0, 10), expires: expires.toISOString().slice(0, 10), active: true, historical: true });
      }
      return;
    }
    if (effect.type === "stability" || effect.type === "warSupport") {
      const country = historicalCountry(effect.country);
      const runtime = country && strategyState.countryStates[String(country.id)];
      if (runtime) runtime[effect.type] = clamp(Number(runtime[effect.type] || 0) + Number(effect.value || 0), 0, 100);
      return;
    }
    if (effect.type === "organization") {
      if (!strategyState.organizations.some((organization) => organization.id === effect.id)) {
        const members = (effect.members || []).map(historicalCountry).filter(Boolean).map((country) => Number(country.id));
        strategyState.organizations.push({ id: effect.id, name: effect.name, global: Boolean(effect.global), members, historical: true });
        if (effect.military) members.forEach((left, index) => members.slice(index + 1).forEach((right) => addAlliance(strategyState, left, right)));
      }
      return;
    }
    if (effect.type === "organizationMembers") {
      const organization = strategyState.organizations.find((item) => item.id === effect.id);
      if (organization) effect.members.map(historicalCountry).filter(Boolean).forEach((country) => {
        if (!organization.members.includes(Number(country.id))) organization.members.push(Number(country.id));
      });
      return;
    }
    if (effect.type === "organizationRemove") {
      const organization = strategyState.organizations.find((item) => item.id === effect.id);
      const country = historicalCountry(effect.member);
      if (organization && country) organization.members = organization.members.filter((id) => Number(id) !== Number(country.id));
    }
  }

  function runHistoricalEvents() {
    const events = Array.isArray(window.HISTORICAL_EVENT_TIMELINE) ? window.HISTORICAL_EVENT_TIMELINE : [];
    if (!strategyState || !events.length) return;
    const today = strategyState.date.toISOString().slice(0, 10);
    events.filter((event) => event.date === today && !strategyState.historicalEvents.some((item) => item.id === event.id)).forEach((event) => {
      const applied = historicalEventConditionMet(event);
      strategyState.historicalEvents.push({ id: event.id, date: today, status: applied ? "applied" : "skipped" });
      if (!applied) {
        addLog({ text: `Историческая развилка: «${event.title}» не произошла.`, detail: "Условия события были изменены действиями игроков или развитием войны.", severity: "warning" });
        return;
      }
      (event.effects || []).forEach((effect) => applyHistoricalEventEffect(effect, event));
      addLog({ text: `${event.title}: ${event.text}`, detail: `Историческое событие · ${today}`, severity: "info" });
      markMapDirty();
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
        order: "",
        lastSupply: runtime.supply?.level || 100,
      });
    });
  }

  function addLog(text) {
    if (!strategyState) return;
    const entry = typeof text === "object" ? text : { text };
    strategyState.log.unshift({
      id: entry.id || `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: strategyState.date instanceof Date ? strategyState.date.toISOString().slice(0, 10) : "",
      text: entry.text || String(text),
      detail: entry.detail || "",
      action: entry.action || "",
      severity: entry.severity || "info",
    });
    strategyState.log = strategyState.log.slice(0, 8);
    showNotification({
      id: strategyState.log[0]?.id,
      text: entry.text || String(text),
      detail: entry.detail || "Подробности доступны в журнале событий.",
      severity: entry.severity || "info",
    });
  }

  function notificationIcon(notification) {
    if (notification.kind === "administration") return "⚙";
    if (notification.severity === "warning") return "⚠";
    if (notification.severity === "danger") return "✦";
    if (/войн|арм|атака|оккупац/i.test(notification.text || "")) return "⚔";
    if (/выбор/i.test(notification.text || "")) return "✓";
    if (/строительств|завод/i.test(notification.text || "")) return "▣";
    return "●";
  }

  function showNotification(notification) {
    if (!gameScreen?.classList.contains("active") || !strategyState) return;
    const item = typeof notification === "string" ? { text: notification } : notification;
    const existing = strategyState.turnNotifications || [];
    strategyState.turnNotifications = [...existing.filter((entry) => entry.id !== item.id), {
      id: item.id || `notice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: item.text || "Событие",
      detail: item.detail || "",
      severity: item.severity || "info",
      kind: item.kind || "event",
      requestId: item.requestId || null,
    }].slice(-12);
    renderNotificationIcons();
  }

  function clearTurnNotifications() {
    if (!strategyState) return;
    strategyState.turnNotifications = [];
    document.getElementById("notificationDetails")?.remove();
    renderNotificationIcons();
  }

  function renderNotificationIcons() {
    let stack = document.getElementById("notificationStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "notificationStack";
      stack.className = "notification-stack";
      gameScreen.appendChild(stack);
    }
    const notices = strategyState?.turnNotifications || [];
    stack.innerHTML = notices.map((notice) => `<button class="game-notification ${notice.severity || "info"}" type="button" data-notification-id="${notice.id}" title="${notice.text}">${notificationIcon(notice)}</button>`).join("");
    stack.querySelectorAll("button[data-notification-id]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
