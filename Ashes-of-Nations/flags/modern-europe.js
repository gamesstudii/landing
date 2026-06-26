(function () {
  "use strict";

  const W = 16;
  const H = 16;
  const definitions = [];

  function add(code, name, draw) {
    definitions.push({ code, name, draw });
  }

  function rect(ctx, color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  function horizontal(ctx, colors) {
    colors.forEach((color, index) => {
      const y = Math.round(index * H / colors.length);
      const nextY = Math.round((index + 1) * H / colors.length);
      rect(ctx, color, 0, y, W, nextY - y);
    });
  }

  function vertical(ctx, colors) {
    colors.forEach((color, index) => {
      const x = Math.round(index * W / colors.length);
      const nextX = Math.round((index + 1) * W / colors.length);
      rect(ctx, color, x, 0, nextX - x, H);
    });
  }

  function nordic(ctx, background, cross, inner) {
    rect(ctx, background, 0, 0, W, H);
    rect(ctx, cross, 5, 0, 4, H);
    rect(ctx, cross, 0, 6, W, 4);
    if (inner) {
      rect(ctx, inner, 6, 0, 2, H);
      rect(ctx, inner, 0, 7, W, 2);
    }
  }

  function centeredCross(ctx, background, cross) {
    rect(ctx, background, 0, 0, W, H);
    rect(ctx, cross, 6, 0, 4, H);
    rect(ctx, cross, 0, 6, W, 4);
  }

  function dot(ctx, color, x, y, radius = 2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function crescent(ctx, x, y, color, cutout, radius = 4) {
    dot(ctx, color, x, y, radius);
    dot(ctx, cutout, x + 1.5, y - 1, radius - 1);
  }

  function star(ctx, color, x, y, radius = 2.5, points = 5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / points;
      const distance = index % 2 === 0 ? radius : radius * 0.42;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function shield(ctx, colors, x = 6, y = 5, width = 5, height = 7) {
    colors.forEach((color, index) => {
      rect(ctx, color, x + Math.floor(index * width / colors.length), y,
        Math.ceil(width / colors.length), height - 2);
    });
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(x, y + height - 2);
    ctx.lineTo(x + width, y + height - 2);
    ctx.lineTo(x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();
  }

  add("AL", "Албания", (c) => { rect(c, "#d71920", 0, 0, W, H); rect(c, "#111", 6, 5, 5, 6); });
  add("AD", "Андорра", (c) => { vertical(c, ["#16479d", "#ffd42a", "#d52b1e"]); shield(c, ["#d52b1e", "#ffd42a"], 6, 5, 4, 6); });
  add("AM", "Армения", (c) => horizontal(c, ["#d90012", "#0033a0", "#f2a800"]));
  add("AT", "Австрия", (c) => horizontal(c, ["#ed2939", "#fff", "#ed2939"]));
  add("AZ", "Азербайджан", (c) => { horizontal(c, ["#00b5e2", "#ef3340", "#509e2f"]); crescent(c, 7, 8, "#fff", "#ef3340", 2.5); star(c, "#fff", 10.5, 8, 1.5, 8); });
  add("BY", "Беларусь", (c) => { horizontal(c, ["#d22730", "#d22730", "#009b3a"]); rect(c, "#fff", 0, 0, 3, H); rect(c, "#d22730", 1, 1, 1, 2); rect(c, "#d22730", 0, 5, 2, 1); rect(c, "#d22730", 1, 8, 1, 2); rect(c, "#d22730", 0, 12, 2, 1); });
  add("BE", "Бельгия", (c) => vertical(c, ["#111", "#ffd90c", "#ef3340"]));
  add("BA", "Босния и Герцеговина", (c) => { rect(c, "#002395", 0, 0, W, H); c.fillStyle = "#fecb00"; c.beginPath(); c.moveTo(5, 0); c.lineTo(14, 0); c.lineTo(14, 14); c.closePath(); c.fill(); for (let i = 0; i < 5; i++) star(c, "#fff", 4 + i * 2, 2 + i * 3, 1); });
  add("BG", "Болгария", (c) => horizontal(c, ["#fff", "#00966e", "#d62612"]));
  add("HR", "Хорватия", (c) => { horizontal(c, ["#ff0000", "#fff", "#171796"]); for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) rect(c, (x + y) % 2 ? "#fff" : "#e21", 6 + x, 5 + y, 1, 1); });
  add("CY", "Кипр", (c) => { rect(c, "#fff", 0, 0, W, H); dot(c, "#d57800", 8, 7, 3); rect(c, "#4e7b35", 5, 11, 6, 1); });
  add("CZ", "Чехия", (c) => { horizontal(c, ["#fff", "#d7141a"]); c.fillStyle = "#11457e"; c.beginPath(); c.moveTo(0, 0); c.lineTo(8, 8); c.lineTo(0, H); c.closePath(); c.fill(); });
  add("DK", "Дания", (c) => nordic(c, "#c8102e", "#fff"));
  add("EE", "Эстония", (c) => horizontal(c, ["#4891d9", "#111", "#fff"]));
  add("FI", "Финляндия", (c) => nordic(c, "#fff", "#003580"));
  add("FR", "Франция", (c) => vertical(c, ["#0055a4", "#fff", "#ef4135"]));
  add("GE", "Грузия", (c) => { centeredCross(c, "#fff", "#d40000"); [[3,3],[13,3],[3,13],[13,13]].forEach(([x,y]) => { rect(c, "#d40000", x - 1, y, 3, 1); rect(c, "#d40000", x, y - 1, 1, 3); }); });
  add("DE", "Германия", (c) => horizontal(c, ["#111", "#dd0000", "#ffce00"]));
  add("GR", "Греция", (c) => { for (let i = 0; i < 9; i++) rect(c, i % 2 ? "#fff" : "#0d5eaf", 0, Math.floor(i * H / 9), W, Math.ceil(H / 9)); rect(c, "#0d5eaf", 0, 0, 8, 9); rect(c, "#fff", 3, 0, 2, 9); rect(c, "#fff", 0, 4, 8, 2); });
  add("HU", "Венгрия", (c) => horizontal(c, ["#ce2939", "#fff", "#477050"]));
  add("IS", "Исландия", (c) => nordic(c, "#02529c", "#fff", "#dc1e35"));
  add("IE", "Ирландия", (c) => vertical(c, ["#169b62", "#fff", "#ff883e"]));
  add("IT", "Италия", (c) => vertical(c, ["#009246", "#fff", "#ce2b37"]));
  add("KZ", "Казахстан", (c) => { rect(c, "#00afca", 0, 0, W, H); rect(c, "#f6c900", 1, 0, 1, H); dot(c, "#f6c900", 9, 7, 2.5); rect(c, "#f6c900", 6, 11, 7, 1); });
  add("XK", "Косово", (c) => { rect(c, "#244aa5", 0, 0, W, H); rect(c, "#d7a83e", 6, 6, 5, 4); for (let i = 0; i < 6; i++) star(c, "#fff", 3 + i * 2, 3, .8); });
  add("LV", "Латвия", (c) => { rect(c, "#9e3039", 0, 0, W, H); rect(c, "#fff", 0, 7, W, 2); });
  add("LI", "Лихтенштейн", (c) => { horizontal(c, ["#002b7f", "#ce1126"]); rect(c, "#ffd83d", 2, 2, 3, 2); });
  add("LT", "Литва", (c) => horizontal(c, ["#fdb913", "#006a44", "#c1272d"]));
  add("LU", "Люксембург", (c) => horizontal(c, ["#ed2939", "#fff", "#00a1de"]));
  add("MT", "Мальта", (c) => { vertical(c, ["#fff", "#cf142b"]); rect(c, "#aaa", 2, 2, 3, 1); rect(c, "#aaa", 3, 1, 1, 3); });
  add("MD", "Молдова", (c) => { vertical(c, ["#0046ae", "#ffd200", "#cc092f"]); shield(c, ["#7a3b1d", "#d52b1e"], 6, 5, 4, 6); });
  add("MC", "Монако", (c) => horizontal(c, ["#ce1126", "#fff"]));
  add("ME", "Черногория", (c) => { rect(c, "#c40308", 0, 0, W, H); c.strokeStyle = "#d4af37"; c.lineWidth = 1; c.strokeRect(.5, .5, 15, 15); shield(c, ["#d4af37", "#2456a4"], 6, 5, 5, 7); });
  add("NL", "Нидерланды", (c) => horizontal(c, ["#ae1c28", "#fff", "#21468b"]));
  add("MK", "Северная Македония", (c) => { rect(c, "#d20000", 0, 0, W, H); c.strokeStyle = "#ffe600"; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(8,8); c.lineTo(8 + Math.cos(a) * 12, 8 + Math.sin(a) * 12); c.stroke(); } dot(c, "#ffe600", 8, 8, 3); });
  add("NO", "Норвегия", (c) => nordic(c, "#ba0c2f", "#fff", "#00205b"));
  add("PL", "Польша", (c) => horizontal(c, ["#fff", "#dc143c"]));
  add("PT", "Португалия", (c) => { rect(c, "#046a38", 0, 0, 6, H); rect(c, "#da291c", 6, 0, 10, H); dot(c, "#ffcd00", 6, 8, 3); shield(c, ["#fff", "#003399"], 5, 5, 3, 6); });
  add("RO", "Румыния", (c) => vertical(c, ["#002b7f", "#fcd116", "#ce1126"]));
  add("RU", "Россия", (c) => horizontal(c, ["#fff", "#0039a6", "#d52b1e"]));
  add("SM", "Сан-Марино", (c) => { horizontal(c, ["#fff", "#5eb6e4"]); shield(c, ["#fff", "#5eb6e4"], 6, 5, 4, 6); });
  add("RS", "Сербия", (c) => { horizontal(c, ["#c6363c", "#0c4076", "#fff"]); shield(c, ["#fff", "#c6363c"], 3, 4, 4, 7); });
  add("SK", "Словакия", (c) => { horizontal(c, ["#fff", "#0b4ea2", "#ee1c25"]); shield(c, ["#ee1c25", "#fff"], 3, 4, 4, 7); });
  add("SI", "Словения", (c) => { horizontal(c, ["#fff", "#005da4", "#ed1c24"]); shield(c, ["#005da4", "#fff"], 3, 3, 4, 6); });
  add("ES", "Испания", (c) => { rect(c, "#aa151b", 0, 0, W, H); rect(c, "#f1bf00", 0, 4, W, 8); shield(c, ["#aa151b", "#fff"], 4, 6, 3, 5); });
  add("SE", "Швеция", (c) => nordic(c, "#006aa7", "#fecc02"));
  add("CH", "Швейцария", (c) => centeredCross(c, "#d52b1e", "#fff"));
  add("TR", "Турция", (c) => { rect(c, "#e30a17", 0, 0, W, H); crescent(c, 7, 8, "#fff", "#e30a17", 4); star(c, "#fff", 11.5, 8, 2); });
  add("UA", "Украина", (c) => horizontal(c, ["#0057b7", "#ffd700"]));
  add("GB", "Великобритания", (c) => { rect(c, "#012169", 0, 0, W, H); c.strokeStyle = "#fff"; c.lineWidth = 4; c.beginPath(); c.moveTo(0,0); c.lineTo(W,H); c.moveTo(W,0); c.lineTo(0,H); c.stroke(); c.strokeStyle = "#c8102e"; c.lineWidth = 2; c.stroke(); rect(c, "#fff", 6, 0, 4, H); rect(c, "#fff", 0, 6, W, 4); rect(c, "#c8102e", 7, 0, 2, H); rect(c, "#c8102e", 0, 7, W, 2); });
  add("VA", "Ватикан", (c) => { vertical(c, ["#ffe000", "#fff"]); rect(c, "#aaa", 10, 5, 1, 7); rect(c, "#aaa", 12, 4, 1, 8); });

  window.MODERN_EUROPE_FLAGS = definitions.map((definition) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    definition.draw(context);
    return {
      id: `modern:${definition.code}`,
      name: definition.name,
      file: null,
      src: canvas.toDataURL("image/png"),
    };
  });
})();
