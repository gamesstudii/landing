    function setBackground(imagePath, fallbackPath = "") {
      game.style.backgroundImage = fallbackPath
        ? `url("${imagePath}"), url("${fallbackPath}")`
        : `url("${imagePath}")`;
    }

    function setCookie(name, value, maxAgeDays = 365) {
      try {
        localStorage.setItem(name, String(value));
      } catch (error) {
        console.warn("Local storage is unavailable.", error);
      }

      const maxAge = maxAgeDays * 24 * 60 * 60;
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
      try {
        const storedValue = localStorage.getItem(name);

        if (storedValue !== null) {
          return storedValue;
        }
      } catch (error) {
        console.warn("Local storage is unavailable.", error);
      }

      const encodedName = `${encodeURIComponent(name)}=`;
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((item) => item.startsWith(encodedName));

      if (!cookie) {
        return "";
      }

      const cookieValue = decodeURIComponent(cookie.slice(encodedName.length));
      try {
        localStorage.setItem(name, cookieValue);
      } catch (error) {
        console.warn("Local storage is unavailable.", error);
      }

      return cookieValue;
    }

    function removeStoredValue(name) {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.warn("Local storage is unavailable.", error);
      }

      document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
    }

    function parseStoredJson(name, fallback) {
      const value = getCookie(name);

      if (!value) {
        return fallback;
      }

      try {
        return JSON.parse(value);
      } catch (error) {
        console.warn(`Could not load ${name}.`, error);
        return fallback;
      }
    }

    function createPlayerId() {
      const digits = [];

      digits.push(String(1 + Math.floor(Math.random() * 9)));

      while (digits.length < 16) {
        digits.push(String(Math.floor(Math.random() * 10)));
      }

      return digits.join("");
    }

    function loadPlayerProfile() {
      const storedProfile = parseStoredJson("playerProfile", {});
      const id = /^\d{16}$/.test(String(storedProfile.id || "")) ? String(storedProfile.id) : createPlayerId();
      const username = String(storedProfile.username || defaultPlayerProfile.username).trim().slice(0, 24) || defaultPlayerProfile.username;

      playerProfile = { username, id };
      savePlayerProfile();
    }

    function savePlayerProfile() {
      setCookie("playerProfile", JSON.stringify(playerProfile));
    }

    function loadPlayerStats() {
      const storedStats = parseStoredJson("playerStats", {});

      playerStats = {
        ...defaultPlayerStats,
        ...storedStats,
        battles: normalizeNumber(storedStats.battles),
        victories: normalizeNumber(storedStats.victories),
        defeats: normalizeNumber(storedStats.defeats),
        damage: normalizeNumber(storedStats.damage),
        kills: normalizeNumber(storedStats.kills),
        shots: normalizeNumber(storedStats.shots),
        hits: normalizeNumber(storedStats.hits),
        baseCapture: normalizeNumber(storedStats.baseCapture),
        experience: normalizeNumber(storedStats.experience),
        silver: normalizeNumber(storedStats.silver),
        tanks: storedStats.tanks && typeof storedStats.tanks === "object" ? storedStats.tanks : {}
      };
    }

    function savePlayerStats() {
      setCookie("playerStats", JSON.stringify(playerStats));
    }

    function normalizeNumber(value) {
      const number = Number.parseInt(value, 10);
      return Number.isFinite(number) && number > 0 ? number : 0;
    }

    function valueIsNumericReference(value) {
      return /^\d+$/.test(String(value || "").trim());
    }

    function normalizePositiveFloat(value) {
      const number = Number.parseFloat(String(value).replace(",", "."));
      return Number.isFinite(number) && number > 0 ? number : 0;
    }

    function clampNumber(value, min, max) {
      const number = Number.parseFloat(String(value).replace(",", "."));

      if (!Number.isFinite(number)) {
        return min;
      }

      return Math.max(min, Math.min(max, number));
    }

    function normalizeKeySetting(value, fallback) {
      const key = String(value || "").trim().toLowerCase();

      return key ? key.slice(0, 24) : fallback;
    }

    function keyIsPressed(settingId, fallbacks = []) {
      return [gameSettings[settingId], defaultGameSettings[settingId], ...fallbacks]
        .filter(Boolean)
        .some((key) => pressedKeys.has(String(key).toLowerCase()));
    }

    function toEightDigits(value) {
      return String(normalizeNumber(value)).padStart(8, "0").slice(-8);
    }

    function formatStoredNumber(value) {
      return String(normalizeNumber(value));
    }

    const tankUniqueFeatureTitles = {
      "10": "Плавающий"
    };

    function parseTankUniqueFeatures(value) {
      const compactValue = String(value || "").replace(/\D/g, "");
      const features = [];

      for (let index = 0; index + 1 < compactValue.length; index += 2) {
        features.push(compactValue.slice(index, index + 2));
      }

      return [...new Set(features)];
    }

    function tankHasUniqueFeature(tank, featureCode) {
      const sourceTank = tank?.tank || tank;

      return Array.isArray(sourceTank?.uniqueFeatures) && sourceTank.uniqueFeatures.includes(featureCode);
    }

    function formatTankUniqueFeatures(tank) {
      const sourceTank = tank?.tank || tank;
      const features = Array.isArray(sourceTank?.uniqueFeatures) ? sourceTank.uniqueFeatures : [];

      if (features.length === 0) {
        return "-";
      }

      return features.map((feature) => tankUniqueFeatureTitles[feature] || `Код ${feature}`).join(", ");
    }

    function tankIsDeveloperOnly(tank) {
      return tank?.developerOnly === true;
    }

    function tankIsAvailableInCurrentMode(tank) {
      return !tankIsDeveloperOnly(tank) || developerModeEnabled;
    }

    function loadGameSettings() {
      const storedSettings = getCookie("gameSettings");

      if (!storedSettings) {
        gameSettings = { ...defaultGameSettings };
        return;
      }

      try {
        const parsedSettings = JSON.parse(storedSettings);

        gameSettings = {
          ...defaultGameSettings,
          ...parsedSettings,
          showHealthBars: parsedSettings.showHealthBars !== false,
          showTeamMarkers: parsedSettings.showTeamMarkers !== false,
          showReloadIndicator: parsedSettings.showReloadIndicator !== false,
          showBattleResultPanel: parsedSettings.showBattleResultPanel !== false,
          fullscreen: parsedSettings.fullscreen === true
        };
      } catch (error) {
        console.warn("Could not load game settings.", error);
        gameSettings = { ...defaultGameSettings };
      }

      normalizeGameSettings();
      Object.keys(defaultGameSettings)
        .filter((key) => key.startsWith("key"))
        .forEach((key) => {
          gameSettings[key] = normalizeKeySetting(gameSettings[key], defaultGameSettings[key]);
        });
    }

    function saveGameSettings() {
      setCookie("gameSettings", JSON.stringify(gameSettings));
    }

    function applyGameSettings() {
      const brightness = clampNumber(gameSettings.brightness, 60, 140);
      const contrast = clampNumber(gameSettings.contrast, 70, 140);
      const saturation = clampNumber(gameSettings.saturation, 60, 150);
      const uiScale = clampNumber(gameSettings.battleUiScale, 80, 130) / 100;

      battleCanvas.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      battleAmmoPanel.style.transform = `translateX(-50%) scale(${uiScale})`;
      battleAmmoPanel.style.transformOrigin = "bottom center";
      reloadIndicator.style.fontSize = `${14 * uiScale}px`;
    }

    function getFullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    function isFullscreenActive() {
      return getFullscreenElement() === game;
    }

    async function setFullscreenMode(enabled) {
      try {
        if (enabled) {
          if (isFullscreenActive()) {
            return true;
          }

          const requestFullscreen = game.requestFullscreen || game.webkitRequestFullscreen;

          if (!requestFullscreen) {
            return false;
          }

          await requestFullscreen.call(game);
          return true;
        }

        if (!getFullscreenElement()) {
          return true;
        }

        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;

        if (!exitFullscreen) {
          return false;
        }

        await exitFullscreen.call(document);
        return true;
      } catch (error) {
        console.warn("Fullscreen mode is unavailable.", error);
        return false;
      }
    }

    function getTankExperienceCookieName(tank) {
      return `tank_${tank.id}_exp`;
    }

    function getTankStateCookieName(tank) {
      return `tank_${tank.id}_state`;
    }

    function getTankCrewCookieName(tank) {
      return `tank_${tank.id}_crew`;
    }

    function getTankAmmoCookieName(tank) {
      return `tank_${tank.id}_ammo`;
    }

    function getTankAmmoCapacity(tank) {
      const reloadTime = normalizePositiveFloat(tank?.reloadTime || 0);

      return Math.max(30, Math.round(420 / Math.max(0.1, reloadTime)));
    }

    function getTankShellPrice(tank, shellIndex) {
      const level = Math.max(1, normalizeNumber(tank?.level || 1));
      const multiplier = shellIndex === 1 ? 50 : 10;

      return multiplier * level * level;
    }

    function createDefaultTankAmmo(tank) {
      const shellCount = Math.max(1, Array.isArray(tank?.shells) ? tank.shells.length : 1);
      const capacity = getTankAmmoCapacity(tank);
      const baseCount = Math.floor(capacity / shellCount);
      let remainder = capacity % shellCount;

      return Array.from({ length: shellCount }, () => {
        const value = baseCount + (remainder > 0 ? 1 : 0);

        remainder = Math.max(0, remainder - 1);
        return value;
      });
    }

    function normalizeTankAmmo(tank, value, fallback = null) {
      const shellCount = Math.max(1, Array.isArray(tank?.shells) ? tank.shells.length : 1);
      const capacity = getTankAmmoCapacity(tank);
      const source = Array.isArray(value) ? value : fallback || createDefaultTankAmmo(tank);
      const ammo = Array.from({ length: shellCount }, (_, index) => normalizeNumber(source[index] || 0));
      let total = ammo.reduce((sum, count) => sum + count, 0);

      for (let index = ammo.length - 1; total > capacity && index >= 0; index -= 1) {
        const overflow = Math.min(ammo[index], total - capacity);

        ammo[index] -= overflow;
        total -= overflow;
      }

      return ammo;
    }

    function loadTankAmmo(tank) {
      if (!tank) {
        return [];
      }

      if (Array.isArray(tank.ammo)) {
        tank.ammo = normalizeTankAmmo(tank, tank.ammo);
        return tank.ammo;
      }

      tank.ammo = normalizeTankAmmo(tank, parseStoredJson(getTankAmmoCookieName(tank), null));
      saveTankAmmo(tank);
      return tank.ammo;
    }

    function saveTankAmmo(tank) {
      if (!tank) {
        return;
      }

      tank.ammo = normalizeTankAmmo(tank, tank.ammo);
      setCookie(getTankAmmoCookieName(tank), JSON.stringify(tank.ammo));
    }

    function createDefaultCrew() {
      return Object.fromEntries(crewRoles.map((role) => [role.id, {
        experience: 0,
        elite: false
      }]));
    }

    function normalizeCrewData(value) {
      const crew = createDefaultCrew();
      const source = value && typeof value === "object" ? value : {};

      crewRoles.forEach((role) => {
        const member = source[role.id] || {};

        crew[role.id] = {
          experience: Math.min(crewExperienceToTrain, normalizeNumber(member.experience || 0)),
          elite: member.elite === true
        };
      });

      return crew;
    }

    function loadTankCrew(tank) {
      if (!tank) {
        return createDefaultCrew();
      }

      if (tank.crew) {
        return tank.crew;
      }

      tank.crew = normalizeCrewData(parseStoredJson(getTankCrewCookieName(tank), {}));
      return tank.crew;
    }

    function saveTankCrew(tank) {
      if (!tank) {
        return;
      }

      setCookie(getTankCrewCookieName(tank), JSON.stringify(normalizeCrewData(tank.crew || {})));
    }

    function getCrewRoleMultiplier(tank, roleId) {
      if (!tank || tank.isBot || tank.state !== 2) {
        return 1;
      }

      const member = loadTankCrew(tank)[roleId];
      const training = Math.min(1, normalizeNumber(member?.experience || 0) / crewExperienceToTrain);
      const baseMultiplier = 0.9 + training * 0.1;

      return member?.elite ? baseMultiplier * 1.05 : baseMultiplier;
    }

    function normalizeTankState(value, fallback = 0) {
      const state = Number.parseInt(value, 10);

      if ([0, 1, 2].includes(state)) {
        return state;
      }

      return fallback;
    }

    function getDefaultTankState(tank) {
      if (tank.name === "\u041c\u0421-1") {
        return 2;
      }

      return normalizeNumber(tank.level) === 1 ? 1 : 0;
    }

    function loadPlayerResources() {
      playerResources.blueprints = normalizeNumber(getCookie("blueprints") || 0);
      playerResources.silver = normalizeNumber(getCookie("silver") || 10000);
      playerResources.gold = normalizeNumber(getCookie("gold") || 100);
      setCookie("blueprints", playerResources.blueprints);
      setCookie("silver", playerResources.silver);
      setCookie("gold", playerResources.gold);
    }

    function claimJuneFourthLoginGold(date = new Date()) {
      const rewardKey = "june_fourth_2026_gold_claimed";

      if (getCookie(rewardKey) === "1" || date.getFullYear() !== 2026 || date.getMonth() !== 5 || date.getDate() !== 4) {
        return false;
      }

      playerResources.gold += 500;
      setCookie("gold", playerResources.gold);
      setCookie(rewardKey, "1");
      return true;
    }

    function applyStoredTankExperience(tanks) {
      return tanks.map((tank, index) => {
        const tankWithId = {
          ...tank,
          id: tank.id || index + 1
        };

        if (tankWithId.futureTank) {
          return {
            ...tankWithId,
            experience: toEightDigits(tankWithId.experience || 0),
            state: 0
          };
        }

        const experienceCookieName = getTankExperienceCookieName(tankWithId);
        const stateCookieName = getTankStateCookieName(tankWithId);
        const storedExperience = getCookie(experienceCookieName);
        const storedState = getCookie(stateCookieName);
        const experience = storedExperience
          ? toEightDigits(storedExperience)
          : toEightDigits(tankWithId.experience || 0);
        const defaultState = getDefaultTankState(tankWithId);
        const state = tankWithId.name === "\u041c\u0421-1"
          ? 2
          : Math.max(normalizeTankState(storedState, defaultState), defaultState);

        setCookie(experienceCookieName, experience);
        setCookie(stateCookieName, state);

        return {
          ...tankWithId,
          experience,
          state
        };
      });
    }

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

    function splitFutureTankResearchLinks(tank, tanks) {
      const tankLevel = normalizeNumber(tank.level);
      const links = {
        researchTargets: [],
        researchParents: []
      };

      (tank.futureResearchReferences || []).forEach((reference) => {
        const referenceName = normalizeTankName(reference);
        const referenceId = valueIsNumericReference(reference) ? normalizeNumber(reference) : 0;
        const referencedTank = tanks.find((candidate) => (
          normalizeTankName(candidate.name) === referenceName
            || (referenceId > 0 && candidate.id === referenceId)
        ));
        const referencedLevel = normalizeNumber(referencedTank?.level || 0);

        if (referencedTank && referencedLevel > tankLevel) {
          links.researchTargets.push(reference);
          return;
        }

        links.researchParents.push(reference);
      });

      return links;
    }

    function parseTankRows(csvText) {
      const tanks = csvText
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          const cells = parseCsvLine(line);
          const name = (cells[0] || "").replace(/^\uFEFF/, "");
          const level = cells[7] || "";
          const techTreeFlag = (cells[28] || "").trim();
          const techTreeFlagValue = normalizeNumber(techTreeFlag);
          const futureTank = techTreeFlag !== "" && techTreeFlagValue === 0;
          const developerOnly = techTreeFlagValue === 3;
          const researchReferences = [cells[9], cells[10], cells[11]].filter(Boolean);

          return {
            id: index + 1,
            name,
            level,
            nation: cells[8] || "",
            experience: "00000000",
            state: getDefaultTankState({ name, level }),
            techTreeEligible: techTreeFlagValue === 1 || futureTank,
            futureTank,
            developerOnly,
            botEligible: !developerOnly && (techTreeFlag === "" || techTreeFlagValue !== 0),
            containerEligible: techTreeFlagValue === 2,
            premium: techTreeFlagValue === 2,
            health: normalizeNumber(cells[15] || 0),
            reloadTime: normalizePositiveFloat(cells[16] || 0),
            hullTurnDelay: normalizePositiveFloat(cells[17] || 0),
            movementDelay: normalizePositiveFloat(cells[18] || 0),
            averageArmor: normalizeNumber(cells[22] || 0),
            penetrationChance: normalizeNumber(cells[23] || 0),
            gunType: normalizeNumber(cells[24] || 1) || 1,
            shellsPerShot: Math.max(1, normalizeNumber(cells[25] || 1) || 1),
            clipSize: normalizeNumber(cells[26] || 0),
            gunSpreadDegrees: normalizePositiveFloat(cells[27] || 0),
            shells: [
              { type: cells[1] || "", damage: normalizeNumber(cells[4] || 0), penetration: normalizeNumber(cells[19] || 0) },
              { type: cells[2] || "", damage: normalizeNumber(cells[5] || 0), penetration: normalizeNumber(cells[20] || 0) },
              { type: cells[3] || "", damage: normalizeNumber(cells[6] || 0), penetration: normalizeNumber(cells[21] || 0) }
            ].filter((shell) => shell.type || shell.damage > 0),
            researchTargets: futureTank ? [] : researchReferences,
            researchParents: [],
            futureResearchReferences: futureTank ? researchReferences : [],
            researchExperiencePrice: normalizeNumber(cells[12] || 0),
            researchSilverPrice: normalizeNumber(cells[13] || 0),
            className: (cells[14] || "").trim().toUpperCase(),
            uniqueFeatures: parseTankUniqueFeatures(cells[29] || "")
          };
        })
        .filter((tank) => tank.name);

      tanks
        .filter((tank) => tank.futureTank)
        .forEach((tank) => {
          const links = splitFutureTankResearchLinks(tank, tanks);

          tank.researchTargets = links.researchTargets;
          tank.researchParents = links.researchParents;
        });

      return tanks;
    }

    function countReplacementCharacters(value) {
      return (value.match(/\uFFFD/g) || []).length;
    }

    function decodeCsvBuffer(csvBuffer) {
      const utf8Text = new TextDecoder("utf-8").decode(csvBuffer);
      const windows1251Text = new TextDecoder("windows-1251").decode(csvBuffer);

      return countReplacementCharacters(utf8Text) <= countReplacementCharacters(windows1251Text)
        ? utf8Text
        : windows1251Text;
    }

    function toRoman(value) {
      const number = Number.parseInt(value, 10);
      const romanLevels = {
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

      return romanLevels[number] || "";
    }

    function formatNationFileName(nation) {
      const normalizedNation = nation.trim().toLowerCase();
      const nationFiles = {
        "\u0441\u0441\u0441\u0440": "sssr",
        "\u0432\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f": "uk",
        "\u0430\u043d\u0433\u043b\u0438\u044f": "uk",
        "\u043f\u043e\u043b\u044c\u0448\u0430": "poland",
        "\u0433\u0435\u0440\u043c\u0430\u043d\u0438\u044f": "germany",
        "\u0441\u0448\u0430": "usa",
        "\u0444\u0440\u0430\u043d\u0446\u0438\u044f": "france",
        "\u043a\u0438\u0442\u0430\u0439": "china",
        "\u044f\u043f\u043e\u043d\u0438\u044f": "japan",
        "\u0447\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u044f": "czechoslovakia",
        "\u0447\u0435\u0445\u0438\u044f": "czech",
        "\u0448\u0432\u0435\u0446\u0438\u044f": "sweden",
        "\u0438\u0442\u0430\u043b\u0438\u044f": "italy",
        "\u043c\u0438\u0440\u043e\u0432\u0430\u044f \u043d\u0430\u0446\u0438\u044f": "mirovayanacia",
        "\u043c\u0438\u0440\u043e\u0432\u0430\u044f\u043d\u0430\u0446\u0438\u044f": "mirovayanacia"
      };

      if (nationFiles[normalizedNation]) {
        return nationFiles[normalizedNation];
      }

      return normalizedNation
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    }

    async function loadTankRows() {
      try {
        const response = await fetch("./data.csv", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`CSV loading failed: ${response.status}`);
        }

        const csvBuffer = await response.arrayBuffer();
        const csvText = decodeCsvBuffer(csvBuffer);
        return applyStoredTankExperience(parseTankRows(csvText));
      } catch (error) {
        console.error(error);
        return applyStoredTankExperience(fallbackTanks);
      }
    }

