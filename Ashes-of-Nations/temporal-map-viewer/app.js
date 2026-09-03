(() => {
  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");
  const year = document.getElementById("year");
  const label = document.getElementById("yearLabel");
  const status = document.getElementById("status");
  const adminToggle = document.getElementById("admin");
  let historical, modern, admin;

  const project = ([lon, lat]) => [((lon + 180) / 360) * canvas.width, ((90 - lat) / 180) * canvas.height];
  const color = (name) => {
    let value = 0; for (const char of name) value = ((value << 5) - value + char.charCodeAt(0)) | 0;
    return `hsl(${Math.abs(value) % 360} 45% 48%)`;
  };
  const decodedArc = (topology, index) => {
    const source = topology.arcs[index < 0 ? ~index : index];
    return index < 0 ? [...source].reverse() : source;
  };
  const ring = (topology, indexes) => indexes.flatMap((index, i) => decodedArc(topology, index).slice(i ? 1 : 0));
  const ringsFor = (geometry) => geometry.type === "Polygon" ? [geometry.arcs] : geometry.arcs;
  function drawTopoFeature(topology, geometry, fill) {
    ctx.beginPath();
    for (const polygon of ringsFor(geometry)) {
      for (const indexes of polygon) {
        const points = ring(topology, indexes); if (!points.length) continue;
        points.forEach((point, index) => { const [x, y] = project(point); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath();
      }
    }
    ctx.fillStyle = fill; ctx.fill("evenodd"); ctx.stroke();
  }
  const ringArea = (coordinates) => Math.abs(coordinates.reduce((sum, point, index) => {
    const next = coordinates[(index + 1) % coordinates.length]; const [x1, y1] = project(point); const [x2, y2] = project(next); return sum + x1 * y2 - x2 * y1;
  }, 0) / 2) * 15; // viewer pixels -> base 4000×2400 pixels
  function drawGeoGeometry(geometry, fill, adminOnly = false) {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      if (adminOnly && ringArea(polygon[0]) < 50) continue;
      ctx.beginPath();
      polygon.forEach((part) => part.forEach((point, index) => { const [x, y] = project(point); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }));
      ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill("evenodd"); } ctx.stroke();
    }
  }
  function render() {
    const selectedYear = Number(year.value); label.textContent = selectedYear;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#0a2b66"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 0.55; ctx.strokeStyle = "#101519";
    if (selectedYear <= 2019) {
      const active = historical.objects.cshapes_2_gw.geometries.filter((feature) => feature.properties.start <= `${selectedYear}-12-31` && feature.properties.end >= `${selectedYear}-01-01`);
      active.forEach((feature) => drawTopoFeature(historical, feature, color(feature.properties.country_name)));
      status.textContent = `${selectedYear}: ${active.length} исторических государств и зависимых территорий.`;
    } else {
      modern.features.forEach((feature) => drawGeoGeometry(feature.geometry, color(feature.properties.ADMIN || feature.properties.NAME || "state")));
      status.textContent = `${selectedYear}: современный политический слой Natural Earth.`;
      if (adminToggle.checked) { ctx.strokeStyle = "rgba(10,15,20,.55)"; ctx.lineWidth = .35; admin.features.forEach((feature) => drawGeoGeometry(feature.geometry, null, true)); }
    }
  }
  Promise.all([
    fetch("../data/cshapes_2_gw.topojson?v=20260825-180000").then((response) => response.json()),
    fetch("../data/ne_10m_admin_0_countries.geojson?v=20260825-180000").then((response) => response.json()),
    fetch("../data/ne_10m_admin_1_states_provinces.geojson?v=20260825-180000").then((response) => response.json()),
  ]).then(([history, countries, subdivisions]) => { historical = history; modern = countries; admin = subdivisions; render(); })
    .catch((error) => { status.textContent = `Не удалось загрузить карту: ${error.message}`; });
  year.addEventListener("input", render); adminToggle.addEventListener("change", render);
  document.getElementById("previous").addEventListener("click", () => { year.value = Math.max(1886, Number(year.value) - 1); render(); });
  document.getElementById("next").addEventListener("click", () => { year.value = Math.min(2026, Number(year.value) + 1); render(); });
})();
