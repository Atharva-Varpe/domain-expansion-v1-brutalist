import { CardType } from "./card.js";
import { Player } from "./player.js";
import { CardFactory } from "./cards.js";
export var GamePhase;
(function (GamePhase) {
    GamePhase["Action"] = "Action";
    GamePhase["Buy"] = "Buy";
    GamePhase["Cleanup"] = "Cleanup";
    GamePhase["WaitingForInput"] = "WaitingForInput";
})(GamePhase || (GamePhase = {}));
export class GameState {
    players = [];
    supply = new Map();
    trash = [];
    currentPlayerIndex = 0;
    phase = GamePhase.Action;
    previousPhase = GamePhase.Action;
    actions = 1;
    buys = 1;
    coins = 0;
    currentInteraction = null;
    interactionCallback = null;
    costReduction = 0;
    constructor(playerNames) {
        this.players = playerNames.map((name) => new Player(name));
        this.initializeSupply();
        this.initializePlayers();
    }
    initializeSupply() {
        this.supply.set("Copper", 60);
        this.supply.set("Silver", 40);
        this.supply.set("Gold", 30);
        this.supply.set("Estate", 12);
        this.supply.set("Duchy", 12);
        this.supply.set("Province", 12);
        this.supply.set("Curse", 30);
        const kingdomCards = [
            "Artisan", "Bandit", "Bureaucrat", "Cellar", "Chapel", "Council Room", "Festival", "Gardens", "Harbinger",
            "Laboratory", "Market", "Merchant", "Militia", "Mine", "Moat", "Moneylender", "Poacher", "Remodel",
            "Sentry", "Smithy", "Throne Room", "Vassal", "Village", "Witch", "Workshop",
            "Baron", "Bridge", "Conspirator", "Courtier", "Courtyard", "Diplomat", "Duke", "Harem", "Ironworks",
            "Lurker", "Masquerade", "Mill", "Mining Village", "Minion", "Nobles", "Patrol", "Pawn", "Replace",
            "Secret Passage", "Shanty Town", "Slums", "Steward", "Swindler", "Torturer", "Trading Post",
            "Upgrade", "Wishing Well"
        ];
        kingdomCards.forEach(c => this.supply.set(c, 10));
    }
    getCardCost(name) {
        const baseCard = CardFactory.createCard(name);
        return Math.max(0, baseCard.cost - this.costReduction);
    }
    initializePlayers() {
        this.players.forEach((player) => {
            for (let i = 0; i < 7; i++)
                player.discard.push(CardFactory.createCard("Copper"));
            for (let i = 0; i < 3; i++)
                player.discard.push(CardFactory.createCard("Estate"));
            player.draw(5);
        });
    }
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    async requestInteraction(interaction) {
        this.previousPhase = this.phase;
        this.phase = GamePhase.WaitingForInput;
        this.currentInteraction = interaction;
        return new Promise((resolve) => {
            this.interactionCallback = (result) => {
                this.phase = this.previousPhase;
                this.currentInteraction = null;
                this.interactionCallback = null;
                resolve(result);
            };
        });
    }
    submitInteraction(result) {
        if (this.interactionCallback) {
            this.interactionCallback(result);
        }
    }
    merchantsPlayedThisTurn = 0;
    firstSilverPlayed = false;
    async playCard(cardIndex) {
        if (this.phase === GamePhase.WaitingForInput)
            return;
        const player = this.getCurrentPlayer();
        if (cardIndex < 0 || cardIndex >= player.hand.length)
            return;
        const card = player.hand[cardIndex];
        if (this.phase === GamePhase.Action && (card.types.includes(CardType.Action) || card.types.includes(CardType.VictoryAction))) {
            if (this.actions > 0) {
                this.actions--;
                player.hand.splice(cardIndex, 1);
                player.playArea.push(card);
                if (card.name === "Merchant")
                    this.merchantsPlayedThisTurn++;
                if (card.execute) {
                    await card.execute(this, player);
                }
            }
        }
        else if (this.phase === GamePhase.Buy && card.types.includes(CardType.Treasure)) {
            player.hand.splice(cardIndex, 1);
            player.playArea.push(card);
            this.coins += card.value || 0;
            if (card.name === "Silver" && !this.firstSilverPlayed) {
                this.coins += this.merchantsPlayedThisTurn;
                this.firstSilverPlayed = true;
            }
        }
    }
    buyCard(cardName) {
        if (this.phase !== GamePhase.Buy || this.buys <= 0)
            return;
        const count = this.supply.get(cardName);
        if (count === undefined || count <= 0)
            return;
        const cost = this.getCardCost(cardName);
        if (this.coins >= cost) {
            this.coins -= cost;
            this.buys--;
            this.supply.set(cardName, count - 1);
            this.getCurrentPlayer().gainCard(CardFactory.createCard(cardName));
        }
    }
    nextPhase() {
        if (this.phase === GamePhase.Action) {
            this.phase = GamePhase.Buy;
        }
        else if (this.phase === GamePhase.Buy) {
            this.phase = GamePhase.Cleanup;
            this.cleanup();
        }
    }
    cleanup() {
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
    }
    isGameOver() {
        if (this.supply.get("Province") === 0)
            return true;
        let emptyPiles = 0;
        this.supply.forEach((count, name) => {
            if (count === 0 && !["Copper", "Silver", "Gold", "Curse"].includes(name))
                emptyPiles++;
        });
        return emptyPiles >= 3;
    }
    getState() {
        return {
            players: this.players.map(p => ({
                name: p.name,
                handSize: p.hand.length,
                deckSize: p.deck.length,
                discardSize: p.discard.length,
                playArea: p.playArea,
                hand: p.hand, // In a real game, only the current player's hand is visible
            })),
            supply: Array.from(this.supply.entries()).map(([name, count]) => ({
                name,
                count,
                cost: this.getCardCost(name),
                card: CardFactory.createCard(name)
            })),
            trash: this.trash,
            currentPlayerIndex: this.currentPlayerIndex,
            phase: this.phase,
            actions: this.actions,
            buys: this.buys,
            coins: this.coins,
            currentInteraction: this.currentInteraction,
            isGameOver: this.isGameOver(),
        };
    }
}
//# sourceMappingURL=game.js.map