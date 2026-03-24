import { randomBytes } from "crypto";
import { GameState } from "../engine/game.js";
import type { IGameRepository } from "../repositories/GameRepository.js";
import { NotFoundError } from "../errors/AppError.js";

export class GameService {
  constructor(private gameRepository: IGameRepository) {}

  public createGame(playerNames: string[]): string {
    const gameId = randomBytes(4).toString("hex");
    const game = new GameState(playerNames);
    this.gameRepository.set(gameId, game);
    return gameId;
  }

  public getGame(gameId: string): GameState | undefined {
    return this.gameRepository.get(gameId);
  }

  public playCard(gameId: string, cardIndex: number): void {
    const game = this.getGameOrFail(gameId);
    game.playCard(cardIndex);
  }

  public playAllTreasures(gameId: string): void {
    const game = this.getGameOrFail(gameId);
    game.playAllTreasures();
  }

  public buyCard(gameId: string, cardName: string): void {
    const game = this.getGameOrFail(gameId);
    game.buyCard(cardName);
  }

  public submitInteraction(gameId: string, result: any): void {
    const game = this.getGameOrFail(gameId);
    game.submitInteraction(result);
  }

  public nextPhase(gameId: string): void {
    const game = this.getGameOrFail(gameId);
    game.nextPhase();
  }

  public requestUndo(gameId: string, playerIndex: number): void {
    const game = this.getGameOrFail(gameId);
    game.requestUndo(playerIndex);
  }

  public voteUndo(gameId: string, playerIndex: number, accept: boolean): void {
    const game = this.getGameOrFail(gameId);
    game.voteUndo(playerIndex, accept);
  }

  private getGameOrFail(gameId: string): GameState {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      throw new NotFoundError(`Game with ID ${gameId} not found`);
    }
    return game;
  }
}
