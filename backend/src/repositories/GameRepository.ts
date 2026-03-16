import { GameState } from "../engine/game.js";

export interface IGameRepository {
  get(gameId: string): GameState | undefined;
  set(gameId: string, game: GameState): void;
  delete(gameId: string): void;
}

export class InMemoryGameRepository implements IGameRepository {
  private games = new Map<string, GameState>();

  public get(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  public set(gameId: string, game: GameState): void {
    this.games.set(gameId, game);
  }

  public delete(gameId: string): void {
    this.games.delete(gameId);
  }
}
