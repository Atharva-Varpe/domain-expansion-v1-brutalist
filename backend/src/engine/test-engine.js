import { GameState } from "./game.js";
import { EasyBot, MediumBot, HardBot } from "./bot.js";
const game = new GameState(["EasyBot", "HardBot"]);
const easyBot = new EasyBot();
const hardBot = new HardBot();
let turnCount = 0;
while (!game.isGameOver() && turnCount < 100) {
    const currentPlayer = game.getCurrentPlayer();
    console.log(`\n--- Turn ${turnCount}: ${currentPlayer.name}'s turn ---`);
    if (currentPlayer.name === "EasyBot") {
        await easyBot.takeTurn(game);
    }
    else {
        await hardBot.takeTurn(game);
    }
    console.log(`${currentPlayer.name}'s hand size: ${currentPlayer.hand.length}`);
    console.log(`${currentPlayer.name}'s discard size: ${currentPlayer.discard.length}`);
    console.log(`${currentPlayer.name}'s deck size: ${currentPlayer.deck.length}`);
    console.log(`Province count: ${game.supply.get("Province")}`);
    turnCount++;
}
console.log("\n--- GAME OVER ---");
game.players.forEach(p => {
    console.log(`${p.name} VP: ${p.getVictoryPoints()}`);
});
//# sourceMappingURL=test-engine.js.map