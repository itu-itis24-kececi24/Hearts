/* ======================== */
/* ======= server.js ====== */
/* ======================== */

// server/server.js
const scoreLimit = 100; // Score limit to end the game

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;
const rooms = {}; // { roomCode: { players: [], gameState: {} } }

function getOpenRooms() {
    return Object.entries(rooms)
        .filter(([_, room]) => room.players.length < 4)
        .map(([roomCode, room]) => ({
            roomCode,
            playerCount: room.players.length,
            players: room.players.map(p => p.name)
        }));
}

function broadcastOpenRooms() {
    io.emit("lobby_list", getOpenRooms());
}

function calculateTrickPoints(trick) {
    let points = 0;
    for (const { card } of trick) {
        if (card.suit === "hearts") points += 1;
        if (card.suit === "spades" && card.value === 12) points += 13; // Q♠
    }
    return points;
}

function calculateScores(game) {
    const scores = {};
    let shooterId = null;

    // Step 1: Tally points for each player
    for (const [playerId, playerState] of Object.entries(game.players)) {
        const cards = playerState.wonCards || [];
        let score = 0;

        for (const card of cards) {
            if (card.suit === "hearts") score += 1;
            if (card.suit === "spades" && card.value === 12) score += 13; // Queen of Spades
        }

        scores[playerId] = score;

        if (score === 26) {
            shooterId = playerId;
        }
    }

    // Step 2: Apply "Shooting the Moon" if it occurred
    if (shooterId) {
        for (const playerId in scores) {
            scores[playerId] = (playerId === shooterId) ? 0 : 26;
        }
    }

    return scores;
}

io.on("connection", (socket) => {
    console.log("New client connected: ", socket.id);

    socket.emit("lobby_list", getOpenRooms()); // Send initial list of open rooms

    socket.on("create_room", ({ username }, callback) => {
        const roomCode = Math.random().toString(36).substring(2, 7);
        rooms[roomCode] = {
            players: [{ id: socket.id, name: username }],
            gameState: null
        };
        socket.join(roomCode);
        callback({ roomCode });
        io.to(roomCode).emit("room_update", rooms[roomCode].players);
        broadcastOpenRooms();
    });

    socket.on("join_room", ({ roomCode, username }, callback) => {
        const room = rooms[roomCode];
        if (!room || room.players.length >= 4) return callback({ error: "Room full or not found" });
        room.players.push({ id: socket.id, name: username });
        socket.join(roomCode);
        callback({ success: true });
        io.to(roomCode).emit("room_update", room.players);
        broadcastOpenRooms();
    });

    socket.on("leave_room", ({ roomCode }) => {
        const room = rooms[roomCode];
        if(!room) return;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(roomCode);

        if(room.players.length === 0) {
            delete rooms[roomCode]; // Remove empty room
        }

        for(let roomCode in rooms){
            let r = rooms[roomCode];
            io.to(roomCode).emit("room_update", r.players);
            broadcastOpenRooms();
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            room.players = room.players.filter(p => p.id !== socket.id);
            io.to(roomCode).emit("room_update", room.players);
            broadcastOpenRooms();

            if (room.players.length === 0) {
                delete rooms[roomCode]; // Remove empty room
            }
        }
    });

    socket.on("start_game", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room || room.players.length !== 4) return;

        room.gameState = {
            ...startGame(room.players),
            heartsBroken: false
        };

        // Send each player their hand privately
        room.players.forEach((player) => {
            const playerState = room.gameState.players[player.id];
            io.to(player.id).emit("game_start", {
                hand: playerState.hand,
                name: player.name,
                players: room.players.map(p => ({ id: p.id, name: p.name }))
            });
        });

        // Ensure that player with 2 of Clubs starts first
        const firstPlayerId = Object.entries(room.gameState.players).find(
            ([_, p]) => p.hand.some(c => c.suit === "clubs" && c.value === 2)
        )?.[0];

        if (firstPlayerId) {
            room.gameState.currentPlayerIndex = room.gameState.turnOrder.indexOf(firstPlayerId);
        }

        // Notify all players whose turn it is
        const currentPlayerId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];
        io.to(roomCode).emit("turn_update", {
            currentPlayerId
        });
    });

    socket.on("play_card", ({ roomCode, card }, callback) => {
        const room = rooms[roomCode];
        const game = room?.gameState;
        if (!game) return;

        const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
        if (socket.id !== currentPlayerId) {
            return callback({ error: "Not your turn." });
        }

        const player = game.players[socket.id];
        const handIndex = player.hand.findIndex(
            c => c.suit === card.suit && c.value === card.value
        );

        if (handIndex === -1) {
            return callback({ error: "Card not in hand." });
        }

        // Enforce first trick rule (2 of Clubs must be played first)
        const isFirstTrick = game.trickHistory.length === 0 && game.currentTrick.length === 0;
        if (isFirstTrick) {
            const isTwoOfClubs = card.suit === "clubs" && card.value === 2;

            if (!isTwoOfClubs) {
                return callback({ error: "First play must be the 2 of Clubs." });
            }
        }

        // Enforce leading hearts rule
        // Hearts can only be led if they are broken or if the player has no other cards
        const isLeading = game.currentTrick.length === 0;
        if (isLeading && card.suit === "hearts" && !game.heartsBroken) {
            const onlyHeartsLeft = player.hand.every(c => c.suit === "hearts");
            if (!onlyHeartsLeft) {
                return callback({ error: "You can't lead with hearts until they are broken." });
            }
        }

        // Prevent illegal playing of cards
        const leadSuit = game.currentTrick[0]?.card?.suit;
        const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
        if (hasLeadSuit && card.suit !== leadSuit) {
            return callback({ error: "Must follow lead suit if possible." });
        }

        // Remove card from hand
        const playedCard = player.hand.splice(handIndex, 1)[0];
        game.currentTrick.push({ playerId: socket.id, card: playedCard });

        // Break hearts if a heart is played
        if (playedCard.suit === "hearts" && !game.heartsBroken) {
            game.heartsBroken = true;
        }

        // Broadcast the updated trick
        io.to(roomCode).emit("card_played", {
            playerId: socket.id,
            card: playedCard,
            trick: game.currentTrick,
            heartsBroken: game.heartsBroken
        });

        if (game.currentTrick.length < 4) {
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % 4;
            const nextPlayerId = game.turnOrder[game.currentPlayerIndex];
            io.to(roomCode).emit("turn_update", { currentPlayerId: nextPlayerId });
        } else {
            // Resolve the trick
            let winningCard = null;
            let winningPlayerId = null;

            game.currentTrick.forEach(({ playerId, card }) => {
                if (card.suit === leadSuit) {
                    if (!winningCard || card.value > winningCard.value) {
                        winningCard = card;
                        winningPlayerId = playerId;
                    }
                }
            });

            game.trickHistory.push([...game.currentTrick]);

            // Save won cards (for scoring)
            game.players[winningPlayerId].wonCards = [
                ...(game.players[winningPlayerId].wonCards || []),
                ...game.currentTrick.map(t => t.card)
            ];

            game.currentTrick = [];
            game.currentPlayerIndex = game.turnOrder.indexOf(winningPlayerId);

            io.to(roomCode).emit("trick_won", {
                winnerId: winningPlayerId,
                cards: game.trickHistory[game.trickHistory.length - 1],
                points: calculateTrickPoints(game.trickHistory[game.trickHistory.length - 1])
            });

            const nextPlayerId = game.turnOrder[game.currentPlayerIndex];
            io.to(roomCode).emit("turn_update", { currentPlayerId: nextPlayerId });
        }

        // Check for end of round
        if (Object.values(game.players).every(p => p.hand.length === 0)) {
            const scores = calculateScores(game);

            // Update total scores
            for (const playerId in scores) {
                game.players[playerId].totalPoints = (game.players[playerId].totalPoints || 0) + scores[playerId];
            }

            const totalScores = {};
            for (const playerId in game.players) {
                totalScores[playerId] = game.players[playerId].totalPoints;
            }

            io.to(roomCode).emit("round_end", {
                scores, // current round scores
                totalScores, // cumulative
            });

            rooms[roomCode].readyPlayers = []; // reset ready players for next round

            // Check for game over (any player >= 100)
            // TODO: Implement score limit set by players
            const loser = Object.entries(totalScores).find(([_, total]) => total >= scoreLimit);
            if (loser) {
                io.to(roomCode).emit("game_over", {
                    finalScores: totalScores
                });

                // Reset or delete room (optional)
                // delete rooms[roomCode];
            } else {
                // Reset for next round (if continuing)
                for (const player of room.players) {
                    game.players[player.id].hand = [];
                    game.players[player.id].wonCards = [];
                }

                game.trickHistory = [];
                game.currentTrick = [];

                // Optionally re-deal and call startGame again for new round
                const newGameState = startGame(room.players);
                room.gameState.players = newGameState.players;
                room.gameState.turnOrder = newGameState.turnOrder;
                room.gameState.currentPlayerIndex = newGameState.currentPlayerIndex;

                // Send new hands and first player
                room.players.forEach((player) => {
                    const playerState = room.gameState.players[player.id];
                    io.to(player.id).emit("game_start", {
                        hand: playerState.hand,
                        name: player.name,
                        players: room.players.map(p => ({ id: p.id, name: p.name }))
                    });
                });

                const firstId = room.gameState.turnOrder[room.gameState.currentPlayerIndex];
                io.to(roomCode).emit("turn_update", { currentPlayerId: firstId });
            }
        }



        callback({ success: true });
    });

    socket.on("player_ready", ({ roomCode }) => {
        const room = rooms[roomCode];
        if (!room) return;

        if (!room.readyPlayers.includes(socket.id)) {
            room.readyPlayers.push(socket.id);
        }

        // When all players are ready, emit a signal to show the start button
        if (room.readyPlayers.length === 4) {
            io.to(roomCode).emit("all_ready");
            room.readyPlayers = []; // reset for next round
        }
    });

});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const { startGame } = require("./heartsGame");

