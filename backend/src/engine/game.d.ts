import { type Interaction } from "./card.js";
import type { Card } from "./card.js";
import { Player } from "./player.js";
export declare enum GamePhase {
    Action = "Action",
    Buy = "Buy",
    Cleanup = "Cleanup",
    WaitingForInput = "WaitingForInput"
}
export declare class GameState {
    players: Player[];
    supply: Map<string, number>;
    trash: Card[];
    currentPlayerIndex: number;
    phase: GamePhase;
    previousPhase: GamePhase;
    actions: number;
    buys: number;
    coins: number;
    currentInteraction: Interaction | null;
    interactionCallback: ((result: any) => void) | null;
    costReduction: number;
    constructor(playerNames: string[]);
    private initializeSupply;
    getCardCost(name: string): number;
    private initializePlayers;
    getCurrentPlayer(): Player;
    requestInteraction(interaction: Interaction): Promise<any>;
    submitInteraction(result: any): void;
    private merchantsPlayedThisTurn;
    private firstSilverPlayed;
    playCard(cardIndex: number): Promise<void>;
    buyCard(cardName: string): void;
    nextPhase(): void;
    private cleanup;
    isGameOver(): boolean;
    getState(): {
        players: {
            name: string;
            handSize: number;
            deckSize: number;
            discardSize: number;
            playArea: Card[];
            hand: Card[];
        }[];
        supply: {
            name: string;
            count: number;
            cost: number;
            card: Card;
        }[];
        trash: Card[];
        currentPlayerIndex: number;
        phase: GamePhase;
        actions: number;
        buys: number;
        coins: number;
        currentInteraction: Interaction | null;
        isGameOver: boolean;
    };
}
//# sourceMappingURL=game.d.ts.map