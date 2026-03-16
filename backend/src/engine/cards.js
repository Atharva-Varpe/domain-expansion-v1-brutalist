import { CardType } from "./card.js";
import { GameState } from "./game.js";
import { Player } from "./player.js";
export class CardFactory {
    static createCard(name) {
        switch (name) {
            // BASIC TREASURES
            case "Copper":
                return { id: "c1", name: "Copper", cost: 0, types: [CardType.Treasure], description: "1 Coin", value: 1 };
            case "Silver":
                return { id: "c2", name: "Silver", cost: 3, types: [CardType.Treasure], description: "2 Coins", value: 2 };
            case "Gold":
                return { id: "c3", name: "Gold", cost: 6, types: [CardType.Treasure], description: "3 Coins", value: 3 };
            // BASIC VICTORY
            case "Estate":
                return { id: "v1", name: "Estate", cost: 2, types: [CardType.Victory], description: "1 Victory Point", vp: 1 };
            case "Duchy":
                return { id: "v2", name: "Duchy", cost: 5, types: [CardType.Victory], description: "3 Victory Points", vp: 3 };
            case "Province":
                return { id: "v3", name: "Province", cost: 8, types: [CardType.Victory], description: "6 Victory Points", vp: 6 };
            case "Curse":
                return { id: "cu1", name: "Curse", cost: 0, types: [CardType.Curse], description: "-1 Victory Point", vp: -1 };
            // BASE SET (2nd Edition)
            case "Artisan":
                return {
                    id: "b11", name: "Artisan", cost: 6, types: [CardType.Action],
                    description: "Gain a card to your hand costing up to $5. Put a card from your hand onto your deck.",
                    execute: async (game, player) => {
                        const cardName = await game.requestInteraction({
                            type: "gain",
                            message: "Gain a card costing up to $5 to your hand",
                            source: "supply",
                            maxCards: 1,
                        });
                        if (cardName) {
                            const count = game.supply.get(cardName) || 0;
                            if (count > 0 && game.getCardCost(cardName) <= 5) {
                                game.supply.set(cardName, count - 1);
                                player.hand.push(CardFactory.createCard(cardName));
                            }
                        }
                        const index = await game.requestInteraction({
                            type: "choice",
                            message: "Put a card from your hand onto your deck",
                            source: "hand",
                        });
                        if (index !== undefined && player.hand[index]) {
                            player.deck.push(player.hand.splice(index, 1)[0]);
                        }
                    }
                };
            case "Bandit":
                return {
                    id: "b12", name: "Bandit", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "Gain a Gold. Each other player reveals the top 2 cards of their deck, trashes a Treasure other than Copper, and discards the rest.",
                    execute: async (game, player) => {
                        player.gainCard(CardFactory.createCard("Gold"));
                        const goldCount = game.supply.get("Gold") || 0;
                        if (goldCount > 0)
                            game.supply.set("Gold", goldCount - 1);
                        for (const otherPlayer of game.players) {
                            if (otherPlayer === player)
                                continue;
                            const revealed = [];
                            for (let i = 0; i < 2; i++) {
                                if (otherPlayer.deck.length === 0)
                                    otherPlayer.shuffleDiscardIntoDeck();
                                if (otherPlayer.deck.length > 0)
                                    revealed.push(otherPlayer.deck.pop());
                            }
                            let trashed = false;
                            const toDiscard = [];
                            for (const c of revealed) {
                                if (!trashed && c.types.includes(CardType.Treasure) && c.name !== "Copper") {
                                    game.trash.push(c);
                                    trashed = true;
                                }
                                else {
                                    toDiscard.push(c);
                                }
                            }
                            otherPlayer.discard.push(...toDiscard);
                        }
                    }
                };
            case "Bureaucrat":
                return {
                    id: "b13", name: "Bureaucrat", cost: 4, types: [CardType.Action, CardType.Attack],
                    description: "Gain a Silver onto your deck. Each other player reveals a Victory card from their hand and puts it onto their deck.",
                    execute: async (game, player) => {
                        const silverCount = game.supply.get("Silver") || 0;
                        if (silverCount > 0) {
                            game.supply.set("Silver", silverCount - 1);
                            player.deck.push(CardFactory.createCard("Silver"));
                        }
                        for (const otherPlayer of game.players) {
                            if (otherPlayer === player)
                                continue;
                            const victoryIndex = otherPlayer.hand.findIndex(c => c.types.includes(CardType.Victory));
                            if (victoryIndex !== -1) {
                                otherPlayer.deck.push(otherPlayer.hand.splice(victoryIndex, 1)[0]);
                            }
                        }
                    }
                };
            case "Cellar":
                return {
                    id: "b1", name: "Cellar", cost: 2, types: [CardType.Action],
                    description: "+1 Action. Discard any number of cards, then draw that many.",
                    execute: async (game, player) => {
                        game.actions += 1;
                        const indices = await game.requestInteraction({
                            type: "discard",
                            message: "Select cards to discard",
                            minCards: 0,
                            maxCards: player.hand.length,
                            source: "hand",
                        });
                        if (indices && indices.length > 0) {
                            indices.sort((a, b) => b - a).forEach((i) => {
                                player.discard.push(player.hand.splice(i, 1)[0]);
                            });
                            player.draw(indices.length);
                        }
                    }
                };
            case "Chapel":
                return {
                    id: "b2", name: "Chapel", cost: 2, types: [CardType.Action],
                    description: "Trash up to 4 cards from your hand.",
                    execute: async (game, player) => {
                        const indices = await game.requestInteraction({
                            type: "trash",
                            message: "Select up to 4 cards to trash",
                            minCards: 0,
                            maxCards: 4,
                            source: "hand",
                        });
                        if (indices && indices.length > 0) {
                            indices.sort((a, b) => b - a).forEach((i) => {
                                game.trash.push(player.hand.splice(i, 1)[0]);
                            });
                        }
                    }
                };
            case "Council Room":
                return {
                    id: "b9", name: "Council Room", cost: 5, types: [CardType.Action],
                    description: "+4 Cards, +1 Buy. Each other player draws a card.",
                    execute: async (game, player) => {
                        player.draw(4);
                        game.buys += 1;
                        game.players.forEach(p => { if (p !== player)
                            p.draw(1); });
                    }
                };
            case "Festival":
                return {
                    id: "b8", name: "Festival", cost: 5, types: [CardType.Action],
                    description: "+2 Actions, +1 Buy, +$2.",
                    execute: async (game, player) => {
                        game.actions += 2;
                        game.buys += 1;
                        game.coins += 2;
                    }
                };
            case "Gardens":
                return {
                    id: "b14", name: "Gardens", cost: 4, types: [CardType.Victory],
                    description: "Worth 1 VP per 10 cards you have (round down).",
                    // VP logic handled in Player.getVictoryPoints()
                };
            case "Harbinger":
                return {
                    id: "b15", name: "Harbinger", cost: 3, types: [CardType.Action],
                    description: "+1 Card, +1 Action. Look through your discard pile. You may put a card from it onto your deck.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        if (player.discard.length > 0) {
                            const index = await game.requestInteraction({
                                type: "choice",
                                message: "Select a card from discard to put on top of deck",
                                options: player.discard.map((c, i) => ({ text: c.name, value: i })),
                            });
                            if (index !== undefined) {
                                player.deck.push(player.discard.splice(index, 1)[0]);
                            }
                        }
                    }
                };
            case "Laboratory":
                return {
                    id: "b7", name: "Laboratory", cost: 5, types: [CardType.Action],
                    description: "+2 Cards, +1 Action.",
                    execute: async (game, player) => {
                        player.draw(2);
                        game.actions += 1;
                    }
                };
            case "Market":
                return {
                    id: "b6", name: "Market", cost: 5, types: [CardType.Action],
                    description: "+1 Card, +1 Action, +1 Buy, +$1.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        game.buys += 1;
                        game.coins += 1;
                    }
                };
            case "Merchant":
                return {
                    id: "b16", name: "Merchant", cost: 3, types: [CardType.Action],
                    description: "+1 Card, +1 Action. The first time you play a Silver this turn, +$1.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        game.merchantsPlayed = (game.merchantsPlayed || 0) + 1;
                    }
                };
            case "Militia":
                return {
                    id: "b5", name: "Militia", cost: 4, types: [CardType.Action, CardType.Attack],
                    description: "+$2. Each other player discards down to 3 cards.",
                    execute: async (game, player) => {
                        game.coins += 2;
                        for (const otherPlayer of game.players) {
                            if (otherPlayer !== player) {
                                while (otherPlayer.hand.length > 3) {
                                    otherPlayer.discard.push(otherPlayer.hand.pop());
                                }
                            }
                        }
                    }
                };
            case "Mine":
                return {
                    id: "b17", name: "Mine", cost: 5, types: [CardType.Action],
                    description: "Trash a Treasure from your hand. Gain a Treasure to your hand costing up to $3 more than it.",
                    execute: async (game, player) => {
                        const treasureIndices = player.hand.map((c, i) => c.types.includes(CardType.Treasure) ? i : -1).filter(i => i !== -1);
                        if (treasureIndices.length > 0) {
                            const indexResult = await game.requestInteraction({
                                type: "trash",
                                message: "Trash a Treasure",
                                minCards: 1,
                                maxCards: 1,
                                source: "hand",
                            });
                            if (indexResult && indexResult.length > 0) {
                                const trashedCard = player.hand.splice(indexResult[0], 1)[0];
                                game.trash.push(trashedCard);
                                const maxCost = trashedCard.cost + 3;
                                const cardName = await game.requestInteraction({
                                    type: "gain",
                                    message: `Gain a Treasure costing up to $${maxCost} to hand`,
                                    source: "supply",
                                });
                                if (cardName) {
                                    const count = game.supply.get(cardName) || 0;
                                    if (count > 0 && game.getCardCost(cardName) <= maxCost) {
                                        game.supply.set(cardName, count - 1);
                                        player.hand.push(CardFactory.createCard(cardName));
                                    }
                                }
                            }
                        }
                    }
                };
            case "Moat":
                return {
                    id: "b18", name: "Moat", cost: 2, types: [CardType.Action, CardType.Reaction],
                    description: "+2 Cards. Reaction: When another player plays an Attack card, you may reveal this to be unaffected.",
                    execute: async (game, player) => {
                        player.draw(2);
                    }
                };
            case "Moneylender":
                return {
                    id: "b19", name: "Moneylender", cost: 4, types: [CardType.Action],
                    description: "You may trash a Copper from your hand for +$3.",
                    execute: async (game, player) => {
                        const copperIndex = player.hand.findIndex(c => c.name === "Copper");
                        if (copperIndex !== -1) {
                            const trash = await game.requestInteraction({
                                type: "choice",
                                message: "Trash a Copper for +$3?",
                                options: [{ text: "Yes", value: true }, { text: "No", value: false }]
                            });
                            if (trash) {
                                game.trash.push(player.hand.splice(copperIndex, 1)[0]);
                                game.coins += 3;
                            }
                        }
                    }
                };
            case "Poacher":
                return {
                    id: "b20", name: "Poacher", cost: 4, types: [CardType.Action],
                    description: "+1 Card, +1 Action, +$1. Discard a card per empty Supply pile.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        game.coins += 1;
                        let emptyPiles = 0;
                        game.supply.forEach(count => { if (count === 0)
                            emptyPiles++; });
                        if (emptyPiles > 0) {
                            const indices = await game.requestInteraction({
                                type: "discard",
                                message: `Discard ${emptyPiles} cards`,
                                minCards: emptyPiles,
                                maxCards: emptyPiles,
                                source: "hand",
                            });
                            if (indices && indices.length > 0) {
                                indices.sort((a, b) => b - a).forEach((i) => {
                                    player.discard.push(player.hand.splice(i, 1)[0]);
                                });
                            }
                        }
                    }
                };
            case "Remodel":
                return {
                    id: "b21", name: "Remodel", cost: 4, types: [CardType.Action],
                    description: "Trash a card from your hand. Gain a card costing up to $2 more than it.",
                    execute: async (game, player) => {
                        if (player.hand.length > 0) {
                            const indexResult = await game.requestInteraction({
                                type: "trash",
                                message: "Trash a card to remodel",
                                minCards: 1,
                                maxCards: 1,
                                source: "hand",
                            });
                            if (indexResult && indexResult.length > 0) {
                                const trashedCard = player.hand.splice(indexResult[0], 1)[0];
                                game.trash.push(trashedCard);
                                const maxCost = trashedCard.cost + 2;
                                const cardName = await game.requestInteraction({
                                    type: "gain",
                                    message: `Gain a card costing up to $${maxCost}`,
                                    source: "supply",
                                });
                                if (cardName) {
                                    const count = game.supply.get(cardName) || 0;
                                    if (count > 0 && game.getCardCost(cardName) <= maxCost) {
                                        game.supply.set(cardName, count - 1);
                                        player.discard.push(CardFactory.createCard(cardName));
                                    }
                                }
                            }
                        }
                    }
                };
            case "Sentry":
                return {
                    id: "b22", name: "Sentry", cost: 5, types: [CardType.Action],
                    description: "+1 Card, +1 Action. Look at the top 2 cards of your deck. Trash and/or discard any number of them. Put the rest back in any order.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        const revealed = [];
                        for (let i = 0; i < 2; i++) {
                            if (player.deck.length === 0)
                                player.shuffleDiscardIntoDeck();
                            if (player.deck.length > 0)
                                revealed.push(player.deck.pop());
                        }
                        if (revealed.length === 0)
                            return;
                        for (const c of revealed) {
                            const choice = await game.requestInteraction({
                                type: "choice",
                                message: `Sentry: What to do with ${c.name}?`,
                                options: [
                                    { text: "Trash", value: "trash" },
                                    { text: "Discard", value: "discard" },
                                    { text: "Keep", value: "keep" },
                                ]
                            });
                            if (choice === "trash")
                                game.trash.push(c);
                            else if (choice === "discard")
                                player.discard.push(c);
                            else
                                player.deck.push(c);
                        }
                    }
                };
            case "Smithy":
                return {
                    id: "b4", name: "Smithy", cost: 4, types: [CardType.Action],
                    description: "+3 Cards.",
                    execute: async (game, player) => {
                        player.draw(3);
                    }
                };
            case "Throne Room":
                return {
                    id: "b23", name: "Throne Room", cost: 4, types: [CardType.Action],
                    description: "You may play an Action card from your hand twice.",
                    execute: async (game, player) => {
                        const actionIndices = player.hand.map((c, i) => c.types.includes(CardType.Action) ? i : -1).filter(i => i !== -1);
                        if (actionIndices.length > 0) {
                            const index = await game.requestInteraction({
                                type: "choice",
                                message: "Select an Action card to play twice",
                                options: actionIndices.map(i => ({ text: player.hand[i].name, value: i })),
                            });
                            if (index !== undefined) {
                                const card = player.hand.splice(index, 1)[0];
                                player.playArea.push(card);
                                if (card.execute) {
                                    await card.execute(game, player);
                                    await card.execute(game, player);
                                }
                            }
                        }
                    }
                };
            case "Vassal":
                return {
                    id: "b24", name: "Vassal", cost: 3, types: [CardType.Action],
                    description: "+$2. Discard the top card of your deck. If it's an Action card, you may play it.",
                    execute: async (game, player) => {
                        game.coins += 2;
                        if (player.deck.length === 0)
                            player.shuffleDiscardIntoDeck();
                        if (player.deck.length > 0) {
                            const topCard = player.deck.pop();
                            if (topCard.types.includes(CardType.Action)) {
                                const play = await game.requestInteraction({
                                    type: "choice",
                                    message: `Vassal: Play ${topCard.name}?`,
                                    options: [{ text: "Yes", value: true }, { text: "No", value: false }]
                                });
                                if (play) {
                                    player.playArea.push(topCard);
                                    if (topCard.execute)
                                        await topCard.execute(game, player);
                                }
                                else {
                                    player.discard.push(topCard);
                                }
                            }
                            else {
                                player.discard.push(topCard);
                            }
                        }
                    }
                };
            case "Village":
                return {
                    id: "b3", name: "Village", cost: 3, types: [CardType.Action],
                    description: "+1 Card, +2 Actions.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 2;
                    }
                };
            case "Witch":
                return {
                    id: "b10", name: "Witch", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "+2 Cards. Each other player gains a Curse.",
                    execute: async (game, player) => {
                        player.draw(2);
                        game.players.forEach(p => {
                            if (p !== player) {
                                const count = game.supply.get("Curse") || 0;
                                if (count > 0) {
                                    game.supply.set("Curse", count - 1);
                                    p.discard.push(CardFactory.createCard("Curse"));
                                }
                            }
                        });
                    }
                };
            case "Workshop":
                return {
                    id: "b25", name: "Workshop", cost: 3, types: [CardType.Action],
                    description: "Gain a card costing up to $4.",
                    execute: async (game, player) => {
                        const cardName = await game.requestInteraction({
                            type: "gain",
                            message: "Gain a card costing up to $4",
                            source: "supply",
                        });
                        if (cardName) {
                            const count = game.supply.get(cardName) || 0;
                            if (count > 0 && game.getCardCost(cardName) <= 4) {
                                game.supply.set(cardName, count - 1);
                                player.discard.push(CardFactory.createCard(cardName));
                            }
                        }
                    }
                };
            // INTRIGUE SET
            case "Baron":
                return {
                    id: "i10", name: "Baron", cost: 4, types: [CardType.Action],
                    description: "+1 Buy. You may discard an Estate for +$4. If you don't, gain an Estate.",
                    execute: async (game, player) => {
                        game.buys += 1;
                        const estateIndex = player.hand.findIndex(c => c.name === "Estate");
                        if (estateIndex !== -1) {
                            const discard = await game.requestInteraction({
                                type: "choice",
                                message: "Discard an Estate for +$4?",
                                options: [{ text: "Yes", value: true }, { text: "No", value: false }]
                            });
                            if (discard) {
                                player.discard.push(player.hand.splice(estateIndex, 1)[0]);
                                game.coins += 4;
                                return;
                            }
                        }
                        const count = game.supply.get("Estate") || 0;
                        if (count > 0) {
                            game.supply.set("Estate", count - 1);
                            player.discard.push(CardFactory.createCard("Estate"));
                        }
                    }
                };
            case "Bridge":
                return {
                    id: "i11", name: "Bridge", cost: 4, types: [CardType.Action],
                    description: "+1 Buy, +$1. Cards cost $1 less this turn.",
                    execute: async (game, player) => {
                        game.buys += 1;
                        game.coins += 1;
                        game.costReduction += 1;
                    }
                };
            case "Conspirator":
                return {
                    id: "i12", name: "Conspirator", cost: 4, types: [CardType.Action],
                    description: "+$2. If you've played 3 or more Actions this turn, +1 Card and +1 Action.",
                    execute: async (game, player) => {
                        game.coins += 2;
                        const actionsPlayed = player.playArea.filter(c => c.types.includes(CardType.Action)).length;
                        if (actionsPlayed >= 3) {
                            player.draw(1);
                            game.actions += 1;
                        }
                    }
                };
            case "Courtier":
                return {
                    id: "i13", name: "Courtier", cost: 5, types: [CardType.Action],
                    description: "Reveal a card from your hand. For each type it has, choose one: +1 Action; +1 Buy; +$3; or gain a Gold.",
                    execute: async (game, player) => {
                        if (player.hand.length === 0)
                            return;
                        const index = await game.requestInteraction({
                            type: "choice",
                            message: "Reveal a card for Courtier",
                            options: player.hand.map((c, i) => ({ text: c.name, value: i }))
                        });
                        if (index !== undefined) {
                            const card = player.hand[index];
                            if (!card)
                                return;
                            const numChoices = card.types.length;
                            const choices = [];
                            const options = [
                                { text: "+1 Action", value: "action" },
                                { text: "+1 Buy", value: "buy" },
                                { text: "+$3", value: "coin" },
                                { text: "Gain Gold", value: "gold" },
                            ];
                            for (let i = 0; i < numChoices; i++) {
                                const choice = await game.requestInteraction({
                                    type: "choice",
                                    message: `Courtier Choice ${i + 1}/${numChoices}`,
                                    options: options.filter(o => !choices.includes(o.value))
                                });
                                choices.push(choice);
                                if (choice === "action")
                                    game.actions += 1;
                                else if (choice === "buy")
                                    game.buys += 1;
                                else if (choice === "coin")
                                    game.coins += 3;
                                else if (choice === "gold") {
                                    const count = game.supply.get("Gold") || 0;
                                    if (count > 0) {
                                        game.supply.set("Gold", count - 1);
                                        player.discard.push(CardFactory.createCard("Gold"));
                                    }
                                }
                            }
                        }
                    }
                };
            case "Courtyard":
                return {
                    id: "i14", name: "Courtyard", cost: 2, types: [CardType.Action],
                    description: "+3 Cards. Put a card from your hand onto your deck.",
                    execute: async (game, player) => {
                        player.draw(3);
                        const index = await game.requestInteraction({
                            type: "choice",
                            message: "Put a card from hand onto deck",
                            source: "hand",
                        });
                        if (index !== undefined && player.hand[index]) {
                            player.deck.push(player.hand.splice(index, 1)[0]);
                        }
                    }
                };
            case "Diplomat":
                return {
                    id: "i15", name: "Diplomat", cost: 4, types: [CardType.Action, CardType.Reaction],
                    description: "+2 Cards. If you have 5 or fewer cards in hand, +2 Actions. Reaction: Reveal when an Attack is played if you have 5+ cards.",
                    execute: async (game, player) => {
                        player.draw(2);
                        if (player.hand.length <= 5)
                            game.actions += 2;
                    }
                };
            case "Duke":
                return {
                    id: "i16", name: "Duke", cost: 5, types: [CardType.Victory],
                    description: "Worth 1 VP per Duchy you have.",
                };
            case "Harem":
                return {
                    id: "i17", name: "Harem", cost: 6, types: [CardType.Treasure, CardType.Victory],
                    description: "+$2, 2 VP.",
                    value: 2,
                    vp: 2,
                };
            case "Ironworks":
                return {
                    id: "i18", name: "Ironworks", cost: 4, types: [CardType.Action],
                    description: "Gain a card costing up to $4. If it's an Action, +1 Action; Treasure, +$1; Victory, +1 Card.",
                    execute: async (game, player) => {
                        const cardName = await game.requestInteraction({
                            type: "gain",
                            message: "Gain a card up to $4",
                            source: "supply",
                        });
                        if (cardName) {
                            const cost = game.getCardCost(cardName);
                            if (cost <= 4) {
                                const count = game.supply.get(cardName) || 0;
                                if (count > 0) {
                                    game.supply.set(cardName, count - 1);
                                    const card = CardFactory.createCard(cardName);
                                    player.discard.push(card);
                                    if (card.types.includes(CardType.Action))
                                        game.actions += 1;
                                    if (card.types.includes(CardType.Treasure))
                                        game.coins += 1;
                                    if (card.types.includes(CardType.Victory))
                                        player.draw(1);
                                }
                            }
                        }
                    }
                };
            case "Lurker":
                return {
                    id: "i19", name: "Lurker", cost: 2, types: [CardType.Action],
                    description: "+1 Action. Choose one: Trash an Action card from the Supply; or gain an Action card from the trash.",
                    execute: async (game, player) => {
                        game.actions += 1;
                        const choice = await game.requestInteraction({
                            type: "choice",
                            message: "Lurker Choice",
                            options: [
                                { text: "Trash Action from Supply", value: "trash" },
                                { text: "Gain Action from Trash", value: "gain" }
                            ]
                        });
                        if (choice === "trash") {
                            const cardName = await game.requestInteraction({
                                type: "choice",
                                message: "Select Action to trash from Supply",
                                options: Array.from(game.supply.keys()).filter(name => {
                                    const c = CardFactory.createCard(name);
                                    return c.types.includes(CardType.Action) && (game.supply.get(name) || 0) > 0;
                                }).map(name => ({ text: name, value: name }))
                            });
                            if (cardName) {
                                game.supply.set(cardName, (game.supply.get(cardName) || 1) - 1);
                                game.trash.push(CardFactory.createCard(cardName));
                            }
                        }
                        else {
                            const actionTrashIndices = game.trash.map((c, i) => c.types.includes(CardType.Action) ? i : -1).filter(i => i !== -1);
                            if (actionTrashIndices.length > 0) {
                                const index = await game.requestInteraction({
                                    type: "choice",
                                    message: "Select Action to gain from Trash",
                                    options: actionTrashIndices.map(i => ({ text: game.trash[i].name, value: i }))
                                });
                                if (index !== undefined) {
                                    player.discard.push(game.trash.splice(index, 1)[0]);
                                }
                            }
                        }
                    }
                };
            case "Masquerade":
                return {
                    id: "i20", name: "Masquerade", cost: 3, types: [CardType.Action],
                    description: "+2 Cards. Players pass cards. You may trash a card.",
                    execute: async (game, player) => {
                        player.draw(2);
                        const indices = [];
                        for (const p of game.players) {
                            if (p.hand.length > 0) {
                                indices.push(0);
                            }
                            else {
                                indices.push(-1);
                            }
                        }
                        const passedCards = game.players.map((p, i) => indices[i] !== -1 ? p.hand.splice(indices[i], 1)[0] : null);
                        game.players.forEach((p, i) => {
                            const nextIdx = (i + 1) % game.players.length;
                            const card = passedCards[i];
                            if (card)
                                game.players[nextIdx].hand.push(card);
                        });
                        const trashIdx = await game.requestInteraction({
                            type: "trash",
                            message: "Masquerade: You may trash a card",
                            minCards: 0,
                            maxCards: 1,
                            source: "hand",
                        });
                        if (trashIdx && trashIdx.length > 0) {
                            game.trash.push(player.hand.splice(trashIdx[0], 1)[0]);
                        }
                    }
                };
            case "Mill":
                return {
                    id: "i21", name: "Mill", cost: 4, types: [CardType.Action, CardType.Victory],
                    description: "1 VP. +1 Card, +1 Action. You may discard 2 cards for +$2.",
                    vp: 1,
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        const discardResult = await game.requestInteraction({
                            type: "discard",
                            message: "Discard 2 cards for +$2?",
                            minCards: 0,
                            maxCards: 2,
                            source: "hand",
                        });
                        if (discardResult && discardResult.length === 2) {
                            discardResult.sort((a, b) => b - a).forEach((i) => player.discard.push(player.hand.splice(i, 1)[0]));
                            game.coins += 2;
                        }
                    }
                };
            case "Mining Village":
                return {
                    id: "i22", name: "Mining Village", cost: 4, types: [CardType.Action],
                    description: "+1 Card, +2 Actions. You may trash this for +$2.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 2;
                        const trashSelf = await game.requestInteraction({
                            type: "choice",
                            message: "Trash Mining Village for +$2?",
                            options: [{ text: "Yes", value: true }, { text: "No", value: false }]
                        });
                        if (trashSelf) {
                            const idx = player.playArea.findIndex(c => c.name === "Mining Village");
                            if (idx !== -1) {
                                game.trash.push(player.playArea.splice(idx, 1)[0]);
                                game.coins += 2;
                            }
                        }
                    }
                };
            case "Minion":
                return {
                    id: "i23", name: "Minion", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "+1 Action. Choose one: +$2; or discard hand, +4 Cards, and others discard/draw if 5+ cards.",
                    execute: async (game, player) => {
                        game.actions += 1;
                        const choice = await game.requestInteraction({
                            type: "choice",
                            message: "Minion Choice",
                            options: [{ text: "+$2", value: "money" }, { text: "Discard & Draw 4", value: "draw" }]
                        });
                        if (choice === "money") {
                            game.coins += 2;
                        }
                        else {
                            player.discardHand();
                            player.draw(4);
                            for (const otherPlayer of game.players) {
                                if (otherPlayer !== player && otherPlayer.hand.length >= 5) {
                                    otherPlayer.discardHand();
                                    otherPlayer.draw(4);
                                }
                            }
                        }
                    }
                };
            case "Nobles":
                return {
                    id: "i6", name: "Nobles", cost: 6, types: [CardType.Action, CardType.Victory],
                    description: "Choose one: +3 Cards; or +2 Actions. 2 VP",
                    vp: 2,
                    execute: async (game, player) => {
                        const choice = await game.requestInteraction({
                            type: "choice",
                            message: "Choose one",
                            options: [
                                { text: "+3 Cards", value: "cards" },
                                { text: "+2 Actions", value: "actions" },
                            ],
                        });
                        if (choice === "cards")
                            player.draw(3);
                        else if (choice === "actions")
                            game.actions += 2;
                    },
                };
            case "Patrol":
                return {
                    id: "i24", name: "Patrol", cost: 5, types: [CardType.Action],
                    description: "+3 Cards. Reveal top 4 cards, put Victory/Curses in hand, rest on top.",
                    execute: async (game, player) => {
                        player.draw(3);
                        const revealed = [];
                        for (let i = 0; i < 4; i++) {
                            if (player.deck.length === 0)
                                player.shuffleDiscardIntoDeck();
                            if (player.deck.length > 0)
                                revealed.push(player.deck.pop());
                        }
                        const victory = revealed.filter(c => c.types.includes(CardType.Victory) || c.types.includes(CardType.Curse));
                        const rest = revealed.filter(c => !c.types.includes(CardType.Victory) && !c.types.includes(CardType.Curse));
                        player.hand.push(...victory);
                        player.deck.push(...rest);
                    }
                };
            case "Pawn":
                return {
                    id: "i1", name: "Pawn", cost: 2, types: [CardType.Action],
                    description: "Choose two: +1 Card; +1 Action; +1 Buy; +1 Coin. (Must be different)",
                    execute: async (game, player) => {
                        const options = [
                            { text: "+1 Card", value: "card" },
                            { text: "+1 Action", value: "action" },
                            { text: "+1 Buy", value: "buy" },
                            { text: "+1 Coin", value: "coin" },
                        ];
                        const choices = [];
                        for (let i = 0; i < 2; i++) {
                            const choice = await game.requestInteraction({
                                type: "choice",
                                message: `Pawn Choice ${i + 1}/2`,
                                options: options.filter(o => !choices.includes(o.value))
                            });
                            choices.push(choice);
                            if (choice === "card")
                                player.draw(1);
                            if (choice === "action")
                                game.actions += 1;
                            if (choice === "buy")
                                game.buys += 1;
                            if (choice === "coin")
                                game.coins += 1;
                        }
                    },
                };
            case "Replace":
                return {
                    id: "i25", name: "Replace", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "Trash a card. Gain one costing up to $2 more. Victory: others gain Curse.",
                    execute: async (game, player) => {
                        const trashIdx = await game.requestInteraction({
                            type: "trash",
                            message: "Replace: Trash a card",
                            minCards: 1, maxCards: 1, source: "hand"
                        });
                        if (trashIdx && trashIdx.length > 0) {
                            const trashed = player.hand.splice(trashIdx[0], 1)[0];
                            if (!trashed)
                                return;
                            game.trash.push(trashed);
                            const maxCost = trashed.cost + 2;
                            const gainName = await game.requestInteraction({
                                type: "gain",
                                message: `Gain up to $${maxCost}`,
                                source: "supply"
                            });
                            if (gainName) {
                                const card = CardFactory.createCard(gainName);
                                if (card.types.includes(CardType.Victory)) {
                                    player.discard.push(card);
                                    for (const p of game.players) {
                                        if (p !== player) {
                                            const count = game.supply.get("Curse") || 0;
                                            if (count > 0) {
                                                game.supply.set("Curse", count - 1);
                                                p.discard.push(CardFactory.createCard("Curse"));
                                            }
                                        }
                                    }
                                }
                                else {
                                    player.deck.push(card);
                                }
                                game.supply.set(gainName, (game.supply.get(gainName) || 1) - 1);
                            }
                        }
                    }
                };
            case "Secret Passage":
                return {
                    id: "i26", name: "Secret Passage", cost: 4, types: [CardType.Action],
                    description: "+2 Cards, +1 Action. Put a card from hand anywhere in deck.",
                    execute: async (game, player) => {
                        player.draw(2);
                        game.actions += 1;
                        const idx = await game.requestInteraction({
                            type: "choice",
                            message: "Put card in deck",
                            source: "hand"
                        });
                        if (idx !== undefined) {
                            const card = player.hand.splice(idx, 1)[0];
                            if (card)
                                player.deck.unshift(card);
                        }
                    }
                };
            case "Shanty Town":
                return {
                    id: "i27", name: "Shanty Town", cost: 3, types: [CardType.Action],
                    description: "+2 Actions. Reveal hand, if no Actions, +2 Cards.",
                    execute: async (game, player) => {
                        game.actions += 2;
                        if (!player.hand.some(c => c.types.includes(CardType.Action))) {
                            player.draw(2);
                        }
                    }
                };
            case "Slums":
                return {
                    id: "i28", name: "Slums", cost: 2, types: [CardType.Action],
                    description: "+2 Cards, +1 Action.",
                    execute: async (game, player) => {
                        player.draw(2);
                        game.actions += 1;
                    }
                };
            case "Steward":
                return {
                    id: "i4", name: "Steward", cost: 3, types: [CardType.Action],
                    description: "Choose one: +2 Cards; or +$2; or trash 2 cards from your hand.",
                    execute: async (game, player) => {
                        const choice = await game.requestInteraction({
                            type: "choice",
                            message: "Choose one",
                            options: [
                                { text: "+2 Cards", value: "cards" },
                                { text: "+$2", value: "coins" },
                                { text: "Trash 2 Cards", value: "trash" },
                            ],
                        });
                        if (choice === "cards")
                            player.draw(2);
                        else if (choice === "coins")
                            game.coins += 2;
                        else if (choice === "trash") {
                            const indices = await game.requestInteraction({
                                type: "trash",
                                message: "Select 2 cards to trash",
                                minCards: 2,
                                maxCards: 2,
                                source: "hand",
                            });
                            if (indices && indices.length === 2) {
                                indices.sort((a, b) => b - a).forEach((i) => {
                                    game.trash.push(player.hand.splice(i, 1)[0]);
                                });
                            }
                        }
                    },
                };
            case "Swindler":
                return {
                    id: "i29", name: "Swindler", cost: 3, types: [CardType.Action, CardType.Attack],
                    description: "+$2. Others trash top card, you choose replacement of same cost.",
                    execute: async (game, player) => {
                        game.coins += 2;
                        for (const otherPlayer of game.players) {
                            if (otherPlayer === player)
                                continue;
                            if (otherPlayer.deck.length === 0)
                                otherPlayer.shuffleDiscardIntoDeck();
                            if (otherPlayer.deck.length > 0) {
                                const trashed = otherPlayer.deck.pop();
                                game.trash.push(trashed);
                                const options = Array.from(game.supply.keys()).filter(n => CardFactory.createCard(n).cost === trashed.cost);
                                if (options.length > 0 && options[0]) {
                                    otherPlayer.discard.push(CardFactory.createCard(options[0]));
                                    game.supply.set(options[0], (game.supply.get(options[0]) || 1) - 1);
                                }
                            }
                        }
                    }
                };
            case "Torturer":
                return {
                    id: "i30", name: "Torturer", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "+3 Cards. Others choose: discard 2 or gain Curse to hand.",
                    execute: async (game, player) => {
                        player.draw(3);
                        for (const p of game.players) {
                            if (p === player)
                                continue;
                            const choice = await game.requestInteraction({
                                type: "choice",
                                message: "Torturer: Discard 2 or gain Curse to hand?",
                                options: [{ text: "Discard 2", value: "discard" }, { text: "Gain Curse", value: "curse" }]
                            });
                            if (choice === "discard") {
                                const idxResult = await game.requestInteraction({
                                    type: "discard", message: "Discard 2", minCards: 2, maxCards: 2, source: "hand"
                                });
                                if (idxResult)
                                    idxResult.sort((a, b) => b - a).forEach((i) => p.discard.push(p.hand.splice(i, 1)[0]));
                            }
                            else {
                                const count = game.supply.get("Curse") || 0;
                                if (count > 0) {
                                    game.supply.set("Curse", count - 1);
                                    p.hand.push(CardFactory.createCard("Curse"));
                                }
                            }
                        }
                    }
                };
            case "Trading Post":
                return {
                    id: "i31", name: "Trading Post", cost: 5, types: [CardType.Action],
                    description: "Trash 2 cards from hand. If you do, gain a Silver to hand.",
                    execute: async (game, player) => {
                        const idxResult = await game.requestInteraction({
                            type: "trash", message: "Trash 2 cards", minCards: 2, maxCards: 2, source: "hand"
                        });
                        if (idxResult && idxResult.length === 2) {
                            idxResult.sort((a, b) => b - a).forEach((i) => game.trash.push(player.hand.splice(i, 1)[0]));
                            player.hand.push(CardFactory.createCard("Silver"));
                            game.supply.set("Silver", (game.supply.get("Silver") || 1) - 1);
                        }
                    }
                };
            case "Upgrade":
                return {
                    id: "i32", name: "Upgrade", cost: 5, types: [CardType.Action],
                    description: "+1 Card, +1 Action. Trash a card, gain one costing exactly $1 more.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        const idxResult = await game.requestInteraction({
                            type: "trash", message: "Upgrade: Trash a card", minCards: 1, maxCards: 1, source: "hand"
                        });
                        if (idxResult && idxResult.length > 0) {
                            const trashed = player.hand.splice(idxResult[0], 1)[0];
                            if (!trashed)
                                return;
                            game.trash.push(trashed);
                            const targetCost = trashed.cost + 1;
                            const options = Array.from(game.supply.keys()).filter(n => CardFactory.createCard(n).cost === targetCost);
                            if (options.length > 0 && options[0]) {
                                player.discard.push(CardFactory.createCard(options[0]));
                                game.supply.set(options[0], (game.supply.get(options[0]) || 1) - 1);
                            }
                        }
                    }
                };
            case "Wishing Well":
                return {
                    id: "i33", name: "Wishing Well", cost: 3, types: [CardType.Action],
                    description: "+1 Card, +1 Action. Name a card, reveal top; if it matches, to hand.",
                    execute: async (game, player) => {
                        player.draw(1);
                        game.actions += 1;
                        const guess = await game.requestInteraction({
                            type: "choice",
                            message: "Wishing Well: Name a card",
                            options: Array.from(game.supply.keys()).map(n => ({ text: n, value: n }))
                        });
                        if (player.deck.length === 0)
                            player.shuffleDiscardIntoDeck();
                        if (player.deck.length > 0) {
                            const card = player.deck.pop();
                            if (card.name === guess)
                                player.hand.push(card);
                            else
                                player.discard.push(card);
                        }
                    }
                };
            // FALLBACK
            default:
                return {
                    id: "fallback",
                    name: name,
                    cost: 4,
                    types: [CardType.Action],
                    description: "Generic Action Card Implementation Pending.",
                    execute: async (game, player) => {
                        game.actions += 1;
                        player.draw(1);
                    }
                };
        }
    }
}
//# sourceMappingURL=cards.js.map