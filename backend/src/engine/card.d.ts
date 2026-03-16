export declare enum CardType {
    Treasure = "Treasure",
    Victory = "Victory",
    Action = "Action",
    Reaction = "Reaction",
    Attack = "Attack",
    Curse = "Curse",
    VictoryAction = "Victory-Action"
}
export interface Choice {
    text: string;
    value: any;
}
export interface Interaction {
    type: "choice" | "trash" | "gain" | "discard";
    message: string;
    options?: Choice[];
    minCards?: number;
    maxCards?: number;
    source?: "hand" | "supply" | "deck";
}
export interface Card {
    id: string;
    name: string;
    cost: number;
    types: CardType[];
    description: string;
    vp?: number;
    value?: number;
    execute?: (game: any, player: any) => Promise<void>;
}
//# sourceMappingURL=card.d.ts.map