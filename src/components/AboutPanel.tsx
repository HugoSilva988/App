import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  KeyRound, 
  Heart, 
  Smile, 
  Compass, 
  MessageSquare, 
  Lock, 
  Users, 
  Fingerprint,
  Cpu
} from 'lucide-react';
import { UserProfile } from '../types';

interface AboutPanelProps {
  user: UserProfile;
}

export default function AboutPanel({ user }: AboutPanelProps) {
  const simulatedFingerprint = user.publicKey 
    ? user.publicKey.substring(0, 24) + '...'
    : 'Chave pública não gerada';

  return (
    <div className="flex-1 bg-[#0A0A0B] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-20 md:pb-8 font-sans">
      
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 tracking-wider uppercase mb-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Aether Security Network</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f3f4f6]">
          Sobre o Mestre / Aether
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Plataforma criptografada de comunicação ponta a ponta e conexões seguras.
        </p>
      </div>

      <div className="max-w-4xl space-y-8">
        
        {/* Main Concept Card */}
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/5">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Comunicação Sem Fronteiras com Privacidade Absoluta</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                O <strong>Mestre (Aether)</strong> é um hub social descentralizado e criptografado de última geração. 
                Cada conversa, chat de grupo e chamada de voz/vídeo é protegida por chaves criptográficas RSA de 2048 bits geradas diretamente no seu dispositivo. 
                Isso significa que nenhum terceiro — nem mesmo os nossos servidores — tem acesso às suas mensagens ou mídias.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Recursos Core Integrados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Descobrir Conexões */}
            <div className="bg-[#121216] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-200">Descoberta Personalizada</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Encontre pessoas que buscam o mesmo que você! Filtre facilmente perfis com base em interesses (<strong>Diversão</strong>, <strong>Relacionamento Sério</strong> ou <strong>Outras Coisas</strong>) e preferências de gênero de forma instantânea e segura.
              </p>
            </div>

            {/* Card 2: Criptografia de Ponta a Ponta */}
            <div className="bg-[#121216] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-200">E2EE Totalmente Invisível</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Suas chaves criptográficas (pública e privada) são geradas em segundos e salvas localmente no navegador. Mensagens são codificadas antes do envio e decodificadas em tempo de leitura.
              </p>
            </div>

            {/* Card 3: Comunidade Geral e Grupos */}
            <div className="bg-[#121216] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-amber-600/10 text-amber-400 border border-amber-500/20 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-200">Salas de Comunidades</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Participe de grupos temáticos de discussões ou crie seus próprios canais. Conexão direta via WebSockets com entrega de status, presença online dinâmica e digitação em tempo real.
              </p>
            </div>

            {/* Card 4: Chamadas Privadas E2EE */}
            <div className="bg-[#121216] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-lg">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-200">Chamadas de Voz e Vídeo</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sistema de chamadas em tempo real embutido com sinalização criptografada. Converse por voz ou faça chamadas de vídeo de alta fidelidade sem vazamento de metadados.
              </p>
            </div>

          </div>
        </div>

        {/* Technical Diagnostics */}
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-indigo-400" />
            <span>Dados de Segurança do Seu Dispositivo</span>
          </h3>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060608] border border-white/5 rounded-xl p-4">
              <div>
                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-wider mb-1">Apelido Seguro</span>
                <span className="text-indigo-400 font-bold font-mono text-xs">{user.nick}</span>
              </div>
              <div>
                <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-wider mb-1">Nível de Acesso</span>
                <span className="text-white font-bold capitalize">{user.role === 'admin' ? '👑 Administrador' : '👤 Usuário Criptografado'}</span>
              </div>
            </div>

            <div className="bg-[#060608] border border-white/5 rounded-xl p-4">
              <span className="block text-gray-500 font-semibold uppercase text-[10px] tracking-wider mb-1">Assinatura Digital (Chave Pública)</span>
              <p className="font-mono text-gray-400 break-all select-all text-[11px] bg-black/40 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                {user.publicKey || 'Nenhuma chave pública gerada para esta sessão.'}
              </p>
              <p className="text-[10px] text-gray-500 mt-2">
                * Sua chave privada equivalente está armazenada com exclusividade no armazenamento isolado do seu navegador (IndexedDB) e nunca é exposta.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-xs text-gray-500">
            Aether Security Node • Versão de Produção 2.0.26
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Desenvolvido com foco absoluto em direitos individuais de privacidade e liberdade de comunicação digital.
          </p>
        </div>

      </div>
    </div>
  );
}
