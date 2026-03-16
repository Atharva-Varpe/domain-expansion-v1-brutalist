import type { Card } from "./card.js";

export class Player {
  public player_id: string;
  public display_name: string;
  public connection_status: "active" | "inactive" = "active";
  
  public zones = {
    deck: [] as Card[],
    hand: [] as Card[],
    play_area: [] as Card[],
    discard_pile: [] as Card[],
    aside: [] as Card[]
  };

  public active_modifiers = {
    cost_reduction: 0,
    immune_to_attack: false
  };

  constructor(name: string) {
    this.player_id = "usr_" + Math.random().toString(36).substring(2, 8);
    this.display_name = name;
  }

  // Helper getters for compatibility with existing code while migrating to zones structure
  get hand() { return this.zones.hand; }
  get deck() { return this.zones.deck; }
  get discard() { return this.zones.discard_pile; }
  get playArea() { return this.zones.play_area; }
  get aside() { return this.zones.aside; }
  get name() { return this.display_name; }

  private shuffleDiscardIntoDeck() {
    if (this.zones.discard_pile.length === 0) return;
    this.zones.deck = [...this.zones.discard_pile].sort(() => Math.random() - 0.5);
    this.zones.discard_pile = [];
  }

  public draw(count: number = 1): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.zones.deck.length === 0) {
        this.shuffleDiscardIntoDeck();
      }
      if (this.zones.deck.length > 0) {
        drawn.push(this.zones.deck.pop()!);
      }
    }
    this.zones.hand.push(...drawn);
    return drawn;
  }

  public discardHand() {
    this.zones.discard_pile.push(...this.zones.hand);
    this.zones.hand = [];
  }

  public discardPlayArea() {
    this.zones.discard_pile.push(...this.zones.play_area);
    this.zones.play_area = [];
  }

  public gainCard(card: Card) {
    this.zones.discard_pile.push(card);
  }

  public getVictoryPoints(): number {
    const allCards = [...this.zones.deck, ...this.zones.hand, ...this.zones.discard_pile];
    let vp = allCards.reduce((acc, card) => acc + (card.vp || 0), 0);
    
    const gardensCount = allCards.filter(c => c.name === "Gardens").length;
    vp += gardensCount * Math.floor(allCards.length / 10);
    
    const dukeCount = allCards.filter(c => c.name === "Duke").length;
    const duchyCount = allCards.filter(c => c.name === "Duchy").length;
    vp += dukeCount * duchyCount;
    
    return vp;
  }

  public toJSON() {
    return {
      player_id: this.player_id,
      display_name: this.display_name,
      connection_status: this.connection_status,
      zones: {
        deck: this.zones.deck.map(c => ({ id: c.id, name: c.name, types: c.types, cost: c.cost })),
        hand: this.zones.hand, // Hand cards usually need full data for the owner
        play_area: this.zones.play_area,
        discard_pile: this.zones.discard_pile.map(c => ({ id: c.id, name: c.name, types: c.types, cost: c.cost })),
        aside: this.zones.aside
      },
      active_modifiers: this.active_modifiers
    };
  }
}
