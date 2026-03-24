import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Coins, Hand, Play, ShoppingCart, User, SkipForward, Sword } from 'lucide-react';

export interface ClientCard {
  name: string;
  types: string[];
  cost?: number;
  description?: string;
  value?: number;
}

export interface ClientPlayer {
  name: string;
  handSize: number;
  deckSize: number;
  discardSize: number;
  playArea: ClientCard[];
  hand: ClientCard[];
}

export interface ClientSupplyItem {
  name: string;
  count: number;
  cost: number;
  card: ClientCard;
}

export interface ClientGameState {
  supply: ClientSupplyItem[];
  trash: ClientCard[];
  currentPlayerIndex: number;
  interactingPlayerIndex: number | null;
  phase: string;
  actions: number;
  buys: number;
  coins: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentInteraction: any;
  isGameOver: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingUndo: any;
  players: ClientPlayer[];
}

const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
const socket: Socket = socketUrl ? io(socketUrl) : io();

export const GameUI: React.FC = () => {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [name, setName] = useState<string>('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('rooms_list', (data) => {
      setRooms(data);
    });

    socket.on('room_created', (id) => {
      setRoomId(id);
    });

    socket.on('game_created', (id) => {
      setGameId(id);
      setRoomId(null);
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    return () => {
      socket.off('connect');
      socket.off('rooms_list');
      socket.off('room_created');
      socket.off('game_created');
      socket.off('game_state');
    };
  }, []);

  const handleSetName = () => {
    if (name.trim()) {
      socket.emit('set_name', name);
    }
  };

  const handleCreateRoom = () => {
    socket.emit('create_room');
  };

  const handleJoinRoom = (id: string) => {
    socket.emit('join_room', id);
    setRoomId(id);
  };

  const handleStartGame = () => {
    if (roomId) {
      socket.emit('start_game', roomId);
    }
  };

  const handlePlayCard = (index: number) => {
    if (gameId) {
      socket.emit('play_card', { gameId, cardIndex: index });
    }
  };

  const handleBuyCard = (cardName: string) => {
    if (gameId) {
      socket.emit('buy_card', { gameId, cardName });
    }
  };

  const handleNextPhase = () => {
    if (gameId) {
      socket.emit('next_phase', gameId);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myPlayer = gameState?.players?.find((p: any) => p.name === name);
  const isMyTurn = gameState?.players?.[gameState?.currentPlayerIndex]?.name === name;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white min-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h1 className="text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            DOMINION
          </h1>
          <div className="flex gap-4">
            {name && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{name}</span>}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-6">
          {!gameId ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full gap-6">
              {!name ? (
                <div className="w-full flex flex-col gap-4 bg-black/30 p-8 rounded-2xl border border-white/5">
                  <label htmlFor="playerName" className="text-xl text-center mb-2 text-white/80 block cursor-pointer">Enter your name</label>
                  <input
                    id="playerName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="E.g., Wanderer"
                    onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
                  />
                  <button
                    onClick={handleSetName}
                    className="mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-medium transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98]"
                  >
                    Join Server
                  </button>
                </div>
              ) : !roomId ? (
                <div className="w-full flex flex-col gap-6">
                  <button
                    onClick={handleCreateRoom}
                    className="w-full px-4 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all text-lg font-medium shadow-lg backdrop-blur-sm"
                  >
                    Create New Room
                  </button>

                  <div className="bg-black/30 p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                    <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-2">Available Rooms</h3>
                    {rooms.length === 0 ? (
                      <div className="text-center py-8 text-white/30">No active rooms found</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {rooms.map((room) => (
                          <div key={room.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-white/80">{room.players.length}/4 Players</span>
                            <button
                              onClick={() => handleJoinRoom(room.id)}
                              className="px-4 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-500/50 text-sm transition-colors"
                            >
                              Join
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-6 bg-black/30 p-8 rounded-2xl border border-white/5">
                  <h2 className="text-xl text-center mb-4 text-white/80">Lobby {roomId}</h2>
                  <div className="flex flex-col gap-2">
                    {/* Display players here later */}
                    <div className="text-center text-white/50 py-4">Waiting for host to start...</div>
                  </div>
                  <button
                    onClick={handleStartGame}
                    className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 font-medium transition-all shadow-lg active:scale-[0.98]"
                  >
                    Start Game
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full gap-6">
              {/* Opponents Area */}
              <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {gameState?.players?.map((p: any, i: number) => {
                  if (p.name === name) return null;
                  const isActive = i === gameState.currentPlayerIndex;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`min-w-[150px] p-3 rounded-xl border flex flex-col gap-2 ${isActive ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/20' : 'bg-black/20 border-white/10'}`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className={isActive ? 'text-purple-400' : 'text-white/50'} />
                        <span className="font-semibold truncate text-sm">{p.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/50">
                        <span>{p.handSize} in hand</span>
                        <span>{p.deckSize} in deck</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Supply and Play Area */}
              <div className="flex-1 grid grid-cols-[1fr_300px] gap-6">
                {/* Supply */}
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 overflow-y-auto max-h-[400px]">
                  <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-4 flex items-center gap-2">
                    <ShoppingCart size={16} /> Supply
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {gameState?.supply?.map((s: any, i: number) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        key={s.name}
                        onClick={() => handleBuyCard(s.name)}
                        className={`relative cursor-pointer group flex flex-col items-center justify-center p-3 rounded-xl border ${s.count === 0 ? 'opacity-30 border-white/5 bg-black/50' : 'bg-white/10 border-white/20 hover:bg-white/20 hover:-translate-y-1 transition-all'}`}
                      >
                        <span className="font-medium text-sm text-center leading-tight mb-2">{s.name}</span>
                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm bg-black/40 px-2 py-1 rounded-full">
                          <Coins size={12} /> {s.cost}
                        </div>
                        <div className="absolute -top-2 -right-2 bg-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-black/40 shadow-sm">
                          {s.count}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Info Panel & Play Area */}
                <div className="flex flex-col gap-4">
                  <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${isMyTurn ? 'bg-purple-900/30 border-purple-500/40 shadow-lg shadow-purple-900/20' : 'bg-black/30 border-white/5'}`}>
                    <h3 className="text-sm uppercase tracking-wider font-semibold flex items-center gap-2">
                      <Sword size={16} className={isMyTurn ? 'text-purple-400' : 'text-white/50'} />
                      {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                    </h3>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black/40 rounded-lg p-2 flex flex-col items-center justify-center">
                        <span className="text-white/50 text-xs">Actions</span>
                        <span className="text-xl font-bold">{gameState?.actions || 0}</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 flex flex-col items-center justify-center">
                        <span className="text-white/50 text-xs">Buys</span>
                        <span className="text-xl font-bold">{gameState?.buys || 0}</span>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 flex flex-col items-center justify-center text-yellow-400">
                        <span className="text-white/50 text-xs">Coins</span>
                        <span className="text-xl font-bold">{gameState?.coins || 0}</span>
                      </div>
                    </div>

                    <div className="text-sm text-center py-2 bg-white/5 rounded-lg border border-white/10">
                      Phase: <span className="font-semibold text-purple-300 capitalize">{gameState?.phase?.toLowerCase()}</span>
                    </div>

                    {isMyTurn && (
                      <button
                        onClick={handleNextPhase}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-medium transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <SkipForward size={18} /> Next Phase
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-black/20 p-4 rounded-2xl border border-white/5 overflow-y-auto">
                    <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-2 flex items-center gap-2">
                      <Play size={16} /> Play Area
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {gameState?.players?.[gameState?.currentPlayerIndex]?.playArea?.map((c: any, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={i}
                          className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-sm"
                        >
                          {c.name}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hand Area */}
              <div className="bg-black/30 p-6 rounded-2xl border border-white/5 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm uppercase tracking-wider text-white/50 font-semibold flex items-center gap-2">
                    <Hand size={16} /> Your Hand
                  </h3>
                  <div className="flex gap-4 text-sm text-white/50">
                    <span>Deck: {myPlayer?.deckSize || 0}</span>
                    <span>Discard: {myPlayer?.discardSize || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {myPlayer?.hand?.map((c: any, i: number) => (
                    <motion.div
                      layoutId={`card-${i}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      whileHover={{ y: -10, scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      key={i}
                      onClick={() => isMyTurn && handlePlayCard(i)}
                      className={`w-28 h-40 bg-gradient-to-b from-white/15 to-white/5 border border-white/20 rounded-xl p-3 flex flex-col justify-between cursor-pointer shadow-lg backdrop-blur-sm ${isMyTurn ? 'hover:border-purple-400/50 hover:shadow-purple-500/20' : 'opacity-70 cursor-not-allowed'}`}
                    >
                      <div className="font-semibold text-center text-sm leading-tight">{c.name}</div>
                      <div className="text-xs text-white/50 text-center uppercase tracking-wider">{c.types?.join(' ')}</div>
                      {c.cost !== undefined && (
                        <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold text-xs">
                          <Coins size={10} /> {c.cost}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {(!myPlayer?.hand || myPlayer.hand.length === 0) && (
                    <div className="text-white/30 text-center w-full py-8 italic">Your hand is empty</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
