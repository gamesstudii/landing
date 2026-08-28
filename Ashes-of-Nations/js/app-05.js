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
    const capitulationTargets = [...new Map(activeWars.flatMap((war) => [war.attackerId, war.defenderId])
      .map((id) => countryById(id))
      .filter((country) => country && Number(country.id) !== Number(strategyState.playerCountryId))
      .map((country) => [country.id, country])).values()];
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
          <select id="warGoal" class="strategy-select">${WAR_GOALS.map((goal) => `<option value="${goal.id}">${goal.name}</option>`).join("")}</select>
          <button class="danger-button" type="button" data-action="war">Объявить</button>
          <button class="mini-button" type="button" data-action="occupy">Операция</button>
          <button class="danger-button" type="button" data-action="nuclear-deterrence">Ядерное сдерживание</button>
          <small>Выберите цель войны: она задает нужный военный счёт и показывает, когда переговорная позиция достигнута.</small>
        </article>
        <article class="strategy-card accent-card">
          <header><strong>Морские операции</strong><small>мощность флота: ${Math.round(currentPlayerState().navyPower || 0)}</small></header>
          <select id="navalTarget" class="strategy-select">${activeWars.filter((war) => Number(war.attackerId) === Number(strategyState.playerCountryId) || Number(war.defenderId) === Number(strategyState.playerCountryId)).map((war) => countryById(enemyForWar(war, strategyState.playerCountryId))).filter(Boolean).map((country) => `<option value="${country.id}">${country.name}</option>`).join("") || '<option value="">Нет противника в войне</option>'}</select>
          <select id="navalZone" class="strategy-select">${navalZoneOptions() || '<option value="">Нет морских зон на карте</option>'}</select>
          <button class="mini-button" type="button" data-action="naval-blockade" ${currentPlayerState().navyPower > 0 ? "" : "disabled"}>Начать блокаду</button>
          <button class="mini-button" type="button" data-action="naval-escort" ${currentPlayerState().navyPower > 0 ? "" : "disabled"}>Эскорт и прорыв</button>
          <button class="text-button" type="button" data-action="naval-clear" ${currentPlayerState().navalMission ? "" : "disabled"}>Снять задачу</button>
          <small>${currentPlayerState().navalMission ? `${currentPlayerState().navalMission.type === "blockade" ? "Блокада" : "Эскорт"}: ${countryById(currentPlayerState().navalMission.targetId)?.name || "цель"}${currentPlayerState().navalMission.seaRegionId ? ` · ${gameData.regionById.get(Number(currentPlayerState().navalMission.seaRegionId))?.name || "морская зона"}` : ""}. Блокада снижает бюджет, стабильность и объём контрактов при превосходстве на море.` : "Флот работает через порты и морские регионы; построенные корабли дают мощность для блокады или защиты торговых маршрутов."}</small>
        </article>
        ${capitulationTargets.length ? `<article class="strategy-card accent-card">
          <header><strong>Капитуляция</strong><small>столица и 50% регионов</small></header>
          <p>Захватите столицу и не менее половины регионов противника. После этого кнопка станет доступна и страна капитулирует целиком.</p>
          ${capitulationTargets.map((country) => {
            const total = (country.regionIds || []).length;
            const controlled = (country.regionIds || []).filter((regionId) => Number(controllerOfRegion(regionId)?.id) === Number(strategyState.playerCountryId)).length;
            const capitalControlled = Number(controllerOfRegion(country.capitalRegionId)?.id) === Number(strategyState.playerCountryId);
            const ready = canDemandCapitulation(country);
            return `<button class="danger-button" type="button" data-action="demand-capitulation" data-id="${country.id}" ${ready ? "" : "disabled"}>${ready ? "Принять капитуляцию" : `Капитуляция: ${controlled}/${Math.ceil(total / 2)} регионов${capitalControlled ? "" : " · столица не захвачена"}`} — ${country.name}</button>`;
          }).join("")}
        </article>` : ""}
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
            ${conference.scheduled ? `<small>Временное перемирие действует до ${conference.negotiationDate}. Место: ${gameData.regionById.get(Number(conference.venueRegionId))?.name || "не выбрано"}.</small><button class="mini-button" type="button" data-action="open-peace">Открыть зал переговоров</button>` : `
              <small>Сначала назначьте место и дату. После назначения начинается временное перемирие до постоянного мира.</small>
              <label class="peace-field war-schedule-field"><span>Место договора</span><select id="peaceVenue" class="strategy-select">${peaceVenueChoices(conference).map(({ country, regionId }) => `<option value="${regionId}" ${Number(conference.venueRegionId) === regionId ? "selected" : ""}>${gameData.regionById.get(regionId)?.name || `Регион ${regionId}`} — ${country.name}</option>`).join("")}</select></label>
              <label class="peace-field war-schedule-field"><span>Дата договора</span><input id="peaceDate" class="strategy-select" type="date" min="${strategyState.date.toISOString().slice(0, 10)}" value="${conference.negotiationDate || strategyState.date.toISOString().slice(0, 10)}"></label>
              <button class="primary-button" type="button" data-action="schedule-peace">Назначить место и дату</button>
            `}
          ` : `
            <p>Полный мир подписывается на отдельной дипломатической встрече; там стороны обмениваются и согласуют условия.</p>
            <button class="mini-button" type="button" data-action="open-peace" ${activeWars.length ? "" : "disabled"}>Открыть конференцию</button>
          `}
        </article>
        <article class="strategy-card">
          <strong>Посредник для мира</strong>
          <select id="peaceMediator" class="strategy-select"><option value="un">Совет Безопасности ООН</option>${gameData.scenario.countries.filter((country) => Number(country.id) !== Number(strategyState.playerCountryId) && !activeWars.some((war) => Number(war.attackerId) === Number(country.id) || Number(war.defenderId) === Number(country.id))).map((country) => `<option value="${country.id}">${country.name}</option>`).join("")}</select>
          <button class="mini-button" type="button" data-action="invite-peace-mediator">Позвать посредника</button>
          <small>Посредник подготовит компромиссный проект, который можно принять или отклонить в зале переговоров.</small>
        </article>
        ${activeWars.length ? activeWars.map((war) => {
          const attacker = gameData.scenario.countries.find((country) => Number(country.id) === Number(war.attackerId));
          const defender = gameData.scenario.countries.find((country) => Number(country.id) === Number(war.defenderId));
          const attackerScore = warProgressScore(war, war.attackerId);
          const defenderScore = warProgressScore(war, war.defenderId);
          const goal = warGoalFor(war);
          const attackerAgenda = agendaFor(strategyState.countryStates[String(war.attackerId)]);
          return `<article class="strategy-card"><header><strong>${attacker?.name || "?"} vs ${defender?.name || "?"}</strong><small>с ${war.start}</small></header><p>Цель атакующего: <strong>${goal.name}</strong> · военный счёт ${attackerScore}/${goal.scoreNeed}${warGoalAchieved(war, war.attackerId) ? " · цель достигнута" : ""}</p><small>${attacker?.name || "Атакующий"}: ${attackerAgenda.name} · счёт обороны ${defenderScore}. ${goal.text}</small></article>`;
        }).join("") : '<article class="strategy-card"><p>Активных войн нет.</p></article>'}
      </section>
    `;
  }

  function armyRouteText(runtime, army, targetRegionId) {
    const route = armyRoute(runtime, army, targetRegionId);
    if (!route?.length) return "Маршрут недоступен";
    return route.map((regionId) => gameData.regionById.get(Number(regionId))?.name || regionId).join(" → ");
  }

  function renderArmy(runtime) {
    const ownRegions = currentPlayerCountry().regionIds || [];
    const currentMinister = ARMY_MINISTERS.find((item) => item.id === runtime.armyMinister) || ARMY_MINISTERS[0];
    const activeGeneral = runtime.characters?.find((character) => character.id === runtime.activeGeneralId && character.active && character.role === "Генерал");
    const regionOptions = ownRegions.map((regionId) => {
      const region = gameData.regionById.get(Number(regionId));
      return `<option value="${regionId}">${region?.name || `Регион ${regionId}`}</option>`;
    }).join("");
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Армия и базы</h3>
        <article class="strategy-card accent-card">
          <header><strong>Сухопутные силы</strong><small>${runtime.armies.length} армий · ${runtime.bases.length} баз</small></header>
          <div class="resource-grid">
            <span class="resource-pill"><small>Снабжение</small><strong>${runtime.supply?.level || 100}%</strong></span>
            <span class="resource-pill"><small>Статус</small><strong>${runtime.supply?.status || "норма"}</strong></span>
            <span class="resource-pill"><small>Потребность</small><strong>${Math.round(runtime.supply?.demand || 0)}</strong></span>
            <span class="resource-pill"><small>Мощность</small><strong>${Math.round(runtime.supply?.capacity || 0)}</strong></span>
          </div>
          <p>${currentMinister.id === "none" ? "Ручной режим: армии формируются и двигаются игроком." : `${currentMinister.name} сам формирует армии и отправляет их на фронт. Игрок может помогать вручную.`}</p>
          <small>${activeGeneral ? `Командующий фронтом: ${activeGeneral.name}. Во время войны он сам формирует части, направляет их и занимает регионы противника.` : "Генерал не назначен: армии формируются и получают маршруты вручную."}</small>
          ${runtime.supply?.lastLosses ? `<small>Последние потери от снабжения: ${runtime.supply.lastLosses} солд.</small>` : "<small>Логистика в норме: ежедневных потерь от снабжения нет.</small>"}
          <small>Выберите цель кликом по региону на карте, затем вернитесь сюда: перед приказом будет показан весь сухопутный маршрут. Вода не используется для маршрутов.</small>
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
          const targetRegionId = Number(strategyState.selectedRegionId || 0);
          const target = gameData.regionById.get(targetRegionId);
          const routeText = targetRegionId ? armyRouteText(runtime, army, targetRegionId) : "Выберите цель на карте";
          const canMove = targetRegionId && armyRoute(runtime, army, targetRegionId)?.length;
          return `
            <article class="strategy-card">
              <header><strong>${army.name}</strong><small>${Math.floor(army.soldiers)} солд. · ${Math.round(army.readiness)}% · снаб. ${Math.round(army.lastSupply || runtime.supply?.level || 100)}%</small></header>
              <p>${army.movingTo ? `Движется: ${army.eta} дн.` : `Регион: ${location?.name || army.regionId}`}</p>
              ${army.order ? `<small>Приказ: ${army.order}</small>` : ""}
              <small>Цель: ${target?.name || "не выбрана"}</small>
              <small>Путь: ${routeText}</small>
              <button class="mini-button" type="button" data-action="move-army" data-id="${army.id}" data-target-id="${targetRegionId}" ${canMove ? "" : "disabled"}>Направить по маршруту</button>
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

  function renderAdministrationEditor() {
    const player = currentPlayerCountry();
    const runtime = currentPlayerState();
    const selectedMapRegion = Number(strategyState.selectedRegionId || player?.capitalRegionId || 0);
    const units = strategyState.administrativeRegions || [];
    const selected = units.find((unit) => unit.id === strategyState.selectedAdministrativeUnitId) || units[0];
    if (selected) strategyState.selectedAdministrativeUnitId = selected.id;
    const labels = { region: "Регион / провинция", district: "Район / городской округ", city: "Город" };
    const freeSlots = Math.max(0, Number(runtime?.administrativeSlots || 0) - Number(runtime?.administrativeSlotsUsed || 0));
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Административное деление</h3>
        <article class="strategy-card accent-card">
          <header><strong>Редактор административных единиц</strong><small>владение картой не меняется</small></header>
          <p>Страна по-прежнему состоит из обычных регионов карты. Здесь они объединяются в административные единицы; одна единица может включать регионы разных стран.</p>
          <p>Выбранный регион карты: <strong>${gameData.regionById.get(selectedMapRegion)?.name || "не выбран"}</strong></p>
          <button class="mini-button" type="button" data-action="create-admin-unit" ${selectedMapRegion ? "" : "disabled"}>Создать единицу из выбранного региона</button>
        </article>
        <article class="strategy-card">
          <header><strong>Строительные слоты администрации</strong><small>${freeSlots} свободно из ${runtime?.administrativeSlots || 0}</small></header>
          <p>Администрации сами запрашивают слот под завод. Армией, внешней политикой и обычными приказами вы управляете самостоятельно.</p>
        </article>
        <article class="strategy-card accent-card">
          <label class="law-row"><small>Административная единица</small><select id="adminUnitSelect" class="strategy-select">
            ${units.map((unit) => `<option value="${unit.id}" ${unit.id === selected?.id ? "selected" : ""}>${unit.name} · ${unit.regionIds.length} регионов</option>`).join("")}
          </select></label>
          ${selected ? `
            <label class="law-row"><small>Название</small><input id="adminUnitName" class="strategy-select" value="${selected.name}"></label>
            <label class="law-row"><small>Уровень</small><select id="adminUnitLevel" class="strategy-select">
              ${Object.entries(labels).map(([id, name]) => `<option value="${id}" ${selected.level === id ? "selected" : ""}>${name}</option>`).join("")}
            </select></label>
            <button class="mini-button" type="button" data-action="save-admin-unit">Сохранить изменения</button>
            <label class="law-row"><small>Добавить обычный регион</small><select id="adminMemberPicker" class="strategy-select">
              ${(gameData.map?.regions || []).filter((region) => region.type !== "sea" && !selected.regionIds.includes(Number(region.id))).map((region) => `<option value="${region.id}">${region.name}</option>`).join("")}
            </select></label>
            <button class="mini-button" type="button" data-action="add-admin-member">Добавить в единицу</button>
            <div class="event-log">
              ${selected.regionIds.map((regionId) => `<div class="advisor-row"><span><strong>${gameData.regionById.get(Number(regionId))?.name || regionId}</strong><small>${ownerOfRegion(regionId)?.name || "без владельца"}</small></span><button class="mini-button" type="button" data-action="remove-admin-member" data-id="${regionId}" ${selected.regionIds.length < 2 ? "disabled" : ""}>Убрать</button></div>`).join("")}
            </div>
          ` : "<p>Административных единиц пока нет.</p>"}
        </article>
      </section>`;
  }

  function createAdministrativeUnit() {
    const regionId = Number(strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId || 0);
    if (!regionId) return;
    const previous = administrativeUnitForRegion(regionId);
    if (previous) previous.regionIds = previous.regionIds.filter((id) => Number(id) !== regionId);
    strategyState.administrativeRegions = strategyState.administrativeRegions.filter((unit) => unit.regionIds.length);
    const unit = { id: `admin-custom-${Date.now()}`, name: gameData.regionById.get(regionId)?.name || `Регион ${regionId}`, level: "region", regionIds: [regionId], nextRequestAt: null };
    strategyState.administrativeRegions.push(unit);
    strategyState.selectedAdministrativeUnitId = unit.id;
    addLog(`Создана административная единица «${unit.name}».`);
    renderStrategyPanel();
  }

  function saveAdministrativeUnit() {
    const unit = strategyState.administrativeRegions.find((item) => item.id === strategyState.selectedAdministrativeUnitId);
    if (!unit) return;
    unit.name = document.getElementById("adminUnitName")?.value.trim() || unit.name;
    unit.level = document.getElementById("adminUnitLevel")?.value || unit.level;
    addLog(`Административная единица «${unit.name}» обновлена.`);
    renderStrategyPanel();
  }

  function addAdministrativeMember() {
    const unit = strategyState.administrativeRegions.find((item) => item.id === strategyState.selectedAdministrativeUnitId);
    const regionId = Number(document.getElementById("adminMemberPicker")?.value);
    if (!unit || !regionId || unit.regionIds.includes(regionId)) return;
    const previous = administrativeUnitForRegion(regionId);
    if (previous) previous.regionIds = previous.regionIds.filter((id) => Number(id) !== regionId);
    unit.regionIds.push(regionId);
    strategyState.administrativeRegions = strategyState.administrativeRegions.filter((item) => item.regionIds.length);
    renderStrategyPanel();
  }

  function removeAdministrativeMember(regionId) {
    const unit = strategyState.administrativeRegions.find((item) => item.id === strategyState.selectedAdministrativeUnitId);
    if (!unit || unit.regionIds.length < 2) return;
    unit.regionIds = unit.regionIds.filter((id) => Number(id) !== Number(regionId));
    const region = gameData.regionById.get(Number(regionId));
    strategyState.administrativeRegions.push({ id: `admin-${regionId}-${Date.now()}`, name: region?.name || `Регион ${regionId}`, level: "region", regionIds: [Number(regionId)], nextRequestAt: null });
    renderStrategyPanel();
  }

  function renderRegions() {
    const player = currentPlayerCountry();
    const { id, owner, profile } = selectedRegionProfile();
    const region = gameData.regionById.get(Number(id));
    const controller = controllerOfRegion(id);
    const occupiedByPlayer = (gameData.scenario.occupations || []).some((occupation) => Number(occupation.regionId) === Number(id) && Number(occupation.controllerCountryId) === Number(player.id));
    const occupationPolicyState = occupiedByPlayer ? occupationPolicy(id) : null;
    strategyContent.innerHTML = `
      <section class="tab-section">
        <h3>Регионы</h3>
        <article class="strategy-card accent-card">
          <header><strong>${region?.name || `Регион ${id}`}</strong><small>${owner?.name || "нет владельца"}${controller && owner && Number(controller.id) !== Number(owner.id) ? ` · оккупант: ${controller.name}` : ""}</small></header>
          ${profile ? `
            <p>Уровень: ${profile.administration?.level || "регион"} · Подчинение: ${profile.administration?.parent || "центральная администрация"}</p>
            <div class="resource-grid">
              <span class="resource-pill"><small>Население</small><strong>${Math.floor(profile.population).toLocaleString("ru-RU")}</strong></span>
              <span class="resource-pill"><small>Готовые солдаты</small><strong>${Math.floor(profile.readySoldiers).toLocaleString("ru-RU")}</strong></span>
              <span class="resource-pill"><small>ВВП региона</small><strong>${profile.gdp} млрд</strong></span>
              <span class="resource-pill"><small>Экономика</small><strong>${profile.economy}</strong></span>
              <span class="resource-pill"><small>Администрация</small><strong>${GOVERNOR_EDUCATIONS.find((item) => item.id === profile.governor?.education)?.name || "не назначена"}</strong></span>
              <span class="resource-pill"><small>Доверие</small><strong>${Math.round(profile.governor?.approval || 0)}%</strong></span>
              <span class="resource-pill"><small>Здания</small><strong>${profile.buildings.length}</strong></span>
              <span class="resource-pill"><small>Снабжение</small><strong>${profile.supplyCapacity || 0}</strong></span>
              <span class="resource-pill"><small>Порт</small><strong>${profile.navalAccess ? "есть" : "нет"}</strong></span>
              <span class="resource-pill"><small>Аэродром</small><strong>${profile.airCapacity || 0}</strong></span>
              <span class="resource-pill"><small>Верфь</small><strong>${profile.navalCapacity || 0}</strong></span>
              ${Object.keys(RESOURCE_LABELS).map((resource) => `<span class="resource-pill"><small>${RESOURCE_LABELS[resource]}</small><strong>${profile.resources[resource]}</strong></span>`).join("")}
            </div>
          ` : "<p>Нет данных региона.</p>"}
          <button class="mini-button" type="button" data-action="recruit-selected" ${owner?.id !== player.id || !profile ? "disabled" : ""}>Сформировать армию здесь</button>
          <button class="mini-button" type="button" data-action="integrate" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Интегрировать оккупацию</button>
          <button class="mini-button" type="button" data-action="release-occupation" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Деоккупировать</button>
          <button class="mini-button" type="button" data-action="create-region-country" data-id="${id}" ${occupiedByPlayer ? "" : "disabled"}>Создать страну</button>
        </article>
        ${occupiedByPlayer ? `
          <article class="strategy-card accent-card">
            <header><strong>Оккупация и сопротивление</strong><small>${Math.round(occupationPolicyState.resistance || 0)}%</small></header>
            <div class="resource-grid">
              <span class="resource-pill"><small>Политика</small><strong>${occupationPolicyState.mode}</strong></span>
              <span class="resource-pill"><small>Гарнизон</small><strong>${occupationPolicyState.garrison}</strong></span>
              <span class="resource-pill"><small>Сопротивление</small><strong>${Math.round(occupationPolicyState.resistance || 0)}%</strong></span>
            </div>
            <select id="occupationPolicyMode" class="strategy-select">
              <option value="soft" ${occupationPolicyState.mode === "soft" ? "selected" : ""}>Мягкая администрация</option>
              <option value="balanced" ${occupationPolicyState.mode === "balanced" ? "selected" : ""}>Военная администрация</option>
              <option value="harsh" ${occupationPolicyState.mode === "harsh" ? "selected" : ""}>Жесткая эксплуатация</option>
            </select>
            <div class="inline-actions">
              <button class="mini-button" type="button" data-action="occupation-policy" data-id="${id}">Сменить политику</button>
              <button class="mini-button" type="button" data-action="occupation-garrison" data-id="${id}">Усилить гарнизон</button>
            </div>
            <small>Высокое сопротивление устраивает диверсии, снижает снабжение и может сорвать оккупацию.</small>
          </article>
        ` : ""}
        <article class="strategy-card accent-card">
          <header><strong>Администрация региона</strong><small>${profile?.governor?.source || "игровое назначение"}</small></header>
          <p>Выберите профиль образования администрации: он определяет эффект развития региона.</p>
          <select id="governorEducation" class="strategy-select" ${owner?.id !== player.id ? "disabled" : ""}>
            ${GOVERNOR_EDUCATIONS.map((education) => `<option value="${education.id}" ${profile?.governor?.education === education.id ? "selected" : ""}>${education.name}</option>`).join("")}
          </select>
          <select id="governorPolicy" class="strategy-select" ${owner?.id !== player.id ? "disabled" : ""}>
            ${REGION_MINISTERS.map((minister) => `<option value="${minister.id}" ${profile?.minister === minister.id ? "selected" : ""}>${minister.name}</option>`).join("")}
          </select>
          <button class="mini-button" type="button" data-action="appoint-governor" data-id="${id}" ${owner?.id !== player.id || !profile ? "disabled" : ""}>Назначить администрацию · 15 ПП</button>
          <small>Образование и курс администрации автоматически направляют часть государственного бюджета в регион.</small>
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
              <header><strong>${org.name}</strong><small>${org.global ? "мировая" : "союзная"} · влияние ${Math.round(organizationInfluence(org.id))}</small></header>
              <p>${members}${org.members.length > 12 ? "..." : ""}</p>
              <small>${org.global ? "Мировые организации не задают союзные отношения." : "Членство задает положительные отношения и стартовые союзы."}</small>
              ${isMember || org.global ? `
                <div class="inline-actions">
                  ${ORGANIZATION_ACTIONS.map((action) => `<button class="mini-button" type="button" data-action="org-action" data-org="${org.id}" data-id="${action.id}" ${currentPlayerState().politicalPower < action.cost ? "disabled" : ""}>${action.name}</button>`).join("")}
                </div>
                ${ORGANIZATION_ACTIONS.map((action) => `<small>${action.name}: ${action.text} · ${action.cost} ПП</small>`).join("")}
              ` : ""}
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function upcomingHistoricalEvents(limit = 12) {
    const today = strategyState?.date?.toISOString?.().slice(0, 10) || "";
    const completed = new Set((strategyState?.historicalEvents || []).map((event) => event.id));
    return (window.HISTORICAL_EVENT_TIMELINE || [])
      .filter((event) => event.date >= today && !completed.has(event.id))
      .slice()
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, limit);
  }

  function renderEventLog() {
    const log = (strategyState.log || []).map((entry, index) => typeof entry === "string"
      ? { id: `legacy-${index}`, text: entry, detail: "", action: "", severity: "info" }
      : entry);
    const selectedEvent = log.find((entry) => entry.id === selectedEventId) || log[0] || null;
    const runtime = currentPlayerState();
    const upcoming = upcomingHistoricalEvents();
    return `
      <section class="tab-section">
        <h3>События</h3>
        ${selectedEvent ? `
          <article class="strategy-card accent-card event-detail ${selectedEvent.severity || "info"}">
            <header><strong>${selectedEvent.text}</strong><small>${selectedEvent.date || "событие"}</small></header>
            <p>${selectedEvent.detail || "Подробностей для этого события нет."}</p>
            ${selectedEvent.action === "fix-logistics" ? `
              <button class="mini-button" type="button" data-action="fix-logistics" ${canFixLogistics(runtime) ? "" : "disabled"}>Наладить снабжение</button>
              <small>Цена: ${logisticsFixCostText(runtime)}</small>
            ` : ""}
          </article>
        ` : ""}
        ${(strategyState.crises || []).length ? `
          <article class="strategy-card accent-card">
            <header><strong>Последние кризисы</strong><small>${strategyState.crises.length}</small></header>
            ${strategyState.crises.slice(0, 4).map((crisis) => {
              const country = countryById(crisis.countryId);
              return `<small>${crisis.date}: ${country?.name || crisis.countryId} · ${crisis.type}</small>`;
            }).join("")}
          </article>
        ` : ""}
        ${upcoming.length ? `
          <article class="strategy-card">
            <header><strong>Исторический календарь</strong><small>ближайшие ${upcoming.length}</small></header>
            <p>Событие сработает в указанную дату, только если его исторические условия не изменены игроком.</p>
            ${upcoming.map((event) => `<small><strong>${gameDateLabel(new Date(`${event.date}T00:00:00`))}</strong> · ${event.title}</small>`).join("")}
          </article>
        ` : ""}
        <div class="event-log">
          ${log.map((entry) => `<button class="event-log-item ${entry.id === selectedEvent?.id ? "active" : ""} ${entry.severity || "info"}" type="button" data-event-id="${entry.id}">${entry.text}</button>`).join("")}
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
    updateNextTurnControl();
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
      turnStatus.textContent = `${gameDateLabel(strategyState.date, { short: true })} · пошаговый режим · панель скрыта`;
      return;
    }
    const activeFocusCount = getActiveFocuses(runtime).length;
    turnStatus.textContent = `${gameDateLabel(strategyState.date, { short: true })} · пошаговый режим · ${activeFocusCount ? `фокусы: ${activeFocusCount}/${maxActiveFocuses(runtime)}` : "фокус не выбран"}`;
    if (!refreshContent) return;
    if (activeTab === "focuses") renderFocuses(player, runtime);
    if (activeTab === "internal") renderInternal(runtime);
    if (activeTab === "production") renderProduction(runtime);
    if (activeTab === "research") renderResearch(runtime);
    if (activeTab === "foreign") renderForeign();
    if (activeTab === "maps") renderMapsPanel();
    if (activeTab === "trade") renderTrade();
    if (activeTab === "wars") renderWars();
    if (activeTab === "army") renderArmy(runtime);
    if (activeTab === "regions") renderRegions();
    if (activeTab === "administration") renderAdministrationEditor();
    if (activeTab === "orgs") renderOrganizations();
    strategyContent.insertAdjacentHTML("beforeend", renderEventLog());
  }

  function compatibleScenarios() {
    if (!selectedMap) return [];
    return scenarios.filter((scenario) =>
      Number(scenario.year) >= MIN_SCENARIO_YEAR &&
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
      const nextScenarios = rawScenarios.filter((scenario) => Number(scenario.year) >= MIN_SCENARIO_YEAR);
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
        image.src = resolveFlagUrl(country.flag);
        image.alt = "";
        image.addEventListener("error", () => {
          image.remove();
          flag.textContent = country.name.slice(0, 2).toUpperCase();
        }, { once: true });
        flag.append(image);
      } else {
        flag.textContent = country.name.slice(0, 2).toUpperCase();
      }

      const copy = document.createElement("span");
      copy.className = "card-copy";
      const name = document.createElement("strong");
      name.textContent = country.name;
      const details = document.createElement("small");
      details.textContent = `${country.regionIds?.length || 0} регионов`;
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

  function isCyclicMap(map) {
    if (!map) return false;
    if (map.cyclic === true) return true;
    if (map.cyclic === false) return false;
    if (selectedMap?.cyclic === true) return true;
    if (selectedMap?.cyclic === false) return false;
    const name = String(map.name || "").trim().toLowerCase();
    const file = String(map.file || selectedMap?.file || "").trim().toLowerCase();
    return name === "мир" || name === "world" || file === "мир.json" || file === "world.json";
  }

  function resolveFlagUrl(value) {
    const source = String(value || "");
    if (source.startsWith("data:")) return source;
    const normalized = source
      .replace(/^\.\.\//, "")
      .replace(/^flags\/pixel\//, "flags/");
    return normalized ? `${normalized}${normalized.includes("?") ? "&" : "?"}v=${CACHE_VERSION}` : normalized;
  }

  function gameWaterRgb(x, y, width, height, cyclic = false) {
    const yDepth = y / Math.max(1, height - 1);
    const edgeFade = cyclic
      ? 1
      : Math.min(1, Math.min(x, width - 1 - x) / Math.max(1, width * 0.08));
    const depth = 0.55 + 0.45 * yDepth;
    const wave = Math.sin(x * 0.018 + y * 0.011) * 5 + Math.sin(x * 0.006 - y * 0.02) * 3;
    const shade = 0.82 + edgeFade * 0.18;
    return [
      Math.round((18 + wave * 0.25) * shade),
      Math.round((55 + depth * 32 + wave * 0.45) * shade),
      Math.round((95 + depth * 58 + wave * 0.65) * shade),
    ];
  }

  function blendRgb(left, right, amount = 0.5) {
    return [
      Math.round(left[0] * (1 - amount) + right[0] * amount),
      Math.round(left[1] * (1 - amount) + right[1] * amount),
      Math.round(left[2] * (1 - amount) + right[2] * amount),
    ];
  }

  function packRgba(red, green, blue, alpha = 255) {
    return ((alpha << 24) | (blue << 16) | (green << 8) | red) >>> 0;
  }

  function relationMapColor(countryId, baseColor) {
    if ((!relationMapMode && mapMode !== "relations") || !strategyState) return baseColor;
    const sourceId = Number(relationMapCountryId || strategyState.playerCountryId);
    const targetId = Number(countryId);
    if (sourceId === targetId) return blendRgb(baseColor, [245, 220, 92], 0.5);
    const relation = getRelation(sourceId, targetId);
    const strength = Math.min(1, Math.abs(relation) / 100);
    const neutral = [118, 118, 118];
    const target = relation < 0 ? [255, 0, 0] : relation > 0 ? [0, 255, 0] : neutral;
    return blendRgb(neutral, target, strength);
  }

  function heatColor(value, low, mid, high) {
    const amount = clamp(Number(value || 0), 0, 100) / 100;
    return amount < 0.5
      ? blendRgb(low, mid, amount * 2)
      : blendRgb(mid, high, (amount - 0.5) * 2);
  }

  function regionName(regionId) {
    return String(gameData?.regionById?.get(Number(regionId))?.name || "");
  }

  function geoProfile(regionId) {
    return gameData?.regionGeoProfiles?.get(Number(regionId)) || null;
  }

  function terrainRgb(profile, baseColor) {
    if (!profile) return baseColor;
    if (profile.type === "sea") return [28, 89, 132];
    if (profile.tags.includes("mountain")) return [112, 103, 90];
    if (profile.tags.includes("island")) return [82, 126, 89];
    if (profile.tags.includes("peninsula")) return [122, 139, 93];
    if (profile.tags.includes("coast")) return [150, 142, 96];
    if (profile.roughness >= 65) return [126, 118, 84];
    return [72, 112, 74];
  }

  function waterRgbForMode(profile, baseColor) {
    if (!profile) return baseColor;
    if (profile.type === "sea") {
      if (profile.tags.includes("strait")) return [42, 135, 169];
      if (profile.tags.includes("naval_chokepoint")) return [31, 111, 153];
      return [20, 72, 116];
    }
    if (profile.tags.includes("archipelago")) return [77, 147, 132];
    if (profile.tags.includes("island")) return [87, 161, 113];
    if (profile.tags.includes("peninsula")) return [144, 152, 94];
    if (profile.tags.includes("coast")) return [160, 149, 91];
    return blendRgb(baseColor, [55, 76, 80], 0.5);
  }

  function strategicGeoRgb(profile, country, baseColor) {
    if (!profile) return baseColor;
    if (profile.type === "sea") {
      if (profile.tags.includes("strait") || profile.tags.includes("naval_chokepoint")) return [45, 142, 182];
      return [24, 74, 116];
    }
    if (profile.tags.includes("mountain")) return [138, 86, 74];
    if (profile.tags.includes("island") || profile.tags.includes("archipelago")) return [83, 157, 118];
    if (profile.tags.includes("peninsula")) return [162, 142, 76];
    if (profile.tags.includes("coast")) return [116, 137, 100];
    if (country && Number(country.capitalRegionId) === Number(profile.regionId)) return [207, 183, 90];
    return blendRgb(baseColor, [70, 80, 74], 0.55);
  }

  function logisticsGeoRgb(profile, country, baseColor) {
    if (!profile) return baseColor;
    if (profile.type === "sea") return profile.tags.includes("naval_chokepoint") ? [38, 121, 156] : [19, 65, 104];
    const runtime = country ? strategyState?.countryStates?.[String(country.id)] : null;
    const regionProfile = runtime?.regionProfiles?.[String(profile.regionId)];
    const hasBase = runtime?.bases?.some((base) => Number(base.regionId) === Number(profile.regionId));
    if (hasBase) return [204, 185, 95];
    if (regionProfile?.navalAccess) return [68, 144, 170];
    if (regionProfile?.airCapacity) return [115, 145, 196];
    if (regionProfile?.supplyCapacity) return [103, 164, 95];
    if (country && Number(country.capitalRegionId) === Number(profile.regionId)) return [214, 160, 74];
    if (profile.tags.includes("mountain")) return [124, 79, 71];
    if (profile.tags.includes("coast")) return [91, 137, 112];
    return blendRgb(baseColor, [72, 91, 73], 0.62);
  }

  function strategicMapColor(country, regionId, baseColor) {
    const profile = geoProfile(regionId);
    if (mapMode === "terrain") return terrainRgb(profile, baseColor);
    if (mapMode === "water") return waterRgbForMode(profile, baseColor);
    if (mapMode === "strategic") return strategicGeoRgb(profile, country, baseColor);
    if (mapMode === "logistics") return logisticsGeoRgb(profile, country, baseColor);
    if (!country || mapMode === "political" || relationMapMode) return baseColor;
    const runtime = strategyState?.countryStates?.[String(country.id)];
    if (!runtime) return baseColor;
    if (mapMode === "stability") return heatColor(runtime.stability, [116, 38, 36], [179, 148, 65], [75, 143, 92]);
    if (mapMode === "economy") {
      const maxGdp = gameData?.maxRuntimeGdp || Math.max(runtime.gdp || 1, 1);
      return heatColor(Math.sqrt((runtime.gdp || 1) / maxGdp) * 100, [45, 60, 74], [126, 126, 76], [205, 184, 104]);
    }
    if (mapMode === "supply") return heatColor(runtime.supply?.level || 100, [124, 45, 42], [188, 143, 64], [80, 151, 102]);
    if (mapMode === "war") {
      const playerId = Number(strategyState.playerCountryId);
      if (Number(country.id) === playerId) return blendRgb(baseColor, [245, 221, 111], 0.45);
      if (isAtWar(playerId, country.id)) return blendRgb(baseColor, [226, 52, 43], 0.62);
      if (hasMilitaryAccess(playerId, country.id)) return blendRgb(baseColor, [91, 166, 105], 0.42);
      return blendRgb(baseColor, [55, 61, 66], 0.45);
    }
    return baseColor;
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

  function buildRegionGeoProfiles(map, regionAtPixel, regionAdjacency, regionById, regionTypeById, centers) {
    const pixelCounts = new Map();
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      const regionId = regionAtPixel[index];
      if (!regionId) continue;
      pixelCounts.set(regionId, (pixelCounts.get(regionId) || 0) + 1);
    }
    const landSizes = [...pixelCounts.entries()]
      .filter(([id]) => regionTypeById.get(id) !== "sea")
      .map(([, count]) => count)
      .sort((a, b) => a - b);
    const smallLand = landSizes[Math.max(0, Math.floor(landSizes.length * 0.28))] || 40;
    const profiles = new Map();
    pixelCounts.forEach((area, regionId) => {
      const region = regionById.get(Number(regionId));
      const name = String(region?.name || "");
      const type = regionTypeById.get(Number(regionId)) || "";
      const neighbors = [...(regionAdjacency.get(Number(regionId)) || [])];
      const seaNeighbors = neighbors.filter((id) => regionTypeById.get(Number(id)) === "sea").length;
      const landNeighbors = neighbors.filter((id) => regionTypeById.get(Number(id)) !== "sea").length;
      const tags = [];
      const isSea = type === "sea";
      const mountainName = /гор|хреб|альп|кавказ|урал|карпат|памир|тибет|гимала|анд|апеннин|пирен|atlas|alp|caucasus|ural|andes|himal|tibet|mount/i.test(name);
      const islandName = /остров|island|sardinia|sicily|corsica|crete|кипр|крит|сахалин|тайван|japan|iceland|greenland/i.test(name);
      const peninsulaName = /полуостров|peninsula|крым|crimea|корея|korea|скандинав|scandin|арав|arab|балкан|balkan|апеннин|iberia|ибер/i.test(name);
      const roughness = Math.round((hashNumber(`${regionId}:${name}:rough`) % 100) * 0.55 + Math.min(45, landNeighbors * 5));
      if (isSea) {
        if (landNeighbors >= 3) tags.push("strait");
        if (landNeighbors >= 4 || /пролив|strait|channel|канал|босфор|дарданелл|suez|panama/i.test(name)) tags.push("naval_chokepoint");
      } else {
        if (seaNeighbors > 0) tags.push("coast");
        if ((seaNeighbors >= 2 && landNeighbors <= 1) || islandName) tags.push("island");
        if ((seaNeighbors >= 2 && landNeighbors >= 2) || peninsulaName) tags.push("peninsula");
        if ((area <= smallLand && seaNeighbors > 0) || islandName) tags.push("archipelago");
        if (mountainName || (roughness >= 78 && seaNeighbors === 0)) tags.push("mountain");
        if (landNeighbors <= 2 && seaNeighbors === 0) tags.push("land_chokepoint");
      }
      const help = [];
      const problem = [];
      if (tags.includes("mountain")) {
        help.push("сильная оборона");
        problem.push("медленное наступление и снабжение");
      }
      if (tags.includes("island") || tags.includes("archipelago")) {
        help.push("морская оборона");
        problem.push("зависимость от флота и портов");
      }
      if (tags.includes("peninsula")) {
        help.push("удобная линия обороны");
        problem.push("риск блокады узкого выхода");
      }
      if (tags.includes("coast")) help.push("портовые маршруты и морская торговля");
      if (tags.includes("strait") || tags.includes("naval_chokepoint")) {
        help.push("контроль морского прохода");
        problem.push("узкое место для флота и снабжения");
      }
      profiles.set(Number(regionId), {
        regionId: Number(regionId),
        name,
        type,
        area,
        roughness,
        seaNeighbors,
        landNeighbors,
        tags,
        help,
        problem,
        center: centers.get(Number(regionId)) || null,
      });
    });
    return profiles;
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
    const px = Math.round(x);
    const py = Math.round(y);
    gameOverlayCtx.fillStyle = "#101210";
    gameOverlayCtx.fillRect(px - 4, py - 6, 8, 11);
    gameOverlayCtx.fillStyle = "#d6c7a5";
    gameOverlayCtx.fillRect(px - 2, py - 5, 4, 3);
    gameOverlayCtx.fillStyle = "#52663d";
    gameOverlayCtx.fillRect(px - 3, py - 2, 6, 6);
    gameOverlayCtx.fillStyle = "#8c6a38";
    gameOverlayCtx.fillRect(px + 3, py - 2, 1, 7);
  }

  function capitalMarkerPosition(country, map, fallbackCenter) {
    const position = CAPITAL_COORDINATES[country?.name];
    const bounds = map?.geographicBounds;
    if (!position || !bounds?.sourceWindow || !bounds?.sourceDimensions) return fallbackCenter;
    const [latitude, longitude] = position;
    const sourceX = (longitude + 180) / 360 * Number(bounds.sourceDimensions.width);
    const sourceY = (90 - latitude) / 180 * Number(bounds.sourceDimensions.height);
    const scale = Number(bounds.scale) || 1;
    const x = (sourceX - Number(bounds.sourceWindow.left)) * scale + Number(bounds.offset?.x || 0);
    const y = (sourceY - Number(bounds.sourceWindow.top)) * scale + Number(bounds.offset?.y || 0);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return fallbackCenter;
    return { x, y };
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawArmyMarker(army, x, y) {
    const px = Math.round(x);
    const py = Math.round(y);
    const label = String(Math.max(1, Math.round((army.soldiers || army.strength || 1) / 1000)));
    gameOverlayCtx.save();
    gameOverlayCtx.shadowColor = "rgba(0, 0, 0, .72)";
    gameOverlayCtx.shadowBlur = 4;
    gameOverlayCtx.shadowOffsetY = 2;
    gameOverlayCtx.fillStyle = "rgba(16, 20, 18, .9)";
    gameOverlayCtx.strokeStyle = "rgba(255, 220, 128, .88)";
    gameOverlayCtx.lineWidth = 1.25;
    gameOverlayCtx.beginPath();
    drawRoundedRect(gameOverlayCtx, px - 10, py - 14, 20, 24, 4);
    gameOverlayCtx.fill();
    gameOverlayCtx.stroke();
    gameOverlayCtx.shadowBlur = 0;

    gameOverlayCtx.fillStyle = "rgba(58, 72, 46, .95)";
    gameOverlayCtx.strokeStyle = "rgba(12, 14, 12, .85)";
    gameOverlayCtx.lineWidth = 1;
    gameOverlayCtx.beginPath();
    gameOverlayCtx.moveTo(px, py - 11);
    gameOverlayCtx.lineTo(px + 7, py - 7);
    gameOverlayCtx.lineTo(px + 5, py + 1);
    gameOverlayCtx.quadraticCurveTo(px, py + 5, px - 5, py + 1);
    gameOverlayCtx.lineTo(px - 7, py - 7);
    gameOverlayCtx.closePath();
    gameOverlayCtx.fill();
    gameOverlayCtx.stroke();

    if (soldierImage?.complete && soldierImage.naturalWidth) {
      gameOverlayCtx.imageSmoothingEnabled = userSettings.smoothing !== "off";
      gameOverlayCtx.drawImage(soldierImage, px - 6, py - 10, 12, 12);
    } else {
      drawFallbackSoldier(px, py - 2);
    }

    gameOverlayCtx.fillStyle = "rgba(0, 0, 0, .45)";
    gameOverlayCtx.fillRect(px - 8, py + 5, 16, 6);
    gameOverlayCtx.fillStyle = "#fff7d6";
    gameOverlayCtx.font = "bold 7px Georgia, \"Times New Roman\", serif";
    gameOverlayCtx.textAlign = "center";
    gameOverlayCtx.textBaseline = "middle";
    gameOverlayCtx.fillText(label, px, py + 8);
    gameOverlayCtx.restore();
  }

  function addCountryLabelAggregate(stats, country, sample) {
    if (!country || !sample?.count) return;
    const id = Number(country.id);
    if (!stats.has(id)) {
      stats.set(id, {
        country,
        x: 0,
        y: 0,
        count: 0,
        minX: sample.minX,
        maxX: sample.maxX,
        minY: sample.minY,
        maxY: sample.maxY,
      });
    }
    const item = stats.get(id);
    item.x += sample.x;
    item.y += sample.y;
    item.count += sample.count;
    item.minX = Math.min(item.minX, sample.minX);
    item.maxX = Math.max(item.maxX, sample.maxX);
    item.minY = Math.min(item.minY, sample.minY);
    item.maxY = Math.max(item.maxY, sample.maxY);
  }

  function buildRegionLabelSamples(regionAtPixel, width, height, regionIds) {
    const samples = new Map([...regionIds].map((id) => [id, {
      x: 0,
      y: 0,
      count: 0,
      minX: width,
      maxX: 0,
      minY: height,
      maxY: 0,
    }]));
    for (let index = 0; index < regionAtPixel.length; index += 6) {
      const regionId = regionAtPixel[index];
      const sample = samples.get(regionId);
      if (!sample) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      sample.x += x;
      sample.y += y;
      sample.count += 1;
      sample.minX = Math.min(sample.minX, x);
      sample.maxX = Math.max(sample.maxX, x);
      sample.minY = Math.min(sample.minY, y);
      sample.maxY = Math.max(sample.maxY, y);
    }
    samples.forEach((sample, id) => {
      if (!sample.count) samples.delete(id);
    });
    return samples;
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

  function flagImage(path) {
    if (!path) return null;
    if (!flagImageCache.has(path)) {
      const image = new Image();
      image.src = resolveFlagUrl(path);
      image.addEventListener("load", renderGameMap, { once: true });
      flagImageCache.set(path, image);
    }
    const image = flagImageCache.get(path);
    return image?.complete && image.naturalWidth ? image : null;
  }

  function flagTexture(path) {
    const image = flagImage(path);
    if (!image) return null;
    if (!flagTextureCache.has(path)) {
      const canvas = document.createElement("canvas");
      canvas.width = 192;
      canvas.height = 128;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      flagTextureCache.set(path, context.getImageData(0, 0, canvas.width, canvas.height));
    }
    return flagTextureCache.get(path);
  }

  function drawCountryFlags(countryStats) {
    gameOverlayCtx.save();
    [...countryStats.values()].filter((item) => item.count >= 1600).forEach((item) => {
      const image = flagImage(item.country.flag);
      if (!image) return;
      const width = Math.max(24, Math.min(96, Math.sqrt(item.count) * 2.7));
      const height = Math.round(width * 0.62);
      const x = item.x / item.count - width / 2;
      const y = item.y / item.count - height / 2;
      gameOverlayCtx.fillStyle = "rgba(10, 12, 12, .7)";
      gameOverlayCtx.fillRect(x - 2, y - 2, width + 4, height + 4);
      gameOverlayCtx.drawImage(image, x, y, width, height);
    });
    gameOverlayCtx.restore();
  }

  function buildMapBorderSegments(map, regionAtPixel, regionTypeById) {
    const segments = [];
    const addSegment = (regionA, regionB, x1, y1, x2, y2) => {
      if (!regionA || !regionB || regionA === regionB) return;
      const isSeaPair = regionTypeById.get(regionA) === "sea" && regionTypeById.get(regionB) === "sea";
      if (!isSeaPair) segments.push(regionA, regionB, x1, y1, x2, y2);
    };
    for (let y = 0; y < map.height; y += 1) {
      const row = y * map.width;
      for (let x = 0; x < map.width; x += 1) {
        const index = row + x;
        const regionA = regionAtPixel[index];
        if (x < map.width - 1) addSegment(regionA, regionAtPixel[index + 1], x + 1, y, x + 1, y + 1);
        if (y < map.height - 1) addSegment(regionA, regionAtPixel[index + map.width], x, y + 1, x + 1, y + 1);
      }
    }
    return segments;
  }

  function drawFrontLines(controllerByRegion) {
    if (!gameData || !strategyState) return;
    gameOverlayCtx.save();
    gameOverlayCtx.beginPath();
    for (let index = 0; index < gameData.borderSegments.length; index += 6) {
      const countryA = controllerByRegion.get(gameData.borderSegments[index]);
      const countryB = controllerByRegion.get(gameData.borderSegments[index + 1]);
      if (!countryA || !countryB || Number(countryA.id) === Number(countryB.id)) continue;
      if (!isAtWar(countryA.id, countryB.id)) continue;
      gameOverlayCtx.moveTo(gameData.borderSegments[index + 2], gameData.borderSegments[index + 3]);
      gameOverlayCtx.lineTo(gameData.borderSegments[index + 4], gameData.borderSegments[index + 5]);
    }
    gameOverlayCtx.strokeStyle = "rgba(228, 58, 44, .82)";
    gameOverlayCtx.lineWidth = 2.8;
    gameOverlayCtx.shadowColor = "rgba(255, 210, 96, .42)";
    gameOverlayCtx.shadowBlur = 4;
    gameOverlayCtx.stroke();
    gameOverlayCtx.restore();
  }

  function drawArmyOrderLine(army, x, y, routeOverride = null) {
    const route = Array.isArray(routeOverride) ? routeOverride : (Array.isArray(army?.route) ? army.route : []);
    if (!army || !gameData?.centers || !route.length) return;
    const points = route.map((regionId) => gameData.centers.get(Number(regionId))).filter(Boolean);
    if (!points.length) return;
    gameOverlayCtx.save();
    gameOverlayCtx.strokeStyle = "rgba(255, 227, 137, .74)";
    gameOverlayCtx.lineWidth = 1.4;
    gameOverlayCtx.setLineDash([5, 4]);
    gameOverlayCtx.beginPath();
    gameOverlayCtx.moveTo(x, y);
    points.forEach((point) => gameOverlayCtx.lineTo(point.x, point.y));
    gameOverlayCtx.stroke();
    gameOverlayCtx.setLineDash([]);
    gameOverlayCtx.fillStyle = "rgba(255, 227, 137, .9)";
    points.forEach((point, index) => {
      gameOverlayCtx.beginPath();
      gameOverlayCtx.arc(point.x, point.y, index === points.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
      gameOverlayCtx.fill();
      if (index === 0) return;
      const previous = index === 1 ? { x, y } : points[index - 2];
      const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
      const size = 5;
      gameOverlayCtx.beginPath();
      gameOverlayCtx.moveTo(point.x, point.y);
      gameOverlayCtx.lineTo(point.x - Math.cos(angle - Math.PI / 6) * size, point.y - Math.sin(angle - Math.PI / 6) * size);
      gameOverlayCtx.lineTo(point.x - Math.cos(angle + Math.PI / 6) * size, point.y - Math.sin(angle + Math.PI / 6) * size);
      gameOverlayCtx.closePath();
      gameOverlayCtx.fill();
    });
    gameOverlayCtx.restore();
  }

  function drawGeoMarker(profile) {
    if (!profile?.center || profile.type === "sea" && !profile.tags.includes("strait") && !profile.tags.includes("naval_chokepoint")) return;
    const x = profile.center.x;
    const y = profile.center.y;
    gameOverlayCtx.save();
    gameOverlayCtx.shadowColor = "rgba(0,0,0,.72)";
    gameOverlayCtx.shadowBlur = 3;
    gameOverlayCtx.lineWidth = 1;
    if (profile.tags.includes("mountain")) {
      gameOverlayCtx.fillStyle = "rgba(230, 218, 184, .9)";
      gameOverlayCtx.strokeStyle = "rgba(55, 47, 40, .9)";
      gameOverlayCtx.beginPath();
      gameOverlayCtx.moveTo(x, y - 7);
      gameOverlayCtx.lineTo(x + 7, y + 6);
      gameOverlayCtx.lineTo(x - 7, y + 6);
      gameOverlayCtx.closePath();
      gameOverlayCtx.fill();
      gameOverlayCtx.stroke();
    } else if (profile.tags.includes("naval_chokepoint") || profile.tags.includes("strait")) {
      gameOverlayCtx.strokeStyle = "rgba(135, 226, 255, .92)";
      gameOverlayCtx.beginPath();
      gameOverlayCtx.arc(x, y, 6, 0, Math.PI * 2);
      gameOverlayCtx.stroke();
      gameOverlayCtx.beginPath();
      gameOverlayCtx.moveTo(x - 5, y);
      gameOverlayCtx.lineTo(x + 5, y);
      gameOverlayCtx.stroke();
    } else if (profile.tags.includes("island") || profile.tags.includes("archipelago")) {
      gameOverlayCtx.fillStyle = "rgba(111, 201, 132, .88)";
      gameOverlayCtx.beginPath();
      gameOverlayCtx.arc(x, y, profile.tags.includes("archipelago") ? 4 : 5, 0, Math.PI * 2);
      gameOverlayCtx.fill();
      if (profile.tags.includes("archipelago")) {
        gameOverlayCtx.beginPath();
        gameOverlayCtx.arc(x + 6, y - 3, 2, 0, Math.PI * 2);
        gameOverlayCtx.arc(x - 5, y + 4, 2, 0, Math.PI * 2);
        gameOverlayCtx.fill();
      }
    } else if (profile.tags.includes("peninsula") || profile.tags.includes("land_chokepoint")) {
      gameOverlayCtx.fillStyle = "rgba(224, 190, 100, .9)";
      gameOverlayCtx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
    }
    gameOverlayCtx.restore();
  }

  function drawGeographicMarkers() {
    if (!["terrain", "water", "strategic", "logistics"].includes(mapMode)) return;
    const profiles = importantGeoProfiles(mapMode === "strategic" ? 48 : 34);
    profiles.forEach(drawGeoMarker);
  }

  function createCanvasCloneStack(className) {
    const stack = document.createElement("div");
    stack.className = `game-canvas-stack game-canvas-clone ${className}`;
    const mapCanvas = document.createElement("canvas");
    const overlayCanvas = document.createElement("canvas");
    stack.append(mapCanvas, overlayCanvas);
    return stack;
  }

  function ensureWorldWrap() {
    if (gameWorldStrip) return;
    gameWorldStrip = document.createElement("div");
    gameWorldStrip.id = "gameWorldStrip";
    gameWorldStrip.className = "game-world-strip";
    gameWorldBefore = createCanvasCloneStack("before");
    gameWorldAfter = createCanvasCloneStack("after");
    gameMapViewport.insertBefore(gameWorldStrip, gameCanvasStack);
    gameWorldStrip.append(gameWorldBefore, gameCanvasStack, gameWorldAfter);
  }

  function disableWorldWrap() {
    if (!gameWorldStrip) return;
    if (gameCanvasStack.parentElement === gameWorldStrip) {
      gameMapViewport.insertBefore(gameCanvasStack, gameWorldStrip);
    }
    gameWorldStrip.hidden = true;
  }

  function allCanvasStacks() {
    return [gameWorldBefore, gameCanvasStack, gameWorldAfter].filter(Boolean);
  }

  function syncWorldClone(sourceCanvas, targetCanvas) {
    if (!sourceCanvas || !targetCanvas) return;
    targetCanvas.width = sourceCanvas.width;
    targetCanvas.height = sourceCanvas.height;
    const ctx = targetCanvas.getContext("2d");
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);
  }

  function syncWorldClones() {
    if (!isCyclicMap(gameData?.map)) return;
    if (!gameWorldBefore || !gameWorldAfter) return;
    [gameWorldBefore, gameWorldAfter].forEach((stack) => {
      const [mapClone, overlayClone] = stack.querySelectorAll("canvas");
      syncWorldClone(gameMapCanvas, mapClone);
      syncWorldClone(gameOverlayCanvas, overlayClone);
    });
  }

  function setWorldHidden(hidden) {
    const cyclic = isCyclicMap(gameData?.map);
    if (cyclic) ensureWorldWrap();
    else disableWorldWrap();
    if (gameWorldStrip) gameWorldStrip.hidden = hidden || !cyclic;
    gameCanvasStack.hidden = hidden;
  }

  function centerWrappedMap() {
    if (!gameData || !isCyclicMap(gameData.map) || !gameWorldStrip) return;
    const width = Math.round(gameData.map.width * gameZoom);
    gameMapViewport.scrollLeft = width;
  }

  function wrapMapScroll() {
    if (!gameData || !isCyclicMap(gameData.map) || !gameWorldStrip) return;
    const width = Math.round(gameData.map.width * gameZoom);
    if (width <= 0) return;
    if (gameMapViewport.scrollLeft < width * 0.35) gameMapViewport.scrollLeft += width;
    if (gameMapViewport.scrollLeft > width * 1.65) gameMapViewport.scrollLeft -= width;
  }

  function renderGameMap() {
    if (!gameData) return;
    const { map, scenario, regionAtPixel, centers, waterPacked } = gameData;
    sanitizeRussianTerritory(scenario);
    const ownerByRegion = new Map();
    const countryById = new Map(scenario.countries.map((country) => [Number(country.id), country]));
    const countryRgbById = new Map(scenario.countries.map((country) => [Number(country.id), gameHexToRgb(country.color)]));
    const regionTypeById = gameData.regionTypeById;
    const regionRgbById = gameData.regionRgbById;
    const antarcticRgb = gameHexToRgb("#d7e6ee");
    const fallbackRgb = gameHexToRgb("#263238");
    const regionRenderPacked = new Uint32Array(gameData.maxRegionId + 1);
    const dynamicWaterByRegion = new Uint8Array(gameData.maxRegionId + 1);
    const occupiedPatternByRegion = new Uint8Array(gameData.maxRegionId + 1);
    const usesGeoWaterColor = ["terrain", "water", "strategic", "logistics"].includes(mapMode);
    const countryStats = new Map();
    const flagTerritoryMode = mapMode === "political" && userSettings.politicalMap === "flags";
    const flagBounds = new Map();
    if (flagTerritoryMode) {
      scenario.countries.forEach((country) => {
        const bounds = { minX: map.width, maxX: 0, minY: map.height, maxY: 0 };
        (country.regionIds || []).forEach((regionId) => {
          const sample = gameData.regionLabelSamples.get(Number(regionId));
          if (!sample?.count) return;
          bounds.minX = Math.min(bounds.minX, sample.minX);
          bounds.maxX = Math.max(bounds.maxX, sample.maxX);
          bounds.minY = Math.min(bounds.minY, sample.minY);
          bounds.maxY = Math.max(bounds.maxY, sample.maxY);
        });
        if (bounds.maxX > bounds.minX && bounds.maxY > bounds.minY) flagBounds.set(Number(country.id), bounds);
      });
    }
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
    gameData.controllerByRegion = controllerByRegion;
    gameData.maxRuntimeGdp = Math.max(...allCountryStates().map((runtime) => runtime.gdp || 1), 1);
    gameData.regionById.forEach((region, regionId) => {
      const country = controllerByRegion.get(regionId);
      let color = country
        ? countryRgbById.get(Number(country.id))
        : isAntarcticRegion(regionId)
          ? antarcticRgb
        : regionTypeById.get(regionId) === "sea"
          ? null
          : regionRgbById.get(regionId) || fallbackRgb;
      const occupation = occupationByRegion.get(regionId);
      const ownerColor = occupation?.owner ? countryRgbById.get(Number(occupation.owner.id)) : null;
      const controllerColor = occupation?.controller ? countryRgbById.get(Number(occupation.controller.id)) : null;
      if (occupation && ownerColor && controllerColor && Number(occupation.owner?.id) !== Number(occupation.controller?.id)) {
        color = blendRgb(ownerColor, controllerColor, 0.58);
        occupiedPatternByRegion[regionId] = 1;
      }
      if (!color && regionTypeById.get(regionId) === "sea") {
        dynamicWaterByRegion[regionId] = usesGeoWaterColor ? 0 : 1;
        color = fallbackRgb;
      }
      color = strategicMapColor(country, regionId, color);
      if (country && (relationMapMode || mapMode === "relations")) color = relationMapColor(country.id, color);
      regionRenderPacked[regionId] = packRgba(color[0], color[1], color[2]);
      if (country) {
        addCountryLabelAggregate(countryStats, country, gameData.regionLabelSamples.get(regionId));
      }
    });

    const image = gameData.mapImageData;
    const imagePixels = gameData.mapImagePixels;
    for (let y = 0; y < map.height; y += 1) {
      const row = y * map.width;
      for (let x = 0; x < map.width; x += 1) {
        const index = row + x;
        const regionId = regionAtPixel[index];
        let packed = regionRenderPacked[regionId];
        const flagCountry = flagTerritoryMode ? controllerByRegion.get(regionId) : null;
        const bounds = flagCountry ? flagBounds.get(Number(flagCountry.id)) : null;
        const texture = bounds ? flagTexture(flagCountry.flag) : null;
        if (texture) {
          const textureX = Math.max(0, Math.min(texture.width - 1, Math.floor((x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX) * texture.width)));
          const textureY = Math.max(0, Math.min(texture.height - 1, Math.floor((y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY) * texture.height)));
          const offset = (textureY * texture.width + textureX) * 4;
          if (texture.data[offset + 3] > 32) packed = packRgba(texture.data[offset], texture.data[offset + 1], texture.data[offset + 2]);
        }
        if (dynamicWaterByRegion[regionId]) {
          packed = waterPacked[index];
        } else if (occupiedPatternByRegion[regionId]) {
          let red = packed & 255;
          let green = (packed >>> 8) & 255;
          let blue = (packed >>> 16) & 255;
          if (((x + y) % 11) < 4) {
            red = Math.round(red * 0.72 + 28 * 0.28);
            green = Math.round(green * 0.72 + 24 * 0.28);
            blue = Math.round(blue * 0.72 + 20 * 0.28);
          }
          if (((x - y + 4000) % 17) < 2) {
            red = Math.round(red * 0.82 + 255 * 0.18);
            green = Math.round(green * 0.82 + 235 * 0.18);
            blue = Math.round(blue * 0.82 + 170 * 0.18);
          }
          packed = packRgba(red, green, blue);
        }
        imagePixels[index] = regionId ? packed : 0;
      }
    }
    gameMapCtx.putImageData(image, 0, 0);
    gameOverlayCtx.clearRect(0, 0, map.width, map.height);

    function strokeBorders(countryBorders) {
      gameOverlayCtx.beginPath();
      for (let index = 0; index < gameData.borderSegments.length; index += 6) {
        const countryA = controllerByRegion.get(gameData.borderSegments[index])?.id ?? null;
        const countryB = controllerByRegion.get(gameData.borderSegments[index + 1])?.id ?? null;
        const isCountry = countryA !== countryB && (countryA !== null || countryB !== null);
        if (isCountry !== countryBorders) continue;
        gameOverlayCtx.moveTo(gameData.borderSegments[index + 2], gameData.borderSegments[index + 3]);
        gameOverlayCtx.lineTo(gameData.borderSegments[index + 4], gameData.borderSegments[index + 5]);
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

    drawFrontLines(controllerByRegion);

    if (!flagTerritoryMode) drawCountryLabels(countryStats);
    drawGeographicMarkers();

    scenario.countries.forEach((country) => {
      const center = centers.get(Number(country.capitalRegionId));
      const marker = capitalMarkerPosition(country, map, center);
      if (!marker) return;
      drawGameCrown(marker.x, marker.y);
    });

    const runtimeArmies = strategyState ? allCountryStates().flatMap((runtime) => runtime.armies) : (scenario.armies || []);
    runtimeArmies.forEach((army) => {
      const drawRegionId = Number(army.regionId);
      const center = centers.get(drawRegionId);
      if (!center) return;
      const hasCapital = scenario.countries.some(
        (country) => Number(country.capitalRegionId) === drawRegionId
      );
      const markerX = center.x + (hasCapital ? 8 : 0);
      const markerY = center.y + (hasCapital ? 5 : 0);
      const dragPreview = armyDragState?.army === army && armyDragState.targetRegionId
        ? armyRoute(strategyState.countryStates[String(army.ownerCountryId)], army, armyDragState.targetRegionId)
        : null;
      drawArmyOrderLine(army, markerX, markerY, dragPreview);
      drawArmyMarker(army, markerX, markerY);
    });
    syncWorldClones();
    gameData.mapDirty = false;
  }

  function setGameZoom(value) {
    gameZoom = Math.max(0.5, Math.min(4, value));
    if (gameData) {
      const cyclic = isCyclicMap(gameData.map);
      if (cyclic) ensureWorldWrap();
      else disableWorldWrap();
      const width = Math.round(gameData.map.width * gameZoom);
      const height = Math.round(gameData.map.height * gameZoom);
      allCanvasStacks().forEach((stack) => {
        stack.style.width = `${width}px`;
        stack.style.height = `${height}px`;
        stack.querySelectorAll("canvas").forEach((canvas) => {
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        });
      });
      if (cyclic && gameWorldStrip) {
        gameWorldStrip.style.width = `${width * 3}px`;
        gameWorldStrip.style.height = `${height}px`;
      }
      syncWorldClones();
      if (cyclic) centerWrappedMap();
    }
    applySmoothing();
    gameZoomLabel.textContent = `${Math.round(gameZoom * 100)}%`;
  }

  function selectRegionFromMap(event) {
    if (!gameData || !strategyState) return;
    if (mapDragState?.moved) return;
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
    const cyclic = isCyclicMap(gameData.map);
    const stripRect = (cyclic ? gameWorldStrip : gameCanvasStack)?.getBoundingClientRect();
    if (!stripRect) return null;
    const scaledWidth = gameData.map.width * gameZoom;
    const scaledHeight = gameData.map.height * gameZoom;
    const rawX = event.clientX - stripRect.left;
    const rawY = event.clientY - stripRect.top;
    if (!cyclic && (rawX < 0 || rawX >= scaledWidth)) return null;
    const mapX = cyclic ? ((rawX % scaledWidth) + scaledWidth) % scaledWidth : rawX;
    const x = Math.floor(mapX / scaledWidth * gameData.map.width);
    const y = Math.floor(rawY / scaledHeight * gameData.map.height);
    if (y < 0 || y >= gameData.map.height) return null;
    const regionId = gameData.regionAtPixel[y * gameData.map.width + x];
    if (!regionId) return null;
    if (gameData.regionTypeById.get(Number(regionId)) === "sea") return null;
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

  function armyAtMapPoint(hit) {
    if (!hit || !strategyState || !gameData?.centers) return null;
    const runtime = currentPlayerState();
    if (!runtime) return null;
    const radius = Math.max(12, 22 / Math.max(0.75, gameZoom));
    return runtime.armies.find((army) => {
      const center = gameData.centers.get(Number(army.regionId));
      if (!center) return false;
      const dx = Number(hit.x) - Number(center.x);
      const dy = Number(hit.y) - Number(center.y);
      return dx * dx + dy * dy <= radius * radius;
    }) || null;
  }

  function beginMapDrag(event) {
    if (!gameData || event.button !== 0) return;
    const army = armyAtMapPoint(mapHitFromEvent(event));
    if (army) {
      armyDragState = { army, targetRegionId: null, moved: false };
      mapDragState = { moved: true };
      gameMapViewport.classList.add("dragging-map");
      event.preventDefault();
      return;
    }
    mapDragState = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: gameMapViewport.scrollLeft,
      scrollTop: gameMapViewport.scrollTop,
      moved: false,
    };
    gameMapViewport.classList.add("dragging-map");
  }

  function updateMapDrag(event) {
    if (armyDragState) {
      const hit = mapHitFromEvent(event);
      const targetRegionId = hit?.regionId ? Number(hit.regionId) : null;
      if (targetRegionId && targetRegionId !== Number(armyDragState.army.regionId)) armyDragState.moved = true;
      if (targetRegionId !== armyDragState.targetRegionId) {
        armyDragState.targetRegionId = targetRegionId;
        renderGameMap();
      }
      return;
    }
    if (!mapDragState) return;
    const dx = event.clientX - mapDragState.startX;
    const dy = event.clientY - mapDragState.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mapDragState.moved = true;
    gameMapViewport.scrollLeft = mapDragState.scrollLeft - dx;
    gameMapViewport.scrollTop = mapDragState.scrollTop - dy;
    wrapMapScroll();
  }

  function endMapDrag(event) {
    if (armyDragState) {
      const drag = armyDragState;
      const hit = mapHitFromEvent(event);
      const targetRegionId = hit?.regionId ? Number(hit.regionId) : Number(drag.targetRegionId || 0);
      const runtime = currentPlayerState();
      const target = targetRegionId && runtime ? armyRoute(runtime, drag.army, targetRegionId) : null;
      if (target?.length) {
        drag.army.route = target;
        drag.army.movingTo = Number(target[0]);
        drag.army.eta = 1;
        drag.army.order = `Маршрут: ${target.map((id) => gameData.regionById.get(Number(id))?.name || id).join(" → ")}`;
        addLog(`${drag.army.name} получила маршрут через ${target.length} регион(а/ов).`);
        renderStrategyPanel();
      }
      armyDragState = null;
      renderGameMap();
      window.setTimeout(() => {
        mapDragState = null;
        gameMapViewport.classList.remove("dragging-map");
      }, 0);
      return;
    }
    if (!mapDragState) return;
    window.setTimeout(() => {
      mapDragState = null;
      gameMapViewport.classList.remove("dragging-map");
    }, 0);
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
    const waterPacked = new Uint32Array(map.width * map.height);
    for (let index = 0; index < regionAtPixel.length; index += 1) {
      if (regionTypeById.get(regionAtPixel[index]) !== "sea") continue;
      const x = index % map.width;
      const y = Math.floor(index / map.width);
      const color = gameWaterRgb(x, y, map.width, map.height, isCyclicMap(map));
      waterPacked[index] = packRgba(color[0], color[1], color[2]);
    }
    const allRegionIds = new Set(map.regions.map((region) => Number(region.id)));
    const maxRegionId = Math.max(0, ...allRegionIds);
    const centers = gameRegionCenters(regionAtPixel, map.width, map.height, allRegionIds);
    const regionGeoProfiles = buildRegionGeoProfiles(map, regionAtPixel, regionAdjacency, regionById, regionTypeById, centers);
    const borderSegments = buildMapBorderSegments(map, regionAtPixel, regionTypeById);
    const regionLabelSamples = buildRegionLabelSamples(regionAtPixel, map.width, map.height, allRegionIds);
    const mapImageData = gameMapCtx.createImageData(map.width, map.height);
    const mapImagePixels = new Uint32Array(mapImageData.data.buffer);
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
      regionGeoProfiles,
      waterPacked,
      borderSegments,
      regionLabelSamples,
      mapImageData,
      mapImagePixels,
      maxRegionId,
      mapDirty: true,
      centers,
    };
  }

  function enterGame(map, scenario, playerCountry, restoredState = null, protectedRussianRegionIds = null) {
    gameData = buildRuntimeGameData(map, scenario, protectedRussianRegionIds);
    strategyState = restoredState ? restoreStrategyState(restoredState) : createInitialStrategyState(scenario, playerCountry);
    normalizeStrategyState(strategyState, scenario);
    enforceSpecialRelations(strategyState, scenario);
    activeTab = "focuses";
    mapMode = "political";
    selectedEventId = null;
    expandedFocusId = null;
    relationMapMode = false;
    relationMapCountryId = Number(playerCountry.id);
    relationPair = null;
    updateRelationMapUi();
    setStrategyPanelFullscreen(false);
    gamePaused = true;
    gameSpeed = 1;
    gameMapCanvas.width = map.width;
    gameMapCanvas.height = map.height;
    gameOverlayCanvas.width = map.width;
    gameOverlayCanvas.height = map.height;
    soldierImage = new Image();
    soldierImage.src = `assets/soldier.png?v=${CACHE_VERSION}`;
    soldierImage.addEventListener("load", renderGameMap, { once: true });
    renderGameMap();
    setGameZoom(Math.min(1.5, 1100 / map.width, 720 / map.height));
    renderStrategyPanel();
    renderAdministrativeNotifications();
    updateSettingsPlayerOptions();
    stopRealtimeClock();
    gameLoading.hidden = true;
    setWorldHidden(false);
  }

  async function startGame() {
    if (!selectedMap || !selectedScenario || !selectedCountry) return;
    void lockLandscapeOrientation();
    showScreen(gameScreen);
    gameLoading.textContent = "Загрузка карты…";
    gameLoading.hidden = false;
    setWorldHidden(true);
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
      gameLoading.textContent = "Загрузка национальных фокусов…";
      await preloadScenarioFocusTrees(scenario);
      enterGame(map, scenario, playerCountry);
      saveGame("new-game");
    } catch (error) {
      gameLoading.textContent = `Ошибка загрузки игры: ${error.message}`;
      console.error(error);
    }
  }

  async function continueGame(saveOverride = null) {
    const save = saveOverride || savedGame();
    if (!save?.mapPath || !save?.scenario || !save?.strategyState) {
      updateContinueButton();
      return;
    }
    void lockLandscapeOrientation();
    showScreen(gameScreen);
    gameLoading.textContent = "Загрузка сохранения…";
    gameLoading.hidden = false;
    setWorldHidden(true);
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
      gameLoading.textContent = "Загрузка национальных фокусов…";
      await preloadScenarioFocusTrees(scenario);
      enterGame(map, scenario, selectedCountry, save.strategyState, save.protectedRussianRegionIds);
      addLog(save.name ? `Загружен слот «${save.name}».` : "Партия загружена из автосохранения.");
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

  gameScreen.addEventListener("click", (event) => {
    ensureAudio();
    const closeDetails = event.target.closest("[data-close-focus-details]");
    if (closeDetails) {
      expandedFocusId = null;
      playSound("click");
      renderStrategyPanel();
      return;
    }
    const eventItem = event.target.closest("[data-event-id]");
    if (eventItem) {
      selectedEventId = eventItem.dataset.eventId;
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
    if (action === "regional-election-approve") decideRegionalElection(button.dataset.id, true);
    if (action === "regional-election-refuse") decideRegionalElection(button.dataset.id, false);
    if (action === "reform") enactReform(button.dataset.id);
    if (action === "law") enactLaw(button.dataset.id, document.getElementById(`law-${button.dataset.id}`)?.value);
    if (action === "advisor") hireAdvisor(button.dataset.id);
    if (action === "character") appointCharacter(button.dataset.id);
    if (action === "doctrine") chooseDoctrine(button.dataset.id);
    if (action === "improve") improveRelations(document.getElementById("foreignTarget")?.value);
    if (action === "set-tax") setTaxRate(document.getElementById("taxRateSelect")?.value);
    if (action === "relation-map") toggleRelationMapMode();
    if (action === "map-mode") {
      mapMode = button.dataset.id || "political";
      if (mapMode === "relations") {
        relationMapMode = true;
        relationMapCountryId = relationMapCountryId || strategyState.playerCountryId;
        updateRelationMapUi();
      } else if (relationMapMode && activeTab === "maps") {
        relationMapMode = false;
        relationPair = null;
        updateRelationMapUi();
      }
      renderGameMap();
      renderStrategyPanel();
    }
    if (action === "alliance") signAlliance(document.getElementById("foreignTarget")?.value);
    if (action === "trade") signTrade(document.getElementById("tradeTarget")?.value, document.getElementById("tradeCategory")?.value || "energy");
    if (action === "currency") changeCurrencyPolicy(document.getElementById("currencyPolicy")?.value);
    if (action === "sanction") imposeSanction(document.getElementById("sanctionTarget")?.value, document.getElementById("sanctionType")?.value);
    if (action === "lift-sanction") liftSanction(button.dataset.id);
    if (action === "seize-assets") seizeForeignAssets(document.getElementById("assetOwner")?.value);
    if (action === "war") declareWar(document.getElementById("warTarget")?.value, document.getElementById("warGoal")?.value);
    if (action === "naval-blockade") setNavalMission("blockade", document.getElementById("navalTarget")?.value, document.getElementById("navalZone")?.value);
    if (action === "naval-escort") setNavalMission("escort", document.getElementById("navalTarget")?.value, document.getElementById("navalZone")?.value);
    if (action === "naval-clear") clearNavalMission();
    if (action === "map-country-diplomacy") {
      activeTab = "foreign";
      relationMapCountryId = Number(button.dataset.id);
      renderStrategyPanel();
    }
    if (action === "map-country-war") declareWar(button.dataset.id);
    if (action === "occupy") occupyEnemyRegion(document.getElementById("warTarget")?.value);
    if (action === "open-peace") openPeaceConference();
    if (action === "schedule-peace") schedulePeaceConference();
    if (action === "invite-peace-mediator") invitePeaceMediator(document.getElementById("peaceMediator")?.value || "un");
    if (action === "add-peace-demand") addPlayerPeaceDemand(document.getElementById("peaceDemandType")?.value, document.getElementById("peaceTarget")?.value, selectedPeaceRegionIds());
    if (action === "finalize-peace") finalizePeaceConference();
    if (action === "demand-capitulation") demandCapitulation(button.dataset.id);
    if (action === "nuclear-deterrence") nuclearDeterrence(document.getElementById("warTarget")?.value);
    if (action === "invite-war") inviteToWar(document.getElementById("inviteTarget")?.value, document.getElementById("inviteEnemy")?.value);
    if (action === "join-war") joinWarOnSide(document.getElementById("joinWarSide")?.value);
    if (action === "access") requestAccess(document.getElementById("treatyTarget")?.value);
    if (action === "visa") signVisaFree(document.getElementById("treatyTarget")?.value);
    if (action === "base") requestForeignBase(document.getElementById("treatyTarget")?.value);
    if (action === "non-aggression") signNonAggression(document.getElementById("treatyTarget")?.value, document.getElementById("nonAggressionMonths")?.value);
    if (action === "guarantee") guaranteeIndependence(document.getElementById("treatyTarget")?.value);
    if (action === "security-guarantee") giveSecurityGuarantees(document.getElementById("treatyTarget")?.value);
    if (action === "ultimatum") issueUltimatum(document.getElementById("pressureTarget")?.value);
    if (action === "ceasefire") offerCeasefire(document.getElementById("pressureTarget")?.value);
    if (action === "operation") startOperation(document.getElementById("operationType")?.value, document.getElementById("operationTarget")?.value);
    if (action === "army-minister") appointArmyMinister(document.getElementById("armyMinister")?.value);
    if (action === "recruit") recruitArmy(document.getElementById("recruitRegion")?.value);
    if (action === "recruit-deploy") recruitAndDeployArmy(document.getElementById("deployRecruitRegion")?.value, document.getElementById("deployTargetCountry")?.value);
    if (action === "recruit-selected") recruitArmy(strategyState.selectedRegionId || currentPlayerCountry()?.capitalRegionId);
    if (action === "move-army") moveArmy(button.dataset.id, button.dataset.targetId || strategyState.selectedRegionId);
    if (action === "integrate") integrateOccupation(button.dataset.id);
    if (action === "release-occupation") releaseSelectedOccupation(button.dataset.id);
    if (action === "create-region-country") createOccupationCountry([button.dataset.id], window.prompt("Название новой страны", gameData.regionById.get(Number(button.dataset.id))?.name || "Новое государство") || "");
    if (action === "create-occupation-country") createOccupationCountry(selectedPeaceRegionIds(), document.getElementById("releasedCountryName")?.value || "");
    if (action === "construction") startConstruction(document.getElementById("constructionProject")?.value, button.dataset.id);
    if (action === "create-admin-unit") createAdministrativeUnit();
    if (action === "save-admin-unit") saveAdministrativeUnit();
    if (action === "add-admin-member") addAdministrativeMember();
    if (action === "remove-admin-member") removeAdministrativeMember(button.dataset.id);
    if (action === "appoint-governor") appointGovernor(button.dataset.id, document.getElementById("governorEducation")?.value, document.getElementById("governorPolicy")?.value);
    if (action === "occupation-policy") setOccupationPolicy(button.dataset.id, document.getElementById("occupationPolicyMode")?.value);
    if (action === "occupation-garrison") addOccupationGarrison(button.dataset.id);
    if (action === "org-action") runOrganizationAction(button.dataset.org, button.dataset.id);
    if (action === "select-region") {
      strategyState.selectedRegionId = Number(document.getElementById("regionPicker")?.value || currentPlayerCountry()?.capitalRegionId);
      renderStrategyPanel();
    }
    if (action === "select-map-region") {
      strategyState.selectedRegionId = Number(button.dataset.id || currentPlayerCountry()?.capitalRegionId);
      renderGameMap();
      renderStrategyPanel();
    }
    if (action === "prod-minus") setProductionLine(button.dataset.id, -1);
    if (action === "prod-plus") setProductionLine(button.dataset.id, 1);
    if (action === "save-design") saveEquipmentDesign(button.dataset.kind);
    if (action === "research") startResearch(button.dataset.id);
    if (action === "nuclear-program") enableNuclearProgram();
    if (action === "nuclear-reactor") buildNuclearReactor();
    if (action === "nuclear-warhead") buildNuclearWarhead();
    if (action === "fix-logistics") fixLogistics();
  });

  peaceBackButton.addEventListener("click", () => {
    showScreen(gameScreen);
    activeTab = "wars";
    renderStrategyPanel();
  });
  window.addEventListener("resize", () => {
    if (peaceScreen.classList.contains("active") && strategyState?.peaceConference) renderPeace3D(strategyState.peaceConference);
  });
  peaceScreen.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, select, textarea, a, .peace-laptop")) return;
    peaceCameraDragging = true;
    peaceCameraPointer = { x: event.clientX, y: event.clientY };
    peaceScreen.setPointerCapture?.(event.pointerId);
    peace3dCanvas.classList.add("camera-dragging");
  });
  peaceScreen.addEventListener("pointermove", (event) => {
    if (!peaceCameraDragging) return;
    const dx = event.clientX - peaceCameraPointer.x;
    const dy = event.clientY - peaceCameraPointer.y;
    peaceCameraPointer = { x: event.clientX, y: event.clientY };
    peaceCameraYaw = Math.max(-70 * Math.PI / 180, Math.min(70 * Math.PI / 180, peaceCameraYaw + dx * 0.006));
    peaceCameraPitch = Math.max(-30 * Math.PI / 180, Math.min(30 * Math.PI / 180, peaceCameraPitch + dy * 0.006));
    if (strategyState?.peaceConference) renderPeace3D(strategyState.peaceConference);
  });
  const stopPeaceCameraDrag = () => { peaceCameraDragging = false; peace3dCanvas.classList.remove("camera-dragging"); };
  peaceScreen.addEventListener("pointerup", stopPeaceCameraDrag);
  peaceScreen.addEventListener("pointercancel", stopPeaceCameraDrag);

  peaceScreen.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-peace-action]");
    if (!button || button.disabled) return;
    ensureAudio();
    playSound("click");
    const action = button.dataset.peaceAction;
    if (action === "respond") respondToPeaceDemand(button.dataset.index, button.dataset.accepted === "true");
    if (action === "add") addPlayerPeaceDemand(document.getElementById("peaceDemandType")?.value, document.getElementById("peaceTarget")?.value, selectedPeaceRegionIds());
    if (action === "submit") submitPeaceOffer();
    if (action === "sign") {
      const venue = document.getElementById("peaceVenue");
      if (strategyState?.peaceConference && venue) strategyState.peaceConference.venueRegionId = Number(venue.value) || null;
      const title = document.getElementById("peaceTitle")?.value?.trim();
      if (strategyState?.peaceConference && title) strategyState.peaceConference.title = title;
      finalizePeaceConference();
    }
    if (action === "schedule") schedulePeaceConference();
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

  strategyContent.addEventListener("change", (event) => {
    if (event.target.id !== "adminUnitSelect") return;
    strategyState.selectedAdministrativeUnitId = event.target.value;
    renderStrategyPanel();
  });

  gameScreen.addEventListener("click", (event) => {
    const notification = event.target.closest("button[data-notification-id]");
    if (notification) {
      ensureAudio();
      playSound("click");
      openNotificationDetails(notification.dataset.notificationId);
      return;
    }
    if (event.target.closest("[data-close-notification]")) {
      document.getElementById("notificationDetails")?.remove();
      return;
    }
    const button = event.target.closest("button[data-admin-request]");
    if (!button) return;
    ensureAudio();
    playSound("click");
    decideAdministrativeRequest(button.dataset.id, button.dataset.adminRequest === "approve");
  });

  playButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    showScreen(setupScreen);
  });
  howToPlayButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    void startTutorialCampaign();
  });
  gameGuideButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    tutorialCampaign = false;
    openTutorial(0);
  });
  tutorialClose.addEventListener("click", closeTutorial);
  tutorialModal.addEventListener("click", (event) => {
    if (event.target === tutorialModal) closeTutorial();
  });
  tutorialBack.addEventListener("click", () => {
    tutorialStep = Math.max(0, tutorialStep - 1);
    renderTutorial();
  });
  tutorialNext.addEventListener("click", () => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      closeTutorial();
      return;
    }
    tutorialStep += 1;
    renderTutorial();
  });
  tutorialAction.addEventListener("click", () => {
    const tab = tutorialAction.dataset.tab;
    if (!tab || !gameData || !strategyState) return;
    activeTab = tab;
    closeTutorial();
    renderStrategyPanel();
  });
  continueButton?.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    continueGame();
  });
  savesButton?.addEventListener("click", () => openSaveDialog("load"));
  saveSlotButton?.addEventListener("click", () => openSaveDialog("save"));
  saveModalClose?.addEventListener("click", closeSaveDialog);
  saveSlotConfirm?.addEventListener("click", () => {
    if (saveNamedSlot(saveSlotName?.value)) {
      playSound("save");
      renderSaveDialog();
      closeSaveDialog();
    }
  });
  saveSlotsList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-save-action]");
    if (!button) return;
    const index = button.dataset.index;
    if (button.dataset.saveAction === "delete") deleteSaveSlot(index);
    if (button.dataset.saveAction === "overwrite") {
      const slot = savedSlots()[Number(index)];
      if (slot && saveNamedSlot(slot.name)) {
        playSound("save");
        renderSaveDialog();
      }
    }
    if (button.dataset.saveAction === "load") {
      const save = index === "auto" ? savedGame() : savedSlots()[Number(index)];
      if (!save) return;
      closeSaveDialog();
      void continueGame(save);
    }
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
    tutorialCampaign = false;
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
  gameMapViewport.addEventListener("mousedown", beginMapDrag);
  window.addEventListener("mousemove", updateMapDrag);
  window.addEventListener("mouseup", endMapDrag);
  gameMapViewport.addEventListener("scroll", wrapMapScroll);
  gameMapViewport.addEventListener("click", selectRegionFromMap);
  gameMapViewport.addEventListener("contextmenu", inspectRelationPairFromMap);
  document.addEventListener("click", (event) => {
    if (!relationMapMode) return;
    const button = event.target.closest("button");
    if (!button || button.id === "relationMapBackButton" || button.dataset.action === "relation-map") return;
    exitRelationMapMode(false);
  });
  nextTurnButton.addEventListener("click", () => {
    ensureAudio();
    playSound("click");
    void advanceDay();
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
  settingsPoliticalMap.addEventListener("change", () => {
    userSettings.politicalMap = settingsPoliticalMap.value;
    saveUserSettings();
    if (gameData && mapMode === "political") renderGameMap();
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
