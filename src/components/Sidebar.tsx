import React from 'react';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Phone, 
  ShieldAlert, 
  Bell, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  UserCheck,
  Info,
  X
} from 'lucide-react';
import { UserProfile, AppNotification } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  user: UserProfile;
  notifications: AppNotification[];
  messagesUnreadCount: number;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({
  currentView,
  setView,
  user,
  notifications,
  messagesUnreadCount,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  mobileOpen = false,
  setMobileOpen
}: SidebarProps) {
  
  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const menuItems = [
    { id: 'home', label: 'Início', icon: Home, badge: 0 },
    { id: 'chats', label: 'Mensagens', icon: MessageSquare, badge: messagesUnreadCount },
    { id: 'contacts', label: 'Contatos', icon: Users, badge: 0 },
    { id: 'calls', label: 'Chamadas', icon: Phone, badge: 0 },
    { id: 'communities', label: 'Comunidades', icon: UserCheck, badge: 0 },
    { id: 'notifications', label: 'Notificações', icon: Bell, badge: unreadNotifications },
    { id: 'about', label: 'Sobre', icon: Info, badge: 0 },
  ];

  // If admin, append report review panel
  if (user.role === 'admin') {
    menuItems.push({ id: 'reports', label: 'Denúncias', icon: ShieldAlert, badge: 0 });
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside 
        id="desktop-sidebar"
        className={`hidden md:flex flex-col bg-[#0F0F12] border-r border-white/5 transition-all duration-300 relative z-20 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Collapse Button */}
        <button 
          id="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-[#1F1F23] border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white p-1 rounded-full cursor-pointer shadow-md focus:outline-none"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Logo */}
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="font-bold text-lg tracking-tight text-indigo-400">
              AETHER
            </div>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  id={`nav-btn-${item.id}`}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-400 font-semibold border-r-2 border-indigo-500 rounded-r-none' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                  
                  {/* Badge */}
                  {item.badge > 0 && (
                    <span className={`absolute ${
                      isCollapsed 
                        ? 'top-1 right-3' 
                        : 'right-3'
                    } bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-20 top-2.5 bg-black text-[#e5e7eb] text-xs py-1 px-2.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 shadow-xl whitespace-nowrap border border-white/5">
                    {item.label} {item.badge > 0 ? `(${item.badge})` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card & Settings */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {/* Settings Nav */}
          <div className="relative group">
            <button
              id="nav-btn-settings"
              onClick={() => setView('settings')}
              className={`w-full flex items-center p-3 rounded-xl cursor-pointer focus:outline-none ${
                currentView === 'settings' 
                  ? 'bg-indigo-600/15 text-indigo-400 border-r-2 border-indigo-500 rounded-r-none' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
            >
              <Settings className="w-5 h-5" />
              {!isCollapsed && <span className="text-sm font-medium">Configurações</span>}
              {isCollapsed && (
                <div className="absolute left-20 top-2.5 bg-black text-[#e5e7eb] text-xs py-1 px-2.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 shadow-xl border border-white/5">
                  Configurações
                </div>
              )}
            </button>
          </div>

          {/* User profile brief card */}
          {!isCollapsed ? (
            <div className="flex items-center p-2.5 bg-white/5 border border-white/5 rounded-xl justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0F0F12] rounded-full" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user.nick}</p>
                </div>
              </div>
              <button 
                id="logout-btn"
                onClick={onLogout}
                className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors focus:outline-none"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative group flex justify-center py-2">
              <img 
                src={user.avatar} 
                alt={user.name} 
                onClick={() => setView('settings')}
                className="w-9 h-9 rounded-full border border-indigo-500/20 object-cover cursor-pointer hover:border-indigo-500/50"
                referrerPolicy="no-referrer"
              />
              <button 
                id="collapsed-logout-btn"
                onClick={onLogout} 
                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white p-0.5 rounded-full cursor-pointer shadow-md focus:outline-none"
                title="Sair"
              >
                <LogOut className="w-2.5 h-2.5" />
              </button>
              <div className="absolute left-20 top-2.5 bg-black text-[#e5e7eb] text-xs py-1.5 px-3 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 shadow-xl border border-white/5 text-left">
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-zinc-500 text-[10px]">{user.nick}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR OVERLAY */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/85 backdrop-blur-sm z-40 transition-opacity animate-fadeIn"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      {/* MOBILE DRAWER SIDEBAR PANEL */}
      <aside 
        className={`md:hidden fixed top-0 bottom-0 left-0 w-72 bg-[#0F0F12] border-r border-white/5 z-50 flex flex-col transition-transform duration-300 shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header logo & Close button */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="font-bold text-lg tracking-tight text-indigo-400">
              AETHER
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen?.(false)}
            className="bg-[#1F1F23] border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white p-1.5 rounded-full cursor-pointer shadow-md focus:outline-none"
            title="Fechar Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto text-left">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <div key={item.id} className="relative">
                <button
                  id={`mobile-drawer-nav-btn-${item.id}`}
                  onClick={() => {
                    setView(item.id);
                    setMobileOpen?.(false);
                  }}
                  className={`w-full flex items-center p-3.5 rounded-xl transition-all duration-150 cursor-pointer focus:outline-none ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-400 font-semibold border-r-2 border-indigo-500 rounded-r-none' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } space-x-3.5`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  
                  {/* Badge */}
                  {item.badge > 0 && (
                    <span className="absolute right-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User Card & Settings */}
        <div className="p-4 border-t border-white/5 space-y-2.5">
          {/* Settings Nav */}
          <div className="relative">
            <button
              id="mobile-drawer-nav-btn-settings"
              onClick={() => {
                setView('settings');
                setMobileOpen?.(false);
              }}
              className={`w-full flex items-center p-3.5 rounded-xl cursor-pointer focus:outline-none ${
                currentView === 'settings' 
                  ? 'bg-indigo-600/15 text-indigo-400 border-r-2 border-indigo-500 rounded-r-none' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } space-x-3.5`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Configurações</span>
            </button>
          </div>

          {/* User profile brief card */}
          <div className="flex items-center p-3 bg-white/5 border border-white/5 rounded-xl justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-9 h-9 rounded-full border border-indigo-500/30 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0F0F12] rounded-full" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{user.nick}</p>
              </div>
            </div>
            <button 
              id="mobile-drawer-logout-btn"
              onClick={() => {
                setMobileOpen?.(false);
                onLogout();
              }}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors focus:outline-none"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
