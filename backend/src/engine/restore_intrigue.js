const fs = require('fs');

const tsFile = fs.readFileSync('backend/src/engine/cards.ts', 'utf8');
const jsFile = fs.readFileSync('backend/src/engine/intrigue_raw.js', 'utf8');

// The JS file ends with:
//         default:
//             return { id: "0", name: "Unknown", cost: 0, types: [], description: "Error" };
//     }
//   }
// }

// Extract from case "Baron": up to default:
const match = jsFile.match(/(case "Baron":[\s\S]*?)default:/);
if (!match) {
  console.log("Could not find Intrigue set in JS");
  process.exit(1);
}

let intrigueCode = match[1];

// Clean up some JS compiled syntax back to TS-like syntax if needed
intrigueCode = intrigueCode.replace(/CardFactory\.createCard/g, 'CardFactory.createCard');

// Refactor Minion
intrigueCode = intrigueCode.replace(
  /for \((?:var|const|let) \w+ of game\.players\) \{\s*if \(\w+ !== player && (\w+)\.hand\.length >= 5\) \{\s*\1\.discardHand\(\);\s*\1\.draw\(4\);\s*\}\s*\}/g,
  `await game.resolveAttack(player, async (victim) => {\n                                if (victim.hand.length >= 5) {\n                                    victim.discardHand();\n                                    victim.draw(4);\n                                }\n                            });`
);

// Refactor Replace
intrigueCode = intrigueCode.replace(
  /for \((?:var|const|let) \w+ of game\.players\) \{\s*if \(\w+ !== player\) \{\s*const count = game\.supply\.get\("Curse"\) \|\| 0;\s*if \(count > 0\) \{\s*game\.supply\.set\("Curse", count - 1\);\s*\w+\.discard\.push\(CardFactory\.createCard\("Curse"\)\);\s*\}\s*\}\s*\}/g,
  `await game.resolveAttack(player, async (victim) => {\n                                        const count = game.supply.get("Curse") || 0;\n                                        if (count > 0) {\n                                            game.supply.set("Curse", count - 1);\n                                            victim.discard.push(CardFactory.createCard("Curse"));\n                                        }\n                                    });`
);

// Refactor Swindler
intrigueCode = intrigueCode.replace(
  /for \((?:var|const|let) \w+ of game\.players\) \{\s*if \(\w+ !== player\) \{([\s\S]*?)\}\s*\}/,
  (fullMatch, body) => {
    if (fullMatch.includes('Swindler')) return fullMatch; // safe guard
    let newBody = body.replace(/const (\w+) = (\w+)\.deck\.length/g, 'const $1 = victim.deck.length');
    newBody = newBody.replace(/(\w+)\.shuffleDiscardIntoDeck\(\)/g, 'victim.shuffleDiscardIntoDeck()');
    newBody = newBody.replace(/(\w+)\.deck/g, 'victim.deck');
    newBody = newBody.replace(/(\w+)\.discard/g, 'victim.discard');
    
    // We'll replace the exact loop body manually in Swindler because of variable name bindings.
    return `await game.resolveAttack(player, async (victim, victimIndex) => {
                                if (victim.deck.length === 0) victim.shuffleDiscardIntoDeck();
                                if (victim.deck.length > 0) {
                                    const trashed = victim.deck.pop();
                                    game.trash.push(trashed);
                                    const cost = trashed.cost;
                                    const replacementName = await game.requestInteraction({
                                        type: "gain",
                                        message: \`Swindler: Replace \${trashed.name} with a card costing \${cost}\`,
                                        source: "supply"
                                    }, game.players.indexOf(player)); // Assuming player gets to choose, or victim? Swindler says "attacker chooses" in some rules, but typically attacker chooses. We'll use attacker (player) index. wait, requestInteraction usually uses currentPlayerIndex if victimIndex isn't specified, but attacker choosing requires player index.
                                    
                                    if (replacementName) {
                                        victim.discard.push(CardFactory.createCard(replacementName));
                                        game.supply.set(replacementName, (game.supply.get(replacementName) || 1) - 1);
                                    }
                                }
                            });`;
  }
);

// Refactor Torturer
intrigueCode = intrigueCode.replace(
  /for \((?:var|const|let) \w+ of game\.players\) \{\s*if \(\w+ !== player\)\s*continue;\s*([\s\S]*?)(?=\s*\}\s*\}\s*};\s*case "Trading Post":)/,
  (fullMatch, body) => {
    return `await game.resolveAttack(player, async (victim, victimIndex) => {
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
                                    idxResult.sort((a, b) => b - a).forEach((i) => victim.discard.push(victim.hand.splice(i, 1)[0]));
                            }
                            else {
                                const count = game.supply.get("Curse") || 0;
                                if (count > 0) {
                                    game.supply.set("Curse", count - 1);
                                    victim.hand.push(CardFactory.createCard("Curse"));
                                }
                            }
                        });`;
  }
);

const newTs = tsFile.replace(/default:\s*return \{ id: "0", name: "Unknown"/, intrigueCode + '\n      default:\n        return { id: "0", name: "Unknown"');
fs.writeFileSync('backend/src/engine/cards_restored.ts', newTs);
console.log("Restored Intrigue and refactored attacks to cards_restored.ts");
