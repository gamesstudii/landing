        ensureAudio();
        playSound("click");
        openNotificationDetails(button.dataset.notificationId);
      });
    });
  }

  function openNotificationDetails(notificationId) {
    const notification = strategyState?.turnNotifications?.find((item) => item.id === notificationId);
    if (!notification) return;
    document.getElementById("notificationDetails")?.remove();
    const details = document.createElement("dialog");
    details.id = "notificationDetails";
    details.className = "notification-details";
    details.innerHTML = `
      <header><strong>${notification.text}</strong><button type="button" class="text-button" data-close-notification>×</button></header>
      <p>${notification.detail || "Подробностей нет."}</p>
      ${notification.requestId ? `<div class="inline-actions"><button class="mini-button" type="button" data-admin-request="approve" data-id="${notification.requestId}">Разрешить</button><button class="danger-button" type="button" data-admin-request="refuse" data-id="${notification.requestId}">Отказать</button></div>` : ""}`;
    details.addEventListener("click", (event) => {
      if (event.target === details || event.target.closest("[data-close-notification]")) {
        details.close();
        details.remove();
        return;
      }
      const action = event.target.closest("button[data-admin-request]");
      if (!action) return;
      decideAdministrativeRequest(action.dataset.id, action.dataset.adminRequest === "approve");
      details.close();
      details.remove();
    });
    document.body.appendChild(details);
    details.showModal();
  }

  function renderAdministrativeNotifications() {
    const playerId = Number(strategyState?.playerCountryId);
    const requests = (strategyState?.administrativeRequests || []).filter((item) => Number(item.countryId) === playerId);
    if (!strategyState) return;
    const requestNotices = requests.map((request) => {
      const unit = strategyState.administrativeRegions.find((item) => item.id === request.unitId);
      const project = CONSTRUCTION_PROJECTS.find((item) => item.id === request.projectId);
      const region = gameData?.regionById?.get(Number(request.regionId));
      return {
        id: `admin-notice:${request.id}`,
        text: `Запрос администрации: ${unit?.name || "регион"}`,
        detail: `${unit?.name || "Административная единица"} просит 1 строительный слот для проекта «${project?.name || "завод"}» в регионе ${region?.name || request.regionId}. Стоимость: ${costText(project?.cost || {})}.`,
        kind: "administration",
        requestId: request.id,
      };
    });
    const otherNotices = (strategyState.turnNotifications || []).filter((notice) => notice.kind !== "administration");
    strategyState.turnNotifications = [...otherNotices, ...requestNotices].slice(-12);
    renderNotificationIcons();
  }

  function costText(cost) {
    const labels = { budget: "бюджет", steel: "сталь", oil: "нефть", rare: "редкие ресурсы", politicalPower: "ПП" };
    return Object.entries(cost).map(([key, value]) => `${value} ${labels[key] || key}`).join(" · ") || "без затрат";
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

  function markMapDirty() {
    if (gameData) gameData.mapDirty = true;
  }

  function shouldRefreshMapOnMonth() {
    if (!gameData) return false;
    if (gameData.mapDirty) return true;
    return relationMapMode || !["political"].includes(mapMode);
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

  function canArmyUseTerritory(countryId, hostId) {
    const sourceId = Number(countryId);
    const hostCountryId = Number(hostId);
    if (!sourceId || !hostCountryId) return false;
    if (sourceId === hostCountryId) return true;
    const hasPassage = strategyState?.accessTreaties.some((item) =>
      Number(item.from) === sourceId && Number(item.host) === hostCountryId
    );
    return Boolean(hasPassage || isAtWar(sourceId, hostCountryId));
  }

  function isSeaRegion(regionId) {
    return gameData?.regionTypeById?.get(Number(regionId)) === "sea";
  }

  function regionHasPort(runtime, regionId) {
    const profile = runtime?.regionProfiles?.[String(regionId)];
    return Boolean(profile?.navalAccess || profile?.buildings?.includes("port") || profile?.buildings?.includes("shipyard"));
  }

  function hasPortNear(runtime, regionId) {
    if (!runtime) return false;
    if (regionHasPort(runtime, regionId)) return true;
    return [...adjacentRegionIds(regionId)].some((neighborId) => regionHasPort(runtime, neighborId));
  }

  function canArmyMoveToRegion(runtime, army, regionId) {
    if (!runtime || !army || !regionId) return { ok: false, reason: "Нет армии или региона." };
    const targetId = Number(regionId);
    const currentId = Number(army.regionId);
    if (!regionsSharePixelBorder(currentId, targetId)) {
      return { ok: false, reason: "Нельзя двигаться: выбранный регион не имеет общей границы с текущим регионом армии." };
    }
    if (isSeaRegion(targetId)) {
      if (isSeaRegion(currentId) || hasPortNear(runtime, currentId)) return { ok: true, naval: true };
      return { ok: false, reason: "Для выхода в море нужен порт в текущем регионе или рядом." };
    }
    const targetOwner = ownerOfRegion(targetId);
    if (!targetOwner) return { ok: false, reason: "Нельзя двигаться в регион без владельца." };
    if (isSeaRegion(currentId) && !hasPortNear(strategyState.countryStates[String(targetOwner.id)], targetId) && !isAtWar(runtime.countryId, targetOwner.id)) {
      return { ok: false, reason: "Высадка с моря требует порта у цели или состояния войны." };
    }
    if (!hasMilitaryAccess(runtime.countryId, targetOwner.id) && !isAtWar(runtime.countryId, targetOwner.id)) {
      return { ok: false, reason: "Нельзя двигать армию: нет права прохода, союза или войны." };
    }
    return { ok: true, naval: isSeaRegion(currentId) };
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
    if (reward.territorialIntegrity && isRussiaCountry(country)) lockCurrentRussianTerritory(country);
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
    const updateOrganizationMembership = (value, joining) => {
      String(value || "").split(/[;|,]/).map((item) => item.trim()).filter(Boolean).forEach((organizationId) => {
        if (!setOrganizationMembership(runtime.countryId, organizationId, joining)) return;
        const organizationName = strategyState.organizations.find((item) => item.id === organizationId)?.name || organizationId;
        addLog(`${country?.name || "Страна"} ${joining ? "вступает в" : "выходит из"} организации «${organizationName}».`);
      });
    };
    if (reward.organizationLeave) updateOrganizationMembership(reward.organizationLeave, false);
    if (reward.organizationJoin) updateOrganizationMembership(reward.organizationJoin, true);
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
      String(reward.integrateCountry).split(/[,;]/).map((name) => name.trim()).filter(Boolean).forEach((targetName) => {
        const transferred = integrateCountryIntoActor(targetName, country.id);
        if (transferred) addLog(`Объединены территории страны ${targetName}: ${transferred} рег.`);
      });
    }
    if (reward.transferRegions && country) String(reward.transferRegions).split(/[|,;]/).map(Number).filter(Boolean).forEach((regionId) => transferRegionOwnership(regionId, country.id));
    if (reward.capitalRegion && country) {
      const regionId = Number(reward.capitalRegion);
      const controller = controllerOfRegion(regionId);
      if (regionId && (Number(controller?.id) === Number(country.id) || Number(ownerOfRegion(regionId)?.id) === Number(country.id))) {
        country.capitalRegionId = regionId;
        markMapDirty();
      }
    }
    if (reward.createCountry) {
      const [name, ids] = String(reward.createCountry).split(":");
      if (name && ids && createFocusCountry(name.trim(), ids.split(/[|,;]/))) addLog(`Создано государство: ${name.trim()}.`);
    }
    if (reward.politicalPowerDailyMultiplier) runtime.politicalPowerDailyMultiplier = Math.max(0.1, Number(reward.politicalPowerDailyMultiplier) || 1);
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
    markMapDirty();
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

  function designParts(kind, design = null) {
    const config = EQUIPMENT_DESIGN_OPTIONS[kind];
    const current = design || currentPlayerState()?.equipmentDesigns?.[kind] || DEFAULT_EQUIPMENT_DESIGNS[kind];
    if (!config) return [];
    return Object.entries(config.fields)
      .map(([field, options]) => options.find((option) => option.id === current[field]) || options[0])
      .filter(Boolean);
  }

  function designStats(kind, design = null) {
    return designParts(kind, design).reduce((stats, part) => {
      ["attack", "armor", "speed", "air", "naval", "reliability", "oil", "rare", "cost"].forEach((key) => {
        stats[key] = (stats[key] || 0) + Number(part[key] || 0);
      });
      return stats;
    }, { attack: 0, armor: 0, speed: 0, air: 0, naval: 0, reliability: 0, oil: 0, rare: 0, cost: 0 });
  }

  function designKindFromDesign(design) {
    if (design?.hull) return "ship";
    if (design?.frame) return "aircraft";
    return "tank";
  }

  function designPower(design) {
    const kind = designKindFromDesign(design);
    const stats = designStats(kind, design);
    return Math.max(0.7, 1 + (stats.attack + stats.armor + stats.air + stats.naval + stats.speed + stats.reliability) / 18);
  }

  function designStatsText(kind, design = null) {
    const stats = designStats(kind, design);
    const parts = [];
    if (stats.attack) parts.push(`атака ${stats.attack}`);
    if (stats.armor) parts.push(`броня ${stats.armor}`);
    if (stats.air) parts.push(`воздух ${stats.air}`);
    if (stats.naval) parts.push(`флот ${stats.naval}`);
    if (stats.speed) parts.push(`скорость ${stats.speed > 0 ? "+" : ""}${stats.speed}`);
    if (stats.reliability) parts.push(`надежность +${stats.reliability}`);
    if (stats.oil) parts.push(`нефть +${stats.oil}`);
    if (stats.rare) parts.push(`редкие +${stats.rare}`);
    return parts.join(" · ") || "базовые характеристики";
  }

  function saveEquipmentDesign(kind) {
    const runtime = currentPlayerState();
    const config = EQUIPMENT_DESIGN_OPTIONS[kind];
    if (!runtime || !config) return;
    const next = {};
    Object.keys(config.fields).forEach((field) => {
      next[field] = document.getElementById(`design-${kind}-${field}`)?.value || DEFAULT_EQUIPMENT_DESIGNS[kind][field];
    });
    const stats = designStats(kind, next);
    const budgetCost = 18 + stats.cost;
    const rareCost = Math.max(0, Math.round(stats.rare || 0));
    if (runtime.budget < budgetCost || runtime.resources.rare < rareCost) {
      addLog(`Недостаточно ресурсов для изменения проекта: нужно ${budgetCost} бюджета${rareCost ? ` и ${rareCost} редких ресурсов` : ""}.`);
      renderStrategyPanel();
      return;
    }
    runtime.budget -= budgetCost;
    runtime.resources.rare -= rareCost;
    runtime.equipmentDesigns[kind] = next;
    addLog(`Проект обновлен: ${config.label}. ${designStatsText(kind, next)}.`);
    renderStrategyPanel();
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
    organizationLeave: ["organizationleave", "leaveorganization", "выйтиизорганизации", "выходизорганизации"],
    organizationJoin: ["organizationjoin", "joinorganization", "вступитьворганизацию", "вступлениеворганизацию"],
    transferRegions: ["transferregions", "передатьрегионы", "контрольрегионов"],
    createCountry: ["createcountry", "создатьстрану", "признатьстрану"],
    politicalPowerDailyMultiplier: ["politicalpowerdailymultiplier", "множительполитвласти"],
    capitalRegion: ["capitalregion", "столицарегион", "перенестистолицу"],
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

  async function preloadScenarioFocusTrees(scenario) {
    if (!scenario?.countries?.length) return;
    await loadFocusManifest();
    const scenarioYear = scenario.year || selectedScenario?.year || PLAYABLE_SCENARIO_YEAR;
    const names = [...new Set(scenario.countries
      .map((country) => country?.name)
      .filter((name) => csvFocusAvailable.has(focusCsvKey(name, scenarioYear))))];
    await Promise.all(names.map((name) => loadCsvFocusTree(name, scenarioYear)));
  }

  // A formed nation changes its displayed name, but its national focus tree
  // belongs to the country that started the campaign. The runtime keeps this
  // stable origin name in saves as well as during the current session.
  function focusTreeCountryName(country) {
    const runtime = strategyState?.countryStates?.[String(country?.id)];
    return runtime?.originCountryName || country?.focusCountryName || country?.name || "";
  }

  function getFocusTree(country, scenarioYear) {
    const focusCountryName = focusTreeCountryName(country);
    const csvTree = csvFocusTrees.get(focusCsvKey(focusCountryName, scenarioYear));
    const majorTree = Number(scenarioYear) === 2026
      ? (MAJOR_FOCUS_TREES[focusCountryName] || (isRussiaCountry(country) ? MAJOR_FOCUS_TREES["Россия"] : null))
      : null;
    const base = csvTree || majorTree;
    if (!base) return [];
    const source = base.map((focus) => ({ ...focus }));
    if (Number(scenarioYear) === 2026 && isRussiaCountry(country) && !source.some((focus) => focus.id === "territorial-integrity")) {
      source.push(
        { id: "territorial-commission", name: "Комиссия государственных границ", text: "Собрать единый реестр российских регионов и подготовить правовую основу для их защиты.", reward: { politicalPower: 20, stability: 2 }, x: 1, y: 1, requires: [], days: 3 },
        { id: "territorial-framework", name: "Правовой контур рубежей", text: "Закрепить территориальные гарантии в государственных документах и оборонном планировании.", reward: { commandPower: 20, stability: 3, factories: 1 }, x: 1, y: 2, requires: ["territorial-commission"], days: 3 },
        { id: "territorial-integrity", name: "Закрепить территориальную целостность", text: "Закрепить за Россией все регионы, которыми она владеет сейчас. Фокус можно проходить повторно после новых войн.", reward: { territorialIntegrity: 1, politicalPower: 12, stability: 1 }, x: 1, y: 3, requires: ["territorial-framework"], repeatable: true, days: 3 },
      );
    }
    return source.map((focus) => ({
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
    const focusCountryName = focusTreeCountryName(country);
    const key = focusCsvKey(focusCountryName, scenarioYear);
    return Boolean(csvFocusTrees.has(key) ||
      csvFocusAvailable.has(key) ||
      (Number(scenarioYear) === 2026 && MAJOR_FOCUS_TREES[focusCountryName]));
  }

  function focusIdFor(country, rawId) {
    return `${country.id}-${rawId}`;
  }

  function availableFormables(country, runtime) {
    if (!country || !runtime) return [];
    const originName = runtime.originCountryName || country.name;
    return Object.entries(FORMABLE_NATIONS)
      .filter(([, formable]) => formable.requiredCountry === originName || formable.requiredCountries?.includes(originName))
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
    const statuses = formable.requiredFocus
      ? [{
        ok: runtime.completedFocuses.includes(focusIdFor(player, formable.requiredFocus)),
        text: `Завершить фокус: ${formable.requiredFocus}`,
      }]
      : [];
    if (requirements.focusAny?.length) {
      const completed = requirements.focusAny.filter((focusId) => runtime.completedFocuses.includes(focusIdFor(player, focusId)));
      statuses.push({
        ok: completed.length > 0,
        text: requirements.focusAnyLabel || `Завершить один из фокусов: ${requirements.focusAny.join(" или ")}`,
      });
    }
    if (requirements.formedNationAny?.length) {
      statuses.push({ ok: requirements.formedNationAny.includes(runtime.formedNation), text: "Сформировать Югославию" });
    }
    if (requirements.ideology) {
      const ideology = IDEOLOGY_OPTIONS.find((item) => item.id === requirements.ideology);
      statuses.push({
        ok: runtime.ideology === requirements.ideology,
        text: `Курс власти: ${ideology?.name || requirements.ideology}`,
      });
    }
    if (requirements.ideologyAny?.length) {
      const ideologyNames = requirements.ideologyAny
        .map((id) => IDEOLOGY_OPTIONS.find((item) => item.id === id)?.name || id)
        .join(" или ");
      statuses.push({
        ok: requirements.ideologyAny.includes(runtime.ideology),
        text: `Курс власти: ${ideologyNames}`,
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
    (requirements.controlRegions || []).forEach((regionId) => {
      const region = gameData?.regionById?.get(Number(regionId));
      const controller = controllerOfRegion(regionId);
      statuses.push({
        ok: Number(controller?.id) === Number(runtime.countryId) || Number(ownerOfRegion(regionId)?.id) === Number(runtime.countryId),
        text: `Контролировать регион: ${region?.name || regionId}`,
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
    runtime.activeFocuses = runtime.activeFocuses.filter((item, index, list) => item?.id && list.findIndex((candidate) => candidate.id === item.id) === index);
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
    if (runtime.completedFocuses.includes(focus.id) && !focus.repeatable) return;
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
    if (!runtime || !focus || (runtime.completedFocuses.includes(focus.id) && !focus.repeatable)) return false;
    if (!focus.repeatable) runtime.completedFocuses.push(focus.id);
    applyFocusReward(runtime, focus.reward);
    if (focus.blocksBranches?.length) {
      runtime.blockedFocusBranches = [...new Set([...(runtime.blockedFocusBranches || []), ...focus.blocksBranches])];
    }
    addLog(`${prefix}: ${focus.name}.`);
    return true;
  }

  function lockCurrentRussianTerritory(country) {
    if (!country || !isRussiaCountry(country) || !gameData?.protectedRussianRegionIds) return 0;
    const protectedRegions = gameData.protectedRussianRegionIds;
    const newlyProtected = (country.regionIds || []).map(Number).filter((regionId) => !protectedRegions.has(regionId));
    newlyProtected.forEach((regionId) => protectedRegions.add(regionId));
    const newlyProtectedSet = new Set(newlyProtected);
    if (newlyProtectedSet.size) {
      gameData.scenario.occupations = (gameData.scenario.occupations || []).filter((occupation) => {
        const regionId = Number(occupation.regionId);
        const owner = ownerOfRegion(regionId);
        const remove = newlyProtectedSet.has(regionId) && owner && Number(occupation.controllerCountryId) !== Number(owner.id);
        if (remove) delete strategyState.occupationPolicies[String(regionId)];
        return !remove;
      });
      markMapDirty();
      addLog(`Фокус закрепил за Россией ${newlyProtected.length} новых регионов. Они больше не могут быть переданы или оккупированы.`);
    } else {
      addLog("Фокус территориальной целостности не обнаружил новых регионов для закрепления.");
    }
    return newlyProtected.length;
  }

  function completeFocusIfReady(runtime, player) {
    const activeFocuses = getActiveFocuses(runtime);
    if (!activeFocuses.length) return;
    const focuses = getFocusTree(player, gameData.scenario.year);
    let completedAny = false;
    const remainingFocuses = [];
    activeFocuses.forEach((activeFocus) => {
      const focus = focuses.find((item) => item.id === activeFocus.id);
      if (!focus) {
        remainingFocuses.push(activeFocus);
        return;
      }
      activeFocus.progress += 1;
      if (activeFocus.progress < focus.days) {
        remainingFocuses.push(activeFocus);
        return;
      }
      completeFocusResult(runtime, focus);
      const randomTargets = (focus.randomCompletions || [])
        .map((id) => focuses.find((item) => item.id === id))
        .filter((item) => item && !runtime.completedFocuses.includes(item.id));
      if (randomTargets.length) {
        const selected = randomTargets[Math.floor(Math.random() * randomTargets.length)];
        completeFocusResult(runtime, selected, "Случайный исход");
      }
      completedAny = true;
    });
    runtime.activeFocuses = remainingFocuses;
    syncLegacyFocus(runtime);
    if (completedAny && Number(runtime.countryId) === Number(strategyState.playerCountryId)) playSound("focus");
  }

  function canAiStartFocus(runtime, focus) {
    if (!runtime || !focus || !isFocusDateAvailable(focus)) return false;
    if (focus.branch && (runtime.blockedFocusBranches || []).includes(focus.branch)) return false;
    if (runtime.completedFocuses.includes(focus.id) && !focus.repeatable) return false;
    if (getActiveFocuses(runtime).some((activeFocus) => activeFocus.id === focus.id)) return false;
    if (getActiveFocuses(runtime).length >= maxActiveFocuses(runtime)) return false;
    return focus.requires.every((id) => runtime.completedFocuses.includes(id));
  }

  function aiFocusScore(country, runtime, focus) {
    const reward = focus.reward || {};
    let score = 20 - Math.min(16, Number(focus.days || 70) / 14);
    score += Number(reward.factories || 0) * 7 + Number(reward.gdp || 0) * 0.8;
    score += Number(reward.stability || 0) * 2 + Number(reward.warSupport || 0) * 0.8;
    score += Number(reward.politicalPower || 0) * 0.22 + Number(reward.commandPower || 0) * 0.15;
    score += Number(reward.organizationJoin ? 10 : 0) + Number(reward.organizationLeave ? 7 : 0);
    score += Number(reward.integrateCountry ? 28 : 0) + Number(reward.formedNation ? 30 : 0);
    if (/livoni|югослав|балкан|велик.*княжеств/i.test(`${focus.rawId || ""} ${focus.name || ""}`)) score += 24;
    if (isCountryAtWar(country.id)) score += Number(reward.commandPower || 0) * 0.8 + Number(reward.warSupport || 0) * 0.9;
    return score + (hashNumber(`${country.id}:${focus.rawId || focus.id}:${strategyState.date.toISOString().slice(0, 7)}`) % 18);
  }

  function aiMaybeStartFocuses(country, runtime) {
    const focuses = getFocusTree(country, gameData.scenario.year);
    if (!focuses.length) return;
    while (getActiveFocuses(runtime).length < maxActiveFocuses(runtime)) {
      const focus = focuses
        .filter((item) => canAiStartFocus(runtime, item))
        .map((item) => ({ item, score: aiFocusScore(country, runtime, item) }))
        .sort((left, right) => right.score - left.score)[0]?.item;
      if (!focus) return;
      runtime.activeFocuses.push({ id: focus.id, progress: 0 });
      syncLegacyFocus(runtime);
      addLog(`ИИ начал фокус: ${country.name} — ${focus.name}.`);
    }
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
      profile.supplyCapacity += template.effects.supplyCapacity || 0;
      profile.airCapacity += template.effects.airCapacity || 0;
      profile.navalCapacity += template.effects.navalCapacity || 0;
      profile.navalAccess += template.effects.navalAccess || 0;
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
    const politicalPowerMultiplier = Number(runtime.politicalPowerDailyMultiplier) || 1;
    runtime.politicalPower += (1 + runtime.modifiers.politicalPowerDaily) * politicalPowerMultiplier;
    runtime.commandPower = clamp(runtime.commandPower + 1, 0, 100);
    const economyLaw = LAW_GROUPS.economy.options.find((item) => item.id === runtime.laws.economy);
    const consumerGoods = economyLaw?.effects.consumerGoods ?? 0.25;
    const atWar = strategyState.wars.some((war) => war.active && (Number(war.attackerId) === Number(runtime.countryId) || Number(war.defenderId) === Number(runtime.countryId)));
    const warTreasuryMultiplier = atWar ? 1.35 : 1;
    runtime.budget += Math.max(1.5, runtime.gdp * runtime.taxRate / 26000 * (1 - consumerGoods * 0.35) * warTreasuryMultiplier);
    runtime.manpower += Math.max(0, Math.round(runtime.population * runtime.modifiers.recruitable / 3650));
    if (country) updateDemocracy(runtime, country);
    if (strategyState.date.getDate() !== 1) return;
    runtime.politicalPower += (8 + Math.floor(runtime.stability / 25)) * politicalPowerMultiplier;
    const output = 1 + runtime.modifiers.factoryOutput;
    const resourceGain = 1 + runtime.modifiers.resourceGain;
    runtime.gdp = Math.max(1, Math.round(runtime.gdp * (1 + (runtime.stability - 45) / 12000) + runtime.factories * 0.15 * output));
    const currency = CURRENCY_POLICIES.find((item) => item.id === runtime.currencyPolicy) || CURRENCY_POLICIES[0];
    runtime.resources.food += Math.round((hasTechnology(runtime, "agrotech") ? 16 : 8) * resourceGain);
    runtime.resources.steel += Math.max(2, Math.floor(runtime.factories / 2 * resourceGain));
    runtime.resources.oil += Math.max(2, Math.floor(runtime.factories / 3 * resourceGain));
    runtime.resources.rare += Math.max(1, Math.floor(runtime.factories / 5 * resourceGain));
    const foreignYield = runtime.foreignAssets.filter((asset) => !asset.seized).reduce((sum, asset) => sum + asset.value, 0);
    const assetPenalty = clamp(Number(runtime.sanctionForeignAssetPenalty || 0), 0, 0.9);
    runtime.budget += Math.max(0, foreignYield * (1 - assetPenalty) / 80);
    runtime.gdp = Math.round(runtime.gdp * (1 + currency.trade / 500));
    runtime.resources.food = Math.max(0, runtime.resources.food - Math.max(1, Math.round(runtime.manpower / 260)));
    applyRegionalMinisters(runtime);
    updateMacroIndicators(runtime);
  }

  function applyRegionalMinisters(runtime) {
    const atWar = strategyState.wars.some((war) => war.active && (Number(war.attackerId) === Number(runtime.countryId) || Number(war.defenderId) === Number(runtime.countryId)));
    const treasuryReserve = atWar ? 25 : 0;
    Object.values(runtime.regionProfiles).forEach((profile) => {
      const minister = REGION_MINISTERS.find((item) => item.id === profile.minister) || REGION_MINISTERS[0];
      if (!profile.governor) return;
      if (!minister.budgetShare || runtime.budget <= treasuryReserve + 1) return;
      const spend = Math.min(Math.max(0, runtime.budget - treasuryReserve), Math.max(1, profile.economy * minister.budgetShare));
      runtime.budget -= spend;
      profile.ministerBudget += spend;
      profile.economy += minister.effects.economy || 0;
      profile.gdp += minister.effects.gdp || spend / 20;
      profile.population += Math.round(profile.population * (minister.effects.population || 0) / 12);
      Object.keys(RESOURCE_LABELS).forEach((resource) => {
      profile.resources[resource] += minister.effects[resource] || 0;
      });
      runtime.gdp += spend / 30;
      const education = GOVERNOR_EDUCATIONS.find((item) => item.id === profile.governor.education) || GOVERNOR_EDUCATIONS[0];
      profile.economy += education.effects.economy || 0;
      profile.gdp += education.effects.gdp || 0;
      profile.resources.food += education.effects.food || 0;
      profile.resources.steel += education.effects.steel || 0;
      profile.population += Math.round(profile.population * (education.effects.population || 0));
      profile.supplyCapacity += Math.round((profile.supplyCapacity || 0) * (education.effects.supply || 0));
      profile.governor.approval = clamp(profile.governor.approval + (minister.id === "governor" ? 0.15 : 0.05) - (spend > runtime.budget * 0.35 ? 0.08 : 0), 0, 100);
    });
  }

  function advanceArmies() {
    let changed = false;
    allCountryStates().forEach((runtime) => {
      runtime.armies.forEach((army) => {
        if (!army.movingTo) return;
        army.eta -= 1;
        army.readiness = clamp(army.readiness - 0.4, 5, 100);
        if (army.eta > 0) return;
        army.regionId = Number(army.movingTo);
        if (Array.isArray(army.route) && Number(army.route[0]) === Number(army.regionId)) army.route.shift();
        army.movingTo = army.route?.length ? Number(army.route[0]) : null;
        army.eta = 0;
        if (army.movingTo) army.eta = 1;
        else army.order = "";
        army.readiness = clamp(army.readiness + 6, 0, 100);
        changed = true;
        const owner = ownerOfRegion(army.regionId);
        const alreadyOccupied = (gameData.scenario.occupations || []).some((occupation) => Number(occupation.regionId) === Number(army.regionId));
        if (owner && Number(owner.id) !== Number(runtime.countryId) && isAtWar(runtime.countryId, owner.id) && !alreadyOccupied && canAutoTargetRegion(army.regionId, runtime.countryId)) {
          gameData.scenario.occupations.push({ regionId: Number(army.regionId), controllerCountryId: Number(runtime.countryId) });
          markMapDirty();
          if (Number(runtime.countryId) === Number(strategyState.playerCountryId)) addLog(`${army.name} заняла регион.`);
        }
        if (!army.movingTo && Number(runtime.countryId) === Number(strategyState.playerCountryId)) {
          addLog(`${army.name} прибыла в регион.`);
        }
      });
    });
    return changed;
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

  function bestFrontRecruitRegion(country, runtime, enemy, minimumSoldiers = 500) {
    if (!enemy?.regionIds?.length) return bestRecruitRegion(country, runtime, minimumSoldiers);
    const enemyRegions = new Set(enemy.regionIds.map(Number));
    const frontline = (country.regionIds || [])
      .map((regionId) => ({ regionId: Number(regionId), profile: runtime.regionProfiles[String(regionId)] }))
      .filter((item) => item.profile && item.profile.readySoldiers >= minimumSoldiers)
      .filter((item) => [...adjacentRegionIds(item.regionId)].some((neighbor) => enemyRegions.has(Number(neighbor))))
      .sort((a, b) => b.profile.readySoldiers - a.profile.readySoldiers);
    return frontline[0] || bestRecruitRegion(country, runtime, minimumSoldiers);
  }

  function createAutomatedArmy(country, runtime, minister = null) {
    const minimum = minister?.mode === "mobilization" ? 250 : minister?.mode === "aggressive" ? 300 : 400;
    const activeWar = strategyState.wars.find((war) => war.active && (Number(war.attackerId) === Number(country.id) || Number(war.defenderId) === Number(country.id)));
    const enemyId = activeWar ? (Number(activeWar.attackerId) === Number(country.id) ? activeWar.defenderId : activeWar.attackerId) : null;
    const picked = bestFrontRecruitRegion(country, runtime, countryById(enemyId), minimum);
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
      order: "",
      lastSupply: runtime.supply?.level || 100,
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

  function regionsSharePixelBorder(firstRegionId, secondRegionId) {
    return adjacentRegionIds(firstRegionId).has(Number(secondRegionId));
  }

  function armyRoute(runtime, army, targetRegionId, allowNaval = false) {
    const start = Number(army?.regionId);
    const target = Number(targetRegionId);
    if (!runtime || !start || !target || isSeaRegion(target)) return null;
    const canUseFleet = allowNaval && Number(runtime.navyPower || 0) > 0;
    if (isSeaRegion(start) && !canUseFleet) return null;
    if (start === target) return [];
    const queue = [start];
    const previous = new Map([[start, null]]);
    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of adjacentRegionIds(current)) {
        const id = Number(neighbor);
        if (previous.has(id) || isAntarcticRegion(id)) continue;
        if (isSeaRegion(id)) {
          if (!canUseFleet || (!isSeaRegion(current) && !hasPortNear(runtime, current))) continue;
          previous.set(id, current);
          queue.push(id);
          continue;
        }
        const owner = ownerOfRegion(id);
        if (isSeaRegion(current)) {
          const targetRuntime = owner ? strategyState.countryStates[String(owner.id)] : null;
          if (!hasPortNear(targetRuntime, id) && !isAtWar(runtime.countryId, owner?.id)) continue;
        }
        const traversable = owner && canArmyUseTerritory(runtime.countryId, owner.id);
        if (!traversable) continue;
        previous.set(id, current);
        if (id === target) {
          const route = [];
          let step = target;
          while (step !== null && step !== start) {
            route.unshift(step);
            step = previous.get(step);
          }
          return route;
        }
        queue.push(id);
      }
    }
    return null;
  }

  function setArmyRoute(runtime, army, targetRegionId, source = "manual", allowNaval = false) {
    const route = armyRoute(runtime, army, targetRegionId, allowNaval);
    if (!route?.length) return false;
    army.route = route;
    army.movingTo = Number(route[0]);
    army.eta = 1;
    const routeNames = route.map((id) => gameData.regionById.get(Number(id))?.name || id);
    army.order = `${source === "general" ? "Приказ генерала" : "Маршрут"}: ${routeNames.join(" → ")}`;
    return true;
  }

  function commandGeneralArmies() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const general = runtime?.characters?.find((item) => item.id === runtime.activeGeneralId && item.active && item.role === "Генерал");
    const war = strategyState?.wars?.find((item) => item.active && (Number(item.attackerId) === Number(player?.id) || Number(item.defenderId) === Number(player?.id)));
    if (!player || !runtime || !general || !war) return;
    const enemyId = Number(war.attackerId) === Number(player.id) ? Number(war.defenderId) : Number(war.attackerId);
    const enemy = countryById(enemyId);
    if (!enemy) return;
    const desiredArmies = Math.max(3, Math.ceil((player.regionIds || []).length / 45) + 3);
    if (runtime.armies.length < desiredArmies) {
      const recruitRegion = bestFrontRecruitRegion(player, runtime, enemy, 100);
      const newArmy = recruitRegion ? recruitArmy(recruitRegion.regionId, { silent: true }) : null;
      if (newArmy) addLog(`${general.name} сформировал ${newArmy.name} и готовит её к отправке на фронт.`);
    }
    runtime.armies.filter((army) => !army.movingTo).forEach((army) => {
      const targetRegionId = frontTargetRegions(player, enemy, 12, army)[0];
      if (targetRegionId && setArmyRoute(runtime, army, targetRegionId, "general")) addLog(`${general.name} направил ${army.name} к фронту.`);
    });
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

  function frontTargetRegions(country, enemy, limit = 8, army = null, allowNaval = false) {
    if (!enemy) return [];
    const occupied = new Set((gameData.scenario.occupations || []).map((occupation) => Number(occupation.regionId)));
    const controlled = controlledRegionSet(country.id);
    const armyAdjacent = army ? adjacentRegionIds(army.regionId) : new Set();
    const targetable = (enemy.regionIds || [])
      .map(Number)
      .filter((regionId) => !occupied.has(regionId) && canAutoTargetRegion(regionId, country.id));
    if (army) {
      return targetable
        .map((regionId) => ({
          regionId,
          route: armyAdjacent.has(regionId)
            ? [regionId]
            : armyRoute(strategyState.countryStates[String(country.id)], army, regionId, allowNaval),
        }))
        .filter((item) => item.route?.length && !isSeaRegion(army.regionId) && !isSeaRegion(item.regionId))
        .sort((a, b) => {
          return a.route.length - b.route.length;
        })
        .slice(0, limit)
        .map((item) => item.regionId);
    }
    const borderTargets = targetable.filter((regionId) => {
      const neighbors = adjacentRegionIds(regionId);
      return [...neighbors].some((neighborId) => controlled.has(Number(neighborId)));
    });
    return borderTargets.slice(0, limit);
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
    markMapDirty();
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
      const targetRegions = frontTargetRegions(country, enemy, Math.max(ordersPerTick * 3, 10), army, true);
      const targetRegion = targetRegions.find((regionId) => !assignedTargets.has(regionId)) || targetRegions[0];
      if (!targetRegion) return;
      assignedTargets.add(Number(targetRegion));
      const routed = setArmyRoute(runtime, army, targetRegion, "general", true);
      if (!routed) return;
      army.order = `Фронт против ${enemy?.name || "противника"}`;
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

  function chooseAiAgenda(country, runtime) {
    const coastal = (country.regionIds || []).some((regionId) => hasPortNear(runtime, regionId));
    if (coastal && (runtime.factories || 0) >= 12) return "maritime";
    if (isDemocraticIdeology(runtime.ideology) || (runtime.gdp || 0) >= 380) return "trade";
    if (["national", "military_junta", "monarchist"].includes(runtime.ideology) && (runtime.warSupport || 0) >= 42) return "revisionist";
    if ((country.regionIds || []).length >= 18) return "regional";
    return "security";
  }

  function agendaFor(runtime) {
    return AI_AGENDAS.find((agenda) => agenda.id === runtime?.aiAgenda) || AI_AGENDAS[0];
  }

  function warGoalFor(war) {
    return WAR_GOALS.find((goal) => goal.id === war?.goal) || WAR_GOALS[0];
  }

  function enemyForWar(war, countryId) {
    if (!war) return null;
    return Number(war.attackerId) === Number(countryId) ? Number(war.defenderId) : Number(war.attackerId);
  }

  function navalStrengthAgainst(countryId, targetId) {
    const runtime = strategyState.countryStates[String(countryId)];
    const targetRuntime = strategyState.countryStates[String(targetId)];
    const ownMission = runtime?.navalMission;
    const targetMission = targetRuntime?.navalMission;
    const own = Number(runtime?.navyPower || 0) * (ownMission?.type === "blockade" && Number(ownMission.targetId) === Number(targetId) ? 1.25 : 1);
    const defense = Number(targetRuntime?.navyPower || 0) * (targetMission?.type === "escort" ? 1.2 : 1);
    return { own, defense, ratio: own / Math.max(1, defense) };
  }

  function activeBlockadesAgainst(targetId) {
    return allCountryStates().filter((runtime) => {
      const mission = runtime.navalMission;
      return mission?.type === "blockade" && Number(mission.targetId) === Number(targetId) &&
        Number(runtime.navyPower || 0) > 0 && isAtWar(runtime.countryId, targetId) && navalStrengthAgainst(runtime.countryId, targetId).ratio >= 1;
    });
  }

  function applyNavalOperations() {
    allCountryStates().forEach((runtime) => {
      const mission = runtime.navalMission;
      if (!mission || Number(runtime.navyPower || 0) <= 0) return;
      const target = countryById(mission.targetId);
      const targetRuntime = strategyState.countryStates[String(mission.targetId)];
      if (!target || !targetRuntime || !isAtWar(runtime.countryId, target.id)) return;
      const strength = navalStrengthAgainst(runtime.countryId, target.id);
      if (mission.type === "blockade" && strength.ratio >= 1) {
        const pressure = clamp((strength.ratio - 0.7) * 0.18, 0.05, 0.45);
        targetRuntime.budget = Math.max(0, targetRuntime.budget - pressure * 2.2);
        targetRuntime.stability = clamp(targetRuntime.stability - pressure * 0.08, 0, 100);
        targetRuntime.warSupport = clamp(targetRuntime.warSupport - pressure * 0.1, 0, 100);
        targetRuntime.blockadePressure = clamp(Number(targetRuntime.blockadePressure || 0) + pressure, 0, 100);
      }
      if (mission.type === "escort") runtime.blockadePressure = Math.max(0, Number(runtime.blockadePressure || 0) - 0.12);
    });
    strategyState.trades.forEach((trade) => {
      const fromBlockaded = activeBlockadesAgainst(trade.from).length > 0;
      const toBlockaded = activeBlockadesAgainst(trade.to).length > 0;
      trade.blockadeEfficiency = fromBlockaded || toBlockaded ? 0.45 : 1;
    });
  }

  function warProgressScore(war, countryId) {
    const enemyId = enemyForWar(war, countryId);
    const enemy = countryById(enemyId);
    const runtime = strategyState.countryStates[String(countryId)];
    if (!enemy || !runtime) return 0;
    const occupied = occupiedRegionsControlledBy(countryId, enemyId).length;
    const lost = (gameData.scenario.occupations || []).filter((item) => Number(ownerOfRegion(item.regionId)?.id) === Number(countryId) && Number(item.controllerCountryId) === Number(enemyId)).length;
    const capital = Number(controllerOfRegion(enemy.capitalRegionId)?.id) === Number(countryId) ? 25 : 0;
    const blockade = activeBlockadesAgainst(enemyId).some((item) => Number(item.countryId) === Number(countryId)) ? Math.min(25, Number(strategyState.countryStates[String(enemyId)]?.blockadePressure || 0) * 2) : 0;
    return Math.round(occupied * 12 + capital + blockade - lost * 14 + (runtime.warSupport - 50) / 5);
  }

  function warGoalAchieved(war, countryId) {
    const goal = warGoalFor(war);
    const enemyId = enemyForWar(war, countryId);
    const occupied = occupiedRegionsControlledBy(countryId, enemyId).length;
    if (goal.id === "blockade") return activeBlockadesAgainst(enemyId).some((item) => Number(item.countryId) === Number(countryId)) && Number(strategyState.countryStates[String(enemyId)]?.blockadePressure || 0) >= 12;
    return occupied >= goal.occupationNeed && warProgressScore(war, countryId) >= goal.scoreNeed;
  }

  function navalZoneOptions() {
    return (gameData?.map?.regions || []).filter((region) => region.type === "sea").slice(0, 180)
      .map((region) => `<option value="${region.id}">${region.name || `Морская зона ${region.id}`}</option>`).join("");
  }

  function setNavalMission(type, targetId, seaRegionId = null) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    if (!runtime || !target || Number(runtime.navyPower || 0) <= 0) {
      addLog("Для морской операции нужен построенный флот.");
      renderStrategyPanel();
      return;
    }
    if (!isAtWar(strategyState.playerCountryId, target.id)) {
      addLog("Блокада и эскорт доступны только против страны, с которой идет война.");
      renderStrategyPanel();
      return;
    }
    const zone = gameData.regionById.get(Number(seaRegionId));
    runtime.navalMission = { type, targetId: Number(target.id), seaRegionId: zone?.type === "sea" ? Number(seaRegionId) : null, started: strategyState.date.toISOString().slice(0, 10) };
    addLog(`${type === "blockade" ? "Флот начал блокаду" : "Флот назначен на эскорт"}: ${target.name}${zone ? ` · зона ${zone.name || zone.id}` : ""}.`);
    renderStrategyPanel();
  }

  function clearNavalMission() {
    const runtime = currentPlayerState();
    if (!runtime?.navalMission) return;
    runtime.navalMission = null;
    addLog("Морская операция прекращена.");
    renderStrategyPanel();
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
    const agenda = attackerRuntime.aiAgenda || chooseAiAgenda(attacker, attackerRuntime);
    const agendaBonus = agenda === "revisionist" ? 30 : agenda === "regional" && sharedBorder ? 16 : agenda === "security" ? -24 : agenda === "trade" ? -16 : agenda === "maritime" ? 6 : 0;
    return hostility + powerBalance + borderBonus + randomTension + agendaBonus - activeWars * 25 - democracyCooldown;
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
    if (runtime.aiAgenda === "maritime") weights.set("logistics", 95);
    if (runtime.aiAgenda === "trade") weights.set("automation", 110);
    if (runtime.aiAgenda === "security") weights.set("cyber", 88);
    return available
      .map((project) => ({ project, score: (weights.get(project.id) || 25) + hashNumber(`${country.id}:${project.id}:${strategyState.date.toISOString().slice(0, 7)}`) % 12 }))
      .sort((a, b) => b.score - a.score)[0]?.project || null;
  }

  function aiRebalanceProduction(country, runtime) {
    const atWar = isCountryAtWar(country.id);
    const coastal = (country.regionIds || []).some((regionId) => hasPortNear(runtime, regionId));
    const weights = atWar
      ? { infantry: 3, armor: 2, air: 1, ship: coastal ? 1 : 0.2, civilian: 1 }
      : isDemocraticIdeology(runtime.ideology)
        ? { infantry: 1, armor: 0.4, air: 0.6, ship: coastal ? 0.7 : 0.1, civilian: 3 }
        : { infantry: 2, armor: 1, air: 0.8, ship: coastal ? 0.6 : 0.1, civilian: 2 };
    if (runtime.aiAgenda === "maritime" && coastal) weights.ship += atWar ? 2.5 : 2;
    if (runtime.aiAgenda === "trade") weights.civilian += 1.5;
    if (runtime.aiAgenda === "security") weights.infantry += 1;
    const total = Math.max(1, runtime.factories);
    const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
    const nextPlan = [
      ["infantry", Math.max(1, Math.round(total * (weights.infantry / weightTotal)))],
      ["armor", Math.max(0, Math.round(total * (weights.armor / weightTotal)))],
      ["air", Math.max(0, Math.round(total * (weights.air / weightTotal)))],
      ["ship", Math.max(0, Math.round(total * (weights.ship / weightTotal)))],
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
    if (runtime.aiAgenda === "trade" || isDemocraticIdeology(runtime.ideology)) {
      if (best.relation < 15) return;
      setRelation(country.id, best.candidate.id, clamp(best.relation + 3, -100, 100));
      if (best.relation > 35 && !runtime.allies.includes(Number(best.candidate.id))) addAlliance(strategyState, country.id, best.candidate.id);
      return;
    }
    if (runtime.aiAgenda !== "revisionist" && runtime.politicalPower > 120 && best.relation >= 0) {
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
      .filter((country) => Number(country.id) !== Number(strategyState.playerCountryId) && country.regionIds?.length && !strategyState.countryStates[String(country.id)]?.capitulated)
      .map((attacker) => {
        const target = gameData.scenario.countries
          .filter((country) => Number(country.id) !== Number(attacker.id) && country.regionIds?.length && !strategyState.countryStates[String(country.id)]?.capitulated)
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
        goal: strategyState.countryStates[String(attacker.id)]?.aiAgenda === "maritime" ? "blockade" : strategyState.countryStates[String(attacker.id)]?.aiAgenda === "revisionist" ? "conquest" : "border",
      });
      const attackerRuntime = strategyState.countryStates[String(attacker.id)];
      if (attackerRuntime?.aiAgenda === "maritime" && Number(attackerRuntime.navyPower || 0) > 0) attackerRuntime.navalMission = { type: "blockade", targetId: Number(defender.id), started: strategyState.date.toISOString().slice(0, 10) };
      aiAlliesImposeSanctions(attacker.id, defender.id);
      activateGuaranteesForWar(attacker.id, defender.id);
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
      // В войнах игрока союзники не подключаются автоматически: игрок сам
      // решает, кого приглашать через дипломатическое действие.
      if (Number(attacker.id) === Number(strategyState.playerCountryId) || Number(defender.id) === Number(strategyState.playerCountryId)) return;
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
      negotiationDate: strategyState.date.toISOString().slice(0, 10),
      scheduled: false,
      participants: group.participants,
      warIds: group.warIds,
      demands: generateBotPeaceDemands(group),
      mediator: null,
      title: "Мирный договор",
    };
    conference.demands.forEach(applyPeaceDemand);
    const clearedOccupations = clearPeaceOccupations(group.participants);
    conference.warIds.forEach((warIndex) => {
      if (strategyState.wars[warIndex]) strategyState.wars[warIndex].active = false;
    });
    const proposer = countryById(proposerId);
    addLog(`${proposer?.name || "ИИ"} подписала мирный договор. Связанная война завершена, снято оккупаций: ${clearedOccupations}.`);
    markMapDirty();
    if (!advancingDay) renderGameMap();
  }

  function yieldToUi() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  async function yieldEvery(index, chunkSize = 12) {
    if (index > 0 && index % chunkSize === 0) await yieldToUi();
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
      const longestWar = Math.max(0, ...group.warIds.map((warIndex) => warDurationDays(strategyState.wars[warIndex])));
      // Затяжные войны должны автоматически заканчиваться даже при небольшом
      // преимуществе одной из сторон, иначе карта постепенно застревает в войнах.
      if (proposer && (proposer.score >= 48 || longestWar >= 60)) candidates.push({ group, proposer });
    });
    const best = candidates.sort((a, b) => b.proposer.score - a.proposer.score)[0];
    if (!best) return;
    const proposer = countryById(best.proposer.id);
    if (groupHasPlayer(best.group)) {
      strategyState.peaceConference = {
        opened: strategyState.date.toISOString().slice(0, 10),
        negotiationDate: strategyState.date.toISOString().slice(0, 10),
        scheduled: false,
        participants: best.group.participants,
        warIds: best.group.warIds,
        demands: generateBotPeaceDemands(best.group),
        mediator: null,
        title: "Мирный договор",
      };
      addLog(`${proposer?.name || "ИИ"} предложила мир. Мирная конференция открыта во вкладке войн.`);
      playSound("peace");
    } else {
      finalizePeaceGroup(best.group, best.proposer.id);
    }
    strategyState.lastAiPeaceMonth = currentMonth;
  }

  function runAiTurn() {
    if (!gameData || !strategyState) return;
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
      aiMaybeStartFocuses(country, runtime);
      aiMaybeFormNation(country, runtime);
      advanceResearch(runtime, { silent: true });
      advanceProduction(runtime, { silent: true });
      advanceConstruction(runtime, { silent: true });
      advanceOperations(runtime, { silent: true });
      automateCountryArmies(country, runtime, { minister: ARMY_MINISTERS[1] });
      runtime.politicalPower += 2;
    });
  }

  async function runAiTurnAsync() {
    if (!gameData || !strategyState) return;
    aiMaybeStartWars();
    await yieldToUi();
    if (!gameData || !strategyState) return;
    aiMaybeJoinWars();
    aiMaybeProposePeace();
    const countries = gameData.scenario.countries;
    for (let index = 0; index < countries.length; index += 1) {
      if (!gameData || !strategyState) return;
      const country = countries[index];
      if (Number(country.id) === Number(strategyState.playerCountryId)) continue;
      const runtime = strategyState.countryStates[String(country.id)];
      if (!runtime) continue;
      if (!runtime.activeResearchId) {
        const nextTech = aiChooseResearchProject(country, runtime);
        if (nextTech) runtime.activeResearchId = nextTech.id;
      }
      aiRebalanceProduction(country, runtime);
      aiMaybeDiplomacy(country, runtime);
      aiMaybeStartFocuses(country, runtime);
      aiMaybeFormNation(country, runtime);
      advanceResearch(runtime, { silent: true });
      advanceProduction(runtime, { silent: true });
      advanceConstruction(runtime, { silent: true });
      advanceOperations(runtime, { silent: true });
      automateCountryArmies(country, runtime, { minister: ARMY_MINISTERS[1] });
      runtime.politicalPower += 2;
      await yieldEvery(index, 10);
    }
  }

  async function advanceDay() {
    if (!strategyState || !gameData || advancingDay) return;
    const conferenceDate = strategyState.peaceConference?.scheduled ? strategyState.peaceConference.negotiationDate : null;
    if (conferenceDate && conferenceDate <= strategyState.date.toISOString().slice(0, 10)) {
      openPeaceSigningScreen();
      return;
    }
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    if (!player || !runtime) return;
    clearTurnNotifications();
    advancingDay = true;
    nextTurnButton.disabled = true;
    const previousTurnStatus = turnStatus.textContent;
    turnStatus.textContent = `${gameDateLabel(strategyState.date, { short: true })} · расчет хода...`;
    try {
      const countryStates = allCountryStates();
      for (let index = 0; index < countryStates.length; index += 1) {
        if (!strategyState || !gameData) return;
        applyDailyEconomy(countryStates[index]);
        await yieldEvery(index, 18);
      }
      for (let index = 0; index < countryStates.length; index += 1) {
        if (!strategyState || !gameData) return;
        const countryRuntime = countryStates[index];
        const country = countryById(countryRuntime.countryId);
        applySanctionEffects(countryRuntime, country);
        await yieldEvery(index, 18);
      }
      for (let index = 0; index < countryStates.length; index += 1) {
        if (!strategyState || !gameData) return;
        const countryRuntime = countryStates[index];
        updateArmyLogistics(countryRuntime, { silent: Number(countryRuntime.countryId) !== Number(strategyState.playerCountryId) });
        await yieldEvery(index, 8);
      }
      if (!strategyState || !gameData) return;
      runCharacterDailyEffects();
      advanceOccupationResistance();
      applyNavalOperations();
      await yieldToUi();

      for (let index = 0; index < strategyState.trades.length; index += 1) {
        if (!strategyState || !gameData) return;
        const trade = strategyState.trades[index];
        const from = strategyState.countryStates[String(trade.from)];
        const to = strategyState.countryStates[String(trade.to)];
        if (from && to) {
          const category = TRADE_CATEGORIES[trade.category] || { resources: { [trade.resource]: trade.amount || 0 } };
          Object.entries(category.resources).forEach(([resource, amountWanted]) => {
            const amount = Math.min(amountWanted * Number(trade.blockadeEfficiency || 1), from.resources[resource] || 0);
            from.resources[resource] -= amount;
            to.resources[resource] += amount;
          });
          from.budget += (category.price || 8) / 30;
          to.budget = Math.max(0, to.budget - (category.price || 8) / 30);
        }
        await yieldEvery(index, 20);
      }

      for (let index = 0; index < countryStates.length; index += 1) {
        if (!strategyState || !gameData) return;
        const countryRuntime = countryStates[index];
        const country = countryById(countryRuntime.countryId);
        if (country) completeFocusIfReady(countryRuntime, country);
        await yieldEvery(index, 18);
      }
      advanceProduction(runtime);
      advanceResearch(runtime);
      advanceConstruction(runtime);
      advanceOperations(runtime);
      // Player armies follow explicit routes; an appointed general can also send
      // idle armies toward an active front.
      await yieldToUi();
      commandGeneralArmies();
      advanceArmies();
      runAnnualUNGeneralAssembly();
      runMonthlyCrises();
      await runAiTurnAsync();
      if (!strategyState || !gameData) return;
      strategyState.date.setDate(strategyState.date.getDate() + 1);
      runHistoricalEvents();
      expireTimedTreaties();
      scheduleRegionalElections();
      scheduleAdministrativeRequests();
      autosaveIfNeeded();
      resolveWarPressure();
      renderGameMap();
      renderStrategyPanel({ refreshContent: !isStrategyControlFocused() });
    } catch (error) {
      console.error("Ошибка расчета хода.", error);
      addLog("Ошибка расчета хода. Подробности в консоли.");
      renderStrategyPanel({ refreshContent: !isStrategyControlFocused() });
    } finally {
      advancingDay = false;
      nextTurnButton.disabled = false;
      updateNextTurnControl();
      if (!strategyState || !gameData) turnStatus.textContent = previousTurnStatus;
    }
  }

  function resolveWarPressure() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const activeWars = strategyState.wars.filter((war) => war.active && (war.attackerId === player.id || war.defenderId === player.id));
    if (!activeWars.length) {
      // В мирное время общественная готовность России постепенно растёт,
      // но не выше устойчивого базового уровня, чтобы эффект не был бесконечным.
      if (player.name === "Россия") runtime.warSupport = clamp(runtime.warSupport + 0.25, 0, 75);
      return;
    }
    const logistics = hasTechnology(runtime, "logistics") ? 0.7 : 1;
    runtime.warSupport = clamp(runtime.warSupport + 0.05, 0, 100);
    runtime.manpower = Math.max(0, runtime.manpower - activeWars.length * 0.8);
    runtime.resources.oil = Math.max(0, runtime.resources.oil - activeWars.length * logistics);
    runtime.resources.steel = Math.max(0, runtime.resources.steel - activeWars.length * 0.6 * logistics);
  }

  function controlledRegionCount(countryId) {
    return controlledRegionSet(countryId).size || countryById(countryId)?.regionIds?.length || 0;
  }

  function armyLocalSupply(runtime, army) {
    const regionId = Number(army.regionId);
    const neighbors = adjacentRegionIds(regionId);
    const hasBase = (runtime.bases || []).some((base) => {
      const baseRegionId = Number(base.regionId);
      return baseRegionId === regionId || neighbors.has(baseRegionId);
    });
    const ownControlled = Number(controllerOfRegion(regionId)?.id) === Number(runtime.countryId);
    let score = runtime.supply?.level ?? 100;
    if (hasBase) score += 16;
    if (ownControlled) score += 10;
    if (army.movingTo) score -= 8;
    return clamp(score, 12, 125);
  }

  function updateArmyLogistics(runtime, options = {}) {
    if (!runtime) return;
    const totalSoldiers = runtime.armies.reduce((sum, army) => sum + Number(army.soldiers || 0), 0);
    const baseCapacity = (runtime.bases || []).reduce((sum, base) => sum + 900 + Number(base.level || 1) * 650, 0);
    const infrastructureCapacity = Object.values(runtime.regionProfiles || {}).reduce((sum, profile) =>
      sum + Number(profile.supplyCapacity || 0) + Number(profile.airCapacity || 0) * 120 + Number(profile.navalCapacity || 0) * 220 + Number(profile.navalAccess || 0) * 180, 0);
    const regionCapacity = controlledRegionCount(runtime.countryId) * 24;
    const techBonus = hasTechnology(runtime, "logistics") ? 1.25 : 1;
    const investmentCapacity = Number(runtime.logisticsInvestment || 0) * 1200;
    const capacity = Math.max(200, Math.round((baseCapacity + infrastructureCapacity + runtime.factories * 260 + runtime.commandPower * 18 + regionCapacity + investmentCapacity) * techBonus));
    const demand = Math.max(1, Math.round(totalSoldiers / 350));
    const level = clamp(Math.round(capacity / demand * 100), 8, 125);
    let losses = 0;
    runtime.armies.forEach((army) => {
      const localSupply = armyLocalSupply(runtime, army);
      army.lastSupply = Math.round(localSupply);
      if (localSupply < 72) {
        const pressure = (72 - localSupply) / 72;
        const lost = Math.max(0, Math.round((army.soldiers || 0) * pressure * 0.0018));
        army.soldiers = Math.max(50, (army.soldiers || 0) - lost);
        army.readiness = clamp((army.readiness || 0) - 0.25 - pressure * 1.8, 0, 100);
        losses += lost;
      } else {
        army.readiness = clamp((army.readiness || 0) + 0.12, 0, 100);
      }
    });
    runtime.resources.food = Math.max(0, runtime.resources.food - totalSoldiers / 180000);
    runtime.resources.oil = Math.max(0, runtime.resources.oil - runtime.armies.length * (level < 75 ? 0.025 : 0.012));
    runtime.supply = {
      level,
      demand,
      capacity,
      lastLosses: losses,
      status: level >= 95 ? "норма" : level >= 72 ? "напряжение" : "дефицит",
    };
    if (!options.silent && losses > 0 && Number(runtime.countryId) === Number(strategyState.playerCountryId)) {
      addLog({
        text: `Снабжение армии просело: потери от логистики ${losses} солд.`,
        detail: `Армии потребляют ${demand} ед. снабжения при мощности ${capacity}. Уровень снабжения ${level}%. При дефиците падает готовность и появляются ежедневные потери. Исправление строит склады, штабы снабжения и резерв транспорта.`,
        action: "fix-logistics",
        severity: "warning",
      });
    }
  }

  function characterEffect(runtime, key) {
    return (runtime.characters || [])
      .filter((character) => character.active || character.id === runtime.activeGeneralId)
      .reduce((sum, character) => sum + Number(character.effects?.[key] || 0), 0);
  }

  function occupationPolicy(regionId) {
    return strategyState.occupationPolicies[String(regionId)] || { mode: "balanced", garrison: 0, resistance: 35 };
  }

  function setOccupationPolicy(regionId, mode) {
    const policy = occupationPolicy(regionId);
    policy.mode = mode || "balanced";
    strategyState.occupationPolicies[String(regionId)] = policy;
    addLog(`Оккупационная политика изменена: ${gameData.regionById.get(Number(regionId))?.name || regionId}.`);
    renderStrategyPanel();
  }

  function addOccupationGarrison(regionId) {
    const runtime = currentPlayerState();
    const policy = occupationPolicy(regionId);
    const cost = 80 + policy.garrison * 40;
    if (!runtime || runtime.manpower < cost || runtime.commandPower < 8) {
      addLog(`Для гарнизона нужно ${cost} людских ресурсов и 8 командного ресурса.`);
      renderStrategyPanel();
      return;
    }
    runtime.manpower -= cost;
    runtime.commandPower -= 8;
    policy.garrison += 1;
    strategyState.occupationPolicies[String(regionId)] = policy;
    addLog("Гарнизон усилен. Сопротивление будет снижаться быстрее.");
    renderStrategyPanel();
  }

  function advanceOccupationResistance() {
    const occupations = gameData?.scenario.occupations || [];
    occupations.forEach((occupation) => {
      const regionId = Number(occupation.regionId);
      const controllerRuntime = strategyState.countryStates[String(occupation.controllerCountryId)];
      const owner = ownerOfRegion(regionId);
      const policy = occupationPolicy(regionId);
      const harsh = policy.mode === "harsh";
      const soft = policy.mode === "soft";
      const suppression = policy.garrison * 7 + characterEffect(controllerRuntime, "resistanceSuppression");
      const pressure = harsh ? 2.8 : soft ? -1.2 : 0.8;
      policy.resistance = clamp((policy.resistance ?? 35) + pressure - suppression * 0.35, 0, 100);
      strategyState.occupationPolicies[String(regionId)] = policy;
      if (!controllerRuntime) return;
      if (harsh) {
        controllerRuntime.budget += 0.08;
        controllerRuntime.stability = clamp(controllerRuntime.stability - 0.01, 0, 100);
      }
      if (soft) controllerRuntime.stability = clamp(controllerRuntime.stability + 0.01, 0, 100);
      if (policy.resistance >= 70 && Math.random() < 0.08) {
        controllerRuntime.supply.level = clamp((controllerRuntime.supply?.level || 100) - 5, 0, 125);
        controllerRuntime.commandPower = clamp(controllerRuntime.commandPower - 4, 0, 100);
        if (Number(controllerRuntime.countryId) === Number(strategyState.playerCountryId)) {
          addLog({
            text: `Сопротивление устроило диверсию в регионе ${gameData.regionById.get(regionId)?.name || regionId}.`,
            detail: `Сопротивление ${Math.round(policy.resistance)}%. Усильте гарнизон или смените политику оккупации.`,
            severity: "warning",
          });
        }
      }
      if (owner && policy.resistance >= 92 && Math.random() < 0.04) {
        gameData.scenario.occupations = (gameData.scenario.occupations || []).filter((item) => Number(item.regionId) !== regionId);
        delete strategyState.occupationPolicies[String(regionId)];
        markMapDirty();
        addLog(`Восстание сорвало оккупацию региона ${gameData.regionById.get(regionId)?.name || regionId}.`);
      }
    });
  }

  function appointCharacter(characterId) {
    const runtime = currentPlayerState();
    const character = runtime?.characters?.find((item) => item.id === characterId);
    if (!runtime || !character || character.active || runtime.politicalPower < character.cost) return;
    runtime.politicalPower -= character.cost;
    character.active = true;
    character.loyalty = clamp(character.loyalty + 8, 0, 100);
    if (character.role === "Генерал") runtime.activeGeneralId = character.id;
    if (character.effects?.stability) runtime.stability = clamp(runtime.stability + character.effects.stability, 0, 100);
    if (character.effects?.budget) runtime.budget += character.effects.budget;
    if (character.effects?.factoryOutput) runtime.modifiers.factoryOutput += character.effects.factoryOutput;
    if (character.effects?.orgInfluence) {
      Object.keys(strategyState.orgInfluence).forEach((orgId) => {
        strategyState.orgInfluence[orgId] = (strategyState.orgInfluence[orgId] || 0) + character.effects.orgInfluence;
      });
    }
    addLog(`Назначена персоналия: ${character.name} (${character.trait}).`);
    renderStrategyPanel();
  }

  function runCharacterDailyEffects() {
    allCountryStates().forEach((runtime) => {
      runtime.commandPower = clamp(runtime.commandPower + characterEffect(runtime, "commandPowerDaily"), 0, 100);
      runtime.armies.forEach((army) => {
        army.readiness = clamp(army.readiness + characterEffect(runtime, "armyReadiness") / 20, 0, 100);
      });
    });
  }

  function organizationInfluence(orgId) {
    return Number(strategyState.orgInfluence?.[orgId] || 0);
  }

  function runOrganizationAction(orgId, actionId) {
    const runtime = currentPlayerState();
    const org = strategyState.organizations.find((item) => item.id === orgId);
    const action = ORGANIZATION_ACTIONS.find((item) => item.id === actionId);
    if (!runtime || !org || !action || runtime.politicalPower < action.cost) return;
    runtime.politicalPower -= action.cost;
    if (action.effects.budget) runtime.budget += action.effects.budget;
    strategyState.orgInfluence[org.id] = organizationInfluence(org.id) + action.effects.influence;
    (org.members || []).forEach((memberId) => {
      if (Number(memberId) !== Number(runtime.countryId)) setRelation(runtime.countryId, memberId, getRelation(runtime.countryId, memberId) + (action.effects.relation || 0));
    });
    if (action.id === "resolution") {
      const support = (org.members || []).filter((memberId) => getRelation(runtime.countryId, memberId) + organizationInfluence(org.id) / 2 > 20).length;
      const passed = support >= Math.ceil((org.members || []).length / 2);
      if (passed) {
        runtime.politicalPower += action.effects.politicalPower || 0;
        runtime.stability = clamp(runtime.stability + 2, 0, 100);
      }
      addLog(`${org.name}: резолюция ${passed ? "принята" : "провалена"} (${support}/${org.members.length}).`);
    } else {
      addLog(`${org.name}: выполнено действие "${action.name}".`);
    }
    renderStrategyPanel();
  }

  function runMonthlyCrises() {
    if (!strategyState || strategyState.date.getDate() !== 1) return;
    const monthKey = `${strategyState.date.getFullYear()}-${String(strategyState.date.getMonth() + 1).padStart(2, "0")}`;
    if (strategyState.lastCrisisMonth === monthKey) return;
    strategyState.lastCrisisMonth = monthKey;
    const candidates = allCountryStates()
      .map((runtime) => ({ runtime, country: countryById(runtime.countryId) }))
      .filter((item) => item.country)
      .filter(({ runtime }) => runtime.stability < 42 || runtime.supply?.level < 70 || runtime.resources.food < 6 || sanctionsAgainst(runtime.countryId).length >= 2)
      .sort((a, b) => (a.runtime.stability + (a.runtime.supply?.level || 100)) - (b.runtime.stability + (b.runtime.supply?.level || 100)));
    const picked = candidates[0];
    if (!picked) return;
    const { runtime, country } = picked;
    let crisis;
    if (runtime.supply?.level < 70) {
      runtime.readiness = clamp((runtime.readiness || 0) - 2, 0, 100);
      runtime.commandPower = clamp(runtime.commandPower - 8, 0, 100);
      crisis = "логистический кризис";
    } else if (runtime.resources.food < 6) {
      runtime.stability = clamp(runtime.stability - 4, 0, 100);
      runtime.budget = Math.max(0, runtime.budget - 8);
      crisis = "продовольственный кризис";
    } else if (sanctionsAgainst(runtime.countryId).length >= 2) {
      runtime.gdp = Math.max(1, Math.round(runtime.gdp * 0.985));
      runtime.stability = clamp(runtime.stability - 2, 0, 100);
      crisis = "санкционный кризис";
    } else {
      runtime.politicalPower = Math.max(0, runtime.politicalPower - 12);
      runtime.stability = clamp(runtime.stability - 3, 0, 100);
      crisis = "политический кризис";
    }
    strategyState.crises.unshift({
      date: strategyState.date.toISOString().slice(0, 10),
      countryId: Number(country.id),
      type: crisis,
    });
    strategyState.crises = strategyState.crises.slice(0, 12);
    if (Number(country.id) === Number(strategyState.playerCountryId) || Math.random() < 0.45) {
      addLog({
        text: `${country.name}: ${crisis}.`,
        detail: `Причина: снабжение ниже 70%. Текущая мощность ${runtime.supply?.capacity || 0}, потребность ${runtime.supply?.demand || 0}. Нужны инвестиции в склады, транспорт и штабы снабжения.`,
        action: Number(country.id) === Number(strategyState.playerCountryId) ? "fix-logistics" : "",
        severity: "warning",
      });
    }
  }

  function logisticsFixCost(runtime) {
    const level = Number(runtime?.logisticsInvestment || 0);
    return {
      budget: 35 + level * 15,
      politicalPower: 15 + level * 5,
      steel: 8 + level * 4,
    };
  }

  function logisticsFixCostText(runtime) {
    const cost = logisticsFixCost(runtime);
    return `${cost.budget} бюджета · ${cost.politicalPower} ПП · ${cost.steel} стали`;
  }

  function canFixLogistics(runtime) {
    const cost = logisticsFixCost(runtime);
    return runtime && runtime.budget >= cost.budget && runtime.politicalPower >= cost.politicalPower && runtime.resources.steel >= cost.steel;
  }

  function fixLogistics() {
    const runtime = currentPlayerState();
    if (!runtime) return;
    const cost = logisticsFixCost(runtime);
    if (!canFixLogistics(runtime)) {
      addLog({
        text: "Недостаточно ресурсов для исправления логистики.",
        detail: `Нужно: ${logisticsFixCostText(runtime)}. Улучшение повышает мощность снабжения и немного восстанавливает готовность армий.`,
        severity: "warning",
      });
      renderStrategyPanel();
      return;
    }
    runtime.budget -= cost.budget;
    runtime.politicalPower -= cost.politicalPower;
    runtime.resources.steel -= cost.steel;
    runtime.logisticsInvestment += 1;
    runtime.armies.forEach((army) => {
      army.readiness = clamp((army.readiness || 0) + 5, 0, 100);
    });
    updateArmyLogistics(runtime);
    addLog({
      text: "Логистика усилена: развернуты склады и транспортные штабы.",
      detail: `Потрачено: ${cost.budget} бюджета, ${cost.politicalPower} ПП, ${cost.steel} стали. Новая мощность снабжения: ${runtime.supply.capacity}, уровень: ${runtime.supply.level}%.`,
      severity: "success",
    });
    renderGameMap();
    renderStrategyPanel();
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

  function hasNonAggressionPact(firstId, secondId) {
    return (strategyState.nonAggressionPacts || []).some((pact) =>
      pact.active !== false &&
      (!pact.expires || new Date(`${pact.expires}T23:59:59`) >= strategyState.date) &&
      ((Number(pact.a) === Number(firstId) && Number(pact.b) === Number(secondId)) ||
      (Number(pact.a) === Number(secondId) && Number(pact.b) === Number(firstId)))
    );
  }

  function breakNonAggressionPact(firstId, secondId) {
    const pact = (strategyState.nonAggressionPacts || []).find((item) =>
      item.active !== false &&
      ((Number(item.a) === Number(firstId) && Number(item.b) === Number(secondId)) ||
      (Number(item.a) === Number(secondId) && Number(item.b) === Number(firstId)))
    );
    if (!pact) return false;
    pact.active = false;
    pact.broken = strategyState.date.toISOString().slice(0, 10);
    return true;
  }

  function signNonAggression(targetId, months = 12) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    if (!target || !runtime || runtime.politicalPower < 20) return;
    if (getRelation(strategyState.playerCountryId, target.id) < -15) {
      addLog("Пакт о ненападении отклонен: отношения слишком плохие.");
      renderStrategyPanel();
      return;
    }
    if (hasNonAggressionPact(strategyState.playerCountryId, target.id)) return;
    runtime.politicalPower -= 20;
    const signedAt = new Date(strategyState.date);
    const expiresAt = new Date(strategyState.date);
    expiresAt.setMonth(expiresAt.getMonth() + clamp(Number(months) || 12, 1, 24));
    strategyState.nonAggressionPacts.push({
      a: Number(strategyState.playerCountryId),
      b: Number(target.id),
      signed: signedAt.toISOString().slice(0, 10),
      expires: expiresAt.toISOString().slice(0, 10),
      active: true,
    });
    setRelation(strategyState.playerCountryId, target.id, getRelation(strategyState.playerCountryId, target.id) + 12);
    addLog(`Подписан пакт о ненападении с ${target.name} сроком на ${clamp(Number(months) || 12, 1, 24)} мес.`);
    renderStrategyPanel();
  }

  function expireTimedTreaties() {
    (strategyState.nonAggressionPacts || []).forEach((pact) => {
      if (pact.active === false || !pact.expires || new Date(`${pact.expires}T23:59:59`) >= strategyState.date) return;
      pact.active = false;
      const first = countryById(pact.a);
      const second = countryById(pact.b);
      addLog(`Истек срок пакта о ненападении: ${first?.name || "страна"} — ${second?.name || "страна"}.`);
    });
  }

  function guaranteeIndependence(targetId) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    if (!target || !runtime || runtime.politicalPower < 25) return;
    const exists = (strategyState.guarantees || []).some((item) => item.active !== false && Number(item.guarantorId) === Number(strategyState.playerCountryId) && Number(item.targetId) === Number(target.id));
    if (exists) return;
    runtime.politicalPower -= 25;
    strategyState.guarantees.push({
      guarantorId: Number(strategyState.playerCountryId),
      targetId: Number(target.id),
      signed: strategyState.date.toISOString().slice(0, 10),
      active: true,
    });
    setRelation(strategyState.playerCountryId, target.id, getRelation(strategyState.playerCountryId, target.id) + 16);
    addLog(`${currentPlayerCountry().name} гарантирует независимость ${target.name}.`);
    renderStrategyPanel();
  }

  function giveSecurityGuarantees(targetId) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    const targetRuntime = target ? strategyState.countryStates[String(target.id)] : null;
    if (!target || !runtime || !targetRuntime || runtime.politicalPower < 45 || runtime.commandPower < 15) return;
    const exists = (strategyState.guarantees || []).some((item) =>
      item.active !== false &&
      item.type === "security" &&
      Number(item.guarantorId) === Number(strategyState.playerCountryId) &&
      Number(item.targetId) === Number(target.id)
    );
    if (exists) return;
    runtime.politicalPower -= 45;
    runtime.commandPower -= 15;
    strategyState.guarantees.push({
      guarantorId: Number(strategyState.playerCountryId),
      targetId: Number(target.id),
      signed: strategyState.date.toISOString().slice(0, 10),
      active: true,
      type: "security",
    });
    strategyState.accessTreaties.push({ from: Number(strategyState.playerCountryId), host: Number(target.id), securityGuarantee: true });
    targetRuntime.militaryAccess.push(Number(strategyState.playerCountryId));
    targetRuntime.warSupport = clamp(targetRuntime.warSupport + 4, 0, 100);
    setRelation(strategyState.playerCountryId, target.id, getRelation(strategyState.playerCountryId, target.id) + 24);
    addLog(`Подписаны гарантии безопасности для ${target.name}: военный доступ открыт, оборонная поддержка усилена.`);
    renderStrategyPanel();
  }

  function activateGuaranteesForWar(attackerId, targetId) {
    (strategyState.guarantees || [])
      .filter((item) => item.active !== false && Number(item.targetId) === Number(targetId))
      .forEach((item) => {
        const guarantorId = Number(item.guarantorId);
        const enemyId = Number(attackerId);
        if (guarantorId === enemyId || isAtWar(guarantorId, enemyId)) return;
        const targetRuntime = strategyState.countryStates[String(targetId)];
        const guarantorRuntime = strategyState.countryStates[String(guarantorId)];
        if (item.type === "security") {
          if (targetRuntime) {
            targetRuntime.warSupport = clamp(targetRuntime.warSupport + 8, 0, 100);
            targetRuntime.commandPower = clamp(targetRuntime.commandPower + 12, 0, 100);
          }
          if (guarantorRuntime) guarantorRuntime.commandPower = clamp(guarantorRuntime.commandPower + 6, 0, 100);
        }
        strategyState.wars.push({
          attackerId: guarantorId,
          defenderId: enemyId,
          start: strategyState.date.toISOString().slice(0, 10),
          active: true,
          guarantee: true,
        });
        setRelation(guarantorId, enemyId, -80);
        const guarantor = countryById(guarantorId);
        const target = countryById(targetId);
        addLog(`${guarantor?.name || "Гарант"} вступает в войну по гарантии ${item.type === "security" ? "безопасности" : "независимости"} для ${target?.name || "страны"}.`);
      });
  }

  function issueUltimatum(targetId) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    const targetRuntime = strategyState.countryStates[String(targetId)];
    if (!target || !runtime || !targetRuntime || runtime.politicalPower < 35) return;
    const ownStrength = runtime.gdp + runtime.armies.reduce((sum, army) => sum + (army.soldiers || 0), 0) / 80 + runtime.warSupport * 8;
    const targetStrength = targetRuntime.gdp + targetRuntime.armies.reduce((sum, army) => sum + (army.soldiers || 0), 0) / 80 + targetRuntime.warSupport * 8;
    runtime.politicalPower -= 35;
    setRelation(strategyState.playerCountryId, target.id, getRelation(strategyState.playerCountryId, target.id) - 18);
    if (ownStrength > targetStrength * 1.45 && targetRuntime.stability < 62) {
      targetRuntime.politicalPower = Math.max(0, targetRuntime.politicalPower - 20);
      targetRuntime.warSupport = clamp(targetRuntime.warSupport - 5, 0, 100);
      runtime.warSupport = clamp(runtime.warSupport + 4, 0, 100);
      addLog(`${target.name} уступает ультиматуму: ее политическая воля и поддержка войны снижены.`);
    } else {
      runtime.warSupport = clamp(runtime.warSupport + 8, 0, 100);
      addLog(`${target.name} отвергает ультиматум. Поддержка войны в вашей стране выросла.`);
    }
    renderStrategyPanel();
  }

  function offerCeasefire(targetId) {
    const runtime = currentPlayerState();
    const target = countryById(targetId);
    if (!target || !runtime || runtime.politicalPower < 20) return;
    const directWars = strategyState.wars.filter((war) => war.active &&
      ((Number(war.attackerId) === Number(strategyState.playerCountryId) && Number(war.defenderId) === Number(target.id)) ||
      (Number(war.defenderId) === Number(strategyState.playerCountryId) && Number(war.attackerId) === Number(target.id))));
    if (!directWars.length) {
      addLog("Перемирие недоступно: с выбранной страной нет прямой войны.");
      renderStrategyPanel();
      return;
    }
    runtime.politicalPower -= 20;
    directWars.forEach((war) => {
      war.active = false;
      war.ended = strategyState.date.toISOString().slice(0, 10);
      war.ceasefire = true;
    });
    const clearedOccupations = clearPeaceOccupations([strategyState.playerCountryId, target.id]);
    setRelation(strategyState.playerCountryId, target.id, Math.min(0, getRelation(strategyState.playerCountryId, target.id) + 18));
    addLog(`Подписано перемирие с ${target.name}. Снято взаимных оккупаций: ${clearedOccupations}.`);
    markMapDirty();
    renderGameMap();
    renderStrategyPanel();
  }

  function declareWar(targetId, goalId = "border") {
    const runtime = currentPlayerState();
    const target = gameData.scenario.countries.find((country) => Number(country.id) === Number(targetId));
    const targetRuntime = target ? strategyState.countryStates[String(target.id)] : null;
    if (!target || !target.regionIds?.length || targetRuntime?.capitulated || runtime.politicalPower < 50 || runtime.warSupport < 25) return;
    const duplicate = strategyState.wars.some((war) => war.active && war.attackerId === strategyState.playerCountryId && war.defenderId === Number(targetId));
    if (duplicate) return;
    if (runtime.democracy?.active && runtime.democracy.approval < 45) {
      addLog("Демократический режим не готов к войне: нужна поддержка общества не ниже 45%.");
      renderStrategyPanel();
      return;
    }
    if (hasNonAggressionPact(strategyState.playerCountryId, target.id)) {
      if (getRelation(strategyState.playerCountryId, target.id) <= -70) {
        breakNonAggressionPact(strategyState.playerCountryId, target.id);
        runtime.politicalPower = Math.max(0, runtime.politicalPower - 12);
        addLog("Пакт о ненападении разорван на фоне обвала отношений.");
      } else {
        addLog("Война заблокирована пактом о ненападении. Сначала доведите отношения до серьезного кризиса.");
        renderStrategyPanel();
        return;
      }
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
      goal: WAR_GOALS.some((goal) => goal.id === goalId) ? goalId : "border",
    });
    aiAlliesImposeSanctions(strategyState.playerCountryId, targetId);
    activateGuaranteesForWar(strategyState.playerCountryId, targetId);
    addLog(`Объявлена война: ${currentPlayerCountry().name} против ${target.name}. Цель: ${warGoalFor(strategyState.wars.at(-1)).name}.`);
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
    markMapDirty();
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
      order: "",
      lastSupply: runtime.supply?.level || 100,
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
    const army = recruitArmy(originRegionId, { silent: true });
    if (!army) return;
    const targetRegionId = frontTargetRegions(player, target, 8, army)[0];
    if (!targetRegionId) {
      addLog("Нет соседнего региона фронта. Сначала подведите армию к границе через смежные регионы.");
      renderStrategyPanel();
      renderGameMap();
      return;
    }
    moveArmy(army.id, targetRegionId);
    renderGameMap();
  }

  function moveArmy(armyId, regionId) {
    const runtime = currentPlayerState();
    const army = runtime?.armies.find((item) => item.id === armyId);
    if (!army || !runtime) return;
    if (!setArmyRoute(runtime, army, regionId)) {
      addLog("Нельзя проложить сухопутный маршрут: нет доступа, войны или непрерывной границы до цели.");
      renderStrategyPanel();
      return;
    }
    addLog(`${army.name} получила маршрут через ${army.route.length} регион(а/ов).`);
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

  function formNationForCountry(country, runtime, formableId, options = {}) {
    const formable = FORMABLE_NATIONS[formableId];
    if (!country || !runtime || !formable) return false;
    const originName = runtime.originCountryName || country.name;
    if (originName !== formable.requiredCountry && !formable.requiredCountries?.includes(originName)) {
      if (!options.silent) addLog("Эта страна не может сформировать выбранное государство.");
      return false;
    }
    if (runtime.formedNation === formableId) return false;
    const missing = formableRequirementStatus(formable, country, runtime).filter((item) => !item.ok);
    if (missing.length) {
      if (!options.silent) addLog(`Формирование недоступно: ${missing[0].text}.`);
      return false;
    }
    country.name = formable.name;
    country.color = formable.color || country.color;
    runtime.formedNation = formableId;
    applyFocusReward(runtime, formable.reward || {});
    markMapDirty();
    if (Number(country.id) === Number(strategyState.playerCountryId)) gameCountryName.textContent = country.name;
    addLog(`${options.ai ? "ИИ сформировал" : "Провозглашено новое государство:"} ${formable.name}.`);
    if (!options.silent) {
      renderGameMap();
      renderStrategyPanel();
    }
    return true;
  }

  function aiMaybeFormNation(country, runtime) {
    const formable = availableFormables(country, runtime)
      .find((item) => runtime.formedNation !== item.id && canFormNation(item, country, runtime));
    if (formable) formNationForCountry(country, runtime, formable.id, { ai: true, silent: true });
  }

  function formNation(formableId) {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    formNationForCountry(player, runtime, formableId);
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
