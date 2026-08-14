import fs from "node:fs";
import { deflateSync } from "node:zlib";

const width = 1280;
const height = 720;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, payload) {
  const typeBytes = Buffer.from(type, "ascii");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, payload])), 0);
  return Buffer.concat([header, typeBytes, payload, checksum]);
}

function writePng(path, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

function canvas(fill) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set([...fill, 255], index);
  return pixels;
}

function pixel(pixels, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  pixels.set([...color, 255], (y * width + x) * 4);
}

function polygon(pixels, points, color) {
  const ys = points.map(([, y]) => y);
  const low = Math.max(0, Math.ceil(Math.min(...ys)));
  const high = Math.min(height - 1, Math.floor(Math.max(...ys)));
  for (let y = low; y <= high; y += 1) {
    const xs = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x += 1) pixel(pixels, x, y, color);
    }
  }
}

function disc(pixels, cx, cy, radius, color) {
  for (let y = Math.ceil(cy - radius); y <= Math.floor(cy + radius); y += 1) {
    const half = Math.sqrt(Math.max(0, radius ** 2 - (y - cy) ** 2));
    for (let x = Math.ceil(cx - half); x <= Math.floor(cx + half); x += 1) pixel(pixels, x, y, color);
  }
}

function ellipse(pixels, cx, cy, radiusX, radiusY, color) {
  for (let y = Math.ceil(cy - radiusY); y <= Math.floor(cy + radiusY); y += 1) {
    const ratio = (y - cy) / radiusY;
    const half = radiusX * Math.sqrt(Math.max(0, 1 - ratio ** 2));
    for (let x = Math.ceil(cx - half); x <= Math.floor(cx + half); x += 1) pixel(pixels, x, y, color);
  }
}

function stroke(pixels, points, radius, color) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const distance = Math.max(1, Math.hypot(x2 - x1, y2 - y1));
    for (let step = 0; step <= distance; step += 1) disc(pixels, x1 + (x2 - x1) * step / distance, y1 + (y2 - y1) * step / distance, radius, color);
  }
}

function drawTaiwan() {
  const pixels = canvas([222, 0, 0]);
  // Official 3:2 flag, centred on the fixed 16:9 game asset canvas.
  const blue = [0, 0, 148];
  const white = [255, 255, 255];
  const flagWidth = 1080;
  const offsetX = (width - flagWidth) / 2;
  for (let y = 0; y < 360; y += 1) for (let x = offsetX; x < offsetX + flagWidth / 2; x += 1) pixel(pixels, x, y, blue);
  const scaleX = flagWidth / 120;
  const scaleY = height / 80;
  const toCanvas = ([x, y]) => [offsetX + x * scaleX, y * scaleY];
  const rotate = ([x, y], degrees) => {
    const radians = degrees * Math.PI / 180;
    const dx = x - 30;
    const dy = y - 20;
    return [30 + dx * Math.cos(radians) - dy * Math.sin(radians), 20 + dx * Math.sin(radians) + dy * Math.cos(radians)];
  };
  // The quadrilateral matches the official SVG's single ray, repeated every 30°.
  const ray = [[30, 5], [34, 20], [30, 35], [26, 20]];
  for (let index = 0; index < 12; index += 1) polygon(pixels, ray.map((point) => toCanvas(rotate(point, index * 30))), white);
  const [cx, cy] = toCanvas([30, 20]);
  ellipse(pixels, cx, cy, 8.5 * scaleX, 8.5 * scaleY, blue);
  ellipse(pixels, cx, cy, 8 * scaleX, 8 * scaleY, white);
  writePng("img/flagi/taiwan.png", pixels);
}

function drawQingEmpire() {
  // The dragon is drawn locally from primitives, then scaled and mirrored into a 3:2 field.
  const pixels = canvas([244, 201, 35]);
  const blue = [12, 70, 142];
  const darkBlue = [7, 43, 99];
  const red = [180, 28, 34];
  const white = [250, 246, 222];
  // Original game emblem: a coiled azure dragon, composed from hand-drawn primitive shapes.
  const body = [[205, 430], [330, 540], [530, 540], [650, 445], [690, 315], [820, 225], [980, 285]];
  stroke(pixels, body, 43, darkBlue);
  stroke(pixels, body, 31, blue);
  disc(pixels, 997, 292, 72, darkBlue);
  disc(pixels, 997, 292, 58, blue);
  polygon(pixels, [[1005, 232], [1054, 181], [1039, 260]], blue);
  polygon(pixels, [[960, 237], [942, 173], [992, 249]], blue);
  polygon(pixels, [[1039, 324], [1107, 345], [1041, 354]], blue);
  polygon(pixels, [[976, 323], [914, 354], [977, 354]], blue);
  polygon(pixels, [[1012, 338], [1067, 395], [997, 360]], darkBlue);
  disc(pixels, 1018, 275, 9, white);
  disc(pixels, 1019, 276, 4, darkBlue);
  disc(pixels, 1040, 310, 10, red);
  polygon(pixels, [[730, 286], [687, 216], [757, 267]], blue);
  polygon(pixels, [[600, 479], [571, 555], [648, 508]], blue);
  polygon(pixels, [[394, 500], [350, 574], [435, 527]], blue);
  polygon(pixels, [[610, 432], [554, 400], [575, 466]], blue);
  disc(pixels, 515, 544, 12, [244, 201, 35]);
  disc(pixels, 645, 443, 12, [244, 201, 35]);
  // Red pearl: it is mirrored with the dragon below, placing it before the dragon's face.
  disc(pixels, 1102, 165, 53, red);
  const fieldWidth = 1080;
  const fieldOffset = (width - fieldWidth) / 2;
  const finalPixels = canvas([244, 201, 35]);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < fieldWidth; x += 1) {
      const sourceX = width - 1 - Math.floor(x * width / fieldWidth);
      const sourceIndex = (y * width + sourceX) * 4;
      const targetIndex = (y * width + fieldOffset + x) * 4;
      finalPixels.set(pixels.subarray(sourceIndex, sourceIndex + 4), targetIndex);
    }
  }
  writePng("img/flagi/qing-empire.png", finalPixels);
}

drawQingEmpire();
drawTaiwan();
console.log("Drawn local 3:2 Qing Empire and Taiwan flags on 1280×720 canvases.");
