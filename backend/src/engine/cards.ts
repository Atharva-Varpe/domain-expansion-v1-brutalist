import { CardType, type Card } from "./card.js";
import type { GameState } from "./game.js";
import type { Player } from "./player.js";

export class CardFactory {
  static createCard(name: string): Card {
    switch (name) {
      // BASIC TREASURES
      case "Copper":
        return { id: "t1", name: "Copper", cost: 0, types: [CardType.Treasure], description: "+$1", value: 1 };
      case "Silver":
        return { id: "t2", name: "Silver", cost: 3, types: [CardType.Treasure], description: "+$2", value: 2 };
      case "Gold":
        return { id: "t3", name: "Gold", cost: 6, types: [CardType.Treasure], description: "+$3", value: 3 };

      // BASIC VICTORY
      case "Estate":
        return { id: "v1", name: "Estate", cost: 2, types: [CardType.Victory], description: "1 VP", vp: 1 };
      case "Duchy":
        return { id: "v2", name: "Duchy", cost: 5, types: [CardType.Victory], description: "3 VP", vp: 3 };
      case "Province":
        return { id: "v3", name: "Province", cost: 8, types: [CardType.Victory], description: "6 VP", vp: 6 };
      case "Curse":
        return { id: "c1", name: "Curse", cost: 0, types: [CardType.Curse], description: "-1 VP", vp: -1 };

      // KINGDOM CARDS - BASE SET
      case "Cellar":
        return {
          id: "b1", name: "Cellar", cost: 2, types: [CardType.Action],
          description: "+1 Action. Discard any number of cards, then draw that many.",
          execute: async (game, player) => {
            game.actions += 1;
            const indices = await game.requestInteraction({
              type: "discard", message: "CELLAR: SELECT OBJECTS TO DISCARD",
              minCards: 0, maxCards: player.hand.length, source: "hand"
            });
            if (indices && indices.length > 0) {
              indices.sort((a:number, b:number) => b-a).forEach((idx:number) => player.discard.push(player.hand.splice(idx, 1)[0]!));
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
              type: "trash", message: "CHAPEL: SELECT UP TO 4 OBJECTS TO TRASH",
              minCards: 0, maxCards: 4, source: "hand"
            });
            if (indices && indices.length > 0) {
              indices.sort((a:number, b:number) => b-a).forEach((idx:number) => game.trash.push(player.hand.splice(idx, 1)[0]!));
            }
          }
        };
      case "Moat":
        return {
            id: "b3", name: "Moat", cost: 2, types: [CardType.Action, CardType.Reaction],
            description: "+2 Cards. When another player plays an Attack card, you may reveal this from your hand to be unaffected by it.",
            execute: async (game, player) => { player.draw(2); }
        };
      case "Harbinger":
        return {
            id: "b4", name: "Harbinger", cost: 3, types: [CardType.Action],
            description: "+1 Card, +1 Action. Look through your discard pile. You may put a card from it onto your deck.",
            execute: async (game, player) => {
                player.draw(1);
                game.actions += 1;
                if (player.discard.length > 0) {
                    const idx = await game.requestInteraction({
                        type: "choice", message: "HARBINGER: SELECT OBJECT FROM DISCARD TO TOPDECK",
                        options: player.discard.map((c: Card, i: number) => ({ text: c.name, value: i })),
                        source: "discard"
                    });
                    if (idx !== null) {
                        player.deck.push(player.discard.splice(idx, 1)[0]!);
                    }
                }
            }
        };
      case "Merchant":
        return {
            id: "b5", name: "Merchant", cost: 3, types: [CardType.Action],
            description: "+1 Card, +1 Action. The first time you play a Silver this turn, +$1.",
            execute: async (game, player) => { 
                player.draw(1); 
                game.actions += 1; 
                game.merchantsPlayedThisTurn = (game.merchantsPlayedThisTurn || 0) + 1;
            }
        };
      case "Vassal":
        return {
            id: "b6", name: "Vassal", cost: 3, types: [CardType.Action],
            description: "+$2. Discard the top card of your deck. If it's an Action card, you may play it.",
            execute: async (game, player) => {
                game.coins += 2;
                const drawn = player.draw(1)[0];
                if (drawn) {
                    player.hand.pop(); // Take it back out of hand immediately
                    if (drawn.types.includes(CardType.Action)) {
                        const play = await game.requestInteraction({
                            type: "choice", message: `VASSAL: PLAY ${drawn.name.toUpperCase()}?`,
                            options: [{ text: "YES", value: true }, { text: "NO", value: false }]
                        });
                        if (play) {
                            player.playArea.push(drawn);
                            if (drawn.execute) await drawn.execute(game, player);
                        } else {
                            player.discard.push(drawn);
                        }
                    } else {
                        player.discard.push(drawn);
                    }
                }
            }
        };
      case "Village":
        return {
            id: "b7", name: "Village", cost: 3, types: [CardType.Action],
            description: "+1 Card, +2 Actions.",
            execute: async (game, player) => { player.draw(1); game.actions += 2; }
        };
      case "Workshop":
        return {
            id: "b8", name: "Workshop", cost: 3, types: [CardType.Action],
            description: "Gain a card costing up to $4.",
            execute: async (game, player) => {
                const cardName = await game.requestInteraction({
                    type: "gain", message: "WORKSHOP: GAIN OBJECT COSTING UP TO $4",
                    source: "supply", maxCards: 1 // Logic handled by frontend filter usually
                });
                if (cardName && game.getCardCost(cardName) <= 4) {
                    game.supply.set(cardName, game.supply.get(cardName)! - 1);
                    player.gainCard(CardFactory.createCard(cardName));
                }
            }
        };
      case "Bureaucrat":
        return {
            id: "b9", name: "Bureaucrat", cost: 4, types: [CardType.Action, CardType.Attack],
            description: "Gain a Silver onto your deck. Each other player reveals a Victory card from their hand and puts it onto their deck (or reveals a hand with no Victory cards).",
            execute: async (game, player) => {
                if (game.supply.get("Silver")! > 0) {
                    game.supply.set("Silver", game.supply.get("Silver")! - 1);
                    player.deck.push(CardFactory.createCard("Silver"));
                }
                await game.resolveAttack(player, async (victim: Player, victimIndex: number) => {
                    const victoryIndices = victim.hand.map((c: Card, i: number) => c.types.includes(CardType.Victory) ? i : -1).filter((i: number) => i !== -1);
                    if (victoryIndices.length > 0) {
                        const idx = await game.requestInteraction({
                            type: "choice", message: "BUREAUCRAT: SELECT VICTORY NODE TO TOPDECK",
                            options: victoryIndices.map((i: number) => ({ text: victim.hand[i]!.name, value: i }))
                        }, victimIndex);
                        if (idx !== null) {
                            victim.deck.push(victim.hand.splice(idx, 1)[0]!);
                        }
                    }
                });
            }
        };
      case "Gardens":
        return { id: "b10", name: "Gardens", cost: 4, types: [CardType.Victory], description: "Worth 1 VP for every 10 cards in your deck (rounded down).", vp: 0 };
      case "Militia":
        return {
            id: "b11", name: "Militia", cost: 4, types: [CardType.Action, CardType.Attack],
            description: "+$2. Each other player discards down to 3 cards.",
            execute: async (game, player) => {
                game.coins += 2;
                await game.resolveAttack(player, async (victim: Player, victimIndex: number) => {
                    if (victim.hand.length > 3) {
                        const toDiscard = victim.hand.length - 3;
                        const indices = await game.requestInteraction({
                            type: "discard", message: `MILITIA: DISCARD ${toDiscard} NODES`,
                            minCards: toDiscard, maxCards: toDiscard, source: "hand"
                        }, victimIndex);
                        if (indices) {
                            indices.sort((a:number, b:number) => b-a).forEach((idx:number) => victim.discard.push(victim.hand.splice(idx, 1)[0]!));
                        }
                    }
                });
            }
        };
      case "Moneylender":
        return {
            id: "b12", name: "Moneylender", cost: 4, types: [CardType.Action],
            description: "You may trash a Copper from your hand for +$3.",
            execute: async (game, player) => {
                const copperIdx = player.hand.findIndex((c: Card) => c.name === "Copper");
                if (copperIdx !== -1) {
                    const trash = await game.requestInteraction({
                        type: "choice", message: "MONEYLENDER: TRASH COPPER FOR +$3?",
                        options: [{ text: "YES", value: true }, { text: "NO", value: false }]
                    });
                    if (trash) {
                        game.trash.push(player.hand.splice(copperIdx, 1)[0]!);
                        game.coins += 3;
                    }
                }
            }
        };
      case "Poacher":
        return {
            id: "b13", name: "Poacher", cost: 4, types: [CardType.Action],
            description: "+1 Card, +1 Action, +$1. Discard a card per empty Supply pile.",
            execute: async (game, player) => {
                player.draw(1); game.actions += 1; game.coins += 1;
                let emptyPiles = 0;
                game.supply.forEach((count: number) => { if (count === 0) emptyPiles++; });
                if (emptyPiles > 0) {
                    const indices = await game.requestInteraction({
                        type: "discard", message: `POACHER: DISCARD ${emptyPiles} OBJECTS`,
                        minCards: Math.min(emptyPiles, player.hand.length), 
                        maxCards: Math.min(emptyPiles, player.hand.length), 
                        source: "hand"
                    });
                    if (indices) {
                        indices.sort((a:number, b:number) => b-a).forEach((idx:number) => player.discard.push(player.hand.splice(idx, 1)[0]!));
                    }
                }
            }
        };
      case "Remodel":
        return {
            id: "b14", name: "Remodel", cost: 4, types: [CardType.Action],
            description: "Trash a card from your hand. Gain a card costing up to $2 more than it.",
            execute: async (game, player) => {
                const trashIdx = await game.requestInteraction({
                    type: "choice", message: "REMODEL: SELECT OBJECT TO TRASH",
                    options: player.hand.map((c: Card, i: number) => ({ text: c.name, value: i }))
                });
                if (trashIdx !== null) {
                    const trashed = player.hand.splice(trashIdx, 1)[0]!;
                    const maxCost = trashed.cost + 2;
                    game.trash.push(trashed);
                    const gainName = await game.requestInteraction({
                        type: "gain", message: `REMODEL: GAIN OBJECT COSTING UP TO $${maxCost}`,
                        source: "supply"
                    });
                    if (gainName && game.getCardCost(gainName) <= maxCost) {
                        game.supply.set(gainName, game.supply.get(gainName)! - 1);
                        player.gainCard(CardFactory.createCard(gainName as string));
                    }
                }
            }
        };
      case "Smithy":
        return {
          id: "b15", name: "Smithy", cost: 4, types: [CardType.Action],
          description: "+3 Cards.",
          execute: async (game, player) => { player.draw(3); }
        };
      case "Throne Room":
        return {
            id: "b16", name: "Throne Room", cost: 4, types: [CardType.Action],
            description: "You may play an Action card from your hand twice.",
            execute: async (game, player) => {
                const actions = player.hand.map((c: Card, i: number) => c.types.includes(CardType.Action) ? i : -1).filter((i: number) => i !== -1);
                if (actions.length > 0) {
                    const idx = await game.requestInteraction({
                        type: "choice", message: "THRONE ROOM: SELECT ACTION TO EXECUTE TWICE",
                        options: actions.map((i: number) => ({ text: player.hand[i]!.name, value: i }))
                    });
                    if (idx !== null) {
                        const card = player.hand.splice(idx, 1)[0]!;
                        player.playArea.push(card);
                        if (card.execute) {
                            await card.execute(game, player);
                            await card.execute(game, player);
                        }
                    }
                }
            }
        };
      case "Bandit":
        return {
            id: "b17", name: "Bandit", cost: 5, types: [CardType.Action, CardType.Attack],
            description: "Gain a Gold. Each other player reveals the top 2 cards of their deck, trashes a revealed Treasure other than Copper, and discards the rest.",
            execute: async (game, player) => {
                if (game.supply.get("Gold")! > 0) {
                    game.supply.set("Gold", game.supply.get("Gold")! - 1);
                    player.gainCard(CardFactory.createCard("Gold"));
                }
                await game.resolveAttack(player, async (victim: Player, victimIndex: number) => {
                    const revealed = victim.draw(2);
                    victim.hand.splice(victim.hand.length - revealed.length, revealed.length); // Take back out of hand
                    const treasures = revealed.filter((c: Card) => c.types.includes(CardType.Treasure) && c.name !== "Copper");
                    if (treasures.length > 0) {
                        // Logic: trash one of them. For simplicity, trash the most expensive.
                        treasures.sort((a: Card, b: Card) => b.cost - a.cost);
                        const trashed = treasures[0]!;
                        game.trash.push(trashed);
                        revealed.filter((c: Card) => c !== trashed).forEach((c: Card) => victim.discard.push(c));
                    } else {
                        revealed.forEach((c: Card) => victim.discard.push(c));
                    }
                });
            }
        };
      case "Council Room":
        return {
            id: "b18", name: "Council Room", cost: 5, types: [CardType.Action],
            description: "+4 Cards, +1 Buy. Each other player draws a card.",
            execute: async (game, player) => {
                player.draw(4);
                game.buys += 1;
                game.players.forEach((p: Player, i: number) => { if (i !== game.currentPlayerIndex) p.draw(1); });
            }
        };
      case "Festival":
        return {
            id: "b19", name: "Festival", cost: 5, types: [CardType.Action],
            description: "+2 Actions, +1 Buy, +$2.",
            execute: async (game, player) => { game.actions += 2; game.buys += 1; game.coins += 2; }
        };
      case "Laboratory":
        return {
            id: "b20", name: "Laboratory", cost: 5, types: [CardType.Action],
            description: "+2 Cards, +1 Action.",
            execute: async (game, player) => { player.draw(2); game.actions += 1; }
        };
      case "Market":
        return {
            id: "b21", name: "Market", cost: 5, types: [CardType.Action],
            description: "+1 Card, +1 Action, +1 Buy, +$1.",
            execute: async (game, player) => { player.draw(1); game.actions += 1; game.buys += 1; game.coins += 1; }
        };
      case "Mine":
        return {
            id: "b22", name: "Mine", cost: 5, types: [CardType.Action],
            description: "Trash a Treasure from your hand. Gain a Treasure costing up to $3 more than it, putting it into your hand.",
            execute: async (game, player) => {
                const treasures = player.hand.map((c: Card, i: number) => c.types.includes(CardType.Treasure) ? i : -1).filter((i: number) => i !== -1);
                if (treasures.length > 0) {
                    const idx = await game.requestInteraction({
                        type: "choice", message: "MINE: SELECT TREASURE TO UPGRADE",
                        options: treasures.map((i: number) => ({ text: player.hand[i]!.name, value: i }))
                    });
                    if (idx !== null) {
                        const trashed = player.hand.splice(idx, 1)[0]!;
                        game.trash.push(trashed);
                        const maxCost = trashed.cost + 3;
                        const gainName = await game.requestInteraction({
                            type: "gain", message: `MINE: GAIN TREASURE UP TO $${maxCost} TO HAND`,
                            source: "supply"
                        });
                        if (gainName && game.getCardCost(gainName as string) <= maxCost) {
                            game.supply.set(gainName as string, (game.supply.get(gainName as string) || 1) - 1);
                            player.hand.push(CardFactory.createCard(gainName as string));
                        }
                    }
                }
            }
        };
      case "Sentry":
        return {
            id: "b23", name: "Sentry", cost: 5, types: [CardType.Action],
            description: "+1 Card, +1 Action. Look at the top 2 cards of your deck. Trash and/or discard any number of them. Put the rest back on top in any order.",
            execute: async (game, player) => {
                player.draw(1); game.actions += 1;
                const revealed = player.draw(2);
                player.hand.splice(player.hand.length - revealed.length, revealed.length); // Out of hand
                
                for (const card of revealed) {
                    const action = await game.requestInteraction({
                        type: "choice", message: `SENTRY: ACTION FOR ${card.name.toUpperCase()}`,
                        options: [{ text: "KEEP", value: "keep" }, { text: "DISCARD", value: "discard" }, { text: "TRASH", value: "trash" }]
                    });
                    if (action === "trash") game.trash.push(card);
                    else if (action === "discard") player.discard.push(card);
                    else player.deck.push(card); // Simplification: order depends on processing sequence
                }
            }
        };
      case "Witch":
        return {
            id: "b24", name: "Witch", cost: 5, types: [CardType.Action, CardType.Attack],
            description: "+2 Cards. Each other player gains a Curse.",
            execute: async (game, player) => {
                player.draw(2);
                await game.resolveAttack(player, async (victim: Player) => {
                    if (game.supply.get("Curse")! > 0) {
                        game.supply.set("Curse", game.supply.get("Curse")! - 1);
                        victim.gainCard(CardFactory.createCard("Curse"));
                    }
                });
            }
        };
      case "Artisan":
        return {
            id: "b25", name: "Artisan", cost: 6, types: [CardType.Action],
            description: "Gain a card costing up to $5 to your hand. Put a card from your hand onto your deck.",
            execute: async (game, player) => {
                const gainName = await game.requestInteraction({
                    type: "gain", message: "ARTISAN: GAIN OBJECT UP TO $5 TO HAND",
                    source: "supply"
                });
                if (gainName && game.getCardCost(gainName as string) <= 5) {
                    game.supply.set(gainName as string, (game.supply.get(gainName as string) || 1) - 1);
                    player.hand.push(CardFactory.createCard(gainName as string));
                }
                const topIdx = await game.requestInteraction({
                    type: "choice", message: "ARTISAN: SELECT OBJECT TO TOPDECK",
                    options: player.hand.map((c: Card, i: number) => ({ text: c.name, value: i }))
                });
                if (topIdx !== null) {
                    player.deck.push(player.hand.splice(topIdx, 1)[0]!);
                }
            }
        };

      case "Baron":
                return {
                    id: "i10", name: "Baron", cost: 4, types: [CardType.Action],
                    description: "+1 Buy. You may discard an Estate for +$4. If you don't, gain an Estate.",
                    execute: async (game, player) => {
                        game.buys += 1;
                        const estateIndex = player.hand.findIndex((c: Card) => c.name === "Estate");
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
                        const actionsPlayed = player.playArea.filter((c: Card) => c.types.includes(CardType.Action)).length;
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
                            options: player.hand.map((c: Card, i: number) => ({ text: c.name, value: i }))
                        });
                        if (index !== undefined) {
                            const card = player.hand[index];
                            if (!card)
                                return;
                            const numChoices = card.types.length;
                            const choices: string[] = [];
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
                                choices.push(choice as string);
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
                                options: Array.from(game.supply.keys()).filter((name: unknown) => {
                                    const c = CardFactory.createCard(name as string);
                                    return c.types.includes(CardType.Action) && (game.supply.get(name as string) || 0) > 0;
                                }).map((name: unknown) => ({ text: name as string, value: name as string }))
                            });
                            if (cardName) {
                                game.supply.set(cardName as string, (game.supply.get(cardName as string) || 1) - 1);
                                game.trash.push(CardFactory.createCard(cardName as string));
                            }
                        }
                        else {
                            const actionTrashIndices = game.trash.map((c: Card, i: number) => c.types.includes(CardType.Action) ? i : -1).filter((i: number) => i !== -1);
                            if (actionTrashIndices.length > 0) {
                                const index = await game.requestInteraction({
                                    type: "choice",
                                    message: "Select Action to gain from Trash",
                                    options: actionTrashIndices.map((i: number) => ({ text: game.trash[i].name, value: i }))
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
                        const indices: number[] = [];
                        for (const p of game.players) {
                            if (p.hand.length > 0) {
                                indices.push(0);
                            }
                            else {
                                indices.push(-1);
                            }
                        }
                        const passedCards = game.players.map((p: Player, i: number) => {
                            const cardIdx = indices[i];
                            return (cardIdx !== undefined && cardIdx !== -1) ? p.hand.splice(cardIdx, 1)[0] : null;
                        });
                        game.players.forEach((p: Player, i: number) => {
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
                            discardResult.sort((a: number, b: number) => b - a).forEach((i: number) => player.discard.push(player.hand.splice(i, 1)[0]));
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
                            const idx = player.playArea.findIndex((c: Card) => c.name === "Mining Village");
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
                            await game.resolveAttack(player, async (victim: Player) => {
                                if (victim.hand.length >= 5) {
                                    victim.discardHand();
                                    victim.draw(4);
                                }
                            });
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
                        const choices: string[] = [];
                        for (let i = 0; i < 2; i++) {
                            const choice = await game.requestInteraction({
                                type: "choice",
                                message: `Pawn Choice ${i + 1}/2`,
                                options: options.filter(o => !choices.includes(o.value))
                            });
                            choices.push(choice as string);
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
                                message: `Gain up to ${maxCost}`,
                                source: "supply"
                            });
                            if (gainName) {
                                const card = CardFactory.createCard(gainName as string);
                                if (card.types.includes(CardType.Victory)) {
                                    player.discard.push(card);
                                    await game.resolveAttack(player, async (victim: Player) => {
                                        const count = game.supply.get("Curse") || 0;
                                        if (count > 0) {
                                            game.supply.set("Curse", count - 1);
                                            victim.discard.push(CardFactory.createCard("Curse"));
                                        }
                                    });
                                }
                                else {
                                    player.deck.push(card);
                                }
                                game.supply.set(gainName as string, (game.supply.get(gainName as string) || 1) - 1);
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
                            const card = player.hand.splice(idx as number, 1)[0];
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
                        if (!player.hand.some((c: Card) => c.types.includes(CardType.Action))) {
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
                            if (indices && (indices as number[]).length === 2) {
                                (indices as number[]).sort((a: number, b: number) => b - a).forEach((i: number) => {
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
                        await game.resolveAttack(player, async (victim: Player) => {
                            if (victim.deck.length === 0)
                                victim.draw(0); // Public method that handles shuffle
                            if (victim.deck.length > 0) {
                                const trashed = victim.deck.pop();
                                if (trashed) {
                                    game.trash.push(trashed);
                                    const options = Array.from(game.supply.keys())
                                        .filter((n: any) => CardFactory.createCard(n as string).cost === trashed.cost);
                                    if (options.length > 0 && options[0]) {
                                        const cardName = options[0] as string;
                                        victim.discard.push(CardFactory.createCard(cardName));
                                        game.supply.set(cardName, (game.supply.get(cardName) || 1) - 1);
                                    }
                                }
                            }
                        });
                    }
                };
            case "Torturer":
                return {
                    id: "i30", name: "Torturer", cost: 5, types: [CardType.Action, CardType.Attack],
                    description: "+3 Cards. Others choose: discard 2 or gain Curse to hand.",
                    execute: async (game, player) => {
                        player.draw(3);
                        await game.resolveAttack(player, async (victim: Player, victimIndex: number) => {
                            const choice = await game.requestInteraction({
                                type: "choice",
                                message: "Torturer: Discard 2 or gain Curse to hand?",
                                options: [{ text: "Discard 2", value: "discard" }, { text: "Gain Curse", value: "curse" }]
                            }, victimIndex);
                            if (choice === "discard") {
                                const idxResult = await game.requestInteraction({
                                    type: "discard", message: "Discard 2", minCards: 2, maxCards: 2, source: "hand"
                                }, victimIndex);
                                if (idxResult)
                                    (idxResult as number[]).sort((a: number, b: number) => b - a).forEach((i: number) => {
                                        const card = victim.hand.splice(i, 1)[0];
                                        if (card) victim.discard.push(card);
                                    });
                            }
                            else {
                                const count = game.supply.get("Curse") || 0;
                                if (count > 0) {
                                    game.supply.set("Curse", count - 1);
                                    victim.hand.push(CardFactory.createCard("Curse"));
                                }
                            }
                        });
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
                        if (idxResult && (idxResult as number[]).length === 2) {
                            (idxResult as number[]).sort((a: number, b: number) => b - a).forEach((i: number) => game.trash.push(player.hand.splice(i, 1)[0]));
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
                        if (idxResult && (idxResult as number[]).length > 0) {
                            const trashed = player.hand.splice((idxResult as number[])[0], 1)[0];
                            if (!trashed)
                                return;
                            game.trash.push(trashed);
                            const targetCost = trashed.cost + 1;
                            const options = Array.from(game.supply.keys()).filter((n: any) => CardFactory.createCard(n as string).cost === targetCost);
                            if (options.length > 0) {
                                player.discard.push(CardFactory.createCard(options[0] as string));
                                game.supply.set(options[0] as string, (game.supply.get(options[0] as string) || 1) - 1);
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
                            options: Array.from(game.supply.keys()).map((n: any) => ({ text: n as string, value: n as string }))
                        });
                        if (player.deck.length === 0)
                            player.shuffleDiscardIntoDeck();
                        if (player.deck.length > 0) {
                            const card = player.deck.pop();
                            if (card && card.name === guess)
                                player.hand.push(card);
                            else if (card)
                                player.discard.push(card);
                        }
                    }
                };
            // FALLBACK
            
      default:
        return { id: "0", name: "Unknown", cost: 0, types: [], description: "Error" };
    }
  }
}
