import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { InMemoryGameRepository } from "./repositories/GameRepository.js";
import { GameService } from "./services/GameService.js";
import { SocketHandler } from "./api/SocketHandler.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Dependency Injection
const gameRepository = new InMemoryGameRepository();
const gameService = new GameService(gameRepository);
const socketHandler = new SocketHandler(io, gameService);

io.on("connection", (socket) => {
  socketHandler.registerEvents(socket);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`[HOST] NODE_INITIALIZED: BINDING @ 0.0.0.0:${PORT}`);
});

app.get("/ping", (req, res) => {
  res.json({ status: "ACTIVE", version: "V1.0-STAGING", server: "DOMAIN_EXPANSION" });
});
