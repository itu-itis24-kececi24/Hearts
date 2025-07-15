// src/components/Lobby.jsx
import React from "react";

function Lobby({
  username,
  setUsername,
  roomCode,
  setRoomCode,
  handleCreateRoom,
  handleJoinRoom,
  availableRooms,
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-center mb-6">Multiplayer Hearts</h1>

        {/* Username input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-400"
          />
        </div>

        {/* Room actions */}
        <div className="flex flex-col md:flex-row items-stretch gap-4 mb-6">
          <button
            onClick={handleCreateRoom}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded font-medium w-full md:w-1/2"
          >
            Create Room
          </button>

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-1/2">
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Room Code"
              className="flex-1 border p-2 rounded focus:outline-none"
            />
            <button
              onClick={() => handleJoinRoom(roomCode)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded font-medium"
            >
              Join
            </button>
          </div>
        </div>

        {/* Available rooms list */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Available Rooms</h2>
          <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
            {availableRooms.length === 0 ? (
              <p className="text-gray-500 text-sm">No rooms available.</p>
            ) : (
              <ul className="space-y-2">
                {availableRooms.map((room) => {
                  const isFull = room.playerCount >= 4;
                  return (
                    <li key={room.roomCode} className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Room <strong>{room.roomCode}</strong> – {room.playerCount}/4 players
                      </span>
                      <button
                        disabled={isFull}
                        onClick={() => {
                          handleJoinRoom(room.roomCode);
                          setRoomCode(room.roomCode);
                        }}
                        className={`text-sm underline font-medium ${
                          isFull
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-blue-600 hover:text-blue-800"
                        }`}
                      >
                        {isFull ? "Full" : "Join"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
