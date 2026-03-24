import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

import { Coins, Hand, Play, ShoppingCart, User, SkipForward, Sword, LogOut } from 'lucide-react';
import { Card } from '../types';


const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
const socket: Socket = socketUrl ? io(socketUrl) : io();

export const GameUI: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameState, setGameState] = useState<any>(null);
  const [name] = useState<string>(() => `Player_${Math.floor(Math.random() * 10000)}`);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rooms, setRooms] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const connected = isConnected;
    if (socket.connected && !connected) {
      console.log('Already connected to socket server');
      socket.emit('set_name', name);
    } else if (socket.connected) {
      socket.emit('set_name', name);
    }

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      // Auto-set the generated name when connected
      socket.emit('set_name', randomName);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    socket.on('error', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
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
      socket.off('disconnect');
      socket.off('error');
      socket.off('rooms_list');
      socket.off('room_created');
      socket.off('game_created');
      socket.off('game_state');
    };
  }, []);

  const handleCreateRoom = () => {
    socket.emit('create_room');
  };

  const handleJoinRoom = (id: string) => {
    socket.emit('join_room', id);
    setRoomId(id);
  };

  const handleLeaveRoom = () => {
    // There isn't an explicit leave room event yet, so we just clear local state for now
    // or we could add socket.emit('leave_room', roomId); if the backend supports it.
    setRoomId(null);
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

  const myPlayer = gameState?.players?.find((/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
p: any) => p.name === name);
  const isMyTurn = gameState?.players?.[gameState?.currentPlayerIndex]?.name === name;
  const currentRoom = rooms.find(r => r.id === roomId);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white min-h-[85vh] flex flex-col relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-red-500/90 text-white px-6 py-3 text-center font-medium shadow-lg backdrop-blur-md z-50 flex items-center justify-center gap-2"
          >
            <span className="bg-white/20 p-1 rounded-full"><Sword size={16} className="text-white"/></span>
            {errorMsg}
          </motion.div>
        )}

        {/* Header */}
        <header className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 drop-shadow-sm">
              DOMINION
            </h1>
            <div className={`w-3 h-3 rounded-full ml-2 transition-colors duration-500 ${isConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`} title={isConnected ? "Server Connected" : "Server Disconnected"} />
          </div>
          <div className="flex items-center gap-4">
            {name && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner">
                    <User size={14} className="text-white/50" />
                    <span className="text-sm font-medium text-white/90">{name}</span>
                </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col p-6 md:p-8 z-10">
          {!gameId ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full gap-8">
              {!roomId ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col gap-8 bg-white/5 p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-white/90">Welcome to the Realm</h2>
                    <p className="text-white/50 text-sm">Create a new adventure or join an existing party.</p>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    disabled={!isConnected}
                    className="group relative w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all text-xl font-bold shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_40px_rgba(147,51,234,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        <Sword className="group-hover:rotate-12 transition-transform" /> Create New Room
                    </span>
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-white/30 text-sm font-medium uppercase tracking-wider">or join available</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {rooms.length === 0 ? (
                      <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                          <p className="text-white/40 font-medium">No active rooms found</p>
                          <p className="text-white/20 text-sm mt-1">Be the first to create one!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {rooms.map((room) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={room.id}
                            className="flex justify-between items-center p-4 rounded-2xl bg-black/30 hover:bg-black/50 border border-white/5 hover:border-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <span className="text-blue-300 font-bold">{room.players.length}</span>
                                </div>
                                <div>
                                    <p className="text-white/80 font-medium text-sm">Room <span className="text-white/50">#{room.id.slice(0, 6)}</span></p>
                                    <p className="text-xs text-white/40 mt-0.5">Capacity: {room.players.length}/4</p>
                                </div>
                            </div>
                            <button
                              onClick={() => handleJoinRoom(room.id)}
                              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-blue-600 text-sm font-medium transition-colors border border-white/10 group-hover:border-blue-500/50"
                            >
                              Join
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-lg flex flex-col gap-8 bg-white/5 p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start">
                      <div className="space-y-1">
                          <h2 className="text-2xl font-bold text-white/90 flex items-center gap-2">
                              Lobby <span className="text-white/40 font-mono text-lg">#{roomId.slice(0, 6)}</span>
                          </h2>
                          <p className="text-white/50 text-sm">Waiting for players to join...</p>
                      </div>
                      <button
                        onClick={handleLeaveRoom}
                        className="p-2 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-lg transition-colors"
                        title="Leave Room"
                      >
                          <LogOut size={18} />
                      </button>
                  </div>

                  <div className="flex flex-col gap-3 bg-black/40 rounded-2xl p-5 border border-white/5">
                    <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-1">Adventurers ({currentRoom?.players?.length || 0}/4)</h3>

                    <div className="space-y-2">
                        {currentRoom?.players?.map((/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
p: any, index: number) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={p.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-white/10">
                                <User size={14} className="text-white/70" />
                            </div>
                            <span className="font-medium text-white/90">{p.name} {p.name === name && <span className="text-white/30 text-xs ml-1">(You)</span>}</span>

                            {p.id === currentRoom?.hostId && (
                            <span className="ml-auto text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md border border-amber-500/30 font-medium flex items-center gap-1">
                                👑 Host
                            </span>
                            )}
                        </motion.div>
                        ))}
                    </div>

                    {(!currentRoom?.players || currentRoom.players.length === 0) && (
                      <div className="flex justify-center items-center py-6">
                          <div className="animate-pulse flex gap-1">
                              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                              <div className="w-2 h-2 bg-white/30 rounded-full animation-delay-200"></div>
                              <div className="w-2 h-2 bg-white/30 rounded-full animation-delay-400"></div>
                          </div>
                      </div>
                    )}
                  </div>

                  {currentRoom?.hostId === socket.id ? (
                    <button
                      onClick={handleStartGame}
                      disabled={!isConnected || (currentRoom?.players?.length || 0) < 1}
                      className="group w-full px-6 py-4 rounded-xl font-bold transition-all shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      <Play className="group-hover:translate-x-1 transition-transform" fill="currentColor" size={18} />
                      Start Adventure
                    </button>
                  ) : (
                    <div className="text-center text-white/50 py-4 font-medium bg-black/20 rounded-xl border border-white/5 flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full"></div>
                        Waiting for host to start
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full gap-6">
              {/* Opponents Area */}
              <div className="flex gap-4 p-4 bg-black/40 rounded-3xl border border-white/5 overflow-x-auto custom-scrollbar">
                {gameState?.players?.map((/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
p: any, i: number) => {
                  if (p.name === name) return null;
                  const isActive = i === gameState.currentPlayerIndex;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`min-w-[160px] p-4 rounded-2xl border flex flex-col gap-3 transition-colors ${isActive ? 'bg-purple-900/40 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-purple-500/30' : 'bg-white/10'}`}>
                            <User size={14} className={isActive ? 'text-purple-300' : 'text-white/50'} />
                        </div>
                        <span className={`font-semibold truncate text-sm ${isActive ? 'text-purple-100' : 'text-white/80'}`}>{p.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-black/30 p-2 rounded-xl">
                        <div className="flex flex-col items-center">
                            <span className="text-white/40 font-medium">Hand</span>
                            <span className="text-white/80 font-bold">{p.handSize}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-white/40 font-medium">Deck</span>
                            <span className="text-white/80 font-bold">{p.deckSize}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Supply and Play Area */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Supply */}
                <div className="bg-black/40 p-6 md:p-8 rounded-3xl border border-white/5 overflow-y-auto max-h-[500px] custom-scrollbar">
                  <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-6 flex items-center gap-2">
                    <ShoppingCart size={16} /> The Market
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {gameState?.supply?.map((s: any, i: number) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        key={s.name}
                        onClick={() => handleBuyCard(s.name)}
                        className={`relative group flex flex-col items-center justify-between p-4 h-[140px] rounded-2xl border transition-all ${
                            s.count === 0
                                ? 'opacity-40 border-white/5 bg-black/60 grayscale cursor-not-allowed'
                                : 'cursor-pointer bg-gradient-to-b from-white/10 to-white/5 border-white/10 hover:border-amber-400/50 hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)] hover:-translate-y-1'
                        }`}
                      >
                        <span className="font-bold text-sm text-center leading-tight text-white/90">{s.name}</span>

                        <div className="mt-auto pt-3 flex flex-col items-center w-full gap-2">
                            <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm bg-black/50 px-3 py-1.5 rounded-xl border border-amber-400/20 w-full justify-center">
                                <Coins size={14} /> {s.cost}
                            </div>
                        </div>

                        {s.count > 0 && (
                            <div className="absolute -top-2 -right-2 bg-slate-800 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-black shadow-lg">
                                {s.count}
                            </div>
                        )}
                        {s.count === 0 && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-[1px]">
                                 <span className="bg-red-500/80 text-white text-xs font-bold px-2 py-1 rounded rotate-[-15deg] border border-red-400">SOLD OUT</span>
                             </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Info Panel & Play Area */}
                <div className="flex flex-col gap-6">
                  <div className={`p-6 rounded-3xl border flex flex-col gap-5 transition-colors ${isMyTurn ? 'bg-gradient-to-b from-purple-900/40 to-black/40 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'bg-black/40 border-white/5'}`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                        <Sword size={16} className={isMyTurn ? 'text-purple-400' : 'text-white/40'} />
                        <span className={isMyTurn ? 'text-purple-100' : 'text-white/50'}>{isMyTurn ? 'Your Turn' : "Opponent's Turn"}</span>
                        </h3>
                        <div className="text-xs font-bold px-3 py-1 bg-black/50 rounded-full border border-white/10 text-white/70 capitalize">
                            {gameState?.phase?.toLowerCase()} Phase
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5">
                        <span className="text-blue-400/80 text-[10px] uppercase tracking-widest font-bold mb-1">Actions</span>
                        <span className="text-2xl font-black text-blue-100">{gameState?.actions || 0}</span>
                      </div>
                      <div className="bg-black/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5">
                        <span className="text-emerald-400/80 text-[10px] uppercase tracking-widest font-bold mb-1">Buys</span>
                        <span className="text-2xl font-black text-emerald-100">{gameState?.buys || 0}</span>
                      </div>
                      <div className="bg-black/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]">
                        <span className="text-amber-500/80 text-[10px] uppercase tracking-widest font-bold mb-1">Coins</span>
                        <span className="text-2xl font-black text-amber-400">{gameState?.coins || 0}</span>
                      </div>
                    </div>

                    {isMyTurn && (
                      <button
                        onClick={handleNextPhase}
                        className="w-full py-4 mt-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 font-bold transition-all flex items-center justify-center gap-2 hover:border-white/30 active:scale-[0.98]"
                      >
                        <SkipForward size={18} /> Next Phase
                      </button>
                    )}
                  </div>

                  <div className="flex-1 bg-black/40 p-6 rounded-3xl border border-white/5 overflow-y-auto">
                    <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold mb-4 flex items-center gap-2">
                      <Play size={16} /> Play Area
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {gameState?.players?.[gameState?.currentPlayerIndex]?.playArea?.map((c: any, i: number) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          key={i}
                          className="px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-xl text-sm font-medium shadow-sm"
                        >
                          {c.name}
                        </motion.div>
                      ))}
                      {(!gameState?.players?.[gameState?.currentPlayerIndex]?.playArea || gameState?.players?.[gameState?.currentPlayerIndex]?.playArea.length === 0) && (
                          <div className="w-full text-center py-8 text-white/20 text-sm font-medium border border-white/5 border-dashed rounded-xl">No cards in play</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hand Area */}
              <div className="bg-black/50 p-6 md:p-8 rounded-3xl border border-white/5 mt-auto relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                <div className="flex justify-between items-end mb-6">
                  <h3 className="text-sm uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                    <Hand size={16} /> Your Hand
                  </h3>
                  <div className="flex gap-4 text-sm font-medium bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <span className="text-white/60">Deck: <span className="text-white">{myPlayer?.deckSize || 0}</span></span>
                    <div className="w-px h-4 bg-white/10 self-center"></div>
                    <span className="text-white/60">Discard: <span className="text-white">{myPlayer?.discardSize || 0}</span></span>
                  </div>
                </div>


                <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start min-h-[160px]">
                  {myPlayer?.hand?.map((c: Card, i: number) => (
                    <motion.div
                      layoutId={`card-${i}`}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      whileHover={{ y: -15, scale: 1.05, zIndex: 10 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      key={i}
                      onClick={() => isMyTurn && handlePlayCard(i)}
                      className={`relative w-28 md:w-32 h-40 md:h-48 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 rounded-2xl p-3 md:p-4 flex flex-col justify-between shadow-xl ${
                          isMyTurn
                            ? 'cursor-pointer hover:border-purple-400 hover:shadow-[0_10px_30px_rgba(168,85,247,0.3)]'
                            : 'opacity-80 cursor-not-allowed grayscale-[0.2]'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

                      <div className="font-bold text-center text-sm md:text-base leading-tight text-white/90 z-10">{c.name}</div>

                      <div className="z-10">
                          <div className="text-[10px] text-white/40 text-center uppercase tracking-widest font-bold mb-2">
                              {c.types?.join(' ')}
                          </div>
                          {c.cost !== undefined && (
                            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-xs bg-black/60 py-1.5 rounded-lg border border-white/5">
                              <Coins size={12} /> {c.cost}
                            </div>
                          )}
                      </div>
                    </motion.div>
                  ))}
                  {(!myPlayer?.hand || myPlayer.hand.length === 0) && (
                    <div className="text-white/30 text-center w-full py-12 font-medium border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2">
                        <Hand className="text-white/20" size={32} />
                        Your hand is empty
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
