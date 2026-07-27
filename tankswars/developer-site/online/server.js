const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const url = require("url");

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || "8021", 10);
const host = process.env.HOST || "0.0.0.0";
const teamSize = 7;
const queueDelayMs = 1800;
const profiles = new Map();
const clients = new Map();
const queue = [];
const matches = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function safeStaticPath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const cleanPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.normalize(path.join(rootDir, cleanPath));

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

function serveStatic(request, response) {
  const parsedUrl = url.parse(request.url);
  const filePath = safeStaticPath(parsedUrl.pathname || "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=60"
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

function getPublicClient(client) {
  return {
    id: client.id,
    username: client.username,
    tankId: client.tankId,
    tankName: client.tankName,
    tankLevel: client.tankLevel,
    team: client.team || "",
    ready: true,
    local: false
  };
}

function createBotSlot(team, slot, level = "1") {
  const title = team === "ally" ? "Союзник" : "Противник";

  return {
    id: `bot-${team}-${slot}-${Date.now().toString(36)}`,
    username: `${title} ${slot}`,
    tankId: 0,
    tankName: "ожидание игрока",
    tankLevel: level,
    team,
    ready: true,
    bot: true
  };
}

function sendFrame(socket, payload) {
  if (!socket.writable) {
    return;
  }

  const data = Buffer.from(JSON.stringify(payload));
  let header;

  if (data.length < 126) {
    header = Buffer.from([0x81, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  socket.write(Buffer.concat([header, data]));
}

function broadcast(payload) {
  clients.forEach((client) => sendFrame(client.socket, payload));
}

function sendQueueStatus() {
  broadcast({
    type: "queueStatus",
    queued: queue.map((client) => ({
      id: client.id,
      username: client.username,
      tankName: client.tankName,
      modeId: client.modeId
    })),
    playersOnline: clients.size
  });
}

function removeFromQueue(client) {
  const index = queue.indexOf(client);

  if (index !== -1) {
    queue.splice(index, 1);
    sendQueueStatus();
  }
}

function createMatch(seedClient) {
  const modeId = seedClient.modeId || "company";
  const modeTitle = seedClient.modeTitle || "Ротный бой";
  const candidates = queue.filter((client) => client.modeId === modeId).slice(0, teamSize * 2);

  candidates.forEach(removeFromQueue);

  const allies = [];
  const enemies = [];
  candidates.forEach((client, index) => {
    const team = index % 2 === 0 ? "ally" : "enemy";

    client.team = team;
    if (team === "ally") {
      allies.push(getPublicClient(client));
    } else {
      enemies.push(getPublicClient(client));
    }
  });

  while (allies.length < teamSize) {
    allies.push(createBotSlot("ally", allies.length + 1, seedClient.tankLevel));
  }

  while (enemies.length < teamSize) {
    enemies.push(createBotSlot("enemy", enemies.length + 1, seedClient.tankLevel));
  }

  const match = {
    id: `match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    modeId,
    modeTitle,
    teamSize,
    createdAt: Date.now(),
    serverAuthoritative: false,
    allies,
    enemies
  };

  matches.set(match.id, match);
  candidates.forEach((client) => {
    client.matchId = match.id;
    sendFrame(client.socket, { type: "matchFound", match });
  });
  sendQueueStatus();
}

function enqueueClient(client, payload) {
  removeFromQueue(client);
  client.modeId = payload.modeId || "company";
  client.modeTitle = payload.modeTitle || "Ротный бой";
  client.tankId = payload.tankId || 0;
  client.tankName = payload.tankName || "МС-1";
  client.tankLevel = payload.tankLevel || "1";
  client.queuedAt = Date.now();
  queue.push(client);
  sendFrame(client.socket, {
    type: "queued",
    queueSize: queue.length,
    teamSize
  });
  sendQueueStatus();
  setTimeout(() => {
    if (queue.includes(client)) {
      createMatch(client);
    }
  }, queueDelayMs);
}

function handleClientMessage(client, payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.type === "hello") {
    client.playerId = String(payload.playerId || client.playerId || client.id);
    client.username = String(payload.username || client.username || "Танкист").slice(0, 24);
    clients.set(client.id, client);
    sendFrame(client.socket, {
      type: "welcome",
      clientId: client.id,
      playerId: client.playerId,
      playersOnline: clients.size,
      teamSize
    });
    sendQueueStatus();
    return;
  }

  if (payload.type === "profileSnapshot") {
    if (client.playerId) {
      profiles.set(client.playerId, {
        playerId: client.playerId,
        username: client.username,
        snapshot: payload.snapshot || {},
        updatedAt: Date.now()
      });
    }
    sendFrame(client.socket, { type: "profileSaved", updatedAt: Date.now() });
    return;
  }

  if (payload.type === "queue") {
    enqueueClient(client, payload);
    return;
  }

  if (payload.type === "cancelQueue") {
    removeFromQueue(client);
    sendFrame(client.socket, { type: "queueCanceled" });
    return;
  }

  if (payload.type === "battleInput" && client.matchId) {
    const match = matches.get(client.matchId);

    if (!match) {
      return;
    }

    clients.forEach((otherClient) => {
      if (otherClient !== client && otherClient.matchId === client.matchId) {
        sendFrame(otherClient.socket, {
          type: "battleInput",
          playerId: client.playerId,
          input: payload.input || {}
        });
      }
    });
  }
}

function parseFrames(socket, buffer) {
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const secondByte = buffer[offset + 1];
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) {
        return;
      }
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) {
        return;
      }
      payloadLength = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;

    if (offset + frameLength > buffer.length) {
      return;
    }

    const opcode = buffer[offset] & 0x0f;
    const mask = masked ? buffer.slice(offset + headerLength, offset + headerLength + 4) : null;
    const payloadStart = offset + headerLength + maskLength;
    const payload = Buffer.from(buffer.slice(payloadStart, payloadStart + payloadLength));

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    if (opcode === 0x8) {
      socket.end();
      return;
    }

    if (opcode === 0x1) {
      try {
        const client = socket.client;
        handleClientMessage(client, JSON.parse(payload.toString("utf8")));
      } catch (error) {
        sendFrame(socket, { type: "error", message: "Bad message" });
      }
    }

    offset += frameLength;
  }
}

const server = http.createServer(async (request, response) => {
  const parsedUrl = url.parse(request.url || "", true);

  if (request.method === "GET" && parsedUrl.pathname === "/api/status") {
    sendJson(response, 200, {
      ok: true,
      playersOnline: clients.size,
      queued: queue.length,
      matches: matches.size,
      teamSize
    });
    return;
  }

  if (request.method === "GET" && parsedUrl.pathname?.startsWith("/api/profiles/")) {
    const playerId = decodeURIComponent(parsedUrl.pathname.slice("/api/profiles/".length));

    sendJson(response, 200, profiles.get(playerId) || null);
    return;
  }

  if (request.method === "POST" && parsedUrl.pathname?.startsWith("/api/profiles/")) {
    const playerId = decodeURIComponent(parsedUrl.pathname.slice("/api/profiles/".length));
    const body = await readRequestBody(request);
    const snapshot = body ? JSON.parse(body) : {};

    profiles.set(playerId, {
      playerId,
      username: snapshot?.profile?.username || "Танкист",
      snapshot,
      updatedAt: Date.now()
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  serveStatic(request, response);
});

server.on("upgrade", (request, socket) => {
  if (url.parse(request.url || "").pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const key = request.headers["sec-websocket-key"];

  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    ""
  ].join("\r\n"));

  const client = {
    id: crypto.randomUUID(),
    playerId: "",
    username: "Танкист",
    socket,
    team: "",
    matchId: "",
    connectedAt: Date.now()
  };

  socket.client = client;
  clients.set(client.id, client);
  socket.on("data", (buffer) => parseFrames(socket, buffer));
  socket.on("close", () => {
    removeFromQueue(client);
    clients.delete(client.id);
    sendQueueStatus();
  });
  socket.on("error", () => {
    removeFromQueue(client);
    clients.delete(client.id);
    sendQueueStatus();
  });
});

server.listen(port, host, () => {
  console.log(`Tanks Wars Online local server: http://localhost:${port}/`);
  console.log(`LAN URL: http://<your-local-ip>:${port}/`);
});
