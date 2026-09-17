import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || true;

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", service: "anonymous-chat-signaling" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

io.on("connection", socket => {
  socket.on("join", room => {
    if (typeof room !== "string" || !room.trim()) return;
    socket.join(room.trim());
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
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server running on port ${PORT}`);
});
