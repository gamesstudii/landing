    function startBattle() {
      if (battleState.active) {
        return;
      }

      if (!battleModeIsAvailable(selectedBattleMode)) {
        selectedBattleMode = getAvailableBattleMode(selectedBattleMode);
        renderTopBar();
      }

      const playerTank = findLoadedTankByReference(selectedTank);
      const sameLevelTanks = loadedTanks.filter((tank) => tank.level === playerTank.level && tank.botEligible !== false);
      const sameLevelAlternatives = sameLevelTanks.filter((tank) => tank.name !== playerTank.name);
      const battlePool = sameLevelAlternatives.length > 0 ? sameLevelAlternatives : sameLevelTanks;
      const fallbackPool = fallbackTanks.filter((tank) => tank.level === playerTank.level);
      const pickTank = () => pickRandomTank(battlePool.length > 0 ? battlePool : fallbackPool.length > 0 ? fallbackPool : fallbackTanks);
      const survivalMode = selectedBattleMode.id === "survival";
      const trainingMode = selectedBattleMode.id === "training";

      closeOverlay();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      battleView.style.display = "block";
      battleBackButton.style.display = trainingMode ? "block" : "none";
      resizeBattleCanvas();
      battleState.mapPreset = pickBattleMapPreset();
      battleState.mapWidth = battleState.mapPreset.width || battleState.defaultMapWidth;
      battleState.mapHeight = battleState.mapPreset.height || battleState.defaultMapHeight;
      battleState.rivers = battleState.mapPreset.rivers;
      const battleSize = selectedBattleMode.size;
      const allySpawns = getTeamSpawnPoints("ally", survivalMode ? 1 : battleSize);
      const enemySpawns = getTeamSpawnPoints("enemy", survivalMode ? battleSize - 1 : battleSize);
      battleState.mapDetails = createBattleMapDetails();
      battleState.rocks = createBattleRocks();
      battleState.allies = [];
      battleState.enemies = [];
      battleState.player = createPlacedBattleTank(playerTank, allySpawns[0], false, "ally", playerProfile.username);
      battleState.allies.push(battleState.player);
      battleState.spectatorTarget = null;
      battleState.result = null;
      battleState.stats = createBattleStats();
      battleState.startedAt = performance.now();
      battleState.survivalElapsed = 0;
      battleState.survivalBuffLevel = 0;
      resetBattleTutorial();
      battleState.teamListVisible = true;
      battleState.artilleryMapView = false;
      battleState.fireHeld = false;
      battleResult.style.display = "none";
      battleResult.className = "";
      battleResult.replaceChildren();
      battleState.cursor.x = battleCanvas.clientWidth / 2;
      battleState.cursor.y = battleCanvas.clientHeight / 2;
      if (!survivalMode && !trainingMode) {
        allySpawns.slice(1).forEach((spawn) => {
          battleState.allies.push(createPlacedBattleTank(pickTank(), spawn, true, "ally"));
        });
      }
      if (!trainingMode) {
        enemySpawns.forEach((spawn, index) => {
          const team = survivalMode ? `survival_${index}` : "enemy";

          battleState.enemies.push(createPlacedBattleTank(pickTank(), spawn, true, team));
        });
      }
      battleState.baseCapture = {
        ...createCaptureState()
      };
      battleState.war = selectedBattleMode.id === "war" ? createWarState() : {
        controlPoints: [],
        bases: null,
        respawnDelay: 4
      };
      assignWarBotOrders();
      selectPlayerShell(battleState.player.shellAmmo.findIndex((count) => count > 0));
      if (!battleState.selectedShell) {
        selectPlayerShell(0);
        showGameNotification("Боекомплект пуст: пополните снаряды в ангаре", "warning");
      }
      updateSpotting();
      battleState.mouse.x = battleState.player.x + Math.cos(battleState.player.turretAngle) * 200;
      battleState.mouse.y = battleState.player.y + Math.sin(battleState.player.turretAngle) * 200;
      battleState.active = true;
      updateMobileControlsVisibility();
      battleState.lastTime = performance.now();
      battleState.animationFrame = requestAnimationFrame(battleLoop);
    }

    function shouldUseMobileControls() {
      if (mobileControlsMode === "mobile") {
        return true;
      }

      if (mobileControlsMode === "pc") {
        return false;
      }

      const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches === true;
      const noHover = window.matchMedia?.("(hover: none)")?.matches === true;
      const touchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;

      return coarsePointer || noHover || touchPoints > 0;
    }

    let mobileControlsPanel = null;
    const mobileControlPointers = new Map();
    const mobileControlKeyPressCounts = new Map();

    function mobileControlKeys(settingId, fallbacks = []) {
      return [gameSettings[settingId], defaultGameSettings[settingId], ...fallbacks]
        .filter(Boolean)
        .map((key) => String(key).toLowerCase());
    }

    function setMobileControlKeys(keys, pressed) {
      keys.forEach((key) => {
        const count = mobileControlKeyPressCounts.get(key) || 0;

        if (pressed) {
          mobileControlKeyPressCounts.set(key, count + 1);
          pressedKeys.add(key);
        } else if (count <= 1) {
          mobileControlKeyPressCounts.delete(key);
          pressedKeys.delete(key);
        } else {
          mobileControlKeyPressCounts.set(key, count - 1);
        }
      });
    }

    function createMobileControlButton(label, className, handlers) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = `mobileControlButton ${className || ""}`.trim();
      button.textContent = label;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.setPointerCapture?.(event.pointerId);
        handlers.down?.(event);
      });
      button.addEventListener("pointerup", (event) => {
        event.preventDefault();
        event.stopPropagation();
        handlers.up?.(event);
      });
      button.addEventListener("pointercancel", (event) => {
        event.preventDefault();
        event.stopPropagation();
        handlers.up?.(event);
      });
      button.addEventListener("lostpointercapture", (event) => {
        handlers.up?.(event);
      });
      button.addEventListener("contextmenu", (event) => event.preventDefault());

      return button;
    }

    function createMobileHoldButton(label, className, settingId, fallbacks = []) {
      return createMobileControlButton(label, className, {
        down(event) {
          const keys = mobileControlKeys(settingId, fallbacks);

          mobileControlPointers.set(event.pointerId, keys);
          setMobileControlKeys(keys, true);
        },
        up(event) {
          const keys = mobileControlPointers.get(event.pointerId);

          if (!keys) {
            return;
          }

          mobileControlPointers.delete(event.pointerId);
          setMobileControlKeys(keys, false);
        }
      });
    }

    function releaseMobileControlPointers() {
      mobileControlPointers.forEach((keys) => setMobileControlKeys(keys, false));
      mobileControlPointers.clear();
      mobileControlKeyPressCounts.clear();
      battleState.fireHeld = false;
    }

    function ensureMobileControlsPanel() {
      if (mobileControlsPanel) {
        return mobileControlsPanel;
      }

      const panel = document.createElement("div");
      const movement = document.createElement("div");
      const turret = document.createElement("div");
      const actions = document.createElement("div");
      const shells = document.createElement("div");

      panel.id = "mobileControlsPanel";
      panel.setAttribute("aria-label", "Mobile battle controls");
      movement.className = "mobileControlGroup mobileMoveControls";
      turret.className = "mobileControlGroup mobileTurretControls";
      actions.className = "mobileControlGroup mobileActionControls";
      shells.className = "mobileControlGroup mobileShellControls";

      movement.append(
        createMobileHoldButton("▲", "mobileForwardButton", "keyForward", ["w", "ц"]),
        createMobileHoldButton("◀", "mobileLeftButton", "keyLeft", ["a", "ф"]),
        createMobileHoldButton("▼", "mobileBackwardButton", "keyBackward", ["s", "ы"]),
        createMobileHoldButton("▶", "mobileRightButton", "keyRight", ["d", "в"])
      );
      turret.append(
        createMobileHoldButton("↺", "", "keyTurretLeft", ["q", "й"]),
        createMobileHoldButton("↻", "", "keyTurretRight", ["e", "у"])
      );
      actions.append(
        createMobileControlButton("Огонь", "mobileFireButton", {
          down() {
            if (!battleState.active) {
              return;
            }

            battleState.fireHeld = shellIsFire(battleState.selectedShell);
            firePlayerShell();
          },
          up() {
            battleState.fireHeld = false;
          }
        }),
        createMobileControlButton("Рем", "", { down: usePlayerRepairKit }),
        createMobileControlButton("Пож", "", { down: usePlayerExtinguisher }),
        createMobileControlButton("×1", "", { down: togglePlayerClipFireMode }),
        createMobileControlButton("Карта", "", {
          down() {
            if (tankIsAlive(battleState.player) && tankIsArtillery(battleState.player)) {
              battleState.artilleryMapView = !battleState.artilleryMapView;
            }
          }
        })
      );
      [1, 2, 3].forEach((shellNumber) => {
        shells.append(createMobileControlButton(String(shellNumber), "", {
          down() {
            selectPlayerShell(shellNumber - 1);
          }
        }));
      });

      panel.append(movement, turret, shells, actions);
      battleView.append(panel);
      mobileControlsPanel = panel;

      return panel;
    }

    function updateMobileControlsVisibility() {
      const panel = ensureMobileControlsPanel();
      const visible = battleState.active && shouldUseMobileControls();

      panel.classList.toggle("isVisible", visible);
      panel.setAttribute("aria-hidden", visible ? "false" : "true");
      if (!visible) {
        releaseMobileControlPointers();
      }
    }

    function startTestDriveBattle() {
      const previousMode = selectedBattleMode;

      battleState.testDrive = true;
      battleState.previousBattleMode = previousMode;
      selectedBattleMode = battleModes.find((mode) => mode.id === "duel") || previousMode;
      startBattle();
      showGameNotification("Тест-драйв: награды и прогресс отключены", "warning");
    }

    function applyAbandonedBattleResult() {
      if (
        !battleState.stats
        || battleState.result
        || battleState.testDrive
        || selectedBattleMode.id === "training"
      ) {
        return;
      }

      applyBattleRewards("defeat");
      showGameNotification("Бой засчитан как поражение", "warning");
    }

    function stopBattle() {
      const previousBattleMode = battleState.previousBattleMode;

      applyAbandonedBattleResult();
      battleState.active = false;
      cancelAnimationFrame(battleState.animationFrame);
      battleView.style.display = "none";
      battleState.allies = [];
      battleState.enemies = [];
      battleState.projectiles = [];
      battleState.player = null;
      battleState.spectatorTarget = null;
      battleState.result = null;
      battleState.stats = null;
      battleState.testDrive = false;
      battleState.previousBattleMode = null;
      battleState.selectedShellIndex = 0;
      battleState.selectedShell = null;
      battleState.mapPreset = null;
      battleState.mapWidth = battleState.defaultMapWidth;
      battleState.mapHeight = battleState.defaultMapHeight;
      battleState.teamListVisible = true;
      battleState.artilleryMapView = false;
      battleState.fireHeld = false;
      battleState.tutorial = {
        enabled: false,
        battleNumber: 0,
        hidden: false,
        moved: false,
        aimed: false,
        fired: false,
        changedShell: false,
        dealtDamage: false,
        capturedBase: false
      };
      battleState.baseCapture = {
        ...createCaptureState()
      };
      battleState.war = {
        controlPoints: [],
        bases: null,
        respawnDelay: 4
      };
      battleAmmoPanel.replaceChildren();
      battleAmmoPanel.style.display = "none";
      battleBackButton.style.display = "none";
      reloadIndicator.style.display = "none";
      battleResult.style.display = "none";
      battleResult.className = "";
      battleResult.replaceChildren();
      pressedKeys.clear();
      updateMobileControlsVisibility();

      if (previousBattleMode) {
        selectedBattleMode = previousBattleMode;
        renderTopBar();
      }
    }

    window.addEventListener("keydown", (event) => {
      if (!battleState.active) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.key === " ") {
        event.preventDefault();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        switchSpectatorTarget(event.key === "ArrowRight" ? 1 : -1);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        if (!event.repeat) {
          battleState.teamListVisible = !battleState.teamListVisible;
        }
        return;
      }

      if (key === "h" || key === "р") {
        event.preventDefault();
        if (!event.repeat && battleState.tutorial.enabled) {
          battleState.tutorial.hidden = !battleState.tutorial.hidden;
        }
        return;
      }

      if (["1", "2", "3"].includes(key)) {
        event.preventDefault();
        selectPlayerShell(Number.parseInt(key, 10) - 1);
        return;
      }

      if (key === "4") {
        event.preventDefault();
        usePlayerRepairKit();
        return;
      }

      if (key === "5") {
        event.preventDefault();
        usePlayerExtinguisher();
        return;
      }

      if (key === "6") {
        event.preventDefault();
        togglePlayerClipFireMode();
        return;
      }

      if (key === gameSettings.keyArtilleryView || key === "g" || key === "\u043f") {
        event.preventDefault();
        if (!event.repeat && tankIsAlive(battleState.player) && tankIsArtillery(battleState.player)) {
          battleState.artilleryMapView = !battleState.artilleryMapView;
        }
        return;
      }

      if ([
        gameSettings.keyForward,
        gameSettings.keyBackward,
        gameSettings.keyLeft,
        gameSettings.keyRight,
        gameSettings.keyTurretLeft,
        gameSettings.keyTurretRight,
        "w",
        "a",
        "s",
        "d",
        "q",
        "e",
        "ц",
        "ф",
        "ы",
        "в",
        "й",
        "у"
      ].includes(key)) {
        event.preventDefault();
        pressedKeys.add(key);
      }
    });

    window.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.key.toLowerCase());
    });

    battleView.addEventListener("pointermove", (event) => {
      if (!battleState.active) {
        return;
      }

      if (shouldUseMobileControls()) {
        return;
      }

      const rect = battleCanvas.getBoundingClientRect();

      battleState.cursor.x = event.clientX - rect.left;
      battleState.cursor.y = event.clientY - rect.top;
      battleState.mouse.x = (battleState.cursor.x - battleState.camera.offsetX) / battleState.camera.scale + battleState.camera.x;
      battleState.mouse.y = (battleState.cursor.y - battleState.camera.offsetY) / battleState.camera.scale + battleState.camera.y;
      if (battleState.tutorial.enabled) {
        battleState.tutorial.aimed = true;
      }
    });

    battleCanvas.addEventListener("pointerdown", (event) => {
      if (!battleState.active || event.button !== 0) {
        return;
      }

      event.preventDefault();
      if (shouldUseMobileControls()) {
        return;
      }

      battleState.fireHeld = shellIsFire(battleState.selectedShell);
      firePlayerShell();
    });

    window.addEventListener("pointerup", () => {
      battleState.fireHeld = false;
    });

    battleView.addEventListener("pointerleave", () => {
      battleState.fireHeld = false;
    });

    window.addEventListener("resize", () => {
      if (battleState.active) {
        resizeBattleCanvas();
      }
    });

    battleBackButton.addEventListener("click", stopBattle);
    document.addEventListener("click", () => {
      if (!tankFiltersOpen) {
        return;
      }

      tankFiltersOpen = false;
      renderTankFilters();
    });
    document.addEventListener("fullscreenchange", syncFullscreenSetting);
    document.addEventListener("webkitfullscreenchange", syncFullscreenSetting);

    async function startGame() {
      if (gameStarted) {
        return;
      }

      gameStarted = true;
      setBackground("./img/angar/angar.png");
      game.classList.add("playing");
      loadGameSettings();
      applyGameSettings();
      loadPlayerResources();
      const juneFourthGoldClaimed = claimJuneFourthLoginGold();
      loadPlayerProfile();
      loadPlayerStats();

      loadedTanks = await loadTankRows();
      const availableTanks = loadedTanks.filter((tank) => tank.state === 2 && tankIsAvailableInCurrentMode(tank));
      selectedTank = availableTanks[0] || fallbackTanks[0];
      renderHangarTankStats(selectedTank);
      setTankImage(hangarTank, selectedTank.name);
      renderTopBar();
      renderSideButtons();
      renderTankFilters();
      renderTankBar(loadedTanks);
      if (juneFourthGoldClaimed) {
        showGameNotification("Подарок за вход 4 июня: +500 золота", "success");
      }
    }

    function showNextLoadingFrame() {
      if (gameStarted) {
        return;
      }

      setBackground(loadingFrames[frameIndex]);
      frameIndex = (frameIndex + 1) % loadingFrames.length;
      loadingFrameTimer = setTimeout(showNextLoadingFrame, frameDelay);
    }

    function wait(delay) {
      return new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }

    function handleImageLoad(event) {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.remove("imageLoadFailed");
      }
    }

    function handleImageLoadError(event) {
      if (event.target instanceof HTMLImageElement) {
        event.target.classList.add("imageLoadFailed");
      }
    }

    async function waitForYandexSdkAndStartGame() {
      showNextLoadingFrame();

      if (!isYandexGamesServer()) {
        clearTimeout(loadingFrameTimer);
        await startGame();
        return;
      }

      while (!window.ysdk) {
        try {
          await initializeYandexGamesSdk();
        } catch (error) {
          await wait(frameDelay);
        }
      }

      clearTimeout(loadingFrameTimer);
      await startGame();
    }

    waitForYandexSdkAndStartGame();

    document.addEventListener("load", handleImageLoad, true);
    document.addEventListener("error", handleImageLoadError, true);

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    document.addEventListener("selectstart", (event) => {
      event.preventDefault();
    });

    document.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    document.querySelectorAll("img").forEach((image) => {
      image.draggable = false;
    });

    document.addEventListener('mousedown', function(e) {
      if (e.button === 0 && battleState.active && e.target === battleCanvas) {
        e.preventDefault();
      }
    });


    document.addEventListener('mousemove', function(e) {
      if (battleState.active && e.buttons === 1 && e.target === battleCanvas) {
         document.body.style.userSelect = 'none';
         document.body.style.webkitUserSelect = 'none';
      }
    });

