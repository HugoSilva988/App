import React, { useState, useEffect } from 'react';
import { Phone, Search, PhoneCall, Video, Calendar, Clock, Trash2, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { UserProfile } from '../types';

interface CallRecord {
  id: string;
  partnerNick: string;
  partnerName: string;
  partnerAvatar: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  durationSeconds: number;
}

interface CallsPanelProps {
  myNick: string;
  onStartCall: (nick: string, type: 'voice' | 'video') => void;
  onlineUsers: UserProfile[];
}

export default function CallsPanel({
  myNick,
  onStartCall,
  onlineUsers
}: CallsPanelProps) {
  
  const [dialNick, setDialNick] = useState('');
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const key = `mestre_call_history_${myNick.toLowerCase()}`;
    const data = localStorage.getItem(key);
    if (data) {
      setCallHistory(JSON.parse(data));
    } else {
      // Seed some default calls if empty
      const seeds: CallRecord[] = [
        {
          id: 'call-1',
          partnerNick: '@admin',
          partnerName: 'Administrador Mestre',
          partnerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          type: 'voice',
          direction: 'incoming',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          durationSeconds: 124
        }
      ];
      localStorage.setItem(key, JSON.stringify(seeds));
      setCallHistory(seeds);
    }
  }, [myNick]);

  const handleDial = (type: 'voice' | 'video') => {
    const cleanNick = dialNick.trim().toLowerCase();
    const formatted = cleanNick.startsWith('@') ? cleanNick : `@${cleanNick}`;

    if (!cleanNick) return;
    
    // Add call record locally as outgoing
    const key = `mestre_call_history_${myNick.toLowerCase()}`;
    const newRecord: CallRecord = {
      id: `call-rec-${Math.random().toString(36).substr(2, 9)}`,
      partnerNick: formatted,
      partnerName: formatted.slice(1),
      partnerAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${formatted}`,
      type,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      durationSeconds: 0
    };

    const updated = [newRecord, ...callHistory];
    localStorage.setItem(key, JSON.stringify(updated));
    setCallHistory(updated);

    onStartCall(formatted, type);
    setDialNick('');
  };

  const handleClearHistory = () => {
    const key = `mestre_call_history_${myNick.toLowerCase()}`;
    localStorage.removeItem(key);
    setCallHistory([]);
  };

  const formatDuration = (secs: number) => {
    if (secs === 0) return 'Não atendida';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex-1 bg-[#0b0d10] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-16 md:pb-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-[#1f2838] pb-5 gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center space-x-2">
            <Phone className="w-5.5 h-5.5 text-blue-400 shrink-0" />
            <span>Painel de Comunicações</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Realize chamadas por @nick direto usando WebRTC sinalizado ou inspecione seu histórico local.
          </p>
        </div>

        {callHistory.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/15 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Dial Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#10141d] border border-[#1e2736] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-blue-400" />
              <span>Ligar para @nick</span>
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Insira o @nick de destino"
                value={dialNick}
                onChange={(e) => setDialNick(e.target.value)}
                className="w-full bg-[#181f2a] border border-[#2c384d] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-[#f3f4f6]"
              />

              <div className="flex gap-2">
                <button
                  id="calls-dial-voice-btn"
                  onClick={() => handleDial('voice')}
                  className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all focus:outline-none"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Voz</span>
                </button>
                <button
                  id="calls-dial-video-btn"
                  onClick={() => handleDial('video')}
                  className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-[#181f2b] border border-[#2c384e] hover:bg-[#20293c] text-gray-200 rounded-xl text-xs font-bold cursor-pointer transition-all focus:outline-none"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vídeo</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#10141d] border border-[#1e2736] rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico Recente</h3>

            {callHistory.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">Nenhuma chamada recente gravada localmente.</p>
            ) : (
              <div className="space-y-3">
                {callHistory.map((rec) => {
                  const isOnline = onlineUsers.some(u => u.nick.toLowerCase() === rec.partnerNick.toLowerCase() && u.status !== 'offline');
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between p-3 bg-[#131924]/60 border border-[#1e2635] rounded-xl"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <img src={rec.partnerAvatar} alt={rec.partnerName} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#131924] rounded-full" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <p className="text-xs font-bold text-gray-200 truncate">{rec.partnerName}</p>
                            <span className="text-[10px] text-gray-500 truncate">{rec.partnerNick}</span>
                          </div>
                          
                          <div className="flex items-center space-x-3 text-[10px] text-gray-500 mt-0.5">
                            <span className="flex items-center space-x-1">
                              {rec.direction === 'incoming' && <ArrowDownLeft className="w-3 h-3 text-green-500 shrink-0" />}
                              {rec.direction === 'outgoing' && <ArrowUpRight className="w-3 h-3 text-blue-500 shrink-0" />}
                              {rec.direction === 'missed' && <ArrowDownLeft className="w-3 h-3 text-red-500 shrink-0" />}
                              <span className="capitalize">{rec.direction === 'incoming' ? 'Recebida' : rec.direction === 'outgoing' ? 'Efetuada' : 'Perdida'}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(rec.durationSeconds)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Redial button */}
                      <button
                        onClick={() => onStartCall(rec.partnerNick, rec.type)}
                        className="p-1.5 bg-[#171d2b] hover:bg-[#20293c] border border-[#27354b] rounded-xl text-blue-400 hover:text-blue-300 cursor-pointer"
                        title="Redial"
                      >
                        {rec.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security note footer */}
      <div className="mt-8 bg-[#10141d]/40 border border-[#1e2736]/60 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-gray-400 text-left max-w-2xl">
        <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-300">Privacidade em Ligações</p>
          <p className="mt-1 leading-relaxed">
            Mestre Chat estabelece canais de voz e vídeo ponto a ponto (peer-to-peer) em tempo real. O áudio, vídeo ou metadados da transmissão não passam por processadores permanentes de análise do servidor ou inteligência de terceiros.
          </p>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-extrabold text-gray-200 mb-1">Limpar Histórico</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Deseja realmente limpar todo o histórico de chamadas local? Esta ação é irreversível.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a212e]">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  handleClearHistory();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
