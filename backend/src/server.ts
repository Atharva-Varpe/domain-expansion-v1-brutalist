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
    origin: (origin, callback) => {
      // Allow connections with no origin (e.g., mobile apps, curl)
      if (!origin) return callback(null, true);

      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl && origin === frontendUrl) {
        return callback(null, true);
      }

      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
        /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/,
      ];

      if (allowedPatterns.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
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
