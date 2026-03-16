import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { GameState, GamePhase } from "./engine/game.js";
import { CardFactory } from "./engine/cards.js";
import { EasyBot, MediumBot, HardBot } from "./engine/bot.js";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});
const games = new Map();
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("create_game", (playerNames) => {
        const gameId = Math.random().toString(36).substring(7);
        const game = new GameState(playerNames);
        games.set(gameId, game);
        socket.join(gameId);
        socket.emit("game_created", gameId);
        broadcastState(gameId);
    });
    socket.on("join_game", (gameId) => {
        if (games.has(gameId)) {
            socket.join(gameId);
            broadcastState(gameId);
        }
    });
    socket.on("play_card", ({ gameId, cardIndex }) => {
        const game = games.get(gameId);
        if (game) {
            game.playCard(cardIndex);
            broadcastState(gameId);
        }
    });
    socket.on("buy_card", ({ gameId, cardName }) => {
        const game = games.get(gameId);
        if (game) {
            game.buyCard(cardName);
            broadcastState(gameId);
        }
    });
    socket.on("submit_interaction", ({ gameId, result }) => {
        const game = games.get(gameId);
        if (game) {
            game.submitInteraction(result);
            broadcastState(gameId);
        }
    });
    socket.on("next_phase", (gameId) => {
        const game = games.get(gameId);
        if (game) {
            game.nextPhase();
            handleBots(gameId);
            broadcastState(gameId);
        }
    });
    async function handleBots(gameId) {
        const game = games.get(gameId);
        if (!game)
            return;
        let currentPlayer = game.getCurrentPlayer();
        // Simple check if player name includes "Bot"
        while (currentPlayer.name.includes("Bot") && !game.isGameOver()) {
            let bot;
            if (currentPlayer.name.includes("Easy"))
                bot = new EasyBot();
            else if (currentPlayer.name.includes("Medium"))
                bot = new MediumBot();
            else
                bot = new HardBot();
            await bot.takeTurn(game);
            broadcastState(gameId);
            currentPlayer = game.getCurrentPlayer();
        }
    }
    function broadcastState(gameId) {
        const game = games.get(gameId);
        if (game) {
            io.to(gameId).emit("game_state", game.getState());
        }
    }
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map