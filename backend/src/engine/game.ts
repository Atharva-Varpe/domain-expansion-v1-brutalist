import { CardType, type Interaction } from "./card.js";
import type { Card } from "./card.js";
import { Player } from "./player.js";
import { CardFactory } from "./cards.js";
import { shuffle } from "./utils.js";

export enum GamePhase {
  Action = "ACTION",
  Buy = "BUY",
  Cleanup = "CLEANUP",
  WaitingForInput = "WAITING_FOR_INPUT",
}

export interface UndoRequest {
    requesterIndex: number;
    votes: { [playerIndex: number]: boolean };
}

export class GameState {
  public players: Player[] = [];
  public supply: Map<string, number> = new Map();
  public trash: Card[] = [];
  public currentPlayerIndex: number = 0;
  public phase: GamePhase = GamePhase.Action;
  public previousPhase: GamePhase = GamePhase.Action;
  public actions: number = 1;
  public buys: number = 1;
  public coins: number = 0;

  public currentInteraction: Interaction | null = null;
  public interactionCallback: ((result: any) => void) | null = null;
  public interactingPlayerIndex: number | null = null;
  public costReduction: number = 0;

  private history: string[] = [];
  public pendingUndo: UndoRequest | null = null;

  constructor(playerNames: string[]) {
    this.players = playerNames.map((name) => new Player(name));
    this.initializeSupply();
    this.initializePlayers();
    this.takeSnapshot();
  }

  private initializeSupply() {
    const is2Player = this.players.length === 2;
    const victoryCount = is2Player ? 8 : 12;

    this.supply.set("Copper", 60 - (this.players.length * 7));
    this.supply.set("Silver", 40);
    this.supply.set("Gold", 30);
    this.supply.set("Estate", victoryCount);
    this.supply.set("Duchy", victoryCount);
    this.supply.set("Province", victoryCount);
    this.supply.set("Curse", is2Player ? 10 : (this.players.length === 3 ? 20 : 30));

    const allKingdomCards = [
      "Artisan", "Bandit", "Bureaucrat", "Cellar", "Chapel", "Council Room", "Festival", "Gardens", "Harbinger", 
      "Laboratory", "Market", "Merchant", "Militia", "Mine", "Moat", "Moneylender", "Poacher", "Remodel", 
      "Sentry", "Smithy", "Throne Room", "Vassal", "Village", "Witch", "Workshop",
      "Baron", "Bridge", "Conspirator", "Courtier", "Courtyard", "Diplomat", "Duke", "Harem", "Ironworks", 
      "Lurker", "Masquerade", "Mill", "Mining Village", "Minion", "Nobles", "Patrol", "Pawn", "Replace", 
      "Secret Passage", "Shanty Town", "Slums", "Steward", "Swindler", "Torturer", "Trading Post", 
      "Upgrade", "Wishing Well"
    ];

    // Select exactly 10 kingdom cards
    const shuffled = shuffle([...allKingdomCards]);
    const selectedKingdom = shuffled.slice(0, 10);
    
    selectedKingdom.forEach(c => {
        const card = CardFactory.createCard(c);
        const isVictory = card.types.includes(CardType.Victory) || card.types.includes(CardType.VictoryAction);
        this.supply.set(c, isVictory ? victoryCount : 10);
    });
  }

  public getCardCost(name: string): number {
    const baseCard = CardFactory.createCard(name);
    return Math.max(0, baseCard.cost - this.costReduction);
  }

  private initializePlayers() {
    this.players.forEach((player) => {
      for (let i = 0; i < 7; i++) player.deck.push(CardFactory.createCard("Copper"));
      for (let i = 0; i < 3; i++) player.deck.push(CardFactory.createCard("Estate"));
      shuffle(player.deck);
      player.draw(5);
    });
  }

  public getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex]!;
  }

  public async requestInteraction(interaction: Interaction, playerIndex?: number): Promise<any> {
    const originalPhase = this.phase;
    this.phase = GamePhase.WaitingForInput;
    this.currentInteraction = interaction;
    this.interactingPlayerIndex = playerIndex !== undefined ? playerIndex : this.currentPlayerIndex;

    return new Promise((resolve) => {
      this.interactionCallback = (result: any) => {
        this.phase = originalPhase;
        this.currentInteraction = null;
        this.interactingPlayerIndex = null;
        this.interactionCallback = null;
        resolve(result);
      };
    });
  }

  public submitInteraction(result: any) {
    if (this.interactionCallback) {
      this.interactionCallback(result);
    }
  }

  public requestUndo(playerIndex: number) {
    if (this.pendingUndo || this.history.length === 0) return;
    this.pendingUndo = {
        requesterIndex: playerIndex,
        votes: { [playerIndex]: true }
    };
    // Auto-vote for bots
    this.players.forEach((p, i) => {
        if (p.display_name.toUpperCase().includes("BOT")) {
            this.pendingUndo!.votes[i] = true;
        }
    });
    this.checkUndoConsensus();
  }

  public voteUndo(playerIndex: number, accept: boolean) {
    if (!this.pendingUndo) return;
    this.pendingUndo.votes[playerIndex] = accept;
    this.checkUndoConsensus();
  }

  private checkUndoConsensus() {
    if (!this.pendingUndo) return;
    
    const voteValues = Object.values(this.pendingUndo.votes);
    const totalPlayers = this.players.length;

    if (voteValues.includes(false)) {
        this.pendingUndo = null;
        return;
    }

    if (voteValues.length === totalPlayers) {
        this.undo();
        this.pendingUndo = null;
    }
  }

  private undo() {
    if (this.history.length > 0) {
        const last = this.history.pop();
        if (last) {
            this.applySnapshot(last);
        }
    }
  }

  private takeSnapshot() {
    const data = {
        players: this.players.map(p => ({
            name: p.display_name,
            zones: {
                deck: p.zones.deck.map(c => c.name),
                hand: p.zones.hand.map(c => c.name),
                play_area: p.zones.play_area.map(c => c.name),
                discard_pile: p.zones.discard_pile.map(c => c.name),
                aside: p.zones.aside.map(c => c.name)
            },
            active_modifiers: { ...p.active_modifiers }
        })),
        supply: Array.from(this.supply.entries()),
        trash: this.trash.map(c => c.name),
        currentPlayerIndex: this.currentPlayerIndex,
        phase: this.phase,
        actions: this.actions,
        buys: this.buys,
        coins: this.coins,
        costReduction: this.costReduction
    };
    this.history.push(JSON.stringify(data));
    if (this.history.length > 10) this.history.shift();
  }

  private applySnapshot(json: string) {
    const data = JSON.parse(json);
    this.currentPlayerIndex = data.currentPlayerIndex;
    this.phase = data.phase;
    this.actions = data.actions;
    this.buys = data.buys;
    this.coins = data.coins;
    this.costReduction = data.costReduction;
    this.supply = new Map(data.supply);
    this.trash = data.trash.map((name: string) => CardFactory.createCard(name));
    
    data.players.forEach((pData: any, i: number) => {
        const p = this.players[i];
        if (p) {
            p.display_name = pData.name;
            p.active_modifiers = { ...pData.active_modifiers };
            p.zones.deck = pData.zones.deck.map((n: string) => CardFactory.createCard(n));
            p.zones.hand = pData.zones.hand.map((n: string) => CardFactory.createCard(n));
            p.zones.play_area = pData.zones.play_area.map((n: string) => CardFactory.createCard(n));
            p.zones.discard_pile = pData.zones.discard_pile.map((n: string) => CardFactory.createCard(n));
            p.zones.aside = pData.zones.aside.map((n: string) => CardFactory.createCard(n));
        }
    });

    this.currentInteraction = null;
    this.interactionCallback = null;
    this.interactingPlayerIndex = null;
  }

  public merchantsPlayedThisTurn: number = 0;
  private firstSilverPlayed: boolean = false;

  public async playCard(cardIndex: number) {
    if (this.phase === GamePhase.WaitingForInput) return;

    const player = this.getCurrentPlayer();
    if (cardIndex < 0 || cardIndex >= player.hand.length) return;

    const card = player.hand[cardIndex]!;

    if (this.phase === GamePhase.Action && (card.types.includes(CardType.Action) || card.types.includes(CardType.VictoryAction))) {
      if (this.actions > 0) {
        this.actions--;
        player.hand.splice(cardIndex, 1);
        player.playArea.push(card);
        
        // Execute effect
        if (card.execute) {
           await card.execute(this, player);
        }
      }
    } else if (this.phase === GamePhase.Buy && card.types.includes(CardType.Treasure)) {
      this.playTreasure(cardIndex);
    }
  }

  private playTreasure(cardIndex: number) {
    const player = this.getCurrentPlayer();
    const card = player.hand[cardIndex]!;
    player.hand.splice(cardIndex, 1);
    player.playArea.push(card);
    this.coins += card.value || 0;
    if (card.name === "Silver" && !this.firstSilverPlayed) {
      this.coins += this.merchantsPlayedThisTurn;
      this.firstSilverPlayed = true;
    }
  }

  public playAllTreasures() {
    if (this.phase !== GamePhase.Buy) return;
    const player = this.getCurrentPlayer();
    let i = 0;
    while (i < player.hand.length) {
      if (player.hand[i]!.types.includes(CardType.Treasure)) {
        this.playTreasure(i);
      } else {
        i++;
      }
    }
  }

  /**
   * INTERRUPT FLOW: Attack & Reaction Resolution
   */
  public async resolveAttack(attacker: Player, attackPayload: (victim: Player, victimIndex: number) => Promise<void>) {
    for (let i = 0; i < this.players.length; i++) {
      if (i === this.currentPlayerIndex) continue;
      const victim = this.players[i]!;
      
      // 1. Check for Reactions (like Moat)
      const reactionCards = victim.hand.filter(c => c.types.includes(CardType.Reaction));
      if (reactionCards.length > 0) {
        // Broadly, if they have a reaction, ask if they want to deploy it
        const deploy = await this.requestInteraction({
          type: "reaction",
          message: `INCOMING ATTACK. DEPLOY REACTION?`,
          options: [
            ...reactionCards.map(c => ({ text: `USE ${c.name}`, value: c.name })),
            { text: "DECLINE", value: null }
          ]
        }, i);

        if (deploy === "Moat") {
          victim.active_modifiers.immune_to_attack = true;
        } else if (deploy === "Diplomat") {
          // Diplomat logic: draw 2, discard 3
          victim.draw(2);
          const toDiscard = await this.requestInteraction({
            type: "discard",
            message: "DIPLOMAT: DISCARD 3 NODES",
            minCards: 3, maxCards: 3, source: "hand"
          }, i);
          if (toDiscard) {
            toDiscard.sort((a:number, b:number) => b-a).forEach((idx:number) => victim.discard.push(victim.hand.splice(idx, 1)[0]!));
          }
        }
      }

      // 2. Resolve Payload if not immune
      if (!victim.active_modifiers.immune_to_attack) {
        await attackPayload(victim, i);
      }

      // 3. Reset immunity
      victim.active_modifiers.immune_to_attack = false;
    }
  }

  public buyCard(cardName: string) {
    if (this.phase !== GamePhase.Buy || this.buys <= 0) return;

    const count = this.supply.get(cardName);
    if (count === undefined || count <= 0) return;

    const cost = this.getCardCost(cardName);
    if (this.coins >= cost) {
      this.coins -= cost;
      this.buys--;
      this.supply.set(cardName, count - 1);
      this.getCurrentPlayer().gainCard(CardFactory.createCard(cardName));
    }
  }

  public nextPhase() {
    if (this.phase === GamePhase.Action) {
      this.phase = GamePhase.Buy;
    } else if (this.phase === GamePhase.Buy) {
      this.phase = GamePhase.Cleanup;
      this.cleanup();
    }
  }

  private cleanup() {
    const player = this.getCurrentPlayer();
    player.discardHand();
    player.discardPlayArea();
    player.draw(5);
    this.actions = 1;
    this.buys = 1;
    this.coins = 0;
    this.costReduction = 0;
    this.merchantsPlayedThisTurn = 0;
    this.firstSilverPlayed = false;
    this.phase = GamePhase.Action;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.takeSnapshot();
  }

  public isGameOver(): boolean {
    if (this.supply.get("Province") === 0) return true;
    let emptyPiles = 0;
    this.supply.forEach((count) => {
      if (count === 0) emptyPiles++;
    });
    return emptyPiles >= 3;
  }

  public getState() {
    return {
      supply: Array.from(this.supply.entries()).map(([name, count]) => ({
        name,
        count,
        cost: this.getCardCost(name),
        card: CardFactory.createCard(name)
      })),
      trash: this.trash,
      currentPlayerIndex: this.currentPlayerIndex,
      interactingPlayerIndex: this.interactingPlayerIndex,
      phase: this.phase,
      actions: this.actions,
      buys: this.buys,
      coins: this.coins,
      currentInteraction: this.currentInteraction,
      isGameOver: this.isGameOver(),
      pendingUndo: this.pendingUndo,
      players: this.players.map((p, i) => {
        return {
          name: p.display_name,
          handSize: p.zones.hand.length,
          deckSize: p.zones.deck.length,
          discardSize: p.zones.discard_pile.length,
          playArea: p.zones.play_area,
          hand: p.zones.hand,
        };
      })
    };
  }
}
