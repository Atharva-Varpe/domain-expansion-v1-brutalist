import { GameState } from "../engine/game.js";
import type { IGameRepository } from "../repositories/GameRepository.js";
import { EasyBot, MediumBot, HardBot } from "../engine/bot.js";
import { NotFoundError } from "../errors/AppError.js";

export class GameService {
  constructor(private gameRepository: IGameRepository) {}

  public createGame(playerNames: string[]): string {
    const gameId = Math.random().toString(36).substring(7);
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

  public async handleBots(gameId: string, onUpdate: (state: any) => void): Promise<void> {
    const game = this.gameRepository.get(gameId);
    if (!game) return;

    let currentPlayer = game.getCurrentPlayer();
    while (currentPlayer.display_name.includes("Bot") && !game.isGameOver()) {
      let bot;
      if (currentPlayer.display_name.includes("Easy")) bot = new EasyBot();
      else if (currentPlayer.display_name.includes("Medium")) bot = new MediumBot();
      else bot = new HardBot();

      await bot.takeTurn(game);
      onUpdate(game.getState());
      currentPlayer = game.getCurrentPlayer();
    }
  }

  private getGameOrFail(gameId: string): GameState {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      throw new NotFoundError(`Game with ID ${gameId} not found`);
    }
    return game;
  }
}
