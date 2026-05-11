    function tankHasRotatingTurret(className) {
      return !["\u041f\u0422", "\u041f\u0422-\u0421\u0410\u0423", "\u0421\u0410\u0423"].includes(className);
    }

    function pickRandomTank(tanks) {
      return tanks[Math.floor(Math.random() * tanks.length)];
    }

    function createRandomNickname() {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const length = 4 + Math.floor(Math.random() * 5);
      let nickname = "";

      for (let index = 0; index < length; index += 1) {
        nickname += alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      return nickname;
    }

    function normalizeShellType(value) {
      return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
    }

    function getShellPenetration(tank, shellType) {
      const normalizedShellType = normalizeShellType(shellType);
      const knownShellTypes = ["\u0411\u0411", "\u041a\u0421", "\u041e\u0424", "\u041f\u0411"];

      if (!knownShellTypes.includes(normalizedShellType)) {
        return 1000;
      }

      const penetration = normalizeNumber(tank?.penetration?.[normalizedShellType] || 0);

      return penetration > 0 ? penetration : 1000;
    }

    function getTankShells(tank) {
      const shells = Array.isArray(tank.shells) ? tank.shells : [];

      return [0, 1, 2].map((index) => ({
        type: shells[index]?.type || "-",
        damage: normalizeNumber(shells[index]?.damage || 0),
        penetration: getShellPenetration(tank, shells[index]?.type || "-")
      }));
    }

    function getTankHealth(tank) {
      return normalizeNumber(tank.health || 0) || 100;
    }

    function getTankReloadTime(tank, isBot) {
      return normalizePositiveFloat(tank.reloadTime || 0) || (isBot ? 1.6 : 0.75);
    }

    function getTankMoveSpeed(tank, isBot) {
      const movementDelay = normalizePositiveFloat(tank.movementDelay || 0);
      const baseSpeed = movementDelay > 0 ? movementStepPixels / movementDelay : 210;
      const speed = Math.max(90, Math.min(280, baseSpeed));

      return isBot ? speed * 0.82 : speed;
    }

    function getTankTurnSpeed(tank, isBot) {
      const hullTurnDelay = normalizePositiveFloat(tank.hullTurnDelay || 0);
      const degreesPerSecond = hullTurnDelay > 0 ? 1 / hullTurnDelay : (isBot ? 126 : 183);

      return Math.max(0.75, Math.min(4.2, degreesPerSecond * Math.PI / 180));
    }

    function tankIsAlive(tank) {
      return Boolean(tank && tank.health > 0);
    }

    function getTankClassKey(tank) {
      return String(tank?.className || tank?.tank?.className || "")
        .trim()
        .toUpperCase();
    }

    function tankIsArtillery(tank) {
      return getTankClassKey(tank) === "\u0421\u0410\u0423" || normalizeNumber(tank?.gunType || tank?.tank?.gunType || 0) === 6;
    }

    function getTankCamouflage(tank) {
      const className = getTankClassKey(tank);
      const values = {
        "\u0421\u0410\u0423": 0.62,
        "\u041b\u0422": 0.68,
        "\u0421\u0422": 1,
        "\u041f\u0422": 1.24,
        "\u041f\u0422-\u0421\u0410\u0423": 1.24,
        "\u0422\u0422": 1.38
      };

      return values[className] || 1;
    }

    function getTankViewRange(tank) {
      const className = getTankClassKey(tank);
      const values = {
        "\u041b\u0422": 680,
        "\u0421\u0422": 620,
        "\u0422\u0422": 560,
        "\u041f\u0422": 585,
        "\u041f\u0422-\u0421\u0410\u0423": 585,
        "\u0421\u0410\u0423": 520
      };

      return values[className] || 590;
    }

    function canTankSeeTank(observer, target) {
      if (!tankIsAlive(observer) || !tankIsAlive(target) || observer.team === target.team) {
        return false;
      }

      const distance = Math.hypot(target.x - observer.x, target.y - observer.y);
      const visibleDistance = getTankViewRange(observer) * getTankCamouflage(target);

      return distance <= visibleDistance;
    }

    function updateSpotting() {
      battleState.allies.forEach((tank) => {
        tank.spotted = tankIsAlive(tank) && battleState.enemies.some((enemy) => canTankSeeTank(enemy, tank));
      });
      battleState.enemies.forEach((tank) => {
        tank.spotted = tankIsAlive(tank) && battleState.allies.some((ally) => canTankSeeTank(ally, tank));
      });

      if (tankIsAlive(battleState.player) && tankIsArtillery(battleState.player)) {
        battleState.enemies.forEach((tank) => {
          tank.spotted = tankIsAlive(tank);
        });
      }

      if (battleState.player) {
        battleState.player.spotted = true;
      }
    }

    function getBestShell(tank) {
      return tank.shells.reduce((bestShell, shell) => (
        shell.damage > bestShell.damage ? shell : bestShell
      ), tank.shells[0] || { type: "-", damage: 0 });
    }

    function getTankDamagePotential(tank) {
      const shell = getBestShell(tank);
      const reloadTime = Math.max(0.1, tank.reloadTime || 1);

      return shell.damage / reloadTime + shell.damage * 0.25;
    }

    function createBattleStats() {
      return {
        damage: 0,
        kills: 0,
        shots: 0,
        hits: 0,
      baseCapture: 0,
      medals: [],
      lowHealthSoloCapture: false,
      commanderKill: false,
      experience: 0,
      silver: 0,
      rewardsApplied: false
      };
    }

    function renderBattleAmmoPanel() {
      const player = battleState.player;

      battleAmmoPanel.replaceChildren();

      if (!player) {
        battleAmmoPanel.style.display = "none";
        return;
      }

      player.shells.forEach((shell, index) => {
        const slot = document.createElement("button");
        const key = document.createElement("span");
        const type = document.createElement("span");
        const damage = document.createElement("span");
        const clip = document.createElement("span");

        slot.type = "button";
        slot.className = `battleAmmoSlot ${index === battleState.selectedShellIndex ? "selected" : ""}`.trim();
        key.className = "battleAmmoKey";
        type.className = "battleAmmoType";
        damage.className = "battleAmmoDamage";
        clip.className = "battleAmmoKey";
        key.textContent = String(index + 1);
        type.textContent = shell.type;
        damage.textContent = player.shellsPerShot > 1 && !player.clipFireMode ? `${shell.damage} x${player.shellsPerShot}` : String(shell.damage);
        clip.textContent = [2, 3].includes(player.gunType)
          ? `${player.clipAmmo}/${player.clipSize}`
          : player.clipFireMode ? `${player.burstClipAmmo}/${player.shellsPerShot}` : "";
        slot.addEventListener("click", () => selectPlayerShell(index));
        slot.append(key, type, damage);
        if (clip.textContent) {
          slot.append(clip);
        }
        battleAmmoPanel.append(slot);
      });

      if (playerCanToggleClipFireMode(player)) {
        const modeSlot = document.createElement("button");
        const key = document.createElement("span");
        const type = document.createElement("span");
        const damage = document.createElement("span");

        modeSlot.type = "button";
        modeSlot.className = `battleAmmoSlot ${player.clipFireMode ? "selected" : ""}`.trim();
        key.className = "battleAmmoKey";
        type.className = "battleAmmoType";
        damage.className = "battleAmmoDamage";
        key.textContent = "4";
        type.textContent = player.clipFireMode ? "\u0411\u0430\u0440\u0430\u0431\u0430\u043d" : "\u0417\u0430\u043b\u043f";
        damage.textContent = player.clipFireMode ? `${player.burstClipAmmo}/${player.shellsPerShot}` : `x${player.shellsPerShot}`;
        modeSlot.addEventListener("click", togglePlayerClipFireMode);
        modeSlot.append(key, type, damage);
        battleAmmoPanel.append(modeSlot);
      }

      battleAmmoPanel.style.display = "flex";
    }

    function selectPlayerShell(index) {
      const player = battleState.player;

      if (!tankIsAlive(player) || !player.shells[index]) {
        return;
      }

      if (battleState.selectedShellIndex !== index && battleState.tutorial.enabled) {
        battleState.tutorial.changedShell = true;
      }
      battleState.selectedShellIndex = index;
      battleState.selectedShell = player.shells[index];
      renderBattleAmmoPanel();
    }

    function playerCanToggleClipFireMode(player) {
      return tankIsAlive(player) && player.gunType === 1 && player.shellsPerShot > 1;
    }

    function togglePlayerClipFireMode() {
      const player = battleState.player;

      if (!playerCanToggleClipFireMode(player)) {
        return;
      }

      player.clipFireMode = !player.clipFireMode;

      if (player.clipFireMode && player.burstClipAmmo <= 0 && player.reloadTimer <= 0) {
        player.burstClipAmmo = player.shellsPerShot;
      }

      renderBattleAmmoPanel();
    }

    function createBattleTank(tank, x, y, angle, isBot = false, team = "ally", nickname = "") {
      const className = (tank.className || "").toUpperCase();
      const hasTurret = tankHasRotatingTurret(className);
      const turretTurnSpeeds = {
        "\u041b\u0422": 3.9,
        "\u0421\u0422": 3.25,
        "\u0422\u0422": Math.PI / 6
      };
      const turretTurnSpeed = hasTurret ? turretTurnSpeeds[className] || (isBot ? 2.8 : 3.8) : 0;
      const maxHealth = getTankHealth(tank);
      const reloadTime = getTankReloadTime(tank, isBot);
      const gunType = normalizeNumber(tank.gunType || 1) || 1;
      const shellsPerShot = Math.max(1, normalizeNumber(tank.shellsPerShot || 1) || 1);
      const clipSize = [2, 3].includes(gunType) ? Math.max(1, normalizeNumber(tank.clipSize || 1) || 1) : 0;
      const gunSpreadDegrees = normalizePositiveFloat(tank.gunSpreadDegrees || 0);

      return {
        tank,
        x,
        y,
        angle,
        turretAngle: angle,
        radius: 34,
        collisionWidth: 78,
        collisionHeight: 48,
        speed: getTankMoveSpeed(tank, isBot),
        turnSpeed: getTankTurnSpeed(tank, isBot),
        className,
        hasTurret,
        turretTurnSpeed,
        maxHealth,
        health: maxHealth,
        isBot,
        team,
        nickname: nickname || createRandomNickname(),
        spotted: team === "ally",
        shells: getTankShells(tank),
        reloadTimer: 0,
        reloadTime,
        gunType,
        shellsPerShot,
        clipSize,
        gunSpreadRadians: gunSpreadDegrees * Math.PI / 180,
        clipAmmo: clipSize || 0,
        clipFireMode: false,
        burstClipAmmo: shellsPerShot,
        clipShotDelay: 1,
        clipReloadTimer: 0,
        bodyImage: getBattleImage(`./img/korpus/${tank.name}.png`),
        turretImage: hasTurret ? getBattleImage(`./img/bashnya/${tank.name}.png`) : null,
        botTurnTimer: 0,
        botThinkTimer: 0,
        botTarget: null,
        botOrbitDirection: Math.random() < 0.5 ? -1 : 1,
        botAvoidTimer: 0,
        botPreferredDistance: isBot ? 230 + Math.random() * 180 : 0,
        botPathPoint: null,
        botPathTimer: 0,
        botStuckTimer: 0,
        botLastX: x,
        botLastY: y
      };
    }

    function getAllBattleTanks() {
      return [...battleState.allies, ...battleState.enemies];
    }

    function getAliveBattleTanks() {
      return getAllBattleTanks().filter(tankIsAlive);
    }

    function normalizeAngle(angle) {
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    function rotateAngleToward(currentAngle, targetAngle, maxStep) {
      const difference = normalizeAngle(targetAngle - currentAngle);

      if (Math.abs(difference) <= maxStep) {
        return normalizeAngle(targetAngle);
      }

      return normalizeAngle(currentAngle + Math.sign(difference) * maxStep);
    }

    function circleIntersectsRect(circle, rect) {
      const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
      const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
      const dx = circle.x - nearestX;
      const dy = circle.y - nearestY;

      return dx * dx + dy * dy < circle.radius * circle.radius;
    }

    function createRotatedRect(x, y, width, height, angle = 0) {
      return { x, y, width, height, angle };
    }

    function getTankCollisionRect(tank, x = tank.x, y = tank.y) {
      return createRotatedRect(
        x,
        y,
        tank.collisionWidth || 78,
        tank.collisionHeight || 48,
        tank.angle || 0
      );
    }

    function getRotatedRectCorners(rect) {
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const cos = Math.cos(rect.angle || 0);
      const sin = Math.sin(rect.angle || 0);
      const points = [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight }
      ];

      return points.map((point) => ({
        x: rect.x + point.x * cos - point.y * sin,
        y: rect.y + point.x * sin + point.y * cos
      }));
    }

    function getRotatedRectBounds(rect) {
      const corners = getRotatedRectCorners(rect);
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);

      return {
        left: Math.min(...xs),
        right: Math.max(...xs),
        top: Math.min(...ys),
        bottom: Math.max(...ys)
      };
    }

    function rangesOverlap(first, second) {
      return first.max >= second.min && second.max >= first.min;
    }

    function projectPoints(points, axis) {
      const values = points.map((point) => point.x * axis.x + point.y * axis.y);

      return {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }

    function getRectAxes(rect) {
      const cos = Math.cos(rect.angle || 0);
      const sin = Math.sin(rect.angle || 0);

      return [
        { x: cos, y: sin },
        { x: -sin, y: cos }
      ];
    }

    function rotatedRectsIntersect(first, second) {
      const firstCorners = getRotatedRectCorners(first);
      const secondCorners = getRotatedRectCorners(second);
      const axes = [...getRectAxes(first), ...getRectAxes(second)];

      return axes.every((axis) => rangesOverlap(
        projectPoints(firstCorners, axis),
        projectPoints(secondCorners, axis)
      ));
    }

    function circleIntersectsRotatedRect(circle, rect) {
      const cos = Math.cos(-(rect.angle || 0));
      const sin = Math.sin(-(rect.angle || 0));
      const dx = circle.x - rect.x;
      const dy = circle.y - rect.y;
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      const nearestX = Math.max(-rect.width / 2, Math.min(localX, rect.width / 2));
      const nearestY = Math.max(-rect.height / 2, Math.min(localY, rect.height / 2));
      const hitX = localX - nearestX;
      const hitY = localY - nearestY;

      return hitX * hitX + hitY * hitY < circle.radius * circle.radius;
    }

    function rotatedRectTouchesCircle(rect, circle) {
      return circleIntersectsRotatedRect(circle, rect);
    }

    function getBuildingCollisionRect(building) {
      const [x, y, width, height, angle = 0] = building;

      return createRotatedRect(x, y, width, height, angle);
    }

    function getRockCollisionRect(rock, index = 0) {
      return createRotatedRect(
        rock.x,
        rock.y + rock.radius * 0.1,
        rock.radius * 2.05,
        rock.radius * 1.08,
        (index * 0.73) % Math.PI
      );
    }

    function distancePointToSegmentSquared(point, start, end) {
      const segmentX = end.x - start.x;
      const segmentY = end.y - start.y;
      const lengthSquared = segmentX * segmentX + segmentY * segmentY;

      if (lengthSquared === 0) {
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        return dx * dx + dy * dy;
      }

      const t = Math.max(0, Math.min(1, (
        (point.x - start.x) * segmentX + (point.y - start.y) * segmentY
      ) / lengthSquared));
      const nearestX = start.x + segmentX * t;
      const nearestY = start.y + segmentY * t;
      const dx = point.x - nearestX;
      const dy = point.y - nearestY;

      return dx * dx + dy * dy;
    }

    function circleTouchesRiver(circle) {
      return battleState.rivers.some((river) => {
        const riverRadius = river.width / 2 + circle.radius;

        for (let index = 0; index < river.points.length - 1; index += 1) {
          if (distancePointToSegmentSquared(circle, river.points[index], river.points[index + 1]) < riverRadius * riverRadius) {
            return true;
          }
        }

        return false;
      });
    }

    function tankIsInRiver(tank) {
      return battleState.rivers.some((river) => {
        const riverRadius = river.width / 2 + tank.radius * 0.25;

        for (let index = 0; index < river.points.length - 1; index += 1) {
          if (distancePointToSegmentSquared(tank, river.points[index], river.points[index + 1]) < riverRadius * riverRadius) {
            return true;
          }
        }

        return false;
      });
    }

    function getTerrainSpeedMultiplier(tank) {
      return 1;
    }

    function tankCollides(tank) {
      const collisionRect = getTankCollisionRect(tank);
      const bounds = getRotatedRectBounds(collisionRect);

      if (
        bounds.left < 0
        || bounds.top < 0
        || bounds.right > battleState.mapWidth
        || bounds.bottom > battleState.mapHeight
      ) {
        return true;
      }

      if (battleState.rocks.some((rock, index) => {
        return rotatedRectsIntersect(collisionRect, getRockCollisionRect(rock, index));
      })) {
        return true;
      }

      if ((battleState.mapDetails?.buildings || []).some((building) => (
        rotatedRectsIntersect(collisionRect, getBuildingCollisionRect(building))
      ))) {
        return true;
      }

      if (getAllBattleTanks().some((otherTank) => {
        if (otherTank === tank) {
          return false;
        }

        return rotatedRectsIntersect(collisionRect, getTankCollisionRect(otherTank));
      })) {
        return true;
      }

      return false;
    }

    function moveTank(tank, distance) {
      const previousX = tank.x;
      const previousY = tank.y;
      const terrainMultiplier = getTerrainSpeedMultiplier(tank);

      tank.x += Math.cos(tank.angle) * distance * terrainMultiplier;
      tank.y += Math.sin(tank.angle) * distance * terrainMultiplier;

      if (tankCollides(tank)) {
        tank.x = previousX;
        tank.y = previousY;
        return false;
      }

      return true;
    }

    function updateReloadTimers(delta) {
      getAliveBattleTanks().forEach((tank) => {
        const previousReloadTimer = tank.reloadTimer;

        tank.reloadTimer = Math.max(0, tank.reloadTimer - delta);

        if (tank.gunType === 2 && previousReloadTimer > 0 && tank.reloadTimer <= 0 && tank.clipAmmo <= 0) {
          tank.clipAmmo = tank.clipSize;
          if (tank === battleState.player) {
            renderBattleAmmoPanel();
          }
          return;
        }

        if (tank.gunType === 1 && tank.clipFireMode && previousReloadTimer > 0 && tank.reloadTimer <= 0 && tank.burstClipAmmo <= 0) {
          tank.burstClipAmmo = tank.shellsPerShot;
          if (tank === battleState.player) {
            renderBattleAmmoPanel();
          }
          return;
        }

        if (tank.gunType !== 3 || tank.clipAmmo >= tank.clipSize || tank.clipReloadTimer <= 0) {
          return;
        }

        tank.clipReloadTimer = Math.max(0, tank.clipReloadTimer - delta);

        if (tank.clipReloadTimer <= 0) {
          tank.clipAmmo = Math.min(tank.clipSize, tank.clipAmmo + 1);
          tank.clipReloadTimer = tank.clipAmmo < tank.clipSize ? tank.reloadTime : 0;
          if (tank === battleState.player) {
            renderBattleAmmoPanel();
          }
        }
      });
    }

    function updatePlayerTank(delta) {
      const player = battleState.player;

      if (!tankIsAlive(player)) {
        return;
      }

      const turnsLeft = pressedKeys.has("a") || pressedKeys.has("ф");
      const turnsRight = pressedKeys.has("d") || pressedKeys.has("в");
      const previousHullAngle = player.angle;

      if (turnsLeft) {
        player.angle = normalizeAngle(player.angle - player.turnSpeed * delta);
      } else if (turnsRight) {
        player.angle = normalizeAngle(player.angle + player.turnSpeed * delta);
      } else if (tankIsArtillery(player)) {
        const targetHullAngle = Math.atan2(battleState.mouse.y - player.y, battleState.mouse.x - player.x);

        player.angle = rotateAngleToward(player.angle, targetHullAngle, player.turnSpeed * delta);
      }

      if (player.hasTurret) {
        const hullDelta = normalizeAngle(player.angle - previousHullAngle);
        player.turretAngle = normalizeAngle(player.turretAngle + hullDelta);
      }

      if (pressedKeys.has("w") || pressedKeys.has("ц")) {
        if (battleState.tutorial.enabled) {
          battleState.tutorial.moved = true;
        }
        moveTank(player, player.speed * delta);
      }

      if (pressedKeys.has("s") || pressedKeys.has("ы")) {
        if (battleState.tutorial.enabled) {
          battleState.tutorial.moved = true;
        }
        moveTank(player, -player.speed * 0.65 * delta);
      }

      if (!player.hasTurret) {
        player.turretAngle = player.angle;
        return;
      }

      if (pressedKeys.has("q") || pressedKeys.has("й")) {
        player.turretAngle = normalizeAngle(player.turretAngle - player.turretTurnSpeed * delta);
      } else if (pressedKeys.has("e") || pressedKeys.has("у")) {
        player.turretAngle = normalizeAngle(player.turretAngle + player.turretTurnSpeed * delta);
      } else {
        const targetTurretAngle = Math.atan2(battleState.mouse.y - player.y, battleState.mouse.x - player.x);
        player.turretAngle = rotateAngleToward(
          player.turretAngle,
          targetTurretAngle,
          player.turretTurnSpeed * delta
        );
      }
    }

    function getEnemyTanksFor(bot) {
      return (bot.team === "enemy" ? battleState.allies : battleState.enemies)
        .filter(tankIsAlive);
    }

    function getMostDangerousTarget(bot) {
      const candidates = getEnemyTanksFor(bot);
      let bestTarget = null;
      let bestScore = -Infinity;

      candidates.forEach((target) => {
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const distance = Math.hypot(dx, dy);
        const distanceScore = Math.max(0, 900 - distance) * 0.16;
        const lowHealthScore = (1 - getHealthRatio(target)) * 45;
        const playerThreatScore = target === battleState.player ? 55 : 0;
        const score = getTankDamagePotential(target) + distanceScore + lowHealthScore + playerThreatScore;

        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      });

      return bestTarget;
    }

    function getHealthRatio(tank) {
      return tank.maxHealth > 0 ? tank.health / tank.maxHealth : 1;
    }

    function clampPointToMap(point, padding = 120) {
      return {
        x: Math.max(padding, Math.min(battleState.mapWidth - padding, point.x)),
        y: Math.max(padding, Math.min(battleState.mapHeight - padding, point.y))
      };
    }

    function getDistanceBetween(first, second) {
      return Math.hypot(first.x - second.x, first.y - second.y);
    }

    function tankWouldCollideAt(tank, x, y, radiusPadding = 0) {
      const collisionRect = getTankCollisionRect(tank, x, y);
      const paddedRect = createRotatedRect(
        collisionRect.x,
        collisionRect.y,
        collisionRect.width + radiusPadding * 2,
        collisionRect.height + radiusPadding * 2,
        collisionRect.angle
      );
      const bounds = getRotatedRectBounds(paddedRect);

      if (
        bounds.left < 0
        || bounds.top < 0
        || bounds.right > battleState.mapWidth
        || bounds.bottom > battleState.mapHeight
      ) {
        return true;
      }

      if (battleState.rocks.some((rock, index) => {
        return rotatedRectsIntersect(paddedRect, getRockCollisionRect(rock, index));
      })) {
        return true;
      }

      if ((battleState.mapDetails?.buildings || []).some((building) => (
        rotatedRectsIntersect(paddedRect, getBuildingCollisionRect(building))
      ))) {
        return true;
      }

      return getAllBattleTanks().some((otherTank) => {
        if (otherTank === tank) {
          return false;
        }

        return rotatedRectsIntersect(paddedRect, getTankCollisionRect(otherTank));
      });
    }

    function pointIsSafeForTank(tank, point, radiusPadding = 10) {
      return !tankWouldCollideAt(tank, point.x, point.y, radiusPadding);
    }

    function segmentIsClearForTank(tank, target, radiusPadding = 8) {
      const distance = Math.max(1, getDistanceBetween(tank, target));
      const steps = Math.ceil(distance / 72);

      for (let step = 1; step <= steps; step += 1) {
        const ratio = step / steps;
        const x = tank.x + (target.x - tank.x) * ratio;
        const y = tank.y + (target.y - tank.y) * ratio;

        if (tankWouldCollideAt(tank, x, y, radiusPadding)) {
          return false;
        }
      }

      return true;
    }

    function getTeamFallbackPoint(team) {
      return {
        x: team === "ally" ? 360 : battleState.mapWidth - 360,
        y: team === "ally" ? battleState.mapHeight - 360 : 360
      };
    }

    function getCoverPointFromTarget(bot, target) {
      if (!target) {
        return null;
      }

      const obstacles = [
        ...battleState.rocks,
        ...(battleState.mapDetails?.wrecks || []).map(([x, y]) => ({ x, y, radius: 62 }))
      ];
      let bestPoint = null;
      let bestScore = -Infinity;

      obstacles.forEach((obstacle) => {
        const targetAngle = Math.atan2(target.y - obstacle.y, target.x - obstacle.x);
        const coverDistance = obstacle.radius + bot.radius + 58;
        const point = clampPointToMap({
          x: obstacle.x - Math.cos(targetAngle) * coverDistance,
          y: obstacle.y - Math.sin(targetAngle) * coverDistance
        });

        if (!pointIsSafeForTank(bot, point, 12)) {
          return;
        }

        const distanceToBot = getDistanceBetween(bot, point);
        const distanceToTarget = getDistanceBetween(point, target);
        const className = getTankClassKey(bot);
        const preferredDistance = className === "\u0422\u0422" ? 310 : className === "\u041b\u0422" ? 430 : bot.botPreferredDistance;
        const distanceScore = 260 - Math.abs(distanceToTarget - preferredDistance);
        const travelScore = Math.max(0, 950 - distanceToBot) * 0.18;
        const score = distanceScore + travelScore + obstacle.radius * 0.6;

        if (score > bestScore) {
          bestScore = score;
          bestPoint = point;
        }
      });

      return bestPoint;
    }

    function getKitingPoint(bot, target, desiredDistance) {
      if (!target) {
        return null;
      }

      const awayAngle = Math.atan2(bot.y - target.y, bot.x - target.x);
      const strafeAngle = awayAngle + bot.botOrbitDirection * Math.PI / 2;
      const distance = getDistanceBetween(bot, target);
      const awayWeight = distance < desiredDistance * 0.72 ? 180 : 55;
      const strafeWeight = distance < desiredDistance * 1.12 ? 150 : 95;

      return clampPointToMap({
        x: bot.x + Math.cos(awayAngle) * awayWeight + Math.cos(strafeAngle) * strafeWeight,
        y: bot.y + Math.sin(awayAngle) * awayWeight + Math.sin(strafeAngle) * strafeWeight
      });
    }

    function chooseBestDetourPoint(bot, target) {
      const targetAngle = Math.atan2(target.y - bot.y, target.x - bot.x);
      const distances = [150, 230, 320];
      const angleOffsets = [0, 0.55, -0.55, 1.05, -1.05, 1.55, -1.55, Math.PI];
      let bestPoint = null;
      let bestScore = -Infinity;

      distances.forEach((distance) => {
        angleOffsets.forEach((offset) => {
          const angle = targetAngle + offset;
          const point = clampPointToMap({
            x: bot.x + Math.cos(angle) * distance,
            y: bot.y + Math.sin(angle) * distance
          });

          if (!pointIsSafeForTank(bot, point, 12)) {
            return;
          }

          const clearBonus = segmentIsClearForTank(bot, point, 6) ? 170 : 0;
          const progress = getDistanceBetween(bot, target) - getDistanceBetween(point, target);
          const turnPenalty = Math.abs(normalizeAngle(angle - bot.angle)) * 36;
          const centerBias = -Math.abs(point.x - battleState.mapWidth / 2) * 0.015 - Math.abs(point.y - battleState.mapHeight / 2) * 0.015;
          const score = progress + clearBonus + centerBias - turnPenalty - Math.abs(offset) * 18;

          if (score > bestScore) {
            bestScore = score;
            bestPoint = point;
          }
        });
      });

      return bestPoint || target;
    }

    function getTeamForwardPoint(team) {
      return {
        x: team === "ally" ? battleState.mapWidth - 360 : 360,
        y: team === "ally" ? 340 : battleState.mapHeight - 340
      };
    }

    function getTeamScoutPoint(team) {
      return {
        x: team === "ally" ? battleState.mapWidth - 520 : 520,
        y: team === "ally" ? 520 : battleState.mapHeight - 520
      };
    }

    function getTeamArtilleryPoint(team) {
      return {
        x: team === "ally" ? 270 : battleState.mapWidth - 270,
        y: team === "ally" ? battleState.mapHeight - 270 : 270
      };
    }

    function getNearestAllyHeavy(bot) {
      const allies = bot.team === "ally" ? battleState.allies : battleState.enemies;
      let bestTank = null;
      let bestDistance = Infinity;

      allies
        .filter((tank) => tank !== bot && tankIsAlive(tank) && getTankClassKey(tank) === "\u0422\u0422")
        .forEach((tank) => {
          const distance = Math.hypot(tank.x - bot.x, tank.y - bot.y);

          if (distance < bestDistance) {
            bestDistance = distance;
            bestTank = tank;
          }
        });

      return bestTank;
    }

    function getSupportPointBehind(tank, team) {
      const forward = getTeamForwardPoint(team);
      const angle = Math.atan2(forward.y - tank.y, forward.x - tank.x);

      return {
        x: tank.x - Math.cos(angle) * 150,
        y: tank.y - Math.sin(angle) * 150
      };
    }

    function getPatrolPoint(bot) {
      if (!bot.botPatrolPoint || Math.hypot(bot.botPatrolPoint.x - bot.x, bot.botPatrolPoint.y - bot.y) < 120) {
        const forward = getTeamForwardPoint(bot.team);

        bot.botPatrolPoint = {
          x: Math.max(180, Math.min(battleState.mapWidth - 180, forward.x + (Math.random() - 0.5) * 520)),
          y: Math.max(180, Math.min(battleState.mapHeight - 180, forward.y + (Math.random() - 0.5) * 520))
        };
      }

      return bot.botPatrolPoint;
    }

    function getBotDriveTarget(bot) {
      const className = getTankClassKey(bot);
      const base = battleState.mapDetails?.base;
      const target = bot.botTarget;
      const targetDistance = target ? getDistanceBetween(bot, target) : Infinity;
      const warObjective = getWarBotObjective(bot);

      if (warObjective) {
        return warObjective;
      }

      if (tankIsArtillery(bot)) {
        const artilleryPoint = getTeamArtilleryPoint(bot.team);
        const baseDistance = base ? Math.hypot(base.x - bot.x, base.y - bot.y) : 0;

        return baseDistance > 620 ? artilleryPoint : null;
      }

      if (className === "\u041b\u0422") {
        if (target && targetDistance < 360) {
          return getKitingPoint(bot, target, 470);
        }

        return getTeamScoutPoint(bot.team);
      }

      if (className === "\u0422\u0422") {
        if (target && targetDistance < 260) {
          return getKitingPoint(bot, target, 300);
        }

        return target || getTeamForwardPoint(bot.team);
      }

      if (className === "\u0421\u0422") {
        const heavy = getNearestAllyHeavy(bot);

        if (target && getHealthRatio(bot) < 0.38) {
          return getCoverPointFromTarget(bot, target) || getKitingPoint(bot, target, 430);
        }

        if (target && targetDistance < bot.botPreferredDistance * 0.78) {
          return getKitingPoint(bot, target, bot.botPreferredDistance);
        }

        return heavy ? getSupportPointBehind(heavy, bot.team) : target || getTeamForwardPoint(bot.team);
      }

      if (className === "\u041f\u0422" || className === "\u041f\u0422-\u0421\u0410\u0423") {
        if (target && tankCanFire(bot, getBestShell(bot)) && targetDistance < 720) {
          return getCoverPointFromTarget(bot, target) || bot;
        }

        return getPatrolPoint(bot);
      }

      if (getHealthRatio(bot) < 0.2 && battleState.mapDetails?.base) {
        return getTeamFallbackPoint(bot.team);
      }

      return target || getMostDangerousTarget(bot) || battleState.mapDetails?.base || null;
    }

    function getWarBotObjective(bot) {
      if (selectedBattleMode.id !== "war" || !battleState.war.bases) {
        return null;
      }

      const finalBase = bot.team === "ally" ? battleState.war.bases.enemy : battleState.war.bases.ally;
      return getWarRallyPoint(bot, finalBase, true);
    }

    function getWarRallyPoint(bot, objective, tighter = false) {
      const teamTanks = bot.team === "ally" ? battleState.allies : battleState.enemies;
      const teamIndex = Math.max(0, teamTanks.indexOf(bot));
      const angle = (teamIndex % 6) / 6 * Math.PI * 2 + (bot.team === "ally" ? 0 : Math.PI / 6);
      const ring = tighter ? objective.radius * 0.34 : objective.radius * (0.32 + (teamIndex % 3) * 0.12);

      return clampPointToMap({
        x: objective.x + Math.cos(angle) * ring,
        y: objective.y + Math.sin(angle) * ring
      }, 80);
    }

    function assignWarBotOrders() {
      if (selectedBattleMode.id !== "war" || battleState.war.controlPoints.length === 0) {
        return;
      }

      [battleState.allies, battleState.enemies].forEach((teamTanks) => {
        teamTanks.forEach((tank, index) => {
          tank.warObjectiveIndex = index % battleState.war.controlPoints.length;
        });
      });
    }

    function botPathIsBlocked(bot, angle) {
      const lookAhead = {
        x: bot.x + Math.cos(angle) * (bot.radius + 72),
        y: bot.y + Math.sin(angle) * (bot.radius + 72),
        radius: bot.radius + 8
      };

      if (
        lookAhead.x - lookAhead.radius < 0
        || lookAhead.y - lookAhead.radius < 0
        || lookAhead.x + lookAhead.radius > battleState.mapWidth
        || lookAhead.y + lookAhead.radius > battleState.mapHeight
      ) {
        return true;
      }

      if (battleState.rocks.some((rock) => {
        const dx = lookAhead.x - rock.x;
        const dy = lookAhead.y - rock.y;
        const minDistance = lookAhead.radius + rock.radius + 18;

        return dx * dx + dy * dy < minDistance * minDistance;
      })) {
        return true;
      }

      if ((battleState.mapDetails?.buildings || []).some(([x, y, width, height]) => (
        circleIntersectsRect(lookAhead, {
          x: x - width / 2,
          y: y - height / 2,
          width,
          height
        })
      ))) {
        return true;
      }

      return getAllBattleTanks().some((otherTank) => {
        if (otherTank === bot) {
          return false;
        }

        const dx = lookAhead.x - otherTank.x;
        const dy = lookAhead.y - otherTank.y;
        const minDistance = lookAhead.radius + otherTank.radius + 18;

        return dx * dx + dy * dy < minDistance * minDistance;
      });
    }

    function getBotNavigationPoint(bot, driveTarget, delta) {
      if (!driveTarget || driveTarget === bot) {
        bot.botPathPoint = null;
        bot.botPathTimer = 0;
        return driveTarget;
      }

      bot.botPathTimer = Math.max(0, bot.botPathTimer - delta);

      if (bot.botPathPoint && getDistanceBetween(bot, bot.botPathPoint) < 64) {
        bot.botPathPoint = null;
        bot.botPathTimer = 0;
      }

      if (segmentIsClearForTank(bot, driveTarget, 10) && !botPathIsBlocked(bot, Math.atan2(driveTarget.y - bot.y, driveTarget.x - bot.x))) {
        bot.botPathPoint = null;
        bot.botPathTimer = 0;
        return driveTarget;
      }

      if (!bot.botPathPoint || bot.botPathTimer <= 0 || !pointIsSafeForTank(bot, bot.botPathPoint, 12)) {
        bot.botPathPoint = chooseBestDetourPoint(bot, driveTarget);
        bot.botPathTimer = 0.55 + Math.random() * 0.35;
      }

      return bot.botPathPoint || driveTarget;
    }

    function updateBotStuckState(bot, delta) {
      const movedDistance = Math.hypot(bot.x - bot.botLastX, bot.y - bot.botLastY);

      bot.botStuckTimer = movedDistance < 3 ? bot.botStuckTimer + delta : Math.max(0, bot.botStuckTimer - delta * 1.8);
      bot.botLastX = bot.x;
      bot.botLastY = bot.y;

      if (bot.botStuckTimer > 0.7) {
        bot.botOrbitDirection *= -1;
        bot.botAvoidTimer = 0.75;
        bot.botPathPoint = null;
        bot.botPathTimer = 0;
        bot.botStuckTimer = 0;
      }
    }

    function updateBotTank(bot, delta) {
      if (!tankIsAlive(bot)) {
        return;
      }

      updateBotStuckState(bot, delta);
      bot.botThinkTimer -= delta;
      bot.botAvoidTimer = Math.max(0, bot.botAvoidTimer - delta);

      if (bot.botThinkTimer <= 0 || !tankIsAlive(bot.botTarget)) {
        bot.botThinkTimer = 0.18 + Math.random() * 0.18;
        bot.botTarget = getMostDangerousTarget(bot);
      }

      const driveTarget = getBotDriveTarget(bot);
      const className = getTankClassKey(bot);

      if (driveTarget) {
        const navigationTarget = getBotNavigationPoint(bot, driveTarget, delta);
        const driveDx = navigationTarget.x - bot.x;
        const driveDy = navigationTarget.y - bot.y;
        const driveAngle = Math.atan2(driveDy, driveDx);
        let desiredAngle = driveAngle;
        let speedMultiplier = 0.92;

        if (bot.botAvoidTimer > 0 || botPathIsBlocked(bot, driveAngle)) {
          bot.botAvoidTimer = Math.max(bot.botAvoidTimer, 0.42);
          desiredAngle += bot.botOrbitDirection * (Math.PI / 2);
          speedMultiplier = 0.72;
        }

        bot.angle = rotateAngleToward(bot.angle, desiredAngle, bot.turnSpeed * delta);

        bot.botTarget = getMostDangerousTarget(bot);

        if (bot.botTarget) {
          const turretAngle = Math.atan2(bot.botTarget.y - bot.y, bot.botTarget.x - bot.x);

          if (bot.hasTurret) {
            bot.turretAngle = rotateAngleToward(bot.turretAngle, turretAngle, Math.max(bot.turretTurnSpeed, 2.8) * delta);
          } else if (className === "\u041f\u0422" || className === "\u041f\u0422-\u0421\u0410\u0423" || tankIsArtillery(bot)) {
            bot.angle = rotateAngleToward(bot.angle, turretAngle, bot.turnSpeed * delta);
            bot.turretAngle = bot.angle;
          } else {
            bot.turretAngle = bot.angle;
          }
          fireBotShell(bot, bot.botTarget);
        } else {
          bot.turretAngle = bot.angle;
        }

        const angleError = Math.abs(normalizeAngle(desiredAngle - bot.angle));
        const canDrive = angleError < Math.PI * 0.55;

        if (driveTarget !== bot && canDrive && !(tankIsArtillery(bot) && bot.botTarget) && !moveTank(bot, bot.speed * speedMultiplier * delta)) {
          bot.botOrbitDirection *= -1;
          bot.botAvoidTimer = 0.55;
          bot.angle = normalizeAngle(driveAngle + bot.botOrbitDirection * (Math.PI / 2));
          bot.botPathPoint = chooseBestDetourPoint(bot, driveTarget);
          bot.botPathTimer = 0.45;
        }
      } else {
        bot.turretAngle = bot.angle;
      }
    }

    function tankIsInsideBase(tank, base) {
      const dx = tank.x - base.x;
      const dy = tank.y - base.y;
      const captureRadius = base.radius + tank.radius * 0.25;

      return dx * dx + dy * dy <= captureRadius * captureRadius;
    }

    function createCaptureState() {
      return {
        owner: null,
        team: null,
        progress: 0,
        allyCount: 0,
        enemyCount: 0
      };
    }

    function createWarObjective(x, y, radius, label) {
      return {
        x,
        y,
        radius,
        label,
        ...createCaptureState()
      };
    }

    function createWarState() {
      const preset = getCurrentMapPreset();
      const warPoints = preset.warPoints || [[680, 510, "radio"], [1650, 500, "ammo"], [760, 1120, "mines"], [1720, 1100, "radio"]];
      const warBases = preset.warBases || { ally: [280, battleState.mapHeight - 260], enemy: [battleState.mapWidth - 280, 260] };

      return {
        controlPoints: warPoints.map(([x, y, kind], index) => ({
          ...createWarObjective(x, y, 112, "ABCD"[index] || String(index + 1)),
          kind: kind || "radio"
        })),
        bases: {
          ally: createWarObjective(warBases.ally[0], warBases.ally[1], 132, "\u0411\u0430\u0437\u0430"),
          enemy: createWarObjective(warBases.enemy[0], warBases.enemy[1], 132, "\u0411\u0430\u0437\u0430")
        },
        respawnDelay: 4
      };
    }

    function teamOwnsAllWarPoints(team) {
      return battleState.war.controlPoints.length > 0
        && battleState.war.controlPoints.every((point) => point.owner === team);
    }

    function updateCaptureZone(zone, delta, options = {}) {
      const allyCount = battleState.allies.filter((tank) => tankIsAlive(tank) && tankIsInsideBase(tank, zone)).length;
      const enemyCount = battleState.enemies.filter((tank) => tankIsAlive(tank) && tankIsInsideBase(tank, zone)).length;
      const capturingTeam = allyCount > enemyCount ? "ally" : enemyCount > allyCount ? "enemy" : null;
      const capturingCount = capturingTeam === "ally" ? allyCount : enemyCount;

      zone.allyCount = allyCount;
      zone.enemyCount = enemyCount;

      if (allyCount > 0 && enemyCount > 0) {
        return null;
      }

      if (!capturingTeam || zone.owner === capturingTeam || (options.canCapture && !options.canCapture(capturingTeam))) {
        zone.team = null;
        zone.progress = 0;
        return null;
      }

      if (zone.team !== capturingTeam) {
        zone.team = capturingTeam;
        zone.progress = 0;
      }

      const captureDuration = options.captureDuration || baseCaptureDuration;
      const captureMultiplier = 1 + Math.max(0, capturingCount - 1) * (baseCaptureTankMultiplier - 1);
      zone.progress = Math.min(100, zone.progress + (100 / captureDuration) * captureMultiplier * delta);

      if (capturingTeam === "ally" && battleState.stats) {
        battleState.stats.baseCapture = Math.min(100, battleState.stats.baseCapture + (100 / captureDuration) * delta * 0.35);
      }

      if (zone.progress < 100) {
        return null;
      }

      zone.owner = capturingTeam;
      zone.team = null;
      zone.progress = 0;
      return capturingTeam;
    }

    function updateBaseCapture(delta) {
      const base = battleState.mapDetails?.base;

      if (!base) {
        battleState.baseCapture.team = null;
        battleState.baseCapture.progress = 0;
        return;
      }

      const capture = battleState.baseCapture;
      const allyCount = battleState.allies.filter((tank) => tankIsAlive(tank) && tankIsInsideBase(tank, base)).length;
      const enemyCount = battleState.enemies.filter((tank) => tankIsAlive(tank) && tankIsInsideBase(tank, base)).length;
      const capturingTeam = allyCount > enemyCount ? "ally" : enemyCount > allyCount ? "enemy" : null;
      const capturingCount = capturingTeam === "ally" ? allyCount : enemyCount;
      const captureMultiplier = 1 + Math.max(0, capturingCount - 1) * (baseCaptureTankMultiplier - 1);
      const captureStep = (100 / baseCaptureDuration) * captureMultiplier * delta;

      capture.allyCount = allyCount;
      capture.enemyCount = enemyCount;

      if (allyCount > 0 && enemyCount > 0) {
        return;
      }

      if (!capturingTeam) {
        capture.team = null;
        capture.progress = 0;
        return;
      }

      if (capture.team !== capturingTeam) {
        capture.team = capturingTeam;
        capture.progress = 0;
      }

      if (
        capturingTeam === "ally"
        && tankIsAlive(battleState.player)
        && tankIsInsideBase(battleState.player, base)
        && battleState.stats
      ) {
        battleState.stats.baseCapture = Math.min(100, battleState.stats.baseCapture + captureStep);

        if (allyCount === 1 && getHealthRatio(battleState.player) < 0.05) {
          battleState.stats.lowHealthSoloCapture = true;
        }
      }

      capture.progress = Math.min(100, capture.progress + captureStep);

      if (capture.progress >= 100) {
        capture.owner = capturingTeam;
        capture.progress = 100;
        if (
          capturingTeam === "ally"
          && battleState.stats
          && allyCount === 1
          && tankIsAlive(battleState.player)
          && tankIsInsideBase(battleState.player, base)
          && getHealthRatio(battleState.player) < 0.05
        ) {
          battleState.stats.lowHealthSoloCapture = true;
        }
        showBattleResult(capturingTeam === "ally" ? "victory" : "defeat");
      }
    }

    function updateWarCapture(delta) {
      if (!battleState.war.bases) {
        return;
      }

      battleState.war.controlPoints.forEach((point) => updateCaptureZone(point, delta, {
        captureDuration: warPointCaptureDuration
      }));

      const allyCapturedEnemyBase = updateCaptureZone(battleState.war.bases.enemy, delta, {
        canCapture: (team) => team === "ally" && teamOwnsAllWarPoints("ally")
      });
      const enemyCapturedAllyBase = updateCaptureZone(battleState.war.bases.ally, delta, {
        canCapture: (team) => team === "enemy" && teamOwnsAllWarPoints("enemy")
      });

      if (allyCapturedEnemyBase === "ally") {
        showBattleResult("victory");
        return;
      }

      if (enemyCapturedAllyBase === "enemy") {
        showBattleResult("defeat");
      }
    }

    function getProjectileTargets(projectile) {
      return (projectile.team === "ally" ? battleState.enemies : battleState.allies)
        .filter(tankIsAlive);
    }

    function shellCanPierceRock(shell) {
      const shellType = normalizeShellType(shell?.type || "");

      return shellType === "\u0411\u0411" || shellType === "\u041f\u0411";
    }

    function projectileHitsObstacle(projectile) {
      if (projectile.piercesObstacles) {
        return false;
      }

      const hitsBlockingRock = battleState.rocks.some((rock, index) => {
        if (!circleIntersectsRotatedRect(projectile, getRockCollisionRect(rock, index))) {
          return false;
        }

        if (!shellCanPierceRock(projectile.shell)) {
          return true;
        }

        if (!projectile.piercedRockIndexes.has(index)) {
          projectile.piercedRockIndexes.add(index);
          projectile.shell.penetration *= 0.85;
        }

        return false;
      });

      if (hitsBlockingRock) {
        return true;
      }

      if ((battleState.mapDetails?.buildings || []).some((building) => (
        circleIntersectsRotatedRect(projectile, getBuildingCollisionRect(building))
      ))) {
        return true;
      }

      return getAllBattleTanks().some((tank) => {
        if (tankIsAlive(tank) || tank === projectile.owner) {
          return false;
        }

        return circleIntersectsRotatedRect(projectile, getTankCollisionRect(tank));
      });
    }

    function getRandomizedShellDamage(shell) {
      return Math.max(0, Math.round(shell.damage * (0.75 + Math.random() * 0.5)));
    }

    function shellPenetratesTarget(shell, target) {
      const armor = normalizeNumber(target?.tank?.averageArmor || target?.averageArmor || 0);
      let chance = normalizeNumber(target?.tank?.penetrationChance || target?.penetrationChance || 0);
      const penetration = normalizeNumber(shell?.penetration || 1000);
      const shellType = normalizeShellType(shell?.type || "");

      if (armor <= 0 || chance <= 0) {
        return true;
      }

      if (shellType === "\u041e\u0424") {
        chance *= 3;
      }

      chance = Math.max(1, Math.round(chance));

      const roll = 1 + Math.floor(Math.random() * chance);

      if (armor <= penetration) {
        return roll !== chance;
      }

      return roll === chance;
    }

    function getProjectileDamageAfterPenetration(projectile, penetrated) {
      if (penetrated) {
        return projectile.damage;
      }

      if (normalizeShellType(projectile.shell?.type || "") !== "\u041e\u0424") {
        return 0;
      }

      return Math.max(1, Math.round(projectile.damage * (0.2 + Math.random() * 0.1)));
    }

    function damageTank(tank, damage) {
      const wasAlive = tankIsAlive(tank);

      tank.health = Math.max(0, tank.health - damage);

      if (wasAlive && !tankIsAlive(tank)) {
        tank.destroyedAt = performance.now();
        tank.respawnTimer = selectedBattleMode.id === "war" ? battleState.war.respawnDelay : 0;
        tank.reloadTimer = 0;
        tank.clipReloadTimer = 0;
        tank.botTarget = null;
      }
    }

    function removeDestroyedTanks() {
      if (battleState.player && !tankIsAlive(battleState.player) && !tankIsAlive(battleState.spectatorTarget)) {
        battleState.spectatorTarget = getNextSpectatorTarget(1);
      }
    }

    function updateReloadIndicator() {
      const player = battleState.player;

      if (!battleState.active || !tankIsAlive(player) || !gameSettings.showReloadIndicator) {
        reloadIndicator.style.display = "none";
        return;
      }

      const isReloading = player.reloadTimer > 0 || (player.gunType === 3 && player.clipReloadTimer > 0 && player.clipAmmo < player.clipSize);
      const value = player.reloadTimer > 0 ? player.reloadTimer : player.gunType === 3 && player.clipReloadTimer > 0 ? player.clipReloadTimer : player.reloadTime;
      const clipText = [2, 3].includes(player.gunType)
        ? ` | ${player.clipAmmo}/${player.clipSize}`
        : player.clipFireMode ? ` | ${player.burstClipAmmo}/${player.shellsPerShot}` : "";

      reloadIndicator.textContent = `${value.toFixed(1)}с${clipText}`;
      reloadIndicator.classList.toggle("reloading", isReloading);
      reloadIndicator.style.display = "block";
      reloadIndicator.style.transform = `translate(${battleState.cursor.x + 18}px, ${battleState.cursor.y - 34}px)`;
    }

    function createShellProjectile(tank, shell, angle) {
      const muzzleDistance = tank.hasTurret ? 58 : 48;
      const damage = getRandomizedShellDamage(shell);
      const projectileShell = { ...shell };

      if (tank === battleState.player && battleState.stats) {
        battleState.stats.shots += 1;
      }

      battleState.projectiles.push({
        x: tank.x + Math.cos(angle) * muzzleDistance,
        y: tank.y + Math.sin(angle) * muzzleDistance,
        startX: tank.x + Math.cos(angle) * muzzleDistance,
        startY: tank.y + Math.sin(angle) * muzzleDistance,
        angle,
        speed: projectileSpeed,
        radius: 5,
        team: tank.team,
        owner: tank,
        shell: projectileShell,
        damage,
        piercesObstacles: tankIsArtillery(tank),
        piercedRockIndexes: new Set(),
        maxDistance: tankIsArtillery(tank) ? Infinity : battleState.mapWidth / 2
      });
    }

    function tankCanFire(tank, shell) {
      if (!tankIsAlive(tank) || !shell || shell.damage <= 0 || tank.reloadTimer > 0) {
        return false;
      }

      if (tank.gunType === 1 && tank.clipFireMode && tank.shellsPerShot > 1) {
        return tank.burstClipAmmo > 0;
      }

      return ![2, 3].includes(tank.gunType) || tank.clipAmmo > 0;
    }

    function fireTankShell(tank, shell, angle) {
      if (!tankCanFire(tank, shell)) {
        return false;
      }

      const usesBurstClip = tank.gunType === 1 && tank.clipFireMode && tank.shellsPerShot > 1;
      const shellCount = usesBurstClip ? 1 : Math.max(1, normalizeNumber(tank.shellsPerShot || 1) || 1);
      const spreadStep = shellCount > 1 ? 0.035 : 0;
      const spreadStart = -spreadStep * (shellCount - 1) / 2;
      const gunSpread = Math.max(0, normalizePositiveFloat(tank.gunSpreadRadians || 0));

      for (let index = 0; index < shellCount; index += 1) {
        const shotSpread = (Math.random() - 0.5) * gunSpread;
        const multiShotSpread = spreadStart + spreadStep * index + (shellCount > 1 ? (Math.random() - 0.5) * 0.014 : 0);

        createShellProjectile(tank, shell, angle + shotSpread + multiShotSpread);
      }

      if (usesBurstClip) {
        tank.burstClipAmmo = Math.max(0, tank.burstClipAmmo - 1);
        tank.reloadTimer = tank.burstClipAmmo > 0 ? tank.clipShotDelay : tank.reloadTime;
      } else if ([2, 3].includes(tank.gunType)) {
        tank.clipAmmo = Math.max(0, tank.clipAmmo - 1);

        if (tank.gunType === 2) {
          tank.reloadTimer = tank.clipAmmo > 0 ? tank.clipShotDelay : tank.reloadTime;
        } else {
          tank.reloadTimer = tank.clipShotDelay;

          if (tank.clipReloadTimer <= 0 && tank.clipAmmo < tank.clipSize) {
            tank.clipReloadTimer = tank.reloadTime;
          }
        }
      } else {
        tank.reloadTimer = tank.reloadTime;
      }

      return true;
    }

    function firePlayerShell() {
      const player = battleState.player;
      const shell = battleState.selectedShell;

      if (!tankCanFire(player, shell)) {
        return;
      }

      const angle = player.hasTurret ? player.turretAngle : player.angle;

      if (fireTankShell(player, shell, angle)) {
        if (battleState.tutorial.enabled) {
          battleState.tutorial.fired = true;
        }
        renderBattleAmmoPanel();
      }
    }

    function fireBotShell(bot, target) {
      const shell = getBestShell(bot);

      if (!tankIsAlive(target) || !tankCanFire(bot, shell)) {
        return;
      }

      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const distance = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      const gunAngle = bot.hasTurret ? bot.turretAngle : bot.angle;
      const aimError = Math.abs(normalizeAngle(targetAngle - gunAngle));

      const isArtillery = tankIsArtillery(bot);

      if ((!isArtillery && distance > 900) || aimError > (isArtillery ? 0.34 : 0.22)) {
        return;
      }

      fireTankShell(bot, shell, gunAngle);
    }

    function updateProjectiles(delta) {
      battleState.projectiles = battleState.projectiles.filter((projectile) => {
        projectile.x += Math.cos(projectile.angle) * projectile.speed * delta;
        projectile.y += Math.sin(projectile.angle) * projectile.speed * delta;
        const traveledDistance = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);

        if (
          traveledDistance >= projectile.maxDistance
          || projectile.x < 0
          || projectile.y < 0
          || projectile.x > battleState.mapWidth
          || projectile.y > battleState.mapHeight
        ) {
          return false;
        }

        if (projectileHitsObstacle(projectile)) {
          return false;
        }

        const target = getProjectileTargets(projectile).find((tank) => (
          circleIntersectsRotatedRect(projectile, getTankCollisionRect(tank))
        ));

        if (target) {
          const penetrated = shellPenetratesTarget(projectile.shell, target);
          const finalDamage = getProjectileDamageAfterPenetration(projectile, penetrated);

          if (projectile.owner === battleState.player && battleState.stats) {
            battleState.stats.hits += 1;

            if (finalDamage > 0) {
              const dealtDamage = Math.min(target.health, finalDamage);

              battleState.stats.damage += dealtDamage;
              if (dealtDamage > 0 && battleState.tutorial.enabled) {
                battleState.tutorial.dealtDamage = true;
              }

              if (target.health > 0 && target.health - finalDamage <= 0) {
                battleState.stats.kills += 1;
              }
            }
          }

          if (finalDamage > 0) {
            damageTank(target, finalDamage);
          }

          return false;
        }

        return true;
      });

      removeDestroyedTanks();
    }

    function getNextSpectatorTarget(direction) {
      const aliveAllies = battleState.allies.filter((tank) => tankIsAlive(tank) && tank !== battleState.player);

      if (aliveAllies.length === 0) {
        return null;
      }

      const currentIndex = aliveAllies.indexOf(battleState.spectatorTarget);
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + aliveAllies.length) % aliveAllies.length;

      return aliveAllies[nextIndex];
    }

    function switchSpectatorTarget(direction) {
      if (tankIsAlive(battleState.player)) {
        return;
      }

      battleState.spectatorTarget = getNextSpectatorTarget(direction);
    }

    function getCameraTarget() {
      if (tankIsAlive(battleState.player)) {
        return battleState.player;
      }

      if (!tankIsAlive(battleState.spectatorTarget)) {
        battleState.spectatorTarget = getNextSpectatorTarget(1);
      }

      return battleState.spectatorTarget || battleState.allies.find(tankIsAlive) || battleState.enemies.find(tankIsAlive) || battleState.player;
    }

    function playerUsesFullMapView() {
      return battleState.artilleryMapView && tankIsAlive(battleState.player) && tankIsArtillery(battleState.player);
    }

    function calculateBattleRewards(result) {
      const stats = battleState.stats || createBattleStats();
      const victoryMultiplier = result === "victory" ? 1.35 : 0.75;
      const hitRatio = stats.shots > 0 ? stats.hits / stats.shots : 0;
      const experience = Math.max(0, Math.round((
        stats.damage * 0.32
        + stats.kills * 45
        + stats.baseCapture * 1.8
        + hitRatio * 35
        + (result === "victory" ? 70 : 20)
      ) * victoryMultiplier));
      const silver = Math.max(0, Math.round((
        stats.damage * 2.8
        + stats.kills * 180
        + stats.baseCapture * 9
        + stats.hits * 18
        + (result === "victory" ? 450 : 120)
      ) * victoryMultiplier));

      return { experience, silver };
    }

    function recordBattleStats(result, stats, tank) {
      const tankId = tank ? String(tank.id) : "unknown";
      const tankStats = {
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
        ...(playerStats.tanks[tankId] || {})
      };
      Object.keys(tankStats).forEach((key) => {
        tankStats[key] = normalizeNumber(tankStats[key]);
      });

      playerStats.battles += 1;
      playerStats.victories += result === "victory" ? 1 : 0;
      playerStats.defeats += result === "victory" ? 0 : 1;
      playerStats.damage += normalizeNumber(stats.damage);
      playerStats.kills += normalizeNumber(stats.kills);
      playerStats.shots += normalizeNumber(stats.shots);
      playerStats.hits += normalizeNumber(stats.hits);
      playerStats.baseCapture += Math.round(normalizeNumber(stats.baseCapture));
      playerStats.experience += normalizeNumber(stats.experience);
      playerStats.silver += normalizeNumber(stats.silver);

      tankStats.battles += 1;
      tankStats.victories += result === "victory" ? 1 : 0;
      tankStats.defeats += result === "victory" ? 0 : 1;
      tankStats.damage += normalizeNumber(stats.damage);
      tankStats.kills += normalizeNumber(stats.kills);
      tankStats.shots += normalizeNumber(stats.shots);
      tankStats.hits += normalizeNumber(stats.hits);
      tankStats.baseCapture += Math.round(normalizeNumber(stats.baseCapture));
      tankStats.experience += normalizeNumber(stats.experience);
      tankStats.silver += normalizeNumber(stats.silver);
      playerStats.tanks[tankId] = tankStats;
      savePlayerStats();
    }

    function applyBattleRewards(result) {
      const stats = battleState.stats;

      if (!stats || stats.rewardsApplied) {
        return stats || createBattleStats();
      }

      const rewards = calculateBattleRewards(result);
      const tank = findLoadedTankByReference(selectedTank);

      stats.experience = rewards.experience;
      stats.silver = rewards.silver;
      stats.rewardsApplied = true;

      if (tank) {
        tank.experience = toEightDigits(normalizeNumber(tank.experience) + rewards.experience);
        selectedTank = tank;
        saveTankExperience(tank);
      }

      playerResources.silver = normalizeNumber(playerResources.silver) + rewards.silver;
      recordBattleStats(result, stats, tank);
      savePlayerResources();
      renderTopBar();
      renderTankBar(loadedTanks);

      return stats;
    }

    function evaluateBattleMedals(result, stats) {
      const medals = [];

      if (selectedBattleMode.size !== 7 || !stats) {
        return medals;
      }

      if (result === "victory" && stats.lowHealthSoloCapture) {
        medals.push({
          name: "\u041f\u0440\u043e\u0440\u044b\u0432 \u0413\u0443\u0434\u0435\u0440\u0438\u0430\u043d\u0430",
          description: "\u0417\u0430\u0445\u0432\u0430\u0442 \u0431\u0430\u0437\u044b \u0432 \u043e\u0434\u0438\u043d\u043e\u0447\u043a\u0443 \u043f\u0440\u0438 \u043c\u0435\u043d\u0435\u0435 5% HP."
        });
      }

      if (stats.kills >= 5 && getHealthRatio(battleState.player) > 0.7) {
        medals.push({
          name: "\u041a\u043e\u043b\u043e\u0431\u0430\u043d\u043e\u0432",
          description: "\u0423\u043d\u0438\u0447\u0442\u043e\u0436\u0438\u0442\u044c 5 \u0442\u0430\u043d\u043a\u043e\u0432 \u0438 \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u0442\u044c \u0431\u043e\u0439 \u0441 \u0431\u043e\u043b\u0435\u0435 70% HP."
        });
      }

      return medals;
    }

    function createResultStat(label, value) {
      const stat = document.createElement("div");
      const labelElement = document.createElement("div");
      const valueElement = document.createElement("div");

      stat.className = "battleResultStat";
      labelElement.className = "battleResultLabel";
      valueElement.className = "battleResultValue";
      labelElement.textContent = label;
      valueElement.textContent = value;
      stat.append(labelElement, valueElement);
      return stat;
    }

    function renderBattleResultPanel(result, stats) {
      const panel = document.createElement("div");
      const title = document.createElement("div");
      const mode = document.createElement("div");
      const grid = document.createElement("div");
      const rewards = document.createElement("div");
      const medals = document.createElement("div");
      const closeButton = document.createElement("button");
      const hitRatio = stats.shots > 0 ? Math.round(stats.hits / stats.shots * 100) : 0;

      panel.className = "battleResultPanel";
      title.className = "battleResultTitle";
      mode.className = "battleResultMode";
      grid.className = "battleResultGrid";
      rewards.className = "battleRewardRow";
      medals.className = "battleRewardRow";
      closeButton.type = "button";
      closeButton.className = "battleResultClose";
      title.textContent = result === "victory" ? "\u041f\u043e\u0431\u0435\u0434\u0430" : "\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435";
      mode.textContent = `${selectedBattleMode.title} - ${selectedBattleMode.size} \u043d\u0430 ${selectedBattleMode.size}`;
      closeButton.textContent = "\u0412 \u0430\u043d\u0433\u0430\u0440";
      closeButton.addEventListener("click", stopBattle);

      grid.append(
        createResultStat("\u0423\u0440\u043e\u043d", formatStoredNumber(stats.damage)),
        createResultStat("\u0423\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u043e", formatStoredNumber(stats.kills)),
        createResultStat("\u0417\u0430\u0445\u0432\u0430\u0442 \u0431\u0430\u0437\u044b", `${Math.round(stats.baseCapture)}%`),
        createResultStat("\u0412\u044b\u0441\u0442\u0440\u0435\u043b\u044b", formatStoredNumber(stats.shots)),
        createResultStat("\u041f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u044f", formatStoredNumber(stats.hits)),
        createResultStat("\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c", `${hitRatio}%`)
      );

      rewards.append(
        createResultStat("\u041e\u043f\u044b\u0442 \u0437\u0430 \u0431\u043e\u0439", `+${formatStoredNumber(stats.experience)}`),
        createResultStat("\u0421\u0435\u0440\u0435\u0431\u0440\u043e \u0437\u0430 \u0431\u043e\u0439", `+${formatStoredNumber(stats.silver)}`)
      );
      [...rewards.children].forEach((item) => item.classList.add("battleReward"));
      (stats.medals || []).forEach((medal) => {
        medals.append(createResultStat(medal.name, medal.description));
      });
      [...medals.children].forEach((item) => item.classList.add("battleReward"));

      if (gameSettings.showBattleResultPanel) {
        panel.append(title, mode, grid, rewards);
      } else {
        panel.append(title, mode, rewards);
      }

      if (medals.children.length > 0) {
        panel.append(medals);
      }

      panel.append(closeButton);
      battleResult.replaceChildren(panel);
    }

    function showBattleResult(result) {
      const stats = applyBattleRewards(result);

      recordVictoryDayEventProgress(result);
      stats.medals = evaluateBattleMedals(result, stats);
      battleState.result = result;
      battleState.active = false;
      cancelAnimationFrame(battleState.animationFrame);
      battleResult.className = result;
      renderBattleResultPanel(result, stats);
      battleResult.style.display = "flex";
      reloadIndicator.style.display = "none";
      battleAmmoPanel.style.display = "none";
      pressedKeys.clear();
    }

    function checkBattleOutcome() {
      if (battleState.result) {
        return;
      }

      if (selectedBattleMode.id === "commander") {
        const enemyCommander = battleState.enemies[0];

        if (!tankIsAlive(enemyCommander)) {
          if (battleState.stats) {
            battleState.stats.commanderKill = true;
          }
          showBattleResult("victory");
          return;
        }

        if (!tankIsAlive(battleState.player)) {
          showBattleResult("defeat");
        }
        return;
      }

      if (selectedBattleMode.id === "war") {
        return;
      }

      if (battleState.enemies.filter(tankIsAlive).length === 0) {
        showBattleResult("victory");
        return;
      }

      if (battleState.allies.filter(tankIsAlive).length === 0) {
        showBattleResult("defeat");
      }
    }

    function updateBattle(delta) {
      updateReloadTimers(delta);
      updateWarRespawns(delta);
      updatePlayerTank(delta);
      updateSpotting();
      battleState.allies
        .filter((tank) => tank.isBot)
        .forEach((tank) => updateBotTank(tank, delta));
      battleState.enemies.forEach((tank) => updateBotTank(tank, delta));
      updateProjectiles(delta);
      updateSpotting();
      if (selectedBattleMode.id === "war") {
        updateWarCapture(delta);
      } else {
        updateBaseCapture(delta);
      }

      if (!tankIsAlive(battleState.player) && selectedBattleMode.id !== "war") {
        battleAmmoPanel.style.display = "none";
        battleBackButton.style.display = "block";
      } else {
        battleBackButton.style.display = "none";
      }

      checkBattleOutcome();

      if (!battleState.active) {
        return;
      }

      const cameraTarget = getCameraTarget();

      if (!cameraTarget) {
        return;
      }

      if (playerUsesFullMapView()) {
        const scale = Math.min(
          battleCanvas.clientWidth / battleState.mapWidth,
          battleCanvas.clientHeight / battleState.mapHeight
        );

        battleState.camera.scale = scale;
        battleState.camera.x = 0;
        battleState.camera.y = 0;
        battleState.camera.offsetX = (battleCanvas.clientWidth - battleState.mapWidth * scale) / 2;
        battleState.camera.offsetY = (battleCanvas.clientHeight - battleState.mapHeight * scale) / 2;
      } else {
        battleState.camera.scale = 1;
        battleState.camera.offsetX = 0;
        battleState.camera.offsetY = 0;
        battleState.camera.x = Math.max(0, Math.min(
          cameraTarget.x - battleCanvas.clientWidth / 2,
          Math.max(0, battleState.mapWidth - battleCanvas.clientWidth)
        ));
        battleState.camera.y = Math.max(0, Math.min(
          cameraTarget.y - battleCanvas.clientHeight / 2,
          Math.max(0, battleState.mapHeight - battleCanvas.clientHeight)
        ));
      }
      updateReloadIndicator();
    }

