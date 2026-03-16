import type { Card } from "./card.js";
export declare class Player {
    name: string;
    deck: Card[];
    hand: Card[];
    discard: Card[];
    playArea: Card[];
    constructor(name: string);
    private shuffleDiscardIntoDeck;
    draw(count?: number): Card[];
    discardHand(): void;
    discardPlayArea(): void;
    gainCard(card: Card): void;
    getVictoryPoints(): number;
}
//# sourceMappingURL=player.d.ts.map