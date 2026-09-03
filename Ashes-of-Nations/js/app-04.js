    addLog(`Изменен курс власти: ${ideology.name}.`);
    renderStrategyPanel();
  }

  function setTaxRate(value) {
    const runtime = currentPlayerState();
    if (!runtime) return;
    runtime.taxRate = clamp(Number(value), 10, 50);
    if (runtime.taxRate >= 40) runtime.stability = clamp(runtime.stability - 1, 0, 100);
    addLog(`Налоговая ставка установлена на уровне ${runtime.taxRate}%.`);
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

  function regionalElectionDueDate(profile) {
    const offset = 20 + (hashNumber(`regional-election:${profile.regionId}`) % 121);
    const due = new Date(strategyState.date);
    due.setDate(due.getDate() + offset);
    return due.toISOString().slice(0, 10);
  }

  function scheduleRegionalElections() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    if (!player || !runtime || !strategyState) return;
    const today = strategyState.date.toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    if (strategyState.lastRegionalElectionMonth === currentMonth) return;
    if (strategyState.regionalElections.some((item) => Number(item.countryId) === Number(player.id))) return;
    Object.values(runtime.regionProfiles || {}).forEach((profile) => {
      if (strategyState.lastRegionalElectionMonth === currentMonth) return;
      if (!profile?.governor) return;
      if (!profile.governor.nextElectionAt) profile.governor.nextElectionAt = regionalElectionDueDate(profile);
      if (profile.governor.nextElectionAt > today) return;
      if (strategyState.regionalElections.some((item) => Number(item.regionId) === Number(profile.regionId) && Number(item.countryId) === Number(player.id))) return;
      const region = gameData.regionById.get(Number(profile.regionId));
      strategyState.regionalElections.push({
        id: `${player.id}:${profile.regionId}:${today}`,
        countryId: Number(player.id),
        regionId: Number(profile.regionId),
        name: profile.administration?.name || region?.name || `Регион ${profile.regionId}`,
        openedAt: today,
      });
      strategyState.lastRegionalElectionMonth = currentMonth;
      addLog(`Региональные выборы: ${profile.administration?.name || region?.name || `регион ${profile.regionId}`}. Требуется решение.`);
    });
  }

  function administrativeUnitForRegion(regionId) {
    return strategyState?.administrativeRegions?.find((unit) => unit.regionIds?.includes(Number(regionId))) || null;
  }

  function administrativeRequestDueDate(unit) {
    const date = new Date(strategyState.date);
    date.setDate(date.getDate() + 12 + (hashNumber(`admin-request:${unit.id}`) % 35));
    return date.toISOString().slice(0, 10);
  }

  function scheduleAdministrativeRequests() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    if (!player || !runtime || !strategyState || runtime.administrativeSlotsUsed >= runtime.administrativeSlots) return;
    if (strategyState.administrativeRequests.some((request) => Number(request.countryId) === Number(player.id))) return;
    const today = strategyState.date.toISOString().slice(0, 10);
    strategyState.administrativeRegions.forEach((unit) => {
      const targetRegionId = unit.regionIds.find((regionId) => player.regionIds?.includes(Number(regionId)));
      if (!targetRegionId || runtime.administrativeSlotsUsed >= runtime.administrativeSlots) return;
      if (strategyState.administrativeRequests.some((request) => Number(request.countryId) === Number(player.id))) return;
      if (!unit.nextRequestAt) unit.nextRequestAt = administrativeRequestDueDate(unit);
      if (unit.nextRequestAt > today) return;
      if (strategyState.administrativeRequests.some((request) => request.unitId === unit.id && Number(request.countryId) === Number(player.id))) return;
      const projectId = hashNumber(`${unit.id}:${today}`) % 3 === 0 ? "military-factory" : "civilian-factory";
      strategyState.administrativeRequests.push({
        id: `admin-request:${player.id}:${unit.id}:${today}`,
        countryId: Number(player.id),
        unitId: unit.id,
        regionId: Number(targetRegionId),
        projectId,
        openedAt: today,
      });
      unit.nextRequestAt = null;
      addLog(`Администрация «${unit.name}» просит выделить один строительный слот.`);
    });
    renderAdministrativeNotifications();
  }

  function decideAdministrativeRequest(requestId, approve) {
    const request = strategyState?.administrativeRequests?.find((item) => item.id === requestId);
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    if (!request || !player || !runtime || Number(request.countryId) !== Number(player.id)) return;
    const unit = strategyState.administrativeRegions.find((item) => item.id === request.unitId);
    const project = CONSTRUCTION_PROJECTS.find((item) => item.id === request.projectId);
    if (approve) {
      if (runtime.administrativeSlotsUsed >= runtime.administrativeSlots || !project) {
        addLog("Нельзя согласовать запрос администрации: нет свободного строительного слота.");
        return;
      }
      startConstruction(request.projectId, request.regionId, { administrative: true, sponsored: true, unitId: request.unitId });
      addLog(`Запрос администрации «${unit?.name || "регион"}» согласован: ${project.name}.`);
    } else {
      addLog(`Запрос администрации «${unit?.name || "регион"}» отклонён.`);
    }
    if (unit) unit.nextRequestAt = administrativeRequestDueDate(unit);
    strategyState.administrativeRequests = strategyState.administrativeRequests.filter((item) => item.id !== requestId);
    renderAdministrativeNotifications();
    renderStrategyPanel();
  }

  function decideRegionalElection(electionId, accept) {
    const election = strategyState?.regionalElections?.find((item) => item.id === electionId);
    const runtime = currentPlayerState();
    const player = currentPlayerCountry();
    if (!election || !runtime || !player || Number(election.countryId) !== Number(player.id)) return;
    const profile = runtime.regionProfiles[String(election.regionId)];
    if (!profile?.governor) return;
    const nextElection = new Date(strategyState.date);
    nextElection.setFullYear(nextElection.getFullYear() + 4);
    profile.governor.nextElectionAt = nextElection.toISOString().slice(0, 10);
    profile.governor.lastElectionAt = strategyState.date.toISOString().slice(0, 10);
    if (accept) {
      profile.governor.approval = clamp((profile.governor.approval || 50) + 9, 0, 100);
      runtime.stability = clamp(runtime.stability + 0.5, 0, 100);
      addLog(`Выборы в ${election.name} согласованы. Доверие к администрации выросло.`);
    } else {
      profile.governor.approval = clamp((profile.governor.approval || 50) - 14, 0, 100);
      runtime.stability = clamp(runtime.stability - 1.2, 0, 100);
      addLog(`Выборы в ${election.name} отклонены. Доверие к администрации снизилось.`);
    }
    strategyState.regionalElections = strategyState.regionalElections.filter((item) => item.id !== electionId);
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

  function peaceEnemies(countryId, conference = strategyState?.peaceConference) {
    if (!conference) return [];
    const enemies = new Set();
    (conference.warIds || []).forEach((warIndex) => {
      const war = strategyState.wars[Number(warIndex)];
      if (!war) return;
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

  function peaceOccupiedRegionsForTarget(targetId, conference = strategyState?.peaceConference) {
    const participants = new Set((conference?.participants || []).map(Number));
    return (gameData?.scenario.occupations || [])
      .filter((occupation) => participants.has(Number(occupation.controllerCountryId)))
      .filter((occupation) => Number(ownerOfRegion(occupation.regionId)?.id) === Number(targetId))
      .map((occupation) => ({
        regionId: Number(occupation.regionId),
        controllerId: Number(occupation.controllerCountryId),
        controller: countryById(occupation.controllerCountryId),
      }));
  }

  function removeOccupations(predicate) {
    const occupations = gameData?.scenario.occupations || [];
    const removedRegionIds = occupations.filter(predicate).map((occupation) => Number(occupation.regionId));
    if (!removedRegionIds.length) return 0;
    gameData.scenario.occupations = occupations.filter((occupation) => !predicate(occupation));
    removedRegionIds.forEach((regionId) => delete strategyState.occupationPolicies[String(regionId)]);
    return removedRegionIds.length;
  }

  function clearPeaceOccupations(participantIds) {
    const participants = new Set(Array.from(participantIds || [], Number));
    return removeOccupations((occupation) => {
      const controllerId = Number(occupation.controllerCountryId);
      const ownerId = Number(ownerOfRegion(occupation.regionId)?.id);
      return controllerId !== ownerId && participants.has(controllerId) && participants.has(ownerId);
    });
  }

  function clearCapitulationOccupations(targetId, surrenderedRegionIds) {
    const surrendered = new Set((surrenderedRegionIds || []).map(Number));
    return removeOccupations((occupation) =>
      Number(occupation.controllerCountryId) === Number(targetId) || surrendered.has(Number(occupation.regionId)));
  }

  function peaceDemandText(demand) {
    const actor = countryById(demand.actorId);
    const target = countryById(demand.targetId);
    if (demand.type === "annex_occupied") return `${actor?.name || "Страна"} требует закрепить оккупации у ${target?.name || "противника"} (${demand.regionIds?.length || 0} рег.)`;
    if (demand.type === "reparations") return `${actor?.name || "Страна"} требует репарации от ${target?.name || "противника"}: ${demand.value} бюджета`;
    if (demand.type === "demilitarize") return `${actor?.name || "Страна"} требует демилитаризацию ${target?.name || "противника"}`;
    return `${actor?.name || "Страна"} предлагает статус-кво`;
  }

  function peaceDemandCost(demand) {
    if (demand.type === "annex_occupied") return 22 + (demand.regionIds?.length || 0) * 18;
    if (demand.type === "reparations") return 24 + Math.round((demand.value || 20) / 3);
    if (demand.type === "demilitarize") return 42;
    return 6;
  }

  // This value is deliberately internal: it guides concessions but is never presented in the UI.
  function hiddenWarBalance(actorId, targetId) {
    const actor = strategyState.countryStates[String(actorId)];
    const target = strategyState.countryStates[String(targetId)];
    if (!actor || !target) return 0;
    const occupied = occupiedRegionsControlledBy(actorId, targetId).length - occupiedRegionsControlledBy(targetId, actorId).length;
    return occupied * 24 + (actor.warSupport - target.warSupport) * 0.55 + (actor.stability - target.stability) * 0.25 + (actor.gdp - target.gdp) * 0.08;
  }

  function peaceVenueChoices(conference) {
    const permitted = new Set(conference.participants.map(Number));
    conference.participants.forEach((id) => (strategyState.countryStates[String(id)]?.allies || []).forEach((allyId) => permitted.add(Number(allyId))));
    return gameData.scenario.countries
      .filter((country) => permitted.has(Number(country.id)))
      .flatMap((country) => (country.regionIds || []).map((regionId) => ({ country, regionId: Number(regionId) })));
  }

  function peaceDemandStatusText(demand) {
    return demand.status === "accepted" ? "принято" : demand.status === "rejected" ? "отклонено" : "ожидает решения";
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
          demands.push({ source: "bot", actorId, targetId, type: "annex_occupied", regionIds: occupied, status: "pending" });
          return;
        }
        if (getRelation(actorId, targetId) < -35) {
          demands.push({ source: "bot", actorId, targetId, type: "demilitarize", status: "pending" });
          return;
        }
        demands.push({ source: "bot", actorId, targetId, type: "reparations", value: 20, status: "pending" });
      });
    return demands;
  }

  function openPeaceConference() {
    if (strategyState.peaceConference) {
      openPeaceSigningScreen();
      return;
    }
    const group = activeWarGroup();
    if (!group.warIds.length) {
      addLog("Нет активной войны для мирной конференции.");
      renderStrategyPanel();
      return;
    }
    const conference = {
      opened: strategyState.date.toISOString().slice(0, 10),
      negotiationDate: strategyState.date.toISOString().slice(0, 10),
      scheduled: false,
      participants: group.participants,
      warIds: group.warIds,
      demands: generateBotPeaceDemands(group),
      mediator: null,
      title: "Мирный договор",
      venueRegionId: null,
    };
    conference.venueRegionId = peaceVenueChoices(conference)[0]?.regionId || null;
    strategyState.peaceConference = conference;
    addLog("Повестка мирной конференции подготовлена. Назначьте место и дату во вкладке войны.");
    renderStrategyPanel();
  }

  function selectedPeaceRegionIds() {
    return [...document.querySelectorAll("input[data-peace-region]:checked")]
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
    if (!target || Number(target.id) === Number(playerId) || !peaceEnemies(playerId, conference).includes(Number(target.id))) {
      addLog("Выберите страну, которая участвует в войне на другой стороне переговоров.");
      if (peaceScreen.classList.contains("active")) renderPeaceSigningScreen();
      else renderStrategyPanel();
      return;
    }
    const demand = { source: "player", actorId: Number(playerId), targetId: Number(target.id), type, status: "pending" };
    if (type === "annex_occupied") {
      const availableRegions = peaceOccupiedRegionsForTarget(target.id, conference).map(({ regionId }) => regionId);
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
    addLog(`Внесено встречное предложение: ${peaceDemandText(demand)}.`);
    if (peaceScreen.classList.contains("active")) renderPeaceSigningScreen();
    else renderStrategyPanel();
  }

  function respondToPeaceDemand(index, accepted) {
    const conference = strategyState?.peaceConference;
    const demand = conference?.demands?.[Number(index)];
    if (!demand || !["bot", "mediator"].includes(demand.source) || demand.status !== "pending") return;
    demand.status = accepted ? "accepted" : "rejected";
    addLog(`${accepted ? "Принято" : "Отклонено"}: ${peaceDemandText(demand)}.`);
    if (!accepted) offerPeaceAlternative(demand);
    renderPeaceSigningScreen();
  }

  function offerPeaceAlternative(rejectedDemand) {
    const conference = strategyState?.peaceConference;
    if (!conference) return;
    const round = Number(rejectedDemand.round || 0) + 1;
    if (round > 2) {
      const chance = (hiddenWarBalance(rejectedDemand.actorId, rejectedDemand.targetId) + 50) / 100;
      if (chance < 0.48) {
        conference.broken = true;
        conference.warIds.forEach((warIndex) => {
          const war = strategyState.wars[warIndex];
          if (!war) return;
          war.active = true;
          war.ceasefire = false;
          delete war.ceasefireUntil;
        });
        addLog("Переговоры сорваны: стороны не смогли согласовать альтернативу. Война продолжается.");
        strategyState.peaceConference = null;
        showScreen(gameScreen);
        renderStrategyPanel();
        return;
      }
    }
    const alternative = rejectedDemand.type === "annex_occupied"
      ? { type: "reparations", value: 10 }
      : rejectedDemand.type === "reparations"
        ? { type: "demilitarize" }
        : { type: "status_quo" };
    conference.demands.push({ source: "bot", actorId: rejectedDemand.actorId, targetId: rejectedDemand.targetId, ...alternative, status: "pending", round, speech: "Нас не устраивает отказ. Предлагаем более мягкую альтернативу." });
    addLog("Противник выдвинул альтернативное условие.");
  }

  function schedulePeaceConference() {
    const conference = strategyState?.peaceConference;
    if (!conference) return;
    const dateValue = document.getElementById("peaceDate")?.value || conference.negotiationDate;
    const venueValue = Number(document.getElementById("peaceVenue")?.value || conference.venueRegionId);
    const chosen = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(chosen.getTime()) || chosen < new Date(`${strategyState.date.toISOString().slice(0, 10)}T00:00:00`)) {
      addLog("Дата переговоров не может быть раньше текущего дня.");
      renderPeaceSigningScreen();
      return;
    }
    conference.negotiationDate = dateValue;
    conference.venueRegionId = venueValue || conference.venueRegionId;
    conference.scheduled = true;
    conference.warIds.forEach((warIndex) => {
      const war = strategyState.wars[warIndex];
      if (!war) return;
      war.active = false;
      war.ceasefire = true;
      war.ceasefireUntil = dateValue;
    });
    addLog(`Переговоры назначены на ${dateValue}. До подписания действует временное перемирие.`);
    if (dateValue === strategyState.date.toISOString().slice(0, 10)) openPeaceSigningScreen();
    else { showScreen(gameScreen); renderStrategyPanel(); }
  }

  function invitePeaceMediator(mediatorId) {
    let conference = strategyState?.peaceConference;
    if (!conference) {
      openPeaceConference();
      conference = strategyState?.peaceConference;
    }
    if (!conference) return;
    const mediator = mediatorId === "un" ? { id: "un", name: "Совет Безопасности ООН", type: "un" } : { id: Number(mediatorId), name: countryById(mediatorId)?.name || "третья страна", type: "country" };
    if (!mediator.name) return;
    conference.mediator = mediator;
    const enemies = peaceEnemies(strategyState.playerCountryId, conference);
    enemies.forEach((targetId) => conference.demands.push({ source: "mediator", actorId: strategyState.playerCountryId, targetId, type: "status_quo", status: "pending", speech: `${mediator.name} предлагает компромисс, приемлемый для всех сторон.` }));
    addLog(`${mediator.name} приглашён как посредник и подготовил компромиссный проект мира.`);
    if (peaceScreen.classList.contains("active")) renderPeaceSigningScreen();
    else renderStrategyPanel();
  }

  function submitPeaceOffer() {
    const conference = strategyState?.peaceConference;
    if (!conference) return;
    const playerId = Number(strategyState.playerCountryId);
    const playerDemands = conference.demands.filter((demand) => demand.source === "player" && demand.status === "pending");
    if (!playerDemands.length) {
      addLog("Сначала добавьте встречное предложение или ответьте на условия противника.");
      renderPeaceSigningScreen();
      return;
    }
    playerDemands.forEach((demand) => {
      const balance = hiddenWarBalance(playerId, demand.targetId);
      const relationPenalty = Math.max(0, -getRelation(playerId, demand.targetId) - 25) * 0.22;
      demand.status = demand.type === "annex_occupied" || balance + relationPenalty >= peaceDemandCost(demand) ? "accepted" : "rejected";
      const target = countryById(demand.targetId);
      addLog(`${target?.name || "Противник"} ${demand.status === "accepted" ? "приняла" : "отклонила"} ваше предложение.`);
    });
    renderPeaceSigningScreen();
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

  function createFocusCountry(name, regionIds) {
    if (!gameData || countryById(gameData.scenario.countries.find((country) => country.name === name)?.id)) return false;
    const regions = [...new Set(regionIds.map(Number))].filter((id) => gameData.regionById.has(id));
    if (!regions.length) return false;
    const newId = Math.max(0, ...gameData.scenario.countries.map((country) => Number(country.id) || 0)) + 1;
    const country = { id: newId, name, color: "#4f77aa", ideology: "neutral", capitalRegionId: regions[0], regionIds: regions };
    const previousOwners = regions.map((id) => directOwnerOfRegion(id));
    gameData.scenario.countries.forEach((item) => { item.regionIds = (item.regionIds || []).filter((id) => !regions.includes(Number(id))); });
    gameData.scenario.countries.push(country);
    strategyState.countryStates[String(newId)] = createCountryRuntime(country, strategyState.date?.getFullYear?.() || 2026);
    previousOwners.forEach((owner) => recalculateRuntimeFromRegions(owner && strategyState.countryStates[String(owner.id)]));
    gameData.scenario.occupations = (gameData.scenario.occupations || []).filter((item) => !regions.includes(Number(item.regionId)));
    rebuildOwnerByRegion();
    markMapDirty();
    return true;
  }

  function releaseOccupation(regionId, controllerId = strategyState?.playerCountryId) {
    const before = gameData?.scenario.occupations?.length || 0;
    gameData.scenario.occupations = (gameData.scenario.occupations || [])
      .filter((occupation) => !(Number(occupation.regionId) === Number(regionId) && Number(occupation.controllerCountryId) === Number(controllerId)));
    const changed = (gameData.scenario.occupations || []).length < before;
    if (changed) markMapDirty();
    return changed;
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
      capitalRegionId: validRegionIds[0],
      regionIds: [],
    };
    gameData.scenario.countries.push(newCountry);
    strategyState.countryStates[String(newId)] = createCountryRuntime(newCountry, strategyState.date?.getFullYear?.() || 2026);
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
    markMapDirty();
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
    if (conference.demands.some((demand) => demand.status === "pending")) {
      addLog("Нельзя подписать мир: по всем условиям должно быть принято решение.");
      renderPeaceSigningScreen();
      return;
    }
    conference.demands.filter((demand) => demand.status === "accepted").forEach(applyPeaceDemand);
    const participantIds = new Set((conference.participants || []).map((id) => Number(id)));
    const clearedOccupations = clearPeaceOccupations(participantIds);
    conference.warIds.forEach((warIndex) => {
      if (strategyState.wars[warIndex]) strategyState.wars[warIndex].active = false;
    });
    strategyState.peaceConference = null;
    rebuildOwnerByRegion();
    markMapDirty();
    renderGameMap();
    const venueName = gameData.regionById.get(Number(conference.venueRegionId))?.name || "согласованном месте";
    addLog(`«${conference.title || "Мирный договор"}» подписан в регионе ${venueName}. Снято оккупаций: ${clearedOccupations}. Все связанные войны завершены одновременно.`);
    playSound("peace");
    showScreen(gameScreen);
    renderStrategyPanel();
  }

  function openPeaceSigningScreen() {
    if (!strategyState?.peaceConference) return;
    if (strategyState.peaceConference.scheduled && strategyState.peaceConference.negotiationDate > strategyState.date.toISOString().slice(0, 10)) {
      showScreen(gameScreen);
      renderStrategyPanel();
      return;
    }
    renderPeaceSigningScreen();
    showScreen(peaceScreen);
    requestAnimationFrame(() => renderPeace3D(strategyState.peaceConference));
  }

  function loadPeaceVersaillesMesh(gl) {
    if (peaceVersaillesMesh || peaceVersaillesMeshPromise) return peaceVersaillesMeshPromise;
    peaceVersaillesMeshPromise = fetch(`reference/versailles-hall.obj?v=${CACHE_VERSION}`)
      .then((response) => { if (!response.ok) throw new Error(`OBJ ${response.status}`); return response.text(); })
      .then((source) => {
        const positions = [];
        const groups = new Map();
        let material = "marble";
        const colors = {
          marble: [.72, .68, .58], cream: [.78, .71, .56], ceiling: [.63, .56, .43],
          gold: [.78, .48, .12], wood: [.30, .12, .05], velvet: [.26, .06, .05],
          window: [.32, .58, .75], mirror: [.42, .68, .72], crystal: [.72, .88, .92]
        };
        const group = () => { if (!groups.has(material)) groups.set(material, []); return groups.get(material); };
        source.split(/\r?\n/).forEach((line) => {
          const parts = line.trim().split(/\s+/); if (!parts[0]) return;
          if (parts[0] === "v") positions.push(parts.slice(1, 4).map(Number));
          else if (parts[0] === "usemtl") material = parts[1] || "marble";
          else if (parts[0] === "f") {
            const refs = parts.slice(1).map((ref) => Number(ref.split("/")[0]) - 1);
            for (let i = 1; i < refs.length - 1; i += 1) [refs[0], refs[i], refs[i + 1]].forEach((index) => group().push(...positions[index]));
          }
        });
        peaceVersaillesMesh = [...groups.entries()].map(([name, data]) => {
          const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
          return { buffer, count: data.length / 3, color: colors[name] || colors.marble };
        });
        if (peaceScreen.classList.contains("active") && strategyState?.peaceConference) requestAnimationFrame(() => renderPeace3D(strategyState.peaceConference));
        return peaceVersaillesMesh;
      })
      .catch((error) => { console.warn("Не удалось загрузить модель Версаля", error); peaceVersaillesMeshPromise = null; return null; });
    return peaceVersaillesMeshPromise;
  }

  function renderPeace3D(conference) {
    if (!peace3dCanvas) return;
    const gl = peace3dRenderer?.gl || peace3dCanvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return false;
    if (!peace3dRenderer) {
      const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, "attribute vec3 p; uniform mat4 m; varying vec3 vp; void main(){vp=p;gl_Position=m*vec4(p,1.0);}"); gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, "precision mediump float; uniform vec3 c; varying vec3 vp; void main(){float shade=.72+.28*clamp(vp.y*.5+.5,0.0,1.0); vec3 edge=c*shade; gl_FragColor=vec4(edge,1.0);}"); gl.compileShader(fs);
      const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      const vertices = new Float32Array([
        -1,-1,-1, 1,-1,-1, 1,1,-1, -1,-1,-1, 1,1,-1, -1,1,-1,
        -1,-1,1, 1,1,1, 1,-1,1, -1,-1,1, -1,1,1, 1,1,1,
        -1,-1,-1, -1,1,-1, -1,1,1, -1,-1,-1, -1,1,1, -1,-1,1,
        1,-1,-1, 1,-1,1, 1,1,1, 1,-1,-1, 1,1,1, 1,1,-1,
        -1,-1,-1, -1,-1,1, 1,-1,1, -1,-1,-1, 1,-1,1, 1,-1,-1,
        -1,1,-1, 1,1,-1, 1,1,1, -1,1,-1, 1,1,1, -1,1,1,
      ]);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      peace3dRenderer = { gl, program, buffer, p: gl.getAttribLocation(program, "p"), m: gl.getUniformLocation(program, "m"), c: gl.getUniformLocation(program, "c") };
      loadPeaceVersaillesMesh(gl);
    }
    const r = peace3dRenderer; const width = Math.max(1, peace3dCanvas.clientWidth); const height = Math.max(1, peace3dCanvas.clientHeight);
    peace3dCanvas.width = Math.round(width * devicePixelRatio); peace3dCanvas.height = Math.round(height * devicePixelRatio); gl.viewport(0, 0, peace3dCanvas.width, peace3dCanvas.height);
    gl.enable(gl.DEPTH_TEST); gl.clearColor(0.62, 0.68, 0.72, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(r.program); gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer); gl.enableVertexAttribArray(r.p); gl.vertexAttribPointer(r.p, 3, gl.FLOAT, false, 0, 0);
    const perspective = (f, aspect, near, far) => { const t = Math.tan(f / 2); return [1 / (aspect * t),0,0,0, 0,1/t,0,0, 0,0,(near+far)/(near-far),-1, 0,0,(2*near*far)/(near-far),0]; };
    const multiply = (a,b) => { const o = Array(16).fill(0); for(let row=0;row<4;row++) for(let col=0;col<4;col++) for(let k=0;k<4;k++) o[col*4+row]+=a[k*4+row]*b[col*4+k]; return o; };
    const translate = (x,y,z) => [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
    const scale = (x,y,z) => [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1];
    const rotateX = (a) => [1,0,0,0, 0,Math.cos(a),Math.sin(a),0, 0,-Math.sin(a),Math.cos(a),0, 0,0,0,1];
    const rotateY = (a) => [Math.cos(a),0,-Math.sin(a),0, 0,1,0,0, Math.sin(a),0,Math.cos(a),0, 0,0,0,1];
    // First-person view: the eye stays fixed behind the signing table. Only the
    // view direction changes; we never rotate the room around the camera.
    // Eye position is inside the gallery, just behind the player's side of the
    // signing table (the model's near end is around z=+2.9 after scaling).
    const view = multiply(rotateX(-peaceCameraPitch), multiply(rotateY(Math.PI / 2 - peaceCameraYaw), translate(2.25, -1.35, 0)));
    const camera = multiply(perspective(Math.PI / 3, width / height, .1, 100), view);
    const cube = (x,y,z,sx,sy,sz,color) => { gl.uniformMatrix4fv(r.m, false, new Float32Array(multiply(camera, multiply(translate(x,y,z), scale(sx,sy,sz))))); gl.uniform3fv(r.c, color); gl.drawArrays(gl.TRIANGLES, 0, 36); };
    // The actual Versailles reference model is loaded asynchronously and drawn as a complete room.
    // Non-uniform scale fits the long gallery into the fixed negotiation camera while preserving its height.
    if (peaceVersaillesMesh) {
      const room = multiply(camera, multiply(translate(0, 0.2, 0), scale(.20, .48, .48)));
      peaceVersaillesMesh.forEach((part) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, part.buffer); gl.vertexAttribPointer(r.p, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(r.m, false, new Float32Array(room)); gl.uniform3fv(r.c, part.color); gl.drawArrays(gl.TRIANGLES, 0, part.count);
      });
    } else {
      cube(0,3.9,-3.4,7.8,3.8,.18,[.78,.74,.64]);
      cube(-5.3,1.8,0,.18,3.6,6.2,[.72,.67,.56]); cube(5.3,1.8,0,.18,3.6,6.2,[.72,.67,.56]);
      cube(0,5.25,0,8.1,.18,6.2,[.68,.62,.52]); cube(0,-1.65,0,8.1,.12,6.2,[.43,.25,.13]);
    }
    cube(0,-1.25,0,5.8,.32,3.4,[.25,.10,.035]); cube(0,-.86,0,5.35,.10,2.95,[.68,.36,.10]); cube(0,-.68,.15,2.45,.10,1.55,[.035,.045,.06]); cube(0,.32,.62,2.45,1.18,.08,[.018,.06,.1]); cube(0,.32,.52,2.12,.88,.025,[.04,.3,.42]);
    const people = (conference.participants || []).filter((id) => Number(id) !== Number(strategyState.playerCountryId));
    const delegate = (x, z, suit, skin) => {
      cube(x,-.35,z,.5,.12,.42,[.18,.08,.04]); cube(x,-.05,z,.45,.8,.12,[.28,.12,.06]);
      cube(x,-.1,z,.5,.12,.45,[.22,.12,.07]); cube(x,1.0,z,.38,1.2,.32,suit);
      cube(x,1.0,z-.43,.12,.68,.12,[.1,.15,.22]); cube(x,1.0,z+.43,.12,.68,.12,[.1,.15,.22]); cube(x,2.5,z,.3,.3,.3,skin);
    };
    // The player's delegate sits at the near side of the table; the opposing delegation faces them across it.
    delegate(-1.72, 0, [.06,.17,.31], [.57,.34,.23]);
    people.forEach((id,index) => delegate(1.72, (index - (people.length - 1) / 2) * .72, [.28,.08,.06], [.55,.32,.22]));
    cube(-3.2,2.25,-3.0,1.05,.78,.06,[.12,.34,.5]); cube(3.2,2.25,-3.0,1.05,.78,.06,[.5,.18,.12]);
    if (conference.mediator) { cube(.85,-.1,0,.5,.12,.45,[.22,.12,.07]); cube(.85,1.15,0,.42,1.35,.35,[.22,.25,.3]); cube(.85,1.15,-.43,.12,.72,.12,[.24,.27,.32]); cube(.85,1.15,.43,.12,.72,.12,[.24,.27,.32]); cube(.85,2.75,0,.32,.32,.32,[.64,.39,.25]); }
    updatePeaceOverlayPose();
    return true;
  }

  function updatePeaceOverlayPose() {
    if (!peaceContent) return;
    const workspace = peaceContent.querySelector(".peace-workspace");
    // The laptop is anchored to the table plane: horizontal camera yaw may shift it in depth,
    // but vertical pitch must never make the UI float up or down on the screen.
    if (workspace) workspace.style.transform = "translateX(-50%) translateZ(180px) rotate(-1deg)";
  }

  function renderPeaceSigningScreen() {
    const conference = strategyState?.peaceConference;
    if (!conference || !peaceContent) return;
    const previousLaptop = peaceContent.querySelector(".peace-laptop");
    const laptopScrollTop = previousLaptop?.scrollTop || 0;
    const participantIds = conference.participants.map(Number);
    const participants = participantIds.map((id) => countryById(id)).filter(Boolean);
    const mediatorCountry = conference.mediator?.type === "country" ? countryById(conference.mediator.id) : null;
    const delegatePeople = [...participants.map((country) => ({ ...country, mediator: false })), ...(conference.mediator ? [{
      id: conference.mediator.id,
      name: conference.mediator.name,
      flag: conference.mediator.type === "un" ? "flags/ООН.png" : mediatorCountry?.flag,
      mediator: true,
    }] : [])];
    const playerId = Number(strategyState.playerCountryId);
    const playerCountry = countryById(playerId);
    const targets = peaceEnemies(playerId, conference).map((id) => countryById(id)).filter(Boolean);
    const leadOpponent = targets[0] || participants.find((country) => Number(country.id) !== playerId) || null;
    const venueChoices = peaceVenueChoices(conference);
    const venueCountry = venueChoices.find(({ regionId }) => Number(regionId) === Number(conference.venueRegionId))?.country || countryById(strategyState.playerCountryId);
    const participantSummary = participants.map((country) => country.name).join(" · ");
    const delegateMarkup = (country, side, delay = 0) => !country ? "" : `<div class="delegate ${side}" style="--flag: url('${resolveFlagUrl(country.flag || "")}' ); --delay:${delay}s"><span class="delegate-head"></span><span class="delegate-body"><i class="delegate-lapel"></i><i class="delegate-territory"></i></span><small>${country.name}</small><em>${side === "player-delegate" ? "Ваша делегация" : "Делегация другой стороны"}</em></div>`;
    const playerRegions = targets.flatMap((country) => peaceOccupiedRegionsForTarget(country.id, conference).map(({ regionId, controller }) => ({ country, controller, regionId })));
    const terms = conference.demands.map((demand, index) => {
      const isBotOffer = demand.source === "bot" || demand.source === "mediator";
      return `<article class="peace-term ${demand.status}">
        <small>${isBotOffer ? "Предложение другой стороны" : "Ваше предложение"} · ${peaceDemandStatusText(demand)}</small>
        <strong>${peaceDemandText(demand)}</strong>
        ${demand.speech ? `<div class="speech-bubble">${demand.speech}</div>` : ""}
        ${isBotOffer && demand.status === "pending" ? `<div class="peace-term-actions"><button class="mini-button" type="button" data-peace-action="respond" data-index="${index}" data-accepted="true">Принять</button><button class="danger-button" type="button" data-peace-action="respond" data-index="${index}" data-accepted="false">Отклонить</button></div>` : ""}
      </article>`;
    }).join("") || "<p class=\"peace-empty\">Условий ещё нет. Сформулируйте первое предложение.</p>";
    const titleOptions = ["Договор о прочном мире", "Мирный протокол", "Соглашение о прекращении войны", "Пакт нового рассвета", "Хартия взаимной безопасности", "Договор восстановления границ"];
    peaceContent.innerHTML = `
      <div class="peace-backdrop-details">
        <div class="versailles-window-row">${Array.from({ length: 7 }, (_, index) => `<span class="versailles-window" style="--i:${index}"></span>`).join("")}</div>
        <div class="versailles-mirror-row">${Array.from({ length: 7 }, (_, index) => `<span class="versailles-mirror" style="--i:${index}"></span>`).join("")}</div>
        <div class="versailles-chandelier-row">${Array.from({ length: 5 }, () => "<span></span>").join("")}</div>
        <div class="hall-flag hall-flag-left" style="--flag: url('${resolveFlagUrl(playerCountry?.flag || "")}' )"><span>${playerCountry?.name || "Ваша страна"}</span></div>
        <div class="hall-flag hall-flag-right" style="--flag: url('${resolveFlagUrl(leadOpponent?.flag || "")}' )"><span>${leadOpponent?.name || "Другая сторона"}</span></div>
        <div class="hall-chandelier"></div><div class="hall-clock">${conference.negotiationDate || "—"}</div>
        <div class="hall-panel hall-panel-left"></div><div class="hall-panel hall-panel-right"></div>
        <div class="hall-lamp hall-lamp-left"></div><div class="hall-lamp hall-lamp-right"></div>
        <div class="hall-plant hall-plant-left"></div><div class="hall-plant hall-plant-right"></div>
      </div>
      <div class="peace-hall">
        <div class="peace-delegates">
          <div class="delegation-side delegation-player">${delegateMarkup(playerCountry, "player-delegate")}</div>
          <div class="delegation-side delegation-opponent">${delegateMarkup(leadOpponent, "opponent-delegate", .12)}</div>
          ${conference.mediator ? `<div class="delegate mediator-delegate" style="--flag: url('${resolveFlagUrl(conference.mediator.type === "un" ? "flags/ООН.png" : mediatorCountry?.flag || "")}' ); --delay:.24s"><span class="delegate-head"></span><div class="delegate-speech">${conference.mediator.type === "un" ? "Совет Безопасности ООН предлагает компромисс" : "Посредник предлагает условия, приемлемые для всех"}</div><span class="delegate-body"><i class="delegate-lapel"></i><i class="delegate-territory"></i></span><small>${conference.mediator.name}</small></div>` : ""}
        </div>
        <div class="peace-table"></div>
      </div>
      <div class="peace-workspace">
        <section class="peace-laptop peace-document">
          <div class="laptop-screen-glow"></div>
          <div class="laptop-statusbar"><span class="laptop-status-online"><i></i> ЗАЩИЩЁННЫЙ КАНАЛ</span><span>МИРНАЯ КОНФЕРЕНЦИЯ</span><span>${conference.scheduled ? `ВСТРЕЧА: ${conference.negotiationDate}` : "ОЖИДАНИЕ НАЗНАЧЕНИЯ"}</span></div>
          <header><div><p class="eyebrow">ДИПЛОМАТИЧЕСКИЙ ТЕРМИНАЛ</p><input id="peaceTitle" class="peace-title" list="peaceTitleOptions" type="text" value="${conference.title || "Мирный договор"}" maxlength="80" aria-label="Название мирного договора"><datalist id="peaceTitleOptions">${titleOptions.map((title) => `<option value="${title}">`).join("")}</datalist><small>Введите название или выберите один из вариантов.</small></div><span class="peace-seal">AO</span></header>
          <div class="laptop-parties"><span><b>УЧАСТНИКИ</b> ${participantSummary || "—"}</span><span><b>ПЛОЩАДКА</b> ${venueCountry?.name || "—"}</span></div>
          <label class="peace-field"><span>Место подписания</span><select id="peaceVenue" class="strategy-select">${venueChoices.map(({ country, regionId }) => `<option value="${regionId}" ${Number(conference.venueRegionId) === regionId ? "selected" : ""}>${gameData.regionById.get(regionId)?.name || `Регион ${regionId}`} — ${country.name}</option>`).join("")}</select></label>
          <label class="peace-field"><span>Дата переговоров</span><input id="peaceDate" class="strategy-select" type="date" min="${strategyState.date.toISOString().slice(0, 10)}" value="${conference.negotiationDate || strategyState.date.toISOString().slice(0, 10)}"></label>
          ${conference.scheduled ? `<small class="scheduled-note">Встреча назначена на ${conference.negotiationDate}. ${conference.negotiationDate === strategyState.date.toISOString().slice(0, 10) ? "Делегации готовы к подписанию." : "Вернитесь в день встречи."}</small>` : `<button class="mini-button" type="button" data-peace-action="schedule">Назначить дату и место</button>`}
          <div class="peace-help"><strong>Как выдвинуть требование</strong><span>Выберите другую сторону и тип условия. Для передачи земель сначала оккупируйте нужные регионы, отметьте их ниже, затем нажмите «Записать условие» и «Передать противнику».</span></div>
          <div class="peace-terms">${terms}</div>
          <div class="peace-offer-row">
          <select id="peaceTarget" class="strategy-select">${targets.map((country) => `<option value="${country.id}">${country.name}</option>`).join("")}</select>
          <select id="peaceDemandType" class="strategy-select"><option value="reparations">Репарации</option><option value="annex_occupied">Закрепить оккупации</option><option value="demilitarize">Демилитаризация</option><option value="status_quo">Статус-кво</option></select>
          </div>
          <div class="peace-region-list"><strong>Оккупированные регионы</strong><small>Можно запросить территории, занятые вами или союзниками.</small>${playerRegions.length ? playerRegions.map(({ country, controller, regionId }) => `<label class="peace-region-option"><input type="checkbox" data-peace-region="${regionId}" checked><span>${gameData.regionById.get(Number(regionId))?.name || `Регион ${regionId}`}</span><small>${controller?.name || "Оккупировано союзником"} → ${country.name}</small></label>`).join("") : "<small>Нет регионов для передачи по договору.</small>"}</div>
          <div class="peace-offer-row"><button class="mini-button" type="button" data-peace-action="add">Записать условие</button><button class="mini-button" type="button" data-peace-action="submit">Передать противнику</button></div>
          <button class="primary-button" type="button" data-peace-action="sign" ${conference.scheduled && conference.negotiationDate > strategyState.date.toISOString().slice(0, 10) ? "disabled" : ""}>Подписать мир</button>
        </section>
      </div>`;
    const nextLaptop = peaceContent.querySelector(".peace-laptop");
    if (nextLaptop) {
      nextLaptop.scrollTop = laptopScrollTop;
      requestAnimationFrame(() => { nextLaptop.scrollTop = laptopScrollTop; });
    }
    peaceScreen.classList.toggle("peace-webgl-active", renderPeace3D(conference));
  }

  function canDemandCapitulation(target) {
    if (!target || !target.regionIds?.length) return false;
    const playerId = Number(strategyState.playerCountryId);
    const atWar = strategyState.wars.some((war) => war.active &&
      ((Number(war.attackerId) === playerId && Number(war.defenderId) === Number(target.id)) ||
       (Number(war.defenderId) === playerId && Number(war.attackerId) === Number(target.id))));
    const controlledRegions = target.regionIds.filter((regionId) => Number(controllerOfRegion(regionId)?.id) === playerId);
    const capitalControlled = Number(controllerOfRegion(target.capitalRegionId)?.id) === playerId;
    return atWar && capitalControlled && controlledRegions.length >= Math.ceil(target.regionIds.length / 2);
  }

  function demandCapitulation(targetId) {
    const player = currentPlayerCountry();
    const target = countryById(targetId);
    if (!player || !target || !canDemandCapitulation(target)) {
      addLog("Для капитуляции нужно контролировать столицу и не менее половины регионов противника.");
      renderStrategyPanel();
      return;
    }
    const regions = [...target.regionIds].map(Number);
    regions.forEach((regionId) => transferRegionOwnership(regionId, player.id));
    target.regionIds = [];
    target.capitalRegionId = 0;
    const targetRuntime = strategyState.countryStates[String(target.id)];
    if (targetRuntime) {
      targetRuntime.capitulated = true;
      targetRuntime.armies = [];
    }
    strategyState.wars.forEach((war) => {
      if (war.active && (Number(war.attackerId) === Number(target.id) || Number(war.defenderId) === Number(target.id))) {
        war.active = false;
        war.ended = strategyState.date.toISOString().slice(0, 10);
        war.capitulation = true;
      }
    });
    const clearedOccupations = clearCapitulationOccupations(target.id, regions);
    rebuildOwnerByRegion();
    markMapDirty();
    setRelation(player.id, target.id, -35);
    addLog(`${target.name} капитулировала. Все её территории переданы стране ${player.name}, снято оккупаций: ${clearedOccupations}.`);
    playSound("peace");
    renderGameMap();
    renderStrategyPanel();
  }

  function startRealtimeClock() {
    // Compatibility hook: turns are advanced only by the player action below.
    stopRealtimeClock();
  }

  function stopRealtimeClock() {
    if (!gameTimer) return;
    window.clearInterval(gameTimer);
    gameTimer = null;
  }

  function togglePause() {
    stopRealtimeClock();
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

  function startConstruction(projectId, regionId, options = {}) {
    const runtime = currentPlayerState();
    const template = CONSTRUCTION_PROJECTS.find((item) => item.id === projectId);
    const profile = runtime?.regionProfiles[String(regionId)];
    if (!runtime || !template || !profile || (!options.sponsored && !canPayRuntimeCost(runtime, template.cost))) return;
    if (!options.sponsored) payRuntimeCost(runtime, template.cost);
    if (options.administrative) runtime.administrativeSlotsUsed += 1;
    runtime.constructions.push({
      projectId,
      regionId: Number(regionId),
      progress: 0,
      days: template.days,
      administrativeUnitId: options.unitId || null,
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

  function appointGovernor(regionId, educationId, policyId) {
    const runtime = currentPlayerState();
    const profile = runtime?.regionProfiles[String(regionId)];
    const country = currentPlayerCountry();
    const owner = directOwnerOfRegion(regionId);
    const policy = REGION_MINISTERS.find((item) => item.id === policyId);
    const education = GOVERNOR_EDUCATIONS.find((item) => item.id === educationId);
    if (!runtime || !profile || !country || !owner || Number(owner.id) !== Number(country.id) || !policy || !education || runtime.politicalPower < 15) {
      if (country && owner && Number(owner.id) !== Number(country.id)) addLog("Нельзя назначать администрацию в иностранном или оккупированном регионе.");
      return;
    }
    runtime.politicalPower -= 15;
    profile.minister = policy.id;
    profile.governor = {
      ...(profile.governor || createRegionalGovernor(regionId, country)),
      education: education.id,
      appointedAt: strategyState.date.toISOString().slice(0, 10),
      source: "Игровое назначение",
      verified: false,
      approval: clamp((profile.governor?.approval || 52) + 4, 0, 100),
    };
    addLog(`Региональная администрация назначена. Образование: ${education.name}; курс: ${policy.name}.`);
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
    if (reward.organizationLeave) parts.push(`Выход: ${String(reward.organizationLeave).split(/[;|,]/).join(", ").toUpperCase()}`);
    if (reward.organizationJoin) parts.push(`Вступление: ${String(reward.organizationJoin).split(/[;|,]/).join(", ").toUpperCase()}`);
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
    const activeFocuses = getActiveFocuses(runtime);
    const atWar = strategyState.wars.some((war) => war.active && (Number(war.attackerId) === Number(player.id) || Number(war.defenderId) === Number(player.id)));
    const interfaceHint = strategyState.peaceConference
      ? "Мирная конференция открыта: во вкладке «Войны» можно перейти к условиям и подписанию."
      : activeFocuses.length
        ? `Фокус идёт: ${activeFocuses[0].progress || 0}/${getFocusTree(player, gameData.scenario.year).find((focus) => focus.id === activeFocuses[0].id)?.days || 70} дн. Завершайте ход, чтобы продвигать его.`
        : atWar
          ? "Идёт война: отдайте армии приказы, оккупируйте регионы и затем откройте мирную конференцию во вкладке «Войны»."
          : "Следующий шаг: выберите национальный фокус, настройте производство или дипломатию, затем завершите ход.";
    stateSummary.innerHTML = `
      <div class="state-title">
        <div class="state-title-copy">
          <strong>${player.name}</strong>
          <span>${dateLabel}</span>
        </div>
        <span class="state-flag"><img src="${resolveFlagUrl(player.flag || "")}" alt="Флаг: ${player.name}"></span>
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
      <p class="interface-hint"><strong>Подсказка</strong>${interfaceHint}</p>
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
      ${owner ? `
        <div class="map-country-actions">
          <small>Отношения: ${Number(owner.id) === Number(strategyState.playerCountryId) ? "ваша страна" : `${getRelation(strategyState.playerCountryId, owner.id) > 0 ? "+" : ""}${getRelation(strategyState.playerCountryId, owner.id)}`}</small>
          <button class="mini-button" type="button" data-action="map-country-diplomacy" data-id="${owner.id}">Дипломатия</button>
          <button class="danger-button" type="button" data-action="map-country-war" data-id="${owner.id}" ${Number(owner.id) === Number(strategyState.playerCountryId) ? "disabled" : ""}>Война</button>
        </div>
      ` : ""}
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
          const done = !focus.repeatable && runtime.completedFocuses.includes(focus.id);
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
              ${focus.repeatable ? "<small>Повторяемый фокус · доступен после каждого завершения</small>" : ""}
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
    const regionalElections = (strategyState.regionalElections || []).filter((item) => Number(item.countryId) === Number(player.id));
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Внутренняя политика</h3>
        <article class="strategy-card accent-card">
          <header><strong>Налоги и военный бюджет</strong><small>текущая ставка: ${runtime.taxRate}%</small></header>
          <p>Налоги пополняют бюджет каждый день. Во время войны доход увеличивается, а региональные расходы сохраняют резерв не менее 25 единиц.</p>
          <select id="taxRateSelect" class="strategy-select">
            ${[10, 15, 20, 25, 30, 35, 40, 45, 50].map((rate) => `<option value="${rate}" ${Number(runtime.taxRate) === rate ? "selected" : ""}>${rate}%</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="set-tax">Изменить налоговую ставку</button>
        </article>
        ${regionalElections.length ? `
          <article class="strategy-card accent-card">
            <header><strong>Региональные выборы</strong><small>${regionalElections.length} ожидают решения</small></header>
            ${regionalElections.map((election) => `
              <div class="advisor-row">
                <span><strong>${election.name}</strong><small>Запрос на проведение выборов от ${gameDateLabel(new Date(`${election.openedAt}T00:00:00`), { short: true })}</small></span>
                <div class="inline-actions">
                  <button class="mini-button" type="button" data-action="regional-election-approve" data-id="${election.id}">Согласовать</button>
                  <button class="danger-button" type="button" data-action="regional-election-refuse" data-id="${election.id}">Отказать</button>
                </div>
              </div>
            `).join("")}
          </article>
        ` : ""}
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
        <article class="strategy-card accent-card">
          <header><strong>Персоналии</strong><small>лояльность и черты</small></header>
          ${runtime.characters.map((character) => `
            <div class="advisor-row">
              <span>
                <strong>${character.name}</strong>
                <small>${character.role} · ${character.trait} · лояльность ${Math.round(character.loyalty)}%</small>
                <small>${effectsText(character.effects)}</small>
              </span>
              <button class="mini-button" type="button" data-action="character" data-id="${character.id}" ${character.active || runtime.politicalPower < character.cost ? "disabled" : ""}>Назначить</button>
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
        <h3>Экономика</h3>
        <article class="strategy-card accent-card">
          <header><strong>Заводы</strong><small>${used}/${runtime.factories} занято</small></header>
          <p>Назначайте заводы на линии. Выпуск идет автоматически каждый день, пока хватает ресурсов.</p>
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Конструктор техники</strong><small>танки · авиация · флот</small></header>
          <p>Настройка проекта меняет эффективность будущего выпуска. Чем сложнее модули, тем дороже разработка.</p>
        </article>
        ${["tank", "aircraft", "ship"].map((kind) => renderEquipmentDesigner(kind, runtime)).join("")}
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
        <article class="strategy-card accent-card">
          <header><strong>Режим карты</strong><small>${mapModeLabel(mapMode)}</small></header>
          ${renderMapModeGrid()}
          <small>Режимы перекрашивают карту без смены партии. Линии фронта и маршруты армий видны поверх всех режимов.</small>
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
          <select id="nonAggressionMonths" class="strategy-select" aria-label="Срок пакта о ненападении">
            <option value="1">Ненападение: 1 месяц</option>
            <option value="3">Ненападение: 3 месяца</option>
            <option value="6">Ненападение: 6 месяцев</option>
            <option value="12" selected>Ненападение: 1 год</option>
            <option value="24">Ненападение: 2 года</option>
          </select>
          <div class="inline-actions treaty-actions">
            <button class="mini-button" type="button" data-action="access">Проход</button>
            <button class="mini-button" type="button" data-action="visa">Безвиз</button>
            <button class="mini-button" type="button" data-action="base">База</button>
            <button class="mini-button" type="button" data-action="non-aggression">Ненападение</button>
            <button class="mini-button" type="button" data-action="guarantee">Гарантия</button>
            <button class="mini-button" type="button" data-action="security-guarantee">Безопасность</button>
          </div>
          <small>Срок пакта выбирается от месяца до двух лет. Проход и безвиз доступны при нейтральных отношениях. База требует +20 и бюджет.</small>
        </article>
        <article class="strategy-card">
          <strong>Давление и деэскалация</strong>
          <select id="pressureTarget" class="strategy-select">${countryOptions()}</select>
          <div class="inline-actions treaty-actions">
            <button class="danger-button" type="button" data-action="ultimatum">Ультиматум</button>
            <button class="mini-button" type="button" data-action="ceasefire">Перемирие</button>
          </div>
          <small>Ультиматум повышает поддержку войны или ломает волю слабой цели. Перемирие останавливает прямую войну, но не решает спор об оккупациях.</small>
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

  function mapModeLabel(mode) {
    return MAP_MODES.find((item) => item.id === mode)?.label.toLowerCase() || "политическая";
  }

  function renderMapModeGrid() {
    return `
      <div class="map-mode-grid map-mode-grid-wide">
        ${MAP_MODES.map((mode) => `
          <button class="mini-button ${mapMode === mode.id ? "active" : ""}" type="button" data-action="map-mode" data-id="${mode.id}">
            <strong>${mode.label}</strong>
            <small>${mode.text}</small>
          </button>
        `).join("")}
      </div>
    `;
  }

  function geoTagLabel(tag) {
    return {
      mountain: "Горы",
      coast: "Побережье",
      island: "Остров",
      peninsula: "Полуостров",
      archipelago: "Архипелаг",
      strait: "Пролив",
      naval_chokepoint: "Морской узел",
      land_chokepoint: "Сухопутный узел",
    }[tag] || tag;
  }

  function importantGeoProfiles(limit = 14) {
    return [...(gameData?.regionGeoProfiles?.values() || [])]
      .filter((profile) => profile.tags.some((tag) => ["mountain", "island", "peninsula", "archipelago", "strait", "naval_chokepoint", "land_chokepoint"].includes(tag)))
      .sort((a, b) => {
        const score = (profile) => profile.tags.length * 10 + profile.roughness + (profile.tags.includes("naval_chokepoint") ? 60 : 0) + (profile.tags.includes("mountain") ? 35 : 0);
        return score(b) - score(a);
      })
      .slice(0, limit);
  }

  function renderMapsPanel() {
    const selectedId = strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId;
    const selectedProfile = geoProfile(selectedId);
    const selectedRegion = gameData.regionById.get(Number(selectedId));
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Карты</h3>
        <article class="strategy-card accent-card">
          <header><strong>Атлас кампании</strong><small>${mapModeLabel(mapMode)}</small></header>
          ${renderMapModeGrid()}
          <small>Выберите режим, затем нажимайте регионы на карте. Географические режимы показывают препятствия и преимущества: горы, острова, полуострова, архипелаги, проливы и узкие места.</small>
        </article>
        <article class="strategy-card map-legend-card">
          <header><strong>Легенда</strong><small>${mapModeLabel(mapMode)}</small></header>
          ${mapLegendItems(mapMode).map((item) => `<span><i style="background:${item.color}"></i>${item.text}</span>`).join("")}
        </article>
        <article class="strategy-card accent-card">
          <header><strong>${selectedRegion?.name || `Регион ${selectedId}`}</strong><small>${selectedProfile?.tags.map(geoTagLabel).join(" · ") || "обычный регион"}</small></header>
          ${selectedProfile ? `
            <div class="resource-grid">
              <span class="resource-pill"><small>Тип</small><strong>${selectedProfile.type === "sea" ? "вода" : "суша"}</strong></span>
              <span class="resource-pill"><small>Рельеф</small><strong>${selectedProfile.roughness}%</strong></span>
              <span class="resource-pill"><small>Соседи суши</small><strong>${selectedProfile.landNeighbors}</strong></span>
              <span class="resource-pill"><small>Соседи воды</small><strong>${selectedProfile.seaNeighbors}</strong></span>
            </div>
            ${selectedProfile.help.length ? `<small class="status-ok">Помогает: ${selectedProfile.help.join(", ")}.</small>` : ""}
            ${selectedProfile.problem.length ? `<small class="status-bad">Мешает: ${selectedProfile.problem.join(", ")}.</small>` : ""}
          ` : "<p>Нет географических данных региона.</p>"}
        </article>
        <article class="strategy-card">
          <header><strong>Ключевые точки карты</strong><small>${importantGeoProfiles().length}</small></header>
          ${importantGeoProfiles().map((profile) => `
            <button class="geo-feature-row" type="button" data-action="select-map-region" data-id="${profile.regionId}">
              <span><strong>${profile.name || `Регион ${profile.regionId}`}</strong><small>${profile.tags.map(geoTagLabel).join(" · ")}</small></span>
              <small>${profile.help[0] || profile.problem[0] || "географический фактор"}</small>
            </button>
          `).join("")}
        </article>
      </section>
    `;
  }

  function renderEquipmentDesigner(kind, runtime) {
    const config = EQUIPMENT_DESIGN_OPTIONS[kind];
    const design = runtime.equipmentDesigns?.[kind] || DEFAULT_EQUIPMENT_DESIGNS[kind];
    const stats = designStats(kind, design);
    const cost = 18 + stats.cost;
    return `
      <article class="strategy-card equipment-designer">
        <header><strong>${config.label}</strong><small>разработка: ${cost} бюджета${stats.rare ? ` · ${stats.rare} редких` : ""}</small></header>
        ${Object.entries(config.fields).map(([field, options]) => `
          <label class="design-field">
            <small>${field}</small>
            <select id="design-${kind}-${field}" class="strategy-select">
              ${options.map((option) => `<option value="${option.id}" ${design[field] === option.id ? "selected" : ""}>${option.name}</option>`).join("")}
            </select>
          </label>
        `).join("")}
        <small>${designStatsText(kind, design)}</small>
        <button class="mini-button" type="button" data-action="save-design" data-kind="${kind}">Сохранить проект</button>
      </article>
    `;
  }

  function mapLegendItems(mode) {
    const legends = {
      political: [
        { color: "#c8a763", text: "столицы и армии поверх политической карты" },
        { color: "#6f4d42", text: "оккупации смешивают цвет владельца и контролера" },
      ],
      war: [
        { color: "#e2342b", text: "противники и фронты" },
        { color: "#f5dd6f", text: "выбранная страна" },
        { color: "#5ba669", text: "военный доступ и союзники" },
      ],
      supply: [
        { color: "#7c2d2a", text: "дефицит снабжения" },
        { color: "#bc8f40", text: "напряжение" },
        { color: "#509766", text: "устойчивая логистика" },
      ],
      stability: [
        { color: "#742624", text: "кризис" },
        { color: "#b39441", text: "средняя стабильность" },
        { color: "#4b8f5c", text: "устойчивость" },
      ],
      economy: [
        { color: "#2d3c4a", text: "слабая экономика" },
        { color: "#7e7e4c", text: "средняя экономика" },
        { color: "#cdb868", text: "экономический центр" },
      ],
      terrain: [
        { color: "#70675a", text: "горы и трудный рельеф" },
        { color: "#968e60", text: "побережья" },
        { color: "#48704a", text: "равнины" },
      ],
      water: [
        { color: "#2a87a9", text: "проливы" },
        { color: "#57a171", text: "острова" },
        { color: "#90985e", text: "полуострова" },
      ],
      strategic: [
        { color: "#8a564a", text: "горы: оборона, плохое снабжение" },
        { color: "#539d76", text: "острова и архипелаги" },
        { color: "#2d8eb6", text: "морские узлы" },
      ],
      logistics: [
        { color: "#ccb95f", text: "базы снабжения" },
        { color: "#d6a04a", text: "столицы и центры" },
        { color: "#7c4f47", text: "сложные горные маршруты" },
      ],
      relations: [
        { color: "#00ff00", text: "хорошие отношения" },
        { color: "#ff0000", text: "плохие отношения" },
      ],
    };
    return legends[mode] || legends.political;
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
