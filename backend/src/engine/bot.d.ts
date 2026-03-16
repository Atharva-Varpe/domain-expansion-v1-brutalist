import { GameState } from "./game.js";
export declare abstract class Bot {
    abstract takeTurn(game: GameState): Promise<void>;
}
export declare class EasyBot extends Bot {
    takeTurn(game: GameState): Promise<void>;
}
export declare class MediumBot extends Bot {
    takeTurn(game: GameState): Promise<void>;
}
export declare class HardBot extends Bot {
    takeTurn(game: GameState): Promise<void>;
}
//# sourceMappingURL=bot.d.ts.map