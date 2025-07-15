// src/components/Room.jsx
import React from "react";

function Room({ roomCode, players, socket, onStartGame, onLeaveRoom }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-center mb-4">Room Joined</h1>

        <div className="mb-4 text-center">
          <span className="text-gray-600">Room Code:</span>{" "}
          <span className="font-mono text-lg font-semibold">{roomCode}</span>
        </div>

        <h2 className="text-lg font-semibold mb-2">Players</h2>
        <ul className="space-y-2 mb-6">
          {players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between px-3 py-2 rounded border ${
                p.id === socket.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "bg-gray-50 text-gray-800"
              }`}
            >
              <span>{p.name}</span>
              {p.id === socket.id && <span className="text-sm">(You)</span>}
            </li>
          ))}
        </ul>

        {players.length === 4 && (
          <div className="text-center mb-4">
            <button
              onClick={onStartGame}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded shadow"
            >
              Start Game
            </button>
          </div>
        )}

        {players.length < 4 && (
          <p className="text-center text-gray-500 text-sm mb-4">
            Waiting for players... ({players.length}/4 joined)
          </p>
        )}

        <div className="text-center">
          <button
            onClick={onLeaveRoom}
            className="text-red-500 underline text-sm hover:text-red-700"
          >
            Go back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

export default Room;
