    function getBattleModeSchedule(mode) {
      const schedules = {
        commander: { from: 1, to: 7, label: "1-7 число" },
        survival: { from: 11, to: 18, label: "11-18 число" },
        war: { from: 22, to: 28, label: "22-28 число" }
      };

      return schedules[mode.id] || null;
    }

    function battleModeIsAvailable(mode) {
      if (developerModeEnabled) {
        return true;
      }

      const schedule = getBattleModeSchedule(mode);

      if (!schedule) {
        return true;
      }

      const now = new Date();
      const day = now.getDate();
      const monthMatches = schedule.month === undefined || now.getMonth() === schedule.month;

      return monthMatches && day >= schedule.from && day <= schedule.to;
    }

    function getAvailableBattleMode(fallback = battleModes[0]) {
      return battleModeIsAvailable(fallback)
        ? fallback
        : battleModes.find(battleModeIsAvailable) || battleModes[0];
    }

    function renderBattleModeScreen() {
      const screen = document.createElement("div");

      screen.className = "modeScreen";

      battleModes.forEach((mode) => {
        const card = document.createElement("button");
        const image = document.createElement("img");
        const content = document.createElement("div");
        const title = document.createElement("div");
        const meta = document.createElement("div");
        const description = document.createElement("div");
        const schedule = getBattleModeSchedule(mode);
        const available = battleModeIsAvailable(mode);

        card.type = "button";
        card.className = `modeCard ${mode.id === selectedBattleMode.id ? "selected" : ""} ${available ? "" : "locked"}`.trim();
        card.disabled = !available;
        image.className = "modeImage";
        image.src = mode.image;
        image.alt = "";
        image.onerror = () => {
          image.onerror = null;
          image.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
        };
        content.className = "modeContent";
        title.className = "modeTitle";
        meta.className = "modeMeta";
        description.className = "modeDescription";
        title.textContent = mode.title;
        meta.textContent = mode.id === "survival"
          ? `${mode.size} \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432${schedule ? ` | ${schedule.label}` : ""}`
          : mode.id === "training"
            ? "\u041e\u0434\u0438\u043d \u0438\u0433\u0440\u043e\u043a | \u0432\u044b\u0431\u043e\u0440 \u043a\u0430\u0440\u0442\u044b"
          : `${mode.size} \u043d\u0430 ${mode.size}${schedule ? ` | ${schedule.label}` : ""}`;
        description.textContent = mode.description;
        content.append(title, meta, description);
        card.append(image, content);
        card.addEventListener("click", () => {
          if (!battleModeIsAvailable(mode)) {
            return;
          }

          selectedBattleMode = mode;
          if (mode.id === "training") {
            renderTopBar();
            openOverlay("trainingMap");
            return;
          }

          closeOverlay();
          renderTopBar();
        });
        screen.append(card);
      });

      overlayContent.append(screen);
    }

    function renderTrainingMapScreen() {
      const screen = document.createElement("div");
      const title = document.createElement("div");
      const list = document.createElement("div");
      const presets = getTrainingMapPresets();

      screen.className = "trainingMapScreen";
      title.className = "trainingMapTitle";
      list.className = "trainingMapList";
      title.textContent = "\u0412\u044b\u0431\u0435\u0440\u0438 \u043a\u0430\u0440\u0442\u0443 \u0434\u043b\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438";

      presets.forEach((item) => {
        const card = document.createElement("button");
        const name = document.createElement("div");
        const meta = document.createElement("div");
        const preview = document.createElement("div");

        card.type = "button";
        card.className = `trainingMapCard ${item.preset.id === selectedTrainingMapPresetId ? "selected" : ""}`.trim();
        preview.className = "trainingMapPreview";
        preview.style.background = `linear-gradient(135deg, ${item.preset.ground}, ${item.preset.shadeA || "rgba(255, 255, 255, 0.18)"})`;
        name.className = "trainingMapName";
        meta.className = "trainingMapMeta";
        name.textContent = item.title;
        meta.textContent = item.modeTitle;
        card.append(preview, name, meta);
        card.addEventListener("click", () => {
          selectedTrainingMapPresetId = item.preset.id;
          selectedBattleMode = battleModes.find((mode) => mode.id === "training") || selectedBattleMode;
          closeOverlay();
          renderTopBar();
          startBattle();
        });
        list.append(card);
      });

      screen.append(title, list);
      overlayContent.append(screen);
    }

    const settingsControls = [
      { id: "brightness", label: "\u042f\u0440\u043a\u043e\u0441\u0442\u044c", description: "\u041c\u0435\u043d\u044f\u0435\u0442 \u044f\u0440\u043a\u043e\u0441\u0442\u044c \u0431\u043e\u0435\u0432\u043e\u0439 \u043a\u0430\u0440\u0442\u044b.", min: 60, max: 140, step: 1, suffix: "%" },
      { id: "contrast", label: "\u041a\u043e\u043d\u0442\u0440\u0430\u0441\u0442", description: "\u0414\u0435\u043b\u0430\u0435\u0442 \u0431\u043e\u0439 \u043c\u044f\u0433\u0447\u0435 \u0438\u043b\u0438 \u0440\u0435\u0437\u0447\u0435.", min: 70, max: 140, step: 1, suffix: "%" },
      { id: "saturation", label: "\u041d\u0430\u0441\u044b\u0449\u0435\u043d\u043d\u043e\u0441\u0442\u044c", description: "\u0420\u0435\u0433\u0443\u043b\u0438\u0440\u0443\u0435\u0442 \u0446\u0432\u0435\u0442\u043d\u043e\u0441\u0442\u044c \u0431\u043e\u0435\u0432\u043e\u0439 \u0441\u0446\u0435\u043d\u044b.", min: 60, max: 150, step: 1, suffix: "%" },
      { id: "battleUiScale", label: "\u041c\u0430\u0441\u0448\u0442\u0430\u0431 UI \u0432 \u0431\u043e\u044e", description: "\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0432\u0430\u0435\u0442 \u0438\u043b\u0438 \u0443\u043c\u0435\u043d\u044c\u0448\u0430\u0435\u0442 \u0431\u043e\u0435\u0432\u044b\u0435 \u0438\u043d\u0434\u0438\u043a\u0430\u0442\u043e\u0440\u044b.", min: 80, max: 130, step: 1, suffix: "%" }
    ];

    const settingsToggles = [
      { id: "showHealthBars", label: "\u041f\u043e\u043b\u043e\u0441\u043a\u0438 \u043f\u0440\u043e\u0447\u043d\u043e\u0441\u0442\u0438", description: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c HP \u043d\u0430\u0434 \u0442\u0430\u043d\u043a\u0430\u043c\u0438." },
      { id: "showTeamMarkers", label: "\u041c\u0430\u0440\u043a\u0435\u0440\u044b \u043a\u043e\u043c\u0430\u043d\u0434", description: "\u041a\u0440\u0430\u0441\u043d\u044b\u0435 \u0438 \u0437\u0435\u043b\u0435\u043d\u044b\u0435 \u043c\u0430\u0440\u043a\u0435\u0440\u044b \u043d\u0430\u0434 \u0442\u0430\u043d\u043a\u0430\u043c\u0438." },
      { id: "showReloadIndicator", label: "\u0418\u043d\u0434\u0438\u043a\u0430\u0442\u043e\u0440 \u041a\u0414", description: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0432\u0440\u0435\u043c\u044f \u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0438 \u0443 \u043a\u0443\u0440\u0441\u043e\u0440\u0430." },
      { id: "showBattleResultPanel", label: "\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u044b\u0435 \u0438\u0442\u043e\u0433\u0438", description: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0443\u0440\u043e\u043d, \u0444\u0440\u0430\u0433\u0438, \u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c \u0438 \u0437\u0430\u0445\u0432\u0430\u0442 \u0432 \u043e\u043a\u043d\u0435 \u0438\u0442\u043e\u0433\u043e\u0432." },
      { id: "fullscreen", label: "\u041f\u043e\u043b\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d", description: "\u0420\u0430\u0437\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0438\u0433\u0440\u0443 \u043d\u0430 \u0432\u0435\u0441\u044c \u044d\u043a\u0440\u0430\u043d, \u0432 \u0442\u043e\u043c \u0447\u0438\u0441\u043b\u0435 \u043d\u0430 MacBook." }
    ];
    const keySettings = [
      { id: "keyForward", label: "\u0412\u043f\u0435\u0440\u0435\u0434" },
      { id: "keyBackward", label: "\u041d\u0430\u0437\u0430\u0434" },
      { id: "keyLeft", label: "\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043b\u0435\u0432\u043e" },
      { id: "keyRight", label: "\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0432\u043f\u0440\u0430\u0432\u043e" },
      { id: "keyTurretLeft", label: "\u0411\u0430\u0448\u043d\u044f \u0432\u043b\u0435\u0432\u043e" },
      { id: "keyTurretRight", label: "\u0411\u0430\u0448\u043d\u044f \u0432\u043f\u0440\u0430\u0432\u043e" },
      { id: "keyArtilleryView", label: "\u0410\u0440\u0442-\u0440\u0435\u0436\u0438\u043c" }
    ];

    function normalizeGameSettings() {
      settingsControls.forEach((control) => {
        gameSettings[control.id] = clampNumber(gameSettings[control.id], control.min, control.max);
      });
      settingsToggles.forEach((toggle) => {
        gameSettings[toggle.id] = gameSettings[toggle.id] !== false;
      });
      keySettings.forEach((setting) => {
        gameSettings[setting.id] = normalizeKeySetting(gameSettings[setting.id], defaultGameSettings[setting.id]);
      });
    }

    function formatSettingValue(control) {
      const value = gameSettings[control.id];
      const roundedValue = Number.isInteger(control.step) ? Math.round(value) : Number(value).toFixed(2).replace(/\.?0+$/, "");

      return `${roundedValue}${control.suffix || ""}`;
    }

    function createSettingsItem(control) {
      const item = document.createElement("label");
      const name = document.createElement("div");
      const value = document.createElement("div");
      const description = document.createElement("div");
      const input = document.createElement("input");

      item.className = "settingsItem";
      name.className = "settingsName";
      value.className = "settingsValue";
      description.className = "settingsDescription";
      input.className = "settingsControl";
      input.type = "range";
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      input.value = gameSettings[control.id];
      name.textContent = control.label;
      value.textContent = formatSettingValue(control);
      description.textContent = control.description;
      input.addEventListener("input", () => {
        gameSettings[control.id] = clampNumber(input.value, control.min, control.max);
        value.textContent = formatSettingValue(control);
        saveGameSettings();
        applyGameSettings();
      });
      item.append(name, value, description, input);
      return item;
    }

    function createSettingsToggle(toggle) {
      const item = document.createElement("label");
      const name = document.createElement("div");
      const input = document.createElement("input");
      const description = document.createElement("div");

      item.className = "settingsItem";
      name.className = "settingsName";
      input.className = "settingsCheckbox";
      description.className = "settingsDescription";
      input.type = "checkbox";
      input.dataset.settingId = toggle.id;
      input.checked = toggle.id === "fullscreen" ? isFullscreenActive() : Boolean(gameSettings[toggle.id]);
      name.textContent = toggle.label;
      description.textContent = toggle.description;
      input.addEventListener("change", async () => {
        if (toggle.id === "fullscreen") {
          const enabled = await setFullscreenMode(input.checked);

          input.checked = isFullscreenActive();
          gameSettings.fullscreen = input.checked;
          saveGameSettings();

          if (!enabled && input.checked) {
            input.checked = false;
            gameSettings.fullscreen = false;
            saveGameSettings();
          }

          return;
        }

        gameSettings[toggle.id] = input.checked;
        saveGameSettings();
        applyGameSettings();
      });
      item.append(name, input, description);
      return item;
    }

    function createKeySettingItem(setting) {
      const item = document.createElement("label");
      const name = document.createElement("div");
      const input = document.createElement("input");
      const description = document.createElement("div");

      item.className = "settingsItem";
      name.className = "settingsName";
      input.className = "settingsKeyInput";
      description.className = "settingsDescription";
      input.type = "text";
      input.maxLength = 24;
      input.value = gameSettings[setting.id];
      name.textContent = setting.label;
      description.textContent = "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043b\u0430\u0432\u0438\u0448\u0443 \u0438\u043b\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0435\u0435 \u0438\u043c\u044f.";
      input.addEventListener("keydown", (event) => {
        event.preventDefault();
        gameSettings[setting.id] = normalizeKeySetting(event.key, defaultGameSettings[setting.id]);
        input.value = gameSettings[setting.id];
        saveGameSettings();
      });
      input.addEventListener("change", () => {
        gameSettings[setting.id] = normalizeKeySetting(input.value, defaultGameSettings[setting.id]);
        input.value = gameSettings[setting.id];
        saveGameSettings();
      });
      item.append(name, input, description);
      return item;
    }

    function renderSettingsScreen() {
      const screen = document.createElement("div");
      const actions = document.createElement("div");
      const resetButton = document.createElement("button");

      screen.className = "settingsScreen";
      settingsControls.forEach((control) => screen.append(createSettingsItem(control)));
      settingsToggles.forEach((toggle) => screen.append(createSettingsToggle(toggle)));
      keySettings.forEach((setting) => screen.append(createKeySettingItem(setting)));
      actions.className = "settingsActions";
      resetButton.type = "button";
      resetButton.className = "settingsResetButton";
      resetButton.textContent = "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c";
      resetButton.addEventListener("click", () => {
        gameSettings = { ...defaultGameSettings };
        saveGameSettings();
        applyGameSettings();
        overlayContent.textContent = "";
        renderSettingsScreen();
      });
      actions.append(resetButton);
      screen.append(actions);
      overlayContent.append(screen);
    }

    function syncFullscreenSetting() {
      gameSettings.fullscreen = isFullscreenActive();
      saveGameSettings();

      const fullscreenInput = overlayContent.querySelector('input[data-setting-id="fullscreen"]');

      if (fullscreenInput) {
        fullscreenInput.checked = gameSettings.fullscreen;
      }
    }

    function showGameNotification(message, type = "info") {
      const holder = document.querySelector(".notificationStack") || document.createElement("div");
      const item = document.createElement("div");

      if (!holder.isConnected) {
        holder.className = "notificationStack";
        game.append(holder);
      }

      item.className = `notificationItem ${type}`.trim();
      item.textContent = message;
      holder.append(item);
      window.setTimeout(() => item.classList.add("visible"), 20);
      window.setTimeout(() => {
        item.classList.remove("visible");
        window.setTimeout(() => item.remove(), 220);
      }, 3200);
    }

    let overlayBackButton = null;

    function getOverlayBackButton() {
      if (overlayBackButton) {
        return overlayBackButton;
      }

      overlayBackButton = document.createElement("button");
      overlayBackButton.type = "button";
      overlayBackButton.className = "overlayBackButton";
      overlayBackButton.textContent = "Назад";
      overlayBackButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay();
      });
      overlayBackButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      game.append(overlayBackButton);
      return overlayBackButton;
    }

    function showOverlayBackButton(compact = false) {
      const button = getOverlayBackButton();

      button.classList.toggle("compact", compact);
      button.style.display = "block";
    }

    function hideOverlayBackButton() {
      if (overlayBackButton) {
        overlayBackButton.style.display = "none";
      }
    }

    function openOverlay(screenName) {
      overlayContent.textContent = "";
      if (screenName === "store") {
        setBackground("./img/angar.png");
      } else {
        setBackground("./img/angar.png");
      }
      screenOverlay.classList.toggle("fullscreenOverlay", screenName === "nation");
      screenOverlay.classList.add("active");
      showOverlayBackButton(screenName === "nation");

      if (screenName === "nation") {
        renderNationTechTreeScreen();
        return;
      }

      if (screenName === "events") {
        renderEventsScreen();
        return;
      }

      if (screenName === "profile") {
        renderProfileScreen();
        return;
      }

      if (screenName === "mode") {
        renderBattleModeScreen();
        return;
      }

      if (screenName === "trainingMap") {
        renderTrainingMapScreen();
        return;
      }

      if (screenName === "settings") {
        renderSettingsScreen();
        return;
      }

      if (screenName === "store") {
        renderStoreScreen();
        return;
      }

      if (screenName === "upgrade") {
        renderUpgradeScreen();
      }
    }

    function closeOverlay() {
      screenOverlay.classList.remove("active");
      screenOverlay.classList.remove("fullscreenOverlay");
      overlayContent.textContent = "";
      hideOverlayBackButton();
      setBackground("./img/angar.png");
    }

    tankBar.addEventListener("wheel", (event) => {
      if (tankBar.scrollWidth <= tankBar.clientWidth) {
        return;
      }

      event.preventDefault();
      tankBar.scrollLeft += event.deltaY || event.deltaX;
    }, { passive: false });

    function findTankById(id) {
      return loadedTanks.find((tank) => tank.id === normalizeNumber(id));
    }

    function getDeveloperTankData(id = developerTankId) {
      const tank = findTankById(id);

      if (!tank) {
        return null;
      }

      return {
        id: tank.id,
        name: tank.name,
        level: tank.level,
        nation: tank.nation,
        className: tank.className,
        experience: tank.experience,
        state: tank.state
      };
    }

    function logDeveloperTank(id = developerTankId) {
      const tankData = getDeveloperTankData(id);

      if (!tankData) {
        console.warn(`Tank with id = ${normalizeNumber(id)} was not found.`);
        if (loadedTanks.length <= fallbackTanks.length) {
          console.warn("data.csv is not loaded. Open the game through hosting/server with data.csv next to index.html.");
        }
        return null;
      }

      console.table(tankData);
      return tankData;
    }

    function refreshSelectedTank() {
      if (!selectedTank || selectedTank.state !== 2) {
        selectedTank = loadedTanks.find((tank) => tank.state === 2) || fallbackTanks[0];
      }

      renderHangarTankStats(selectedTank);
      setTankImage(hangarTank, selectedTank.name);
    }

    function refreshDeveloperChanges() {
      refreshSelectedTank();
      renderTopBar();
      renderTankBar(loadedTanks);
    }

    function requireDeveloperMode(commandName) {
      if (developerModeEnabled) {
        return true;
      }

      console.warn(`Developer mode is disabled. Enter first: dev("${developerModeKey}")`);
      return false;
    }

    function setDeveloperResource(resourceName, value) {
      if (!requireDeveloperMode(resourceName)) {
        return;
      }

      playerResources[resourceName] = normalizeNumber(value);
      setCookie(resourceName, playerResources[resourceName]);
      renderTopBar();
      console.log(`${resourceName} = ${playerResources[resourceName]}`);
    }

    function setDeveloperTankValue(valueName, value) {
      if (!requireDeveloperMode(valueName)) {
        return;
      }

      const tank = findTankById(developerTankId);

      if (!tank) {
        console.warn(`Tank with id = ${developerTankId} was not found.`);
        if (loadedTanks.length <= fallbackTanks.length) {
          console.warn("data.csv is not loaded. Open the game through hosting/server with data.csv next to index.html.");
        }
        return;
      }

      if (valueName === "state") {
        const defaultState = getDefaultTankState(tank);
        tank.state = tank.name === "\u041c\u0421-1" ? 2 : Math.max(normalizeTankState(value, tank.state), defaultState);
        setCookie(getTankStateCookieName(tank), tank.state);
      }

      if (valueName === "experience") {
        tank.experience = toEightDigits(value);
        setCookie(getTankExperienceCookieName(tank), tank.experience);
      }

      if (selectedTank?.id === tank.id) {
        selectedTank = tank;
      }

      refreshDeveloperChanges();
      console.log(`${tank.name}: ${valueName} = ${tank[valueName]}`);
    }

    function enableDeveloperMode(code) {
      if (code !== developerModeKey) {
        console.warn("Invalid developer code.");
        return false;
      }

      developerModeEnabled = true;
      console.log("Developer mode enabled.");
      console.log(`Loaded tanks: ${loadedTanks.length}`);
      console.log("Commands: id = 2; tankInfo(); tankById(2); state = 2; experience = 1500; gold = 999; silver = 100000; blueprints = 25;");
      return true;
    }

    function defineDeveloperConsoleProperty(name, descriptor) {
      try {
        Object.defineProperty(window, name, {
          configurable: true,
          ...descriptor
        });
        return true;
      } catch (error) {
        console.warn(`Could not install developer console command: ${name}`, error);
        return false;
      }
    }

    function installDeveloperConsoleCommands() {
      const api = {
        dev: enableDeveloperMode,
        resetAccount,
        tankInfo(idValue = developerTankId) {
          if (!requireDeveloperMode("tankInfo")) {
            return null;
          }

          return logDeveloperTank(idValue);
        },
        tankById(idValue) {
          if (!requireDeveloperMode("tankById")) {
            return null;
          }

          developerTankId = normalizeNumber(idValue);
          return logDeveloperTank(developerTankId);
        },
        setTankState(value) {
          setDeveloperTankValue("state", value);
        },
        setTankExperience(value) {
          setDeveloperTankValue("experience", value);
        },
        setGold(value) {
          setDeveloperResource("gold", value);
        },
        setSilver(value) {
          setDeveloperResource("silver", value);
        },
        setBlueprints(value) {
          setDeveloperResource("blueprints", value);
        },
        help() {
          console.log(`Developer mode: dev("${developerModeKey}")`);
          console.log("Short commands: id = 2; tankInfo(); tankById(2); state = 2; experience = 1500; gold = 999; silver = 100000; blueprints = 25;");
          console.log(`Fallback API: tw.dev("${developerModeKey}"); tw.tankById(2); tw.setTankState(2); tw.setTankExperience(1500); tw.setGold(999); tw.setSilver(100000); tw.setBlueprints(25);`);
          return true;
        }
      };

      defineDeveloperConsoleProperty("tw", { value: api });
      defineDeveloperConsoleProperty("tanksWarsDev", { value: api });
      defineDeveloperConsoleProperty("dev", { value: enableDeveloperMode });
      defineDeveloperConsoleProperty("resetAccount", { value: resetAccount });
      defineDeveloperConsoleProperty("tankInfo", { value: api.tankInfo });
      defineDeveloperConsoleProperty("tankById", { value: api.tankById });
      defineDeveloperConsoleProperty("devHelp", { value: api.help });

      defineDeveloperConsoleProperty("id", {
        get() {
          return developerTankId;
        },
        set(value) {
          if (!requireDeveloperMode("id")) {
            return;
          }

          developerTankId = normalizeNumber(value);
          logDeveloperTank(developerTankId);
        }
      });
      defineDeveloperConsoleProperty("tank", {
        get() {
          if (!requireDeveloperMode("tank")) {
            return null;
          }

          return getDeveloperTankData();
        }
      });
      defineDeveloperConsoleProperty("state", {
        get() {
          return findTankById(developerTankId)?.state;
        },
        set(value) {
          setDeveloperTankValue("state", value);
        }
      });
      defineDeveloperConsoleProperty("experience", {
        get() {
          return findTankById(developerTankId)?.experience;
        },
        set(value) {
          setDeveloperTankValue("experience", value);
        }
      });
      defineDeveloperConsoleProperty("gold", {
        get() {
          return playerResources.gold;
        },
        set(value) {
          setDeveloperResource("gold", value);
        }
      });
      defineDeveloperConsoleProperty("silver", {
        get() {
          return playerResources.silver;
        },
        set(value) {
          setDeveloperResource("silver", value);
        }
      });
      defineDeveloperConsoleProperty("blueprints", {
        get() {
          return playerResources.blueprints;
        },
        set(value) {
          setDeveloperResource("blueprints", value);
        }
      });

      return api;
    }

    function getStoredAccountKeys() {
      const keys = new Set([
        "playerProfile",
        "playerStats",
        "blueprints",
        "silver",
        "gold",
        victoryDayEvent.progressCookie,
        victoryDayEvent.claimedCookie,
        dailyRewardKey,
        dailyTasksKey
      ]);

      loadedTanks.forEach((tank) => {
        keys.add(getTankExperienceCookieName(tank));
        keys.add(getTankStateCookieName(tank));
        keys.add(getTankCrewCookieName(tank));
      });

      try {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);

          if (/^tank_\d+_(exp|state|crew)$/.test(key || "")) {
            keys.add(key);
          }
        }
      } catch (error) {
        console.warn("Local storage is unavailable.", error);
      }

      document.cookie.split("; ").forEach((cookie) => {
        const key = decodeURIComponent(cookie.split("=")[0] || "");

        if (/^tank_\d+_(exp|state|crew)$/.test(key)) {
          keys.add(key);
        }
      });

      return [...keys];
    }

    function resetAccount(skipConfirmation = false) {
      const confirmed = skipConfirmation === true
        || !window.confirm
        || window.confirm("Сбросить аккаунт Tanks Wars? Прогресс, валюта, профиль и статистика будут удалены.");

      if (!confirmed) {
        console.log("Account reset canceled.");
        return false;
      }

      getStoredAccountKeys().forEach(removeStoredValue);
      console.log("Account reset completed. Reloading...");
      window.location.reload();
      return true;
    }

    installDeveloperConsoleCommands();

    function createTopSlot(label, value, className = "") {
      const slot = document.createElement("div");
      const labelElement = document.createElement("div");
      const valueElement = document.createElement("div");

      slot.className = `topSlot ${className}`.trim();
      labelElement.className = "topLabel";
      valueElement.className = "topValue";
      labelElement.textContent = label;
      valueElement.textContent = value;
      slot.append(labelElement, valueElement);
      return slot;
    }

    function createBattleControlSlot() {
      const slot = document.createElement("div");
      const modeButton = document.createElement("button");
      const battleButton = document.createElement("button");

      slot.className = "topSlot battleControlSlot";
      modeButton.type = "button";
      modeButton.className = "modeButton";
      modeButton.textContent = `\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u0440\u0435\u0436\u0438\u043c: ${selectedBattleMode.title}`;
      battleButton.type = "button";
      battleButton.className = "battleLaunchButton";
      battleButton.textContent = selectedBattleMode.id === "training" ? "\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u043a\u0430\u0440\u0442\u0443" : "\u0412 \u0431\u043e\u0439";
      modeButton.addEventListener("click", () => openOverlay("mode"));
      battleButton.addEventListener("click", () => {
        if (selectedBattleMode.id === "training") {
          openOverlay("trainingMap");
          return;
        }

        startBattle();
      });
      slot.append(modeButton, battleButton);
      return slot;
    }

    function renderTopBar() {
      topBar.textContent = "";

      topBar.append(
        createTopSlot("Р§РµСЂС‚РµР¶Рё", playerResources.blueprints),
        createTopSlot("РћРїС‹С‚", selectedTank?.experience || 0),
        createTopSlot("", "Р’ Р±РѕР№", "battleButton"),
        createTopSlot("РЎРµСЂРµР±СЂРѕ", playerResources.silver),
        createTopSlot("Р—РѕР»РѕС‚Рѕ", playerResources.gold)
      );
    }

    function renderTopBar() {
      topBar.textContent = "";

      topBar.append(
        createTopSlot("\u0427\u0435\u0440\u0442\u0435\u0436\u0438", playerResources.blueprints),
        createTopSlot("\u041e\u043f\u044b\u0442", formatStoredNumber(selectedTank?.experience || 0)),
        createBattleControlSlot(),
        createTopSlot("\u0421\u0435\u0440\u0435\u0431\u0440\u043e", formatStoredNumber(playerResources.silver)),
        createTopSlot("\u0417\u043e\u043b\u043e\u0442\u043e", formatStoredNumber(playerResources.gold))
      );
    }

    function renderSideButtons() {
      sideButtons.textContent = "";

      sideButtonIcons.forEach((icon) => {
        const button = document.createElement("button");
        const image = document.createElement("img");

        button.className = "sideButton";
        button.type = "button";
        button.setAttribute("aria-label", icon.label);

        image.className = "sideButtonIcon";
        image.src = `./img/${icon.file}`;
        image.alt = "";
        image.onerror = () => image.remove();

        button.addEventListener("click", () => openOverlay(icon.screen));
        button.append(image);
        sideButtons.append(button);
      });
    }

    function getBattleImage(path, fallbackPath = "") {
      if (battleImages.has(path)) {
        return battleImages.get(path);
      }

      const image = new Image();

      if (fallbackPath) {
        image.onerror = () => {
          image.onerror = null;
          image.src = fallbackPath;
        };
      }

      image.src = path;
      battleImages.set(path, image);
      return image;
    }

    function resizeBattleCanvas() {
      const rect = battleCanvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;

      battleCanvas.width = Math.max(1, Math.floor(rect.width * scale));
      battleCanvas.height = Math.max(1, Math.floor(rect.height * scale));
      battleContext.setTransform(scale, 0, 0, scale, 0, 0);
    }

