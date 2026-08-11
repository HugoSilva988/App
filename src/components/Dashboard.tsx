import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LocalDB } from '../services/localDB';
import { 
  Plus, 
  PhoneCall, 
  ShieldCheck, 
  Sparkles, 
  Radio, 
  HelpCircle, 
  ChevronRight, 
  FolderLock,
  Volume2,
  Users2,
  Trash2,
  Heart,
  Smile,
  Compass,
  MessageSquare,
  Info,
  Phone,
  Settings,
  Users,
  Search
} from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';

interface DashboardProps {
  user: UserProfile;
  onlineUsers: UserProfile[];
  conversations: any[];
  onStartChat: (nick: string) => void;
  onStartCall: (nick: string, type: 'voice' | 'video') => void;
  onOpenGroups: () => void;
  onDeleteConversation?: (targetId: string) => void;
  setView: (view: 'home' | 'chats' | 'calls' | 'contacts' | 'communities' | 'notifications' | 'reports' | 'settings' | 'about') => void;
}

export default function Dashboard({
  user,
  onlineUsers,
  conversations,
  onStartChat,
  onStartCall,
  onOpenGroups,
  onDeleteConversation,
  setView
}: DashboardProps) {
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Local state for active conversation card deletions
  const [deletingNicks, setDeletingNicks] = useState<string[]>([]);

  // Discovery Filter States loaded from LocalDB if available
  const [selectedInterest, setSelectedInterest] = useState<'diversão' | 'relacionamento' | 'outras'>(() => {
    try {
      const prefs = LocalDB.getDiscoveryPrefs(user.nick);
      return prefs.interest;
    } catch (e) {
      return 'diversão';
    }
  });
  const [selectedGender, setSelectedGender] = useState<'homem' | 'mulher'>(() => {
    try {
      const prefs = LocalDB.getDiscoveryPrefs(user.nick);
      return prefs.gender;
    } catch (e) {
      return 'mulher';
    }
  });

  const [tempInterest, setTempInterest] = useState<'diversão' | 'relacionamento' | 'outras'>(selectedInterest);
  const [tempGender, setTempGender] = useState<'homem' | 'mulher'>(selectedGender);

  // Save discovery preferences to LocalDB when changed
  useEffect(() => {
    try {
      LocalDB.saveDiscoveryPrefs(user.nick, {
        interest: selectedInterest,
        gender: selectedGender
      });
    } catch (e) {
      console.error("Failed to save discovery preferences:", e);
    }
  }, [selectedInterest, selectedGender, user.nick]);

  const handleLocalDeleteConversation = (e: React.MouseEvent, nick: string) => {
    e.stopPropagation();
    setDeletingNicks(prev => [...prev, nick]);
    setTimeout(() => {
      onDeleteConversation?.(nick);
      setDeletingNicks(prev => prev.filter(n => n !== nick));
    }, 900);
  };

  // Time-based greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Bom dia';
    if (hr < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.filter((u: UserProfile) => u.nick !== user.nick));
      }
    } catch (e) {
      console.error('Erro ao pesquisar usuários:', e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0A0A0B] text-[#f3f4f6] overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8 font-sans">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 tracking-wider uppercase mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            <span>Mestre Secure Node Ativo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6]">
            {getGreeting()}, {user.name}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Sua identidade segura está ativa com @nick exclusivo <span className="text-indigo-400 font-semibold">{user.nick}</span>
          </p>
        </div>

        {/* Quick action controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <button 
            id="dash-new-chat-btn"
            onClick={() => setShowSearch(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Conversa</span>
          </button>
          <button 
            id="dash-groups-btn"
            onClick={onOpenGroups}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-200 rounded-xl text-sm font-semibold cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <Users2 className="w-4 h-4" />
            <span>Comunidades</span>
          </button>
        </div>
      </div>

      {/* SEARCH DIRECT MODAL OVERLAY */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161A] border border-white/5 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn">
            <h3 className="text-lg font-bold mb-1">Pesquisar por @nick</h3>
            <p className="text-xs text-gray-400 mb-4">Insira o apelido exato ou nome para iniciar uma conversa privada criptografada.</p>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Ex: @admin, joao, etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#0F0F12] border border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-[#f3f4f6]"
                autoFocus
              />
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {isSearching ? (
                <p className="text-xs text-gray-400 text-center py-2">Pesquisando rede...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <button
                    key={u.nick}
                    onClick={() => {
                      onStartChat(u.nick);
                      setShowSearch(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl text-left border border-transparent hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{u.name}</p>
                        <p className="text-xs text-indigo-400 font-semibold truncate">{u.nick}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                  </button>
                ))
              ) : searchQuery ? (
                <p className="text-xs text-gray-400 text-center py-2">Nenhum resultado encontrado.</p>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-white/5 pt-4">
              <button 
                onClick={() => {
                  setShowSearch(false);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-gray-400 hover:text-white cursor-pointer px-4 py-2 hover:bg-white/5 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Info Cards, Online Users, Recent Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Online Presence & Recent Chats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Connection Discovery / Filtro de Descoberta Card */}
          <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-4 border-b border-white/5 gap-3">
              <div>
                <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                  <span>Descobrir Conexões</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Filtre pessoas para diversão, namoro sério ou networking seguro.
                </p>
              </div>
              
              {/* Reset to see all or quick helper */}
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 self-start sm:self-center">
                E2EE Ativo
              </span>
            </div>

            {/* Selection box container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Interests Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                  O que você quer?
                </label>
                <div className="flex flex-col space-y-1.5">
                  <div className="grid grid-cols-3 gap-1 bg-[#060608] border border-white/5 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setTempInterest('diversão')}
                      className={`text-[10px] py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        tempInterest === 'diversão'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      🎉 Diversão
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempInterest('relacionamento')}
                      className={`text-[10px] py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        tempInterest === 'relacionamento'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      ❤️ Namoro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempInterest('outras')}
                      className={`text-[10px] py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        tempInterest === 'outras'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      💼 Outros
                    </button>
                  </div>
                </div>
              </div>

              {/* Gender Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                  Qual é a coisa que você quer?
                </label>
                <div className="grid grid-cols-2 gap-1 bg-[#060608] border border-white/5 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setTempGender('homem')}
                    className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      tempGender === 'homem'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🙋‍♂️ Homem</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempGender('mulher')}
                    className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      tempGender === 'mulher'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🙋‍♀️ Mulher</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso / Warning Banner & Action Button */}
            <div className="bg-[#16161A]/80 border border-indigo-500/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-start space-x-2.5">
                <div className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed max-w-md">
                  <span className="font-bold text-gray-200 block">Filtro de Descoberta Personalizado</span>
                  Selecione as opções acima e clique no botão para aplicar os filtros de busca e persistir as preferências no seu LocalDB.
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedInterest(tempInterest);
                  setSelectedGender(tempGender);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shrink-0 hover:shadow-lg hover:shadow-indigo-600/10 active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar Conexões</span>
              </button>
            </div>

            {/* Matches list section */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 tracking-wide uppercase mb-3 flex items-center justify-between">
                <span>Pessoas que buscam o mesmo ({
                  onlineUsers.filter(u => 
                    u.nick.toLowerCase() !== user.nick.toLowerCase() && 
                    u.nick !== '@admin' && 
                    u.gender === selectedGender && 
                    u.interest === selectedInterest
                  ).length
                })</span>
              </h4>

              {(() => {
                const matches = onlineUsers.filter(u => 
                  u.nick.toLowerCase() !== user.nick.toLowerCase() && 
                  u.nick !== '@admin' && 
                  u.gender === selectedGender && 
                  u.interest === selectedInterest
                );

                if (matches.length > 0) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {matches.map((u) => (
                        <div
                          key={u.nick}
                          className="bg-[#121216] border border-white/5 hover:border-indigo-500/25 rounded-xl p-3.5 flex flex-col justify-between transition-all group hover:bg-[#141419]"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="relative shrink-0">
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-11 h-11 rounded-full object-cover border border-white/5 group-hover:border-indigo-500/20"
                                referrerPolicy="no-referrer"
                              />
                              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#121216] rounded-full ${
                                u.status === 'online' ? 'bg-emerald-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-all">
                                  {u.name}
                                </h5>
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {u.nick}
                                </span>
                              </div>
                              {u.customStatus && (
                                <p className="text-[10px] text-indigo-400 italic truncate mb-1">
                                  "{u.customStatus}"
                                </p>
                              )}
                              <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                                {u.bio || 'Sem biografia disponível.'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              {selectedInterest === 'diversão' && (
                                <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/15">
                                  🎉 Diversão
                                </span>
                              )}
                              {selectedInterest === 'relacionamento' && (
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-500/15">
                                  ❤️ Namoro Sério
                                </span>
                              )}
                              {selectedInterest === 'outras' && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/15">
                                  💼 Outras Coisas
                                </span>
                              )}
                              
                              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-500/15">
                                {selectedGender === 'homem' ? '🙋‍♂️ Homem' : '🙋‍♀️ Mulher'}
                              </span>
                            </div>

                            <button
                              onClick={() => onStartChat(u.nick)}
                              className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-indigo-600/15"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Conversar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 px-4 bg-[#0A0A0B]/50 border border-dashed border-white/5 rounded-xl text-center">
                      <p className="text-sm font-semibold text-gray-400 mb-1">
                        Ninguém encontrado para estes filtros
                      </p>
                      <p className="text-xs text-gray-500 max-w-xs">
                        Nossos usuários estão em constantes conexões criptografadas. Tente mudar o gênero ou o interesse para ver mais pessoas!
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
          
          {/* Online horizontal slider */}
          <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span>Pessoas Conectadas Agora ({onlineUsers.filter(u => u.nick !== user.nick).length})</span>
            </h3>

            {onlineUsers.filter(u => u.nick !== user.nick).length > 0 ? (
              <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-none">
                {onlineUsers.filter(u => u.nick !== user.nick).map((u) => (
                  <button
                    key={u.nick}
                    onClick={() => onStartChat(u.nick)}
                    className="flex flex-col items-center space-y-1.5 min-w-[70px] hover:scale-105 transition-all focus:outline-none cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={u.avatar} 
                        alt={u.name} 
                        className="w-12 h-12 rounded-full border border-indigo-500/15 hover:border-indigo-500/50 object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0F0F12] rounded-full" />
                    </div>
                    <span className="text-xs font-medium truncate max-w-[75px] text-gray-300">{u.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/5">
                <p className="text-xs text-gray-500">Nenhum outro usuário online. Abra o Mestre Chat em outra aba do navegador para testar!</p>
              </div>
            )}
          </div>

          {/* Recent Conversations */}
          <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Conversas Recentes
              </h3>
              <button 
                onClick={() => setShowSearch(true)} 
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                Ver tudo
              </button>
            </div>

            {conversations.length > 0 ? (
              <div className="space-y-2.5">
                {conversations.map((conv) => {
                  const isDeleting = deletingNicks.includes(conv.nick);
                  return (
                    <motion.div
                      key={conv.nick}
                      onClick={() => onStartChat(conv.nick)}
                      initial={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                      animate={
                        isDeleting
                          ? { 
                              opacity: 0, 
                              scale: 0.9, 
                              filter: 'blur(8px)', 
                              y: -20,
                              transition: { duration: 0.8, ease: "easeOut" }
                            }
                          : { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }
                      }
                      className="group relative flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 pr-8">
                        <div className="relative shrink-0">
                          <img 
                            src={conv.avatar} 
                            alt={conv.name} 
                            className="w-10 h-10 rounded-full border border-white/5 object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          {onlineUsers.some(u => u.nick === conv.nick) && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#131924] rounded-full" />
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-bold text-gray-200 truncate">{conv.name}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">Clique para ver mensagens criptografadas</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 space-y-1">
                        <span className="text-[10px] text-gray-500">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Secure sanitization / Deletion button on card hover */}
                      {onDeleteConversation && (
                        <button
                          onClick={(e) => handleLocalDeleteConversation(e, conv.nick)}
                          className="opacity-0 group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 bg-red-950/80 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white p-2 rounded-xl transition-all z-20 cursor-pointer focus:outline-none shadow-lg"
                          title="Excluir e limpar conversa permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Secure disintegration particles overlay */}
                      {isDeleting && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 flex items-center justify-center bg-black/40">
                          {Array.from({ length: 14 }).map((_, idx) => {
                            const angle = (idx / 14) * 2 * Math.PI;
                            const distance = 40 + (idx * 5) % 35;
                            const x = Math.cos(angle) * distance;
                            const y = -15 - Math.sin(Math.abs(angle)) * distance;
                            const size = 3 + (idx % 3);
                            const delay = (idx % 5) * 0.05;
                            const colors = ['#EF4444', '#EC4899', '#6366F1'];
                            const color = colors[idx % colors.length];
                            return (
                              <motion.span
                                key={idx}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ 
                                  x, 
                                  y, 
                                  opacity: 0, 
                                  scale: 0 
                                }}
                                transition={{ 
                                  duration: 0.8, 
                                  delay,
                                  ease: "easeOut" 
                                }}
                                className="absolute rounded-full"
                                style={{
                                  width: size,
                                  height: size,
                                  backgroundColor: color,
                                  boxShadow: `0 0 6px ${color}`
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-500 mb-3 border border-white/5">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-400">Nenhuma conversa recente</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">Adicione contatos ou busque pelo @nick para iniciar conversas criptografadas ponta a ponta.</p>
                <button
                  id="dash-start-first-chat-btn"
                  onClick={() => setShowSearch(true)}
                  className="mt-4 px-4 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-500/20 cursor-pointer transition-all"
                >
                  Iniciar Conversa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Platform Security Cards & Info */}
        <div className="space-y-6">
          
          {/* E2EE Info Block */}
          <div className="bg-[#0F0F12] border border-indigo-500/15 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
            
            <div className="flex items-center space-x-2.5 text-indigo-400 mb-3.5">
              <ShieldCheck className="w-5.5 h-5.5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Privacidade E2EE</h4>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              No Mestre Chat, suas mensagens são criptografadas localmente com <strong>AES-GCM (256 bits)</strong> antes de sair do seu navegador. 
            </p>

            <ul className="mt-4 space-y-2.5 text-xs">
              <li className="flex items-start space-x-2">
                <FolderLock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">As chaves de sessão nunca são compartilhadas com o servidor em formato texto.</span>
              </li>
              <li className="flex items-start space-x-2">
                <FolderLock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">O servidor atua apenas como relé temporário para entrega e sinais.</span>
              </li>
              <li className="flex items-start space-x-2">
                <FolderLock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">As chaves privadas são armazenadas na sua área de armazenamento criptográfica do navegador.</span>
              </li>
            </ul>
          </div>

          {/* Test guidelines Card */}
          <div className="bg-[#0F0F12] border border-yellow-500/15 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center space-x-2.5 text-yellow-500 mb-3">
              <Sparkles className="w-5.5 h-5.5" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Como Testar a Rede?</h4>
            </div>
            
            <p className="text-xs text-gray-400 leading-relaxed">
              Sendo um app completo em tempo real, você pode simular a interação perfeitamente:
            </p>

            <ol className="mt-3.5 space-y-2.5 text-xs text-gray-300 list-decimal pl-4">
              <li>Abra esta mesma página em outra aba do seu navegador.</li>
              <li>Crie uma nova conta com outro nick (ex: <code className="text-indigo-400">@alice</code>).</li>
              <li>Procure por ela aqui usando o botão <strong>Nova Conversa</strong>.</li>
              <li>Mande mensagens em tempo real e faça chamadas de áudio e vídeo instantâneas com reações e respostas!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
