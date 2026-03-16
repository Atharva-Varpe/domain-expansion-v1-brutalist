import { GameState, GamePhase } from "./game.js";
import { CardType } from "./card.js";
export class Bot {
}
export class EasyBot extends Bot {
    async takeTurn(game) {
        const player = game.getCurrentPlayer();
        // Action Phase
        if (game.phase === GamePhase.Action) {
            while (game.actions > 0) {
                const actionCards = player.hand
                    .map((card, index) => ({ card, index }))
                    .filter((item) => item.card.types.includes(CardType.Action));
                if (actionCards.length === 0)
                    break;
                const randomAction = actionCards[Math.floor(Math.random() * actionCards.length)];
                game.playCard(randomAction.index);
            }
            game.nextPhase();
        }
        // Buy Phase
        if (game.phase === GamePhase.Buy) {
            // Play all treasures
            let treasureIndex;
            while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
                game.playCard(treasureIndex);
            }
            // Buy random affordable card
            const { CardFactory } = await import("./cards.js");
            const affordableCards = Array.from(game.supply.entries())
                .filter(([name, count]) => {
                if (count <= 0)
                    return false;
                try {
                    return game.coins >= CardFactory.createCard(name).cost;
                }
                catch {
                    return false;
                }
            })
                .map(([name]) => name);
            if (affordableCards.length > 0) {
                const randomCard = affordableCards[Math.floor(Math.random() * affordableCards.length)];
                game.buyCard(randomCard);
            }
            game.nextPhase();
        }
    }
}
export class MediumBot extends Bot {
    // "Big Money" Strategy
    async takeTurn(game) {
        const player = game.getCurrentPlayer();
        if (game.phase === GamePhase.Action) {
            game.nextPhase(); // Skip actions usually
        }
        if (game.phase === GamePhase.Buy) {
            // Play all treasures
            let treasureIndex;
            while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
                game.playCard(treasureIndex);
            }
            // Priority Buy
            if (game.coins >= 8)
                game.buyCard("Province");
            else if (game.coins >= 6)
                game.buyCard("Gold");
            else if (game.coins >= 3)
                game.buyCard("Silver");
            game.nextPhase();
        }
    }
}
export class HardBot extends Bot {
    // "Engine Builder" Strategy
    async takeTurn(game) {
        const player = game.getCurrentPlayer();
        if (game.phase === GamePhase.Action) {
            // Play Actions in priority: +Actions first, then +Cards
            while (game.actions > 0) {
                const hand = player.hand;
                let bestActionIndex = hand.findIndex(c => c.name === "Village" || c.name === "Market");
                if (bestActionIndex === -1) {
                    bestActionIndex = hand.findIndex(c => c.name === "Smithy");
                }
                if (bestActionIndex !== -1) {
                    game.playCard(bestActionIndex);
                }
                else {
                    break;
                }
            }
            game.nextPhase();
        }
        if (game.phase === GamePhase.Buy) {
            let treasureIndex;
            while ((treasureIndex = player.hand.findIndex((c) => c.types.includes(CardType.Treasure))) !== -1) {
                game.playCard(treasureIndex);
            }
            // Early game: buy components
            const totalCards = player.deck.length + player.hand.length + player.discard.length;
            if (totalCards < 15) {
                if (game.coins >= 5)
                    game.buyCard("Market");
                else if (game.coins >= 4)
                    game.buyCard("Smithy");
                else if (game.coins >= 3)
                    game.buyCard("Village");
                else if (game.coins >= 3)
                    game.buyCard("Silver");
            }
            else {
                // Mid-Late game: Big Money
                if (game.coins >= 8)
                    game.buyCard("Province");
                else if (game.coins >= 6)
                    game.buyCard("Gold");
                else if (game.coins >= 5)
                    game.buyCard("Duchy"); // Start greening
                else if (game.coins >= 3)
                    game.buyCard("Silver");
            }
            game.nextPhase();
        }
    }
}
//# sourceMappingURL=bot.js.map