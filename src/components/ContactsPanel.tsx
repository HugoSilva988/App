import React, { useState } from 'react';
import { Users, Search, Plus, Trash2, MessageSquare, Phone, Video, ShieldAlert } from 'lucide-react';
import { Contact, UserProfile } from '../types';

interface ContactsPanelProps {
  myNick: string;
  contacts: Contact[];
  onlineUsers: UserProfile[];
  onAddContact: (nick: string, name: string, avatar: string, bio: string) => void;
  onRemoveContact: (nick: string) => void;
  onToggleBlock: (nick: string) => void;
  onStartChat: (nick: string) => void;
  onStartCall: (nick: string, type: 'voice' | 'video') => void;
}

export default function ContactsPanel({
  myNick,
  contacts,
  onlineUsers,
  onAddContact,
  onRemoveContact,
  onToggleBlock,
  onStartChat,
  onStartCall
}: ContactsPanelProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.filter((u: UserProfile) => u.nick.toLowerCase() !== myNick.toLowerCase()));
      } else {
        setError(data.error || 'Falha ao buscar usuários.');
      }
    } catch (e) {
      setError('Erro de rede ao conectar ao servidor.');
    } finally {
      setIsSearching(false);
    }
  };

  // Divide contacts into Online and Offline
  const onlineContacts = contacts.filter(c => 
    !c.isBlocked && 
    onlineUsers.some(u => u.nick.toLowerCase() === c.nick.toLowerCase() && u.status !== 'offline')
  );

  const offlineContacts = contacts.filter(c => 
    !c.isBlocked && 
    !onlineUsers.some(u => u.nick.toLowerCase() === c.nick.toLowerCase() && u.status !== 'offline')
  );

  const blockedContacts = contacts.filter(c => c.isBlocked);

  return (
    <div className="flex-1 bg-[#0b0d10] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-16 md:pb-8 font-sans">
      
      {/* HEADER */}
      <div className="mb-6 border-b border-[#1f2838] pb-5">
        <h2 className="text-xl font-extrabold flex items-center space-x-2">
          <Users className="w-5.5 h-5.5 text-blue-400 shrink-0" />
          <span>Sua Rede de Contatos</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">Busque novos participantes ou gerencie seus amigos para comunicação privada.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Search Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#10141d] border border-[#1e2736] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Buscar Novos Contatos</h3>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: @joao, pedro, etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {error && <p className="text-[10px] text-red-400 font-semibold">{error}</p>}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isSearching ? (
                <p className="text-xs text-gray-400 text-center py-2">Pesquisando rede...</p>
              ) : searchResults.length > 0 ? (
                searchResults.map((u) => {
                  const isAlreadyAdded = contacts.some(c => c.nick.toLowerCase() === u.nick.toLowerCase());
                  return (
                    <div
                      key={u.nick}
                      className="flex items-center justify-between p-2 hover:bg-[#1a212e] rounded-xl border border-[#1e2634]"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{u.name}</p>
                          <p className="text-[10px] text-blue-400 font-semibold truncate">{u.nick}</p>
                        </div>
                      </div>

                      {isAlreadyAdded ? (
                        <span className="text-[9px] bg-[#1a212e] border border-[#2d3a4e] text-gray-500 px-2 py-0.5 rounded-full font-bold shrink-0">
                          Adicionado
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onAddContact(u.nick, u.name, u.avatar, u.bio);
                            // refresh visual status
                            setSearchResults([]);
                            setSearchQuery('');
                          }}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer focus:outline-none shrink-0"
                          title="Adicionar Amigo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : searchQuery ? (
                <p className="text-xs text-gray-500 text-center py-2">Nenhum perfil encontrado.</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Contacts Lists */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#10141d] border border-[#1e2736] rounded-2xl p-5 shadow-sm space-y-5">
            
            {/* Online Contacts Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Online ({onlineContacts.length})</h4>
              
              {onlineContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {onlineContacts.map((c) => (
                    <div 
                      key={c.nick}
                      className="flex items-center justify-between p-3 bg-[#131924]/60 border border-[#1e2635] hover:border-blue-500/20 rounded-xl"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative shrink-0">
                          <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#131924] rounded-full" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-gray-200">{c.name}</p>
                          <p className="text-[10px] text-blue-400 font-semibold truncate">{c.nick}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => onStartChat(c.nick)}
                          className="p-1.5 hover:bg-[#1a2333] text-blue-400 rounded-lg cursor-pointer transition-colors"
                          title="Chat Privado"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onStartCall(c.nick, 'voice')}
                          className="p-1.5 hover:bg-[#1a2333] text-gray-400 hover:text-white rounded-lg cursor-pointer transition-colors"
                          title="Ligar"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveContact(c.nick)}
                          className="p-1.5 hover:bg-[#1a2333] text-gray-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Nenhum amigo online.</p>
              )}
            </div>

            {/* Offline Contacts Section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Todos ({offlineContacts.length})</h4>
              
              {offlineContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {offlineContacts.map((c) => (
                    <div 
                      key={c.nick}
                      className="flex items-center justify-between p-3 bg-[#131924]/60 border border-[#1e2635] rounded-xl"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-gray-200">{c.name}</p>
                          <p className="text-[10px] text-gray-500 font-semibold truncate">{c.nick}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => onStartChat(c.nick)}
                          className="p-1.5 hover:bg-[#1a2333] text-blue-400 rounded-lg cursor-pointer"
                          title="Chat Privado"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleBlock(c.nick)}
                          className="p-1.5 hover:bg-[#1a2333] text-gray-500 hover:text-yellow-500 rounded-lg cursor-pointer"
                          title="Bloquear"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRemoveContact(c.nick)}
                          className="p-1.5 hover:bg-[#1a2333] text-gray-500 hover:text-red-400 rounded-lg cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Lista vazia.</p>
              )}
            </div>

            {/* Blocked Section */}
            {blockedContacts.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#1e2635]">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Bloqueados ({blockedContacts.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {blockedContacts.map((c) => (
                    <div 
                      key={c.nick}
                      className="flex items-center justify-between p-3 bg-red-950/10 border border-red-500/20 rounded-xl"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-red-300">{c.name}</p>
                          <p className="text-[10px] text-red-500 font-semibold truncate">{c.nick}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleBlock(c.nick)}
                        className="px-3 py-1 bg-[#171d2b] border border-[#2b3a50] text-[10px] font-bold rounded-xl text-gray-300 hover:text-white cursor-pointer"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
