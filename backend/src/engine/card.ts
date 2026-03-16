export enum CardType {
  Treasure = "TREASURE",
  Victory = "VICTORY",
  Action = "ACTION",
  Reaction = "REACTION",
  Attack = "ATTACK",
  Curse = "CURSE",
  VictoryAction = "VICTORY-ACTION",
}

export interface Choice {
  text: string;
  value: any;
}

export interface Interaction {
  type: "choice" | "trash" | "gain" | "discard" | "reaction";
  message: string;
  options?: Choice[];
  minCards?: number;
  maxCards?: number;
  source?: "hand" | "supply" | "deck" | "discard";
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
