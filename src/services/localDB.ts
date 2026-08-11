import { ChatMessage, Contact, GroupInfo, AppNotification, SystemSettings } from '../types';

export class LocalDB {
  static getMyNick(): string | null {
    return localStorage.getItem('mestre_current_user_nick');
  }

  static setMyNick(nick: string | null) {
    if (nick) {
      localStorage.setItem('mestre_current_user_nick', nick);
    } else {
      localStorage.removeItem('mestre_current_user_nick');
    }
  }

  // Session keys for direct chats (partnerNick -> AES key Base64)
  static getSessionKeys(myNick: string): Record<string, string> {
    const data = localStorage.getItem(`mestre_session_keys_${myNick.toLowerCase()}`);
    return data ? JSON.parse(data) : {};
  }

  static saveSessionKey(myNick: string, partnerNick: string, keyB64: string) {
    const keys = this.getSessionKeys(myNick);
    keys[partnerNick.toLowerCase()] = keyB64;
    localStorage.setItem(`mestre_session_keys_${myNick.toLowerCase()}`, JSON.stringify(keys));
  }

  // Messages database
  static getMessages(myNick: string, targetId: string): ChatMessage[] {
    const key = `mestre_messages_${myNick.toLowerCase()}_${targetId.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static saveMessages(myNick: string, targetId: string, messages: ChatMessage[]) {
    const key = `mestre_messages_${myNick.toLowerCase()}_${targetId.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }

  static addMessage(myNick: string, targetId: string, msg: ChatMessage) {
    const messages = this.getMessages(myNick, targetId);
    if (!messages.some(m => m.id === msg.id)) {
      messages.push(msg);
      this.saveMessages(myNick, targetId, messages);
    }
  }

  static updateMessageStatus(myNick: string, targetId: string, msgId: string, status: ChatMessage['deliveryStatus']) {
    const messages = this.getMessages(myNick, targetId);
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.deliveryStatus = status;
      this.saveMessages(myNick, targetId, messages);
    }
  }

  static deleteMessage(myNick: string, targetId: string, msgId: string) {
    const messages = this.getMessages(myNick, targetId);
    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      // Logical deletion
      messages[index].isDeleted = true;
      messages[index].content = 'ESTA MENSAGEM FOI APAGADA';
      messages[index].decryptedContent = 'Esta mensagem foi apagada.';
      this.saveMessages(myNick, targetId, messages);
    }
  }

  static editMessage(myNick: string, targetId: string, msgId: string, newEncryptedContent: string, newDecryptedContent: string) {
    const messages = this.getMessages(myNick, targetId);
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.isEdited = true;
      msg.content = newEncryptedContent;
      msg.decryptedContent = newDecryptedContent;
      this.saveMessages(myNick, targetId, messages);
    }
  }

  static togglePinMessage(myNick: string, targetId: string, msgId: string) {
    const messages = this.getMessages(myNick, targetId);
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      msg.isPinned = !msg.isPinned;
      this.saveMessages(myNick, targetId, messages);
    }
  }

  // Direct conversations list tracker (to know who we have chats with)
  static getConversationsList(myNick: string): { nick: string; name: string; avatar: string; isGroup: boolean; unreadCount: number; lastMessageTime: string }[] {
    const key = `mestre_conv_list_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    let list = JSON.parse(data);
    if (Array.isArray(list) && list.some(c => c.nick === 'grupo-geral')) {
      list = list.filter(c => c.nick !== 'grupo-geral');
      this.saveConversationsList(myNick, list);
    }
    return list;
  }

  static saveConversationsList(myNick: string, list: any[]) {
    const key = `mestre_conv_list_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(list));
  }

  static updateConversationLastMsg(myNick: string, targetId: string, name: string, avatar: string, isGroup: boolean, timestamp: string, incrementUnread: boolean = false) {
    const list = this.getConversationsList(myNick);
    const index = list.findIndex(c => c.nick.toLowerCase() === targetId.toLowerCase());
    if (index !== -1) {
      list[index].lastMessageTime = timestamp;
      if (incrementUnread) {
        list[index].unreadCount += 1;
      }
      // Move to top
      const item = list.splice(index, 1)[0];
      list.unshift(item);
    } else {
      list.unshift({
        nick: targetId,
        name,
        avatar,
        isGroup,
        unreadCount: incrementUnread ? 1 : 0,
        lastMessageTime: timestamp
      });
    }
    this.saveConversationsList(myNick, list);
  }

  static clearConversationUnread(myNick: string, targetId: string) {
    const list = this.getConversationsList(myNick);
    const item = list.find(c => c.nick.toLowerCase() === targetId.toLowerCase());
    if (item) {
      item.unreadCount = 0;
      this.saveConversationsList(myNick, list);
    }
  }

  // Contacts
  static getContacts(myNick: string): Contact[] {
    const key = `mestre_contacts_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static saveContacts(myNick: string, contacts: Contact[]) {
    const key = `mestre_contacts_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(contacts));
  }

  static addContact(myNick: string, contact: Omit<Contact, 'addedAt'>) {
    const contacts = this.getContacts(myNick);
    if (!contacts.some(c => c.nick.toLowerCase() === contact.nick.toLowerCase())) {
      contacts.push({
        ...contact,
        addedAt: new Date().toISOString()
      });
      this.saveContacts(myNick, contacts);
    }
  }

  static removeContact(myNick: string, contactNick: string) {
    let contacts = this.getContacts(myNick);
    contacts = contacts.filter(c => c.nick.toLowerCase() !== contactNick.toLowerCase());
    this.saveContacts(myNick, contacts);
  }

  static toggleBlockContact(myNick: string, contactNick: string) {
    const contacts = this.getContacts(myNick);
    const contact = contacts.find(c => c.nick.toLowerCase() === contactNick.toLowerCase());
    if (contact) {
      contact.isBlocked = !contact.isBlocked;
      this.saveContacts(myNick, contacts);
    } else {
      // Add as blocked placeholder if not a contact
      contacts.push({
        nick: contactNick,
        name: contactNick,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${contactNick}`,
        bio: 'Contato Bloqueado',
        status: 'offline',
        isBlocked: true,
        addedAt: new Date().toISOString()
      });
      this.saveContacts(myNick, contacts);
    }
  }

  static isBlocked(myNick: string, targetNick: string): boolean {
    const contacts = this.getContacts(myNick);
    const contact = contacts.find(c => c.nick.toLowerCase() === targetNick.toLowerCase());
    return contact ? contact.isBlocked : false;
  }

  // Groups
  static getGroups(myNick: string): GroupInfo[] {
    const key = `mestre_groups_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    let list: GroupInfo[] = JSON.parse(data);
    if (list.some(g => g.id === 'grupo-geral')) {
      list = list.filter(g => g.id !== 'grupo-geral');
      this.saveGroups(myNick, list);
    }
    return list;
  }

  static saveGroups(myNick: string, groups: GroupInfo[]) {
    const key = `mestre_groups_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(groups));
  }

  static addGroup(myNick: string, group: GroupInfo) {
    const groups = this.getGroups(myNick);
    if (!groups.some(g => g.id === group.id)) {
      groups.push(group);
      this.saveGroups(myNick, groups);
    }
  }

  static leaveGroup(myNick: string, groupId: string) {
    let groups = this.getGroups(myNick);
    groups = groups.filter(g => g.id !== groupId);
    this.saveGroups(myNick, groups);

    // Also remove from conversation list
    const list = this.getConversationsList(myNick);
    const updated = list.filter(c => c.nick !== groupId);
    this.saveConversationsList(myNick, updated);
  }

  // Notifications
  static getNotifications(myNick: string): AppNotification[] {
    const key = `mestre_notifications_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static saveNotifications(myNick: string, notifications: AppNotification[]) {
    const key = `mestre_notifications_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(notifications));
  }

  static addNotification(myNick: string, notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) {
    const notifications = this.getNotifications(myNick);
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    notifications.unshift(newNotif);
    this.saveNotifications(myNick, notifications);
  }

  static markAllNotificationsRead(myNick: string) {
    const notifications = this.getNotifications(myNick);
    notifications.forEach(n => n.isRead = true);
    this.saveNotifications(myNick, notifications);
  }

  static clearNotifications(myNick: string) {
    this.saveNotifications(myNick, []);
  }

  // Settings
  static getSettings(myNick: string, defaultName: string = '', defaultAvatar: string = ''): SystemSettings {
    const key = `mestre_settings_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // use default fallback below
      }
    }

    const defaultSettings: SystemSettings = {
      account: {
        name: defaultName || myNick,
        avatar: defaultAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${myNick}`,
        bio: 'Disponível no Mestre Chat!'
      },
      privacy: {
        visibility: 'everyone',
        whoCanMessage: 'everyone',
        whoCanCall: 'everyone',
        showOnlineStatus: true,
        silenceUnknownCalls: false
      },
      security: {
        additionalAuthEnabled: false,
        activeSessions: [
          {
            device: 'Navegador Atual (' + navigator.userAgent.substring(0, 30) + '...)',
            ip: '127.0.0.1 (Local)',
            lastActive: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString()
          }
        ]
      },
      notifications: {
        messagesEnabled: true,
        callsEnabled: true,
        groupsEnabled: true,
        mentionsEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true
      },
      appearance: {
        theme: 'dark', // default theme is dark mode as option principal
        fontSize: 'md',
        animationsEnabled: true
      }
    };
    this.saveSettings(myNick, defaultSettings);
    return defaultSettings;
  }

  static saveSettings(myNick: string, settings: SystemSettings) {
    const key = `mestre_settings_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(settings));
  }

  // Discovery preferences
  static getDiscoveryPrefs(myNick: string): { interest: 'diversão' | 'relacionamento' | 'outras'; gender: 'homem' | 'mulher' } {
    const key = `mestre_discovery_prefs_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { interest: 'diversão', gender: 'mulher' };
  }

  static saveDiscoveryPrefs(myNick: string, prefs: { interest: 'diversão' | 'relacionamento' | 'outras'; gender: 'homem' | 'mulher' }) {
    const key = `mestre_discovery_prefs_${myNick.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(prefs));
  }

  // Clear all local database items for this user (Account Wipe)
  static wipeAllData(myNick: string) {
    const prefix = `mestre_`;
    const keysToRemove: string[] = [];
    
    // Find keys relating to this nick
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.includes(myNick.toLowerCase())) {
        keysToRemove.push(k);
      }
    }

    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('mestre_current_user_nick');
  }
}
export default LocalDB;
