// server/heartsGame.js

function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = [...Array(13).keys()].map(i => i + 2); // 2 to 14 (A=14)
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCards(players) {
  const deck = createDeck();
  shuffle(deck);
  const hands = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands;
}

function startGame(players) {
  const hands = dealCards(players);
  const playerMap = {};
  players.forEach((player, idx) => {
    playerMap[player.id] = {
      hand: hands[idx],
      name: player.name,
      points: 0
    };
  });

  return {
    players: playerMap,
    currentTrick: [],
    trickHistory: [],
    turnOrder: players.map(p => p.id),
    currentPlayerIndex: 0
  };
}

function calculateScores(game) {
  const scores = {};
  let shooter = null;

  for (const [playerId, state] of Object.entries(game.players)) {
    const cards = state.wonCards || [];
    const score = cards.reduce((acc, card) => {
      if (card.suit === "hearts") return acc + 1;
      if (card.suit === "spades" && card.value === 12) return acc + 13; // Q♠
      return acc;
    }, 0);

    scores[playerId] = score;

    if (score === 26) shooter = playerId;
  }

  // Handle moon shooting
  if (shooter) {
    for (const playerId of Object.keys(scores)) {
      scores[playerId] = playerId === shooter ? 0 : 26;
    }
  }

  return scores;
}

module.exports = {
  createDeck,
  shuffle,
  dealCards,
  startGame,
  calculateScores  
};