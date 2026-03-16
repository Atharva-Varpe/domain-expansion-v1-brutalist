import { GameState, GamePhase } from "./game.js";
import { CardType } from "./card.js";

export abstract class Bot {
  public abstract takeTurn(game: GameState): Promise<void>;

  protected async handleInteractions(game: GameState): Promise<void> {
    while (game.phase === GamePhase.WaitingForInput && game.interactingPlayerIndex !== null) {
      const player = game.players[game.interactingPlayerIndex];
      if (!player.display_name.includes("Bot")) break;

      const interaction = game.currentInteraction;
      if (!interaction) break;

      let result: any = null;

      switch (interaction.type) {
        case "choice":
          if (interaction.options && interaction.options.length > 0) {
            // Default to first option
            result = interaction.options[0].value;
          }
          break;
        case "discard":
        case "trash":
          const count = interaction.minCards || 0;
          if (interaction.source === "hand") {
            // Just pick the first 'count' cards
            result = Array.from({ length: Math.min(count, player.hand.length) }, (_, i) => i);
          }
          break;
        case "gain":
          // Interaction message usually contains cost info, but for bots we'll just pick something affordable
          const options = Array.from(game.supply.entries())
            .filter(([_, qty]) => qty > 0)
            .map(([name]) => name);
          result = options.length > 0 ? options[0] : null;
          break;
        case "reaction":
          result = null; // Decline reactions by default
          break;
      }

      game.submitInteraction(result);
    }
  }
}

export class EasyBot extends Bot {
  public async takeTurn(game: GameState): Promise<void> {
    await this.handleInteractions(game);
    const player = game.getCurrentPlayer();

    // Action Phase
    if (game.phase === GamePhase.Action) {
      while (game.actions > 0) {
        await this.handleInteractions(game);
        if (game.phase !== GamePhase.Action) break;

        const actionCards = player.hand
          .map((card, index) => ({ card, index }))
          .filter((item) => item.card.types.includes(CardType.Action));
        if (actionCards.length === 0) break;
        const randomAction = actionCards[Math.floor(Math.random() * actionCards.length)]!;
        game.playCard(randomAction.index);
        await this.handleInteractions(game);
      }
      if (game.phase === GamePhase.Action) game.nextPhase();
    }

    await this.handleInteractions(game);

    // Buy Phase
    if (game.phase === GamePhase.Buy) {
      // Play all treasures
      let treasureIndex;
      while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
        game.playCard(treasureIndex);
      }

      // Buy random affordable card
      const affordableCards = Array.from(game.supply.entries())
        .filter(([name, count]) => {
          if (count <= 0) return false;
          try {
            return game.coins >= game.getCardCost(name);
          } catch {
            return false;
          }
        })
        .map(([name]) => name);

      if (affordableCards.length > 0) {
        const randomCard = affordableCards[Math.floor(Math.random() * affordableCards.length)]!;
        game.buyCard(randomCard);
      }
      game.nextPhase();
    }
  }
}

export class MediumBot extends Bot {
  // "Big Money" Strategy
  public async takeTurn(game: GameState): Promise<void> {
    await this.handleInteractions(game);
    const player = game.getCurrentPlayer();

    if (game.phase === GamePhase.Action) {
      game.nextPhase(); // Skip actions usually
    }

    await this.handleInteractions(game);

    if (game.phase === GamePhase.Buy) {
      // Play all treasures
      let treasureIndex;
      while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
        game.playCard(treasureIndex);
      }

      // Priority Buy
      if (game.coins >= 8) game.buyCard("Province");
      else if (game.coins >= 6) game.buyCard("Gold");
      else if (game.coins >= 3) game.buyCard("Silver");
      
      game.nextPhase();
    }
  }
}

export class HardBot extends Bot {
  // "Engine Builder" Strategy
  public async takeTurn(game: GameState): Promise<void> {
    await this.handleInteractions(game);
    const player = game.getCurrentPlayer();

    if (game.phase === GamePhase.Action) {
      // Play Actions in priority: +Actions first, then +Cards
      while (game.actions > 0) {
        await this.handleInteractions(game);
        if (game.phase !== GamePhase.Action) break;

        const hand = player.hand;
        let bestActionIndex = hand.findIndex(c => c.name === "Village" || c.name === "Market");
        if (bestActionIndex === -1) {
            bestActionIndex = hand.findIndex(c => c.name === "Smithy");
        }
        
        if (bestActionIndex !== -1) {
            game.playCard(bestActionIndex);
            await this.handleInteractions(game);
        } else {
            break;
        }
      }
      if (game.phase === GamePhase.Action) game.nextPhase();
    }

    await this.handleInteractions(game);

    if (game.phase === GamePhase.Buy) {
      let treasureIndex;
      while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
        game.playCard(treasureIndex);
      }

      // Early game: buy components
      const totalCards = player.deck.length + player.hand.length + player.discard.length;
      if (totalCards < 15) {
          if (game.coins >= 5) game.buyCard("Market");
          else if (game.coins >= 4) game.buyCard("Smithy");
          else if (game.coins >= 3) game.buyCard("Village");
          else if (game.coins >= 3) game.buyCard("Silver");
      } else {
          // Mid-Late game: Big Money
          if (game.coins >= 8) game.buyCard("Province");
          else if (game.coins >= 6) game.buyCard("Gold");
          else if (game.coins >= 5) game.buyCard("Duchy"); // Start greening
          else if (game.coins >= 3) game.buyCard("Silver");
      }
      game.nextPhase();
    }
  }
}
