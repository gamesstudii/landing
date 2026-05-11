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

    function renderEventsScreen() {
      const progress = getVictoryDayEventWins();
      const completed = progress >= victoryDayEvent.requiredWins;
      const claimed = completed ? claimVictoryDayEventReward() || victoryDayEventRewardClaimed() : victoryDayEventRewardClaimed();
      const message = document.createElement("div");

      message.className = "overlayMessage";
      message.style.flexDirection = "column";
      message.style.gap = "14px";
      message.style.padding = "24px";
      message.style.lineHeight = "1.25";
      message.innerHTML = `
        <div>Ивент к 9 Мая: 7-15 мая</div>
        <div style="font-size: 0.45em; max-width: 900px;">
          Цель: выиграть 50 боев суммарно в режимах «Охота на командира» и «Война».
          Победы можно набирать в любом из этих двух режимов.
        </div>
        <div style="color: #f3d248;">Победы: ${Math.min(progress, victoryDayEvent.requiredWins)} / ${victoryDayEvent.requiredWins}</div>
        <div style="font-size: 0.5em;">Награда: Т-34 блокадный${claimed || completed ? " - получен" : ""}</div>
      `;
      overlayContent.append(message);
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
      screen.append(identityPanel, battlePanel, techPanel, medalsPanel, tanksPanel);
      overlayContent.append(screen);
    }

