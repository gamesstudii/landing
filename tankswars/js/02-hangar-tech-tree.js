    function selectTankCard(card, tank) {
      document
        .querySelectorAll(".tankCard.selected")
        .forEach((selectedCard) => selectedCard.classList.remove("selected"));

      card.classList.add("selected");
      selectTank(tank);
    }

    function createHangarTankStat(label, value) {
      const row = document.createElement("div");
      const labelElement = document.createElement("span");
      const valueElement = document.createElement("span");

      row.className = "hangarTankStat";
      valueElement.className = "hangarTankStatValue";
      labelElement.textContent = label;
      valueElement.textContent = value;
      row.append(labelElement, valueElement);
      return row;
    }

    function getTankSaleOffer(tank) {
      if (!tank || tank.futureTank || tank.state !== 2 || getDefaultTankState(tank) === 2) {
        return null;
      }

      if (tank.premium || tank.containerEligible) {
        return {
          currency: "gold",
          amount: 5000,
          label: "золота",
          nextState: 0
        };
      }

      return {
        currency: "silver",
        amount: Math.floor(normalizeNumber(tank.researchSilverPrice) * 0.6),
        label: "серебра",
        nextState: 1
      };
    }

    function getOwnedTanks() {
      return loadedTanks.filter((tank) => tank.state === 2 && !tank.futureTank);
    }

    function sellTank(tank) {
      const targetTank = findLoadedTankByReference(tank);
      const offer = getTankSaleOffer(targetTank);
      const ownedTanks = getOwnedTanks();

      if (!offer || offer.amount <= 0) {
        console.warn("This tank cannot be sold.");
        return false;
      }

      if (ownedTanks.length <= 1) {
        console.warn("The last tank cannot be sold.");
        return false;
      }

      const confirmed = !window.confirm
        || window.confirm(`Продать ${targetTank.name} за ${formatStoredNumber(offer.amount)} ${offer.label}?`);

      if (!confirmed) {
        return false;
      }

      playerResources[offer.currency] = normalizeNumber(playerResources[offer.currency]) + offer.amount;
      targetTank.state = normalizeTankState(offer.nextState, 0);
      savePlayerResources();
      saveTankState(targetTank);

      if (selectedTank?.id === targetTank.id) {
        selectedTank = getOwnedTanks().find((ownedTank) => ownedTank.id !== targetTank.id) || fallbackTanks[0];
      }

      renderHangarTankStats(selectedTank);
      setTankImage(hangarTank, selectedTank.name);
      renderTopBar();
      renderTankFilters();
      renderTankBar(loadedTanks);
      return true;
    }

    function createSellTankButton(tank) {
      const offer = getTankSaleOffer(tank);
      const button = document.createElement("button");
      const ownedTanks = getOwnedTanks();

      button.type = "button";
      button.className = "hangarSellButton";

      if (!offer || offer.amount <= 0) {
        button.textContent = "Продажа недоступна";
        button.disabled = true;
        return button;
      }

      button.textContent = `Продать: ${formatStoredNumber(offer.amount)} ${offer.label}`;
      button.disabled = ownedTanks.length <= 1;
      button.addEventListener("click", () => sellTank(tank));
      return button;
    }

    function createHangarActionButton(label, onClick) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "hangarSellButton";
      button.textContent = label;
      button.addEventListener("click", onClick);
      return button;
    }

    function getTankCompareStats(tank) {
      const shells = getTankShells(tank);
      const bestShell = shells.reduce((best, shell) => shell.damage > best.damage ? shell : best, shells[0] || { damage: 0, penetration: 0 });
      const bestPenetration = Math.max(...shells.map((shell) => shell.penetration || 0));
      const rawShells = Array.isArray(tank.shells) ? tank.shells : [];
      const createShellStat = (index, field, label, lowerBetter = false) => ({
        label: `Снаряд ${index + 1}: ${label}`,
        value: field === "type"
          ? rawShells[index]?.type || "-"
          : field === "damage"
            ? normalizeNumber(rawShells[index]?.damage || 0)
            : normalizeNumber(shells[index]?.penetration || 0),
        lowerBetter
      });

      return [
        { label: "Нация", value: tank.nation || "-", comparable: false },
        { label: "Класс", value: tank.className || "-", comparable: false },
        { label: "Уровень", value: normalizeNumber(tank.level), lowerBetter: false },
        { label: "Прочность", value: getTankHealth(tank), lowerBetter: false },
        { label: "Урон", value: bestShell.damage, lowerBetter: false },
        { label: "Пробитие", value: bestPenetration, lowerBetter: false },
        createShellStat(0, "type", "тип"),
        createShellStat(0, "damage", "урон"),
        createShellStat(0, "penetration", "пробитие"),
        createShellStat(1, "type", "тип"),
        createShellStat(1, "damage", "урон"),
        createShellStat(1, "penetration", "пробитие"),
        createShellStat(2, "type", "тип"),
        createShellStat(2, "damage", "урон"),
        createShellStat(2, "penetration", "пробитие"),
        { label: "Перезарядка", value: getTankReloadTime(tank, false), lowerBetter: true, suffix: " с", decimals: 1 },
        { label: "Скорость", value: getTankMoveSpeed(tank, false), lowerBetter: false },
        { label: "Поворот корпуса", value: getTankTurnSpeed(tank, false) * 180 / Math.PI, lowerBetter: false },
        { label: "Задержка движения", value: normalizePositiveFloat(tank.movementDelay || 0), lowerBetter: true, decimals: 3 },
        { label: "Задержка поворота", value: normalizePositiveFloat(tank.hullTurnDelay || 0), lowerBetter: true, decimals: 3 },
        { label: "Броня", value: normalizeNumber(tank.averageArmor || 0), lowerBetter: false },
        { label: "Шанс пробития", value: normalizeNumber(tank.penetrationChance || 0), lowerBetter: false, suffix: "%", decimals: 0 },
        { label: "Тип орудия", value: normalizeNumber(tank.gunType || 1), lowerBetter: false },
        { label: "Снарядов за выстрел", value: normalizeNumber(tank.shellsPerShot || 1), lowerBetter: false },
        { label: "Магазин", value: normalizeNumber(tank.clipSize || 0), lowerBetter: false },
        { label: "Разброс", value: normalizePositiveFloat(tank.gunSpreadDegrees || 0), lowerBetter: true, suffix: "°", decimals: 2 },
        { label: "Обзор", value: getTankViewRange(tank), lowerBetter: false },
        { label: "Маскировка", value: getTankCamouflage(tank) * 100, lowerBetter: false, suffix: "%", decimals: 0 },
        { label: "Цена покупки", value: normalizeNumber(tank.researchSilverPrice || 0), lowerBetter: true },
        { label: "Цена исследования", value: normalizeNumber(tank.researchExperiencePrice || 0), lowerBetter: true },
        { label: "Премиум/контейнер", value: tank.premium || tank.containerEligible ? "да" : "нет", comparable: false },
        { label: "Доступен ботам", value: tank.botEligible === false ? "нет" : "да", comparable: false }
      ];
    }

    function formatCompareValue(stat) {
      if (typeof stat.value === "string") {
        return stat.value;
      }

      const value = stat.decimals !== undefined ? Number(stat.value).toFixed(stat.decimals) : formatStoredNumber(Math.round(stat.value));

      return `${value}${stat.suffix || ""}`;
    }

    function getComparableTanks() {
      return loadedTanks.filter((tank) => !tank.futureTank);
    }

    function renderCompareScreen(compareTank = getComparableTanks().find((tank) => tank.id !== selectedTank?.id) || selectedTank) {
      const baseTank = findLoadedTankByReference(selectedTank);
      const targetTank = findLoadedTankByReference(compareTank);
      const screen = document.createElement("div");
      const selector = document.createElement("select");
      const table = document.createElement("div");
      const baseStats = getTankCompareStats(baseTank);
      const targetStats = getTankCompareStats(targetTank || baseTank);

      overlayContent.textContent = "";
      screen.className = "compareScreen";
      selector.className = "compareSelect";
      getComparableTanks().forEach((tank) => {
        const option = document.createElement("option");

        option.value = tank.id;
        option.textContent = tank.name;
        selector.append(option);
      });
      selector.value = String(targetTank?.id || baseTank.id);
      selector.addEventListener("change", () => renderCompareScreen(findTankById(normalizeNumber(selector.value))));
      table.className = "compareTable";
      table.append(createCompareCell("Характеристика", "header"), createCompareCell(baseTank.name, "header"), createCompareCell(targetTank?.name || baseTank.name, "header"));
      baseStats.forEach((stat, index) => {
        const other = targetStats[index];
        const comparable = stat.comparable !== false
          && typeof stat.value === "number"
          && typeof other.value === "number"
          && Number.isFinite(stat.value)
          && Number.isFinite(other.value);
        const diff = comparable ? stat.value - other.value : 0;
        const baseClass = diff === 0 ? "" : (stat.lowerBetter ? diff < 0 : diff > 0) ? "better" : "worse";
        const otherClass = diff === 0 ? "" : (stat.lowerBetter ? diff > 0 : diff < 0) ? "better" : "worse";

        table.append(
          createCompareCell(stat.label),
          createCompareCell(formatCompareValue(stat), baseClass),
          createCompareCell(formatCompareValue(other), otherClass)
        );
      });
      screen.append(selector, table);
      overlayContent.append(screen);
      screenOverlay.classList.remove("fullscreenOverlay");
      screenOverlay.classList.add("active");
      showOverlayBackButton(false);
    }

    function createCompareCell(text, className = "") {
      const cell = document.createElement("div");

      cell.className = `compareCell ${className}`.trim();
      cell.textContent = text;
      return cell;
    }

    function trainCrewMember(tank, roleId, method) {
      const crew = loadTankCrew(tank);
      const member = crew[roleId];

      if (!member) {
        return;
      }

      if (method === "gold") {
        if (playerResources.gold < crewGoldTrainPrice) {
          return;
        }

        playerResources.gold -= crewGoldTrainPrice;
        member.experience = crewExperienceToTrain;
        member.elite = true;
        savePlayerResources();
      } else {
        member.experience = Math.min(crewExperienceToTrain, normalizeNumber(member.experience));
      }

      saveTankCrew(tank);
      renderTopBar();
      renderCrewScreen(tank);
      renderHangarTankStats(tank);
    }

    function renderCrewScreen(tank = selectedTank) {
      const targetTank = findLoadedTankByReference(tank);
      const crew = loadTankCrew(targetTank);
      const screen = document.createElement("div");
      const title = document.createElement("div");

      overlayContent.textContent = "";
      screen.className = "crewScreen";
      title.className = "crewTitle";
      title.textContent = `Экипаж: ${targetTank.name}`;
      screen.append(title);
      crewRoles.forEach((role) => {
        const member = crew[role.id];
        const row = document.createElement("div");
        const info = document.createElement("div");
        const progress = document.createElement("div");
        const trainButton = document.createElement("button");
        const goldButton = document.createElement("button");
        const percent = Math.round((0.9 + Math.min(1, normalizeNumber(member.experience) / crewExperienceToTrain) * 0.1) * (member.elite ? 1.05 : 1) * 100);

        row.className = "crewMember";
        info.className = "crewInfo";
        progress.className = "crewProgress";
        trainButton.className = "dailyButton";
        goldButton.className = "dailyButton";
        trainButton.type = "button";
        goldButton.type = "button";
        info.textContent = `${role.title} | ${role.stat} | эффективность ${percent}%`;
        progress.textContent = `${formatStoredNumber(member.experience)} / ${formatStoredNumber(crewExperienceToTrain)} опыта экипажа`;
        trainButton.textContent = member.experience >= crewExperienceToTrain ? "Прокачано" : "Идёт прокачка";
        trainButton.disabled = true;
        trainButton.addEventListener("click", () => trainCrewMember(targetTank, role.id, "experience"));
        goldButton.textContent = `Улучшить: ${crewGoldTrainPrice} золота`;
        goldButton.disabled = member.elite || playerResources.gold < crewGoldTrainPrice;
        goldButton.addEventListener("click", () => trainCrewMember(targetTank, role.id, "gold"));
        row.append(info, progress, trainButton, goldButton);
        screen.append(row);
      });
      overlayContent.append(screen);
      screenOverlay.classList.remove("fullscreenOverlay");
      screenOverlay.classList.add("active");
      showOverlayBackButton(false);
    }

    function renderHangarTankStats(tank) {
      const name = document.createElement("div");
      const meta = document.createElement("div");
      const stats = document.createElement("div");
      const actions = document.createElement("div");
      const shells = getTankShells(tank);
      const bestShell = shells.reduce((best, shell) => (
        shell.damage > best.damage ? shell : best
      ), shells[0] || { damage: 0, penetration: 0 });
      const bestPenetration = Math.max(...shells.map((shell) => shell.penetration || 0));
      const reload = getTankReloadTime(tank, false);
      const speed = getTankMoveSpeed(tank, false);

      statsPanel.textContent = "";
      name.className = "hangarTankName";
      meta.className = "hangarTankMeta";
      stats.className = "hangarTankStats";
      actions.className = "hangarTankActions";
      name.textContent = tank.name;
      meta.textContent = `${toRoman(tank.level)} уровень | ${tank.className || "-"} | ${tank.nation || "-"}`;
      stats.append(
        createHangarTankStat("Прочность", formatStoredNumber(getTankHealth(tank))),
        createHangarTankStat("Урон", formatStoredNumber(bestShell.damage)),
        createHangarTankStat("Пробитие", formatStoredNumber(bestPenetration)),
        createHangarTankStat("Перезарядка", `${reload.toFixed(1)} с`),
        createHangarTankStat("Скорость", `${Math.round(speed)} ед/с`),
        createHangarTankStat("Броня", formatStoredNumber(tank.averageArmor || 0))
      );
      actions.append(
        createHangarActionButton("Сравнить", () => renderCompareScreen()),
        createHangarActionButton("Экипаж", () => renderCrewScreen(tank)),
        createHangarActionButton("Тест-драйв", startTestDriveBattle),
        createSellTankButton(tank)
      );
      statsPanel.append(name, meta, stats, actions);
    }

    function selectTank(tank) {
      selectedTank = tank;
      renderHangarTankStats(tank);
      setTankImage(hangarTank, tank.name);
      renderTopBar();
    }

    function setTankImage(image, tankName) {
      delete image.dataset.fallbackLoaded;
      image.src = `./${tankName}.png`;
      image.onerror = () => {
        if (image.dataset.fallbackLoaded) {
          image.removeAttribute("src");
          return;
        }

        image.dataset.fallbackLoaded = "true";
        image.src = `./img/${tankName}.png`;
      };
    }

    function createTankCard(tank, selected = false, onSelect = null) {
      const card = document.createElement("article");
      const level = document.createElement("div");
      const tankImage = document.createElement("img");
      const name = document.createElement("div");
      const nationFileName = formatNationFileName(tank.nation);
      const activateCard = () => {
        if (onSelect) {
          onSelect(card, tank);
          return;
        }

        selectTankCard(card, tank);
      };

      card.className = `tankCard ${tank.premium || tank.containerEligible ? "premium" : ""} ${tank.futureTank ? "future" : ""}`.trim();
      if (!tank.futureTank) {
        card.tabIndex = 0;
      }
      level.className = "tankLevel";
      tankImage.className = "tankImage";
      tankImage.alt = "";
      setTankImage(tankImage, tank.name);
      name.className = "tankName";
      level.textContent = toRoman(tank.level);
      name.textContent = tank.name;

      if (nationFileName) {
        card.style.backgroundImage = `url("./img/${nationFileName}.png"), url("./${nationFileName}.png")`;
      }

      card.append(level, tankImage, name);
      if (!tank.futureTank) {
        card.addEventListener("click", activateCard);
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateCard();
          }
        });
      }

      if (selected) {
        card.classList.add("selected");
      }

      return card;
    }

    function getTankNationOrder(tank) {
      const nationOrder = [
        "\u0441\u0441\u0441\u0440",
        "\u0433\u0435\u0440\u043c\u0430\u043d\u0438\u044f",
        "\u0432\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f",
        "\u0430\u043d\u0433\u043b\u0438\u044f",
        "\u0448\u0432\u0435\u0446\u0438\u044f",
        "\u0444\u0440\u0430\u043d\u0446\u0438\u044f",
        "\u044f\u043f\u043e\u043d\u0438\u044f",
        "\u043f\u043e\u043b\u044c\u0448\u0430",
        "\u043a\u0438\u0442\u0430\u0439",
        "\u0438\u0442\u0430\u043b\u0438\u044f",
        "\u0447\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u044f",
        "\u0447\u0435\u0445\u0438\u044f",
        "\u0441\u0448\u0430",
        "\u043c\u0438\u0440\u043e\u0432\u0430\u044f \u043d\u0430\u0446\u0438\u044f",
        "\u043c\u0438\u0440\u043e\u0432\u0430\u044f\u043d\u0430\u0446\u0438\u044f"
      ];
      const nationKey = normalizeTechTreeKey(tank.nation);
      const index = nationOrder.indexOf(nationKey);

      return index === -1 ? nationOrder.length : index;
    }

    function getTankClassOrderForBar(tank) {
      const classOrder = ["\u0422\u0422", "\u0421\u0422", "\u041b\u0422", "\u041a\u0422", "\u0411\u0422\u0420", "\u041f\u0422", "\u0421\u0410\u0423"];
      const index = classOrder.indexOf(tank.className);

      return index === -1 ? classOrder.length : index;
    }

    function compareTankBarItems(first, second) {
      return normalizeNumber(second.level) - normalizeNumber(first.level)
        || getTankNationOrder(first) - getTankNationOrder(second)
        || getTankClassOrderForBar(first) - getTankClassOrderForBar(second)
        || Number(Boolean(first.premium || first.containerEligible)) - Number(Boolean(second.premium || second.containerEligible))
        || first.id - second.id;
    }

    function getTankFilterType(tank) {
      if (tank.futureTank) {
        return "future";
      }

      if (tank.premium || tank.containerEligible) {
        return "premium";
      }

      return "regular";
    }

    function getTankFilterOptions(tanks, property, formatter = (value) => value) {
      return [...new Set(tanks
        .map((tank) => formatter(tank[property]))
        .filter(Boolean))]
        .sort((first, second) => String(first).localeCompare(String(second), "ru", { numeric: true }));
    }

    function tankMatchesBarFilters(tank) {
      const type = getTankFilterType(tank);
      const typeMatches = tankBarFilters.type === "all" || tankBarFilters.type === type;
      const nationMatches = tankBarFilters.nation === "all" || tank.nation === tankBarFilters.nation;
      const levelMatches = tankBarFilters.level === "all" || String(tank.level) === tankBarFilters.level;
      const classMatches = tankBarFilters.className === "all" || tank.className === tankBarFilters.className;

      if (!typeMatches || !nationMatches || !levelMatches || !classMatches) {
        return false;
      }

      if (tankBarFilters.type === "future") {
        return tank.futureTank;
      }

      return tank.state === 2 && !tank.futureTank;
    }

    function createTankFilterSelect(label, value, options, onChange) {
      const wrapper = document.createElement("label");
      const title = document.createElement("span");
      const select = document.createElement("select");

      wrapper.className = "tankFilterField";
      title.textContent = label;

      options.forEach((option) => {
        const element = document.createElement("option");

        element.value = option.value;
        element.textContent = option.label;
        select.append(element);
      });

      select.value = value;
      select.addEventListener("change", () => onChange(select.value));
      wrapper.append(title, select);
      return wrapper;
    }

    function renderTankFilters() {
      const button = document.createElement("button");
      const panel = document.createElement("div");
      const resetButton = document.createElement("button");
      const filteredCount = loadedTanks.filter(tankMatchesBarFilters).length;
      const nations = getTankFilterOptions(loadedTanks, "nation");
      const levels = getTankFilterOptions(loadedTanks, "level", (value) => String(value));
      const classes = getTankFilterOptions(loadedTanks, "className");
      const updateFilter = (name, value) => {
        tankBarFilters[name] = value;
        renderTankFilters();
        renderTankBar(loadedTanks);
      };

      searchSlot.textContent = "";
      searchSlot.classList.toggle("open", tankFiltersOpen);

      button.type = "button";
      button.className = "tankFilterButton";
      button.textContent = "Фильтры";
      button.setAttribute("aria-expanded", String(tankFiltersOpen));
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        tankFiltersOpen = !tankFiltersOpen;
        renderTankFilters();
      });

      panel.className = "tankFilterPanel";
      panel.addEventListener("click", (event) => event.stopPropagation());
      panel.append(
        createTankFilterSelect("Нация", tankBarFilters.nation, [
          { value: "all", label: "Все" },
          ...nations.map((nation) => ({ value: nation, label: nation }))
        ], (value) => updateFilter("nation", value)),
        createTankFilterSelect("Уровень", tankBarFilters.level, [
          { value: "all", label: "Все" },
          ...levels.map((level) => ({ value: level, label: toRoman(level) }))
        ], (value) => updateFilter("level", value)),
        createTankFilterSelect("Тип", tankBarFilters.type, [
          { value: "all", label: "Все" },
          { value: "regular", label: "Обычный" },
          { value: "premium", label: "Прем" },
          { value: "future", label: "Ещё не добавлен" }
        ], (value) => updateFilter("type", value)),
        createTankFilterSelect("Класс", tankBarFilters.className, [
          { value: "all", label: "Все" },
          ...classes.map((className) => ({ value: className, label: className }))
        ], (value) => updateFilter("className", value))
      );

      resetButton.type = "button";
      resetButton.className = "tankFilterReset";
      resetButton.textContent = `Сбросить (${filteredCount})`;
      resetButton.addEventListener("click", () => {
        tankBarFilters.nation = "all";
        tankBarFilters.level = "all";
        tankBarFilters.type = "all";
        tankBarFilters.className = "all";
        renderTankFilters();
        renderTankBar(loadedTanks);
      });
      panel.append(resetButton);
      searchSlot.append(button, panel);
    }

    function renderTankBar(tanks) {
      tankBar.textContent = "";
      tankBar.scrollLeft = 0;

      const visibleTanks = tanks
        .filter(tankMatchesBarFilters)
        .sort(compareTankBarItems)
      if (visibleTanks.length === 0) {
        const message = document.createElement("div");

        message.className = "tankBarEmpty";
        message.textContent = "Нет танков по выбранным фильтрам";
        tankBar.append(message);
        return;
      }

      visibleTanks.forEach((tank) => {
        const slot = document.createElement("div");

        slot.className = "tankSlot";
        slot.append(createTankCard(tank, tank.id === selectedTank?.id));
        tankBar.append(slot);
      });
    }

    function createTankSlot(tank, selected = false, onSelect = null) {
      const slot = document.createElement("div");

      slot.className = "tankSlot";
      slot.append(createTankCard(tank, selected, onSelect));
      return slot;
    }

    function findResearchTarget(value) {
      const targetName = normalizeTankName(value);
      const targetByName = loadedTanks.find((tank) => normalizeTankName(tank.name) === targetName);

      if (targetByName) {
        return targetByName;
      }

      if (valueIsNumericReference(value)) {
        const targetId = normalizeNumber(value);
        return findTankById(targetId);
      }

      return null;
    }

    function normalizeTankName(value) {
      return String(value)
        .trim()
        .toLowerCase()
        .replace(/\u0451/g, "\u0435")
        .replace(/\s+/g, " ");
    }

    function findLoadedTankByReference(tank) {
      if (!tank) {
        return null;
      }

      return findTankById(tank.id)
        || loadedTanks.find((loadedTank) => normalizeTankName(loadedTank.name) === normalizeTankName(tank.name))
        || tank;
    }

    function getResearchPrice(targetTank) {
      if (targetTank.futureTank) {
        return "\u0411\u0443\u0434\u0435\u0442 \u043f\u043e\u0437\u0436\u0435";
      }

      if (targetTank.state === 2) {
        return "";
      }

      if (targetTank.state === 1) {
        if (targetTank.researchSilverPrice) {
          return `${formatStoredNumber(targetTank.researchSilverPrice)} серебра`;
        }

        return targetTank.researchExperiencePrice
          ? `${formatStoredNumber(targetTank.researchExperiencePrice)} опыта`
          : "";
      }

      if (targetTank.researchExperiencePrice) {
        return `${formatStoredNumber(targetTank.researchExperiencePrice)} опыта`;
      }

      return targetTank.researchSilverPrice
        ? `${formatStoredNumber(targetTank.researchSilverPrice)} серебра`
        : "";
    }

    function saveTankExperience(tank) {
      setCookie(getTankExperienceCookieName(tank), tank.experience);
    }

    function saveTankState(tank) {
      setCookie(getTankStateCookieName(tank), tank.state);
    }

    function savePlayerResources() {
      setCookie("blueprints", playerResources.blueprints);
      setCookie("silver", playerResources.silver);
      setCookie("gold", playerResources.gold);
    }

    function rerenderUpgradeScreen() {
      overlayContent.textContent = "";
      if (screenOverlay.classList.contains("fullscreenOverlay")) {
        renderNationTechTreeScreen();
      } else {
        renderUpgradeScreen();
      }
      renderTopBar();
      renderTankBar(loadedTanks);
    }

    function selectTankFromUpgrade(tank) {
      const sourceTank = findLoadedTankByReference(selectedTank);
      const targetTank = findLoadedTankByReference(tank);

      if (targetTank.futureTank) {
        console.warn("Tank is not available yet.");
        return;
      }

      if (targetTank.state === 0) {
        const price = targetTank.researchExperiencePrice;
        const sourceExperience = normalizeNumber(sourceTank.experience);

        if (!price || sourceExperience < price) {
          console.warn("Not enough experience.");
          return;
        }

        sourceTank.experience = toEightDigits(sourceExperience - price);
        targetTank.state = 1;
        saveTankExperience(sourceTank);
        saveTankState(targetTank);
        selectedTank = sourceTank;
        rerenderUpgradeScreen();
        return;
      }

      if (targetTank.state === 1) {
        const price = targetTank.researchSilverPrice;

        if (!price || playerResources.silver < price) {
          console.warn("Not enough silver.");
          return;
        }

        playerResources.silver -= price;
        targetTank.state = 2;
        savePlayerResources();
        saveTankState(targetTank);
        selectTank(targetTank);
        closeOverlay();
        renderTankBar(loadedTanks);
        return;
      }

      selectTank(tank);
      closeOverlay();
      renderTankBar(loadedTanks);
    }

    const techTreeNationConfigs = [
      { label: "\u0421\u0421\u0421\u0420", nation: "\u0421\u0421\u0421\u0420", file: "sssr" },
      { label: "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f", nation: "\u0433\u0435\u0440\u043c\u0430\u043d\u0438\u044f", file: "germany" },
      { label: "\u0412\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f", nation: "\u0432\u0435\u043b\u0438\u043a\u043e\u0431\u0440\u0438\u0442\u0430\u043d\u0438\u044f", file: "uk" },
      { label: "\u0428\u0432\u0435\u0446\u0438\u044f", nation: "\u0448\u0432\u0435\u0446\u0438\u044f", file: "sweden" },
      { label: "\u0424\u0440\u0430\u043d\u0446\u0438\u044f", nation: "\u0444\u0440\u0430\u043d\u0446\u0438\u044f", file: "france" },
      { label: "\u042f\u043f\u043e\u043d\u0438\u044f", nation: "\u044f\u043f\u043e\u043d\u0438\u044f", file: "japan" },
      { label: "\u041f\u043e\u043b\u044c\u0448\u0430", nation: "\u043f\u043e\u043b\u044c\u0448\u0430", file: "poland" },
      { label: "\u041a\u0438\u0442\u0430\u0439", nation: "\u043a\u0438\u0442\u0430\u0439", file: "china" },
      { label: "\u0418\u0442\u0430\u043b\u0438\u044f", nation: "\u0438\u0442\u0430\u043b\u0438\u044f", file: "italy" },
      { label: "\u0427\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u044f", nation: "\u0447\u0435\u0445\u043e\u0441\u043b\u043e\u0432\u0430\u043a\u0438\u044f", file: "czechoslovakia" },
      { label: "\u0421\u0428\u0410", nation: "\u0441\u0448\u0430", file: "usa" },
      { label: "\u041c\u0438\u0440\u043e\u0432\u0430\u044f \u043d\u0430\u0446\u0438\u044f", nation: "\u043c\u0438\u0440\u043e\u0432\u0430\u044f \u043d\u0430\u0446\u0438\u044f", file: "mirovayanacia" }
    ];

    function normalizeTechTreeKey(value) {
      return String(value || "").trim().toLowerCase();
    }

    function getTechTreeNationConfig(nation = selectedTechTreeNation) {
      const nationKey = normalizeTechTreeKey(nation);

      return techTreeNationConfigs.find((config) => normalizeTechTreeKey(config.nation) === nationKey)
        || techTreeNationConfigs[0];
    }

    function getTechTreeTanks(nation) {
      const nationKey = normalizeTechTreeKey(nation);
      const tankMap = new Map();

      loadedTanks
        .filter((tank) => tank.techTreeEligible && normalizeTechTreeKey(tank.nation) === nationKey)
        .forEach((tank) => {
          const tankKey = normalizeTankName(tank.name);
          const existingTank = tankMap.get(tankKey);

          if (!existingTank) {
            tankMap.set(tankKey, {
              ...tank,
              researchTargets: [...tank.researchTargets],
              researchParents: [...(tank.researchParents || [])]
            });
            return;
          }

          existingTank.researchTargets = [
            ...new Set([...existingTank.researchTargets, ...tank.researchTargets])
          ];
          existingTank.researchParents = [
            ...new Set([...(existingTank.researchParents || []), ...(tank.researchParents || [])])
          ];
        });

      return [...tankMap.values()];
    }

    function findTechTreeTankByReference(value, tankMap) {
      const targetName = normalizeTankName(value);
      const targetByName = tankMap.get(targetName);

      if (targetByName) {
        return targetByName;
      }

      if (valueIsNumericReference(value)) {
        const targetId = normalizeNumber(value);
        return [...tankMap.values()].find((tank) => tank.id === targetId);
      }

      return null;
    }

    function addTechTreeEdge(fromKey, toKey, tankMap, children, parents, edges) {
      const fromTank = tankMap.get(fromKey);
      const toTank = tankMap.get(toKey);

      if (!fromTank || !toTank || fromKey === toKey || normalizeNumber(toTank.level) < normalizeNumber(fromTank.level)) {
        return;
      }

      if (!children.get(fromKey).includes(toKey)) {
        children.get(fromKey).push(toKey);
        parents.get(toKey).push(fromKey);
        edges.push({ from: fromKey, to: toKey, fromLevel: normalizeNumber(fromTank.level) });
      }
    }

    function addTechTreeEdgeByName(fromName, toName, tankMap, children, parents, edges) {
      addTechTreeEdge(
        normalizeTankName(fromName),
        normalizeTankName(toName),
        tankMap,
        children,
        parents,
        edges
      );
    }

    function addManualTechTreeEdges(nation, tankMap, children, parents, edges) {
      if (normalizeTechTreeKey(nation) !== "\u0441\u0441\u0441\u0440") {
        return;
      }

      addTechTreeEdgeByName("\u041a\u0412-1", "\u041a\u0412-1\u0421", tankMap, children, parents, edges);
      addTechTreeEdgeByName("\u0421\u0423-14-2", "212\u0410", tankMap, children, parents, edges);
      addTechTreeEdgeByName("212\u0410", "\u043e\u0431\u044a\u0435\u043a\u0442 261", tankMap, children, parents, edges);

    }

    function getTechTreeClassOrder(tank) {
      const classOrders = {
        "\u041b\u0422": 0,
        "\u0421\u0422": 1,
        "\u041a\u0422": 2,
        "\u0411\u0422\u0420": 3,
        "\u0422\u0422": 4,
        "\u041f\u0422": 5,
        "\u0421\u0410\u0423": 6
      };

      return classOrders[tank.className] ?? 7;
    }

    function buildTechTreeLayout(nation) {
      const tanks = getTechTreeTanks(nation);
      const tankMap = new Map(tanks.map((tank) => [normalizeTankName(tank.name), tank]));
      const children = new Map();
      const parents = new Map();
      const edges = [];

      tanks.forEach((tank) => {
        const tankKey = normalizeTankName(tank.name);

        children.set(tankKey, []);
        parents.set(tankKey, []);
      });

      tanks.forEach((tank) => {
        const tankKey = normalizeTankName(tank.name);
        const sourceLevel = normalizeNumber(tank.level);

        (tank.researchParents || []).forEach((parentReference) => {
          const parentTank = findTechTreeTankByReference(parentReference, tankMap);

          if (!parentTank) {
            return;
          }

          addTechTreeEdge(normalizeTankName(parentTank.name), tankKey, tankMap, children, parents, edges);
        });

        tank.researchTargets.forEach((targetReference) => {
          const targetTank = findTechTreeTankByReference(targetReference, tankMap);

          if (!targetTank) {
            return;
          }

          const targetKey = normalizeTankName(targetTank.name);
          const targetLevel = normalizeNumber(targetTank.level);

          if (targetKey === tankKey || targetLevel < sourceLevel) {
            return;
          }

          addTechTreeEdge(tankKey, targetKey, tankMap, children, parents, edges);
        });
      });

      tanks
        .filter((tank) => tank.futureTank && (tank.researchParents || []).length > 0)
        .forEach((futureTank) => {
          const futureKey = normalizeTankName(futureTank.name);
          const futureLevel = normalizeNumber(futureTank.level);

          futureTank.researchParents.forEach((parentReference) => {
            const parentTank = findTechTreeTankByReference(parentReference, tankMap);

            if (!parentTank) {
              return;
            }

            (parentTank.researchTargets || []).forEach((targetReference) => {
              const targetTank = findTechTreeTankByReference(targetReference, tankMap);

              if (!targetTank) {
                return;
              }

              const targetKey = normalizeTankName(targetTank.name);
              const targetLevel = normalizeNumber(targetTank.level);

              if (targetKey === futureKey || targetLevel <= futureLevel) {
                return;
              }

              addTechTreeEdge(futureKey, targetKey, tankMap, children, parents, edges);
            });
          });
        });

      addManualTechTreeEdges(nation, tankMap, children, parents, edges);

      const sortTanks = (firstKey, secondKey) => {
        const first = tankMap.get(firstKey);
        const second = tankMap.get(secondKey);

        return getTechTreeClassOrder(first) - getTechTreeClassOrder(second)
          || normalizeNumber(first.level) - normalizeNumber(second.level)
          || first.id - second.id;
      };

      children.forEach((childKeys) => childKeys.sort(sortTanks));

      const rowByKey = new Map();
      const visiting = new Set();
      let nextRow = 0;

      function assignRow(tankKey) {
        if (rowByKey.has(tankKey)) {
          return rowByKey.get(tankKey);
        }

        if (visiting.has(tankKey)) {
          rowByKey.set(tankKey, nextRow);
          nextRow += 1;
          return rowByKey.get(tankKey);
        }

        visiting.add(tankKey);
        const childRows = (children.get(tankKey) || []).map(assignRow);
        visiting.delete(tankKey);

        if (childRows.length === 0) {
          rowByKey.set(tankKey, nextRow);
          nextRow += 1;
        } else {
          rowByKey.set(tankKey, childRows.reduce((sum, row) => sum + row, 0) / childRows.length);
        }

        return rowByKey.get(tankKey);
      }

      const roots = tanks
        .map((tank) => normalizeTankName(tank.name))
        .filter((tankKey) => parents.get(tankKey).length === 0)
        .sort(sortTanks);

      roots.forEach(assignRow);
      tanks
        .map((tank) => normalizeTankName(tank.name))
        .sort(sortTanks)
        .forEach(assignRow);

      const levelWidth = 180;
      const rowHeight = 86;
      const nodeWidth = 148;
      const nodeHeight = 66;
      const leftPadding = 42;
      const topPadding = 96;
      const positionedTanks = tanks.map((tank) => {
        const level = normalizeNumber(tank.level);
        const row = rowByKey.get(normalizeTankName(tank.name)) || 0;

        return {
          tank,
          key: normalizeTankName(tank.name),
          x: leftPadding + (Math.max(1, level) - 1) * levelWidth,
          y: topPadding + row * rowHeight,
          width: nodeWidth,
          height: nodeHeight
        };
      });

      for (let level = 1; level <= 10; level += 1) {
        positionedTanks
          .filter((item) => normalizeNumber(item.tank.level) === level)
          .sort((first, second) => first.y - second.y || first.tank.id - second.tank.id)
          .forEach((item, index, levelItems) => {
            if (index === 0) {
              return;
            }

            const previous = levelItems[index - 1];
            const minY = previous.y + rowHeight;

            if (item.y < minY) {
              item.y = minY;
            }
          });
      }

      const positionByKey = new Map(positionedTanks.map((item) => [item.key, item]));
      const edgesByGap = new Map();

      edges.forEach((edge) => {
        const from = positionByKey.get(edge.from);
        const to = positionByKey.get(edge.to);

        if (!from || !to) {
          return;
        }

        const gapKey = `${edge.fromLevel}-${normalizeNumber(to.tank.level)}`;
        const list = edgesByGap.get(gapKey) || [];

        list.push({ ...edge, from, to });
        edgesByGap.set(gapKey, list);
      });

      const positionedEdges = [];

      edgesByGap.forEach((list) => {
        list
          .sort((first, second) => Math.min(first.from.y, first.to.y) - Math.min(second.from.y, second.to.y))
          .forEach((edge, index) => {
            const sameLevel = normalizeNumber(edge.from.tank.level) === normalizeNumber(edge.to.tank.level);

            if (sameLevel) {
              const topFirst = edge.from.y <= edge.to.y;
              const x = edge.from.x + nodeWidth / 2;
              const x2 = edge.to.x + nodeWidth / 2;
              const y1 = topFirst ? edge.from.y + nodeHeight : edge.from.y;
              const y2 = topFirst ? edge.to.y : edge.to.y + nodeHeight;
              const laneY = topFirst
                ? Math.min(y2 - 12, y1 + 14 + index * 6)
                : Math.max(y2 + 12, y1 - 14 - index * 6);

              positionedEdges.push({ x1: x, y1, x2, y2, laneY, sameLevel: true });
              return;
            }

            const x1 = edge.from.x + nodeWidth;
            const y1 = edge.from.y + nodeHeight / 2;
            const x2 = edge.to.x;
            const y2 = edge.to.y + nodeHeight / 2;
            const maxLaneX = x2 - 18;
            const laneX = Math.min(maxLaneX, x1 + 20 + index * 10);

            positionedEdges.push({ x1, y1, x2, y2, laneX, sameLevel: false });
          });
      });

      return {
        tanks: positionedTanks,
        edges: positionedEdges,
        width: leftPadding * 2 + levelWidth * 9 + nodeWidth,
        height: Math.max(720, Math.max(0, ...positionedTanks.map((item) => item.y)) + nodeHeight + 40)
      };
    }

    function createTechTreeTabs() {
      const tabs = document.createElement("div");

      tabs.className = "techTreeTabs";
      techTreeNationConfigs.forEach((config) => {
        const button = document.createElement("button");
        const isActive = normalizeTechTreeKey(config.nation) === normalizeTechTreeKey(selectedTechTreeNation);

        button.type = "button";
        button.className = `techTreeTab ${isActive ? "active" : ""}`.trim();
        button.textContent = config.label;
        button.style.backgroundImage = `url("./img/${config.file}.png")`;
        button.addEventListener("click", () => {
          selectedTechTreeNation = config.nation;
          overlayContent.textContent = "";
          renderNationTechTreeScreen();
        });
        tabs.append(button);
      });

      return tabs;
    }

    function renderTechTreeLines(svg, edges) {
      svg.textContent = "";

      edges.forEach((edge) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        path.setAttribute("d", edge.sameLevel
          ? `M ${edge.x1} ${edge.y1} V ${edge.laneY} H ${edge.x2} V ${edge.y2}`
          : `M ${edge.x1} ${edge.y1} H ${edge.laneX} V ${edge.y2} H ${edge.x2}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#000");
        path.setAttribute("stroke-width", "6");
        path.setAttribute("stroke-linecap", "square");
        path.setAttribute("stroke-linejoin", "miter");
        svg.append(path);
      });
    }

    function createTechTreeNode(item) {
      const node = document.createElement("div");
      const price = document.createElement("div");

      node.className = `techTreeNode ${item.tank.futureTank ? "future" : ""}`.trim();
      node.style.left = `${item.x}px`;
      node.style.top = `${item.y}px`;
      price.className = "techTreePrice";
      price.textContent = getResearchPrice(item.tank);
      node.append(
        createTankSlot(item.tank, item.tank.id === selectedTank?.id, () => selectTankFromUpgrade(item.tank)),
        price
      );
      return node;
    }

    function renderNationTechTreeScreen() {
      const config = getTechTreeNationConfig();
      const screen = document.createElement("div");
      const viewport = document.createElement("div");
      const canvas = document.createElement("div");
      const levels = document.createElement("div");
      const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const layout = buildTechTreeLayout(config.nation);

      selectedTechTreeNation = config.nation;
      screen.className = "techTreeScreen";
      screen.style.backgroundImage = `url("./img/${config.file}.png")`;
      viewport.className = "techTreeViewport";
      viewport.style.backgroundImage = `url("./img/${config.file}.png")`;
      canvas.className = "techTreeCanvas";
      canvas.style.width = `${layout.width}px`;
      canvas.style.height = `${layout.height}px`;
      levels.className = "techTreeLevels";
      lines.classList.add("techTreeLines");
      lines.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
      lines.setAttribute("preserveAspectRatio", "none");

      for (let level = 1; level <= 10; level += 1) {
        const levelElement = document.createElement("div");

        levelElement.className = "techTreeLevel";
        levelElement.textContent = toRoman(level);
        levels.append(levelElement);
      }

      if (layout.tanks.length === 0) {
        const message = document.createElement("div");

        message.className = "techTreeEmpty";
        message.textContent = loadedTanks.length <= fallbackTanks.length
          ? "data.csv не загружен"
          : "Для этой нации пока нет ветки прокачки";
        canvas.append(message);
      } else {
        renderTechTreeLines(lines, layout.edges);
        canvas.append(lines, levels);
        layout.tanks.forEach((item) => canvas.append(createTechTreeNode(item)));
      }

      viewport.append(canvas);
      screen.append(createTechTreeTabs(), viewport);
      overlayContent.append(screen);
    }

    function drawUpgradeLines(screen) {
      const svg = screen.querySelector(".upgradeLines");
      const sourceCard = screen.querySelector(".upgradeSource .tankCard");
      const targetCards = [...screen.querySelectorAll(".upgradeTarget .tankCard")];

      svg.textContent = "";

      if (!sourceCard || targetCards.length === 0) {
        return;
      }

      const screenRect = screen.getBoundingClientRect();
      const sourceRect = sourceCard.getBoundingClientRect();
      const sourceX = sourceRect.right - screenRect.left;
      const sourceY = sourceRect.top + sourceRect.height / 2 - screenRect.top;

      targetCards.forEach((targetCard) => {
        const targetRect = targetCard.getBoundingClientRect();
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        line.setAttribute("x1", sourceX);
        line.setAttribute("y1", sourceY);
        line.setAttribute("x2", targetRect.left - screenRect.left);
        line.setAttribute("y2", targetRect.top + targetRect.height / 2 - screenRect.top);
        line.setAttribute("stroke", "#000");
        line.setAttribute("stroke-width", "6");
        line.setAttribute("stroke-linecap", "round");
        svg.append(line);
      });
    }

    function renderUpgradeScreen() {
      const screen = document.createElement("div");
      const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const source = document.createElement("div");
      const targets = document.createElement("div");
      const sourceTank = findLoadedTankByReference(selectedTank);
      const targetTanks = (sourceTank?.researchTargets || [])
        .map(findResearchTarget)
        .filter(Boolean);

      screen.className = "upgradeScreen";
      lines.classList.add("upgradeLines");
      source.className = "upgradeSource";
      targets.className = "upgradeTargets";

      source.append(createTankSlot(sourceTank, true));

      if (targetTanks.length === 0) {
        const message = document.createElement("div");

        message.className = "overlayMessage";
        message.textContent = loadedTanks.length <= fallbackTanks.length
          ? "data.csv не загружен"
          : "Нет доступных улучшений";
        targets.append(message);
      } else {
        targetTanks.forEach((targetTank) => {
          const target = document.createElement("div");
          const price = document.createElement("div");

          target.className = "upgradeTarget";
          price.className = "upgradePrice";
          price.textContent = getResearchPrice(targetTank);
          target.append(
            createTankSlot(targetTank, targetTank.id === selectedTank.id, () => selectTankFromUpgrade(targetTank)),
            price
          );
          targets.append(target);
        });
      }

      screen.append(lines, source, targets);
      overlayContent.append(screen);
      requestAnimationFrame(() => drawUpgradeLines(screen));
    }

