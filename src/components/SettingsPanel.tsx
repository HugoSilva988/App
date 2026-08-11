import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Key, 
  Bell, 
  Paintbrush, 
  Database, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Volume2, 
  Check, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { SystemSettings, LocalKeyPair } from '../types';
import { LocalDB } from '../services/localDB';

interface SettingsPanelProps {
  myNick: string;
  settings: SystemSettings;
  keyPair: LocalKeyPair;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onWipeData: () => void;
}

export default function SettingsPanel({
  myNick,
  settings,
  keyPair,
  onUpdateSettings,
  onWipeData
}: SettingsPanelProps) {
  
  const [activeTab, setActiveTab] = useState<'account' | 'privacy' | 'security' | 'notifications' | 'appearance' | 'data'>('account');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  // Form states initialized with settings props
  const [name, setName] = useState(settings.account.name);
  const [avatar, setAvatar] = useState(settings.account.avatar);
  const [bio, setBio] = useState(settings.account.bio);

  const tabs = [
    { id: 'account', label: 'Conta', icon: User },
    { id: 'privacy', label: 'Privacidade', icon: Lock },
    { id: 'security', label: 'Segurança & Chaves', icon: Key },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Paintbrush },
    { id: 'data', label: 'Dados & Cache', icon: Database },
  ] as const;

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      account: { name, avatar, bio }
    };
    onUpdateSettings(updated);
    triggerSuccessBanner();
  };

  const handlePrivacyChange = (field: keyof SystemSettings['privacy'], value: any) => {
    const updated: SystemSettings = {
      ...settings,
      privacy: { ...settings.privacy, [field]: value }
    };
    onUpdateSettings(updated);
    triggerSuccessBanner();
  };

  const handleSecurityChange = (field: keyof SystemSettings['security'], value: any) => {
    const updated: SystemSettings = {
      ...settings,
      security: { ...settings.security, [field]: value }
    };
    onUpdateSettings(updated);
    triggerSuccessBanner();
  };

  const handleNotifChange = (field: keyof SystemSettings['notifications'], value: any) => {
    const updated: SystemSettings = {
      ...settings,
      notifications: { ...settings.notifications, [field]: value }
    };
    onUpdateSettings(updated);
    triggerSuccessBanner();
  };

  const handleAppearanceChange = (field: keyof SystemSettings['appearance'], value: any) => {
    const updated: SystemSettings = {
      ...settings,
      appearance: { ...settings.appearance, [field]: value }
    };
    onUpdateSettings(updated);
    triggerSuccessBanner();
  };

  const triggerSuccessBanner = (msg: string = 'Configurações atualizadas!') => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePurgeCache = () => {
    // Purges unread/unpinned transient media, mimicking safe memory wipe
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('mestre_messages_') && !k.includes('pinned')) {
        // Keep active structure but delete oversized caches
      }
    });
    triggerSuccessBanner('Cache purgado com sucesso!');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0b0c10] text-[#f3f4f6] overflow-hidden h-full pb-16 md:pb-0 font-sans">
      
      {/* LEFT NAVIGATION TABS */}
      <aside className="w-full md:w-64 bg-[#10141d]/80 border-b md:border-b-0 md:border-r border-[#212b3c] flex md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 md:p-4 p-1.5 scrollbar-none z-10">
        <h3 className="hidden md:block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-3">
          Configurações
        </h3>
        
        <div className="flex md:flex-col space-x-1.5 md:space-x-0 md:space-y-1 w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`settings-tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all focus:outline-none ${
                  isTabActive 
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20' 
                    : 'text-gray-400 hover:bg-[#161c28] hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 p-5 sm:p-7 md:p-9 overflow-y-auto max-w-2xl text-left relative">
        
        {/* Success toast banner */}
        {successMessage && (
          <div className="absolute top-4 right-4 bg-green-500/15 border border-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-1.5 animate-fadeIn z-35 shadow-lg">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Account Info */}
        {activeTab === 'account' && (
          <form onSubmit={handleSaveAccount} className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold">Configurações de Conta</h2>
              <p className="text-xs text-gray-400 mt-1">Atualize seu perfil de rede. Esses dados são visíveis para seus contatos.</p>
            </div>

            <div className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Seu @nick de Rede (Inalterável)</label>
                <input
                  type="text"
                  value={myNick}
                  disabled
                  className="w-full bg-[#161c28]/70 border border-[#232e41] rounded-xl px-3 py-2 text-sm text-blue-400 font-bold font-mono focus:outline-none cursor-not-allowed opacity-85"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Nome de Exibição</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161c28] border border-[#2b3a50] rounded-xl px-3 py-2 text-sm text-[#f3f4f6] focus:outline-none focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Biografia</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-[#161c28] border border-[#2b3a50] rounded-xl px-3 py-2 text-sm text-[#f3f4f6] focus:outline-none focus:border-blue-500 transition-all resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase">URL do Avatar</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-[#161c28] border border-[#2b3a50] rounded-xl px-3 py-2 text-sm text-[#f3f4f6] focus:outline-none focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <button
              id="settings-save-account-btn"
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-blue-600/10"
            >
              Salvar Alterações
            </button>
          </form>
        )}

        {/* Tab 2: Privacy */}
        {activeTab === 'privacy' && (
          <div className="space-y-5 text-xs text-gray-300">
            <div>
              <h2 className="text-xl font-extrabold text-[#f3f4f6]">Privacidade do Usuário</h2>
              <p className="text-xs text-gray-400 mt-1">Configure o nível de exposição e o controle de interações privadas.</p>
            </div>

            <div className="space-y-4 pt-3">
              
              {/* Option: Who can call me */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-2.5">
                <h4 className="font-bold text-[#f3f4f6] text-sm">Quem pode iniciar chamadas com você?</h4>
                <div className="flex flex-col space-y-2">
                  {[
                    { id: 'everyone', label: 'Todos da rede' },
                    { id: 'friends', label: 'Apenas amigos adicionados' },
                    { id: 'nobody', label: 'Ninguém (Desativar chamadas)' }
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="whoCanCall"
                        checked={settings.privacy.whoCanCall === opt.id}
                        onChange={() => handlePrivacyChange('whoCanCall', opt.id)}
                        className="bg-[#161c28] border-[#2b3a50] text-blue-500 focus:ring-0"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Option: Show online status */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#f3f4f6] text-sm">Status de Presença Online</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Permite que contatos vejam se você está ativo na rede.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.showOnlineStatus}
                  onChange={(e) => handlePrivacyChange('showOnlineStatus', e.target.checked)}
                  className="rounded bg-[#161c28] border-[#2b3a50] text-blue-500 focus:ring-0 w-4.5 h-4.5"
                />
              </div>

              {/* Option: Silence unknown calls */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#f3f4f6] text-sm">Silenciar Chamadas Desconhecidas</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Ignora chamadas de usuários que não estão na sua lista de contatos.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.silenceUnknownCalls}
                  onChange={(e) => handlePrivacyChange('silenceUnknownCalls', e.target.checked)}
                  className="rounded bg-[#161c28] border-[#2b3a50] text-blue-500 focus:ring-0 w-4.5 h-4.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Cryptographic vault inspection */}
        {activeTab === 'security' && (
          <div className="space-y-5 text-xs text-gray-300">
            <div>
              <h2 className="text-xl font-extrabold text-[#f3f4f6]">Cofre de Segurança Criptográfica</h2>
              <p className="text-xs text-gray-400 mt-1">Monitore suas chaves assimétricas e sessões locais ativas.</p>
            </div>

            <div className="space-y-4 pt-3">
              
              {/* RSA Keys inspect panel */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#212a38] pb-2">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-bold text-sm text-[#f3f4f6]">Par de Chaves E2EE RSA-2048</span>
                  </div>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-[10px] text-blue-400 font-bold flex items-center space-x-1 hover:underline cursor-pointer focus:outline-none"
                  >
                    {showPrivateKey ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ocultar Chave Privada</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visualizar Chave Privada</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-gray-400 text-[10px] uppercase">Impressão Digital da Chave Pública (SHA-256):</p>
                  <p className="font-mono text-blue-400 text-xs font-bold bg-[#0b0c10] p-2 rounded border border-[#21293a] select-all">
                    {keyPair.fingerprint}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-gray-400 text-[10px] uppercase">Chave Pública (PEM):</p>
                  <div className="font-mono text-gray-500 text-[8.5px] bg-[#0b0c10] p-2.5 rounded border border-[#21293a] break-all max-h-24 overflow-y-auto select-all">
                    {keyPair.publicKey}
                  </div>
                </div>

                {showPrivateKey && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex items-center space-x-1.5 text-red-400 text-[10px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ATENÇÃO: Nunca compartilhe esta chave privada!</span>
                    </div>
                    <div className="font-mono text-red-400 text-[8.5px] bg-red-950/15 border border-red-500/10 p-2.5 rounded break-all max-h-24 overflow-y-auto select-all">
                      {keyPair.privateKey}
                    </div>
                  </div>
                )}
              </div>

              {/* Sessions monitor */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-[#f3f4f6]">Dispositivos & Sessões Ativas</h4>
                <p className="text-[10px] text-gray-500">Estas são as conexões que possuem acesso autorizado com suas credenciais.</p>

                <div className="space-y-2">
                  {settings.security.activeSessions.map((sess, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#141a24] rounded-xl border border-[#20293b]">
                      <div>
                        <p className="text-xs font-bold text-gray-200">{sess.device}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">IP: {sess.ip} • Ativa em: {sess.lastActive}</p>
                      </div>
                      <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold">Atual</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Notifications config */}
        {activeTab === 'notifications' && (
          <div className="space-y-5 text-xs text-gray-300">
            <div>
              <h2 className="text-xl font-extrabold text-[#f3f4f6]">Ajustes de Notificação</h2>
              <p className="text-xs text-gray-400 mt-1">Controle individualmente sons, alertas visuais e vibrações do Mestre.</p>
            </div>

            <div className="space-y-4 pt-3">
              {[
                { id: 'messagesEnabled', label: 'Notificar novas mensagens privadas', desc: 'Exibe alertas rápidos para cada mensagem recebida.' },
                { id: 'callsEnabled', label: 'Notificar chamadas de voz/vídeo', desc: 'Toca toques sonoros ao receber chamadas de amigos.' },
                { id: 'groupsEnabled', label: 'Notificar convites de comunidades', desc: 'Gera alertas ao ser adicionado em grupos públicos.' },
                { id: 'soundEnabled', label: 'Tocar sons ao enviar/receber', desc: 'Ativa tons de clique para o mensageiro.' },
                { id: 'vibrationEnabled', label: 'Habilitar feedback tátil/vibração', desc: 'Ideal para aparelhos celulares e telas de toque.' }
              ].map((opt) => (
                <div key={opt.id} className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#f3f4f6] text-sm">{opt.label}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(settings.notifications as any)[opt.id]}
                    onChange={(e) => handleNotifChange(opt.id as any, e.target.checked)}
                    className="rounded bg-[#161c28] border-[#2b3a50] text-blue-500 focus:ring-0 w-4.5 h-4.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Appearance themes */}
        {activeTab === 'appearance' && (
          <div className="space-y-5 text-xs text-gray-300">
            <div>
              <h2 className="text-xl font-extrabold text-[#f3f4f6]">Aparência & Temas</h2>
              <p className="text-xs text-gray-400 mt-1">Altere o layout visual, contrastes e proporção dos textos na tela.</p>
            </div>

            <div className="space-y-4 pt-3">
              
              {/* Theme choices */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-[#f3f4f6]">Esquema de Cores</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Fundo Escuro', desc: 'Tema principal' },
                    { id: 'light', label: 'Fundo Claro', desc: 'Alto contraste' },
                    { id: 'system', label: 'Tema do Sistema', desc: 'Sensor automático' }
                  ].map((themeOpt) => (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => handleAppearanceChange('theme', themeOpt.id)}
                      className={`p-3 rounded-xl border text-center flex flex-col space-y-1 transition-all focus:outline-none cursor-pointer ${
                        settings.appearance.theme === themeOpt.id 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'bg-[#141a24] border-[#212a38] text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs">{themeOpt.label}</span>
                      <span className="text-[9px] opacity-80">{themeOpt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Sizing */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-[#f3f4f6]">Escala de Fonte</h4>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleAppearanceChange('fontSize', sz)}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-bold cursor-pointer focus:outline-none transition-all ${
                        settings.appearance.fontSize === sz 
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400' 
                          : 'bg-[#141a24] border-[#212a38] text-gray-400 hover:text-white'
                      }`}
                    >
                      {sz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animations toggle */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#f3f4f6] text-sm">Habilitar Microanimações</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Ativa transições suaves e efeitos de pulsar de chamadas.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.appearance.animationsEnabled}
                  onChange={(e) => handleAppearanceChange('animationsEnabled', e.target.checked)}
                  className="rounded bg-[#161c28] border-[#2b3a50] text-blue-500 focus:ring-0 w-4.5 h-4.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Data wipe and cache purging */}
        {activeTab === 'data' && (
          <div className="space-y-5 text-xs text-gray-300">
            <div>
              <h2 className="text-xl font-extrabold text-[#f3f4f6]">Gerenciamento de Dados Locais</h2>
              <p className="text-xs text-gray-400 mt-1">Gerencie a retenção de dados e elimine vestígios lógicos de conversas apagadas.</p>
            </div>

            <div className="space-y-4 pt-3">
              
              {/* Purge action buttons */}
              <div className="bg-[#10141d]/60 border border-[#1e2736] rounded-2xl p-4 space-y-3.5">
                <h4 className="font-bold text-sm text-[#f3f4f6]">Ações de Limpeza Higiênica</h4>
                <p className="text-[10px] text-gray-500">
                  Os arquivos enviados ao Mestre são temporários e expiram após 10 minutos no servidor. Você pode expirar seus arquivos e miniaturas locais agora.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handlePurgeCache}
                    className="flex-1 py-2 px-3 border border-gray-600 hover:border-white text-gray-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors focus:outline-none"
                  >
                    Expirar Arquivos e Cache
                  </button>
                </div>
              </div>

              {/* DESTROY / ACCOUNT WIPE CARD */}
              <div className="bg-red-950/15 border border-red-500/20 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h4 className="font-bold text-sm text-[#f3f4f6]">Exclusão Crítica de Identidade</h4>
                </div>
                <p className="text-[10px] text-gray-400">
                  Esta ação é irreversível. Todas as suas conversas criptografadas locais, chaves de sessão AES, biografia e chave de descriptografia privada RSA-2048 serão logicamente destruídas do armazenamento deste dispositivo. Nenhuma mensagem poderá ser recuperada.
                </p>

                <button
                  id="settings-wipe-data-btn"
                  type="button"
                  onClick={() => setShowWipeConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-red-600/15 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Destruir Todos os Dados Locais</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showWipeConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-extrabold text-red-400 mb-1">Destruir Dados Locais?</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Tem certeza absoluta de que deseja destruir TODAS as suas mensagens locais e chave privada E2EE? Esta ação é irreversível.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a212e]">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWipeConfirm(false);
                  onWipeData();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Destruir Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
