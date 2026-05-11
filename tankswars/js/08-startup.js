    function startBattle() {
      if (!battleModeIsAvailable(selectedBattleMode)) {
        selectedBattleMode = getAvailableBattleMode(selectedBattleMode);
        renderTopBar();
      }

      const playerTank = findLoadedTankByReference(selectedTank);
      const sameLevelTanks = loadedTanks.filter((tank) => tank.level === playerTank.level);
      const sameLevelAlternatives = sameLevelTanks.filter((tank) => tank.name !== playerTank.name);
      const battlePool = sameLevelAlternatives.length > 0 ? sameLevelAlternatives : sameLevelTanks;
      const fallbackPool = fallbackTanks.filter((tank) => tank.level === playerTank.level);
      const pickTank = () => pickRandomTank(battlePool.length > 0 ? battlePool : fallbackPool.length > 0 ? fallbackPool : fallbackTanks);

      closeOverlay();
      battleView.style.display = "block";
      battleBackButton.style.display = "none";
      resizeBattleCanvas();
      battleState.mapPreset = pickBattleMapPreset();
      battleState.mapWidth = battleState.mapPreset.width || battleState.defaultMapWidth;
      battleState.mapHeight = battleState.mapPreset.height || battleState.defaultMapHeight;
      battleState.rivers = battleState.mapPreset.rivers;
      const battleSize = selectedBattleMode.size;
      const allySpawns = getTeamSpawnPoints("ally", battleSize);
      const enemySpawns = getTeamSpawnPoints("enemy", battleSize);
      battleState.mapDetails = createBattleMapDetails();
      battleState.rocks = createBattleRocks();
      battleState.allies = [];
      battleState.enemies = [];
      battleState.player = createPlacedBattleTank(playerTank, allySpawns[0], false, "ally", playerProfile.username);
      battleState.allies.push(battleState.player);
      battleState.spectatorTarget = null;
      battleState.result = null;
      battleState.stats = createBattleStats();
      resetBattleTutorial();
      battleState.teamListVisible = true;
      battleState.artilleryMapView = false;
      battleResult.style.display = "none";
      battleResult.className = "";
      battleResult.replaceChildren();
      battleState.cursor.x = battleCanvas.clientWidth / 2;
      battleState.cursor.y = battleCanvas.clientHeight / 2;
      allySpawns.slice(1).forEach((spawn) => {
        battleState.allies.push(createPlacedBattleTank(pickTank(), spawn, true, "ally"));
      });
      enemySpawns.forEach((spawn) => {
        battleState.enemies.push(createPlacedBattleTank(pickTank(), spawn, true, "enemy"));
      });
      battleState.baseCapture = {
        ...createCaptureState()
      };
      battleState.war = selectedBattleMode.id === "war" ? createWarState() : {
        controlPoints: [],
        bases: null,
        respawnDelay: 4
      };
      assignWarBotOrders();
      selectPlayerShell(0);
      updateSpotting();
      battleState.mouse.x = battleState.player.x + Math.cos(battleState.player.turretAngle) * 200;
      battleState.mouse.y = battleState.player.y + Math.sin(battleState.player.turretAngle) * 200;
      battleState.active = true;
      battleState.lastTime = performance.now();
      battleState.animationFrame = requestAnimationFrame(battleLoop);
    }

    function stopBattle() {
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
      battleState.selectedShellIndex = 0;
      battleState.selectedShell = null;
      battleState.mapPreset = null;
      battleState.mapWidth = battleState.defaultMapWidth;
      battleState.mapHeight = battleState.defaultMapHeight;
      battleState.teamListVisible = true;
      battleState.artilleryMapView = false;
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
    }

    window.addEventListener("keydown", (event) => {
      if (!battleState.active) {
        return;
      }

      const key = event.key.toLowerCase();

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
        togglePlayerClipFireMode();
        return;
      }

      if (key === "g" || key === "\u043f") {
        event.preventDefault();
        if (!event.repeat && tankIsAlive(battleState.player) && tankIsArtillery(battleState.player)) {
          battleState.artilleryMapView = !battleState.artilleryMapView;
        }
        return;
      }

      if (["w", "a", "s", "d", "q", "e", "ц", "ф", "ы", "в", "й", "у"].includes(key)) {
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
      firePlayerShell();
    });

    window.addEventListener("resize", () => {
      if (battleState.active) {
        resizeBattleCanvas();
      }
    });

    battleBackButton.addEventListener("click", stopBattle);
    document.addEventListener("fullscreenchange", syncFullscreenSetting);
    document.addEventListener("webkitfullscreenchange", syncFullscreenSetting);

    async function startGame() {
      if (gameStarted) {
        return;
      }

      gameStarted = true;
      setBackground("./img/angar.png");
      game.classList.add("playing");
      loadGameSettings();
      applyGameSettings();
      loadPlayerResources();
      loadPlayerProfile();
      loadPlayerStats();

      loadedTanks = await loadTankRows();
      const availableTanks = loadedTanks.filter((tank) => tank.state === 2);
      selectedTank = availableTanks[0] || fallbackTanks[0];
      renderHangarTankStats(selectedTank);
      setTankImage(hangarTank, selectedTank.name);
      renderTopBar();
      renderSideButtons();
      renderTankBar(loadedTanks);
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

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
    document.addEventListener('mousedown', function(e) {
      if (e.button === 0) {
        e.preventDefault();
      }
    });


    document.addEventListener('mousemove', function(e) {
      if (e.buttons === 1) { // Если ЛКМ зажата
         document.body.style.userSelect = 'none';
         document.body.style.webkitUserSelect = 'none';
      }
    });

