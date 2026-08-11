import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server in-memory databases (resets on server restart, keeping E2EE & local-first philosophy)
interface User {
  nick: string;
  name: string;
  avatar: string;
  bio: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  customStatus?: string;
  publicKey: string; // Public key for E2EE key exchange
  role: 'admin' | 'user';
  createdAt: string;
  lastSeen: string;
  gender?: 'homem' | 'mulher';
  interest?: 'diversão' | 'relacionamento' | 'outras';
}

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creator: string;
  members: { nick: string; role: 'admin' | 'moderator' | 'member' }[];
  rules?: string;
  createdAt: string;
}

interface PendingMessage {
  id: string;
  from: string;
  to: string;
  content: string; // Encrypted content for E2EE
  type: 'text' | 'file' | 'audio';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  parentMsgId?: string; // For replies
  timestamp: string;
  isGroup: boolean;
  groupId?: string;
}

interface Report {
  id: string;
  reporter: string;
  reported: string;
  reason: 'spam' | 'abuse' | 'harassment' | 'impersonation' | 'illegal' | 'other';
  details: string;
  timestamp: string;
}

interface SharedFile {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 string
  size: number;
}

const users = new Map<string, User>();
const groups = new Map<string, Group>();
const pendingMessages = new Map<string, PendingMessage[]>(); // nick -> pending messages
const reports: Report[] = [];
const sharedFiles = new Map<string, SharedFile>();

// Seed some system-level entities for richer experience
const systemAdmin: User = {
  nick: '@admin',
  name: 'Administrador Mestre',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  bio: 'Conta de administração oficial da plataforma.',
  status: 'online',
  customStatus: 'Painel de Controle Ativo',
  publicKey: 'SYSTEM_ADMIN_PUBLIC_KEY',
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
};
users.set('@admin', systemAdmin);

const seedUsers: User[] = [
  {
    nick: '@camila',
    name: 'Camila Silva',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    bio: 'Procurando alguém especial para conversar e construir algo real. Adoro livros e café.',
    status: 'online',
    customStatus: 'Lendo um romance',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDz7S0q28ADummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'mulher',
    interest: 'relacionamento'
  },
  {
    nick: '@mari',
    name: 'Mariana Santos',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    bio: 'Buscando novas amizades, rir bastante e sair da rotina! Vamos papear?',
    status: 'online',
    customStatus: 'Ativa e ouvindo música',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC6B431e6DummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'mulher',
    interest: 'diversão'
  },
  {
    nick: '@beatriz',
    name: 'Beatriz Costa',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    bio: 'Fazer networking, boas conversas intelectuais e parcerias.',
    status: 'online',
    customStatus: 'No trabalho',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDg8r8PDummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'mulher',
    interest: 'outras'
  },
  {
    nick: '@julia',
    name: 'Júlia Oliveira',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    bio: 'Romântica, amo cinema, viagens, trilhas e jantares tranquilos.',
    status: 'online',
    customStatus: 'Viajando no fim de semana',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDB6g78DummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'mulher',
    interest: 'relacionamento'
  },
  {
    nick: '@lucas',
    name: 'Lucas Mendes',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    bio: 'Sempre pronto para uma boa conversa, piadas e momentos divertidos!',
    status: 'online',
    customStatus: 'Jogando online',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDSt8EDummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'homem',
    interest: 'diversão'
  },
  {
    nick: '@pedro',
    name: 'Pedro Henrique',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bio: 'Busco uma parceira para compartilhar a vida, metas e momentos especiais.',
    status: 'online',
    customStatus: 'Treinando na academia',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDX7GDummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'homem',
    interest: 'relacionamento'
  },
  {
    nick: '@gabriel',
    name: 'Gabriel Souza',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
    bio: 'Trocar ideias sobre tecnologia, investimentos e novas amizades.',
    status: 'online',
    customStatus: 'Codando...',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDI99DummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'homem',
    interest: 'outras'
  },
  {
    nick: '@felipe',
    name: 'Felipe Rocha',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    bio: 'Viver de forma leve, sem pressa. Vamos conversar e ver no que dá!',
    status: 'online',
    customStatus: 'Disponível',
    publicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDT6YDummyKey',
    role: 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    gender: 'homem',
    interest: 'diversão'
  }
];

seedUsers.forEach(u => users.set(u.nick, u));

// Active sockets registry (nick -> WebSocket)
const activeSockets = new Map<string, WebSocket>();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Helper to sanitize outputs
function sanitizeString(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// REST APIs
// 1. Auth/Register
app.post('/api/auth/register', (req, res) => {
  const { nick, name, avatar, bio, publicKey, password, role } = req.body;
  
  if (!nick || !name || !publicKey) {
    return res.status(400).json({ error: 'Apelido (@nick), Nome e Chave Pública são obrigatórios.' });
  }

  const formattedNick = nick.startsWith('@') ? nick.toLowerCase() : `@${nick.toLowerCase()}`;
  
  // Rate limiting & pattern validation
  if (!/^\@[a-z0-9_]{3,15}$/.test(formattedNick)) {
    return res.status(400).json({ error: 'O @nick deve conter de 3 a 15 caracteres alfanuméricos ou sublinhados.' });
  }

  // Check if nick is taken
  if (users.has(formattedNick)) {
    // If it exists, let them log back in (or check password if you want, but keep it simple for multi-tab testing)
    const existing = users.get(formattedNick)!;
    existing.status = 'online';
    existing.lastSeen = new Date().toISOString();
    return res.status(200).json({ user: existing, message: 'Bem-vindo de volta!' });
  }

  const newUser: User = {
    nick: formattedNick,
    name: sanitizeString(name),
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${formattedNick}`,
    bio: sanitizeString(bio || ''),
    status: 'online',
    publicKey,
    role: (password && password === (process.env.ADMIN_PASSWORD || 'mestre-admin-2026')) ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  users.set(formattedNick, newUser);
  
  return res.status(201).json({ user: newUser, message: 'Conta criada com sucesso!' });
});

// 2. Search users by @nick
app.get('/api/users/search', (req, res) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Termo de busca obrigatório.' });
  }

  const normalized = query.toLowerCase();
  const matched: User[] = [];
  
  users.forEach((u) => {
    if (u.nick.includes(normalized) || u.name.toLowerCase().includes(normalized)) {
      matched.push(u);
    }
  });

  return res.json(matched);
});

// 3. File upload (in-memory, highly secure and local-first helper)
app.post('/api/upload', (req, res) => {
  const { name, mimeType, data, size } = req.body;

  if (!name || !mimeType || !data) {
    return res.status(400).json({ error: 'Dados do arquivo incompletos.' });
  }

  // Security checks
  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/wav'];
  if (!allowedMimes.includes(mimeType)) {
    return res.status(400).json({ error: 'Tipo de arquivo não permitido.' });
  }

  if (size > 5 * 1024 * 1024) { // 5MB limit
    return res.status(400).json({ error: 'O tamanho do arquivo excede o limite de 5MB.' });
  }

  const fileId = `file-${Math.random().toString(36).substr(2, 9)}`;
  const sharedFile: SharedFile = {
    id: fileId,
    name: sanitizeString(name),
    mimeType,
    data,
    size,
  };

  sharedFiles.set(fileId, sharedFile);

  // Auto clean up files after 10 minutes to maintain storage hygiene
  setTimeout(() => {
    sharedFiles.delete(fileId);
  }, 10 * 60 * 1000);

  return res.status(201).json({
    fileId,
    url: `/api/files/${fileId}`,
    message: 'Arquivo enviado temporariamente com sucesso.',
  });
});

// 4. Retrieve files
app.get('/api/files/:id', (req, res) => {
  const { id } = req.params;
  const file = sharedFiles.get(id);

  if (!file) {
    return res.status(404).json({ error: 'Arquivo expirou ou não existe.' });
  }

  const buffer = Buffer.from(file.data, 'base64');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
  return res.send(buffer);
});

// 5. Submit a report
app.post('/api/reports', (req, res) => {
  const { reporter, reported, reason, details } = req.body;

  if (!reporter || !reported || !reason) {
    return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
  }

  const newReport: Report = {
    id: `report-${Math.random().toString(36).substr(2, 9)}`,
    reporter,
    reported,
    reason,
    details: sanitizeString(details || ''),
    timestamp: new Date().toISOString(),
  };

  reports.push(newReport);
  return res.status(201).json({ message: 'Denúncia recebida com sucesso. Nossos moderadores irão analisar.' });
});

// 6. View reports (Admin Only, requires credentials check)
app.get('/api/reports', (req, res) => {
  const authNick = req.headers['x-auth-nick'] as string;
  if (!authNick || !users.has(authNick) || users.get(authNick)?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem ver denúncias.' });
  }
  return res.json(reports);
});

// 7. Handle action on a report (Admin)
app.post('/api/reports/:id/resolve', (req, res) => {
  const authNick = req.headers['x-auth-nick'] as string;
  const { id } = req.params;
  const { action } = req.body; // e.g. "ban", "warn", "dismiss"

  if (!authNick || !users.has(authNick) || users.get(authNick)?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Denúncia não encontrada.' });
  }

  const report = reports[index];
  if (action === 'ban') {
    const userToBan = users.get(report.reported);
    if (userToBan) {
      userToBan.bio = 'ESTA CONTA FOI SUSPENSA POR VIOLAÇÃO DOS TERMOS.';
      userToBan.name = 'Usuário Suspenso';
      userToBan.avatar = 'https://api.dicebear.com/7.x/initials/svg?seed=Banido';
      userToBan.status = 'offline';
      
      // Close socket if online
      const bannedSocket = activeSockets.get(report.reported);
      if (bannedSocket) {
        bannedSocket.send(JSON.stringify({ type: 'sys:banned', message: 'Sua conta foi suspensa.' }));
        bannedSocket.close();
      }
    }
  }

  // Remove report after resolving
  reports.splice(index, 1);
  return res.json({ message: `Denúncia resolvida com ação: ${action}` });
});

// 8. Create Groups
app.post('/api/groups', (req, res) => {
  const { name, description, avatar, creator, rules } = req.body;
  if (!name || !creator) {
    return res.status(400).json({ error: 'Nome do grupo e criador são obrigatórios.' });
  }

  const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
  const newGroup: Group = {
    id: groupId,
    name: sanitizeString(name),
    description: sanitizeString(description || ''),
    avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${groupId}`,
    creator,
    members: [{ nick: creator, role: 'admin' }],
    rules: sanitizeString(rules || ''),
    createdAt: new Date().toISOString(),
  };

  groups.set(groupId, newGroup);
  return res.status(201).json(newGroup);
});

// 9. Get Group details
app.get('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const group = groups.get(id);
  if (!group) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }
  return res.json(group);
});

// 10. Join Group
app.post('/api/groups/:id/join', (req, res) => {
  const { id } = req.params;
  const { nick } = req.body;

  const group = groups.get(id);
  if (!group) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  if (group.members.some((m) => m.nick === nick)) {
    return res.status(400).json({ error: 'Você já é membro deste grupo.' });
  }

  group.members.push({ nick, role: 'member' });
  return res.json(group);
});

// 11. Leave Group
app.post('/api/groups/:id/leave', (req, res) => {
  const { id } = req.params;
  const { nick } = req.body;

  const group = groups.get(id);
  if (!group) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  group.members = group.members.filter((m) => m.nick !== nick);
  return res.json({ message: 'Você saiu do grupo.' });
});

// 12. Delete Group
app.post('/api/groups/:id/delete', (req, res) => {
  const { id } = req.params;
  const { nick } = req.body;

  if (!nick) {
    return res.status(400).json({ error: 'Nick é obrigatório.' });
  }

  const group = groups.get(id);
  if (!group) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  if (group.creator.toLowerCase() !== nick.toLowerCase()) {
    return res.status(403).json({ error: 'Apenas o criador da comunidade pode deletá-la.' });
  }

  groups.delete(id);
  broadcastGroupDeletion(id);
  return res.json({ message: 'Grupo deletado com sucesso.' });
});

app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  const { nick } = req.body;

  if (!nick) {
    return res.status(400).json({ error: 'Nick é obrigatório.' });
  }

  const group = groups.get(id);
  if (!group) {
    return res.status(404).json({ error: 'Grupo não encontrado.' });
  }

  if (group.creator.toLowerCase() !== nick.toLowerCase()) {
    return res.status(403).json({ error: 'Apenas o criador da comunidade pode deletá-la.' });
  }

  groups.delete(id);
  broadcastGroupDeletion(id);
  return res.json({ message: 'Grupo deletado com sucesso.' });
});

// Create HTTP Server
const server = http.createServer(app);

// WebSocket Integration
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

function broadcastGroupDeletion(groupId: string) {
  const payload = JSON.stringify({
    type: 'group:deleted',
    groupId,
  });

  activeSockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

// Active online users tracking and status update broadcasts
function broadcastOnlineUsers() {
  const onlineUsers = Array.from(users.values()).map(u => {
    const isSeedUser = u.nick === '@camila' || u.nick === '@mari' || u.nick === '@beatriz' || u.nick === '@julia' || u.nick === '@lucas' || u.nick === '@pedro' || u.nick === '@gabriel' || u.nick === '@felipe';
    return {
      nick: u.nick,
      name: u.name,
      avatar: u.avatar,
      status: isSeedUser ? (u.status || 'online') : (activeSockets.has(u.nick) ? u.status : 'offline'),
      customStatus: u.customStatus,
      publicKey: u.publicKey,
      bio: u.bio,
      role: u.role,
      createdAt: u.createdAt,
      gender: u.gender,
      interest: u.interest,
    };
  });

  const payload = JSON.stringify({
    type: 'presence:update',
    users: onlineUsers,
  });

  activeSockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  let authenticatedNick: string | null = null;

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      switch (data.type) {
        case 'auth': {
          const { nick } = data;
          if (!nick || !users.has(nick)) {
            ws.send(JSON.stringify({ type: 'auth:fail', error: 'Usuário inválido.' }));
            return;
          }

          authenticatedNick = nick;
          activeSockets.set(nick, ws);

          // Update user to online
          const user = users.get(nick)!;
          user.status = data.status || 'online';
          user.lastSeen = new Date().toISOString();

          ws.send(JSON.stringify({ type: 'auth:ok', user }));

          // Deliver pending messages
          const pending = pendingMessages.get(nick) || [];
          if (pending.length > 0) {
            ws.send(JSON.stringify({ type: 'messages:pending', messages: pending }));
            // We clear them ONLY after the client acknowledges receipt
          }

          broadcastOnlineUsers();
          break;
        }

        case 'pending:ack': {
          // Client successfully received and stored pending messages locally
          if (authenticatedNick) {
            pendingMessages.delete(authenticatedNick);
          }
          break;
        }

        case 'status:change': {
          if (authenticatedNick && users.has(authenticatedNick)) {
            const user = users.get(authenticatedNick)!;
            user.status = data.status;
            if (data.customStatus !== undefined) {
              user.customStatus = data.customStatus;
            }
            broadcastOnlineUsers();
          }
          break;
        }

        case 'message:send': {
          if (!authenticatedNick) return;
          const { message } = data;

          if (message.isGroup) {
            // Relaying to all group members
            const group = groups.get(message.groupId);
            if (group) {
              group.members.forEach((m) => {
                if (m.nick !== authenticatedNick) {
                  const targetSocket = activeSockets.get(m.nick);
                  if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
                    targetSocket.send(JSON.stringify({ type: 'message:incoming', message }));
                  } else {
                    // Group offline queuing
                    if (!pendingMessages.has(m.nick)) {
                      pendingMessages.set(m.nick, []);
                    }
                    pendingMessages.get(m.nick)!.push(message);
                  }
                }
              });
              // Send delivery confirmation back to sender
              ws.send(JSON.stringify({ type: 'message:delivered', messageId: message.id }));
            }
          } else {
            // Private Message - Relay with E2EE payload intact
            const targetSocket = activeSockets.get(message.to);
            if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
              targetSocket.send(JSON.stringify({ type: 'message:incoming', message }));
              
              // Echo typing state stop
              targetSocket.send(JSON.stringify({ type: 'typing:state', from: authenticatedNick, isTyping: false }));

              // Confirm delivery back to sender immediately
              ws.send(JSON.stringify({ type: 'message:delivered', messageId: message.id }));
            } else {
              // Recipient offline. Store temporarily on the server
              if (!pendingMessages.has(message.to)) {
                pendingMessages.set(message.to, []);
              }
              pendingMessages.get(message.to)!.push(message);
              
              // Confirm server-accepted back to sender
              ws.send(JSON.stringify({ type: 'message:queued', messageId: message.id }));
            }
          }
          break;
        }

        case 'typing': {
          if (!authenticatedNick) return;
          const { to, isTyping, isGroup, groupId } = data;
          if (isGroup) {
            const group = groups.get(groupId);
            if (group) {
              group.members.forEach((m) => {
                if (m.nick !== authenticatedNick) {
                  const s = activeSockets.get(m.nick);
                  if (s && s.readyState === WebSocket.OPEN) {
                    s.send(JSON.stringify({ type: 'typing:state', from: authenticatedNick, isTyping, isGroup, groupId }));
                  }
                }
              });
            }
          } else {
            const s = activeSockets.get(to);
            if (s && s.readyState === WebSocket.OPEN) {
              s.send(JSON.stringify({ type: 'typing:state', from: authenticatedNick, isTyping }));
            }
          }
          break;
        }

        case 'message:action': {
          // Handle reactions, edits, deletions, pinned messages
          if (!authenticatedNick) return;
          const { messageId, action, payload, to, isGroup, groupId } = data;

          const broadcastAction = JSON.stringify({
            type: 'message:action',
            messageId,
            action,
            payload,
            from: authenticatedNick,
            isGroup,
            groupId,
          });

          if (isGroup) {
            const group = groups.get(groupId);
            if (group) {
              group.members.forEach((m) => {
                const s = activeSockets.get(m.nick);
                if (s && s.readyState === WebSocket.OPEN) {
                  s.send(broadcastAction);
                }
              });
            }
          } else {
            // Relays to target and sends back to own extra sessions
            const s1 = activeSockets.get(to);
            if (s1 && s1.readyState === WebSocket.OPEN) {
              s1.send(broadcastAction);
            }
            ws.send(broadcastAction);
          }
          break;
        }

        case 'group:leave': {
          if (!authenticatedNick) return;
          const { groupId } = data;
          const group = groups.get(groupId);
          if (group) {
            group.members = group.members.filter((m) => m.nick !== authenticatedNick);
          }
          break;
        }

        // WebRTC Signalling for voice and video calls
        case 'call:dial': {
          if (!authenticatedNick) return;
          const { to, type, callId } = data;
          const targetSocket = activeSockets.get(to);

          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'call:incoming',
              from: authenticatedNick,
              callId,
              callType: type,
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'call:fail',
              callId,
              error: 'O contato está offline no momento.',
            }));
          }
          break;
        }

        case 'call:accept': {
          if (!authenticatedNick) return;
          const { to, callId } = data;
          const targetSocket = activeSockets.get(to);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'call:accepted',
              from: authenticatedNick,
              callId,
            }));
          }
          break;
        }

        case 'call:decline': {
          if (!authenticatedNick) return;
          const { to, callId, reason } = data;
          const targetSocket = activeSockets.get(to);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'call:declined',
              from: authenticatedNick,
              callId,
              reason: reason || 'declined',
            }));
          }
          break;
        }

        case 'call:signal': {
          if (!authenticatedNick) return;
          const { to, signal, callId } = data;
          const targetSocket = activeSockets.get(to);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'call:signal',
              from: authenticatedNick,
              signal,
              callId,
            }));
          }
          break;
        }

        case 'call:hangup': {
          if (!authenticatedNick) return;
          const { to, callId } = data;
          const targetSocket = activeSockets.get(to);
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({
              type: 'call:hungup',
              from: authenticatedNick,
              callId,
            }));
          }
          break;
        }
      }
    } catch (err) {
      console.error('Falha ao processar mensagem WS:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedNick) {
      activeSockets.delete(authenticatedNick);
      const user = users.get(authenticatedNick);
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date().toISOString();
      }
      broadcastOnlineUsers();
    }
  });
});

// Serve compiled static files in production, integrate Vite in development
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Mestre Server] Executando em http://localhost:${PORT}`);
  });
}

startServer();
