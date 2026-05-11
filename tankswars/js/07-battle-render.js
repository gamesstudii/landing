    function drawBattleMap(ctx) {
      const details = battleState.mapDetails;
      const time = performance.now() / 1000;
      const preset = getCurrentMapPreset();

      ctx.fillStyle = preset.ground || "#3f4f34";
      ctx.fillRect(0, 0, battleState.mapWidth, battleState.mapHeight);

      for (let x = 0; x < battleState.mapWidth; x += 120) {
        for (let y = 0; y < battleState.mapHeight; y += 96) {
          const shade = ((x * 17 + y * 31) % 37) / 37;
          ctx.fillStyle = shade > 0.5 ? preset.shadeA || "rgba(42, 56, 32, 0.45)" : preset.shadeB || "rgba(74, 83, 45, 0.28)";
          ctx.fillRect(x + 16, y + 24, 72, 18);
        }
      }

      details.scorches.forEach(([x, y, width, height, angle]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const gradient = ctx.createRadialGradient(0, 0, 12, 0, 0, Math.max(width, height) * 0.58);
        gradient.addColorStop(0, "rgba(20, 18, 14, 0.82)");
        gradient.addColorStop(0.58, "rgba(38, 30, 22, 0.62)");
        gradient.addColorStop(1, "rgba(30, 26, 20, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      details.dirt.forEach(([x, y, width, height, angle]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(92, 79, 50, 0.32)";
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      details.roads.forEach((road) => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#6f654d";
        ctx.lineWidth = 66;
        drawPolyline(ctx, road);
        ctx.strokeStyle = "rgba(52, 46, 35, 0.2)";
        ctx.lineWidth = 46;
        drawPolyline(ctx, road);
      });

      (details.buildings || []).forEach(([x, y, width, height, angle = 0], index) => {
        drawBattleBuilding(ctx, x, y, width, height, angle, index);
      });
      if (details.reichstag) {
        drawReichstag(ctx, details.reichstag);
      }

      battleState.rivers.forEach((river) => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(38, 69, 48, 0.52)";
        ctx.lineWidth = river.width + 30;
        drawPolyline(ctx, river.points);
        ctx.strokeStyle = "#2f8bb6";
        ctx.lineWidth = river.width;
        drawPolyline(ctx, river.points);
        ctx.strokeStyle = "rgba(134, 198, 219, 0.44)";
        ctx.lineWidth = Math.max(8, river.width * 0.12);
        drawPolyline(ctx, river.points.map((point) => ({ x: point.x, y: point.y - river.width * 0.2 })));
      });

      details.grass.forEach(([x, y, width, height]) => {
        ctx.fillStyle = "rgba(45, 92, 42, 0.52)";
        ctx.beginPath();
        ctx.ellipse(x, y, width / 2, height / 2, -0.12, 0, Math.PI * 2);
        ctx.fill();
      });

      details.reeds.forEach(([x, y]) => {
        ctx.strokeStyle = "rgba(181, 171, 87, 0.78)";
        ctx.lineWidth = 3;
        for (let index = 0; index < 5; index += 1) {
          const offset = (index - 2) * 7;
          ctx.beginPath();
          ctx.moveTo(x + offset, y + 18);
          ctx.lineTo(x + offset + 5, y - 18 - (index % 2) * 8);
          ctx.stroke();
        }
      });

      if (selectedBattleMode.id === "war") {
        drawWarObjectives(ctx, time);
      } else if (details.base) {
        drawBattleBase(ctx, details.base, time);
      }

      details.craters.forEach(([x, y, radius]) => {
        ctx.fillStyle = "rgba(21, 18, 15, 0.8)";
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.18, radius * 0.72, -0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(115, 96, 66, 0.62)";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
        ctx.beginPath();
        ctx.ellipse(x - radius * 0.18, y + radius * 0.12, radius * 0.56, radius * 0.3, -0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      battleState.rocks.forEach((rock, index) => drawRubble(ctx, rock, index));

      details.trees.forEach(([x, y]) => {
        const isBurning = details.burningTrees.some(([burnX, burnY]) => burnX === x && burnY === y);

        ctx.fillStyle = "#3d2b1b";
        ctx.fillRect(x - 5, y + 12, 10, 22);
        ctx.fillStyle = isBurning ? "#171410" : "#244f2d";
        ctx.beginPath();
        ctx.arc(x, y, 27, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isBurning ? "#2b2418" : "#2f6837";
        ctx.beginPath();
        ctx.arc(x - 10, y - 7, 18, 0, Math.PI * 2);
        ctx.arc(x + 12, y - 5, 20, 0, Math.PI * 2);
        ctx.arc(x + 2, y + 10, 19, 0, Math.PI * 2);
        ctx.fill();

        if (isBurning) {
          drawBattleFire(ctx, x, y + 10, 20, time);
        }
      });

      details.wrecks.forEach(([x, y, angle]) => drawWreck(ctx, x, y, angle));
      details.fires.forEach(([x, y, size]) => drawBattleFire(ctx, x, y, size, time));
      details.smoke.forEach(([x, y, size], index) => drawBattleSmoke(ctx, x, y, size, time + index * 0.7));
    }

    function drawBattleFire(ctx, x, y, size, time) {
      const flicker = Math.sin(time * 7 + x * 0.03) * 0.16 + Math.sin(time * 11 + y * 0.02) * 0.1;
      const flameHeight = size * (1.15 + flicker);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 80, 18, 0.28)";
      ctx.beginPath();
      ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d63d12";
      ctx.beginPath();
      ctx.moveTo(x - size * 0.45, y + size * 0.35);
      ctx.quadraticCurveTo(x - size * 0.2, y - flameHeight * 0.55, x, y - flameHeight);
      ctx.quadraticCurveTo(x + size * 0.38, y - flameHeight * 0.35, x + size * 0.5, y + size * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffb12b";
      ctx.beginPath();
      ctx.moveTo(x - size * 0.18, y + size * 0.28);
      ctx.quadraticCurveTo(x, y - flameHeight * 0.45, x + size * 0.14, y - flameHeight * 0.72);
      ctx.quadraticCurveTo(x + size * 0.26, y - flameHeight * 0.18, x + size * 0.25, y + size * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawBattleSmoke(ctx, x, y, size, time) {
      ctx.save();
      for (let index = 0; index < 6; index += 1) {
        const drift = Math.sin(time * 0.9 + index) * size * 0.18;
        const rise = index * size * 0.22;
        const radius = size * (0.28 + index * 0.055);
        const alpha = Math.max(0.06, 0.34 - index * 0.045);

        ctx.fillStyle = `rgba(20, 20, 20, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x + drift + index * 5, y - rise, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawWreck(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "#1c1b18";
      ctx.strokeStyle = "#070707";
      ctx.lineWidth = 4;
      ctx.fillRect(-46, -22, 92, 44);
      ctx.strokeRect(-46, -22, 92, 44);
      ctx.fillStyle = "#332c22";
      ctx.fillRect(-18, -14, 38, 28);
      ctx.strokeRect(-18, -14, 38, 28);
      ctx.strokeStyle = "#0b0b0b";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(58, -20);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(-54, 19, 108, 12);
      ctx.restore();
    }

    function drawRubble(ctx, rock, index) {
      const angle = (index * 0.73) % Math.PI;

      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(0, rock.radius * 0.22, rock.radius * 1.08, rock.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3a3730";
      ctx.strokeStyle = "#14120f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-rock.radius * 0.9, -rock.radius * 0.16);
      ctx.lineTo(-rock.radius * 0.45, -rock.radius * 0.52);
      ctx.lineTo(rock.radius * 0.12, -rock.radius * 0.38);
      ctx.lineTo(rock.radius * 0.82, -rock.radius * 0.08);
      ctx.lineTo(rock.radius * 0.48, rock.radius * 0.42);
      ctx.lineTo(-rock.radius * 0.2, rock.radius * 0.55);
      ctx.lineTo(-rock.radius * 0.76, rock.radius * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#5a554b";
      ctx.beginPath();
      ctx.moveTo(-rock.radius * 0.42, -rock.radius * 0.46);
      ctx.lineTo(rock.radius * 0.1, -rock.radius * 0.32);
      ctx.lineTo(-rock.radius * 0.2, rock.radius * 0.06);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#2b2925";
      ctx.fillRect(rock.radius * 0.1, rock.radius * 0.08, rock.radius * 0.55, rock.radius * 0.18);
      ctx.fillRect(-rock.radius * 0.55, rock.radius * 0.18, rock.radius * 0.45, rock.radius * 0.14);
      ctx.restore();
    }

    function drawBattleBuilding(ctx, x, y, width, height, angle, index) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
      ctx.fillRect(-width / 2 + 12, -height / 2 + 16, width, height);
      ctx.fillStyle = index % 2 ? "#56534b" : "#4b4d4a";
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 5;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.strokeRect(-width / 2, -height / 2, width, height);
      ctx.fillStyle = "rgba(20, 20, 20, 0.42)";
      for (let column = -width / 2 + 30; column < width / 2 - 20; column += 46) {
        for (let row = -height / 2 + 26; row < height / 2 - 18; row += 38) {
          ctx.fillRect(column, row, 18, 16);
        }
      }
      ctx.strokeStyle = "rgba(15, 15, 15, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 12, -height / 2 + 12);
      ctx.lineTo(width / 2 - 18, height / 2 - 18);
      ctx.moveTo(width / 2 - 26, -height / 2 + 16);
      ctx.lineTo(-width / 2 + 18, height / 2 - 12);
      ctx.stroke();
      ctx.restore();
    }

    function drawReichstag(ctx, reichstag) {
      const { x, y, width, height } = reichstag;
      const columnCount = 8;
      const columnGap = width / (columnCount + 1);

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
      ctx.fillRect(-width / 2 + 18, -height / 2 + 22, width, height);

      ctx.fillStyle = "#5d5a52";
      ctx.strokeStyle = "#151515";
      ctx.lineWidth = 6;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.strokeRect(-width / 2, -height / 2, width, height);

      ctx.fillStyle = "#44413b";
      ctx.fillRect(-width / 2 - 26, -height / 2 - 28, width + 52, 34);
      ctx.strokeRect(-width / 2 - 26, -height / 2 - 28, width + 52, 34);

      ctx.fillStyle = "#3a3833";
      ctx.fillRect(-width / 2 + 54, -height / 2 + 42, width - 108, height - 84);
      ctx.strokeRect(-width / 2 + 54, -height / 2 + 42, width - 108, height - 84);

      ctx.fillStyle = "#6f6a5f";
      for (let index = 1; index <= columnCount; index += 1) {
        const columnX = -width / 2 + columnGap * index;
        ctx.fillRect(columnX - 11, -height / 2 + 22, 22, height - 44);
        ctx.strokeRect(columnX - 11, -height / 2 + 22, 22, height - 44);
      }

      ctx.fillStyle = "#1d1c1a";
      ctx.fillRect(-46, height / 2 - 82, 92, 82);
      ctx.fillStyle = "rgba(20, 20, 20, 0.5)";
      for (let column = -width / 2 + 78; column < width / 2 - 70; column += 54) {
        ctx.fillRect(column, -height / 2 + 68, 24, 26);
        ctx.fillRect(column, -height / 2 + 118, 24, 26);
      }

      ctx.fillStyle = "#b51f1f";
      ctx.fillRect(46, -height / 2 - 110, 58, 34);
      ctx.strokeStyle = "#151515";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(46, -height / 2 - 34);
      ctx.lineTo(46, -height / 2 - 116);
      ctx.stroke();

      ctx.fillStyle = "#f0e3b0";
      ctx.font = "700 32px Tahoma, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("РЕЙХСТАГ", 0, -height / 2 + 24);

      ctx.restore();
    }

    function drawBattleBase(ctx, base, time) {
      const pulse = (Math.sin(time * 2.2) + 1) / 2;
      const capture = battleState.baseCapture;
      const teamColor = capture.team === "enemy" ? "216, 32, 32" : "57, 198, 74";
      const ownerColor = capture.owner === "enemy" ? "216, 32, 32" : capture.owner === "ally" ? "57, 198, 74" : "93, 190, 255";
      const progress = capture.progress / 100;

      ctx.save();
      ctx.translate(base.x, base.y);

      ctx.strokeStyle = `rgba(${ownerColor}, ${0.18 + pulse * 0.16})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, base.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([18, 14]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(180, 220, 255, 0.34)";
      ctx.beginPath();
      ctx.arc(0, 0, base.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (capture.team) {
        ctx.strokeStyle = `rgba(${teamColor}, 0.88)`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, base.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(18, 21, 23, 0.78)";
      ctx.strokeStyle = "#0b0d0e";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 96, 62, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#4a4942";
      ctx.fillRect(-68, -26, 136, 52);
      ctx.strokeRect(-68, -26, 136, 52);
      ctx.fillStyle = "#252420";
      ctx.fillRect(-52, -16, 34, 32);
      ctx.fillRect(18, -16, 34, 32);

      ctx.strokeStyle = "#151515";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, -125);
      ctx.stroke();
      ctx.strokeStyle = "#555b5d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -118);
      ctx.lineTo(-42, -56);
      ctx.moveTo(0, -118);
      ctx.lineTo(42, -56);
      ctx.moveTo(-28, -78);
      ctx.lineTo(28, -78);
      ctx.stroke();

      ctx.strokeStyle = "#a9d8ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -135, 24, -0.75, 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -135, 44 + pulse * 8, -0.8, 0.8);
      ctx.strokeStyle = `rgba(169, 216, 255, ${0.22 + pulse * 0.28})`;
      ctx.stroke();

      ctx.fillStyle = pulse > 0.5 ? "#ff3d24" : "#9d1b15";
      ctx.beginPath();
      ctx.arc(0, -128, 6, 0, Math.PI * 2);
      ctx.fill();

      if (capture.team || capture.owner) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
        ctx.fillRect(-54, 70, 108, 34);
        ctx.strokeStyle = "#101010";
        ctx.lineWidth = 2;
        ctx.strokeRect(-54, 70, 108, 34);
        ctx.fillStyle = `rgb(${capture.team ? teamColor : ownerColor})`;
        ctx.font = "700 14px Tahoma, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(capture.progress)}%`, 0, 81);
        ctx.fillStyle = "#e8e8e8";
        ctx.font = "700 12px Tahoma, Arial, sans-serif";
        ctx.fillText(`${capture.allyCount}:${capture.enemyCount}`, 0, 96);
      }

      ctx.fillStyle = "#20272b";
      ctx.fillRect(-112, 38, 58, 22);
      ctx.fillRect(62, 34, 50, 26);
      ctx.strokeStyle = "#080808";
      ctx.lineWidth = 3;
      ctx.strokeRect(-112, 38, 58, 22);
      ctx.strokeRect(62, 34, 50, 26);

      ctx.restore();
    }

    function drawWarCaptureZone(ctx, zone, time, kind = "point") {
      const pulse = (Math.sin(time * 2.4) + 1) / 2;
      const teamColor = zone.team === "enemy" ? "216, 32, 32" : "57, 198, 74";
      const ownerColor = zone.owner === "enemy" ? "216, 32, 32" : zone.owner === "ally" ? "57, 198, 74" : "93, 190, 255";
      const progress = zone.progress / 100;

      ctx.save();
      ctx.translate(zone.x, zone.y);
      ctx.strokeStyle = `rgba(${ownerColor}, ${0.42 + pulse * 0.22})`;
      ctx.lineWidth = kind === "base" ? 8 : 6;
      ctx.beginPath();
      ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (zone.team) {
        ctx.strokeStyle = `rgba(${teamColor}, 0.9)`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, zone.radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.strokeStyle = "#101010";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, kind === "base" ? 38 : 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `rgb(${zone.team ? teamColor : ownerColor})`;
      ctx.font = kind === "base" ? "700 18px Tahoma, Arial, sans-serif" : "700 22px Tahoma, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.label, 0, 0);

      if (kind !== "base") {
        drawWarPointDecoration(ctx, zone.kind || "radio", pulse);
      }

      if (zone.team || zone.owner) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
        ctx.fillRect(-52, zone.radius + 12, 104, 34);
        ctx.strokeStyle = "#101010";
        ctx.lineWidth = 2;
        ctx.strokeRect(-52, zone.radius + 12, 104, 34);
        ctx.fillStyle = `rgb(${zone.team ? teamColor : ownerColor})`;
        ctx.font = "700 13px Tahoma, Arial, sans-serif";
        ctx.fillText(`${Math.round(zone.progress)}%`, 0, zone.radius + 23);
        ctx.fillStyle = "#e8e8e8";
        ctx.font = "700 12px Tahoma, Arial, sans-serif";
        ctx.fillText(`${zone.allyCount}:${zone.enemyCount}`, 0, zone.radius + 38);
      }

      ctx.restore();
    }

    function drawWarPointDecoration(ctx, kind, pulse) {
      if (kind === "radio") {
        ctx.strokeStyle = "#b8c9d6";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(0, -118);
        ctx.moveTo(0, -100);
        ctx.lineTo(-34, -58);
        ctx.moveTo(0, -100);
        ctx.lineTo(34, -58);
        ctx.stroke();
        ctx.strokeStyle = `rgba(120, 210, 255, ${0.35 + pulse * 0.35})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -122, 28 + pulse * 12, -0.8, 0.8);
        ctx.arc(0, -122, 48 + pulse * 16, -0.8, 0.8);
        ctx.stroke();
        return;
      }

      if (kind === "ammo") {
        ctx.fillStyle = "#5b4b2f";
        ctx.strokeStyle = "#19130b";
        ctx.lineWidth = 3;
        for (let index = 0; index < 4; index += 1) {
          ctx.fillRect(-58 + index * 34, 40 + (index % 2) * 10, 28, 22);
          ctx.strokeRect(-58 + index * 34, 40 + (index % 2) * 10, 28, 22);
        }
        ctx.fillStyle = "#a97832";
        ctx.fillRect(-22, 66, 52, 16);
        ctx.strokeRect(-22, 66, 52, 16);
        return;
      }

      ctx.fillStyle = "#2b2d25";
      ctx.strokeStyle = "#0d0d0b";
      ctx.lineWidth = 3;
      for (let index = 0; index < 7; index += 1) {
        const angle = index / 7 * Math.PI * 2;
        const x = Math.cos(angle) * (48 + (index % 2) * 10);
        const y = 42 + Math.sin(angle) * 24;

        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    function drawArtilleryMapBackdrop(ctx) {
      const preset = getCurrentMapPreset();
      const width = battleCanvas.clientWidth;
      const height = battleCanvas.clientHeight;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = preset.ground || "#3f4f34";
      ctx.fillRect(0, 0, width, height);

      for (let x = -40; x < width + 120; x += 120) {
        for (let y = -30; y < height + 96; y += 96) {
          const shade = ((x * 17 + y * 31) % 37) / 37;

          ctx.fillStyle = shade > 0.5 ? preset.shadeA || "rgba(42, 56, 32, 0.45)" : preset.shadeB || "rgba(74, 83, 45, 0.28)";
          ctx.fillRect(x + 16, y + 24, 72, 18);
        }
      }
      ctx.restore();
    }

    function drawWarObjectives(ctx, time) {
      battleState.war.controlPoints.forEach((point) => drawWarCaptureZone(ctx, point, time));

      if (battleState.war.bases) {
        drawWarCaptureZone(ctx, battleState.war.bases.ally, time, "base");
        drawWarCaptureZone(ctx, battleState.war.bases.enemy, time, "base");
      }
    }

    function drawPolyline(ctx, points) {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
          return;
        }

        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    function getFittedImageSize(image, width, height) {
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        return { width, height, scale: 1 };
      }

      const imageAspectRatio = image.naturalWidth / image.naturalHeight;
      const targetAspectRatio = width / height;
      const drawWidth = imageAspectRatio > targetAspectRatio ? width : height * imageAspectRatio;
      const drawHeight = imageAspectRatio > targetAspectRatio ? width / imageAspectRatio : height;

      return {
        width: drawWidth,
        height: drawHeight,
        scale: drawWidth / image.naturalWidth
      };
    }

    function drawTankPart(ctx, image, width, height, fallbackColor) {
      if (image.complete && image.naturalWidth > 0) {
        const size = getFittedImageSize(image, width, height);

        ctx.drawImage(image, -size.width / 2, -size.height / 2, size.width, size.height);
        return;
      }

      ctx.fillStyle = fallbackColor;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.strokeRect(-width / 2, -height / 2, width, height);
    }

    function drawBattleTank(ctx, tank, color) {
      const destroyed = !tankIsAlive(tank);
      const tankColor = destroyed ? "#1d1b18" : color;
      const bodySize = getFittedImageSize(tank.bodyImage, 78, 48);

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);
      ctx.globalAlpha = destroyed ? 0.72 : 1;
      drawTankPart(ctx, tank.bodyImage, 78, 48, tankColor);
      if (destroyed) {
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = "#090807";
        ctx.fillRect(-39, -24, 78, 48);
      }
      ctx.restore();

      if (tank.hasTurret) {
        const turretWidth = tank.turretImage.complete && tank.turretImage.naturalWidth > 0
          ? tank.turretImage.naturalWidth * bodySize.scale
          : 58;
        const turretHeight = tank.turretImage.complete && tank.turretImage.naturalHeight > 0
          ? tank.turretImage.naturalHeight * bodySize.scale
          : 34;

        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.rotate(tank.turretAngle);
        ctx.globalAlpha = destroyed ? 0.72 : 1;
        drawTankPart(ctx, tank.turretImage, turretWidth, turretHeight, tankColor);
        if (destroyed) {
          ctx.globalAlpha = 0.62;
          ctx.fillStyle = "#090807";
          ctx.fillRect(-turretWidth / 2, -turretHeight / 2, turretWidth, turretHeight);
        }
        ctx.restore();
      }

      if (destroyed) {
        drawBattleFire(ctx, tank.x + 8, tank.y - 8, 24, performance.now() / 1000);
        drawBattleSmoke(ctx, tank.x - 2, tank.y - 18, 30, performance.now() / 1000);
      }
    }

    function drawTankHealthBar(ctx, tank) {
      const width = 54;
      const height = 6;
      const ratio = tank.maxHealth > 0 ? tank.health / tank.maxHealth : 0;

      ctx.save();
      ctx.translate(tank.x - width / 2, tank.y + tank.radius + 16);
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = ratio > 0.35 ? "#48d05d" : "#e23b2f";
      ctx.fillRect(0, 0, width * ratio, height);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
      ctx.restore();
    }

    function drawProjectile(ctx, projectile) {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.angle);
      ctx.globalCompositeOperation = "lighter";

      if (projectile.fire) {
        const ageRatio = Math.min(1, (projectile.age || 0) / Math.max(0.01, projectile.life || 0.25));
        const flameLength = 34 + ageRatio * 28;
        const flameWidth = 18 + Math.sin((performance.now() / 70) + projectile.x) * 4;

        ctx.globalAlpha = 0.85 * (1 - ageRatio * 0.35);
        const gradient = ctx.createLinearGradient(-flameLength, 0, flameLength * 0.2, 0);
        gradient.addColorStop(0, "rgba(255, 60, 0, 0)");
        gradient.addColorStop(0.22, "rgba(255, 82, 18, 0.58)");
        gradient.addColorStop(0.58, "rgba(255, 179, 35, 0.9)");
        gradient.addColorStop(1, "rgba(255, 246, 178, 0.96)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(-flameLength * 0.28, 0, flameLength, flameWidth, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55 * (1 - ageRatio * 0.45);
        ctx.fillStyle = "rgba(255, 45, 0, 0.62)";
        ctx.beginPath();
        ctx.ellipse(-flameLength * 0.48, 0, flameLength * 0.72, flameWidth * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.fillStyle = "#ffd36a";
      ctx.fillRect(-8, -2, 16, 4);
      ctx.fillStyle = "rgba(255, 88, 28, 0.45)";
      ctx.fillRect(-18, -3, 12, 6);
      ctx.restore();
    }

    function drawTankMarker(ctx, tank, color) {
      ctx.save();
      ctx.translate(tank.x, tank.y - tank.radius - 22);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }

    function drawCommanderMarker(ctx, tank, color) {
      if (!tankIsAlive(tank)) {
        return;
      }

      ctx.save();
      ctx.translate(tank.x, tank.y - tank.radius - 42);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111";
      ctx.font = "700 15px Tahoma, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("K", 0, 1);
      ctx.restore();
    }

    function drawMinimapPoint(ctx, x, y, color, size = 4, shape = "circle") {
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 1.5;

      if (shape === "square") {
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        return;
      }

      if (shape === "diamond") {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    function drawMinimap(ctx) {
      if (playerUsesFullMapView()) {
        return;
      }

      const padding = 18;
      const maxWidth = Math.min(280, battleCanvas.clientWidth * 0.24);
      const maxHeight = Math.min(190, battleCanvas.clientHeight * 0.28);
      const scale = Math.min(maxWidth / battleState.mapWidth, maxHeight / battleState.mapHeight);
      const width = battleState.mapWidth * scale;
      const height = battleState.mapHeight * scale;
      const left = battleCanvas.clientWidth - width - padding;
      const top = battleCanvas.clientHeight - height - padding;
      const mapX = (value) => left + value * scale;
      const mapY = (value) => top + value * scale;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.66)";
      ctx.fillRect(left - 6, top - 6, width + 12, height + 12);
      ctx.fillStyle = "rgba(49, 65, 43, 0.88)";
      ctx.fillRect(left, top, width, height);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, width, height);

      if (selectedBattleMode.id === "war" && battleState.war.bases) {
        battleState.war.controlPoints.forEach((point) => {
          const color = point.owner === "ally" ? "#39c64a" : point.owner === "enemy" ? "#d82020" : "#f3d248";

          drawMinimapPoint(ctx, mapX(point.x), mapY(point.y), color, 5, "diamond");
        });
        drawMinimapPoint(ctx, mapX(battleState.war.bases.ally.x), mapY(battleState.war.bases.ally.y), "#39c64a", 6, "square");
        drawMinimapPoint(ctx, mapX(battleState.war.bases.enemy.x), mapY(battleState.war.bases.enemy.y), "#d82020", 6, "square");
      } else if (battleState.mapDetails?.base) {
        drawMinimapPoint(ctx, mapX(battleState.mapDetails.base.x), mapY(battleState.mapDetails.base.y), "#f3d248", 6, "diamond");
      }

      battleState.allies
        .filter(tankIsAlive)
        .forEach((tank) => drawMinimapPoint(
          ctx,
          mapX(tank.x),
          mapY(tank.y),
          tank === battleState.player ? "#7dff70" : "#39c64a",
          tank === battleState.player ? 5 : 4
        ));
      battleState.enemies
        .filter((tank) => tankIsAlive(tank) && tank.spotted)
        .forEach((tank) => drawMinimapPoint(ctx, mapX(tank.x), mapY(tank.y), "#d82020", 4));
      ctx.restore();
    }

    function resetBattleTutorial() {
      const battleNumber = playerStats.battles + 1;

      battleState.tutorial = {
        enabled: battleNumber <= 3,
        battleNumber,
        hidden: false,
        moved: false,
        aimed: false,
        fired: false,
        changedShell: false,
        dealtDamage: false,
        capturedBase: false
      };
    }

    function getBattleObjectiveHint() {
      if (selectedBattleMode.id === "commander") {
        return "\u0426\u0435\u043b\u044c \u0440\u0435\u0436\u0438\u043c\u0430: \u043d\u0430\u0439\u0434\u0438 \u0438 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u044c \u0432\u0440\u0430\u0436\u0435\u0441\u043a\u043e\u0433\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u0438\u0440\u0430.";
      }

      if (selectedBattleMode.id === "war") {
        return "\u0426\u0435\u043b\u044c \u0440\u0435\u0436\u0438\u043c\u0430: \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439 \u0442\u043e\u0447\u043a\u0438 \u0438 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0430\u0439 \u0442\u0430\u043d\u043a\u0438 \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a\u0430.";
      }

      return "\u0426\u0435\u043b\u044c \u0431\u043e\u044f: \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u044c \u0432\u0441\u0435\u0445 \u0432\u0440\u0430\u0433\u043e\u0432 \u0438\u043b\u0438 \u043f\u043e\u043c\u043e\u0433\u0438 \u0441\u043e\u044e\u0437\u043d\u0438\u043a\u0430\u043c \u0432\u0437\u044f\u0442\u044c \u0431\u0430\u0437\u0443.";
    }

    function getBattleTutorialContent() {
      const tutorial = battleState.tutorial;
      const damageDone = tutorial.dealtDamage || normalizeNumber(battleState.stats?.damage) > 0;
      const capturedBase = tutorial.capturedBase || normalizeNumber(battleState.stats?.baseCapture) > 0;

      if (tutorial.battleNumber === 1) {
        return {
          title: "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 1/3: \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435",
          body: [
            "W/S \u0438\u043b\u0438 \u0426/\u042b - \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435, A/D \u0438\u043b\u0438 \u0424/\u0412 - \u043f\u043e\u0432\u043e\u0440\u043e\u0442 \u043a\u043e\u0440\u043f\u0443\u0441\u0430.",
            "\u0411\u0430\u0448\u043d\u044f \u0441\u043c\u043e\u0442\u0440\u0438\u0442 \u0437\u0430 \u043c\u044b\u0448\u044c\u044e. \u041b\u0435\u0432\u0430\u044f \u043a\u043d\u043e\u043f\u043a\u0430 \u043c\u044b\u0448\u0438 - \u0432\u044b\u0441\u0442\u0440\u0435\u043b."
          ],
          tasks: [
            { done: tutorial.moved, text: "\u0421\u0434\u0432\u0438\u043d\u044c \u0442\u0430\u043d\u043a \u0441 \u043c\u0435\u0441\u0442\u0430" },
            { done: tutorial.aimed, text: "\u041d\u0430\u0432\u0435\u0434\u0438 \u0431\u0430\u0448\u043d\u044e \u043c\u044b\u0448\u044c\u044e" },
            { done: tutorial.fired, text: "\u0421\u0434\u0435\u043b\u0430\u0439 \u0432\u044b\u0441\u0442\u0440\u0435\u043b" }
          ]
        };
      }

      if (tutorial.battleNumber === 2) {
        return {
          title: "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 2/3: \u043e\u0433\u043e\u043d\u044c \u0438 \u0431\u0440\u043e\u043d\u044f",
          body: [
            "1/2/3 \u043c\u0435\u043d\u044f\u044e\u0442 \u0441\u043d\u0430\u0440\u044f\u0434\u044b. \u0415\u0441\u043b\u0438 \u0443\u0440\u043e\u043d \u043d\u0435 \u043f\u0440\u043e\u0445\u043e\u0434\u0438\u0442, \u0441\u043c\u0435\u043d\u0438 \u0442\u0438\u043f \u0441\u043d\u0430\u0440\u044f\u0434\u0430 \u0438\u043b\u0438 \u0441\u0442\u0440\u0435\u043b\u044f\u0439 \u0432 \u0431\u043e\u0440\u0442.",
            "\u041f\u043e\u043a\u0430 \u0438\u0434\u0435\u0442 \u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0430, \u0434\u0435\u0440\u0436\u0438 \u0434\u0438\u0441\u0442\u0430\u043d\u0446\u0438\u044e \u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 \u043a\u0430\u043c\u043d\u0438 \u0438 \u0434\u043e\u043c\u0430 \u043a\u0430\u043a \u0443\u043a\u0440\u044b\u0442\u0438\u0435."
          ],
          tasks: [
            { done: tutorial.changedShell, text: "\u0421\u043c\u0435\u043d\u0438 \u0441\u043d\u0430\u0440\u044f\u0434" },
            { done: damageDone, text: "\u041d\u0430\u043d\u0435\u0441\u0438 \u0443\u0440\u043e\u043d \u0432\u0440\u0430\u0433\u0443" },
            { done: tutorial.fired, text: "\u041e\u0442\u0441\u043b\u0435\u0434\u0438 \u043f\u0435\u0440\u0435\u0437\u0430\u0440\u044f\u0434\u043a\u0443 \u043f\u043e\u0441\u043b\u0435 \u0432\u044b\u0441\u0442\u0440\u0435\u043b\u0430" }
          ]
        };
      }

      return {
        title: "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 3/3: \u0442\u0430\u043a\u0442\u0438\u043a\u0430 \u0438 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441",
        body: [
          `${getBattleObjectiveHint()} \u041c\u0438\u043d\u0438-\u043a\u0430\u0440\u0442\u0430 \u0441\u043f\u0440\u0430\u0432\u0430 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0441\u043e\u044e\u0437\u043d\u0438\u043a\u043e\u0432, \u0437\u0430\u0441\u0432\u0435\u0447\u0435\u043d\u043d\u044b\u0445 \u0432\u0440\u0430\u0433\u043e\u0432 \u0438 \u0431\u0430\u0437\u0443.`,
          "Tab \u0441\u043a\u0440\u044b\u0432\u0430\u0435\u0442 \u0438 \u0432\u043e\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u0441\u043f\u0438\u0441\u043a\u0438 \u043a\u043e\u043c\u0430\u043d\u0434. \u0417\u0430 \u0443\u0440\u043e\u043d, \u0444\u0440\u0430\u0433\u0438, \u0437\u0430\u0445\u0432\u0430\u0442 \u0438 \u043f\u043e\u0431\u0435\u0434\u0443 \u0434\u0430\u044e\u0442\u0441\u044f \u043e\u043f\u044b\u0442 \u0438 \u0441\u0435\u0440\u0435\u0431\u0440\u043e."
        ],
        tasks: [
          { done: battleState.teamListVisible, text: "\u041e\u0446\u0435\u043d\u0438 \u0441\u043e\u0441\u0442\u0430\u0432\u044b \u043a\u043e\u043c\u0430\u043d\u0434" },
          { done: damageDone || capturedBase, text: "\u041f\u0440\u0438\u043d\u0435\u0441\u0438 \u043f\u043e\u043b\u044c\u0437\u0443: \u0443\u0440\u043e\u043d \u0438\u043b\u0438 \u0437\u0430\u0445\u0432\u0430\u0442" },
          { done: tutorial.fired, text: "\u0412\u0435\u0434\u0438 \u043e\u0433\u043e\u043d\u044c \u043f\u043e \u0437\u0430\u0441\u0432\u0435\u0447\u0435\u043d\u043d\u044b\u043c \u0446\u0435\u043b\u044f\u043c" }
        ]
      };
    }

    function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;

        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, currentY);
          line = word;
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      });

      if (line) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
      }

      return currentY;
    }

    function drawBattleTutorial(ctx, width, height) {
      const tutorial = battleState.tutorial;

      if (!tutorial.enabled) {
        return;
      }

      if (tutorial.hidden) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
        ctx.fillRect(16, height - 48, 174, 30);
        ctx.fillStyle = "#f3d248";
        ctx.font = "700 12px Tahoma, Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("H - \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435", 28, height - 33);
        ctx.restore();
        return;
      }

      const content = getBattleTutorialContent();
      const panelWidth = Math.min(450, Math.max(300, width - 32));
      const padding = 16;
      const lineHeight = 17;
      const maxTextWidth = panelWidth - padding * 2;
      let measuredLines = 3 + content.tasks.length;

      content.body.forEach((text) => {
        const words = text.split(" ");
        let line = "";

        words.forEach((word) => {
          const testLine = line ? `${line} ${word}` : word;
          if (testLine.length > 50 && line) {
            measuredLines += 1;
            line = word;
          } else {
            line = testLine;
          }
        });
        measuredLines += 1;
      });

      const panelHeight = Math.min(height - 112, Math.max(188, padding * 2 + measuredLines * lineHeight + 34));
      const x = 16;
      const y = Math.max(86, height - panelHeight - 72);
      let textY = y + padding;

      ctx.save();
      ctx.fillStyle = "rgba(8, 10, 8, 0.82)";
      ctx.fillRect(x, y, panelWidth, panelHeight);
      ctx.strokeStyle = "rgba(243, 210, 72, 0.82)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, panelWidth, panelHeight);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#f3d248";
      ctx.font = "700 15px Tahoma, Arial, sans-serif";
      ctx.fillText(content.title, x + padding, textY);
      textY += 25;

      ctx.fillStyle = "#f2f2f2";
      ctx.font = "12px Tahoma, Arial, sans-serif";
      content.body.forEach((text) => {
        textY = drawWrappedText(ctx, text, x + padding, textY, maxTextWidth, lineHeight) + 2;
      });

      textY += 4;
      ctx.font = "700 12px Tahoma, Arial, sans-serif";
      content.tasks.forEach((task) => {
        ctx.fillStyle = task.done ? "#75e56f" : "#d9d9d9";
        ctx.fillText(`${task.done ? "[+]" : "[ ]"} ${task.text}`, x + padding, textY);
        textY += lineHeight + 2;
      });

      ctx.fillStyle = "rgba(242, 242, 242, 0.72)";
      ctx.font = "11px Tahoma, Arial, sans-serif";
      ctx.fillText("H - \u0441\u043a\u0440\u044b\u0442\u044c \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438", x + padding, y + panelHeight - padding - 12);
      ctx.restore();
    }

    function drawBattleHud(ctx) {
      const player = battleState.player;
      const width = battleCanvas.clientWidth;
      const healthWidth = Math.min(520, Math.max(280, width * 0.42));
      const healthHeight = 18;
      const healthX = (width - healthWidth) / 2;
      const healthY = 18;
      const playerRatio = player?.maxHealth > 0 ? Math.max(0, player.health / player.maxHealth) : 0;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = "700 12px Tahoma, Arial, sans-serif";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
      ctx.fillStyle = playerRatio > 0.35 ? "#44d15b" : "#e43a2f";
      ctx.fillRect(healthX, healthY, healthWidth * playerRatio, healthHeight);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.strokeRect(healthX, healthY, healthWidth, healthHeight);
      ctx.fillStyle = "#f2f2f2";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.max(0, Math.round(player?.health || 0))} / ${Math.round(player?.maxHealth || 0)}`, width / 2, healthY + healthHeight / 2);

      if (battleState.teamListVisible) {
        drawBattleTeamList(ctx, battleState.allies, 16, 58, "#39c64a", "left");
        drawBattleTeamList(ctx, battleState.enemies, width - 16, 58, "#d82020", "right");
      }
      if (selectedBattleMode.id === "commander") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
        ctx.fillRect(width / 2 - 150, 44, 300, 28);
        ctx.fillStyle = "#f3d248";
        ctx.font = "700 14px Tahoma, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("\u0426\u0435\u043b\u044c: \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u044c \u0432\u0440\u0430\u0436\u0435\u0441\u043a\u043e\u0433\u043e \u043a\u043e\u043c\u0430\u043d\u0434\u0438\u0440\u0430", width / 2, 58);
      }
      drawBattleTutorial(ctx, width, battleCanvas.clientHeight);
      drawMinimap(ctx);
      ctx.restore();
    }

    function drawBattleTeamList(ctx, tanks, x, y, color, side) {
      const rowHeight = 22;
      const rowWidth = Math.min(280, Math.max(190, battleCanvas.clientWidth * 0.21));
      const left = side === "left" ? x : x - rowWidth;

      tanks.forEach((tank, index) => {
        const top = y + index * rowHeight;
        const healthRatio = tank.maxHealth > 0 ? Math.max(0, tank.health / tank.maxHealth) : 0;
        const alive = tankIsAlive(tank);
        const label = `${tank.nickname}  ${tank.tank.name}`;

        ctx.fillStyle = alive ? "rgba(0, 0, 0, 0.58)" : "rgba(0, 0, 0, 0.78)";
        ctx.fillRect(left, top, rowWidth, rowHeight - 3);
        ctx.fillStyle = alive ? color : "#333";
        ctx.fillRect(left, top, rowWidth * healthRatio, rowHeight - 3);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, rowWidth, rowHeight - 3);
        ctx.fillStyle = alive ? "#f2f2f2" : "#777";
        ctx.textAlign = side;
        ctx.fillText(label.slice(0, 30), side === "left" ? left + 8 : left + rowWidth - 8, top + (rowHeight - 3) / 2);
      });
    }

    function renderBattle() {
      const ctx = battleContext;

      ctx.clearRect(0, 0, battleCanvas.clientWidth, battleCanvas.clientHeight);
      if (playerUsesFullMapView()) {
        drawArtilleryMapBackdrop(ctx);
      }
      ctx.save();
      ctx.translate(battleState.camera.offsetX, battleState.camera.offsetY);
      ctx.scale(battleState.camera.scale, battleState.camera.scale);
      ctx.translate(-battleState.camera.x, -battleState.camera.y);
      drawBattleMap(ctx);
      battleState.projectiles.forEach((projectile) => drawProjectile(ctx, projectile));
      battleState.enemies
        .filter((tank) => tank.spotted || !tankIsAlive(tank))
        .forEach((tank) => drawBattleTank(ctx, tank, "#7b3434"));
      battleState.allies.forEach((tank) => drawBattleTank(ctx, tank, tank === battleState.player ? "#3d5f2c" : "#2f5f7c"));
      if (gameSettings.showHealthBars) {
        battleState.enemies
          .filter((tank) => tankIsAlive(tank) && tank.spotted)
          .forEach((tank) => drawTankHealthBar(ctx, tank));
        battleState.allies
          .filter(tankIsAlive)
          .forEach((tank) => drawTankHealthBar(ctx, tank));
      }
      if (gameSettings.showTeamMarkers) {
        battleState.enemies
          .filter((tank) => tankIsAlive(tank) && tank.spotted)
          .forEach((tank) => drawTankMarker(ctx, tank, "#d82020"));
        battleState.allies
          .filter((tank) => tank !== battleState.player && tankIsAlive(tank))
          .forEach((tank) => drawTankMarker(ctx, tank, "#39c64a"));
      }
      if (selectedBattleMode.id === "commander") {
        drawCommanderMarker(ctx, battleState.player, "#39c64a");
        if (battleState.enemies[0]?.spotted) {
          drawCommanderMarker(ctx, battleState.enemies[0], "#d82020");
        }
      }
      ctx.restore();
      drawBattleHud(ctx);
    }

    function battleLoop(time) {
      if (!battleState.active) {
        return;
      }

      const delta = Math.min(0.05, (time - battleState.lastTime) / 1000 || 0);

      battleState.lastTime = time;
      updateBattle(delta);
      renderBattle();
      battleState.animationFrame = requestAnimationFrame(battleLoop);
    }

    function getTeamSpawnPoints(team, count) {
      const isAlly = team === "ally";
      const baseX = isAlly ? 320 : battleState.mapWidth - 340;
      const baseY = isAlly ? battleState.mapHeight - 320 : 320;
      const angle = isAlly ? -Math.PI / 4 : Math.PI * 0.75;
      const offsets = [
        [0, 0],
        [-120, -150],
        [150, 120],
        [20, -280],
        [290, -50],
        [-260, 50],
        [140, -420],
        [-390, -110],
        [390, 110],
        [-110, 260],
        [260, -230],
        [-260, 230],
        [420, -260],
        [-420, 260],
        [0, 420]
      ];

      return offsets.slice(0, count).map(([offsetX, offsetY]) => ({
        x: Math.max(120, Math.min(battleState.mapWidth - 120, baseX + (isAlly ? offsetX : -offsetX))),
        y: Math.max(120, Math.min(battleState.mapHeight - 120, baseY + (isAlly ? offsetY : -offsetY))),
        angle
      }));
    }

    function createPlacedBattleTank(tank, spawn, isBot, team, nickname = "") {
      const candidate = createBattleTank(tank, spawn.x, spawn.y, spawn.angle, isBot, team, nickname);
      const attempts = [
        [0, 0], [70, 0], [-70, 0], [0, 70], [0, -70],
        [105, 70], [-105, -70], [105, -70], [-105, 70],
        [150, 0], [-150, 0], [0, 150], [0, -150]
      ];

      for (const [offsetX, offsetY] of attempts) {
        candidate.x = spawn.x + offsetX;
        candidate.y = spawn.y + offsetY;

        if (!tankCollides(candidate)) {
          return candidate;
        }
      }

      candidate.x = spawn.x;
      candidate.y = spawn.y;
      return candidate;
    }

    function getRespawnPoint(tank) {
      const teamTanks = tank.team === "ally" ? battleState.allies : battleState.enemies;
      const index = Math.max(0, teamTanks.indexOf(tank));
      const spawns = getTeamSpawnPoints(tank.team, Math.max(selectedBattleMode.size, index + 1));

      return spawns[index] || spawns[0];
    }

    function respawnBattleTank(tank) {
      const spawn = getRespawnPoint(tank);
      tank.x = -9999;
      tank.y = -9999;
      const restoredTank = createPlacedBattleTank(tank.tank, spawn, tank.isBot, tank.team, tank.nickname);

      Object.assign(tank, restoredTank, {
        respawnTimer: 0,
        destroyedAt: null
      });

      if (tank === battleState.player) {
        battleState.spectatorTarget = null;
        battleState.selectedShellIndex = Math.min(battleState.selectedShellIndex, tank.shells.length - 1);
        battleState.selectedShell = tank.shells[battleState.selectedShellIndex] || tank.shells[0] || null;
        renderBattleAmmoPanel();
      }
    }

    function updateWarRespawns(delta) {
      if (selectedBattleMode.id !== "war") {
        return;
      }

      getAllBattleTanks().forEach((tank) => {
        if (tankIsAlive(tank)) {
          return;
        }

        tank.respawnTimer = Math.max(0, (tank.respawnTimer ?? battleState.war.respawnDelay) - delta);

        if (tank.respawnTimer <= 0) {
          respawnBattleTank(tank);
        }
      });
    }

