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
        let vp = 0;
        let gardensCount = 0;
        let dukeCount = 0;
        let duchyCount = 0;
        let totalCards = 0;

        const zonesToCount = [this.deck, this.hand, this.discard];
        for (const zone of zonesToCount) {
            totalCards += zone.length;
            for (const card of zone) {
                vp += card.vp || 0;
                if (card.name === "Gardens") gardensCount++;
                else if (card.name === "Duke") dukeCount++;
                else if (card.name === "Duchy") duchyCount++;
            }
        }

        vp += gardensCount * Math.floor(totalCards / 10);
        vp += dukeCount * duchyCount;

        return vp;
    }
}
//# sourceMappingURL=player.js.map