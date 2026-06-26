    function victoryDayEventIsActive(date = new Date()) {
      return date.getMonth() === victoryDayEvent.month
        && date.getDate() >= victoryDayEvent.fromDay
        && date.getDate() <= victoryDayEvent.toDay;
    }

    function victoryDayEventModeIsEligible(mode = selectedBattleMode) {
      return Boolean(mode && victoryDayEvent.modeIds.includes(mode.id));
    }

    function getVictoryDayEventWins() {
      return Math.min(
        victoryDayEvent.requiredWins,
        normalizeNumber(getCookie(victoryDayEvent.progressCookie) || 0)
      );
    }

    function setVictoryDayEventWins(value) {
      setCookie(victoryDayEvent.progressCookie, Math.min(victoryDayEvent.requiredWins, normalizeNumber(value)));
    }

    function victoryDayEventRewardClaimed() {
      return getCookie(victoryDayEvent.claimedCookie) === "1";
    }

    function getVictoryDayRewardTank() {
      return findTankById(victoryDayEvent.rewardTankId);
    }

    function claimVictoryDayEventReward() {
      if (victoryDayEventRewardClaimed()) {
        return false;
      }

      const tank = getVictoryDayRewardTank();

      if (!tank) {
        return false;
      }

      tank.state = 2;
      saveTankState(tank);
      setCookie(victoryDayEvent.claimedCookie, "1");
      selectTank(tank);
      renderTopBar();
      renderTankBar(loadedTanks);
      return true;
    }

    function recordVictoryDayEventProgress(result) {
      if (result !== "victory" || !victoryDayEventIsActive() || !victoryDayEventModeIsEligible()) {
        return;
      }

      const nextProgress = getVictoryDayEventWins() + 1;

      setVictoryDayEventWins(nextProgress);
      if (nextProgress >= victoryDayEvent.requiredWins) {
        claimVictoryDayEventReward();
      }
    }

    function getTodayKey() {
      const now = new Date();

      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function pickDailyTaskTank(seed) {
      const ownedTanks = loadedTanks.filter((tank) => tank.state === 2 && !tank.futureTank);

      return ownedTanks.length > 0 ? ownedTanks[seed % ownedTanks.length] : null;
    }

    function createDailyTaskSet(dateKey = getTodayKey()) {
      const seed = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const taskTank = pickDailyTaskTank(seed);
      const ownedNations = [...new Set(loadedTanks.filter((tank) => tank.state === 2 && tank.nation).map((tank) => tank.nation))];
      const ownedClasses = [...new Set(loadedTanks.filter((tank) => tank.state === 2 && tank.className).map((tank) => tank.className))];
      const nation = ownedNations[seed % Math.max(1, ownedNations.length)] || "СССР";
      const className = ownedClasses[(seed + 1) % Math.max(1, ownedClasses.length)] || "ЛТ";

      return {
        date: dateKey,
        tasks: [
          {
            id: "battle_tank",
            metric: "battles",
            target: 1,
            progress: 0,
            claimed: false,
            title: taskTank ? `Сыграть бой на ${taskTank.name}` : "Сыграть бой",
            tankId: taskTank?.id || null,
            reward: { silver: 1200, experience: 200 }
          },
          {
            id: "damage_nation",
            metric: "damage",
            target: 1500,
            progress: 0,
            claimed: false,
            title: `Нанести 1500 урона на технике ${nation}`,
            nation,
            reward: { silver: 2500, gold: 25 }
          },
          {
            id: "kills_class",
            metric: "kills",
            target: 2,
            progress: 0,
            claimed: false,
            title: `Уничтожить 2 танка на классе ${className}`,
            className,
            reward: { blueprints: 10, silver: 1800 }
          }
        ]
      };
    }

    function loadDailyTasks() {
      const today = getTodayKey();
      const state = normalizeDailyTasks(parseStoredJson(dailyTasksKey, null));

      if (!state || state.date !== today) {
        const nextState = createDailyTaskSet(today);

        saveDailyTasks(nextState);
        return nextState;
      }

      return state;
    }

    function normalizeDailyTasks(state) {
      if (!state || !Array.isArray(state.tasks)) {
        return null;
      }

      return {
        date: String(state.date || ""),
        tasks: state.tasks.map((task) => ({
          ...task,
          progress: normalizeNumber(task.progress || 0),
          target: normalizeNumber(task.target || 1) || 1,
          claimed: task.claimed === true
        }))
      };
    }

    function saveDailyTasks(state) {
      setCookie(dailyTasksKey, JSON.stringify(state));
    }

    function dailyTaskMatchesBattle(task, tank) {
      if (task.tankId && tank?.id !== task.tankId) {
        return false;
      }

      if (task.nation && tank?.nation !== task.nation) {
        return false;
      }

      if (task.className && tank?.className !== task.className) {
        return false;
      }

      return true;
    }

    function recordDailyTaskProgress(result, stats, tank) {
      const state = loadDailyTasks();
      let changed = false;

      state.tasks.forEach((task) => {
        if (task.claimed || task.progress >= task.target || !dailyTaskMatchesBattle(task, tank)) {
          return;
        }

        const increment = task.metric === "battles"
          ? 1
          : task.metric === "wins"
            ? Number(result === "victory")
            : normalizeNumber(stats?.[task.metric] || 0);

        if (increment <= 0) {
          return;
        }

        task.progress = Math.min(task.target, normalizeNumber(task.progress) + increment);
        changed = true;
      });

      if (changed) {
        saveDailyTasks(state);
      }
    }

    function getDailyRewardState() {
      return parseStoredJson(dailyRewardKey, { date: "", streak: 0 });
    }

    function getDailyRewardTank(streak) {
      const tankPool = getContainerTankPool();

      if (tankPool.length === 0 || streak % 7 !== 0) {
        return null;
      }

      return tankPool[streak % tankPool.length];
    }

    function getDailyRewardPreview(streak) {
      const nextStreak = normalizeNumber(streak) + 1;
      const tank = getDailyRewardTank(nextStreak);
      const parts = [
        `${formatStoredNumber(2500 + Math.min(7, nextStreak) * 500)} серебра`,
        `${formatStoredNumber(nextStreak % 7 === 0 ? 150 : 50)} золота`,
        `${formatStoredNumber(5 + Math.min(10, nextStreak))} чертежей`
      ];

      if (tank) {
        parts.push(`${tank.name} или компенсация ${formatStoredNumber(duplicateTankGoldReward)} золота`);
      }

      return parts.join(", ");
    }

    function claimDailyReward() {
      const today = getTodayKey();
      const state = getDailyRewardState();

      if (state.date === today) {
        return false;
      }

      const streak = normalizeNumber(state.streak) + 1;
      const reward = {
        silver: 2500 + Math.min(7, streak) * 500,
        gold: streak % 7 === 0 ? 150 : 50,
        blueprints: 5 + Math.min(10, streak)
      };
      const rewardTank = getDailyRewardTank(streak);
      let lastRewardText = getDailyRewardPreview(normalizeNumber(state.streak));

      playerResources.silver += reward.silver;
      playerResources.gold += reward.gold;
      playerResources.blueprints += reward.blueprints;

      if (rewardTank) {
        const wasOwned = rewardTank.state === 2;

        rewardTank.state = 2;
        saveTankState(rewardTank);
        selectedTank = rewardTank;
        if (wasOwned) {
          playerResources.gold += duplicateTankGoldReward;
          lastRewardText += `; дубль ${rewardTank.name}: +${formatStoredNumber(duplicateTankGoldReward)} золота`;
        } else {
          lastRewardText += `; новый танк: ${rewardTank.name}`;
        }
      }

      savePlayerResources();
      setCookie(dailyRewardKey, JSON.stringify({ date: today, streak, lastRewardText }));
      refreshSelectedTank();
      renderTopBar();
      renderTankBar(loadedTanks);
      renderEventsScreen();
      showGameNotification("Ежедневная награда получена", "success");
      return true;
    }

    function claimDailyTask(taskId) {
      const state = loadDailyTasks();
      const task = state.tasks.find((item) => item.id === taskId);

      if (!task || task.claimed || task.progress < task.target) {
        return false;
      }

      Object.entries(task.reward || {}).forEach(([resource, amount]) => {
        if (resource in playerResources) {
          playerResources[resource] += normalizeNumber(amount);
        }

        if (resource === "experience" && selectedTank) {
          selectedTank.experience = toEightDigits(normalizeNumber(selectedTank.experience) + normalizeNumber(amount));
          saveTankExperience(selectedTank);
        }
      });
      task.claimed = true;
      savePlayerResources();
      saveDailyTasks(state);
      renderTopBar();
      renderEventsScreen();
      showGameNotification(`Задание выполнено: ${task.title}`, "success");
      return true;
    }

    function getMonthKey(date = new Date()) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    function getMonthDay(date = new Date()) {
      return date.getDate();
    }

    function getBattlePassTask(day) {
      const variants = [
        { metric: "battles", target: 1, title: "Сыграть 1 бой" },
        { metric: "damage", target: 1800, title: "Нанести 1800 урона" },
        { metric: "kills", target: 2, title: "Уничтожить 2 танка" },
        { metric: "hits", target: 6, title: "Попасть 6 раз" },
        { metric: "wins", target: 1, title: "Победить 1 раз" },
        { metric: "baseCapture", target: 60, title: "Набрать 60% захвата" },
        { metric: "roleBonus", target: 120, title: "Заработать 120 ролевого опыта" }
      ];

      return {
        day,
        ...variants[(day - 1) % variants.length],
        progress: 0,
        claimed: false
      };
    }

    function createBattlePassState(monthKey = getMonthKey()) {
      return {
        month: monthKey,
        branchNation: "",
        branchTankId: 0,
        lastClaimDate: "",
        finalClaimed: false,
        tasks: Array.from({ length: 31 }, (_, index) => getBattlePassTask(index + 1))
      };
    }

    function normalizeBattlePassState(state) {
      if (!state || state.month !== getMonthKey() || !Array.isArray(state.tasks)) {
        return createBattlePassState();
      }

      const fresh = createBattlePassState(state.month);

      fresh.branchNation = String(state.branchNation || "");
      fresh.branchTankId = normalizeNumber(state.branchTankId || 0);
      fresh.lastClaimDate = String(state.lastClaimDate || "");
      fresh.finalClaimed = state.finalClaimed === true;
      fresh.tasks = fresh.tasks.map((task) => {
        const stored = state.tasks.find((item) => normalizeNumber(item.day) === task.day) || {};

        return {
          ...task,
          progress: Math.min(task.target, normalizeNumber(stored.progress || 0)),
          claimed: stored.claimed === true
        };
      });
      return fresh;
    }

    function loadBattlePassState() {
      const state = normalizeBattlePassState(parseStoredJson(battlePassKey, null));

      saveBattlePassState(state);
      return state;
    }

    function saveBattlePassState(state) {
      setCookie(battlePassKey, JSON.stringify(state));
    }

    function getBattlePassActiveDay(state, date = new Date()) {
      const todayKey = getTodayKey();
      const today = Math.min(31, date.getDate());
      const nextTask = state.tasks.find((task) => !task.claimed);

      if (!nextTask || nextTask.day > today || state.lastClaimDate === todayKey) {
        return 0;
      }

      return nextTask.day;
    }

    function getMetricIncrement(metric, result, stats) {
      if (metric === "battles") {
        return 1;
      }

      if (metric === "wins") {
        return Number(result === "victory");
      }

      return normalizeNumber(stats?.[metric] || 0);
    }

    function recordBattlePassProgress(result, stats) {
      const state = loadBattlePassState();
      const activeDay = getBattlePassActiveDay(state);
      const task = state.tasks.find((item) => item.day === activeDay);
      const increment = task && !task.claimed ? getMetricIncrement(task.metric, result, stats) : 0;

      if (!task || task.claimed || increment <= 0) {
        return;
      }

      task.progress = Math.min(task.target, normalizeNumber(task.progress) + increment);
      saveBattlePassState(state);
      if (task.progress >= task.target) {
        showGameNotification(`Боевой пропуск: день ${task.day} выполнен`, "success");
      }
    }

    function claimBattlePassDay(day) {
      const state = loadBattlePassState();
      const task = state.tasks.find((item) => item.day === day);
      const activeDay = getBattlePassActiveDay(state);

      if (!task || task.day !== activeDay || task.claimed || task.progress < task.target) {
        return false;
      }

      playerResources.silver += 1200 + day * 120;
      playerResources.blueprints += 3 + Math.ceil(day / 4);
      if (day % 7 === 0) {
        playerResources.gold += 50;
      }
      task.claimed = true;
      state.lastClaimDate = getTodayKey();
      savePlayerResources();
      saveBattlePassState(state);
      renderTopBar();
      renderEventsScreen();
      showGameNotification(`Награда боевого пропуска за день ${day} получена`, "success");
      return true;
    }

    function getBattlePassFinalRewardTanks() {
      return loadedTanks
        .filter((tank) => !tank.futureTank && tank.techTreeEligible && normalizeNumber(tank.level) === 10)
        .sort((first, second) => (
          String(first.nation || "").localeCompare(String(second.nation || ""), "ru")
          || String(first.className || "").localeCompare(String(second.className || ""), "ru")
          || first.name.localeCompare(second.name, "ru")
        ));
    }

    function tankResearchesTarget(sourceTank, targetTank) {
      return (sourceTank?.researchTargets || [])
        .map(findResearchTarget)
        .some((tank) => tank?.id === targetTank.id);
    }

    function getBattlePassBranchTanks(targetTank) {
      const branch = new Map();
      const visit = (tank) => {
        const currentTank = findLoadedTankByReference(tank);

        if (!currentTank || branch.has(currentTank.id)) {
          return;
        }

        branch.set(currentTank.id, currentTank);
        loadedTanks
          .filter((candidate) => !candidate.futureTank && candidate.techTreeEligible && tankResearchesTarget(candidate, currentTank))
          .forEach(visit);
      };

      visit(targetTank);
      return [...branch.values()]
        .sort((first, second) => normalizeNumber(first.level) - normalizeNumber(second.level) || first.id - second.id);
    }

    function getSelectedBattlePassFinalTank(state) {
      const rewardTanks = getBattlePassFinalRewardTanks();

      return rewardTanks.find((tank) => tank.id === state.branchTankId) || rewardTanks[0] || null;
    }

    function claimBattlePassFinalReward() {
      const state = loadBattlePassState();
      const complete = state.tasks.every((task) => task.claimed);
      const targetTank = getSelectedBattlePassFinalTank(state);
      const branchTanks = targetTank ? getBattlePassBranchTanks(targetTank) : [];

      if (!complete || state.finalClaimed || !targetTank || branchTanks.length === 0) {
        return false;
      }

      branchTanks.forEach((tank) => {
        tank.state = 2;
        saveTankState(tank);
      });
      state.finalClaimed = true;
      state.branchTankId = targetTank.id;
      state.branchNation = targetTank.nation || "";
      saveBattlePassState(state);
      refreshSelectedTank();
      renderTopBar();
      renderTankBar(loadedTanks);
      renderEventsScreen();
      showGameNotification(`Ветка до ${targetTank.name} полностью открыта`, "success");
      return true;
    }

    function createBattlePassPanel() {
      const state = loadBattlePassState();
      const today = Math.min(31, getMonthDay());
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const text = document.createElement("div");
      const grid = document.createElement("div");
      const actions = document.createElement("div");
      const select = document.createElement("select");
      const finalButton = document.createElement("button");
      const completeCount = state.tasks.filter((task) => task.claimed).length;
      const activeDay = getBattlePassActiveDay(state);
      const finalRewardTanks = getBattlePassFinalRewardTanks();
      const selectedFinalTank = getSelectedBattlePassFinalTank(state);
      const selectedBranchTanks = selectedFinalTank ? getBattlePassBranchTanks(selectedFinalTank) : [];

      panel.className = "dailyPanel dailyWide";
      title.className = "dailyTitle";
      text.className = "dailyText";
      grid.className = "battlePassGrid";
      actions.className = "battlePassActions";
      select.className = "compareSelect";
      finalButton.className = "dailyButton";
      finalButton.type = "button";
      title.textContent = "Боевой пропуск месяца";
      text.textContent = `31 последовательное задание. Выполнено и забрано: ${completeCount} / 31. Если пропустить день, следующий доступный день пропуска остаётся в очереди. Финал: открывается выбранная ветка до X уровня.`;
      finalRewardTanks.forEach((tank) => {
        const option = document.createElement("option");
        const branchTanks = getBattlePassBranchTanks(tank);

        option.value = String(tank.id);
        option.textContent = `${tank.name} | ${tank.nation || "-"} | ${tank.className || "-"} | ${branchTanks.length} танков`;
        select.append(option);
      });
      select.value = selectedFinalTank ? String(selectedFinalTank.id) : select.value;
      select.addEventListener("change", () => {
        state.branchTankId = normalizeNumber(select.value);
        state.branchNation = findTankById(state.branchTankId)?.nation || "";
        saveBattlePassState(state);
        renderEventsScreen();
      });
      state.tasks.forEach((task) => {
        const item = document.createElement("div");
        const claimButton = document.createElement("button");
        const futureLocked = task.day > today;
        const queueLocked = !task.claimed && task.day !== activeDay;
        const locked = futureLocked || queueLocked;
        const statusText = task.claimed
          ? ""
          : futureLocked
            ? " | откроется позже"
            : task.day === activeDay
              ? " | доступно сегодня"
              : " | ждёт очереди";

        item.className = `battlePassDay ${task.claimed ? "done" : ""} ${locked ? "locked" : ""}`.trim();
        claimButton.type = "button";
        claimButton.className = "dailyButton";
        claimButton.textContent = task.claimed ? "Получено" : "Забрать";
        claimButton.disabled = locked || task.claimed || task.progress < task.target;
        claimButton.addEventListener("click", () => claimBattlePassDay(task.day));
        item.append(
          document.createTextNode(`День ${task.day}: ${task.title}`),
          Object.assign(document.createElement("div"), {
            className: "battlePassMeta",
            textContent: `${formatStoredNumber(task.progress)} / ${formatStoredNumber(task.target)}${statusText}`
          }),
          claimButton
        );
        grid.append(item);
      });
      finalButton.textContent = state.finalClaimed ? "Финал получен" : "Получить ветку";
      finalButton.disabled = state.finalClaimed || !state.tasks.every((task) => task.claimed);
      finalButton.addEventListener("click", claimBattlePassFinalReward);
      actions.append(select, finalButton);
      if (selectedBranchTanks.length > 0) {
        actions.append(Object.assign(document.createElement("div"), {
          className: "battlePassMeta",
          textContent: `Будет открыто: ${selectedBranchTanks.map((tank) => tank.name).join(" -> ")}`
        }));
      }
      panel.append(title, text, grid, actions);
      return panel;
    }

    function createContractsState() {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      return {
        createdAt: now,
        contracts: [
          { id: "blueprints", title: "Контракт на чертежи", metric: "damage", target: 12000, progress: 0, reward: { blueprints: 120 }, expiresAt: now + dayMs * 3, claimed: false },
          { id: "gold", title: "Контракт на золото", metric: "wins", target: 8, progress: 0, reward: { gold: 350 }, expiresAt: now + dayMs * 5, claimed: false },
          { id: "silver", title: "Контракт на серебро", metric: "battles", target: 15, progress: 0, reward: { silver: 55000 }, expiresAt: now + dayMs * 4, claimed: false },
          { id: "tank", title: "Сложный контракт на танк", metric: "roleBonus", target: 3000, progress: 0, reward: { tank: true }, expiresAt: now + dayMs * 10, claimed: false }
        ]
      };
    }

    function normalizeContractsState(state) {
      const now = Date.now();

      if (!state || !Array.isArray(state.contracts) || normalizeNumber(state.createdAt || 0) + 10 * 24 * 60 * 60 * 1000 < now) {
        return createContractsState();
      }

      const fresh = createContractsState();

      fresh.createdAt = normalizeNumber(state.createdAt || now);
      fresh.contracts = fresh.contracts.map((contract) => {
        const stored = state.contracts.find((item) => item.id === contract.id) || {};

        return {
          ...contract,
          progress: Math.min(contract.target, normalizeNumber(stored.progress || 0)),
          expiresAt: normalizeNumber(stored.expiresAt || contract.expiresAt),
          claimed: stored.claimed === true
        };
      });
      return fresh;
    }

    function loadContractsState() {
      const state = normalizeContractsState(parseStoredJson(contractsKey, null));

      saveContractsState(state);
      return state;
    }

    function saveContractsState(state) {
      setCookie(contractsKey, JSON.stringify(state));
    }

    function recordContractProgress(result, stats) {
      const state = loadContractsState();
      const now = Date.now();
      let changed = false;

      state.contracts.forEach((contract) => {
        if (contract.claimed || contract.expiresAt <= now || contract.progress >= contract.target) {
          return;
        }

        const increment = getMetricIncrement(contract.metric, result, stats);

        if (increment <= 0) {
          return;
        }

        contract.progress = Math.min(contract.target, normalizeNumber(contract.progress) + increment);
        changed = true;
        if (contract.progress >= contract.target) {
          showGameNotification(`${contract.title} выполнен`, "success");
        }
      });

      if (changed) {
        saveContractsState(state);
      }
    }

    function getContractRewardText(contract) {
      if (contract.reward.tank) {
        return "случайный премиум-танк или компенсация";
      }

      return Object.entries(contract.reward)
        .map(([resource, amount]) => `${formatStoredNumber(amount)} ${resource === "gold" ? "золота" : resource === "silver" ? "серебра" : "чертежей"}`)
        .join(", ");
    }

    function claimContract(contractId) {
      const state = loadContractsState();
      const contract = state.contracts.find((item) => item.id === contractId);

      if (!contract || contract.claimed || contract.progress < contract.target || contract.expiresAt <= Date.now()) {
        return false;
      }

      if (contract.reward.tank) {
        const tank = pickRandomItem(getPremiumStoreTanks()) || loadedTanks.find((item) => !item.futureTank && !item.techTreeEligible);

        if (tank) {
          const wasOwned = tank.state === 2;

          tank.state = 2;
          saveTankState(tank);
          selectedTank = tank;
          if (wasOwned) {
            playerResources.gold += duplicateTankGoldReward;
          }
        }
      } else {
        Object.entries(contract.reward).forEach(([resource, amount]) => {
          playerResources[resource] += normalizeNumber(amount);
        });
      }

      contract.claimed = true;
      savePlayerResources();
      saveContractsState(state);
      refreshSelectedTank();
      renderTopBar();
      renderTankBar(loadedTanks);
      renderEventsScreen();
      showGameNotification(`${contract.title}: награда получена`, "success");
      return true;
    }

    function createContractsPanel() {
      const state = loadContractsState();
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const text = document.createElement("div");
      const grid = document.createElement("div");
      const now = Date.now();

      panel.className = "dailyPanel dailyWide";
      title.className = "dailyTitle";
      text.className = "dailyText";
      grid.className = "contractsGrid";
      title.textContent = "Контракты";
      text.textContent = "Ограниченные по времени задачи на чертежи, золото, серебро и сложный контракт на танк.";
      state.contracts.forEach((contract) => {
        const card = document.createElement("div");
        const button = document.createElement("button");
        const expired = contract.expiresAt <= now;
        const hoursLeft = Math.max(0, Math.ceil((contract.expiresAt - now) / (60 * 60 * 1000)));

        card.className = `contractCard ${contract.claimed ? "done" : ""} ${expired ? "expired" : ""}`.trim();
        button.type = "button";
        button.className = "dailyButton";
        button.textContent = contract.claimed ? "Получено" : expired ? "Истёк" : "Забрать";
        button.disabled = contract.claimed || expired || contract.progress < contract.target;
        button.addEventListener("click", () => claimContract(contract.id));
        card.append(
          document.createTextNode(contract.title),
          Object.assign(document.createElement("div"), {
            className: "contractMeta",
            textContent: `${formatStoredNumber(contract.progress)} / ${formatStoredNumber(contract.target)} | ${getContractRewardText(contract)} | ${hoursLeft} ч.`
          }),
          button
        );
        grid.append(card);
      });
      panel.append(title, text, grid);
      return panel;
    }

    function createDailyRewardPanel() {
      const state = getDailyRewardState();
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const text = document.createElement("div");
      const button = document.createElement("button");
      const claimed = state.date === getTodayKey();

      panel.className = "dailyPanel";
      title.className = "dailyTitle";
      text.className = "dailyText";
      button.className = "dailyButton";
      button.type = "button";
      title.textContent = "Ежедневная награда";
      text.textContent = claimed
        ? `Серия входов: ${formatStoredNumber(state.streak || 0)}. Сегодня получено: ${state.lastRewardText || "серебро, золото и чертежи"}.`
        : `Серия входов: ${formatStoredNumber(state.streak || 0)}. Сегодня: ${getDailyRewardPreview(state.streak || 0)}.`;
      button.textContent = claimed ? "Получено сегодня" : "Получить";
      button.disabled = claimed;
      button.addEventListener("click", claimDailyReward);
      panel.append(title, text, button);
      return panel;
    }

    function createDailyTaskPanel() {
      const state = loadDailyTasks();
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const rewardLabels = {
        silver: "серебра",
        gold: "золота",
        blueprints: "чертежей",
        experience: "опыта"
      };

      panel.className = "dailyPanel dailyWide";
      title.className = "dailyTitle";
      title.textContent = "Ежедневные задания";
      panel.append(title);
      state.tasks.forEach((task) => {
        const row = document.createElement("div");
        const info = document.createElement("div");
        const progress = document.createElement("div");
        const button = document.createElement("button");
        const rewardText = Object.entries(task.reward || {})
          .map(([resource, amount]) => `${formatStoredNumber(amount)} ${rewardLabels[resource] || resource}`)
          .join(", ");

        row.className = "dailyTask";
        info.className = "dailyTaskInfo";
        progress.className = "dailyTaskProgress";
        button.className = "dailyButton";
        button.type = "button";
        info.textContent = task.title;
        progress.textContent = `${formatStoredNumber(task.progress)} / ${formatStoredNumber(task.target)} | ${rewardText}`;
        button.textContent = task.claimed ? "Получено" : "Забрать";
        button.disabled = task.claimed || task.progress < task.target;
        button.addEventListener("click", () => claimDailyTask(task.id));
        row.append(info, progress, button);
        panel.append(row);
      });
      return panel;
    }

    function renderEventsScreen() {
      const progress = getVictoryDayEventWins();
      const completed = progress >= victoryDayEvent.requiredWins;
      const claimed = completed ? claimVictoryDayEventReward() || victoryDayEventRewardClaimed() : victoryDayEventRewardClaimed();
      const screen = document.createElement("div");
      const eventPanel = document.createElement("section");
      const eventTitle = document.createElement("div");
      const eventText = document.createElement("div");

      overlayContent.textContent = "";
      screen.className = "dailyScreen";
      eventPanel.className = "dailyPanel dailyWide";
      eventTitle.className = "dailyTitle";
      eventText.className = "dailyText";
      eventTitle.textContent = "Ивент к 9 Мая: 7-15 мая";
      eventText.textContent = `Победы в режимах «Охота на командира» и «Война»: ${Math.min(progress, victoryDayEvent.requiredWins)} / ${victoryDayEvent.requiredWins}. Награда: Т-34 блокадный${claimed || completed ? " - получен" : ""}.`;
      eventPanel.append(eventTitle, eventText);
      screen.append(createDailyRewardPanel(), createDailyTaskPanel(), createBattlePassPanel(), createContractsPanel(), eventPanel);
      overlayContent.append(screen);
    }

    function getContainerTankPool() {
      return loadedTanks.filter((tank) => tank.containerEligible);
    }

    function getPremiumStoreTanks() {
      return loadedTanks.filter((tank) => tank.premium);
    }

    function rerenderStoreScreen() {
      overlayContent.textContent = "";
      renderStoreScreen();
      renderTopBar();
      renderTankBar(loadedTanks);
    }

    function buyPremiumTank(tank, currency, button) {
      const goldPrice = 5000;
      const blueprintPrice = 500;
      const price = currency === "blueprints" ? blueprintPrice : goldPrice;

      if (!tank || tank.state === 2) {
        return;
      }

      if (playerResources[currency] < price) {
        button.textContent = currency === "blueprints"
          ? "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439"
          : "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043e\u043b\u043e\u0442\u0430";
        window.setTimeout(rerenderStoreScreen, 900);
        return;
      }

      playerResources[currency] -= price;
      tank.state = 2;
      selectedTank = tank;
      savePlayerResources();
      saveTankState(tank);
      rerenderStoreScreen();
    }

    function createPremiumStoreItem(tank) {
      const item = document.createElement("article");
      const details = document.createElement("div");
      const name = document.createElement("div");
      const meta = document.createElement("div");
      const actions = document.createElement("div");
      const goldButton = document.createElement("button");
      const blueprintButton = document.createElement("button");
      const owned = tank.state === 2;

      item.className = "premiumStoreItem";
      details.className = "premiumStoreDetails";
      name.className = "premiumStoreName";
      meta.className = "premiumStoreMeta";
      actions.className = "premiumStoreActions";
      goldButton.type = "button";
      blueprintButton.type = "button";
      goldButton.className = "storeActionButton premiumStoreButton";
      blueprintButton.className = "storeActionButton premiumStoreButton";
      name.textContent = tank.name;
      meta.textContent = `${toRoman(tank.level)} \u0443\u0440\u043e\u0432\u0435\u043d\u044c | ${tank.className || "-"} | ${tank.nation || "-"}`;
      goldButton.textContent = owned ? "\u0412 \u0430\u043d\u0433\u0430\u0440\u0435" : "\u041a\u0443\u043f\u0438\u0442\u044c: 5 000 \u0437\u043e\u043b\u043e\u0442\u0430";
      blueprintButton.textContent = owned ? "\u041f\u043e\u043b\u0443\u0447\u0435\u043d" : "\u041a\u0443\u043f\u0438\u0442\u044c: 500 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439";
      goldButton.disabled = owned || playerResources.gold < 5000;
      blueprintButton.disabled = owned || playerResources.blueprints < 500;
      goldButton.addEventListener("click", () => buyPremiumTank(tank, "gold", goldButton));
      blueprintButton.addEventListener("click", () => buyPremiumTank(tank, "blueprints", blueprintButton));
      details.append(name, meta);
      actions.append(goldButton, blueprintButton);
      item.append(createTankSlot(tank, tank.id === selectedTank?.id, () => {}), details, actions);
      return item;
    }

    function createPremiumStorePanel() {
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const text = document.createElement("div");
      const list = document.createElement("div");
      const premiumTanks = getPremiumStoreTanks();

      panel.className = "storePanel premiumStorePanel";
      title.className = "storeTitle";
      text.className = "storeText";
      list.className = "premiumStoreList";
      title.textContent = "\u041f\u0440\u0435\u043c\u0438\u0443\u043c \u0442\u0430\u043d\u043a\u0438";
      text.textContent = "\u0412\u0441\u0435 \u0442\u0430\u043d\u043a\u0438 \u0441 AD=2. \u0426\u0435\u043d\u0430: 5 000 \u0437\u043e\u043b\u043e\u0442\u0430 \u0438\u043b\u0438 500 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439.";
      panel.append(title, text);

      if (premiumTanks.length === 0) {
        const empty = document.createElement("div");

        empty.className = "storeText";
        empty.textContent = "\u041f\u0440\u0435\u043c\u0438\u0443\u043c \u0442\u0430\u043d\u043a\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.";
        panel.append(empty);
        return panel;
      }

      premiumTanks
        .sort((first, second) => normalizeNumber(first.level) - normalizeNumber(second.level) || first.id - second.id)
        .forEach((tank) => list.append(createPremiumStoreItem(tank)));
      panel.append(list);
      return panel;
    }

    function pickRandomItem(items) {
      return items[Math.floor(Math.random() * items.length)] || null;
    }

    function createContainerResourceReward() {
      if (Math.random() < 0.5) {
        return {
          type: "gold",
          amount: 50 + Math.floor(Math.random() * 4) * 25
        };
      }

      return {
        type: "blueprints",
        amount: 5 + Math.floor(Math.random() * 6) * 5
      };
    }

    function getRewardTitle(reward) {
      if (reward.type === "tank") {
        return reward.wasOwned ? "\u0422\u0430\u043d\u043a \u0443\u0436\u0435 \u0432 \u0430\u043d\u0433\u0430\u0440\u0435" : "\u041d\u043e\u0432\u044b\u0439 \u0442\u0430\u043d\u043a";
      }

      return reward.type === "gold" ? "\u0417\u043e\u043b\u043e\u0442\u043e" : "\u0427\u0435\u0440\u0442\u0435\u0436\u0438";
    }

    function getRewardValue(reward) {
      if (reward.type === "tank") {
        const compensation = reward.compensationGold
          ? `, \u043a\u043e\u043c\u043f\u0435\u043d\u0441\u0430\u0446\u0438\u044f +${formatStoredNumber(reward.compensationGold)} \u0437\u043e\u043b\u043e\u0442\u0430`
          : "";

        return `${toRoman(reward.tank.level)} ${reward.tank.name}${compensation}`;
      }

      return `+${formatStoredNumber(reward.amount)}`;
    }

    function createStoreContainerScene(opening = false) {
      const scene = document.createElement("div");
      const container = document.createElement("div");
      const faceNames = ["Front", "Back", "Right", "Left", "Bottom"];
      const lid = document.createElement("div");
      const glow = document.createElement("div");

      scene.className = `storeContainerScene ${opening ? "opening" : ""}`.trim();
      container.className = "storeContainer3d";
      faceNames.forEach((faceName) => {
        const face = document.createElement("div");

        face.className = `storeContainerFace storeContainer${faceName}`;
        container.append(face);
      });
      lid.className = "storeContainerLid";
      glow.className = "storeContainerGlow";
      container.append(lid, glow);
      scene.append(container);

      for (let index = 0; index < 18; index += 1) {
        const particle = document.createElement("div");
        const angle = (Math.PI * 2 * index) / 18;
        const distance = 72 + index % 5 * 15;

        particle.className = "storeContainerParticle";
        particle.style.setProperty("--particle-index", index);
        particle.style.setProperty("--particle-x", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--particle-y", `${Math.sin(angle) * distance - 76}px`);
        scene.append(particle);
      }

      return scene;
    }

    function showContainerOpeningScene() {
      const openingOverlay = document.createElement("section");

      openingOverlay.className = "containerOpeningOverlay";
      openingOverlay.setAttribute("aria-hidden", "true");
      openingOverlay.append(createStoreContainerScene(true));
      game.append(openingOverlay);
      return openingOverlay;
    }

    function showContainerOpeningReward(openingOverlay, reward, onClose) {
      const rewards = Array.isArray(reward) ? reward : [reward];
      const rewardElement = document.createElement("div");
      const title = document.createElement("div");
      const value = document.createElement("div");
      const continueButton = document.createElement("button");

      rewardElement.className = "containerOpeningReward";
      title.className = "containerOpeningRewardTitle";
      value.className = "containerOpeningRewardValue";
      continueButton.type = "button";
      continueButton.className = "containerOpeningContinue";
      continueButton.textContent = "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c";

      if (rewards.length > 1) {
        title.textContent = "\u041f\u0440\u0438\u0437\u044b \u043a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440\u0430";
        rewardElement.append(title);
        rewards.forEach((item) => {
          const itemValue = document.createElement("div");

          itemValue.className = "containerOpeningRewardValue";
          itemValue.textContent = `${getRewardTitle(item)}: ${getRewardValue(item)}`;
          rewardElement.append(itemValue);
        });
        rewardElement.append(continueButton);
      } else if (reward.type === "tank") {
        const tank = reward.tank;

        title.textContent = getRewardTitle(reward);
        value.textContent = getRewardValue(reward);
        rewardElement.append(title, createTankSlot(tank, true, () => {}), value, continueButton);
      } else {
        title.textContent = getRewardTitle(reward);
        value.textContent = getRewardValue(reward);
        rewardElement.append(title, value, continueButton);
      }

      continueButton.addEventListener("click", () => {
        openingOverlay.remove();
        onClose();
      });
      openingOverlay.append(rewardElement);
    }

    function renderStoreReward(panel, reward) {
      const rewards = Array.isArray(reward) ? reward : [reward];

      panel.textContent = "";

      const title = document.createElement("div");
      const value = document.createElement("div");

      panel.className = "storePanel storeReward";
      title.className = "storeRewardTitle";
      value.className = "storeRewardValue";

      if (!reward) {
        title.textContent = "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u0433\u043e\u0442\u043e\u0432";
        value.textContent = `\u0426\u0435\u043d\u0430: ${formatStoredNumber(containerGoldPrice)} \u0437\u043e\u043b\u043e\u0442\u0430`;
        panel.append(createStoreContainerScene(false), title, value);
        return;
      }

      if (reward.type === "error") {
        title.textContent = "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043e\u043b\u043e\u0442\u0430";
        value.textContent = `\u041d\u0443\u0436\u043d\u043e ${formatStoredNumber(containerGoldPrice)}, \u0441\u0435\u0439\u0447\u0430\u0441 ${formatStoredNumber(playerResources.gold)}.`;
        panel.append(title, value);
        return;
      }

      if (Array.isArray(reward)) {
        title.textContent = "\u041f\u0440\u0438\u0437\u044b \u043a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440\u0430";
        panel.append(title);
        rewards.forEach((item) => {
          const itemValue = document.createElement("div");

          itemValue.className = "storeRewardValue";
          itemValue.textContent = `${getRewardTitle(item)}: ${getRewardValue(item)}`;
          panel.append(itemValue);
        });
        return;
      }

      if (reward.type === "tank") {
        const tank = reward.tank;

        title.textContent = getRewardTitle(reward);
        value.textContent = getRewardValue(reward);
        panel.append(title, createTankSlot(tank, true, () => {}), value);
        return;
      }

      title.textContent = getRewardTitle(reward);
      value.textContent = getRewardValue(reward);
      panel.append(title, value);
    }

    function openContainer(button) {
      if (playerResources.gold < containerGoldPrice) {
        button.textContent = "\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0437\u043e\u043b\u043e\u0442\u0430";
        window.setTimeout(() => {
          button.textContent = `\u041e\u0442\u043a\u0440\u044b\u0442\u044c: ${formatStoredNumber(containerGoldPrice)} \u0437\u043e\u043b\u043e\u0442\u0430`;
        }, 900);
        return;
      }

      const tankPool = getContainerTankPool();
      const roll = Math.random();
      let reward = null;

      button.disabled = true;
      playerResources.gold -= containerGoldPrice;
      savePlayerResources();
      renderTopBar();
      const openingOverlay = showContainerOpeningScene();

      if (tankPool.length > 0 && roll < containerTankDropChance) {
        const tank = pickRandomItem(tankPool);
        const wasOwned = tank.state === 2;
        const compensationGold = wasOwned ? duplicateTankGoldReward : 0;

        tank.state = 2;
        saveTankState(tank);
        selectedTank = tank;
        playerResources.gold += compensationGold;
        reward = { type: "tank", tank, wasOwned, compensationGold };
      } else {
        reward = Array.from({ length: containerPrizeCount }, createContainerResourceReward);

        reward.forEach((item) => {
          if (item.type === "gold") {
            playerResources.gold += item.amount;
          } else if (item.type === "blueprints") {
            playerResources.blueprints += item.amount;
          }
        });
      }

      window.setTimeout(() => {
        savePlayerResources();
        refreshSelectedTank();
        renderTopBar();
        renderTankBar(loadedTanks);
        showContainerOpeningReward(openingOverlay, reward, () => {
          button.disabled = playerResources.gold < containerGoldPrice;
        });
      }, 1450);
    }

    function initTabActivityCheck() {
      if (tabActivityCheckInitialized) {
        return;
      }

      tabActivityCheckInitialized = true;

      document.addEventListener("visibilitychange", handleVisibilityChange);
      document.addEventListener("focus", () => updateStatus(true));
      document.addEventListener("blur", () => updateStatus(false));

      function handleVisibilityChange() {
        updateStatus(!document.hidden);
      }

      function updateStatus(active) {
        if (active && window.ysdk) {
          window.ysdk.features.LoadingAPI?.ready();
        }

        console.log("\u0421\u0442\u0430\u0442\u0443\u0441 \u0432\u043a\u043b\u0430\u0434\u043a\u0438:", active ? "\u0410\u043a\u0442\u0438\u0432\u043d\u0430" : "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u0430");
      }

      updateStatus(!document.hidden);
    }

    function isYandexGamesServer() {
      const host = window.location.hostname.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const referrer = document.referrer.toLowerCase();
      const hasGamesPath = host.startsWith("games.") || path.includes("/games") || referrer.includes("/games");
      const hasYandexReferrer = referrer.includes("://yandex.") || referrer.includes(".yandex.");

      if (yandexGamesHostPattern.test(host) && hasGamesPath) {
        return true;
      }

      if (yandexGamesAssetHostPattern.test(host) && hasYandexReferrer && hasGamesPath) {
        return true;
      }

      return Boolean(window.YaGames);
    }

    function initializeYandexGamesSdk() {
      if (!isYandexGamesServer()) {
        console.log("Yandex Games SDK initialization skipped: not a Yandex Games server.");
        return Promise.resolve(null);
      }

      if (yandexSdkPromise) {
        return yandexSdkPromise;
      }

      yandexSdkPromise = new Promise((resolve, reject) => {
        const initSdk = () => {
          if (!window.YaGames) {
            reject(new Error("Yandex Games SDK is unavailable."));
            return;
          }

          window.YaGames
            .init()
            .then((ysdk) => {
              console.log("Yandex SDK initialized");
              window.ysdk = ysdk;
              window.lang = ysdk.environment.i18n.lang;
              initTabActivityCheck();
              resolve(ysdk);
            })
            .catch(reject);
        };

        if (window.YaGames) {
          initSdk();
          return;
        }

        const script = document.createElement("script");

        script.src = "/sdk.js";
        script.async = true;
        script.onload = initSdk;
        script.onerror = () => reject(new Error("Could not load Yandex Games SDK."));
        document.head.append(script);
      });

      yandexSdkPromise.catch((error) => {
        yandexSdkPromise = null;
        console.error(error);
      });
      return yandexSdkPromise;
    }

    function showRewardedGoldAd(button) {
      button.disabled = true;
      button.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u044b...";

      return initializeYandexGamesSdk()
        .then((ysdk) => new Promise((resolve, reject) => {
          if (!ysdk) {
            reject(new Error("Yandex Games SDK is skipped outside Yandex Games."));
            return;
          }

          if (!ysdk.adv?.showRewardedVideo) {
            reject(new Error("Rewarded video is unavailable."));
            return;
          }

          ysdk.adv.showRewardedVideo({
            callbacks: {
              onOpen: () => {
                console.log("Video ad open.");
              },
              onRewarded: () => {
                console.log("Rewarded!");
                playerResources.gold += adGoldReward;
                savePlayerResources();
                renderTopBar();
                resolve();
              },
              onClose: () => {
                console.log("Video ad closed.");
                resolve();
              },
              onError: (error) => {
                console.log("Error while open video ad:", error);
                reject(error);
              }
            }
          });
        }))
        .catch((error) => {
          console.warn("Rewarded ad is unavailable.", error);
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = `\u0417\u043e\u043b\u043e\u0442\u043e \u0437\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u0443: +${adGoldReward}`;
        });
    }

    function renderStoreScreen() {
      const screen = document.createElement("div");
      const containerPanel = document.createElement("section");
      const adPanel = document.createElement("section");
      const containerTitle = document.createElement("div");
      const containerText = document.createElement("div");
      const containerButton = document.createElement("button");
      const premiumPanel = createPremiumStorePanel();
      const adTitle = document.createElement("div");
      const adText = document.createElement("div");
      const adButton = document.createElement("button");

      screen.className = "storeScreen";
      containerPanel.className = "storePanel";
      adPanel.className = "storePanel";
      containerTitle.className = "storeTitle";
      containerText.className = "storeText";
      containerButton.className = "storeActionButton";
      adTitle.className = "storeTitle";
      adText.className = "storeText";
      adButton.className = "storeActionButton";

      containerButton.type = "button";
      adButton.type = "button";
      containerTitle.textContent = "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440";
      containerText.textContent = `\u0426\u0435\u043d\u0430: ${formatStoredNumber(containerGoldPrice)} \u0437\u043e\u043b\u043e\u0442\u0430. \u041d\u0430\u0433\u0440\u0430\u0434\u044b: ${containerPrizeCount} \u043f\u0440\u0438\u0437\u0430 \u0438\u0437 \u0437\u043e\u043b\u043e\u0442\u0430 \u0438 \u0447\u0435\u0440\u0442\u0435\u0436\u0435\u0439 \u0415\u0441\u043b\u0438 \u0442\u0430\u043d\u043a \u0443\u0436\u0435 \u0435\u0441\u0442\u044c, \u0434\u0430\u0435\u0442\u0441\u044f ${formatStoredNumber(duplicateTankGoldReward)} \u0437\u043e\u043b\u043e\u0442\u0430. \u0421\u0443\u043c\u043c\u0430\u0440\u043d\u044b\u0439 \u0448\u0430\u043d\u0441 \u0442\u0430\u043d\u043a\u0430: ${Math.round(containerTankDropChance * 100)}%.`;
      containerButton.textContent = `\u041e\u0442\u043a\u0440\u044b\u0442\u044c: ${formatStoredNumber(containerGoldPrice)} \u0437\u043e\u043b\u043e\u0442\u0430`;
      containerButton.disabled = playerResources.gold < containerGoldPrice;
      adTitle.textContent = "\u0417\u043e\u043b\u043e\u0442\u043e \u0437\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u0443";
      adText.textContent = "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0432\u043e\u0437\u043d\u0430\u0433\u0440\u0430\u0436\u0434\u0430\u0435\u043c\u043e\u0439 \u0440\u0435\u043a\u043b\u0430\u043c\u044b.";
      adButton.textContent = `\u0417\u043e\u043b\u043e\u0442\u043e \u0437\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u0443: +${adGoldReward}`;

      containerButton.addEventListener("click", () => openContainer(containerButton));
      adButton.addEventListener("click", () => {
        showRewardedGoldAd(adButton).finally(() => {
          rerenderStoreScreen();
        });
      });
      containerPanel.append(containerTitle, containerText, containerButton);
      adPanel.append(adTitle, adText, adButton);
      screen.append(containerPanel, adPanel, premiumPanel);
      overlayContent.append(screen);
    }

    function createProfileStat(label, value) {
      const stat = document.createElement("div");
      const labelElement = document.createElement("div");
      const valueElement = document.createElement("div");

      stat.className = "profileStat";
      labelElement.className = "profileStatLabel";
      valueElement.className = "profileStatValue";
      labelElement.textContent = label;
      valueElement.textContent = value;
      stat.append(labelElement, valueElement);
      return stat;
    }

    function getProfileSummary() {
      const ownedTanks = loadedTanks.filter((tank) => tank.state === 2);
      const researchedTanks = loadedTanks.filter((tank) => tank.state >= 1);
      const totalTanks = loadedTanks.length || fallbackTanks.length;
      const winRate = playerStats.battles > 0 ? Math.round(playerStats.victories / playerStats.battles * 100) : 0;
      const accuracy = playerStats.shots > 0 ? Math.round(playerStats.hits / playerStats.shots * 100) : 0;
      const averageDamage = playerStats.battles > 0 ? Math.round(playerStats.damage / playerStats.battles) : 0;
      const bestTank = [...ownedTanks].sort((first, second) => normalizeNumber(second.experience) - normalizeNumber(first.experience))[0] || selectedTank;
      const tankClassCounts = ownedTanks.reduce((counts, tank) => {
        const className = tank.className || "\u0411\u0435\u0437 \u043a\u043b\u0430\u0441\u0441\u0430";

        counts[className] = normalizeNumber(counts[className]) + 1;
        return counts;
      }, {});

      return {
        ownedTanks,
        researchedTanks,
        totalTanks,
        winRate,
        accuracy,
        averageDamage,
        bestTank,
        tankClassCounts
      };
    }

    function getPlayerRank(summary) {
      const score = playerStats.victories * 3 + playerStats.kills + Math.floor(playerStats.damage / 800) + summary.ownedTanks.length;

      if (score >= 90) {
        return "\u041c\u0430\u0439\u043e\u0440";
      }

      if (score >= 50) {
        return "\u041a\u0430\u043f\u0438\u0442\u0430\u043d";
      }

      if (score >= 25) {
        return "\u041b\u0435\u0439\u0442\u0435\u043d\u0430\u043d\u0442";
      }

      if (score >= 8) {
        return "\u0421\u0435\u0440\u0436\u0430\u043d\u0442";
      }

      return "\u041d\u043e\u0432\u043e\u0431\u0440\u0430\u043d\u0435\u0446";
    }

    function getProfileMedals(summary) {
      return [
        {
          icon: "\u2605",
          name: "\u041f\u0435\u0440\u0432\u0430\u044f \u043f\u043e\u0431\u0435\u0434\u0430",
          text: "\u0412\u044b\u0438\u0433\u0440\u0430\u0442\u044c \u0431\u043e\u0439",
          unlocked: playerStats.victories > 0
        },
        {
          icon: "\u25ce",
          name: "\u0421\u043d\u0430\u0439\u043f\u0435\u0440",
          text: "\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c 60%+",
          unlocked: summary.accuracy >= 60 && playerStats.shots >= 10
        },
        {
          icon: "\u2716",
          name: "\u0418\u0441\u0442\u0440\u0435\u0431\u0438\u0442\u0435\u043b\u044c",
          text: "10 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u0438\u0439",
          unlocked: playerStats.kills >= 10
        },
        {
          icon: "\u25b2",
          name: "\u041a\u043e\u043b\u043b\u0435\u043a\u0446\u0438\u043e\u043d\u0435\u0440",
          text: "5 \u0435\u0434\u0438\u043d\u0438\u0446 \u0442\u0435\u0445\u043d\u0438\u043a\u0438",
          unlocked: summary.ownedTanks.length >= 5
        },
        {
          icon: "\u2699",
          name: "\u0418\u043d\u0436\u0435\u043d\u0435\u0440",
          text: "3 \u0438\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0442\u0430\u043d\u043a\u0430",
          unlocked: summary.researchedTanks.length >= 3
        },
        {
          icon: "\u25c6",
          name: "\u0412\u0435\u0442\u0435\u0440\u0430\u043d",
          text: "10 \u0431\u043e\u0451\u0432",
          unlocked: playerStats.battles >= 10
        },
        {
          icon: "\u25a0",
          name: "\u0428\u0442\u0443\u0440\u043c",
          text: "100% \u0437\u0430\u0445\u0432\u0430\u0442\u0430 \u0431\u0430\u0437\u044b",
          unlocked: playerStats.baseCapture >= 100
        },
        {
          icon: "\u25c9",
          name: "\u041c\u0430\u0441\u0442\u0435\u0440 \u0443\u0440\u043e\u043d\u0430",
          text: "10 000 \u0443\u0440\u043e\u043d\u0430",
          unlocked: playerStats.damage >= 10000
        }
      ];
    }

    function createProfileMedal(medal) {
      const item = document.createElement("div");
      const icon = document.createElement("div");
      const name = document.createElement("div");
      const text = document.createElement("div");

      item.className = `profileMedal ${medal.unlocked ? "" : "locked"}`.trim();
      icon.className = "profileMedalIcon";
      name.className = "profileMedalName";
      text.className = "profileMedalText";
      icon.textContent = medal.icon;
      name.textContent = medal.name;
      text.textContent = medal.unlocked ? medal.text : "\u0417\u0430\u043a\u0440\u044b\u0442\u043e: " + medal.text;
      item.append(icon, name, text);
      return item;
    }

    function createProfileTankRow(tank) {
      const row = document.createElement("div");
      const image = document.createElement("img");
      const details = document.createElement("div");
      const name = document.createElement("div");
      const meta = document.createElement("div");
      const value = document.createElement("div");
      const tankStats = playerStats.tanks[String(tank.id)] || {};

      row.className = "profileTankRow";
      image.className = "profileTankImage";
      image.alt = "";
      setTankImage(image, tank.name);
      details.className = "profileTankDetails";
      name.className = "profileTankName";
      meta.className = "profileTankMeta";
      value.className = "profileTankValue";
      name.textContent = `${toRoman(tank.level)} ${tank.name}`;
      meta.textContent = `${tank.nation || "-"} | ${tank.className || "\u043a\u043b\u0430\u0441\u0441 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d"} | \u0431\u043e\u0451\u0432: ${formatStoredNumber(tankStats.battles || 0)}`;
      value.textContent = `${formatStoredNumber(tank.experience || 0)} \u043e\u043f\u044b\u0442\u0430`;
      details.append(name, meta);
      row.append(image, details, value);
      return row;
    }

    function loadProfileBattleReplays() {
      const stored = parseStoredJson("battleReplays", []);

      return Array.isArray(stored) ? stored : [];
    }

    function formatReplayDate(value) {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function createReplayShotRow(shot) {
      const row = document.createElement("div");
      const main = document.createElement("div");
      const meta = document.createElement("div");
      const value = document.createElement("div");
      const start = shot.from || {};
      const end = shot.to || {};

      row.className = "profileTankRow";
      main.className = "profileTankDetails";
      meta.className = "profileTankMeta";
      value.className = "profileTankValue";
      main.textContent = `#${shot.id} ${shot.time || 0}\u0441: ${shot.shooter || "-"} -> ${shot.target || "-"} (${shot.shell || "-"})`;
      meta.textContent = [
        `\u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442: ${shot.result || "-"}`,
        `\u043c\u043e\u0434\u0443\u043b\u044c: ${shot.module || "-"}`,
        `\u043e\u0442 ${Math.round(start.x || 0)},${Math.round(start.y || 0)} \u0434\u043e ${Math.round(end.x || 0)},${Math.round(end.y || 0)}`
      ].join(" | ");
      value.textContent = shot.damage > 0 ? `${formatStoredNumber(shot.damage)} \u0443\u0440.` : shot.blocked > 0 ? `${formatStoredNumber(shot.blocked)} \u0431\u043b\u043e\u043a` : "-";
      row.append(main, value);
      main.append(meta);
      return row;
    }

    function createReplayItem(replay) {
      const item = document.createElement("details");
      const summary = document.createElement("summary");
      const shots = document.createElement("div");
      const stats = replay.summary || {};

      item.className = "profilePanel";
      summary.className = "profileSectionTitle";
      shots.className = "profileTankList";
      summary.textContent = `${formatReplayDate(replay.date)} | ${replay.result === "victory" ? "\u041f\u043e\u0431\u0435\u0434\u0430" : "\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435"} | ${replay.tank || "-"} | ${replay.mode || "-"} | \u0443\u0440\u043e\u043d ${formatStoredNumber(stats.damage || 0)} | ${formatStoredNumber(stats.hits || 0)}/${formatStoredNumber(stats.shots || 0)}`;

      if ((replay.shots || []).length === 0) {
        shots.append(createProfileStat("\u0412\u044b\u0441\u0442\u0440\u0435\u043b\u044b", "\u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0438"));
      } else {
        replay.shots.forEach((shot) => shots.append(createReplayShotRow(shot)));
      }

      item.append(summary, shots);
      return item;
    }

    function createProfileReplaysPanel() {
      const panel = document.createElement("section");
      const title = document.createElement("div");
      const list = document.createElement("div");
      const replays = loadProfileBattleReplays();

      panel.className = "profilePanel profileWide";
      title.className = "profileSectionTitle";
      list.className = "profileTankList";
      title.textContent = "\u0420\u0435\u043f\u043b\u0435\u0438: \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 5 \u0431\u043e\u0451\u0432";

      if (replays.length === 0) {
        list.append(createProfileStat("\u0420\u0435\u043f\u043b\u0435\u0438", "\u0421\u044b\u0433\u0440\u0430\u0439\u0442\u0435 \u0431\u043e\u0439, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u044f\u0432\u0438\u043b\u0430\u0441\u044c \u0437\u0430\u043f\u0438\u0441\u044c"));
      } else {
        replays.forEach((replay) => list.append(createReplayItem(replay)));
      }

      panel.append(title, list);
      return panel;
    }

    function renderProfileScreen() {
      const summary = getProfileSummary();
      const screen = document.createElement("div");
      const identityPanel = document.createElement("section");
      const hero = document.createElement("div");
      const avatar = document.createElement("div");
      const identity = document.createElement("div");
      const nameInput = document.createElement("input");
      const id = document.createElement("div");
      const rank = document.createElement("div");
      const battlePanel = document.createElement("section");
      const battleTitle = document.createElement("div");
      const battleStats = document.createElement("div");
      const sessionPanel = document.createElement("section");
      const sessionTitle = document.createElement("div");
      const sessionGrid = document.createElement("div");
      const techPanel = document.createElement("section");
      const techTitle = document.createElement("div");
      const techStats = document.createElement("div");
      const medalsPanel = document.createElement("section");
      const medalsTitle = document.createElement("div");
      const medals = document.createElement("div");
      const tanksPanel = document.createElement("section");
      const tanksTitle = document.createElement("div");
      const tanks = document.createElement("div");
      const bestTank = summary.bestTank;

      screen.className = "profileScreen";
      identityPanel.className = "profilePanel";
      hero.className = "profileHero";
      avatar.className = "profileAvatar";
      identity.className = "profileIdentity";
      nameInput.className = "profileName";
      id.className = "profileId";
      rank.className = "profileRank";
      nameInput.type = "text";
      nameInput.maxLength = 24;
      nameInput.value = playerProfile.username;
      avatar.textContent = playerProfile.username.trim().slice(0, 1).toUpperCase() || "T";
      id.textContent = `ID: ${playerProfile.id}`;
      rank.textContent = `\u0417\u0432\u0430\u043d\u0438\u0435: ${getPlayerRank(summary)}`;
      nameInput.addEventListener("change", () => {
        playerProfile.username = nameInput.value.trim().slice(0, 24) || defaultPlayerProfile.username;
        nameInput.value = playerProfile.username;
        avatar.textContent = playerProfile.username.trim().slice(0, 1).toUpperCase() || "T";
        savePlayerProfile();
      });
      identity.append(nameInput, id, rank);
      hero.append(avatar, identity);
      identityPanel.append(hero);

      battlePanel.className = "profilePanel";
      battleTitle.className = "profileSectionTitle";
      battleStats.className = "profileStatsGrid";
      battleTitle.textContent = "\u0411\u043e\u0435\u0432\u0430\u044f \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430";
      battleStats.append(
        createProfileStat("\u0411\u043e\u0438", formatStoredNumber(playerStats.battles)),
        createProfileStat("\u041f\u043e\u0431\u0435\u0434\u044b", `${formatStoredNumber(playerStats.victories)} (${summary.winRate}%)`),
        createProfileStat("\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u0443\u0440\u043e\u043d", formatStoredNumber(summary.averageDamage)),
        createProfileStat("\u0423\u0440\u043e\u043d", formatStoredNumber(playerStats.damage)),
        createProfileStat("\u0423\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u043e", formatStoredNumber(playerStats.kills)),
        createProfileStat("\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c", `${summary.accuracy}%`),
        createProfileStat("\u041e\u043f\u044b\u0442 \u0437\u0430 \u0431\u043e\u0438", formatStoredNumber(playerStats.experience)),
        createProfileStat("\u0421\u0435\u0440\u0435\u0431\u0440\u043e \u0437\u0430 \u0431\u043e\u0438", formatStoredNumber(playerStats.silver)),
        createProfileStat("\u041b\u0443\u0447\u0448\u0430\u044f \u0442\u0435\u0445\u043d\u0438\u043a\u0430", bestTank?.name || "-")
      );
      battlePanel.append(battleTitle, battleStats);

      sessionPanel.className = "profilePanel";
      sessionTitle.className = "profileSectionTitle";
      sessionGrid.className = "profileStatsGrid";
      sessionTitle.textContent = "\u0421\u0435\u0441\u0441\u0438\u044f";
      sessionGrid.append(
        createProfileStat("\u0411\u043e\u0438", formatStoredNumber(sessionStats.battles)),
        createProfileStat("\u041f\u043e\u0431\u0435\u0434\u044b", formatStoredNumber(sessionStats.victories)),
        createProfileStat("\u0423\u0440\u043e\u043d", formatStoredNumber(sessionStats.damage)),
        createProfileStat("\u0424\u0440\u0430\u0433\u0438", formatStoredNumber(sessionStats.kills)),
        createProfileStat("\u041e\u043f\u044b\u0442", formatStoredNumber(sessionStats.experience)),
        createProfileStat("\u0421\u0435\u0440\u0435\u0431\u0440\u043e", formatStoredNumber(sessionStats.silver))
      );
      sessionPanel.append(sessionTitle, sessionGrid);

      techPanel.className = "profilePanel";
      techTitle.className = "profileSectionTitle";
      techStats.className = "profileTechGrid";
      techTitle.textContent = "\u0422\u0435\u0445\u043d\u0438\u043a\u0430";
      techStats.append(
        createProfileStat("\u0412 \u0430\u043d\u0433\u0430\u0440\u0435", `${summary.ownedTanks.length}/${summary.totalTanks}`),
        createProfileStat("\u0418\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u043d\u043e", formatStoredNumber(summary.researchedTanks.length)),
        createProfileStat("\u0427\u0435\u0440\u0442\u0435\u0436\u0438", formatStoredNumber(playerResources.blueprints)),
        createProfileStat("\u041b\u0422", formatStoredNumber(summary.tankClassCounts["\u041b\u0422"] || 0)),
        createProfileStat("\u0421\u0422", formatStoredNumber(summary.tankClassCounts["\u0421\u0422"] || 0)),
        createProfileStat("\u0422\u0422/\u041f\u0422", formatStoredNumber((summary.tankClassCounts["\u0422\u0422"] || 0) + (summary.tankClassCounts["\u041f\u0422"] || 0)))
      );
      techPanel.append(techTitle, techStats);

      medalsPanel.className = "profilePanel";
      medalsTitle.className = "profileSectionTitle";
      medals.className = "profileMedals";
      medalsTitle.textContent = "\u041c\u0435\u0434\u0430\u043b\u0438";
      getProfileMedals(summary).forEach((medal) => medals.append(createProfileMedal(medal)));
      medalsPanel.append(medalsTitle, medals);

      tanksPanel.className = "profilePanel profileWide";
      tanksTitle.className = "profileSectionTitle";
      tanks.className = "profileTankList";
      tanksTitle.textContent = "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043f\u043e \u0442\u0435\u0445\u043d\u0438\u043a\u0435";
      summary.ownedTanks
        .slice()
        .sort((first, second) => normalizeNumber(second.experience) - normalizeNumber(first.experience))
        .slice(0, 8)
        .forEach((tank) => tanks.append(createProfileTankRow(tank)));

      if (tanks.children.length === 0) {
        tanks.append(createProfileStat("\u0422\u0435\u0445\u043d\u0438\u043a\u0430", "\u041d\u0435\u0442"));
      }

      tanksPanel.append(tanksTitle, tanks);
      screen.append(identityPanel, battlePanel, sessionPanel, techPanel, medalsPanel, createProfileReplaysPanel(), tanksPanel);
      overlayContent.append(screen);
    }

