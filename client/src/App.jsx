import { useState, useEffect } from "react";
import io from "socket.io-client";

import "./components/Lobby"
import Lobby from "./components/Lobby";
import Room from "./components/Room";
import Game from "./components/Game";

const socket = io("http://localhost:3001");

function App() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [trick, setTrick] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [myValidCards, setMyValidCards] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [heartsBroken, setHeartsBroken] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [gameStartedOnce, setGameStartedOnce] = useState(false);

  useEffect(() => {
    socket.on("room_update", (players) => setPlayers(players));

    socket.on("lobby_list", (roomList) => setAvailableRooms(roomList));

    socket.on("game_start", ({ hand }) => {
      setHand(hand);
      setTrick([]);
      setMyPlayerId(socket.id);
      setGameStartedOnce(true);
    });

    socket.on("turn_update", ({ currentPlayerId }) => {
      setCurrentPlayerId(currentPlayerId);
    });

    socket.on("card_played", ({ playerId, card, trick, heartsBroken }) => {
      console.log(`Player ${playerId} played:`, card);
      setTrick(trick);
      setHeartsBroken(heartsBroken);
    });

    socket.on("trick_won", ({ winnerId, trick, points }) => {
      setTrick([]); // Clear previous trick
      setCurrentPlayerId(winnerId); // Update to new lead player

      // Optionally: display who won the trick and how many points
      console.log(`Trick won by ${winnerId} for ${points} points.`);
    });

    socket.on("round_end", ({ scores, totalScores }) => {
      alert("Round ended! Scores: " + JSON.stringify(scores));
      socket.emit("player_ready", { roomCode });
    });

    socket.on("all_ready", () => {
      setAllReady(true);
    });

    socket.on("game_over", ({ finalScores }) => {
      alert("Game over! Final Scores: " + JSON.stringify(finalScores));
    });
  }, []);

  useEffect(() => {
    const isFirstTrick = trick.length === 0 && hand.length === 13;
    const hasTwoOfClubs = hand.some(c => c.suit === "clubs" && c.value === 2);
    const isLeading = socket.id === currentPlayerId;

    if (isFirstTrick && hasTwoOfClubs && isLeading) {
      alert("You have the 2 of Clubs! You must play it first.");
    }
  }, [hand, trick, currentPlayerId]);

  const handleCreateRoom = () => {
    socket.emit("create_room", { username }, ({ roomCode }) => {
      setRoomCode(roomCode);
      setInRoom(true);
    });
  };

  const handleJoinRoom = (code) => {
    const joinCode = code || roomCode;
    socket.emit("join_room", { roomCode: joinCode, username }, (response) => {
      if (response.success) {
        setInRoom(true);
      } else {
        alert(response.error || "Failed to join room");
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit("leave_room", { roomCode });
    setInRoom(false);
    setRoomCode("");
    setPlayers([]);
    setHand([]);
    setTrick([]);
    setAllReady(false);
    setGameStartedOnce(false);
  };

  const getValidCards = () => {
    if (!hand || hand.length === 0) return [];

    const isFirstTrick = trick.length === 0 && hand.length === 13;

    // First play must be 2♣
    if (isFirstTrick) {
      const hasTwoOfClubs = hand.some(c => c.suit === "clubs" && c.value === 2);
      const isLeading = socket.id === currentPlayerId;
      if (isLeading && hasTwoOfClubs) {
        return hand.filter(c => c.suit === "clubs" && c.value === 2);
      }
    }

    const isLeading = trick.length === 0;

    if (isLeading) {
      const onlyHearts = hand.every(c => c.suit === "hearts");

      if (!heartsBroken) {
        return onlyHearts ? hand : hand.filter(c => c.suit !== "hearts");
      }

      return hand; // Hearts are broken — can lead anything
    }

    // Not leading: must follow suit if possible
    const leadSuit = trick[0].card.suit;
    const hasLeadSuit = hand.some(card => card.suit === leadSuit);

    return hasLeadSuit ? hand.filter(c => c.suit === leadSuit) : hand;
  };


  useEffect(() => {
    if (socket.id === currentPlayerId) {
      setMyValidCards(getValidCards());
    } else {
      setMyValidCards([]);
    }
  }, [currentPlayerId, hand, trick]);


  const playCard = (card) => {
    // Optimistically update the UI
    setHand(prevHand =>
      prevHand.filter(c => !(c.suit === card.suit && c.value === card.value))
    );

    socket.emit("play_card", { roomCode, card }, (res) => {
      if (res.error) {
        alert(res.error);

        // Rollback UI if invalid (optional)
        setHand(prev => [...prev, card]);
      }
    });
  };

  if (!inRoom) {
    return (
      <Lobby
        username={username}
        setUsername={setUsername}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        handleCreateRoom={handleCreateRoom}
        handleJoinRoom={handleJoinRoom}
        availableRooms={availableRooms}
      />
    );
  }

  const sortedHand = [...hand].sort((a, b) => {
    const suitOrder = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };

    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    // If suits are equal, sort by value
    return a.value - b.value;
  });

  if (inRoom && hand.length === 0) {
    return (
      <Room
        roomCode={roomCode}
        players={players}
        socket={socket}
        onStartGame={() => {
          socket.emit("start_game", { roomCode });
          setAllReady(false);
          setGameStartedOnce(true);
        }}
        onLeaveRoom={handleLeaveRoom}
      />
    )
  }

  return (
    <Game
      players={players}
      currentPlayerId={currentPlayerId}
      hand={hand}
      sortedHand={sortedHand}
      myValidCards={myValidCards}
      trick={trick}
      playCard={playCard}
      socket={socket}
    />
  )
}

export default App;
