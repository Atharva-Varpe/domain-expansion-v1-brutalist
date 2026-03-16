export class Player {
    name;
    deck = [];
    hand = [];
    discard = [];
    playArea = [];
    constructor(name) {
        this.name = name;
    }
    // Shuffle the discard pile and make it the new deck
    shuffleDiscardIntoDeck() {
        if (this.discard.length === 0)
            return;
        this.deck = [...this.discard].sort(() => Math.random() - 0.5);
        this.discard = [];
    }
    draw(count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                this.shuffleDiscardIntoDeck();
            }
            if (this.deck.length > 0) {
                drawn.push(this.deck.pop());
            }
        }
        this.hand.push(...drawn);
        return drawn;
    }
    discardHand() {
        this.discard.push(...this.hand);
        this.hand = [];
    }
    discardPlayArea() {
        this.discard.push(...this.playArea);
        this.playArea = [];
    }
    gainCard(card) {
        this.discard.push(card);
    }
    getVictoryPoints() {
        const allCards = [...this.deck, ...this.hand, ...this.discard];
        let vp = allCards.reduce((acc, card) => acc + (card.vp || 0), 0);
        // Gardens: 1 VP per 10 cards
        const gardensCount = allCards.filter(c => c.name === "Gardens").length;
        vp += gardensCount * Math.floor(allCards.length / 10);
        // Duke: 1 VP per Duchy
        const dukeCount = allCards.filter(c => c.name === "Duke").length;
        const duchyCount = allCards.filter(c => c.name === "Duchy").length;
        vp += dukeCount * duchyCount;
        return vp;
    }
}
//# sourceMappingURL=player.js.map