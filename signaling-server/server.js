import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const rooms = new Map();

const allowedOrigin = process.env.CLIENT_ORIGIN || true;
const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"], credentials: false },
  transports: ["websocket", "polling"]
});

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "anonymous-chat-signaling" });
});
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

function cleanRoom(value) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}
function cleanName(value) {
  return typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, 30) : "";
}
function getRoom(room) {
  if (!rooms.has(room)) rooms.set(room, new Map());
  return rooms.get(room);
}
function assignBotName(roomMembers) {
  const used = new Set();
  for (const member of roomMembers.values()) {
    const match = String(member.name || "").match(/^Bot(\d+)$/i);
    if (match) used.add(Number(match[1]));
  }
  let n = 1;
  while (used.has(n)) n++;
  return `Bot${n}`;
}

io.on("connection", socket => {
  socket.on("join", payload => {
    const room = cleanRoom(typeof payload === "string" ? payload : payload?.room);
    if (!room) return socket.emit("join_error", "Please enter a room code.");

    const roomMembers = getRoom(room);
    let name = cleanName(typeof payload === "string" ? "" : payload?.name);
    if (!name) name = assignBotName(roomMembers);

    socket.join(room);
    socket.data.room = room;
    socket.data.name = name;
    roomMembers.set(socket.id, { name, joinedAt: Date.now() });

    socket.emit("joined", { room, name, members: [...roomMembers.values()] });
    socket.to(room).emit("system", `${name} joined the room.`);
  });

  socket.on("chat", text => {
    const room = socket.data.room;
    if (!room || typeof text !== "string") return;
    const cleanText = text.trim().slice(0, 2000);
    if (!cleanText) return;
    io.to(room).emit("chat", { user: socket.data.name || "Bot", text: cleanText, time: Date.now() });
  });

  socket.on("offer", data => {
    if (!data?.room || !data?.offer) return;
    socket.to(data.room).emit("offer", data);
  });
  socket.on("answer", data => {
    if (!data?.room || !data?.answer) return;
    socket.to(data.room).emit("answer", data);
  });
  socket.on("ice", data => {
    if (!data?.room || !data?.candidate) return;
    socket.to(data.room).emit("ice", data);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (!room || !rooms.has(room)) return;
    const roomMembers = rooms.get(room);
    const name = roomMembers.get(socket.id)?.name || "User";
    roomMembers.delete(socket.id);
    socket.to(room).emit("system", `${name} left the room.`);
    if (roomMembers.size === 0) rooms.delete(room);
  });
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, "0.0.0.0", () => console.log(`Anonymous Chat server running on port ${PORT}`));
