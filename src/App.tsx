import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Menu, Sparkles } from 'lucide-react';
import { wsService } from './services/websocketService';
import { LocalDB } from './services/localDB';
import { CryptoService } from './services/cryptoService';
import { 
  ChatMessage, 
  UserProfile, 
  Contact, 
  GroupInfo, 
  AppNotification, 
  SystemSettings, 
  LocalKeyPair, 
  CallSession,
  ConversationItem
} from './types';

// Import all subcomponents
import Register from './components/Register';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ActiveChat from './components/ActiveChat';
import CallUI from './components/CallUI';
import SettingsPanel from './components/SettingsPanel';
import ReportsPanel from './components/ReportsPanel';
import ContactsPanel from './components/ContactsPanel';
import CommunitiesPanel from './components/CommunitiesPanel';
import NotificationsPanel from './components/NotificationsPanel';
import CallsPanel from './components/CallsPanel';
import AboutPanel from './components/AboutPanel';

export default function App() {
  // Authentication states
  const [myNick, setMyNick] = useState<string | null>(LocalDB.getMyNick());
  const [keyPair, setKeyPair] = useState<LocalKeyPair | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState<'home' | 'chats' | 'calls' | 'contacts' | 'communities' | 'notifications' | 'reports' | 'settings' | 'about'>('home');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isChatGroup, setIsChatGroup] = useState<boolean>(false);

  // Sync lists
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Call session state
  const [callSession, setCallSession] = useState<CallSession | null>(null);

  // Exclusion System Notification Toast State
  const [exclusionToast, setExclusionToast] = useState<{ title: string; description: string } | null>(null);

  // Custom confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  // Global helper to notify the system of secure data wipes or leaving groups
  const notifySystemExclusion = (title: string, description: string) => {
    if (!myNick) return;
    LocalDB.addNotification(myNick, {
      title: `Exclusão Segura: ${title}`,
      description,
      type: 'security'
    });
    setNotifications(LocalDB.getNotifications(myNick));
    setExclusionToast({ title, description });
  };

  // Automatically dismiss the toast after 4 seconds
  useEffect(() => {
    if (exclusionToast) {
      const timer = setTimeout(() => {
        setExclusionToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [exclusionToast]);

  // Load profile keypair and database records upon successful login/reg
  useEffect(() => {
    if (!myNick) {
      setKeyPair(null);
      setSettings(null);
      return;
    }

    // Load keys and initialize configs
    CryptoService.getOrCreateKeyPair(myNick).then(keys => {
      setKeyPair(keys);
    });

    const currentSettings = LocalDB.getSettings(myNick);
    setSettings(currentSettings);

    // Initial load from LocalDB
    setContacts(LocalDB.getContacts(myNick));
    setGroups(LocalDB.getGroups(myNick));
    setNotifications(LocalDB.getNotifications(myNick));
    setConversations(LocalDB.getConversationsList(myNick));

    // Connect to Websocket
    wsService.connect(myNick);
    setConnectionStatus('connecting');

    // Register WebSocket event listeners
    const handleStatus = (_evt: string, data: any) => {
      setConnectionStatus(data.status);
    };

    const handlePresence = (_evt: string, data: any) => {
      setOnlineUsers(data);
      // Cache in session storage for E2EE key lookup
      sessionStorage.setItem('mestre_users_presence', JSON.stringify(data));
    };

    const handleMessagesUpdated = (_evt: string, data: any) => {
      setConversations(LocalDB.getConversationsList(myNick));
      setNotifications(LocalDB.getNotifications(myNick));

      // If we are currently looking at the updated conversation, reload message state
      if (selectedChatId && (!data.targetId || data.targetId.toLowerCase() === selectedChatId.toLowerCase())) {
        setMessages(LocalDB.getMessages(myNick, selectedChatId));
        LocalDB.clearConversationUnread(myNick, selectedChatId);
      }
    };

    const handleMsgStatusChange = (_evt: string, data: any) => {
      if (selectedChatId) {
        setMessages(LocalDB.getMessages(myNick, selectedChatId));
      }
    };

    const handleTypingState = (_evt: string, data: any) => {
      if (!selectedChatId) return;

      const isForCurrentChat = data.isGroup 
        ? data.groupId?.toLowerCase() === selectedChatId.toLowerCase()
        : data.from?.toLowerCase() === selectedChatId.toLowerCase();

      if (isForCurrentChat) {
        if (data.isTyping) {
          setTypingUsers(prev => prev.includes(data.from) ? prev : [...prev, data.from]);
        } else {
          setTypingUsers(prev => prev.filter(u => u !== data.from));
        }
      }
    };

    const handleCallIncoming = (_evt: string, data: any) => {
      const ringSess: CallSession = {
        id: data.callId,
        partnerNick: data.from,
        partnerName: data.senderName || data.from.slice(1),
        partnerAvatar: data.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.from}`,
        type: data.callType,
        status: 'ringing',
        direction: 'incoming',
        durationSeconds: 0
      };
      setCallSession(ringSess);

      // Play ringing sound or notification
      LocalDB.addNotification(myNick, {
        title: `Chamada de ${ringSess.partnerName}`,
        description: `Recebendo chamada de ${ringSess.type === 'video' ? 'vídeo' : 'voz'} criptografada.`,
        type: 'call'
      });
      setNotifications(LocalDB.getNotifications(myNick));
    };

    const handleCallAccepted = (_evt: string, _data: any) => {
      setCallSession(prev => prev ? { ...prev, status: 'connected' } : null);
    };

    const handleCallDeclined = (_evt: string, _data: any) => {
      setCallSession(null);
      setExclusionToast({
        title: 'Chamada Recusada',
        description: 'A chamada foi recusada ou o usuário está ocupado.'
      });
    };

    const handleCallHungup = (_evt: string, _data: any) => {
      setCallSession(null);
    };

    const handleSysBan = (_evt: string, data: any) => {
      setExclusionToast({
        title: 'Conta Suspensa',
        description: data || 'Seu @nick foi banido do Mestre por violação de termos.'
      });
      handleWipeAllData();
    };

    const handleGroupDeleted = (_evt: string, data: any) => {
      const { groupId } = data;
      LocalDB.leaveGroup(myNick, groupId);
      setGroups(LocalDB.getGroups(myNick));
      if (selectedChatId === groupId) {
        setSelectedChatId(null);
        setActiveTab('home');
      }
      notifySystemExclusion(
        'Grupo Deletado',
        'Uma comunidade foi permanentemente deletada pelo criador.'
      );
    };

    wsService.on('status', handleStatus);
    wsService.on('presence', handlePresence);
    wsService.on('messages_updated', handleMessagesUpdated);
    wsService.on('msg_status_change', handleMsgStatusChange);
    wsService.on('typing_state', handleTypingState);
    wsService.on('call_incoming', handleCallIncoming);
    wsService.on('call_accepted', handleCallAccepted);
    wsService.on('call_declined', handleCallDeclined);
    wsService.on('call_hungup', handleCallHungup);
    wsService.on('sys_ban', handleSysBan);
    wsService.on('group_deleted', handleGroupDeleted);

    // Clean up
    return () => {
      wsService.off('status', handleStatus);
      wsService.off('presence', handlePresence);
      wsService.off('messages_updated', handleMessagesUpdated);
      wsService.off('msg_status_change', handleMsgStatusChange);
      wsService.off('typing_state', handleTypingState);
      wsService.off('call_incoming', handleCallIncoming);
      wsService.off('call_accepted', handleCallAccepted);
      wsService.off('call_declined', handleCallDeclined);
      wsService.off('call_hungup', handleCallHungup);
      wsService.off('sys_ban', handleSysBan);
      wsService.off('group_deleted', handleGroupDeleted);
      wsService.disconnect();
    };
  }, [myNick, selectedChatId]);

  // Apply dark/light theme options upon loading settings
  useEffect(() => {
    if (!settings) return;
    const body = document.body;
    if (settings.appearance.theme === 'light') {
      body.classList.add('theme-light');
      body.classList.remove('dark');
    } else {
      body.classList.remove('theme-light');
      body.classList.add('dark');
    }
  }, [settings?.appearance.theme]);

  // Action: Open Active Chat screen
  const handleStartChat = (targetId: string, isGroup: boolean = false) => {
    setSelectedChatId(targetId);
    setIsChatGroup(isGroup);
    setTypingUsers([]);
    
    if (myNick) {
      setMessages(LocalDB.getMessages(myNick, targetId));
      LocalDB.clearConversationUnread(myNick, targetId);
      setConversations(LocalDB.getConversationsList(myNick));
    }
    setActiveTab('chats');
  };

  // Action: Send Message
  const handleSendMessage = (text: string, type: 'text' | 'file' | 'audio', fileData?: any, parentMsgId?: string) => {
    if (!myNick || !selectedChatId) return;

    wsService.sendMessage(selectedChatId, text, type, fileData, parentMsgId, isChatGroup).then(() => {
      // Reload local messages state immediately
      setMessages(LocalDB.getMessages(myNick, selectedChatId));
      setConversations(LocalDB.getConversationsList(myNick));

      // Simulate chatbot reply if sending to a seeded profile
      const seedNicks = ['@camila', '@mari', '@beatriz', '@julia', '@lucas', '@pedro', '@gabriel', '@felipe'];
      if (seedNicks.includes(selectedChatId.toLowerCase()) && !isChatGroup) {
        
        const getBotReply = (botNick: string, userMsg: string): string => {
          const msgLower = userMsg.toLowerCase();
          const target = botNick.toLowerCase();
          
          if (target === '@camila') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'Oi! Tudo bem? Fico super feliz que tenha me mandado mensagem. O que você faz de bom no tempo livre? 😊';
            }
            if (msgLower.includes('tudo') || msgLower.includes('bem')) {
              return 'Tudo ótimo por aqui! Estou lendo um romance maravilhoso. E com você, como está sendo seu dia?';
            }
            if (msgLower.includes('faz') || msgLower.includes('gosta') || msgLower.includes('curte')) {
              return 'Eu amo ler romances, tomar um bom café e fazer caminhadas ao ar livre. E você? O que te atrai de verdade?';
            }
            return 'Que legal! Gosto muito de conversar e conhecer melhor as pessoas. Me conta mais sobre o que você busca por aqui? ❤️';
          }
          if (target === '@mari') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'Opa, e aí! Beleza? Que bom que chamou! Estou sempre animada pra papear e dar umas risadas. Qual é a boa de hoje? 😜';
            }
            if (msgLower.includes('tudo') || msgLower.includes('bem')) {
              return 'Tudo ótimo, na maior vibe positiva! Acabei de colocar uma playlist animada aqui. E você, o que tá fazendo?';
            }
            return 'Hahaha adorei! Curto muito sair, ouvir música e curtir momentos leves de pura diversão. Vamos marcar algo divertido qualquer dia! 🎉';
          }
          if (target === '@beatriz') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'Olá! Muito prazer. Gosto de usar o Aether para fazer parcerias de negócios, networking e conexões intelectuais. Qual é a sua área de atuação?';
            }
            return 'Interessante! Acho que a tecnologia e conexões seguras trazem oportunidades incríveis para trocas profissionais. Vamos debater mais ideias!';
          }
          if (target === '@julia') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'Olá! Tudo bem? Adoro conversar por aqui. Me conta mais sobre você, o que você mais gosta de fazer nos finais de semana? 🌹';
            }
            return 'Que maravilhoso! Gosto de jantares tranquilos, cinema e sinto falta de conversas profundas e românticas em um relacionamento sério. O que você acha?';
          }
          if (target === '@lucas') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'E aí, parça! Tudo tranquilo? Bora trocar uma ideia e descontrair. O que tá jogando ou assistindo ultimamente? 🎮';
            }
            return 'Massa demais! Curto muito games, futebol, churrasco e dar um rolê com os amigos pra descontrair. Vamos trocando ideias!';
          }
          if (target === '@pedro') {
            if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
              return 'Olá! Tudo ótimo por aqui, e com você? Busco amizades sinceras que possam evoluir para um relacionamento de verdade. O que você valoriza em uma pessoa? 🤝';
            }
            return 'Excelente ponto de vista! Acredito que lealdade, honestidade e companheirismo são a base de tudo. Desejo muito construir algo sólido.';
          }
          if (target === '@gabriel') {
            return 'E aí! Blz? Sou fã de tecnologia, investimentos e novos projetos. Se quiser trocar umas ideias sobre o mercado ou programar algo inovador, conta comigo! 💻';
          }
          if (target === '@felipe') {
            return 'Fala jovem! Tranquilidade total? Levo a vida de forma leve, sem pressa. Vamos conversar e ver no que dá! Qual o assunto de hoje? 🏄‍♂️';
          }
          return 'Oi! Legal sua mensagem. Estou online e curtindo a comunidade! 😊';
        };

        const botReply = getBotReply(selectedChatId, text);
        const replyMsgId = `reply-${Math.random().toString(36).substr(2, 9)}`;
        const replyTimestamp = new Date().toISOString();

        const botProfile = onlineUsers.find(u => u.nick.toLowerCase() === selectedChatId.toLowerCase()) || {
          name: selectedChatId.substring(1),
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedChatId}`
        };

        const localMsg: ChatMessage = {
          id: replyMsgId,
          from: selectedChatId,
          to: myNick,
          content: botReply,
          decryptedContent: botReply,
          type: 'text',
          timestamp: replyTimestamp,
          isGroup: false,
          deliveryStatus: 'delivered'
        };

        setTimeout(() => {
          LocalDB.addMessage(myNick, selectedChatId, localMsg);
          LocalDB.updateConversationLastMsg(
            myNick,
            selectedChatId,
            botProfile.name,
            botProfile.avatar,
            false,
            replyTimestamp,
            true
          );

          LocalDB.addNotification(myNick, {
            title: botProfile.name,
            description: botReply,
            type: 'message'
          });

          // Trigger updates in state
          setMessages(LocalDB.getMessages(myNick, selectedChatId));
          setConversations(LocalDB.getConversationsList(myNick));
          setNotifications(LocalDB.getNotifications(myNick));

          // Play message sound effect
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav');
            audio.volume = 0.2;
            audio.play().catch(() => {});
          } catch (e) {}
        }, 1500);
      }
    });
  };

  // Action: Logical delete message
  const handleDeleteMessage = (msgId: string) => {
    if (!myNick || !selectedChatId) return;
    LocalDB.deleteMessage(myNick, selectedChatId, msgId);
    setMessages(LocalDB.getMessages(myNick, selectedChatId));

    notifySystemExclusion(
      'Mensagem Apagada',
      `Uma mensagem individual (ID: ${msgId}) foi removida e submetida a sanitização lógica no chat com ${selectedChatId}.`
    );

    wsService.send({
      type: 'message:action',
      messageId: msgId,
      action: 'delete',
      to: isChatGroup ? undefined : selectedChatId,
      isGroup: isChatGroup,
      groupId: isChatGroup ? selectedChatId : undefined
    });
  };

  // Action: Edit message content
  const handleEditMessage = async (msgId: string, text: string) => {
    if (!myNick || !selectedChatId) return;

    const keys = LocalDB.getSessionKeys(myNick);
    const symmetricKey = keys[selectedChatId.toLowerCase()];

    if (symmetricKey) {
      const encrypted = await CryptoService.encryptMessage(text, symmetricKey);
      LocalDB.editMessage(myNick, selectedChatId, msgId, encrypted.ciphertext, text);
      setMessages(LocalDB.getMessages(myNick, selectedChatId));

      wsService.send({
        type: 'message:action',
        messageId: msgId,
        action: 'edit',
        payload: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv
        },
        to: isChatGroup ? undefined : selectedChatId,
        isGroup: isChatGroup,
        groupId: isChatGroup ? selectedChatId : undefined
      });
    }
  };

  // Action: React to message
  const handleReactMessage = (msgId: string, emoji: string, add: boolean) => {
    if (!myNick || !selectedChatId) return;

    // React in database
    const localMsgs = LocalDB.getMessages(myNick, selectedChatId);
    const msg = localMsgs.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      if (add) {
        if (!msg.reactions[emoji].includes(myNick)) msg.reactions[emoji].push(myNick);
      } else {
        msg.reactions[emoji] = msg.reactions[emoji].filter(n => n !== myNick);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      }
      LocalDB.saveMessages(myNick, selectedChatId, localMsgs);
      setMessages(localMsgs);

      // Send to partner/group
      wsService.send({
        type: 'message:action',
        messageId: msgId,
        action: 'react',
        payload: { emoji, add },
        to: isChatGroup ? undefined : selectedChatId,
        isGroup: isChatGroup,
        groupId: isChatGroup ? selectedChatId : undefined
      });
    }
  };

  // Action: Toggle pinned state
  const handleTogglePin = (msgId: string) => {
    if (!myNick || !selectedChatId) return;
    LocalDB.togglePinMessage(myNick, selectedChatId, msgId);
    setMessages(LocalDB.getMessages(myNick, selectedChatId));

    wsService.send({
      type: 'message:action',
      messageId: msgId,
      action: 'pin',
      to: isChatGroup ? undefined : selectedChatId,
      isGroup: isChatGroup,
      groupId: isChatGroup ? selectedChatId : undefined
    });
  };

  // Action: Initiate Voice/Video Call
  const handleStartCall = (nick: string, type: 'voice' | 'video') => {
    if (!myNick) return;

    const callId = `call-${Math.random().toString(36).substr(2, 9)}`;
    const outgoingSess: CallSession = {
      id: callId,
      partnerNick: nick,
      partnerName: nick.slice(1),
      partnerAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${nick}`,
      type,
      status: 'ringing',
      direction: 'outgoing',
      durationSeconds: 0
    };

    setCallSession(outgoingSess);

    // Send Dial to WebSocket
    wsService.send({
      type: 'call:dial',
      callId,
      to: nick,
      callType: type,
      senderName: settings?.account.name || myNick,
      senderAvatar: settings?.account.avatar || ''
    });

    // Save outgoing call in recent list
    const key = `mestre_call_history_${myNick.toLowerCase()}`;
    const recentCalls = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : [];
    const newRecord = {
      id: `call-rec-${Math.random().toString(36).substr(2, 9)}`,
      partnerNick: nick,
      partnerName: nick.slice(1),
      partnerAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${nick}`,
      type,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      durationSeconds: 0
    };
    localStorage.setItem(key, JSON.stringify([newRecord, ...recentCalls]));
  };

  // Call Signaling Controls
  const handleAcceptCall = () => {
    if (!callSession) return;
    wsService.send({
      type: 'call:accept',
      callId: callSession.id,
      to: callSession.partnerNick
    });
    setCallSession(prev => prev ? { ...prev, status: 'connected' } : null);
  };

  const handleDeclineCall = () => {
    if (!callSession) return;
    wsService.send({
      type: 'call:decline',
      callId: callSession.id,
      to: callSession.partnerNick
    });
    setCallSession(null);
  };

  const handleHangupCall = () => {
    if (!callSession) return;
    wsService.send({
      type: 'call:hangup',
      callId: callSession.id,
      to: callSession.partnerNick
    });

    // If connected, update local recent call log duration
    if (myNick && callSession.status === 'connected') {
      const key = `mestre_call_history_${myNick.toLowerCase()}`;
      const history = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : [];
      if (history.length > 0) {
        history[0].durationSeconds = 45; // simulated mock talk seconds
        localStorage.setItem(key, JSON.stringify(history));
      }
    }
    setCallSession(null);
  };

  // Contacts Management
  const handleAddContact = (nick: string, name: string, avatar: string, bio: string) => {
    if (!myNick) return;
    LocalDB.addContact(myNick, { nick, name, avatar, bio, status: 'offline', isBlocked: false });
    setContacts(LocalDB.getContacts(myNick));
    setExclusionToast({
      title: 'Amigo Adicionado',
      description: `${name} foi adicionado à sua lista de amigos.`
    });
  };

  const handleRemoveContact = (nick: string) => {
    if (!myNick) return;
    const contact = contacts.find(c => c.nick === nick);
    const name = contact ? contact.name : nick;
    LocalDB.removeContact(myNick, nick);
    setContacts(LocalDB.getContacts(myNick));
    
    notifySystemExclusion(
      'Contato Removido',
      `O contato ${name} (${nick}) foi excluído da sua lista de amigos com sucesso.`
    );
  };

  const handleToggleBlock = (nick: string) => {
    if (!myNick) return;
    LocalDB.toggleBlockContact(myNick, nick);
    setContacts(LocalDB.getContacts(myNick));
  };

  // Communities Management
  const handleJoinGroup = (group: GroupInfo) => {
    if (!myNick) return;
    LocalDB.addGroup(myNick, group);
    setGroups(LocalDB.getGroups(myNick));
    handleStartChat(group.id, true);
  };

  const handleLeaveGroup = (groupId: string) => {
    if (!myNick) return;
    const groupObj = groups.find(g => g.id === groupId);
    const groupName = groupObj ? groupObj.name : groupId;
    
    askConfirmation(
      'Sair da Comunidade',
      `Deseja realmente sair do grupo/comunidade "${groupName}"?`,
      async () => {
        try {
          const response = await fetch(`/api/groups/${groupId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nick: myNick })
          });

          // We ALWAYS proceed with local group removal even if server returns 404 or fails,
          // because the user wants to leave the group locally.
          LocalDB.leaveGroup(myNick, groupId);
          setGroups(LocalDB.getGroups(myNick));
          if (selectedChatId === groupId) {
            setSelectedChatId(null);
            setActiveTab('home');
          }

          if (response.ok) {
            notifySystemExclusion(
              'Saída de Grupo',
              `Você se desvinculou e saiu permanentemente do grupo/comunidade "${groupName}".`
            );

            // Notify WebSocket server too just in case
            wsService.send({
              type: 'group:leave',
              groupId,
              nick: myNick
            });
          } else {
            notifySystemExclusion(
              'Saída de Grupo (Removido Localmente)',
              `Você se desvinculou localmente do grupo "${groupName}" (servidor indicou indisponibilidade).`
            );
          }
        } catch (err) {
          // Fallback to local leave if offline
          LocalDB.leaveGroup(myNick, groupId);
          setGroups(LocalDB.getGroups(myNick));
          if (selectedChatId === groupId) {
            setSelectedChatId(null);
            setActiveTab('home');
          }
          
          notifySystemExclusion(
            'Saída de Grupo (Offline)',
            `Você se desvinculou localmente do grupo/comunidade "${groupName}".`
          );
        }
      }
    );
  };

  const handleClearChatHistory = (targetId: string, isGroup: boolean) => {
    if (!myNick) return;
    askConfirmation(
      'Limpar Histórico',
      isGroup 
        ? 'Deseja realmente limpar todo o histórico de mensagens deste grupo de forma permanente?' 
        : 'Deseja realmente limpar todo o histórico de mensagens com este contato de forma permanente?',
      () => {
        LocalDB.saveMessages(myNick, targetId, []);
        if (selectedChatId === targetId) {
          setMessages([]);
        }
        notifySystemExclusion(
          'Histórico de Chat Limpo',
          `O histórico de mensagens do chat com ${isGroup ? 'o grupo' : 'o contato'} ${targetId} foi apagado do dispositivo de forma permanente.`
        );
      }
    );
  };

  const handleDeleteConversation = (targetId: string) => {
    if (!myNick) return;
    askConfirmation(
      'Excluir Conversa',
      'Deseja realmente excluir esta conversa e todo o seu histórico de mensagens?',
      () => {
        // Clear messages
        LocalDB.saveMessages(myNick, targetId, []);
        
        // Remove from conversation list
        const list = LocalDB.getConversationsList(myNick);
        const updated = list.filter(c => c.nick.toLowerCase() !== targetId.toLowerCase());
        LocalDB.saveConversationsList(myNick, updated);
        setConversations(updated);
        
        if (selectedChatId === targetId) {
          setSelectedChatId(null);
          setActiveTab('home');
        }
        
        notifySystemExclusion(
          'Conversa Excluída',
          `A conversa inteira com ${targetId} e todas as mensagens associadas foram eliminadas permanentemente do sistema.`
        );
      }
    );
  };

  const handleCreateGroup = (group: GroupInfo) => {
    if (!myNick) return;
    LocalDB.addGroup(myNick, group);
    setGroups(LocalDB.getGroups(myNick));
    handleStartChat(group.id, true);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!myNick) return;
    LocalDB.leaveGroup(myNick, groupId);
    setGroups(LocalDB.getGroups(myNick));
    if (selectedChatId === groupId) {
      setSelectedChatId(null);
      setActiveTab('home');
    }
  };

  // Notification management
  const handleMarkAllNotificationsRead = () => {
    if (!myNick) return;
    LocalDB.markAllNotificationsRead(myNick);
    setNotifications(LocalDB.getNotifications(myNick));
  };

  const handleClearAllNotifications = () => {
    if (!myNick) return;
    LocalDB.clearNotifications(myNick);
    setNotifications(LocalDB.getNotifications(myNick));
    
    notifySystemExclusion(
      'Notificações Limpas',
      'Todas as notificações do sistema foram apagadas do armazenamento local do dispositivo.'
    );
  };

  // System preference update
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    if (!myNick) return;
    LocalDB.saveSettings(myNick, newSettings);
    setSettings(newSettings);
  };

  // Wipe All Data Logical Destruction (Wipeout)
  const handleWipeAllData = () => {
    if (myNick) {
      const prevNick = myNick;
      LocalDB.wipeAllData(myNick);
      
      // Post warning alert or wipe notification simulation
      setExclusionToast({
        title: 'Dados Destruídos',
        description: 'Autodestruição Concluída. Todos os dados locais, chaves criptográficas e registros foram eliminados.'
      });
    }
    wsService.disconnect();
    setMyNick(null);
    setSelectedChatId(null);
    setMessages([]);
    setConversations([]);
    setActiveTab('home');
  };

  const handleReportAbuseSubmit = async (reported: string, reason: string, details: string) => {
    if (!myNick) return;
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter: myNick,
          reported,
          reason,
          details
        })
      });
    } catch (e) {
      console.warn('Erro ao submeter denúncia:', e);
    }
  };

  // RENDER AUTH REGISTRATION SCREEN
  if (!myNick) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#0a0d14] flex items-center justify-center relative">
        <Register 
          onSuccess={(nick) => {
            LocalDB.setMyNick(nick);
            setMyNick(nick);
          }} 
        />
      </div>
    );
  }

  const currentUserProfile: UserProfile = {
    nick: myNick,
    name: settings?.account?.name || myNick.substring(1),
    avatar: settings?.account?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${myNick}`,
    bio: settings?.account?.bio || '',
    status: 'online',
    publicKey: keyPair?.publicKey || '',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  };

  // RENDER MAIN APPLICATION DASHBOARD WORKSPACE
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#07090e] text-[#f3f4f6] flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        currentView={activeTab}
        setView={(tab) => {
          setActiveTab(tab as any);
          if (tab !== 'chats') {
            setSelectedChatId(null);
          }
        }}
        user={currentUserProfile}
        notifications={notifications}
        messagesUnreadCount={conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
        onLogout={handleWipeAllData}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* CORE WORKSPACE CONTENT AND PANELS CARDS */}
      <div className="flex-1 h-full overflow-hidden flex flex-col relative">
        
        {/* MOBILE TOP BAR HEADER */}
        <div className="md:hidden flex h-14 bg-[#0F0F12] border-b border-white/5 px-4 items-center justify-between shrink-0 z-30">
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={() => setMobileSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-xl cursor-pointer focus:outline-none"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6.5 h-6.5 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <span className="font-extrabold text-sm tracking-wider text-indigo-400">AETHER</span>
          </div>

          <button 
            id="mobile-avatar-settings-btn"
            onClick={() => setActiveTab('settings')}
            className="relative shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-full"
            title="Configurações"
          >
            <img 
              src={currentUserProfile.avatar} 
              alt={currentUserProfile.name} 
              className="w-7 h-7 rounded-full border border-indigo-500/30 object-cover"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>

        {/* Render selected view tab */}
        {activeTab === 'home' && (
          <Dashboard 
            user={currentUserProfile}
            onlineUsers={onlineUsers}
            conversations={conversations}
            onStartChat={(targetId) => handleStartChat(targetId, false)}
            onStartCall={handleStartCall}
            onOpenGroups={() => setActiveTab('communities')}
            onDeleteConversation={handleDeleteConversation}
            setView={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'chats' && (
          selectedChatId ? (
            <ActiveChat 
              myNick={myNick}
              targetId={selectedChatId}
              isGroup={isChatGroup}
              messages={messages}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onEditMessage={handleEditMessage}
              onReactMessage={handleReactMessage}
              onTogglePin={handleTogglePin}
              onStartCall={handleStartCall}
              onBack={() => {
                setSelectedChatId(null);
                setActiveTab('home');
              }}
              onToggleBlock={handleToggleBlock}
              isBlocked={LocalDB.isBlocked(myNick, selectedChatId)}
              onSubmitReport={handleReportAbuseSubmit}
              onLeaveGroup={handleLeaveGroup}
              onClearChatHistory={handleClearChatHistory}
              onDeleteConversation={handleDeleteConversation}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-blue-950/20 text-blue-400 border border-blue-500/25 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-6.5 h-6.5" />
              </div>
              <h3 className="text-base font-bold text-gray-200">Selecione uma Conversa</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                Escolha um chat na barra lateral Início, gerencie seus Amigos ou Comunidades para enviar mensagens privadas criptografadas.
              </p>
            </div>
          )
        )}

        {activeTab === 'calls' && (
          <CallsPanel 
            myNick={myNick}
            onStartCall={handleStartCall}
            onlineUsers={onlineUsers}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsPanel 
            myNick={myNick}
            contacts={contacts}
            onlineUsers={onlineUsers}
            onAddContact={handleAddContact}
            onRemoveContact={handleRemoveContact}
            onToggleBlock={handleToggleBlock}
            onStartChat={handleStartChat}
            onStartCall={handleStartCall}
          />
        )}

        {activeTab === 'communities' && (
          <CommunitiesPanel 
            myNick={myNick}
            groups={groups}
            onJoinGroup={handleJoinGroup}
            onLeaveGroup={handleLeaveGroup}
            onStartGroupChat={(groupId) => handleStartChat(groupId, true)}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsPanel 
            notifications={notifications}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClearAll={handleClearAllNotifications}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel myNick={myNick} />
        )}

        {activeTab === 'settings' && settings && keyPair && (
          <SettingsPanel 
            myNick={myNick}
            settings={settings}
            keyPair={keyPair}
            onUpdateSettings={handleUpdateSettings}
            onWipeData={handleWipeAllData}
          />
        )}

        {activeTab === 'about' && (
          <AboutPanel user={currentUserProfile} />
        )}
      </div>

      {/* WEBRTC CALL INCOMING / OUTGOING FLOATING OVERLAY */}
      {callSession && (
        <CallUI 
          session={callSession}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onHangup={handleHangupCall}
        />
      )}

      {/* EXCLUSION SYSTEM NOTIFICATION TOAST */}
      {exclusionToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[#16161A]/95 border-l-4 border-red-500 rounded-xl shadow-2xl p-4 flex items-start space-x-3 max-w-sm sm:max-w-md animate-fadeIn text-left backdrop-blur-md">
          <div className="w-9 h-9 bg-red-950/30 text-red-400 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-extrabold text-red-400 tracking-wider uppercase">Sistema Notificado</h4>
            <p className="text-xs font-bold text-gray-200 mt-0.5">{exclusionToast.title}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed max-w-[250px] sm:max-w-[320px]">
              {exclusionToast.description}
            </p>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-extrabold text-gray-200 mb-1">{confirmModal.title}</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">{confirmModal.message}</p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a212e]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer focus:outline-none"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
