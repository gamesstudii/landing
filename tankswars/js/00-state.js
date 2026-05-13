    const game = document.querySelector("#game");
    const topBar = document.querySelector("#topBar");
    const sideButtons = document.querySelector("#sideButtons");
    const searchSlot = document.querySelector("#searchSlot");
    const statsPanel = document.querySelector("#statsPanel");
    const tankBar = document.querySelector("#tankBar");
    const hangarTank = document.querySelector("#hangarTank");
    const screenOverlay = document.querySelector("#screenOverlay");
    const overlayContent = document.querySelector("#overlayContent");
    const backButton = document.querySelector("#backButton");
    const battleView = document.querySelector("#battleView");
    const battleCanvas = document.querySelector("#battleCanvas");
    const battleAmmoPanel = document.querySelector("#battleAmmoPanel");
    const reloadIndicator = document.querySelector("#reloadIndicator");
    const battleResult = document.querySelector("#battleResult");
    const battleBackButton = document.querySelector("#battleBackButton");
    const battleContext = battleCanvas.getContext("2d");
    const loadingFrames = [
      "./img/loading0.png",
      "./img/loading1.png",
      "./img/loading2.png",
      "./img/loading3.png"
    ];

    const frameDelay = 1000;
    const containerTankDropChance = 0.05;
    const containerGoldPrice = 500;
    const containerPrizeCount = 3;
    const duplicateTankGoldReward = 5000;
    const adGoldReward = 100;
    const victoryDayEvent = {
      progressCookie: "victory_day_2026_wins",
      claimedCookie: "victory_day_2026_claimed",
      rewardTankId: 86,
      requiredWins: 50,
      month: 4,
      fromDay: 7,
      toDay: 15,
      modeIds: ["commander", "war"]
    };
    const developerModeKey = "ujfgav8b6rvcb75av5tva7sr4av4456w*/va5*4w-bva4/-4gb-w89`7`9y7fhg9a";
    const projectileSpeed = 1120;
    const baseCaptureDuration = 50;
    const warPointCaptureDuration = 10;
    const baseCaptureTankMultiplier = 1.5;
    const movementStepPixels = 7;
    const defaultGameSettings = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      battleUiScale: 100,
      showHealthBars: true,
      showTeamMarkers: true,
      showReloadIndicator: true,
      showBattleResultPanel: true,
      fullscreen: false
    };
    const battleModes = [
      {
        id: "company",
        title: "\u0420\u043e\u0442\u043d\u044b\u0439 \u0431\u043e\u0439",
        size: 7,
        image: "./img/rezimi/rotniy.png",
        description: "\u0411\u043e\u043b\u044c\u0448\u043e\u0435 \u0441\u0440\u0430\u0436\u0435\u043d\u0438\u0435 7 \u043d\u0430 7: \u043c\u043d\u043e\u0433\u043e \u0446\u0435\u043b\u0435\u0439, \u0434\u043e\u043b\u0433\u0438\u0439 \u043e\u0431\u043c\u0435\u043d \u043e\u0433\u043d\u0435\u043c \u0438 \u0440\u0435\u0448\u0430\u044e\u0449\u0430\u044f \u0440\u043e\u043b\u044c \u043a\u043e\u043c\u0430\u043d\u0434\u044b."
      },
      {
        id: "platoon",
        title: "\u0412\u0437\u0432\u043e\u0434\u043d\u044b\u0439 \u0431\u043e\u0439",
        size: 5,
        image: "./img/rezimi/vzvodniy.png",
        description: "\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 5 \u043d\u0430 5: \u0431\u044b\u0441\u0442\u0440\u0435\u0435 \u0440\u043e\u0442\u043d\u043e\u0433\u043e, \u043d\u043e \u0441 \u043c\u0435\u0441\u0442\u043e\u043c \u0434\u043b\u044f \u043c\u0430\u043d\u0435\u0432\u0440\u0430."
      },
      {
        id: "duel",
        title: "\u0414\u0443\u044d\u043b\u044c",
        size: 1,
        image: "./img/rezimi/duel.png",
        description: "\u0427\u0438\u0441\u0442\u0430\u044f \u0441\u0445\u0432\u0430\u0442\u043a\u0430 1 \u043d\u0430 1: \u0442\u043e\u043b\u044c\u043a\u043e \u0442\u044b, \u0432\u0440\u0430\u0433 \u0438 \u043e\u0448\u0438\u0431\u043a\u0438, \u0437\u0430 \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0441\u0440\u0430\u0437\u0443 \u043f\u043b\u0430\u0442\u044f\u0442."
      },
      {
        id: "commander",
        title: "\u041e\u0445\u043e\u0442\u0430 \u043d\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0438\u0440\u0430",
        size: 7,
        image: "./img/rezimi/commander.png",
        description: "\u041e\u0441\u043e\u0431\u044b\u0439 \u0431\u043e\u0439 7 \u043d\u0430 7: \u043d\u0430\u0439\u0434\u0438\u0442\u0435 \u0438 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u044c\u0442\u0435 \u0432\u0440\u0430\u0436\u0435\u0441\u043a\u043e\u0433\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u0438\u0440\u0430. \u0422\u0432\u043e\u0439 \u0442\u0430\u043d\u043a \u0442\u043e\u0436\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u0438\u0440, \u0435\u0433\u043e \u043f\u043e\u0442\u0435\u0440\u044f \u043e\u0437\u043d\u0430\u0447\u0430\u0435\u0442 \u043f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435."
      },
      {
        id: "war",
        title: "\u0412\u043e\u0439\u043d\u0430",
        size: 15,
        image: "./img/rezimi/war.png",
        description: "\u041c\u0430\u0441\u0448\u0442\u0430\u0431\u043d\u044b\u0439 \u0431\u043e\u0439 15 \u043d\u0430 15: \u0437\u0430\u0445\u0432\u0430\u0442\u0438\u0442\u0435 4 \u0442\u043e\u0447\u043a\u0438, \u0437\u0430\u0442\u0435\u043c \u0431\u0430\u0437\u0443 \u0432\u0440\u0430\u0433\u0430. \u0422\u0430\u043d\u043a\u0438 \u0432\u043e\u0437\u0440\u043e\u0436\u0434\u0430\u044e\u0442\u0441\u044f \u0434\u043e \u043f\u043e\u0431\u0435\u0434\u044b."
      }
    ];
    const playerResources = {
      blueprints: 0,
      silver: 0,
      gold: 0
    };
    const defaultPlayerProfile = {
      username: "\u0422\u0430\u043d\u043a\u0438\u0441\u0442",
      id: ""
    };
    const defaultPlayerStats = {
      battles: 0,
      victories: 0,
      defeats: 0,
      damage: 0,
      kills: 0,
      shots: 0,
      hits: 0,
      baseCapture: 0,
      experience: 0,
      silver: 0,
      tanks: {}
    };
    let playerProfile = { ...defaultPlayerProfile };
    let playerStats = { ...defaultPlayerStats, tanks: {} };
    const sideButtonIcons = [
      { file: "nation.png", label: "\u041d\u0430\u0446\u0438\u044f", screen: "nation" },
      { file: "upgrade.png", label: "\u0423\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u044f", screen: "upgrade" },
      { file: "store.png", label: "\u041c\u0430\u0433\u0430\u0437\u0438\u043d", screen: "store" },
      { file: "pofile.png", label: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c", screen: "profile" },
      { file: "settions.png", label: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438", screen: "settings" },
      { file: "events.png", label: "\u0421\u043e\u0431\u044b\u0442\u0438\u044f", screen: "events" }
    ];
    let selectedTank = null;
    let loadedTanks = [];
    let tankFiltersOpen = false;
    const tankBarFilters = {
      nation: "all",
      level: "all",
      type: "all",
      className: "all"
    };
    let developerModeEnabled = false;
    let developerTankId = 1;
    let selectedBattleMode = battleModes[0];
    let selectedTechTreeNation = "СССР";
    let gameSettings = { ...defaultGameSettings };
    let yandexSdkPromise = null;
    let tabActivityCheckInitialized = false;
    const yandexGamesHostPattern = /(^|\.)yandex\.(ru|com|by|kz|uz|com\.tr)$/;
    const yandexGamesAssetHostPattern = /(^|\.)yandex\.net$/;
    const pressedKeys = new Set();
    const battleImages = new Map();
    const battleState = {
      active: false,
      lastTime: 0,
      animationFrame: 0,
      mapWidth: 2400,
      mapHeight: 1600,
      defaultMapWidth: 2400,
      defaultMapHeight: 1600,
      player: null,
      spectatorTarget: null,
      result: null,
      allies: [],
      enemies: [],
      projectiles: [],
      camera: { x: 0, y: 0, scale: 1, offsetX: 0, offsetY: 0 },
      mouse: { x: 0, y: 0 },
      cursor: { x: 0, y: 0 },
      selectedShellIndex: 0,
      selectedShell: null,
      teamListVisible: true,
      artilleryMapView: false,
      fireHeld: false,
      stats: null,
      baseCapture: {
        owner: null,
        team: null,
        progress: 0,
        allyCount: 0,
        enemyCount: 0
      },
      war: {
        controlPoints: [],
        bases: null,
        respawnDelay: 4
      },
      tutorial: {
        enabled: false,
        battleNumber: 0,
        hidden: false,
        moved: false,
        aimed: false,
        fired: false,
        changedShell: false,
        dealtDamage: false,
        capturedBase: false
      },
      rocks: [],
      mapPreset: null,
      mapDetails: null,
      rivers: [
        {
          width: 86,
          points: [
            { x: -80, y: 220 },
            { x: 230, y: 300 },
            { x: 520, y: 250 },
            { x: 810, y: 390 },
            { x: 1120, y: 520 },
            { x: 1430, y: 470 },
            { x: 1720, y: 650 },
            { x: 2050, y: 740 },
            { x: 2480, y: 690 }
          ]
        },
        {
          width: 110,
          points: [
            { x: 350, y: 1680 },
            { x: 470, y: 1370 },
            { x: 720, y: 1220 },
            { x: 980, y: 1280 },
            { x: 1230, y: 1110 },
            { x: 1520, y: 1180 },
            { x: 1810, y: 1060 },
            { x: 2130, y: 1210 },
            { x: 2480, y: 1160 }
          ]
        }
      ]
    };
    const fallbackTanks = [
      { id: 1, name: "\u041c\u0421-1", level: "1", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 2 },
      { id: 2, name: "\u0411\u0422-2", level: "2", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 },
      { id: 3, name: "\u0410\u0422-1", level: "2", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 },
      { id: 4, name: "\u041b\u0422\u041f", level: "3", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 },
      { id: 5, name: "\u0411\u0422-7\u041c", level: "3", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 },
      { id: 6, name: "\u0421\u0423-76", level: "3", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 },
      { id: 7, name: "\u0422-28", level: "3", nation: "\u0421\u0421\u0421\u0420", experience: "00000000", state: 0 }
    ];
    let frameIndex = 0;
    let loadingFrameTimer = 0;
    let gameStarted = false;

