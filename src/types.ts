export type UserStatus = 'online' | 'offline' | 'busy' | 'away';

export interface UserProfile {
  nick: string; // unique @nick
  name: string;
  avatar: string;
  bio: string;
  status: UserStatus;
  customStatus?: string;
  publicKey: string; // Base64 RSA public key
  role: 'admin' | 'user';
  createdAt: string;
  lastSeen: string;
  gender?: 'homem' | 'mulher';
  interest?: 'diversão' | 'relacionamento' | 'outras';
}

export interface LocalKeyPair {
  publicKey: string; // Base64
  privateKey: string; // Base64
  fingerprint: string; // Hex SHA-256 fingerprint of public key
}

export interface ChatMessage {
  id: string;
  from: string; // sender @nick
  to: string; // recipient @nick or group ID
  content: string; // base64 encrypted payload (E2EE) or system msg
  decryptedContent?: string; // only kept in memory after local decryption
  type: 'text' | 'file' | 'audio' | 'system';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  parentMsgId?: string; // For replies
  timestamp: string;
  isGroup: boolean;
  groupId?: string;
  reactions?: Record<string, string[]>; // emoji -> array of @nicks
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'queued_server';
}

export interface Contact {
  nick: string;
  name: string;
  avatar: string;
  bio: string;
  status: UserStatus;
  isBlocked: boolean;
  addedAt: string;
  sharedKey?: string; // Symmetric AES key for this direct chat, encrypted locally
}

export interface ConversationItem {
  nick: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessageTime: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creator: string;
  members: { nick: string; role: 'admin' | 'moderator' | 'member' }[];
  rules?: string;
  createdAt: string;
  pinnedMessages?: string[]; // array of message IDs
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'message' | 'call' | 'contact_request' | 'group_invite' | 'security';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface CallSession {
  id: string;
  partnerNick: string;
  partnerName: string;
  partnerAvatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'connecting' | 'ringing' | 'connected' | 'busy' | 'disconnected' | 'failed' | 'reconnecting';
  startTime?: string;
  durationSeconds: number;
}

export interface SystemSettings {
  account: {
    name: string;
    avatar: string;
    bio: string;
  };
  privacy: {
    visibility: 'everyone' | 'friends' | 'nobody';
    whoCanMessage: 'everyone' | 'friends';
    whoCanCall: 'everyone' | 'friends' | 'nobody';
    showOnlineStatus: boolean;
    silenceUnknownCalls: boolean;
  };
  security: {
    additionalAuthEnabled: boolean;
    pinCode?: string;
    activeSessions: Array<{ device: string; ip: string; lastActive: string }>;
  };
  notifications: {
    messagesEnabled: boolean;
    callsEnabled: boolean;
    groupsEnabled: boolean;
    mentionsEnabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    animationsEnabled: boolean;
  };
}

export interface ReportItem {
  id: string;
  reporter: string;
  reported: string;
  reason: 'spam' | 'abuse' | 'harassment' | 'impersonation' | 'illegal' | 'other';
  details: string;
  timestamp: string;
}
