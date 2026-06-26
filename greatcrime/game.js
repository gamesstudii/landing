(function () {
  const canvas = document.getElementById("scene");
  const minimap = document.getElementById("minimap");
  const minimapCtx = minimap.getContext("2d");
  const districtText = document.getElementById("district");
  const speedText = document.getElementById("speed");
  const missionText = document.getElementById("mission");
  const subtitleText = document.getElementById("subtitle");
  const prompt = document.getElementById("prompt");

  if (!window.THREE) {
    document.body.innerHTML =
      '<div style="padding:24px;color:white;font:16px system-ui">Не удалось загрузить Three.js. Запусти игру через локальный сервер и проверь интернет.</div>';
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb5c0bd);
  scene.fog = new THREE.Fog(0xb5c0bd, 90, 520);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 900);
  const clock = new THREE.Clock();

  const worldSize = 520;
  const seaLine = -166;
  const playerRadius = 1.35;
  const roads = [];
  const missionMarkers = [];
  const minimapObjects = [];
  const colliders = [];
  const pedestrians = [];
  const vehicles = [];
  const missionActors = [];
  const keys = new Set();
  const day = {
    time: 8.2,
    sun: null,
    hemi: null,
  };

  const player = {
    position: new THREE.Vector3(-232, 1.75, 228),
    velocity: new THREE.Vector3(),
    yaw: Math.PI * 0.24,
    pitch: 0,
    headBob: 0,
    currentMission: 1,
    money: 0,
  };

  const missionOne = {
    active: true,
    step: 0,
    target: { x: -198, z: 218 },
    enemies: [],
    combatReady: false,
    completed: false,
    title: "Красный Берег",
  };

  const materials = {
    asphalt: texturedMat(0x25282a, 0.92, "asphalt", 10),
    oldAsphalt: texturedMat(0x303030, 0.96, "asphalt", 8),
    concrete: texturedMat(0x8e8a7f, 0.84, "concrete", 6),
    curb: texturedMat(0xb5b0a2, 0.88, "concrete", 5),
    whitePaint: new THREE.MeshBasicMaterial({ color: 0xe8e1ce }),
    door: mat(0x3d2b23, 0.78),
    balcony: mat(0x4a5357, 0.76),
    awning: mat(0x9f2f2a, 0.7),
    containerBlue: mat(0x2f5c7a, 0.86),
    containerRed: mat(0x8f332b, 0.86),
    plaster: texturedMat(0xc4b79d, 0.82, "plaster", 4),
    panel: texturedMat(0xada894, 0.9, "panel", 5),
    brick: texturedMat(0x8b4032, 0.86, "brick", 5),
    roof: texturedMat(0x633a2e, 0.8, "roof", 4),
    glass: new THREE.MeshStandardMaterial({ color: 0x72909d, roughness: 0.28, metalness: 0.12 }),
    grass: texturedMat(0x506c40, 0.96, "grass", 18),
    dryGrass: texturedMat(0x8a814c, 0.96, "grass", 14),
    sea: new THREE.MeshStandardMaterial({ color: 0x275f75, roughness: 0.38, metalness: 0.04 }),
    port: texturedMat(0x4f5552, 0.9, "metalPanels", 4),
    metal: new THREE.MeshStandardMaterial({ color: 0x6b7473, roughness: 0.42, metalness: 0.28 }),
    prison: texturedMat(0x5b615c, 0.92, "concrete", 4),
    wire: mat(0x2c3132, 0.66),
    skin: mat(0xb98b67, 0.72),
    coat: mat(0x26313a, 0.78),
    denim: mat(0x243f63, 0.82),
    shoe: mat(0x161718, 0.86),
    headlight: new THREE.MeshStandardMaterial({ color: 0xfff1bd, emissive: 0xffd56b, emissiveIntensity: 0.6 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xae1c1c, emissive: 0x8c0e0e, emissiveIntensity: 0.45 }),
    indicator: new THREE.MeshStandardMaterial({ color: 0xd88522, emissive: 0x9e560d, emissiveIntensity: 0.35 }),
    license: new THREE.MeshBasicMaterial({ color: 0xe6e2cf }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffb23c, emissiveIntensity: 0.35 }),
    yellow: mat(0xd0a13c, 0.72),
    mission: new THREE.MeshStandardMaterial({
      color: 0xffc94a,
      emissive: 0xb36d00,
      emissiveIntensity: 0.8,
      roughness: 0.42,
    }),
  };

  init();
  animate();

  function init() {
    addLights();
    addTerrain();
    addSeaAndHarbor();
    addRoadNetwork();
    addDistricts();
    addLandmarks();
    addMissionOneScene();
    addMissionMarkers();
    addAtmosphereProps();
    bindInput();
    startMissionOne();
    resize();
  }

  function addLights() {
    day.hemi = new THREE.HemisphereLight(0xdde7e9, 0x373323, 2.1);
    scene.add(day.hemi);

    day.sun = new THREE.DirectionalLight(0xffe0af, 3.8);
    day.sun.position.set(-125, 165, 90);
    day.sun.castShadow = true;
    day.sun.shadow.mapSize.set(4096, 4096);
    day.sun.shadow.camera.left = -310;
    day.sun.shadow.camera.right = 310;
    day.sun.shadow.camera.top = 310;
    day.sun.shadow.camera.bottom = -310;
    day.sun.shadow.bias = -0.00018;
    day.sun.shadow.normalBias = 0.035;
    scene.add(day.sun);
  }

  function addTerrain() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), materials.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = 20;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function addSeaAndHarbor() {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(worldSize * 1.45, 235), materials.sea);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.04, seaLine - 96);
    sea.receiveShadow = true;
    scene.add(sea);

    addPier(-138, seaLine - 34, 78, 18);
    addPier(0, seaLine - 42, 110, 20);
    addPier(142, seaLine - 34, 72, 18);
    addWaterfrontDetails();

    for (const x of [-154, -114, -74, 42, 86, 130]) {
      const crane = new THREE.Group();
      const mast = box(3, 34, 3, materials.yellow, x, 17, seaLine - 54);
      const arm = box(38, 3, 3, materials.yellow, x + 12, 35, seaLine - 54);
      const hook = box(2, 11, 2, materials.metal, x + 30, 27, seaLine - 54);
      crane.add(mast, arm, hook);
      scene.add(crane);
    }

    minimapObjects.push({ type: "water", x: 0, z: seaLine - 96, w: worldSize * 1.45, d: 235 });
  }

  function addWaterfrontDetails() {
    box(worldSize - 42, 1.2, 1.8, materials.concrete, 0, 0.75, seaLine - 2);
    for (let x = -230; x <= 230; x += 12) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.55, 8), materials.metal);
      post.position.set(x, 1.45, seaLine + 1.2);
      scene.add(post);
      if (x % 24 === 0) {
        const waveBreak = box(5.2, 0.8, 10, materials.concrete, x, 0.4, seaLine - 26);
        waveBreak.rotation.y = Math.PI / 10;
      }
    }
    for (let x = -210; x <= 210; x += 42) {
      box(12, 0.22, 3.2, materials.curb, x, 0.18, seaLine + 8);
    }
  }

  function addPier(x, z, width, depth) {
    const pier = box(width, 2, depth, materials.port, x, 1, z);
    pier.receiveShadow = true;
    minimapObjects.push({ type: "pier", x, z, w: width, d: depth });
  }

  function addRoadNetwork() {
    const verticals = [-210, -140, -70, 0, 70, 140, 210];
    const horizontals = [-150, -90, -30, 30, 90, 150, 210];

    for (const z of horizontals) {
      addRoad(0, z, 450, z === -150 ? 18 : 14, 0, z === -150 ? "Набережная" : "Городская улица");
    }

    for (const x of verticals) {
      addRoad(x, 30, 14, 360, 0, "Поперечная улица");
    }
  }

  function addRoad(x, z, width, depth, rotation, name) {
    const sidewalkWidth = width > depth ? width : depth;
    const sidewalkDepth = width > depth ? depth + 11 : width + 11;
    const sidewalk = box(
      width > depth ? sidewalkWidth : sidewalkDepth,
      0.1,
      width > depth ? sidewalkDepth : sidewalkWidth,
      materials.curb,
      x,
      0.06,
      z
    );
    sidewalk.rotation.y = rotation;

    const road = box(width, 0.14, depth, width > depth ? materials.asphalt : materials.oldAsphalt, x, 0.08, z);
    road.rotation.y = rotation;
    roads.push({ x, z, width, depth, rotation, name });

    const longSide = Math.max(width, depth);
    const stripeCount = Math.max(3, Math.floor(longSide / 25));
    for (let i = 0; i < stripeCount; i += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(width > depth ? 7 : 0.45, 0.05, width > depth ? 0.35 : 7),
        new THREE.MeshBasicMaterial({ color: 0xd7c9a1 })
      );
      const offset = -longSide / 2 + 13 + i * 25;
      const localX = width > depth ? offset : 0;
      const localZ = width > depth ? 0 : offset;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      stripe.position.set(x + localX * cos + localZ * sin, 0.18, z - localX * sin + localZ * cos);
      stripe.rotation.y = rotation;
      scene.add(stripe);
    }

    addStreetDetails(x, z, width, depth, rotation);
    if (rotation === 0) addCrosswalks(x, z, width, depth);
  }

  function addCrosswalks(x, z, width, depth) {
    const isHorizontal = width > depth;
    const longSide = Math.max(width, depth);
    const crosswalkOffsets = [-longSide / 2 + 16, longSide / 2 - 16];
    for (const offset of crosswalkOffsets) {
      for (let stripe = -3; stripe <= 3; stripe += 1) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(isHorizontal ? 1.1 : Math.min(width, 10), 0.055, isHorizontal ? Math.min(depth, 10) : 1.1),
          materials.whitePaint
        );
        mesh.position.set(isHorizontal ? x + offset + stripe * 1.7 : x, 0.205, isHorizontal ? z : z + offset + stripe * 1.7);
        scene.add(mesh);
      }
    }
  }

  function addStreetDetails(x, z, width, depth, rotation) {
    const longSide = Math.max(width, depth);
    const isHorizontal = width > depth;
    const step = 42;
    const normalOffset = (Math.min(width, depth) / 2) + 7;
    const count = Math.floor(longSide / step);
    for (let i = 0; i <= count; i += 1) {
      const offset = -longSide / 2 + i * step;
      for (const side of [-1, 1]) {
        const localX = isHorizontal ? offset : side * normalOffset;
        const localZ = isHorizontal ? side * normalOffset : offset;
        const point = rotatePoint(x, z, localX, localZ, rotation);
        if (point.z < seaLine - 72 || point.z > worldSize / 2 - 12) continue;
        if (i % 2 === 0) addLamp(point.x, point.z);
        if (i % 3 === 1) addStreetSign(point.x + side * 0.8, point.z);
      }
    }
  }

  function addLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6.4, 8), materials.metal);
    pole.position.set(x, 3.2, z);
    pole.castShadow = true;
    scene.add(pole);

    const light = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), materials.lamp);
    light.position.set(x, 6.55, z);
    scene.add(light);
  }

  function addStreetSign(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.8, 6), materials.metal);
    pole.position.set(x, 1.4, z);
    scene.add(pole);
    const sign = box(1.6, 0.8, 0.12, materials.yellow, x, 2.85, z);
    sign.castShadow = false;
  }

  function addDistricts() {
    const xs = [-225, -210, -140, -70, 0, 70, 140, 210, 225];
    const zs = [-150, -90, -30, 30, 90, 150, 210, 245];

    for (let ix = 1; ix < xs.length - 2; ix += 1) {
      for (let iz = 0; iz < zs.length - 1; iz += 1) {
        const left = xs[ix];
        const right = xs[ix + 1];
        const bottom = zs[iz];
        const top = zs[iz + 1];
        const centerX = (left + right) / 2;
        const centerZ = (bottom + top) / 2;
        const style = centerZ < -60 ? "port" : centerX < -120 ? "market" : centerX > 95 ? "panel" : centerZ > 120 ? "old" : "center";
        addBlockCell(centerX, centerZ, right - left, top - bottom, style);
      }
    }
  }

  function addBlockCell(centerX, centerZ, cellWidth, cellDepth, style) {
    const usableWidth = cellWidth - 30;
    const usableDepth = cellDepth - 28;
    if (usableWidth < 28 || usableDepth < 24) return;

    if (style === "port") {
      addWarehouse(centerX - usableWidth * 0.22, centerZ, Math.min(usableWidth * 0.42, 32), Math.min(usableDepth * 0.55, 24));
      addWarehouse(centerX + usableWidth * 0.24, centerZ, Math.min(usableWidth * 0.38, 30), Math.min(usableDepth * 0.48, 22));
      return;
    }

    if (style === "market") {
      addKioskCluster(centerX - 12, centerZ - 8);
      addKioskCluster(centerX + 10, centerZ + 8);
      return;
    }

    const slots = [
      [-0.25, -0.22],
      [0.25, -0.18],
      [-0.22, 0.24],
      [0.24, 0.22],
    ];

    for (let i = 0; i < slots.length; i += 1) {
      if (seeded(centerX + i, centerZ) < 0.18) continue;
      const x = centerX + slots[i][0] * usableWidth;
      const z = centerZ + slots[i][1] * usableDepth;
      addBuilding(x, z, style);
    }
  }

  function addBlockGrid(originX, originZ, cols, rows, style) {
    for (let cx = 0; cx < cols; cx += 1) {
      for (let rz = 0; rz < rows; rz += 1) {
        const x = originX + cx * 32;
        const z = originZ - rz * 34;
        if (z < seaLine + 20) continue;
        if (style === "market" && (cx + rz) % 2 === 0) {
          addKioskCluster(x, z);
        } else if (style === "port") {
          addWarehouse(x, z);
        } else {
          addBuilding(x, z, style);
        }
      }
    }
  }

  function addBuilding(x, z, style) {
    const isPanel = style === "panel";
    const width = isPanel ? 22 : 17 + seeded(x, z) * 9;
    const depth = isPanel ? 18 : 16 + seeded(z, x) * 8;
    const height = isPanel ? 31 + seeded(x, z + 2) * 24 : 14 + seeded(x + 1, z) * 22;
    const material = isPanel ? materials.panel : style === "old" ? materials.plaster : materials.brick;
    const body = box(width, height, depth, material, x, height / 2, z);
    body.castShadow = true;
    body.receiveShadow = true;
    colliders.push({ x, z, w: width + 3, d: depth + 3 });

    const roof = box(width + 1.3, 1.1, depth + 1.3, materials.roof, x, height + 0.65, z);
    roof.castShadow = true;
    addBuildingDetails(x, z, width, depth, height, style);

    const floors = Math.max(2, Math.floor(height / 5));
    for (let f = 1; f < floors; f += 1) {
      addWindowLine(x, z - depth / 2 - 0.04, width, f * 4.6, true);
      addWindowLine(x - width / 2 - 0.04, z, depth, f * 4.6, false);
    }
  }

  function addBuildingDetails(x, z, width, depth, height, style) {
    const door = box(2.4, 3.2, 0.18, materials.door, x - width * 0.26, 1.6, z - depth / 2 - 0.12);
    door.castShadow = false;

    const awning = box(4.2, 0.35, 1.4, materials.awning, x - width * 0.26, 3.45, z - depth / 2 - 0.8);
    awning.castShadow = true;

    const sign = box(Math.min(width * 0.58, 10), 1.1, 0.16, materials.yellow, x + width * 0.12, 4.25, z - depth / 2 - 0.14);
    sign.castShadow = false;

    if (style === "panel" || height > 24) {
      const balconyRows = Math.min(4, Math.floor(height / 7));
      for (let row = 0; row < balconyRows; row += 1) {
        for (const bx of [-0.22, 0.22]) {
          const balcony = box(3.6, 0.18, 1.05, materials.concrete, x + bx * width, 7 + row * 5.2, z - depth / 2 - 0.62);
          balcony.castShadow = true;
          const rail = box(3.8, 0.65, 0.12, materials.balcony, x + bx * width, 7.45 + row * 5.2, z - depth / 2 - 1.12);
          rail.castShadow = false;
        }
      }
    }

    const chimneyCount = height > 18 ? 2 : 1;
    for (let i = 0; i < chimneyCount; i += 1) {
      const chimney = box(1.25, 2.4, 1.25, materials.brick, x - width * 0.28 + i * width * 0.42, height + 2.1, z + depth * 0.2);
      chimney.castShadow = true;
    }
  }

  function addWindowLine(x, z, length, y, horizontal) {
    const count = Math.max(2, Math.floor(length / 5));
    const geom = new THREE.BoxGeometry(horizontal ? 1.6 : 0.07, 1.05, horizontal ? 0.07 : 1.6);
    const windowMat = new THREE.MeshBasicMaterial({ color: seeded(x + y, z) > 0.42 ? 0xf2d27c : 0x53625d });
    for (let i = 0; i < count; i += 1) {
      const offset = -length / 2 + 3 + i * 5;
      const win = new THREE.Mesh(geom, windowMat);
      win.position.set(horizontal ? x + offset : x, y, horizontal ? z : z + offset);
      scene.add(win);
    }
  }

  function addKioskCluster(x, z) {
    for (let i = 0; i < 4; i += 1) {
      const kx = x + (i % 2) * 9;
      const kz = z + Math.floor(i / 2) * 8;
      const kiosk = box(7, 4.4, 5.6, i % 2 ? materials.yellow : materials.metal, kx, 2.2, kz);
      kiosk.castShadow = true;
      box(7.8, 0.35, 6.4, materials.awning, kx, 4.65, kz);
      box(4.2, 0.8, 0.14, materials.whitePaint, kx, 3.25, kz - 2.9);
      colliders.push({ x: kx, z: kz, w: 8, d: 7 });
    }
  }

  function addWarehouse(x, z, customWidth, customDepth) {
    const width = customWidth || 31 + seeded(x, z) * 14;
    const depth = customDepth || 18 + seeded(z, x) * 10;
    const warehouse = box(width, 11, depth, materials.port, x, 5.5, z);
    warehouse.castShadow = true;
    box(width * 0.48, 4.8, 0.2, materials.metal, x, 3.1, z - depth / 2 - 0.13);
    box(width + 1.5, 1.1, depth + 1.5, materials.roof, x, 11.6, z);
    addContainerStack(x - width * 0.32, z + depth * 0.42, 2);
    addContainerStack(x + width * 0.26, z + depth * 0.42, 3);
    colliders.push({ x, z, w: width + 4, d: depth + 4 });
  }

  function addContainerStack(x, z, count) {
    for (let i = 0; i < count; i += 1) {
      const container = box(8.2, 2.4, 3.2, i % 2 ? materials.containerBlue : materials.containerRed, x + i * 2.2, 1.2 + i * 2.45, z);
      container.rotation.y = i % 2 ? 0 : Math.PI / 2;
      container.castShadow = true;
    }
  }

  function addLandmarks() {
    addStation(-35, 180);
    addMarket(-175, 0);
    addCinema(35, 60);
    addMonument(105, 0);
    addLighthouse(210, seaLine - 36);
    addApartmentYard(-105, 120);
  }

  function addMissionOneScene() {
    addPrison(-232, 228);
    addTrainPlatform(-185, 205, "prison");
    addTrainPlatform(-36, 162, "station");
    addShopQueue(-76, 164);
  }

  function addPrison(x, z) {
    box(56, 8, 4, materials.prison, x, 4, z + 18);
    box(56, 8, 4, materials.prison, x, 4, z - 18);
    box(4, 8, 40, materials.prison, x - 28, 4, z);
    box(4, 8, 40, materials.prison, x + 28, 4, z);
    box(12, 9, 5, materials.metal, x + 30, 4.5, z - 4);
    box(5, 12, 5, materials.prison, x - 25, 6, z + 15);
    box(5, 12, 5, materials.prison, x + 25, 6, z + 15);
    addCollider(x, z + 18, 58, 6);
    addCollider(x, z - 18, 58, 6);
    addCollider(x - 28, z, 6, 42);
    addCollider(x + 28, z + 8, 6, 22);

    for (let i = -24; i <= 24; i += 6) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 58, 6), materials.wire);
      wire.position.set(x + i, 9.2, z + 20);
      wire.rotation.z = Math.PI / 2;
      scene.add(wire);
    }
    minimapObjects.push({ type: "landmark", x, z, label: "Красный Берег" });
  }

  function addTrainPlatform(x, z, kind) {
    box(72, 0.7, 10, materials.concrete, x, 0.35, z);
    const trainMat = kind === "prison" ? materials.panel : materials.metal;
    const car = box(46, 4.8, 8.2, trainMat, x + 6, 2.4, z - 9);
    car.castShadow = true;
    for (let i = -16; i <= 16; i += 8) {
      box(3.6, 1.3, 0.12, materials.glass, x + 6 + i, 3.4, z - 13.2);
    }
    box(8, 3.8, 7.2, materials.metal, x + 34, 1.9, z - 9);
    minimapObjects.push({ type: "landmark", x, z, label: kind === "prison" ? "Платформа зоны" : "Вокзал" });
  }

  function addShopQueue(x, z) {
    box(28, 10, 18, materials.plaster, x, 5, z);
    box(18, 1.2, 0.2, materials.yellow, x, 7.2, z - 9.2);
    addCollider(x, z, 31, 21);
    for (let i = 0; i < 9; i += 1) {
      const person = createSimplePerson(i + 220);
      person.position.set(x - 18 + i * 2.2, 0, z - 17);
      person.rotation.y = Math.PI / 2;
      scene.add(person);
      missionActors.push(person);
    }
    minimapObjects.push({ type: "landmark", x, z, label: "Очередь" });
  }

  function addStation(x, z) {
    box(44, 16, 22, materials.plaster, x, 8, z);
    box(48, 2, 26, materials.roof, x, 17.2, z);
    const clockTower = box(13, 34, 13, materials.plaster, x - 17, 17, z);
    clockTower.castShadow = true;
    addCollider(x, z, 48, 26);
    addCollider(x - 17, z, 16, 16);
    minimapObjects.push({ type: "landmark", x, z, label: "Вокзал" });
  }

  function addMarket(x, z) {
    for (let i = 0; i < 10; i += 1) {
      const stall = box(8, 3, 7, i % 3 ? materials.yellow : materials.roof, x + (i % 5) * 11, 1.5, z + Math.floor(i / 5) * 11);
      stall.castShadow = true;
      addCollider(stall.position.x, stall.position.z, 9, 8);
    }
    minimapObjects.push({ type: "landmark", x, z, label: "Рынок" });
  }

  function addCinema(x, z) {
    box(44, 18, 28, materials.brick, x, 9, z);
    box(32, 5, 4, materials.yellow, x, 16, z - 16.2);
    addCollider(x, z, 46, 30);
    minimapObjects.push({ type: "landmark", x, z, label: "Кинотеатр" });
  }

  function addMonument(x, z) {
    box(12, 3, 12, materials.concrete, x, 1.5, z);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 20, 18), materials.concrete);
    column.position.set(x, 13, z);
    column.castShadow = true;
    scene.add(column);
    addCollider(x, z, 14, 14);
    minimapObjects.push({ type: "landmark", x, z, label: "Площадь" });
  }

  function addLighthouse(x, z) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7.5, 42, 18), materials.plaster);
    tower.position.set(x, 21, z);
    tower.castShadow = true;
    scene.add(tower);
    box(18, 5, 18, materials.roof, x, 44, z);
    addCollider(x, z, 18, 18);
    minimapObjects.push({ type: "landmark", x, z, label: "Маяк" });
  }

  function addApartmentYard(x, z) {
    box(44, 28, 12, materials.panel, x, 14, z - 18);
    box(10, 28, 32, materials.panel, x - 24, 14, z);
    box(10, 28, 32, materials.panel, x + 24, 14, z);
    addCollider(x, z - 18, 47, 15);
    addCollider(x - 24, z, 13, 35);
    addCollider(x + 24, z, 13, 35);
    minimapObjects.push({ type: "landmark", x, z, label: "Двор Громова" });
  }

  function addMissionMarkers() {
    const missions = [
      ["Двор Громова", -105, 120],
      ["Рынок", -175, 0],
      ["Старый гараж", -175, 60],
      ["Вокзал", -35, 180],
      ["Кинотеатр", 35, 60],
      ["Портовый склад", 105, -60],
      ["Пирс", 0, -198],
      ["Бильярдная", -35, 0],
      ["Площадь", 105, 0],
      ["Автобаза", 175, 60],
      ["Северные дома", 175, 120],
      ["Радиогорка", -175, 180],
      ["Контейнеры", 175, -120],
      ["Маяк", 210, -198],
      ["Набережная", -35, -120],
      ["Финал части I", -175, -120],
    ];

    missions.forEach(([name, x, z], index) => {
      const marker = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.32, 24), materials.mission.clone());
      marker.position.set(x, 0.28, z);
      marker.userData = { number: index + 1, name };
      marker.castShadow = false;
      scene.add(marker);
      missionMarkers.push(marker);
    });
  }

  function addAtmosphereProps() {
    for (let i = 0; i < 70; i += 1) {
      const x = -245 + seeded(i, 11) * 490;
      const z = -130 + seeded(i, 12) * 360;
      if (z < seaLine + 8) continue;
      if (seeded(i, 13) > 0.46) addTree(x, z);
    }

    for (let i = 0; i < 28; i += 1) addPedestrian(i);
    for (let i = 0; i < 14; i += 1) addVehicle(i);
    for (let i = 0; i < 36; i += 1) addBenchOrBin(i);
    for (let i = 0; i < 26; i += 1) addParkedDetail(i);
  }

  function addTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 5.5, 8), materials.roof);
    trunk.position.set(x, 2.75, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(4.2, 12, 9), materials.grass);
    crown.position.set(x, 10, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  function addPedestrian(seed, position) {
    const group = createSimplePerson(seed);
    const road = roads[seed % roads.length];
    const start = position || pointOnRoadSidewalk(road, seeded(seed, 31) * 2 - 1, seed % 2 ? 1 : -1);
    group.position.set(start.x, 0, start.z);
    scene.add(group);

    pedestrians.push({
      group,
      road,
      side: seed % 2 ? 1 : -1,
      t: seeded(seed, 32) * 2 - 1,
      dir: seed % 2 ? 1 : -1,
      speed: 0.03 + seeded(seed, 33) * 0.026,
      wait: 0,
      phase: seeded(seed, 34) * Math.PI * 2,
      limbs: group.userData.limbs,
    });
  }

  function createSimplePerson(seed) {
    const group = new THREE.Group();
    const bodyMat = seed % 3 === 0 ? materials.coat : seed % 3 === 1 ? materials.brick : materials.panel;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 4, 8), bodyMat);
    body.position.y = 1.18;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), materials.skin);
    head.position.y = 1.95;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.12, 12), seed % 2 ? materials.roof : materials.oldAsphalt);
    cap.position.y = 2.2;

    const armGeom = new THREE.BoxGeometry(0.16, 0.75, 0.16);
    const leftArm = new THREE.Mesh(armGeom, bodyMat);
    const rightArm = new THREE.Mesh(armGeom, bodyMat);
    leftArm.position.set(-0.46, 1.18, 0);
    rightArm.position.set(0.46, 1.18, 0);

    const legGeom = new THREE.BoxGeometry(0.18, 0.78, 0.2);
    const leftLeg = new THREE.Mesh(legGeom, materials.denim);
    const rightLeg = new THREE.Mesh(legGeom, materials.denim);
    leftLeg.position.set(-0.17, 0.42, 0);
    rightLeg.position.set(0.17, 0.42, 0);

    const shoeGeom = new THREE.BoxGeometry(0.24, 0.12, 0.36);
    const leftShoe = new THREE.Mesh(shoeGeom, materials.shoe);
    const rightShoe = new THREE.Mesh(shoeGeom, materials.shoe);
    leftShoe.position.set(-0.17, 0.05, -0.05);
    rightShoe.position.set(0.17, 0.05, -0.05);

    group.add(body, head, cap, leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe);
    group.userData.limbs = { leftArm, rightArm, leftLeg, rightLeg };
    return group;
  }

  function addVehicle(seed) {
    const group = new THREE.Group();
    const type = seed % 5 === 0 ? "van" : seed % 4 === 0 ? "wagon" : "sedan";
    const dims = type === "van"
      ? { w: 5.2, h: 2.25, d: 9.4, cabinZ: -0.3, cabinD: 4.4, wheelZ: 3.25 }
      : type === "wagon"
        ? { w: 4.9, h: 1.75, d: 9.2, cabinZ: -0.05, cabinD: 3.65, wheelZ: 3.05 }
        : { w: 4.8, h: 1.65, d: 8.4, cabinZ: -0.35, cabinD: 2.8, wheelZ: 2.8 };
    const bodyMat = seed % 4 === 0 ? materials.roof : seed % 4 === 1 ? materials.metal : seed % 4 === 2 ? materials.plaster : materials.brick;
    const body = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.h, dims.d), bodyMat);
    body.position.y = dims.h / 2 + 0.28;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(dims.w - 0.35, 0.42, type === "van" ? 1.2 : 2.0), bodyMat);
    hood.position.set(0, dims.h + 0.55, -dims.d / 2 + 1.2);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(dims.w - 0.45, 0.46, type === "van" ? 0.8 : 1.7), bodyMat);
    trunk.position.set(0, dims.h + 0.48, dims.d / 2 - 1.1);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.w - 0.9, type === "van" ? 1.7 : 1.2, dims.cabinD), materials.glass);
    cabin.position.set(0, dims.h + 1.06, dims.cabinZ);
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(dims.w + 0.1, 0.34, 0.36), materials.metal);
    frontBumper.position.set(0, 0.82, -dims.d / 2 - 0.16);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(dims.w + 0.1, 0.34, 0.36), materials.metal);
    rearBumper.position.set(0, 0.82, dims.d / 2 + 0.16);
    group.add(body, hood, trunk, cabin, frontBumper, rearBumper);

    const sideWindowGeom = new THREE.BoxGeometry(0.08, 0.72, type === "van" ? 2.4 : 1.55);
    for (const sx of [-dims.w / 2 - 0.05, dims.w / 2 + 0.05]) {
      const sideWindow = new THREE.Mesh(sideWindowGeom, materials.glass);
      sideWindow.position.set(sx, dims.h + 1.05, dims.cabinZ + 0.2);
      group.add(sideWindow);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.42), materials.metal);
      mirror.position.set(sx, 1.95, -dims.d / 2 + 2.2);
      group.add(mirror);
    }

    for (const sx of [-1.3, 1.3]) {
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.12), materials.headlight.clone());
      headlight.userData.role = "headlight";
      headlight.position.set(sx, 1.2, -dims.d / 2 - 0.36);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.12), materials.taillight.clone());
      taillight.userData.role = "taillight";
      taillight.position.set(sx, 1.16, dims.d / 2 + 0.36);
      const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.12), materials.indicator.clone());
      indicator.userData.role = "indicator";
      indicator.position.set(sx > 0 ? 1.85 : -1.85, 1.21, -dims.d / 2 - 0.38);
      group.add(headlight, taillight, indicator);
    }

    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 0.08), materials.license);
    frontPlate.position.set(0, 0.98, -dims.d / 2 - 0.38);
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 0.08), materials.license);
    rearPlate.position.set(0, 0.98, dims.d / 2 + 0.38);
    group.add(frontPlate, rearPlate);

    const wheels = [];
    for (const sx of [-1.9, 1.9]) {
      for (const sz of [-dims.wheelZ, dims.wheelZ]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(type === "van" ? 0.62 : 0.55, type === "van" ? 0.62 : 0.55, 0.45, 14), materials.oldAsphalt);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(sx, 0.55, sz);
        group.add(wheel);
        wheels.push(wheel);
      }
    }

    const road = roads[(seed * 3 + 2) % roads.length];
    const t = seeded(seed, 41) * 2 - 1;
    const lane = seed % 2 ? -2.2 : 2.2;
    const p = pointOnRoadLane(road, t, lane);
    group.position.set(p.x, 0, p.z);
    group.rotation.y = road.rotation + (road.width > road.depth ? Math.PI / 2 : 0) + (seed % 2 ? Math.PI : 0);
    scene.add(group);

    vehicles.push({
      group,
      road,
      lane,
      t,
      dir: seed % 2 ? -1 : 1,
      speed: 0,
      targetSpeed: type === "van" ? 0.042 + seeded(seed, 42) * 0.025 : 0.052 + seeded(seed, 42) * 0.035,
      state: "driving",
      timer: 4 + seeded(seed, 43) * 10,
      wheels,
      length: dims.d,
      blink: 0,
      seed,
    });
  }

  function addBenchOrBin(seed) {
    const road = roads[seed % roads.length];
    const p = pointOnRoadSidewalk(road, seeded(seed, 51) * 2 - 1, seed % 2 ? 1 : -1);
    if (seed % 2 === 0) {
      const bench = box(3.2, 0.35, 0.85, materials.roof, p.x, 0.55, p.z);
      bench.rotation.y = road.rotation;
    } else {
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.9, 10), materials.metal);
      bin.position.set(p.x, 0.45, p.z);
      scene.add(bin);
    }
  }

  function addParkedDetail(seed) {
    const road = roads[(seed * 5 + 1) % roads.length];
    const side = seed % 2 ? 1 : -1;
    const p = pointOnRoadLane(road, seeded(seed, 61) * 2 - 1, side * (Math.min(road.width, road.depth) / 2 - 2.1));
    if (p.z < seaLine + 8) return;

    if (seed % 3 === 0) {
      const car = box(4.4, 1.45, 7.5, seed % 2 ? materials.panel : materials.brick, p.x, 0.85, p.z);
      car.rotation.y = road.rotation + (road.width > road.depth ? Math.PI / 2 : 0);
      box(3.5, 0.9, 2.4, materials.glass, p.x, 1.85, p.z - 0.2).rotation.y = car.rotation.y;
    } else if (seed % 3 === 1) {
      const crate = box(2.2, 1.7, 2.2, materials.roof, p.x, 0.85, p.z);
      crate.rotation.y = seeded(seed, 62) * Math.PI;
    } else {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 10), materials.concrete);
      bollard.position.set(p.x, 0.55, p.z);
      scene.add(bollard);
    }
  }

  function bindInput() {
    window.addEventListener("keydown", (event) => keys.add(event.code));
    window.addEventListener("keyup", (event) => keys.delete(event.code));
    window.addEventListener("keydown", (event) => {
      if (event.code === "KeyF") handleMissionAction();
    });
    window.addEventListener("resize", resize);

    canvas.addEventListener("click", () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });

    document.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== canvas) return;
      player.yaw -= event.movementX * 0.0026;
      player.pitch = clamp(player.pitch - event.movementY * 0.0022, -1.18, 1.05);
    });
  }

  function updatePlayer(dt) {
    const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
    const strafe = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const dir = new THREE.Vector3();
    const forwardVector = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const rightVector = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    dir.addScaledVector(forwardVector, forward);
    dir.addScaledVector(rightVector, strafe);
    if (dir.lengthSq() > 0) dir.normalize();

    const running = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const targetSpeed = running ? 9.2 : 4.4;
    player.velocity.lerp(dir.multiplyScalar(targetSpeed), 1 - Math.pow(0.0008, dt));

    player.position.addScaledVector(player.velocity, dt);
    player.position.x = clamp(player.position.x, -worldSize / 2 + 8, worldSize / 2 - 8);
    player.position.z = clamp(player.position.z, seaLine - 78, worldSize / 2 - 8);
    resolveCollisions();

    const moving = player.velocity.length() > 0.35;
    player.headBob += dt * player.velocity.length() * (running ? 1.65 : 1.45);
    const bobY = moving ? Math.sin(player.headBob * 2.2) * (running ? 0.075 : 0.045) : 0;
    const bobX = moving ? Math.sin(player.headBob) * (running ? 0.035 : 0.02) : 0;

    camera.position.set(player.position.x + bobX, 1.75 + bobY, player.position.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.rotation.z = moving ? Math.sin(player.headBob * 1.4) * 0.008 : 0;

    speedText.textContent = `${Math.round(player.velocity.length() * 1.25)} км/ч · ${player.money} руб.`;
    districtText.textContent = getDistrict(player.position.x, player.position.z);
    updateCurrentMission();
  }

  function resolveCollisions() {
    for (const c of colliders) {
      const dx = player.position.x - c.x;
      const dz = player.position.z - c.z;
      const overlapX = c.w / 2 + playerRadius - Math.abs(dx);
      const overlapZ = c.d / 2 + playerRadius - Math.abs(dz);
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) {
          player.position.x += dx < 0 ? -overlapX : overlapX;
          player.velocity.x = 0;
        } else {
          player.position.z += dz < 0 ? -overlapZ : overlapZ;
          player.velocity.z = 0;
        }
      }
    }
  }

  function updateCurrentMission() {
    if (missionOne.active && !missionOne.completed) {
      for (const marker of missionMarkers) marker.material.emissiveIntensity = marker.userData.number === 1 ? 1.25 : 0.35;
      return;
    }
    let nearest = null;
    let nearestDistance = Infinity;
    for (const marker of missionMarkers) {
      const distance = marker.position.distanceTo(player.position);
      marker.rotation.y += 0.02;
      marker.material.emissiveIntensity = marker.userData.number === player.currentMission ? 1.25 : 0.45;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = marker;
      }
    }
    if (nearest && nearestDistance < 8) {
      player.currentMission = nearest.userData.number;
      updateMissionHud(nearest.userData.name);
    }
  }

  function startMissionOne() {
    missionOne.active = true;
    missionOne.step = 0;
    missionOne.target = { x: -198, z: 218 };
    missionOne.completed = false;
    missionOne.combatReady = false;
    player.currentMission = 1;
    player.money = 0;
    player.position.set(-232, 1.75, 228);
    player.velocity.set(0, 0, 0);
    player.yaw = Math.PI * 0.24;
    day.time = 7.1;
    setMissionObjective("Миссия 1: Красный Берег", "Осень 1991. Дойди до КПП и получи вещи.");
  }

  function updateMissionOne(dt) {
    if (!missionOne.active || missionOne.completed) return;

    if (missionOne.step === 0 && distanceTo(-198, 218) < 10) {
      missionOne.step = 1;
      missionOne.target = { x: -185, z: 205 };
      setMissionObjective("Вещи получены", "Старый пиджак и кепка на руках. Иди к электричке.");
    }

    if (missionOne.step === 1 && distanceTo(-185, 205) < 10) {
      missionOne.step = 2;
      player.position.set(-178, 1.75, 202);
      player.velocity.set(0, 0, 0);
      spawnTrainAttackers();
      missionOne.target = { x: -171, z: 198 };
      setMissionObjective("В вагоне драка", "Двое требуют кроссовки. Нажимай F рядом с противником.");
    }

    if (missionOne.step === 2) {
      for (const enemy of missionOne.enemies) {
        if (enemy.down) continue;
        const toPlayer = player.position.clone().sub(enemy.group.position);
        if (toPlayer.length() > 2.5) {
          toPlayer.y = 0;
          toPlayer.normalize();
          enemy.group.position.addScaledVector(toPlayer, dt * 1.6);
          enemy.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        }
      }
      if (missionOne.enemies.length > 0 && missionOne.enemies.every((enemy) => enemy.down)) {
        missionOne.step = 3;
        player.money += 37;
        missionOne.target = { x: -178, z: 202 };
        setMissionObjective("Рубли: 37", "Электричка идет в Приморск. Нажми F, чтобы выйти на вокзале.");
      }
    }

    if (missionOne.step === 4 && distanceTo(-76, 147) < 12) {
      missionOne.completed = true;
      missionOne.active = false;
      missionOne.target = null;
      setMissionObjective("Миссия пройдена", "Очередь у магазина показывает: старые понятия больше не работают.");
      setPrompt("Миссия 1 завершена · Свободный режим · WASD · Shift · F");
    }
  }

  function handleMissionAction() {
    if (!missionOne.active || missionOne.completed) return;

    if (missionOne.step === 2) {
      const enemy = nearestActiveEnemy();
      if (!enemy || enemy.group.position.distanceTo(player.position) > 4) return;
      enemy.health -= 1;
      enemy.group.position.addScaledVector(enemy.group.position.clone().sub(player.position).normalize(), 1.2);
      if (enemy.health <= 0) {
        enemy.down = true;
        enemy.group.rotation.x = Math.PI / 2;
        enemy.group.position.y = 0.25;
      }
      return;
    }

    if (missionOne.step === 3) {
      missionOne.step = 4;
      player.position.set(-35, 1.75, 170);
      player.velocity.set(0, 0, 0);
      player.yaw = Math.PI;
      missionOne.target = { x: -76, z: 147 };
      setMissionObjective("Городской вокзал", "Дойди до очереди у магазина напротив вокзала.");
    }
  }

  function spawnTrainAttackers() {
    if (missionOne.enemies.length > 0) return;
    for (let i = 0; i < 2; i += 1) {
      const enemy = createSimplePerson(500 + i);
      enemy.position.set(-171 + i * 5, 0, 198);
      enemy.rotation.y = -Math.PI / 2;
      scene.add(enemy);
      missionOne.enemies.push({ group: enemy, health: 2, down: false });
    }
  }

  function nearestActiveEnemy() {
    let nearest = null;
    let best = Infinity;
    for (const enemy of missionOne.enemies) {
      if (enemy.down) continue;
      const distance = enemy.group.position.distanceTo(player.position);
      if (distance < best) {
        nearest = enemy;
        best = distance;
      }
    }
    return nearest;
  }

  function distanceTo(x, z) {
    return Math.hypot(player.position.x - x, player.position.z - z);
  }

  function setMissionObjective(title, body) {
    missionText.textContent = title;
    setPrompt(`${body} · WASD движение · F действие`);
  }

  function setPrompt(text) {
    prompt.innerHTML = `<strong>${text}</strong>`;
  }

  function updatePedestrians(dt) {
    for (const ped of pedestrians) {
      if (ped.wait > 0) {
        ped.wait -= dt;
        continue;
      }
      ped.t += ped.dir * ped.speed * dt;
      if (ped.t > 1 || ped.t < -1) {
        ped.t = clamp(ped.t, -1, 1);
        ped.dir *= -1;
        ped.wait = 0.4 + seeded(ped.t * 100, ped.group.id) * 1.2;
      }
      const p = pointOnRoadSidewalk(ped.road, ped.t, ped.side);
      const prev = ped.group.position.clone();
      ped.group.position.set(p.x, 0, p.z);
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) ped.group.rotation.y = Math.atan2(dx, dz);
      ped.phase += dt * 4.2;
      const swing = Math.sin(ped.phase) * 0.36;
      ped.limbs.leftLeg.rotation.x = swing;
      ped.limbs.rightLeg.rotation.x = -swing;
      ped.limbs.leftArm.rotation.x = -swing * 0.75;
      ped.limbs.rightArm.rotation.x = swing * 0.75;
    }
  }

  function updateVehicles(dt) {
    for (const vehicle of vehicles) {
      if (vehicle.state === "empty") continue;
      vehicle.timer -= dt;

      if (vehicle.state === "stopped") {
        vehicle.speed = Math.max(0, vehicle.speed - dt * 0.08);
        animateVehicleParts(vehicle, dt, true);
        if (vehicle.timer < -1.3 && !vehicle.driverOut) {
          const exit = pointOnRoadSidewalk(vehicle.road, vehicle.t, vehicle.lane > 0 ? 1 : -1);
          addPedestrian(vehicle.seed + 100, exit);
          vehicle.driverOut = true;
        }
        if (vehicle.timer < -4.5) {
          vehicle.state = "driving";
          vehicle.timer = 10 + seeded(vehicle.seed, clock.elapsedTime) * 12;
          vehicle.driverOut = false;
        }
        return;
      }

      const blocked = isVehicleBlocked(vehicle);
      const nearCrossing = Math.abs((vehicle.t * 100) % 28) < 1.2;
      const desiredSpeed = blocked || nearCrossing ? vehicle.targetSpeed * 0.24 : vehicle.targetSpeed;
      vehicle.speed += (desiredSpeed - vehicle.speed) * (1 - Math.pow(0.02, dt));
      vehicle.t += vehicle.dir * vehicle.speed * dt;
      if (vehicle.t > 1 || vehicle.t < -1) {
        vehicle.t = clamp(vehicle.t, -1, 1);
        vehicle.dir *= -1;
        vehicle.blink = 1.2;
      }
      if (vehicle.timer < 0 && seeded(vehicle.seed, Math.floor(clock.elapsedTime)) > 0.54) {
        vehicle.state = "stopped";
        vehicle.timer = 0.9;
        vehicle.blink = 1.8;
      }

      const p = pointOnRoadLane(vehicle.road, vehicle.t, vehicle.lane);
      vehicle.group.position.set(p.x, 0, p.z);
      vehicle.group.rotation.y = vehicle.road.rotation + (vehicle.road.width > vehicle.road.depth ? Math.PI / 2 : 0) + (vehicle.dir < 0 ? Math.PI : 0);
      animateVehicleParts(vehicle, dt, blocked);
    }
  }

  function isVehicleBlocked(vehicle) {
    for (const other of vehicles) {
      if (other === vehicle || other.road !== vehicle.road || other.lane !== vehicle.lane) continue;
      const ahead = (other.t - vehicle.t) * vehicle.dir;
      if (ahead > 0 && ahead < 0.075) return true;
    }
    return false;
  }

  function animateVehicleParts(vehicle, dt, braking) {
    for (const wheel of vehicle.wheels) {
      wheel.rotation.x += vehicle.speed * dt * 42;
    }
    vehicle.group.position.y = Math.sin(clock.elapsedTime * 8 + vehicle.seed) * Math.min(vehicle.speed * 0.35, 0.035);
    vehicle.blink = Math.max(0, vehicle.blink - dt);
    const brakeIntensity = braking || vehicle.state === "stopped" ? 1.3 : 0.45;
    vehicle.group.traverse((part) => {
      if (!part.material) return;
      if (part.userData.role === "taillight") {
        part.material.emissiveIntensity = brakeIntensity;
      }
      if (part.userData.role === "indicator") {
        part.material.emissiveIntensity = vehicle.blink > 0 && Math.floor(clock.elapsedTime * 5) % 2 === 0 ? 1.1 : 0.2;
      }
    });
  }

  function updateDayNight(dt) {
    day.time = (day.time + dt * 0.035) % 24;
    const angle = (day.time / 24) * Math.PI * 2 - Math.PI / 2;
    const daylight = clamp(Math.sin(angle) * 0.78 + 0.32, 0.08, 1);
    const warm = new THREE.Color(0xffd1a0);
    const dayColor = new THREE.Color(0xb5c0bd);
    const nightColor = new THREE.Color(0x121923);
    const sky = nightColor.clone().lerp(dayColor, daylight);

    scene.background.copy(sky);
    scene.fog.color.copy(sky);
    scene.fog.near = 70 + daylight * 40;
    scene.fog.far = 300 + daylight * 240;
    day.sun.position.set(Math.cos(angle) * 145, Math.max(18, Math.sin(angle) * 190), 85);
    day.sun.intensity = 0.45 + daylight * 3.4;
    day.sun.color.copy(warm.clone().lerp(new THREE.Color(0xffffff), daylight));
    day.hemi.intensity = 0.45 + daylight * 1.7;
    const hours = Math.floor(day.time);
    const minutes = Math.floor((day.time - hours) * 60);
    subtitleText.textContent = `Часть I · 1994 · Андрей Громов · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function updateMissionHud(name) {
    const marker = missionMarkers[player.currentMission - 1];
    const missionName = name || (marker ? marker.userData.name : "Двор Громова");
    missionText.textContent = `Миссия ${player.currentMission}/16 · ${missionName}`;
  }

  function drawMinimap() {
    const size = minimap.width;
    const scale = size / worldSize;
    minimapCtx.clearRect(0, 0, size, size);
    minimapCtx.fillStyle = "#26342a";
    minimapCtx.fillRect(0, 0, size, size);

    minimapCtx.fillStyle = "#215a72";
    minimapCtx.fillRect(0, toMapZ(seaLine), size, size - toMapZ(seaLine));

    minimapCtx.fillStyle = "#303436";
    for (const road of roads) {
      minimapCtx.save();
      minimapCtx.translate(toMapX(road.x), toMapZ(road.z));
      minimapCtx.rotate(-road.rotation);
      minimapCtx.fillRect(-road.width * scale / 2, -road.depth * scale / 2, road.width * scale, road.depth * scale);
      minimapCtx.restore();
    }

    for (const item of minimapObjects) {
      if (item.type === "bay") {
        minimapCtx.save();
        minimapCtx.translate(toMapX(item.x), toMapZ(item.z));
        minimapCtx.rotate(-item.rotation);
        minimapCtx.fillStyle = "#215a72";
        minimapCtx.fillRect(-item.w * scale / 2, -item.d * scale / 2, item.w * scale, item.d * scale);
        minimapCtx.restore();
      }
      if (item.type === "pier") {
        minimapCtx.fillStyle = "#575d5c";
        minimapCtx.fillRect(toMapX(item.x - item.w / 2), toMapZ(item.z - item.d / 2), item.w * scale, item.d * scale);
      }
      if (item.type === "landmark") {
        minimapCtx.fillStyle = "#e8c55e";
        minimapCtx.beginPath();
        minimapCtx.arc(toMapX(item.x), toMapZ(item.z), 3.1, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    }

    if (missionOne.active && !missionOne.completed && missionOne.target) {
      drawMissionTarget(missionOne.target.x, missionOne.target.z);
    } else {
      for (const marker of missionMarkers) {
        minimapCtx.fillStyle = marker.userData.number === player.currentMission ? "#ffffff" : "#ffbe3d";
        minimapCtx.beginPath();
        minimapCtx.arc(toMapX(marker.position.x), toMapZ(marker.position.z), marker.userData.number === player.currentMission ? 3.3 : 2.2, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    }

    minimapCtx.fillStyle = "#b9d5ff";
    for (const vehicle of vehicles) {
      minimapCtx.fillRect(toMapX(vehicle.group.position.x) - 1.8, toMapZ(vehicle.group.position.z) - 1.8, 3.6, 3.6);
    }

    minimapCtx.fillStyle = "#f1d1b5";
    for (const ped of pedestrians) {
      minimapCtx.beginPath();
      minimapCtx.arc(toMapX(ped.group.position.x), toMapZ(ped.group.position.z), 1.25, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    minimapCtx.save();
    minimapCtx.translate(toMapX(player.position.x), toMapZ(player.position.z));
    minimapCtx.rotate(-player.yaw);
    minimapCtx.fillStyle = "#43e0c4";
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -7);
    minimapCtx.lineTo(4.8, 5);
    minimapCtx.lineTo(0, 2.4);
    minimapCtx.lineTo(-4.8, 5);
    minimapCtx.closePath();
    minimapCtx.fill();
    minimapCtx.restore();

    minimapCtx.strokeStyle = "rgba(255,255,255,0.24)";
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(1, 1, size - 2, size - 2);
  }

  function drawMissionTarget(x, z) {
    const px = toMapX(x);
    const pz = toMapZ(z);
    const pulse = 4.5 + Math.sin(clock.elapsedTime * 5) * 1.4;
    minimapCtx.strokeStyle = "#ffffff";
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.arc(px, pz, pulse + 5, 0, Math.PI * 2);
    minimapCtx.stroke();

    minimapCtx.fillStyle = "#ffcf3d";
    minimapCtx.beginPath();
    minimapCtx.arc(px, pz, pulse, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.strokeStyle = "rgba(255,207,61,0.55)";
    minimapCtx.beginPath();
    minimapCtx.moveTo(toMapX(player.position.x), toMapZ(player.position.z));
    minimapCtx.lineTo(px, pz);
    minimapCtx.stroke();
  }

  function getDistrict(x, z) {
    if (z < seaLine + 24) return "Портовая бухта";
    if (x < -112 && z < 35) return "Черный рынок";
    if (x < -130 && z > 100) return "Радиогорка";
    if (x > 110 && z > 80) return "Северные дома";
    if (x > 85 && z < 20) return "Портовые склады";
    if (z > 150) return "Вокзальный район";
    if (Math.hypot(x - 35, z - 82) < 82) return "Старый центр";
    return "Южная бухта";
  }

  function box(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addCollider(x, z, width, depth) {
    colliders.push({ x, z, w: width, d: depth });
  }

  function pointOnRoadLane(road, t, laneOffset) {
    const longSide = Math.max(road.width, road.depth);
    const isHorizontal = road.width > road.depth;
    const localX = isHorizontal ? t * longSide / 2 : laneOffset;
    const localZ = isHorizontal ? laneOffset : t * longSide / 2;
    return rotatePoint(road.x, road.z, localX, localZ, road.rotation);
  }

  function pointOnRoadSidewalk(road, t, side) {
    const laneOffset = Math.min(road.width, road.depth) / 2 + 6.6;
    return pointOnRoadLane(road, t, side * laneOffset);
  }

  function rotatePoint(originX, originZ, localX, localZ, rotation) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: originX + localX * cos + localZ * sin,
      z: originZ - localX * sin + localZ * cos,
    };
  }

  function mat(color, roughness) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }

  function texturedMat(color, roughness, kind, repeat) {
    const texture = makeTexture(kind, color, repeat);
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      map: texture,
    });
  }

  function makeTexture(kind, color, repeat) {
    const size = 256;
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = size;
    textureCanvas.height = size;
    const ctx = textureCanvas.getContext("2d");
    const base = new THREE.Color(color);
    ctx.fillStyle = colorToCss(base);
    ctx.fillRect(0, 0, size, size);

    if (kind === "brick") drawBrickTexture(ctx, base, size);
    else if (kind === "grass") drawGrassTexture(ctx, base, size);
    else if (kind === "asphalt") drawAsphaltTexture(ctx, base, size);
    else if (kind === "roof") drawRoofTexture(ctx, base, size);
    else if (kind === "panel") drawPanelTexture(ctx, base, size);
    else if (kind === "metalPanels") drawMetalPanelTexture(ctx, base, size);
    else drawConcreteTexture(ctx, base, size);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = maxAnisotropy;
    if ("colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  function drawNoise(ctx, base, size, amount, alpha) {
    for (let i = 0; i < amount; i += 1) {
      const shade = (Math.random() - 0.5) * 0.22;
      ctx.fillStyle = colorToCss(adjustColor(base, shade), alpha);
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }

  function drawAsphaltTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 1700, 0.55);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    for (let y = 0; y < size; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 4);
      ctx.lineTo(size, y + Math.random() * 4);
      ctx.stroke();
    }
  }

  function drawConcreteTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 900, 0.38);
    ctx.strokeStyle = "rgba(30,30,30,0.12)";
    for (let x = 0; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }

  function drawBrickTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 700, 0.28);
    ctx.strokeStyle = "rgba(35,18,14,0.42)";
    ctx.lineWidth = 2;
    for (let y = 0; y < size; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      for (let x = (y / 24) % 2 ? 32 : 0; x < size; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 24);
        ctx.stroke();
      }
    }
  }

  function drawGrassTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 1500, 0.45);
    ctx.strokeStyle = "rgba(210,220,150,0.12)";
    for (let i = 0; i < 260; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 4 - 2, y - 3 - Math.random() * 5);
      ctx.stroke();
    }
  }

  function drawRoofTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 650, 0.26);
    ctx.strokeStyle = "rgba(20,10,8,0.28)";
    for (let y = 0; y < size; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }

  function drawPanelTexture(ctx, base, size) {
    drawConcreteTexture(ctx, base, size);
    ctx.strokeStyle = "rgba(45,45,45,0.18)";
    for (let x = 0; x < size; x += 86) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  }

  function drawMetalPanelTexture(ctx, base, size) {
    drawNoise(ctx, base, size, 600, 0.25);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    for (let y = 0; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }

  function adjustColor(color, delta) {
    return color.clone().offsetHSL(0, 0, delta);
  }

  function colorToCss(color, alpha = 1) {
    return `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha})`;
  }

  function toMapX(x) {
    return ((x + worldSize / 2) / worldSize) * minimap.width;
  }

  function toMapZ(z) {
    return ((z + worldSize / 2) / worldSize) * minimap.height;
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.04);
    updateDayNight(dt);
    updatePlayer(dt);
    updateMissionOne(dt);
    updateVehicles(dt);
    updatePedestrians(dt);
    drawMinimap();
    renderer.render(scene, camera);
  }

  function seeded(x, z) {
    return Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
