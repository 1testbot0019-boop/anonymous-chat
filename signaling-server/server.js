import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  socket.on("join", room => {
    socket.join(room);
  });

  socket.on("offer", data => {
    socket.to(data.room).emit("offer", data);
  });

  socket.on("answer", data => {
    socket.to(data.room).emit("answer", data);
  });

  socket.on("ice", data => {
    socket.to(data.room).emit("ice", data);
  });
});

server.listen(3000, () =>
  console.log("Signaling server running on 3000")
);
