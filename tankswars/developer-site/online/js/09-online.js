    const onlineConfig = {
      enabled: true,
      transport: "auto",
      serverUrl: "",
      targetTeamSize: 7,
      queueDelayMs: 2200,
      profileSyncKey: "onlineProfileSnapshot"
    };

    const onlineState = {
      connected: false,
      connecting: false,
      queued: false,
      matchStarting: false,
      match: null,
      playersOnline: 1,
      queueStartedAt: 0,
      queueTimer: 0,
      statusText: "Подключение к серверу",
      lastSyncAt: 0,
      socket: null,
      serverClientId: "",
      usingServer: false
    };

    const onlineStatusPanel = document.querySelector("#onlineStatusPanel");
    const originalStartBattle = startBattle;
    const originalStopBattle = stopBattle;
    const originalOpenOverlay = openOverlay;
    const originalRenderTopBar = renderTopBar;
    const originalShowBattleResult = showBattleResult;

    if (!sideButtonIcons.some((icon) => icon.screen === "auction")) {
      sideButtonIcons.push({ file: "store.png", label: "Аукцион", screen: "auction" });
    }

    function createOnlinePlayerSnapshot(team, slot, tank = null, isLocal = false) {
      const playableTanks = loadedTanks.filter((item) => item.botEligible !== false);
      const sourceTank = tank || pickRandomTank(playableTanks.length > 0 ? playableTanks : fallbackTanks);
      const nicknamePrefix = team === "ally" ? "Союзник" : "Противник";

      return {
        id: isLocal ? playerProfile.id : `${team}-${slot}-${Math.random().toString(36).slice(2, 8)}`,
        username: isLocal ? playerProfile.username : `${nicknamePrefix} ${slot}`,
        tankId: sourceTank?.id || 0,
        tankName: sourceTank?.name || "МС-1",
        tankLevel: sourceTank?.level || "1",
        team,
        ready: true,
        local: isLocal
      };
    }

    function getOnlineUnlockedTankState() {
      return loadedTanks
        .filter((tank) => tank.state === 2)
        .map((tank) => ({
          id: tank.id,
          experience: tank.experience,
          state: tank.state,
          ammo: normalizeTankAmmo(tank, tank.ammo || loadTankAmmo(tank)),
          crew: normalizeCrewData(tank.crew || loadTankCrew(tank))
        }));
    }

    function createOnlineProfileSnapshot() {
      return {
        profile: { ...playerProfile },
        resources: { ...playerResources },
        stats: {
          ...playerStats,
          tanks: { ...playerStats.tanks }
        },
        tanks: getOnlineUnlockedTankState(),
        auctions: getOnlineAuctionState(),
        savedAt: Date.now()
      };
    }

    function getOnlineAuctionState() {
      return parseStoredJson("onlineAuctionState", {
        bids: {},
        lastSeenAt: 0
      });
    }

    function saveOnlineAuctionState(state) {
      setCookie("onlineAuctionState", JSON.stringify({
        bids: state.bids && typeof state.bids === "object" ? state.bids : {},
        lastSeenAt: Date.now()
      }));
    }

    function getOnlineAuctionLots() {
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      const day = 24 * hour;
      const tankPool = loadedTanks.filter((tank) => tank.containerEligible || tank.premium || tank.level === "10");
      const fallbackPool = loadedTanks.filter((tank) => tank.state !== 2 && tank.botEligible !== false);
      const pool = tankPool.length > 0 ? tankPool : fallbackPool.length > 0 ? fallbackPool : fallbackTanks;

      return [0, 1, 2].map((offset) => {
        const tank = pool[(Math.floor(now / day) + offset) % pool.length];
        const level = Math.max(1, normalizeNumber(tank?.level || 1));

        return {
          id: `lot-${Math.floor(now / day)}-${offset}`,
          title: tank?.name || "Случайный танк",
          tankId: tank?.id || 0,
          level,
          minBid: 750 * level * (offset + 1),
          currency: offset === 0 ? "silver" : "gold",
          endsAt: now + (offset + 1) * 6 * hour
        };
      });
    }

    function placeOnlineAuctionBid(lot) {
      const state = getOnlineAuctionState();
      const currentBid = normalizeNumber(state.bids[lot.id]?.amount || 0);
      const bidAmount = Math.max(lot.minBid, currentBid + Math.max(100, Math.round(lot.minBid * 0.1)));

      state.bids[lot.id] = {
        lotId: lot.id,
        tankId: lot.tankId,
        amount: bidAmount,
        currency: lot.currency,
        placedAt: Date.now()
      };
      saveOnlineAuctionState(state);
      saveOnlineProfileSnapshot();
      renderOnlineAuctionScreen();
      showGameNotification(`Ставка принята: ${formatStoredNumber(bidAmount)} ${lot.currency === "gold" ? "золота" : "серебра"}`, "success");
    }

    function renderOnlineAuctionScreen() {
      const screen = document.createElement("div");
      const title = document.createElement("div");
      const meta = document.createElement("div");
      const grid = document.createElement("div");
      const state = getOnlineAuctionState();

      overlayContent.textContent = "";
      screen.className = "onlineAuctionScreen";
      title.className = "onlineAuctionTitle";
      meta.className = "onlineAuctionMeta";
      grid.className = "onlineAuctionGrid";
      title.textContent = "Аукцион";
      meta.textContent = onlineState.usingServer
        ? "Подключён локальный сервер. Лоты пока тестовые, ставки сохраняются в профиле."
        : "Локальное расписание лотов. Сервер позже заменит этот список и проверку ставок.";

      getOnlineAuctionLots().forEach((lot) => {
        const card = document.createElement("div");
        const lotTitle = document.createElement("div");
        const lotMeta = document.createElement("div");
        const bid = document.createElement("div");
        const button = document.createElement("button");
        const storedBid = state.bids[lot.id];
        const minutesLeft = Math.max(1, Math.ceil((lot.endsAt - Date.now()) / (60 * 1000)));

        card.className = "onlineAuctionCard";
        lotTitle.className = "onlineAuctionLotTitle";
        lotMeta.className = "onlineAuctionLotMeta";
        bid.className = "onlineAuctionBid";
        button.type = "button";
        button.className = "dailyButton";
        lotTitle.textContent = lot.title;
        lotMeta.textContent = `Уровень ${toRoman(lot.level)} | до конца ${minutesLeft} мин.`;
        bid.textContent = storedBid
          ? `Ваша ставка: ${formatStoredNumber(storedBid.amount)}`
          : `Старт: ${formatStoredNumber(lot.minBid)} ${lot.currency === "gold" ? "золота" : "серебра"}`;
        button.textContent = storedBid ? "Повысить" : "Сделать ставку";
        button.addEventListener("click", () => placeOnlineAuctionBid(lot));
        card.append(lotTitle, lotMeta, bid, button);
        grid.append(card);
      });

      screen.append(title, meta, grid);
      overlayContent.append(screen);
    }

    function saveOnlineProfileSnapshot() {
      const snapshot = createOnlineProfileSnapshot();

      onlineState.lastSyncAt = snapshot.savedAt;
      setCookie(onlineConfig.profileSyncKey, JSON.stringify(snapshot));
      sendOnlineMessage({
        type: "profileSnapshot",
        snapshot
      });
      return snapshot;
    }

    function createLocalOnlineMatch(mode, tank) {
      const sameLevelTanks = loadedTanks.filter((item) => item.level === tank.level && item.botEligible !== false);
      const pool = sameLevelTanks.length > 0 ? sameLevelTanks : fallbackTanks;
      const allies = [createOnlinePlayerSnapshot("ally", 1, tank, true)];
      const enemies = [];

      for (let index = 2; index <= onlineConfig.targetTeamSize; index += 1) {
        allies.push(createOnlinePlayerSnapshot("ally", index, pickRandomTank(pool)));
      }

      for (let index = 1; index <= onlineConfig.targetTeamSize; index += 1) {
        enemies.push(createOnlinePlayerSnapshot("enemy", index, pickRandomTank(pool)));
      }

      return {
        id: `local-${Date.now().toString(36)}`,
        modeId: mode.id,
        modeTitle: mode.title,
        teamSize: onlineConfig.targetTeamSize,
        mapPresetId: selectedTrainingMapPresetId || "",
        createdAt: Date.now(),
        serverAuthoritative: false,
        allies,
        enemies
      };
    }

    function getOnlineServerUrl() {
      if (onlineConfig.serverUrl) {
        return onlineConfig.serverUrl;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}/ws`;
    }

    function sendOnlineMessage(payload) {
      const socket = onlineState.socket;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify(payload));
      return true;
    }

    function handleOnlineServerMessage(payload) {
      if (!payload || typeof payload !== "object") {
        return;
      }

      if (payload.type === "welcome") {
        onlineState.connected = true;
        onlineState.connecting = false;
        onlineState.usingServer = true;
        onlineState.serverClientId = payload.clientId || "";
        onlineState.playersOnline = normalizeNumber(payload.playersOnline || 1);
        onlineState.statusText = "Сервер подключён";
        saveOnlineProfileSnapshot();
        renderOnlineStatusPanel();
        return;
      }

      if (payload.type === "queueStatus") {
        onlineState.playersOnline = normalizeNumber(payload.playersOnline || onlineState.playersOnline);
        renderOnlineStatusPanel();
        return;
      }

      if (payload.type === "queued") {
        onlineState.queued = true;
        onlineState.matchStarting = false;
        onlineState.queueStartedAt = Date.now();
        onlineState.statusText = `Очередь на сервере: ${payload.queueSize || 1}`;
        renderTopBar();
        renderOnlineStatusPanel();
        return;
      }

      if (payload.type === "queueCanceled") {
        onlineState.queued = false;
        onlineState.matchStarting = false;
        onlineState.statusText = "Сервер подключён";
        renderTopBar();
        renderOnlineStatusPanel();
        return;
      }

      if (payload.type === "matchFound") {
        onlineState.match = payload.match;
        onlineState.queued = false;
        onlineState.matchStarting = true;
        onlineState.statusText = "Матч найден на сервере";
        showOnlineMatchFound(onlineState.match);
        renderTopBar();
        renderOnlineStatusPanel();
        window.setTimeout(startOnlinePreviewBattle, 900);
        return;
      }

      if (payload.type === "profileSaved") {
        onlineState.lastSyncAt = normalizeNumber(payload.updatedAt || Date.now());
        renderOnlineStatusPanel();
      }
    }

    const serverOnlineAdapter = {
      connect() {
        if (onlineState.socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(onlineState.socket.readyState)) {
          return;
        }

        onlineState.connecting = true;
        onlineState.statusText = "Подключение к серверу";
        renderOnlineStatusPanel();

        try {
          const socket = new WebSocket(getOnlineServerUrl());
          onlineState.socket = socket;

          socket.addEventListener("open", () => {
            sendOnlineMessage({
              type: "hello",
              playerId: playerProfile.id,
              username: playerProfile.username
            });
          });
          socket.addEventListener("message", (event) => {
            try {
              handleOnlineServerMessage(JSON.parse(event.data));
            } catch (error) {
              console.warn("Bad online server message.", error);
            }
          });
          socket.addEventListener("close", () => {
            onlineState.connected = false;
            onlineState.connecting = false;
            onlineState.usingServer = false;
            onlineState.socket = null;
            onlineState.statusText = "Сервер недоступен, локальный режим";
            renderOnlineStatusPanel();
          });
          socket.addEventListener("error", () => {
            onlineState.statusText = "Ошибка сервера, локальный режим";
            renderOnlineStatusPanel();
          });
        } catch (error) {
          console.warn("Could not connect online server.", error);
          localOnlineAdapter.connect();
        }
      },
      enqueue(mode, tank) {
        if (!sendOnlineMessage({
          type: "queue",
          modeId: mode.id,
          modeTitle: mode.title,
          tankId: tank.id,
          tankName: tank.name,
          tankLevel: tank.level
        })) {
          localOnlineAdapter.enqueue(mode, tank);
        }
      },
      cancelQueue() {
        sendOnlineMessage({ type: "cancelQueue" });
        onlineState.queued = false;
        onlineState.matchStarting = false;
        onlineState.statusText = onlineState.connected ? "Сервер подключён" : "Локальный онлайн-режим";
        renderOnlineStatusPanel();
      }
    };

    const localOnlineAdapter = {
      connect() {
        onlineState.connecting = true;
        onlineState.usingServer = false;
        renderOnlineStatusPanel();

        window.setTimeout(() => {
          onlineState.connected = true;
          onlineState.connecting = false;
          onlineState.usingServer = false;
          onlineState.playersOnline = Math.max(14, 22 + Math.floor(Math.random() * 9));
          onlineState.statusText = "Онлайн готов";
          saveOnlineProfileSnapshot();
          renderOnlineStatusPanel();
        }, 450);
      },
      enqueue(mode, tank) {
        onlineState.queued = true;
        onlineState.matchStarting = false;
        onlineState.match = null;
        onlineState.queueStartedAt = Date.now();
        onlineState.statusText = `Поиск боя ${onlineConfig.targetTeamSize} на ${onlineConfig.targetTeamSize}`;
        renderOnlineStatusPanel();

        window.clearTimeout(onlineState.queueTimer);
        onlineState.queueTimer = window.setTimeout(() => {
          onlineState.match = createLocalOnlineMatch(mode, tank);
          onlineState.queued = false;
          onlineState.matchStarting = true;
          onlineState.statusText = "Матч найден";
          renderOnlineStatusPanel();
          showOnlineMatchFound(onlineState.match);
          window.setTimeout(startOnlinePreviewBattle, 900);
        }, onlineConfig.queueDelayMs);
      },
      cancelQueue() {
        window.clearTimeout(onlineState.queueTimer);
        onlineState.queued = false;
        onlineState.matchStarting = false;
        onlineState.statusText = onlineState.connected ? "Онлайн готов" : "Локальный онлайн-режим";
        renderOnlineStatusPanel();
      }
    };

    function getOnlineAdapter() {
      return onlineState.usingServer || onlineState.socket ? serverOnlineAdapter : localOnlineAdapter;
    }

    function renderOnlineStatusPanel() {
      if (!onlineStatusPanel) {
        return;
      }

      const stateClass = onlineState.connected ? "connected" : onlineState.connecting ? "connecting" : "offline";
      const queueSeconds = onlineState.queued ? Math.max(0, Math.floor((Date.now() - onlineState.queueStartedAt) / 1000)) : 0;
      const syncTime = onlineState.lastSyncAt ? new Date(onlineState.lastSyncAt).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      }) : "-";

      onlineStatusPanel.className = `onlineStatusPanel ${stateClass}`;
      onlineStatusPanel.textContent = "";
      onlineStatusPanel.append(
        createOnlineStatusItem("Сеть", onlineState.statusText),
        createOnlineStatusItem("Игроки", String(onlineState.playersOnline)),
        createOnlineStatusItem("Очередь", onlineState.queued ? `${queueSeconds} с` : onlineState.matchStarting ? "старт" : "-"),
        createOnlineStatusItem("Синхронизация", syncTime)
      );
    }

    function createOnlineStatusItem(label, value) {
      const item = document.createElement("div");
      const labelElement = document.createElement("span");
      const valueElement = document.createElement("strong");

      item.className = "onlineStatusItem";
      labelElement.textContent = label;
      valueElement.textContent = value;
      item.append(labelElement, valueElement);
      return item;
    }

    function renderOnlineBattleButton(button) {
      if (!button) {
        return;
      }

      if (selectedBattleMode.id === "training") {
        button.textContent = "Выбрать карту";
        button.disabled = false;
        return;
      }

      button.textContent = onlineState.queued ? "Отменить поиск" : onlineState.matchStarting ? "Запуск..." : "В онлайн-бой";
      button.disabled = onlineState.matchStarting;
    }

    function showOnlineMatchFound(match) {
      const allies = match.allies.map((player) => `${player.username} (${player.tankName})`).join(", ");
      const enemies = match.enemies.map((player) => `${player.username} (${player.tankName})`).join(", ");

      console.log("Online preview match:", match);
      showGameNotification(`Матч ${match.teamSize} на ${match.teamSize} найден`, "success");
      console.log(`Союзники: ${allies}`);
      console.log(`Противники: ${enemies}`);
    }

    function startOnlineQueue() {
      if (selectedBattleMode.id === "training") {
        openOverlay("trainingMap");
        return;
      }

      if (onlineState.queued) {
        getOnlineAdapter().cancelQueue();
        renderTopBar();
        showGameNotification("Поиск боя отменён", "warning");
        return;
      }

      const playerTank = findLoadedTankByReference(selectedTank);

      if (!playerTank) {
        showGameNotification("Выберите танк перед входом в онлайн-бой", "warning");
        return;
      }

      if (!onlineState.connected && !onlineState.connecting) {
        serverOnlineAdapter.connect();
      }

      saveOnlineProfileSnapshot();
      getOnlineAdapter().enqueue(selectedBattleMode, playerTank);
      renderTopBar();
    }

    function startOnlinePreviewBattle() {
      if (!onlineState.match) {
        return;
      }

      onlineState.matchStarting = false;
      onlineState.statusText = `Матч ${onlineState.match.id}`;
      renderTopBar();
      renderOnlineStatusPanel();
      originalStartBattle();
    }

    function patchOnlineBattleControls() {
      const button = document.querySelector(".battleLaunchButton");

      renderOnlineBattleButton(button);
      if (!button || button.dataset.onlinePatched === "1") {
        return;
      }

      button.dataset.onlinePatched = "1";
      button.addEventListener("click", (event) => {
        if (selectedBattleMode.id === "training") {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        startOnlineQueue();
      }, true);
    }

    renderTopBar = function renderTopBarWithOnlineStatus() {
      originalRenderTopBar();
      patchOnlineBattleControls();
      renderOnlineStatusPanel();
    };

    openOverlay = function openOverlayWithOnlineScreens(screenName) {
      if (screenName === "auction") {
        setBackground("./img/angar.png");
        screenOverlay.classList.remove("fullscreenOverlay");
        screenOverlay.classList.add("active");
        showOverlayBackButton(false);
        renderOnlineAuctionScreen();
        return;
      }

      originalOpenOverlay(screenName);
    };

    startBattle = function startBattleOnlineEntry() {
      if (!onlineState.matchStarting && selectedBattleMode.id !== "training" && !battleState.testDrive) {
        startOnlineQueue();
        return;
      }

      originalStartBattle();
    };

    stopBattle = function stopBattleWithOnlineCleanup() {
      getOnlineAdapter().cancelQueue();
      onlineState.match = null;
      originalStopBattle();
      renderOnlineStatusPanel();
    };

    showBattleResult = function showBattleResultWithOnlineSync(result) {
      originalShowBattleResult(result);
      saveOnlineProfileSnapshot();
      onlineState.statusText = "Результат сохранён локально";
      renderOnlineStatusPanel();
    };

    window.tanksWarsOnline = {
      config: onlineConfig,
      state: onlineState,
      connect: () => serverOnlineAdapter.connect(),
      queue: startOnlineQueue,
      cancelQueue: () => getOnlineAdapter().cancelQueue(),
      saveProfile: saveOnlineProfileSnapshot,
      getProfileSnapshot: createOnlineProfileSnapshot
    };

    battleBackButton.addEventListener("click", () => {
      getOnlineAdapter().cancelQueue();
      onlineState.match = null;
      renderOnlineStatusPanel();
    }, true);

    serverOnlineAdapter.connect();
    renderTopBar();
