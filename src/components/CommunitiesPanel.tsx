import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, Plus, Sparkles, MessageSquare, LogOut, Info, Check, Trash2, Send } from 'lucide-react';
import { GroupInfo, ChatMessage } from '../types';
import { LocalDB } from '../services/localDB';
import { wsService } from '../services/websocketService';

interface CommunitiesPanelProps {
  myNick: string;
  groups: GroupInfo[];
  onJoinGroup: (group: GroupInfo) => void;
  onLeaveGroup: (groupId: string) => void;
  onStartGroupChat: (groupId: string) => void;
  onCreateGroup: (group: GroupInfo) => void;
  onDeleteGroup: (groupId: string) => void;
}

export default function CommunitiesPanel({
  myNick,
  groups,
  onJoinGroup,
  onLeaveGroup,
  onStartGroupChat,
  onCreateGroup,
  onDeleteGroup
}: CommunitiesPanelProps) {
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [groupJoinId, setGroupJoinId] = useState('');

  // Custom Confirmation Dialog state
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'leave' | 'delete';
    groupId: string;
    groupName: string;
  } | null>(null);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [groupRules, setGroupRules] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // General chat states inside group cards
  const [activeChatGroupId, setActiveChatGroupId] = useState<string | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [localGroupMessages, setLocalGroupMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load/reload messages for a specific group
  const loadGroupMessages = (groupId: string) => {
    const msgs = LocalDB.getMessages(myNick, groupId);
    // Keep the last 20 messages for display density
    setLocalGroupMessages(msgs.slice(-20));
  };

  const toggleGroupChat = (groupId: string) => {
    if (activeChatGroupId === groupId) {
      setActiveChatGroupId(null);
      setLocalGroupMessages([]);
    } else {
      setActiveChatGroupId(groupId);
      loadGroupMessages(groupId);
    }
  };

  const handleSendGroupText = async (groupId: string) => {
    if (!chatMessageText.trim()) return;
    
    // Send via websocket
    const sent = await wsService.sendMessage(groupId, chatMessageText.trim(), 'text', undefined, undefined, true);
    if (sent) {
      // Refresh local messages right after sending
      setTimeout(() => {
        loadGroupMessages(groupId);
      }, 50);
      setChatMessageText('');
    } else {
      alert('Falha ao enviar mensagem. Verifique a sua conexão.');
    }
  };

  const handleDeleteGroup = async (groupId: string, name: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: myNick })
      });

      if (response.ok) {
        alert('Comunidade deletada com sucesso!');
        onDeleteGroup(groupId);
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`${data.error || 'Erro ao deletar o grupo.'} Removendo localmente para você...`);
        onDeleteGroup(groupId);
      }
    } catch (err) {
      alert('Erro de conexão ao deletar o grupo. Removendo localmente para você...');
      onDeleteGroup(groupId);
    }
  };

  // Real-time messages sync
  useEffect(() => {
    const handleUpdate = (_event: string, data: any) => {
      if (activeChatGroupId && (data.targetId === activeChatGroupId || !data.targetId)) {
        loadGroupMessages(activeChatGroupId);
      }
    };
    wsService.on('messages_updated', handleUpdate);
    return () => {
      wsService.off('messages_updated', handleUpdate);
    };
  }, [activeChatGroupId]);

  // Scroll to bottom when message log updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localGroupMessages]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim() || 'Comunidade Mestre Chat',
          avatar: groupAvatar.trim(),
          creator: myNick,
          rules: groupRules.trim() || 'Respeite todos os membros.'
        })
      });

      const data = await response.json();
      if (response.ok) {
        onCreateGroup(data);
        alert('Grupo criado com sucesso!');
        setShowCreateForm(false);
        setGroupName('');
        setGroupDesc('');
        setGroupAvatar('');
        setGroupRules('');
      } else {
        setError(data.error || 'Erro ao criar grupo.');
      }
    } catch (e) {
      setError('Erro de conexão ao criar grupo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = groupJoinId.trim();
    if (!id) return;

    try {
      const response = await fetch(`/api/groups/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick: myNick })
      });

      const data = await response.json();
      if (response.ok) {
        onJoinGroup(data);
        alert('Você entrou no grupo com sucesso!');
        setShowJoinForm(false);
        setGroupJoinId('');
      } else {
        alert(data.error || 'Erro ao entrar no grupo.');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="flex-1 bg-[#0b0d10] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-16 md:pb-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-[#1f2838] pb-5 gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center space-x-2">
            <UserCheck className="w-5.5 h-5.5 text-blue-400 shrink-0" />
            <span>Comunidades & Grupos</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Participe de discussões coletivas ou crie novas salas autoritativas.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => setShowJoinForm(true)}
            className="px-4 py-2 bg-[#181f2b] border border-[#2b384e] hover:bg-[#20293c] rounded-xl text-xs font-bold cursor-pointer transition-colors focus:outline-none"
          >
            Entrar via ID
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors focus:outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Comunidade</span>
          </button>
        </div>
      </div>

      {/* JOIN VIA ID MODAL OVERLAY */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn">
            <h3 className="text-md font-bold mb-1">Entrar em Grupo</h3>
            <p className="text-xs text-gray-400 mb-4">Insira o ID exato fornecido pelo criador do grupo.</p>

            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                placeholder="Ex: grupo-geral, group-xxxx"
                value={groupJoinId}
                onChange={(e) => setGroupJoinId(e.target.value)}
                className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
                required
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#1a212e]">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG */}
      {actionConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-extrabold text-gray-200 mb-1">
              {actionConfirm.type === 'leave' ? 'Sair da Comunidade' : 'Deletar Comunidade'}
            </h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              {actionConfirm.type === 'leave'
                ? `Você tem certeza de que deseja sair de "${actionConfirm.groupName}"? Você não receberá mais notificações deste grupo.`
                : `Deseja realmente deletar permanentemente a comunidade "${actionConfirm.groupName}"? Esta ação não pode ser desfeita e removerá o grupo para todos os membros.`}
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a212e]">
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { type, groupId, groupName } = actionConfirm;
                  setActionConfirm(null);
                  if (type === 'leave') {
                    onLeaveGroup(groupId);
                  } else {
                    handleDeleteGroup(groupId, groupName);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                  actionConfirm.type === 'leave' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {actionConfirm.type === 'leave' ? 'Sair' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL OVERLAY */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-bold mb-1">Criar Nova Comunidade</h3>
            <p className="text-xs text-gray-400 mb-4">Desenhe um novo espaço para conversas coletivas.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Nome da Comunidade</label>
                <input
                  type="text"
                  placeholder="Ex: Equipe de Engenharia"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Descrição Breve</label>
                <input
                  type="text"
                  placeholder="Ex: Discussões técnicas de infraestrutura"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase">URL do Avatar</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo.jpg"
                  value={groupAvatar}
                  onChange={(e) => setGroupAvatar(e.target.value)}
                  className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Regras do Grupo</label>
                <textarea
                  placeholder="Regra 1: Respeite a privacidade alheia..."
                  value={groupRules}
                  onChange={(e) => setGroupRules(e.target.value)}
                  rows={2}
                  className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6] resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#1a212e]">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GROUPS GRID */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-[#1e2736] rounded-2xl bg-[#10141d]/30 max-w-lg mx-auto my-6 animate-fadeIn">
          <Sparkles className="w-10 h-10 text-blue-500 mb-3 animate-pulse" />
          <h3 className="text-md font-extrabold text-gray-200">Nenhuma comunidade ativa</h3>
          <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
            Você não faz parte de nenhuma comunidade no momento. Crie um novo grupo clicando em <strong className="text-blue-400">"Criar Comunidade"</strong> ou entre em uma existente usando o botão <strong className="text-gray-300">"Entrar via ID"</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {groups.map((g) => {
            const myMemberObj = g.members.find(m => m.nick.toLowerCase() === myNick.toLowerCase());
            const roleLabel = myMemberObj?.role || 'member';
            const isCreator = !g.creator || g.creator.toLowerCase() === myNick.toLowerCase();

            return (
              <div
                key={g.id}
                className="bg-[#10141d] border border-[#1e2736] hover:border-blue-500/20 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <img src={g.avatar} alt={g.name} className="w-11 h-11 rounded-xl object-cover border border-[#212a38]" />
                  <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    roleLabel === 'admin' ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {roleLabel}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-gray-200">{g.name}</h4>
                  <p className="text-[10px] text-blue-400 font-mono font-bold mt-0.5">ID: {g.id}</p>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed min-h-[32px] line-clamp-2">
                  {g.description}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 pt-3 border-t border-[#1e2635] shrink-0">
                <button
                  onClick={() => onStartGroupChat(g.id)}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 text-[11px] font-bold rounded-xl cursor-pointer transition-colors"
                  title="Abrir Chat em Tela Cheia"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Painel Chat</span>
                </button>

                <button
                  onClick={() => toggleGroupChat(g.id)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-[11px] font-bold rounded-xl cursor-pointer transition-colors border ${
                    activeChatGroupId === g.id 
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500' 
                      : 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>Chat Geral</span>
                </button>
                
                <button
                  onClick={() => setActionConfirm({ type: 'leave', groupId: g.id, groupName: g.name })}
                  className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl cursor-pointer"
                  title="Sair do Grupo"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {isCreator && (
                  <button
                    onClick={() => setActionConfirm({ type: 'delete', groupId: g.id, groupName: g.name })}
                    className="p-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-xl cursor-pointer"
                    title="Deletar Comunidade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* COLLAPSIBLE GENERAL CHAT INLINE */}
              {activeChatGroupId === g.id && (
                <div className="mt-4 pt-3 border-t border-[#1e2635] flex flex-col space-y-3 animate-fadeIn w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Chat Geral Coletivo</span>
                    </span>
                    <span className="text-[9px] text-gray-400">Total: {localGroupMessages.length} msgs</span>
                  </div>

                  {/* Message feed container */}
                  <div className="bg-[#0c0f16] border border-[#1a212e] rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2 flex flex-col">
                    {localGroupMessages.length === 0 ? (
                      <div className="text-center py-6 text-[11px] text-gray-500 italic">
                        Nenhuma mensagem recente. Seja o primeiro a escrever no Chat Geral!
                      </div>
                    ) : (
                      localGroupMessages.map((msg) => {
                        const isMe = msg.from.toLowerCase() === myNick.toLowerCase();
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                          >
                            <span className="text-[9px] text-gray-500 font-semibold px-1 mb-0.5">
                              {isMe ? 'Você' : msg.from}
                            </span>
                            <div className={`px-2.5 py-1.5 rounded-xl text-xs break-words ${
                              isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#181f2a] text-gray-200 rounded-tl-none'
                            }`}>
                              {msg.decryptedContent || msg.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input form */}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Escreva para os usuários..."
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendGroupText(g.id);
                        }
                      }}
                      className="flex-1 bg-[#181f2a] border border-[#2c384d] rounded-xl px-2.5 py-1.5 text-xs text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleSendGroupText(g.id)}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      title="Enviar"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Info card footer */}
      <div className="mt-8 bg-[#10141d]/40 border border-[#1e2736]/60 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-gray-400 text-left max-w-2xl">
        <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-300">Sobre Grupos e Comunidades</p>
          <p className="mt-1 leading-relaxed">
            As conversas de grupo no Mestre utilizam chaves de criptografia simétricas compartilhadas entre os membros. Toda autorização de membro, criação de salas ou canais é rigorosamente validada no servidor Express Node de forma autônoma.
          </p>
        </div>
      </div>
    </div>
  );
}
