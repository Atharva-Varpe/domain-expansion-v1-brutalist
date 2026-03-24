import { randomBytes } from "crypto";
import { Server, Socket } from "socket.io";
import { GameService } from "../services/GameService.js";
import { ValidationError } from "../errors/AppError.js";

interface Room {
  id: string;
  hostId: string;
  players: { id: string, name: string }[];
}

export class SocketHandler {
  private users: Map<string, string> = new Map(); // socketId -> name
  private rooms: Map<string, Room> = new Map();

  constructor(private io: Server, private gameService: GameService) {}

  public registerEvents(socket: Socket): void {
    console.log("A user connected:", socket.id);

    socket.on("set_name", (name: string) => {
      this.users.set(socket.id, name.toUpperCase());
      this.broadcastUsers();
      this.broadcastRooms();
    });

    socket.on("create_room", () => {
      const roomId = randomBytes(4).toString("hex");
      const name = this.users.get(socket.id) || "UNKNOWN";
      const room: Room = {
        id: roomId,
        hostId: socket.id,
        players: [{ id: socket.id, name }]
      };
      this.rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room_created", roomId);
      this.broadcastRooms();
    });

    socket.on("join_room", (roomId: string) => {
      const room = this.rooms.get(roomId);
      if (room) {
        if (room.players.length >= 4) {
          socket.emit("error", "Room full");
          return;
        }
        const name = this.users.get(socket.id) || "UNKNOWN";
        room.players.push({ id: socket.id, name });
        socket.join(roomId);
        this.broadcastRooms();
      }
    });

    socket.on("leave_room", (roomId: string) => {
      this.handleLeaveRoom(socket, roomId);
    });

    socket.on("remove_player", ({ roomId, playerId }: { roomId: string, playerId: string }) => {
      const room = this.rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.players = room.players.filter(p => p.id !== playerId);
        const targetSocket = this.io.sockets.sockets.get(playerId);
        if (targetSocket) targetSocket.leave(roomId);
        this.broadcastRooms();
      }
    });

    socket.on("start_game", (roomId: string) => {
      try {
        const room = this.rooms.get(roomId);
        if (room && room.hostId === socket.id) {
          const playerNames = room.players.map(p => p.name);
          const gameId = this.gameService.createGame(playerNames);
          const game = this.gameService.getGame(gameId);
          
          if (!game) throw new Error("Game creation failed");

          // Ensure all physical players join the socket room for this game
          room.players.forEach(p => {
            const targetSocket = this.io.sockets.sockets.get(p.id);
            if (targetSocket) {
              targetSocket.join(gameId);
            }
          });

          // Broadcast to BOTH roomId (lobby) and gameId (game) to ensure everyone transitions
          const initialState = game.getState();
          this.io.to(roomId).emit("game_created", gameId);
          this.io.to(roomId).emit("game_state", initialState);
          this.io.to(gameId).emit("game_created", gameId);
          this.io.to(gameId).emit("game_state", initialState);
        }
      } catch (error: unknown) {
        console.error("START_GAME_ERROR:", error);
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("create_game", (playerNames: string[]) => {
      try {
        if (!Array.isArray(playerNames) || playerNames.length === 0) {
          throw new ValidationError("Invalid player names");
        }
        const gameId = this.gameService.createGame(playerNames);
        const game = this.gameService.getGame(gameId);
        if (!game) throw new Error("Game creation failed");

        socket.join(gameId);
        socket.emit("game_created", gameId);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("join_game", (gameId: string) => {
      try {
        const game = this.gameService.getGame(gameId);
        if (!game) {
          throw new ValidationError("Game not found");
        }
        socket.join(gameId);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("play_card", async ({ gameId, cardIndex }: { gameId: string; cardIndex: number }) => {
      try {
        this.gameService.playCard(gameId, cardIndex);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("play_all_treasures", ({ gameId }: { gameId: string }) => {
      try {
        this.gameService.playAllTreasures(gameId);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("buy_card", ({ gameId, cardName }: { gameId: string; cardName: string }) => {
      try {
        this.gameService.buyCard(gameId, cardName);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("submit_interaction", ({ gameId, result }: { gameId: string; result: any }) => {
      try {
        this.gameService.submitInteraction(gameId, result);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("next_phase", async (gameId: string) => {
      try {
        this.gameService.nextPhase(gameId);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("undo_request", ({ gameId, playerIndex }: { gameId: string; playerIndex: number }) => {
      try {
        this.gameService.requestUndo(gameId, playerIndex);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("undo_vote", ({ gameId, playerIndex, accept }: { gameId: string; playerIndex: number; accept: boolean }) => {
      try {
        this.gameService.voteUndo(gameId, playerIndex, accept);
        this.broadcastState(gameId);
      } catch (error: unknown) {
        socket.emit("error", error instanceof Error ? error.message : "An unknown error occurred");
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      this.users.delete(socket.id);
      this.rooms.forEach((room, roomId) => {
        if (room.players.some(p => p.id === socket.id)) {
          this.handleLeaveRoom(socket, roomId);
        }
      });
      this.broadcastUsers();
    });
  }

  private handleLeaveRoom(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      socket.leave(roomId);
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
      } else if (room.hostId === socket.id) {
        const nextHost = room.players[0];
        if (nextHost) {
          room.hostId = nextHost.id;
        } else {
          this.rooms.delete(roomId);
        }
      }
      this.broadcastRooms();
    }
  }

  private broadcastUsers() {
    const usersList = Array.from(this.users.entries()).map(([id, name]) => ({ id, name }));
    this.io.emit("users_list", usersList);
  }

  private broadcastRooms() {
    const roomsList = Array.from(this.rooms.values());
    this.io.emit("rooms_list", roomsList);
  }

  private broadcastState(gameId: string): void {
    const game = this.gameService.getGame(gameId);
    if (game) {
      this.io.to(gameId).emit("game_state", game.getState());
    }
  }

  private broadcastStateByObj(gameId: string, state: any): void {
    this.io.to(gameId).emit("game_state", state);
  }
}
