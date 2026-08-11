import React from 'react';
import { Bell, ShieldCheck, Mail, Phone, Info, Trash2, CheckSquare } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsPanelProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export default function NotificationsPanel({
  notifications,
  onMarkAllRead,
  onClearAll
}: NotificationsPanelProps) {
  
  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'message':
        return <Mail className="w-4 h-4 text-blue-400" />;
      case 'call':
        return <Phone className="w-4 h-4 text-red-400" />;
      default:
        return <Bell className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="flex-1 bg-[#0b0d10] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-16 md:pb-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-[#1f2838] pb-5 gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center space-x-2">
            <Bell className="w-5.5 h-5.5 text-blue-400 shrink-0" />
            <span>Central de Notificações</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Monitore convites, atividade de chamadas e atualizações críticas de chaves E2EE.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onMarkAllRead}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#141922] border border-[#232e41] hover:bg-[#1a212e] text-gray-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Marcar lidas</span>
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/15 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#232d3d] rounded-2xl bg-[#10141d]/30">
          <Bell className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-sm font-semibold text-gray-300">Tudo limpo!</p>
          <p className="text-xs text-gray-500 mt-1">Nenhuma notificação ou alerta pendente.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-w-2xl text-left">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start space-x-4 p-4 border rounded-2xl transition-all ${
                notif.isRead 
                  ? 'bg-[#10141d]/40 border-[#1f2838] opacity-80' 
                  : 'bg-[#131a26]/80 border-blue-500/20 shadow-md'
              }`}
            >
              <div className="p-2 bg-black/20 rounded-xl border border-[#21293c] shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-gray-200 truncate">{notif.title}</h4>
                  <span className="text-[9px] text-gray-500 shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {notif.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Tip footer */}
      <div className="mt-8 bg-[#10141d]/40 border border-[#1e2736]/60 p-4 rounded-2xl flex items-start space-x-2.5 text-xs text-gray-400 text-left max-w-2xl">
        <Info className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-gray-300">Histórico de Alertas</p>
          <p className="mt-1 leading-relaxed">
            As notificações geradas no Mestre são salvas de forma estrita no seu banco de dados local-first do dispositivo. O servidor nunca cataloga ou mantém histórico de seus convites ou conexões de rede de forma persistente.
          </p>
        </div>
      </div>
    </div>
  );
}
