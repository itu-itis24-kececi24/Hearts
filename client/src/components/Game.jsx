// src/components/Game.jsx
import React from "react";

function Game({
  players,
  currentPlayerId,
  hand,
  sortedHand,
  myValidCards,
  trick,
  playCard,
  socket,
}) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Players</h2>
      <ul className="mb-4">
        {players.map((p) => (
          <li
            key={p.id}
            className={`mb-1 ${p.id === socket.id ? "font-bold text-blue-600" : ""}`}
          >
            {p.name}
            {p.id === currentPlayerId && (
              <span className="text-green-600 font-semibold ml-2">(Current turn)</span>
            )}
          </li>
        ))}
      </ul>

      {hand.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Your Hand:</h2>
          <div className="flex flex-wrap">
            {sortedHand.map((card, i) => {
              const isPlayable = myValidCards.some(
                (c) => c.suit === card.suit && c.value === card.value
              );
              const suitSymbols = {
                spades: "♠",
                hearts: "♥",
                diamonds: "♦",
                clubs: "♣",
              };
              const isRed = card.suit === "hearts" || card.suit === "diamonds";
              const symbol = suitSymbols[card.suit];
              const displayValue =
                card.value === 11
                  ? "J"
                  : card.value === 12
                  ? "Q"
                  : card.value === 13
                  ? "K"
                  : card.value === 14
                  ? "A"
                  : card.value;

              return (
                <button
                  key={i}
                  className={`w-14 h-20 m-1 rounded border shadow text-xl font-bold ${
                    isRed ? "text-red-600" : "text-black"
                  } bg-white ${
                    isPlayable
                      ? "hover:bg-gray-100"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                  disabled={!isPlayable}
                  onClick={() => playCard(card)}
                >
                  <div className="flex flex-col justify-between h-full p-1">
                    <span className="text-left">{displayValue}</span>
                    <span className="text-right">{symbol}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {trick.length > 0 && (
        <div className="my-6 text-center">
          <h2 className="text-lg font-semibold">Current Trick</h2>
          <div className="flex justify-center flex-wrap gap-4 mt-2">
            {trick.map(({ playerId, card }, i) => {
              const suitSymbols = {
                spades: "♠",
                hearts: "♥",
                diamonds: "♦",
                clubs: "♣",
              };
              const symbol = suitSymbols[card.suit];
              const displayValue =
                card.value === 11
                  ? "J"
                  : card.value === 12
                  ? "Q"
                  : card.value === 13
                  ? "K"
                  : card.value === 14
                  ? "A"
                  : card.value;
              const isRed = card.suit === "hearts" || card.suit === "diamonds";

              const playerName =
                players.find((p) => p.id === playerId)?.name || "Unknown";

              return (
                <div key={i} className="text-center">
                  <div
                    className={`w-14 h-20 border rounded bg-white shadow text-xl font-bold ${
                      isRed ? "text-red-600" : "text-black"
                    } flex flex-col justify-between p-1`}
                  >
                    <span className="text-left">{displayValue}&nbsp;</span>
                    <span className="text-right">{symbol}</span>
                  </div>
                  <div className="mt-1 text-sm">{playerName}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;
