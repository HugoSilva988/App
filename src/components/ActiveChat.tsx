import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  ArrowLeft, 
  Reply, 
  Trash2, 
  Edit2, 
  Pin, 
  X,
  FileText,
  Play,
  Pause,
  Key,
  ShieldAlert,
  Check,
  CheckCheck,
  Flag,
  UserX,
  Search,
  Download,
  Eye,
  Image as ImageIcon,
  Music,
  FolderOpen,
  LogOut
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { LocalDB } from '../services/localDB';

interface ActiveChatProps {
  myNick: string;
  targetId: string; // partner nick or group ID
  isGroup: boolean;
  messages: ChatMessage[];
  onlineUsers: UserProfile[];
  typingUsers: string[];
  onSendMessage: (text: string, type: 'text' | 'file' | 'audio', fileData?: any, parentMsgId?: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onEditMessage: (msgId: string, text: string) => void;
  onReactMessage: (msgId: string, emoji: string, add: boolean) => void;
  onTogglePin: (msgId: string) => void;
  onStartCall: (nick: string, type: 'voice' | 'video') => void;
  onBack: () => void;
  onToggleBlock: (nick: string) => void;
  isBlocked: boolean;
  onSubmitReport: (reported: string, reason: string, details: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onClearChatHistory?: (targetId: string, isGroup: boolean) => void;
  onDeleteConversation?: (targetId: string) => void;
}

export default function ActiveChat({
  myNick,
  targetId,
  isGroup,
  messages,
  onlineUsers,
  typingUsers,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  onReactMessage,
  onTogglePin,
  onStartCall,
  onBack,
  onToggleBlock,
  isBlocked,
  onSubmitReport,
  onLeaveGroup,
  onClearChatHistory,
  onDeleteConversation
}: ActiveChatProps) {

  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCryptoInspector, setShowCryptoInspector] = useState(false);
  const [selectedMsgForCrypto, setSelectedMsgForCrypto] = useState<ChatMessage | null>(null);

  // Disintegration and secure sanitization states
  const [deletingMessageIds, setDeletingMessageIds] = useState<string[]>([]);
  const [isWipingChat, setIsWipingChat] = useState(false);

  // Helper trigger to delay deletion and run disintegration particles
  const triggerDeleteMessage = (msgId: string) => {
    setDeletingMessageIds(prev => [...prev, msgId]);
    setTimeout(() => {
      onDeleteMessage(msgId);
      setDeletingMessageIds(prev => prev.filter(id => id !== msgId));
    }, 900);
  };

  const triggerClearHistory = () => {
    setIsWipingChat(true);
    setTimeout(() => {
      onClearChatHistory?.(targetId, isGroup);
      setIsWipingChat(false);
    }, 1200);
  };

  const triggerDeleteConversation = () => {
    setIsWipingChat(true);
    setTimeout(() => {
      onDeleteConversation?.(targetId);
      setIsWipingChat(false);
    }, 1200);
  };

  // Deterministic seed-based particle generator for smooth disintegration
  const getParticles = (id: string) => {
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const particleColors = ['#EF4444', '#EC4899', '#6366F1', '#8B5CF6', '#3B82F6'];
    return Array.from({ length: 14 }).map((_, idx) => {
      const angle = (idx / 14) * 2 * Math.PI + (seed % 100) / 100;
      const distance = 40 + (seed * (idx + 1) % 80);
      const x = Math.cos(angle) * distance;
      const y = -30 - Math.sin(Math.abs(angle)) * distance;
      const size = 3 + (seed * (idx + 2) % 4);
      const delay = (seed * (idx + 3) % 10) / 30;
      const color = particleColors[(seed + idx) % particleColors.length];
      return { id: idx, x, y, size, delay, color };
    });
  };

  // Shared Media Search States
  const [showSharedMedia, setShowSharedMedia] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'document'>('all');
  
  // Lightbox view for media
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');
  
  // Interaction states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);

  // File Upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Recording Mock
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'abuse' | 'harassment' | 'impersonation' | 'illegal' | 'other'>('spam');
  const [reportDetails, setReportDetails] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle typing state triggers
  const typingTimeoutRef = useRef<any>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Notify server we are typing
    const wsEvent = {
      type: 'typing',
      to: isGroup ? undefined : targetId,
      isTyping: true,
      isGroup,
      groupId: isGroup ? targetId : undefined
    };
    // Emit through WebSocket trigger
    import('../services/websocketService').then(m => m.wsService.send(wsEvent));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      const stopEvent = {
        type: 'typing',
        to: isGroup ? undefined : targetId,
        isTyping: false,
        isGroup,
        groupId: isGroup ? targetId : undefined
      };
      import('../services/websocketService').then(m => m.wsService.send(stopEvent));
    }, 2000);
  };

  // Get recipient profile details
  const getPartnerDetails = () => {
    const defaultUser = {
      name: isGroup ? targetId : targetId.slice(1),
      avatar: isGroup 
        ? `https://api.dicebear.com/7.x/identicon/svg?seed=${targetId}`
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${targetId}`,
      isOnline: isGroup ? false : onlineUsers.some(u => u.nick.toLowerCase() === targetId.toLowerCase() && u.status !== 'offline'),
      statusText: isGroup ? 'Comunidade' : onlineUsers.find(u => u.nick.toLowerCase() === targetId.toLowerCase())?.customStatus || 'offline',
      bio: isGroup ? 'Espaço de bate-papo coletivo' : onlineUsers.find(u => u.nick.toLowerCase() === targetId.toLowerCase())?.bio || 'Membro do Mestre Chat'
    };
    return defaultUser;
  };

  const partner = getPartnerDetails();

  // Filter messages that represent shared files or media
  const getSharedMediaItems = () => {
    return messages.filter(msg => {
      if (msg.isDeleted) return false;
      if (msg.type !== 'file' && msg.type !== 'audio') return false;

      // Determine media type
      const isAudio = msg.type === 'audio' || (msg.fileName && /\.(mp3|wav|m4a|webm|ogg)$/i.test(msg.fileName));
      const isImage = msg.fileName && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(msg.fileName);
      const isVideo = msg.fileName && /\.(mp4|mov|avi|mkv|webm)$/i.test(msg.fileName);
      const isDoc = !isImage && !isVideo && !isAudio && msg.type === 'file';

      // Type filter check
      if (mediaTypeFilter === 'image' && !isImage) return false;
      if (mediaTypeFilter === 'video' && !isVideo) return false;
      if (mediaTypeFilter === 'audio' && !isAudio) return false;
      if (mediaTypeFilter === 'document' && !isDoc) return false;

      // Search query check
      if (mediaSearchQuery.trim()) {
        const query = mediaSearchQuery.toLowerCase();
        const nameMatch = msg.fileName?.toLowerCase().includes(query);
        const senderMatch = msg.from.toLowerCase().includes(query);
        return nameMatch || senderMatch;
      }

      return true;
    });
  };

  const sharedMediaItems = getSharedMediaItems();

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMsg) {
      onEditMessage(editingMsg.id, inputText.trim());
      setEditingMsg(null);
    } else {
      onSendMessage(inputText.trim(), 'text', null, replyingTo?.id);
      setReplyingTo(null);
    }
    setInputText('');
    setShowEmojiPicker(false);
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordSeconds(s => s + 1);
    }, 1000);
  };

  const stopVoiceRecording = (cancel: boolean = false) => {
    setIsRecording(false);
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    
    if (!cancel && recordSeconds > 0) {
      // Send simulated audio log
      const audioId = `audio-${Math.random().toString(36).substr(2, 9)}`;
      onSendMessage(
        `[Mensagem de voz - ${recordSeconds}s]`,
        'audio',
        {
          name: `Audio-${new Date().toLocaleTimeString()}.webm`,
          size: recordSeconds * 8000, // mock size
          url: '#' // local voice log
        },
        replyingTo?.id
      );
      setReplyingTo(null);
    }
    setRecordSeconds(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            data: base64,
            size: file.size
          })
        });

        const result = await response.json();
        if (response.ok) {
          onSendMessage(
            `📁 Envio de Arquivo: ${file.name}`,
            'file',
            {
              name: file.name,
              size: file.size,
              url: result.url
            },
            replyingTo?.id
          );
          setReplyingTo(null);
        } else {
          alert(`Erro no upload: ${result.error}`);
        }
      } catch (err) {
        alert('Falha ao enviar arquivo para o servidor.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  const popularEmojis = ['😄', '❤️', '👍', '😂', '🎉', '🔥', '😮', '😢', '👏', '👀'];

  const submitReport = () => {
    onSubmitReport(targetId, reportReason, reportDetails);
    setShowReportModal(false);
    setReportDetails('');
    alert('Denúncia enviada com sucesso aos moderadores.');
  };

  const activePinnedMessages = messages.filter(m => m.isPinned);

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0B] text-[#f3f4f6] h-full overflow-hidden font-sans relative">
      
      {/* HEADER */}
      <header className="h-16 border-b border-white/5 bg-[#0F0F12]/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-3 min-w-0">
          <button 
            onClick={onBack}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative shrink-0 cursor-pointer" onClick={() => setShowCryptoInspector(true)}>
            <img 
              src={partner.avatar} 
              alt={partner.name} 
              className="w-10 h-10 rounded-full object-cover border border-white/5"
              referrerPolicy="no-referrer"
            />
            {partner.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0F0F12] rounded-full" />
            )}
          </div>

          <div className="text-left min-w-0">
            <h4 className="font-bold text-sm truncate text-gray-200">{partner.name}</h4>
            <p className="text-[10px] text-gray-500 truncate flex items-center space-x-1">
              <span className="text-indigo-400 font-semibold">{targetId}</span>
              <span className="text-gray-600">•</span>
              <span className={partner.isOnline ? 'text-emerald-500 font-medium' : 'text-gray-500 font-normal'}>
                {partner.isOnline ? 'online' : 'offline'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {!isGroup && (
            <>
              <button 
                id="header-call-voice-btn"
                onClick={() => onStartCall(targetId, 'voice')}
                className="text-gray-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
                title="Chamada de voz"
                disabled={isBlocked}
              >
                <Phone className="w-4.5 h-4.5" />
              </button>
              <button 
                id="header-call-video-btn"
                onClick={() => onStartCall(targetId, 'video')}
                className="text-gray-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer focus:outline-none"
                title="Chamada de vídeo"
                disabled={isBlocked}
              >
                <Video className="w-4.5 h-4.5" />
              </button>
            </>
          )}

          {/* Shared Media Search Button */}
          <button
            onClick={() => {
              setShowSharedMedia(!showSharedMedia);
              setShowCryptoInspector(false);
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer focus:outline-none ${
              showSharedMedia ? 'text-indigo-400 bg-indigo-600/15' : 'text-gray-400 hover:text-indigo-400 hover:bg-white/5'
            }`}
            title="Buscar Mídias Compartilhadas"
          >
            <FolderOpen className="w-4.5 h-4.5" />
          </button>

          {/* Crypto Inspector Button */}
          <button
            onClick={() => {
              setShowCryptoInspector(!showCryptoInspector);
              setShowSharedMedia(false);
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer focus:outline-none ${
              showCryptoInspector ? 'text-indigo-400 bg-indigo-600/15' : 'text-gray-400 hover:text-indigo-400 hover:bg-white/5'
            }`}
            title="Inspecionar Criptografia"
          >
            <Key className="w-4.5 h-4.5" />
          </button>

          {/* Dropdown Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-[#18202e] cursor-pointer focus:outline-none"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#11151f] border border-[#212b3d] rounded-xl shadow-2xl p-1.5 z-30 animate-fadeIn">
                {!isGroup && (
                  <button 
                    onClick={() => {
                      onToggleBlock(targetId);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#19212f] hover:text-red-400 rounded-lg flex items-center space-x-2 text-gray-300 cursor-pointer focus:outline-none"
                  >
                    <UserX className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{isBlocked ? 'Desbloquear Contato' : 'Bloquear Contato'}</span>
                  </button>
                )}
                
                {/* Clear Chat History */}
                <button 
                  onClick={() => {
                    triggerClearHistory();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#19212f] hover:text-red-400 text-gray-300 rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Limpar Histórico</span>
                </button>

                {/* Delete Conversation */}
                <button 
                  onClick={() => {
                    triggerDeleteConversation();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#19212f] hover:text-red-400 text-gray-300 rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Excluir Conversa</span>
                </button>

                {/* Leave Group (isGroup) */}
                {isGroup && (
                  <button 
                    onClick={() => {
                      onLeaveGroup?.(targetId);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-400 rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Sair do Grupo</span>
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setShowReportModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#19212f] text-gray-300 hover:text-yellow-500 rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                >
                  <Flag className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span>Denunciar Abuso</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PINNED MESSAGES HEADER SLIDER */}
      {activePinnedMessages.length > 0 && (
        <div className="bg-[#121722] border-b border-[#1f2838] px-4 py-2 flex items-center justify-between shrink-0 z-10 text-xs">
          <div className="flex items-center space-x-2.5 truncate text-gray-300">
            <Pin className="w-3.5 h-3.5 text-blue-400 rotate-45 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-blue-400">Mensagem Fixada: </span>
              <span>{activePinnedMessages[activePinnedMessages.length - 1].decryptedContent || '[Criptografada]'}</span>
            </div>
          </div>
          <button 
            onClick={() => onTogglePin(activePinnedMessages[activePinnedMessages.length - 1].id)}
            className="text-gray-500 hover:text-white p-0.5"
            title="Desafixar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MESSAGES LIST AREA */}
      <div 
        onClick={() => setMessageMenuId(null)}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-[#08090d] scrollbar-thin relative"
      >
        {/* Full-view Cryptographic sanitization sweeping overlay */}
        {isWipingChat && (
          <div className="absolute inset-0 bg-red-950/15 pointer-events-none overflow-hidden z-40 flex flex-col justify-start">
            {/* Scanning laser line */}
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 1.2, ease: "linear" }}
              className="absolute left-0 right-0 h-[3px] bg-red-500 shadow-[0_0_15px_#ef4444] z-50"
            />
            {/* Ambient rising disintegration particles */}
            <div className="relative w-full h-full">
              {Array.from({ length: 30 }).map((_, idx) => {
                const x = Math.random() * 100;
                const yStart = Math.random() * 100;
                const yEnd = yStart - (20 + Math.random() * 30);
                const delay = Math.random() * 0.4;
                const colors = ['#EF4444', '#EC4899', '#8B5CF6'];
                const color = colors[idx % colors.length];
                return (
                  <motion.div
                    key={idx}
                    initial={{ left: `${x}%`, top: `${yStart}%`, opacity: 0, scale: 1 }}
                    animate={{ top: `${yEnd}%`, opacity: [0, 1, 0], scale: 0 }}
                    transition={{ duration: 1.0, delay, ease: "easeOut" }}
                    className="absolute w-1 h-1 rounded-full"
                    style={{ color, backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                  />
                );
              })}
            </div>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center h-full">
            <div className="w-12 h-12 bg-blue-950/20 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-3">
              <Key className="w-5.5 h-5.5" />
            </div>
            <p className="text-sm font-semibold text-gray-300">Início do Chat Seguro</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              Sua conversa com <span className="text-blue-400 font-semibold">{targetId}</span> está criptografada de ponta a ponta. Nenhum terceiro pode lê-la.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.from.toLowerCase() === myNick.toLowerCase();
            const parentMsg = msg.parentMsgId ? messages.find(m => m.id === msg.parentMsgId) : null;

            const isDeleting = deletingMessageIds.includes(msg.id);
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                animate={
                  isDeleting || isWipingChat
                    ? { 
                        opacity: 0, 
                        scale: 0.9, 
                        filter: 'blur(8px)', 
                        y: -30,
                        transition: { duration: 0.8, ease: "easeOut" }
                      }
                    : { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }
                }
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full group relative`}
              >
                {/* Header label for group chats */}
                {isGroup && !isMe && (
                  <span className="text-[10px] text-gray-500 font-semibold mb-1 ml-2">{msg.from}</span>
                )}

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!msg.isDeleted) {
                      setMessageMenuId(messageMenuId === msg.id ? null : msg.id);
                    }
                  }}
                  className={`relative max-w-[80%] sm:max-w-[70%] px-4 py-2.5 shadow-md cursor-pointer select-none transition-all active:scale-[0.98] ${
                    isMe 
                      ? 'bg-[#312E81] text-[#e0e0e0] rounded-[18px] rounded-br-[4px] hover:bg-indigo-900/95' 
                      : 'bg-[#1F1F23] text-[#e0e0e0] rounded-[18px] rounded-bl-[4px] border border-white/5 hover:bg-[#25252b]'
                  }`}
                >
                  
                  {/* Reply Header Preview inside message card */}
                  {parentMsg && (
                    <div className={`text-[11px] px-2 py-1 mb-1.5 rounded-md border-l-2 truncate ${
                      isMe 
                        ? 'bg-indigo-950/50 border-white/50 text-white/80' 
                        : 'bg-black/40 border-indigo-500 text-gray-400'
                    }`}>
                      <span className="font-bold block text-[10px]">
                        {parentMsg.from === myNick ? 'Você' : parentMsg.from}
                      </span>
                      {parentMsg.decryptedContent || '[Mídia Criptografada]'}
                    </div>
                  )}

                  {/* MESSAGE BODY (Logical Deletion checks) */}
                  {msg.isDeleted ? (
                    <span className="text-xs italic text-gray-500">Esta mensagem foi apagada.</span>
                  ) : (
                    <div className="break-words text-sm">
                      {msg.type === 'file' ? (
                        <div className="flex items-center space-x-2.5 p-2 bg-black/20 rounded-lg">
                          <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                          <div className="text-left min-w-0">
                            <p className="text-xs font-bold truncate max-w-[150px]">{msg.fileName}</p>
                            <p className="text-[9px] text-gray-500">{(msg.fileSize ? (msg.fileSize/1024).toFixed(1) : '0')} KB</p>
                          </div>
                          <a 
                            href={msg.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded font-semibold shrink-0"
                          >
                            Abrir
                          </a>
                        </div>
                      ) : msg.type === 'audio' ? (
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center shrink-0">
                            <Play className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-semibold">Mensagem de Voz</span>
                            <div className="w-24 bg-zinc-700 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-500 h-full w-[60%]" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span>{msg.decryptedContent || msg.content}</span>
                      )}
                    </div>
                  )}

                  {/* Footing detail */}
                  <div className="flex items-center justify-end space-x-1 mt-1.5 text-[9px] text-gray-400/80">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {msg.isEdited && <span className="text-[8px] italic opacity-80">(editada)</span>}
                    {msg.isPinned && <Pin className="w-2.5 h-2.5 shrink-0 rotate-45 text-indigo-300" />}
                    
                    {/* Delivery Status Indicator */}
                    {isMe && (
                      <span>
                        {msg.deliveryStatus === 'sending' && <span className="animate-spin block w-2 h-2 border border-indigo-400 border-t-transparent rounded-full" />}
                        {msg.deliveryStatus === 'sent' && <Check className="w-3 h-3 text-gray-400" />}
                        {msg.deliveryStatus === 'delivered' && <CheckCheck className="w-3 h-3 text-gray-400" />}
                        {msg.deliveryStatus === 'queued_server' && <Check className="w-3 h-3 text-indigo-400" title="Retida temporariamente no servidor" />}
                      </span>
                    )}
                  </div>

                  {/* REACTION PREVIEWS */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {Object.entries(msg.reactions).map(([emoji, usersList]) => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); onReactMessage(msg.id, emoji, !usersList.includes(myNick)); }}
                          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 hover:bg-black/30 border ${
                            usersList.includes(myNick) ? 'border-indigo-500/50 text-indigo-400' : 'border-transparent text-gray-400'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{usersList.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* CONTEXTUAL ACTION POPUP/DROPDOWN */}
                  {messageMenuId === msg.id && !msg.isDeleted && (
                    <div 
                      className={`absolute ${isMe ? 'right-0' : 'left-0'} top-full mt-2 w-48 bg-[#16161A] border border-white/10 rounded-xl shadow-2xl p-1.5 z-20 animate-fadeIn text-[#e0e0e0] text-left`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          setMessageMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                      >
                        <Reply className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Responder</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedMsgForCrypto(msg);
                          setShowCryptoInspector(true);
                          setMessageMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                      >
                        <Key className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inspecionar Cripto</span>
                      </button>

                      <button
                        onClick={() => {
                          onTogglePin(msg.id);
                          setMessageMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 hover:text-white rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                      >
                        <Pin className="w-3.5 h-3.5 text-indigo-400 rotate-45" />
                        <span>{msg.isPinned ? 'Desafixar' : 'Fixar Mensagem'}</span>
                      </button>

                      {isMe && (
                        <button
                          onClick={() => {
                            triggerDeleteMessage(msg.id);
                            setMessageMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 text-red-400 rounded-lg flex items-center space-x-2 cursor-pointer focus:outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Apagar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* OVERLAY ACTION BAR (Hover-triggered on direct item) */}
                {!msg.isDeleted && (
                  <div className={`opacity-0 group-hover:opacity-100 flex items-center space-x-2 mt-1 px-2 transition-opacity duration-150 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}>
                    {/* Cryptography inspect button */}
                    <button
                      onClick={() => {
                        setSelectedMsgForCrypto(msg);
                        setShowCryptoInspector(true);
                      }}
                      className="text-[10px] text-blue-400 hover:underline flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Key className="w-2.5 h-2.5" />
                      <span>Cripto</span>
                    </button>

                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="text-gray-500 hover:text-white p-1"
                      title="Responder"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                    
                    {isMe && (
                      <>
                        <button 
                          onClick={() => {
                            setEditingMsg(msg);
                            setInputText(msg.decryptedContent || '');
                          }}
                          className="text-gray-500 hover:text-white p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => triggerDeleteMessage(msg.id)}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Apagar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}

                    <button 
                      onClick={() => onTogglePin(msg.id)}
                      className="text-gray-500 hover:text-white p-1"
                      title="Fixar"
                    >
                      <Pin className="w-3 h-3 rotate-45" />
                    </button>

                    {/* Quick Reactions tooltip */}
                    <div className="flex space-x-1 bg-[#10141e] border border-[#21293c] rounded-full p-1 shadow-lg scale-90">
                      {popularEmojis.slice(0, 5).map((emoji) => {
                        const hasReacted = msg.reactions?.[emoji]?.includes(myNick);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onReactMessage(msg.id, emoji, !hasReacted)}
                            className="hover:scale-125 transition-transform p-0.5"
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Secure sanitization disintegration particle stream */}
                {isDeleting && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
                    {getParticles(msg.id).map((p) => (
                      <motion.span
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ 
                          x: p.x, 
                          y: p.y, 
                          opacity: 0, 
                          scale: 0 
                        }}
                        transition={{ 
                          duration: 0.8, 
                          delay: p.delay,
                          ease: "easeOut" 
                        }}
                        className="absolute rounded-full"
                        style={{
                          width: p.size,
                          height: p.size,
                          backgroundColor: p.color,
                          boxShadow: `0 0 6px ${p.color}`
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* RECIPIENT TYPING STATE FOOTER */}
      {typingUsers.length > 0 && (
        <div className="bg-[#08090d] px-4 py-1.5 text-[10px] text-blue-400 font-semibold italic text-left shrink-0">
          {typingUsers.map(u => u).join(', ')} está digitando...
        </div>
      )}

      {/* COMPOSER FIELD */}
      <footer className="border-t border-[#1f2838] bg-[#0f1218]/95 p-3.5 shrink-0 z-10">
        
        {/* Reply Indicator Preview bar */}
        {replyingTo && (
          <div className="bg-[#141a27] border-l-4 border-blue-500 p-2 rounded-lg flex items-center justify-between mb-3 text-xs">
            <div className="truncate text-left">
              <span className="font-bold block text-blue-400">Respondendo a {replyingTo.from === myNick ? 'Você' : replyingTo.from}</span>
              <span className="text-gray-400">{replyingTo.decryptedContent || '[Mídia]'}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Edit Indicator Preview bar */}
        {editingMsg && (
          <div className="bg-[#1b1c25] border-l-4 border-yellow-500 p-2 rounded-lg flex items-center justify-between mb-3 text-xs">
            <div className="truncate text-left">
              <span className="font-bold block text-yellow-500">Editando Mensagem</span>
              <span className="text-gray-400">{editingMsg.decryptedContent}</span>
            </div>
            <button onClick={() => { setEditingMsg(null); setInputText(''); }} className="text-gray-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isBlocked ? (
          <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs text-center rounded-xl font-medium">
            Você bloqueou este contato. Desbloqueie-o no menu superior de opções para reativar as mensagens.
          </div>
        ) : (
          <div className="flex items-center space-x-2 relative">
            
            {/* File Upload button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*,application/pdf,audio/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-[#16161A] border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer focus:outline-none"
              title="Anexar arquivo"
              disabled={isUploading}
            >
              <Paperclip className={`w-4.5 h-4.5 ${isUploading ? 'animate-spin' : ''}`} />
            </button>

            {/* Popular Emoji quick bar */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 bg-[#16161A] border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer focus:outline-none ${
                  showEmojiPicker ? 'text-indigo-400 border-indigo-500/50' : ''
                }`}
                title="Emojis"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-14 left-0 bg-[#0F0F12] border border-white/5 p-2 rounded-xl shadow-2xl flex gap-1 z-30">
                  {popularEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputText(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="hover:scale-125 transition-transform text-lg p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MESSAGE INPUT FIELD */}
            <input
              type="text"
              placeholder={isRecording ? 'Gravando áudio...' : 'Digite sua mensagem privada criptografada...'}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-[#16161A] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              disabled={isRecording}
            />

            {/* Voice Recording Buttons / Controls */}
            {isRecording ? (
              <div className="flex items-center space-x-2 bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-xl text-xs text-red-400 font-semibold animate-pulse">
                <span>🎤 Rec: {recordSeconds}s</span>
                <button 
                  onClick={() => stopVoiceRecording(true)} 
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-1 rounded font-normal"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => stopVoiceRecording(false)} 
                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                >
                  Enviar
                </button>
              </div>
            ) : (
              <button
                onClick={startVoiceRecording}
                className="p-2.5 bg-[#16161A] border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer focus:outline-none"
                title="Gravar áudio"
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Enviar"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </footer>

      {/* CRYPTO INSPECTOR LATERAL PANEL */}
      {showCryptoInspector && (
        <aside className="absolute right-0 top-0 bottom-0 w-80 bg-[#0F0F12] border-l border-white/5 p-5 shadow-2xl z-40 overflow-y-auto animate-slideIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Key className="w-5 h-5" />
              <h4 className="font-bold text-sm tracking-wider uppercase">Vault Inspector</h4>
            </div>
            <button onClick={() => { setShowCryptoInspector(false); setSelectedMsgForCrypto(null); }} className="text-gray-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5 text-left text-xs leading-relaxed">
            
            {/* General Direct Session Key details */}
            <div className="bg-[#16161A] border border-white/5 p-3.5 rounded-xl space-y-2">
              <p className="font-semibold text-gray-300">Chave de Sessão Ativa</p>
              <p className="text-[10px] text-gray-500">
                Uma chave de criptografia simétrica AES-GCM (256 bits) gerada localmente para este chat.
              </p>
              <div className="p-2 bg-black/40 rounded border border-white/5 font-mono text-[9px] text-indigo-400 break-all select-all">
                {LocalDB.getSessionKeys(myNick)[targetId.toLowerCase()] || 'MestreSymmetricAES256Key_ActiveSessionString'}
              </div>
            </div>

            {/* Selected Message details */}
            {selectedMsgForCrypto ? (
              <div className="space-y-4">
                <div className="bg-[#16161A] border border-white/5 p-3.5 rounded-xl space-y-2">
                  <p className="font-semibold text-emerald-400">Mensagem Selecionada</p>
                  
                  <p className="text-[10px] text-gray-400 font-bold mt-2">Mensagem Descriptografada (Em Memória):</p>
                  <p className="p-2 bg-black/30 rounded border border-[#21293a] text-gray-300">
                    {selectedMsgForCrypto.decryptedContent || '[Erro/Mídia]'}
                  </p>

                  <p className="text-[10px] text-gray-400 font-bold mt-2">Payload Criptografado (Trafegado/Salvo):</p>
                  <div className="p-2 bg-black/40 rounded border border-[#21293a] font-mono text-[9px] text-yellow-500 break-all select-all">
                    {selectedMsgForCrypto.content}
                  </div>

                  <p className="text-[10px] text-gray-400 font-bold mt-2">Vetor de Inicialização (IV):</p>
                  <div className="p-2 bg-black/40 rounded border border-[#21293a] font-mono text-[9px] text-gray-500 break-all">
                    IV_PEM_STRING_000000_12BYTE_GCM
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#141a24]/50 rounded-xl border border-dashed border-[#232e42] text-center text-gray-500 text-[11px]">
                Selecione uma mensagem e clique em <strong>Cripto</strong> para inspecionar seus bytes criptografados reais e metadados.
              </div>
            )}

            {/* Recipient's public key fingerprint */}
            <div className="bg-[#131720] border border-[#212a3d] p-3.5 rounded-xl space-y-2">
              <p className="font-semibold text-gray-300">Chave Pública do Destinatário</p>
              <p className="text-[10px] text-gray-500">
                Usada para selar envelopes RSA ao estabelecer a sessão.
              </p>
              <div className="p-2 bg-black/40 rounded border border-[#21293a] font-mono text-[9px] text-gray-400 break-all">
                {onlineUsers.find(u => u.nick.toLowerCase() === targetId.toLowerCase())?.publicKey || 'RSA2048_PUB_PEM_STRING'}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* REPORT REASON MODAL OVERLAY */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn">
            <h3 className="text-lg font-bold mb-1">Denunciar Usuário {targetId}</h3>
            <p className="text-xs text-gray-400 mb-4">Ajude os moderadores a manter a comunidade limpa e segura.</p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Motivo Principal</label>
                <select
                  value={reportReason}
                  onChange={(e: any) => setReportReason(e.target.value)}
                  className="w-full bg-[#171d2b] border border-[#2a384f] rounded-xl px-3 py-2 text-sm text-[#f3f4f6]"
                >
                  <option value="spam">Spam / Links indesejados</option>
                  <option value="abuse">Abuso verbal / Mensagens maliciosas</option>
                  <option value="harassment">Assédio / Perseguição</option>
                  <option value="impersonation">Falsidade ideológica / Impersonificação</option>
                  <option value="illegal">Conteúdo ilegal</option>
                  <option value="other">Outros motivos</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Detalhes da Denúncia</label>
                <textarea
                  placeholder="Por favor, relate as evidências com clareza..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  className="w-full bg-[#171d2b] border border-[#2a384f] rounded-xl px-3 py-2 text-sm text-[#f3f4f6] resize-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-[#1a212e] pt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitReport}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all"
                >
                  Enviar Denúncia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHARED MEDIA LATERAL PANEL */}
      {showSharedMedia && (
        <aside className="absolute right-0 top-0 bottom-0 w-80 bg-[#0F0F12] border-l border-white/5 p-5 shadow-2xl z-40 flex flex-col overflow-hidden animate-slideIn">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
            <div className="flex items-center space-x-2 text-indigo-400">
              <FolderOpen className="w-5 h-5" />
              <h4 className="font-bold text-sm tracking-wider uppercase">Mídias do Chat</h4>
            </div>
            <button 
              onClick={() => setShowSharedMedia(false)} 
              className="text-gray-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar inside Panel */}
          <div className="relative mb-4 shrink-0">
            <input
              type="text"
              placeholder="Buscar por arquivo ou remetente..."
              value={mediaSearchQuery}
              onChange={(e) => setMediaSearchQuery(e.target.value)}
              className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-xs text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
          </div>

          {/* MediaType Filter Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
            {(['all', 'image', 'video', 'audio', 'document'] as const).map((filter) => {
              const label = {
                all: 'Todos',
                image: 'Fotos',
                video: 'Vídeos',
                audio: 'Áudios',
                document: 'Arquivos'
              }[filter];
              return (
                <button
                  key={filter}
                  onClick={() => setMediaTypeFilter(filter)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                    mediaTypeFilter === filter
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                      : 'bg-[#16161A] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Media Items Grid / List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {sharedMediaItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                <FolderOpen className="w-8 h-8 mb-2 text-gray-600 animate-pulse" />
                <p className="text-xs font-semibold">Nenhuma mídia encontrada</p>
                <p className="text-[10px] text-gray-600 mt-1">Compartilhe arquivos ou áudios nesta conversa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sharedMediaItems.map((item) => {
                  const isAudio = item.type === 'audio' || (item.fileName && /\.(mp3|wav|m4a|webm|ogg)$/i.test(item.fileName));
                  const isImage = item.fileName && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.fileName);
                  const isVideo = item.fileName && /\.(mp4|mov|avi|mkv|webm)$/i.test(item.fileName);

                  return (
                    <div 
                      key={item.id}
                      className="bg-[#16161A] border border-white/5 rounded-xl p-2 flex flex-col justify-between hover:border-indigo-500/30 transition-all group relative overflow-hidden text-left"
                    >
                      {/* Thumbnail/Preview */}
                      <div className="w-full h-20 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden mb-1.5 relative">
                        {isImage ? (
                          <img 
                            src={item.fileUrl} 
                            alt={item.fileName} 
                            className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform" 
                            referrerPolicy="no-referrer"
                          />
                        ) : isVideo ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-indigo-950/20">
                            <Video className="w-5 h-5 text-indigo-400 mb-0.5" />
                            <span className="text-[8px] font-bold truncate max-w-[80px] px-1">{item.fileName}</span>
                          </div>
                        ) : isAudio ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-indigo-950/20">
                            <Music className="w-5 h-5 text-indigo-400 mb-0.5" />
                            <span className="text-[8px] font-bold truncate max-w-[80px] px-1">Áudio</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-zinc-900">
                            <FileText className="w-5 h-5 text-gray-400 mb-0.5" />
                            <span className="text-[8px] font-bold truncate max-w-[80px] px-1">{item.fileName}</span>
                          </div>
                        )}

                        {/* Hover Overlay with Action Buttons */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5">
                          {(isImage || isVideo) && (
                            <button
                              onClick={() => {
                                setLightboxUrl(item.fileUrl || null);
                                setLightboxName(item.fileName || 'Mídia');
                              }}
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-all focus:outline-none"
                              title="Visualizar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={item.fileUrl}
                            download={item.fileName || 'download'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#1F1F23] hover:bg-white/5 border border-white/5 text-gray-200 rounded-lg cursor-pointer transition-all"
                            title="Baixar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Info Details */}
                      <div className="text-left min-w-0">
                        <p className="text-[10px] font-bold truncate text-gray-300" title={item.fileName}>
                          {item.type === 'audio' ? 'Mensagem de Voz' : item.fileName}
                        </p>
                        <p className="text-[8px] text-zinc-500 flex justify-between mt-0.5">
                          <span>{item.fileSize ? `${(item.fileSize / 1024).toFixed(0)} KB` : 'Áudio'}</span>
                          <span className="truncate max-w-[45px]">De: {item.from}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* MEDIA LIGHTBOX MODAL OVERLAY */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Close Button */}
          <button 
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer focus:outline-none z-50"
            title="Fechar Visualização"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Lightbox Content Container */}
          <div 
            className="relative max-w-4xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking media itself
          >
            {lightboxName && /\.(mp4|mov|avi|mkv|webm)$/i.test(lightboxName) ? (
              <video 
                src={lightboxUrl} 
                controls 
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border border-white/10" 
              />
            ) : (
              <img 
                src={lightboxUrl} 
                alt={lightboxName} 
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10" 
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* Caption */}
          <div className="mt-4 text-center">
            <p className="text-sm font-bold text-gray-200">{lightboxName}</p>
            <a 
              href={lightboxUrl} 
              download={lightboxName}
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
