import { ChatMessage, UserProfile, LocalKeyPair } from '../types';
import { LocalDB } from './localDB';
import { CryptoService } from './cryptoService';

type WsCallback = (event: string, data: any) => void;

export class WebsocketService {
  private socket: WebSocket | null = null;
  private url: string = '';
  private reconnectTimer: any = null;
  private myNick: string = '';
  private keyPair: LocalKeyPair | null = null;
  private callbacks = new Map<string, Set<WsCallback>>();
  private isConnecting = false;
  public connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use window.location.host, which automatically tunnels to port 3000 in AI Studio
    this.url = `${protocol}//${window.location.host}`;
  }

  // Register callbacks for events
  on(event: string, callback: WsCallback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off(event: string, callback: WsCallback) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event)!.delete(callback);
    }
  }

  private trigger(event: string, data: any) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event)!.forEach(cb => {
        try {
          cb(event, data);
        } catch (e) {
          console.error(`Erro no callback do evento ${event}:`, e);
        }
      });
    }
    // Also trigger '*' generic listener
    if (this.callbacks.has('*')) {
      this.callbacks.get('*')!.forEach(cb => cb(event, data));
    }
  }

  async connect(myNick: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.myNick === myNick) return; // already connected with this user
      this.disconnect();
    }

    this.myNick = myNick;
    this.isConnecting = true;
    this.connectionStatus = 'connecting';
    this.trigger('status', { status: 'connecting' });

    // Load/Create cryptographic keys for E2EE
    this.keyPair = await CryptoService.getOrCreateKeyPair(myNick);

    try {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.connectionStatus = 'connected';
        this.isConnecting = false;
        this.trigger('status', { status: 'connected' });

        // Authenticate immediately
        this.send({
          type: 'auth',
          nick: this.myNick,
          status: 'online',
          publicKey: this.keyPair?.publicKey,
        });
      };

      this.socket.onclose = () => {
        this.connectionStatus = 'disconnected';
        this.trigger('status', { status: 'disconnected' });
        
        if (this.isConnecting) {
          this.isConnecting = false;
        }
        
        // Auto-reconnect every 5 seconds
        this.reconnectTimer = setTimeout(() => {
          this.connect(myNick);
        }, 5000);
      };

      this.socket.onerror = (err) => {
        this.trigger('error', err);
      };

      this.socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleIncomingEvent(data);
        } catch (e) {
          console.error('Falha ao processar mensagem do servidor WS:', e);
        }
      };
    } catch (err) {
      this.connectionStatus = 'disconnected';
      this.isConnecting = false;
      this.trigger('status', { status: 'disconnected' });
      this.reconnectTimer = setTimeout(() => this.connect(myNick), 5000);
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.onclose = null; // prevent reconnect trigger
      this.socket.close();
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
    this.trigger('status', { status: 'disconnected' });
  }

  send(payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  // Handle incoming WS notifications/messages
  private async handleIncomingEvent(data: any) {
    switch (data.type) {
      case 'auth:ok': {
        this.trigger('authenticated', data.user);
        break;
      }
      case 'auth:fail': {
        this.trigger('auth_failed', data.error);
        break;
      }
      case 'presence:update': {
        this.trigger('presence', data.users);
        break;
      }
      case 'messages:pending': {
        // We received pending messages from server while we were offline
        const list = data.messages;
        for (const msg of list) {
          await this.processAndSaveMessage(msg);
        }
        // Acknowledge receipt to server so it removes temporary queue
        this.send({ type: 'pending:ack' });
        this.trigger('messages_updated', {});
        break;
      }
      case 'message:incoming': {
        const msg = data.message;
        await this.processAndSaveMessage(msg);
        this.trigger('messages_updated', { targetId: msg.isGroup ? msg.groupId : msg.from });
        break;
      }
      case 'message:delivered': {
        this.trigger('msg_status_change', { id: data.messageId, status: 'delivered' });
        break;
      }
      case 'message:queued': {
        this.trigger('msg_status_change', { id: data.messageId, status: 'queued_server' });
        break;
      }
      case 'typing:state': {
        this.trigger('typing_state', data);
        break;
      }
      case 'message:action': {
        const { messageId, action, payload, from, isGroup, groupId } = data;
        const targetId = isGroup ? groupId : from;
        
        if (action === 'delete') {
          LocalDB.deleteMessage(this.myNick, targetId, messageId);
        } else if (action === 'edit') {
          // Edit local message if possible
          const keys = LocalDB.getSessionKeys(this.myNick);
          const symmetricKey = keys[targetId.toLowerCase()];
          if (symmetricKey && payload.ciphertext && payload.iv) {
            const dec = await CryptoService.decryptMessage(payload.ciphertext, symmetricKey, payload.iv);
            LocalDB.editMessage(this.myNick, targetId, messageId, payload.ciphertext, dec);
          } else {
            LocalDB.editMessage(this.myNick, targetId, messageId, '[Mensagem Editada Criptografada]', '[Conteúdo editado]');
          }
        } else if (action === 'react') {
          // React
          const messages = LocalDB.getMessages(this.myNick, targetId);
          const msg = messages.find(m => m.id === messageId);
          if (msg) {
            if (!msg.reactions) msg.reactions = {};
            const { emoji, add } = payload;
            if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
            if (add) {
              if (!msg.reactions[emoji].includes(from)) {
                msg.reactions[emoji].push(from);
              }
            } else {
              msg.reactions[emoji] = msg.reactions[emoji].filter(n => n !== from);
              if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
            }
            LocalDB.saveMessages(this.myNick, targetId, messages);
          }
        } else if (action === 'pin') {
          LocalDB.togglePinMessage(this.myNick, targetId, messageId);
        }
        this.trigger('messages_updated', { targetId });
        break;
      }
      case 'sys:banned': {
        this.trigger('sys_ban', data.message);
        break;
      }
      case 'group:deleted': {
        this.trigger('group_deleted', { groupId: data.groupId });
        break;
      }
      // WebRTC voice/video signalling callbacks
      case 'call:incoming': {
        this.trigger('call_incoming', data);
        break;
      }
      case 'call:accepted': {
        this.trigger('call_accepted', data);
        break;
      }
      case 'call:declined': {
        this.trigger('call_declined', data);
        break;
      }
      case 'call:signal': {
        this.trigger('call_signal', data);
        break;
      }
      case 'call:hungup': {
        this.trigger('call_hungup', data);
        break;
      }
    }
  }

  // Intercept, exchange key if needed, decrypt message and save locally
  private async processAndSaveMessage(msg: any) {
    const targetId = msg.isGroup ? msg.groupId : msg.from;

    // Check if we got an E2EE key exchange envelope attached
    if (msg.keyExchangeEnvelope && !msg.isGroup) {
      const keys = LocalDB.getSessionKeys(this.myNick);
      if (!keys[msg.from.toLowerCase()]) {
        // Decrypt symmetric key using our RSA private key
        try {
          const decryptedSymKey = await CryptoService.decryptSessionKey(
            msg.keyExchangeEnvelope,
            this.keyPair!.privateKey
          );
          LocalDB.saveSessionKey(this.myNick, msg.from, decryptedSymKey);
        } catch (e) {
          console.error('Falha ao descriptografar envelope de chave E2EE:', e);
        }
      }
    }

    // Attempt decryption
    let decryptedText = msg.content;
    if (msg.type !== 'system') {
      const keys = LocalDB.getSessionKeys(this.myNick);
      const symmetricKey = keys[targetId.toLowerCase()];

      if (symmetricKey && msg.iv) {
        try {
          decryptedText = await CryptoService.decryptMessage(msg.content, symmetricKey, msg.iv);
        } catch (e) {
          decryptedText = '[Erro de descriptografia - chave de sessão incompatível]';
        }
      } else if (!msg.isGroup) {
        decryptedText = '[Seguro - Sem chave de sessão local para ler esta mensagem]';
      }
    }

    const localMsg: ChatMessage = {
      id: msg.id,
      from: msg.from,
      to: msg.to,
      content: msg.content,
      decryptedContent: decryptedText,
      type: msg.type,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      fileUrl: msg.fileUrl,
      parentMsgId: msg.parentMsgId,
      timestamp: msg.timestamp,
      isGroup: msg.isGroup,
      groupId: msg.groupId,
      deliveryStatus: 'delivered',
    };

    LocalDB.addMessage(this.myNick, targetId, localMsg);

    // Update conversations list tracker
    LocalDB.updateConversationLastMsg(
      this.myNick,
      targetId,
      msg.senderName || msg.from,
      msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.from}`,
      msg.isGroup,
      msg.timestamp,
      true // increment unread
    );

    // Add visual app notification
    LocalDB.addNotification(this.myNick, {
      title: msg.senderName || msg.from,
      description: msg.type === 'file' ? '📁 Enviou um arquivo' : msg.type === 'audio' ? '🎤 Mensagem de voz' : decryptedText.substring(0, 50),
      type: 'message',
    });
  }

  // Encrypt and send message with real-time E2EE
  async sendMessage(to: string, text: string, type: 'text' | 'file' | 'audio' = 'text', fileData?: { name: string, size: number, url: string }, parentMsgId?: string, isGroup: boolean = false) {
    if (!this.myNick) return null;

    const messageId = `msg-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    let ciphertext = text;
    let ivStr = '';
    let keyExchangeEnvelope = '';

    if (type !== ('system' as any)) {
      // 1. Get or generate symmetric key for E2EE
      const keys = LocalDB.getSessionKeys(this.myNick);
      let symmetricKey = keys[to.toLowerCase()];

      if (!symmetricKey && !isGroup) {
        // No session key yet. Let's make one
        symmetricKey = await CryptoService.generateSymmetricKey();
        LocalDB.saveSessionKey(this.myNick, to, symmetricKey);

        // Fetch recipient's public key from presence/user sync
        const recipientPubKey = this.getRecipientPublicKey(to);
        if (recipientPubKey) {
          try {
            // Encrypt the AES key with recipient's public key
            keyExchangeEnvelope = await CryptoService.encryptSessionKey(symmetricKey, recipientPubKey);
          } catch (e) {
            console.error('Falha ao selar envelope de chave RSA:', e);
          }
        }
      }

      // Group messaging encrypts with general fallback symmetric key or group key
      if (isGroup && !symmetricKey) {
        symmetricKey = `AES-GCM-SYM-FALLBACK-GROUP-${to}`;
        LocalDB.saveSessionKey(this.myNick, to, symmetricKey);
      }

      // 2. Encrypt actual payload with symmetric key
      if (symmetricKey) {
        const encrypted = await CryptoService.encryptMessage(text, symmetricKey);
        ciphertext = encrypted.ciphertext;
        ivStr = encrypted.iv;
      }
    }

    const payloadMsg: any = {
      id: messageId,
      from: this.myNick,
      to,
      content: ciphertext,
      iv: ivStr,
      keyExchangeEnvelope,
      type,
      timestamp,
      isGroup,
      groupId: isGroup ? to : undefined,
      senderName: LocalDB.getSettings(this.myNick).account.name,
      senderAvatar: LocalDB.getSettings(this.myNick).account.avatar,
    };

    if (type === 'file' || type === 'audio') {
      payloadMsg.fileName = fileData?.name;
      payloadMsg.fileSize = fileData?.size;
      payloadMsg.fileUrl = fileData?.url;
    }

    if (parentMsgId) {
      payloadMsg.parentMsgId = parentMsgId;
    }

    // Save locally immediately (Optimistic update)
    const localMsg: ChatMessage = {
      id: messageId,
      from: this.myNick,
      to,
      content: ciphertext,
      decryptedContent: text,
      type,
      fileName: fileData?.name,
      fileSize: fileData?.size,
      fileUrl: fileData?.url,
      parentMsgId,
      timestamp,
      isGroup,
      groupId: isGroup ? to : undefined,
      deliveryStatus: 'sending',
    };

    LocalDB.addMessage(this.myNick, to, localMsg);
    
    // Update active conversation sorting
    LocalDB.updateConversationLastMsg(this.myNick, to, to, to, isGroup, timestamp, false);

    // Send through WebSocket
    const success = this.send({
      type: 'message:send',
      message: payloadMsg,
    });

    if (success) {
      LocalDB.updateMessageStatus(this.myNick, to, messageId, 'sent');
    } else {
      LocalDB.updateMessageStatus(this.myNick, to, messageId, 'queued_server');
    }

    return localMsg;
  }

  // Get recipient's public key from cached online users
  private getRecipientPublicKey(nick: string): string | null {
    // Return key cached in user profiles
    const cachedUsers = sessionStorage.getItem('mestre_users_presence');
    if (cachedUsers) {
      try {
        const list = JSON.parse(cachedUsers) as UserProfile[];
        const match = list.find(u => u.nick.toLowerCase() === nick.toLowerCase());
        return match ? match.publicKey : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

// Single active singleton to use across components
export const wsService = new WebsocketService();
export default wsService;
