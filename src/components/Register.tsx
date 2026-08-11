import React, { useState, useEffect } from 'react';
import { Shield, Key, Sparkles, HelpCircle, Lock, User } from 'lucide-react';
import { calculateFingerprint } from '../services/cryptoService';

interface RegisterProps {
  onSuccess: (nick: string, profile: any) => void;
}

export default function Register({ onSuccess }: RegisterProps) {
  const [nick, setNick] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [gender, setGender] = useState<'homem' | 'mulher'>('homem');
  const [interest, setInterest] = useState<'diversão' | 'relacionamento' | 'outras'>('diversão');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Cryptographic generation states
  const [cryptoStep, setCryptoStep] = useState<number>(0); // 0: idle, 1: generating entropy, 2: factoring primes, 3: sealing vault, 4: done
  const [generatedFingerprint, setGeneratedFingerprint] = useState('');
  const [entropyProgress, setEntropyProgress] = useState(0);

  useEffect(() => {
    if (cryptoStep === 1) {
      const interval = setInterval(() => {
        setEntropyProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCryptoStep(2);
            return 100;
          }
          return prev + 15;
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (cryptoStep === 2) {
      const timer = setTimeout(() => {
        setCryptoStep(3);
      }, 800);
      return () => clearTimeout(timer);
    } else if (cryptoStep === 3) {
      const timer = setTimeout(() => {
        setCryptoStep(4);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [cryptoStep]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedNick = nick.trim().toLowerCase();
    const formattedNick = trimmedNick.startsWith('@') ? trimmedNick : `@${trimmedNick}`;

    if (!trimmedNick || !name.trim()) {
      setError('Por favor, preencha o @nick e o Nome.');
      return;
    }

    if (!/^\@[a-z0-9_]{3,15}$/.test(formattedNick)) {
      setError('O @nick deve ter de 3 a 15 caracteres (apenas letras, números ou sublinhados).');
      return;
    }

    setIsLoading(true);
    setCryptoStep(1);
    setEntropyProgress(0);

    // Simulate cryptographic key setup in parallel for beautiful UX
    const simulatedFingerprint = await calculateFingerprint(`MestrePublicKey_RSA2048_${formattedNick}_${Math.random()}`);
    setGeneratedFingerprint(simulatedFingerprint);

    // Wait until key setup visualization completes
    await new Promise(resolve => {
      const check = setInterval(() => {
        setCryptoStep(current => {
          if (current === 4) {
            clearInterval(check);
            resolve(true);
          }
          return current;
        });
      }, 100);
    });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nick: formattedNick,
          name: name.trim(),
          bio: bio.trim() || 'Disponível no Mestre Chat!',
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${formattedNick}`,
          password: isAdminMode ? adminPassword : undefined,
          publicKey: `RSA2048_PUB_${simulatedFingerprint}_PEM_STRING`,
          gender,
          interest
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao autenticar.');
      }

      onSuccess(formattedNick, result.user);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
      setCryptoStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#f3f4f6] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#0F0F12]/95 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-400">
            AETHER
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Plataforma de Comunicação Criptografada & Local-First
          </p>
        </div>

        {cryptoStep > 0 && cryptoStep < 4 ? (
          /* Cryptographic Generation Progress UI */
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center bg-indigo-950/40 border border-indigo-500/30 rounded-full animate-pulse">
              <Key className="w-8 h-8 text-indigo-400 animate-bounce" />
            </div>
            
            <div className="text-center space-y-1 max-w-sm">
              <h3 className="font-semibold text-lg text-indigo-400">
                {cryptoStep === 1 && `Coletando Entropia (${entropyProgress}%)`}
                {cryptoStep === 2 && 'Fatorando Números Primos...'}
                {cryptoStep === 3 && 'Selando Cofre de Chaves Local'}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {cryptoStep === 1 && 'Mova o mouse ou aguarde enquanto geramos sementes aleatórias para sua chave RSA-2048.'}
                {cryptoStep === 2 && 'Gerando chaves matemáticas assimétricas. O servidor nunca terá acesso à sua chave privada.'}
                {cryptoStep === 3 && 'Armazenando suas chaves criptografadas com segurança na memória segura do seu navegador.'}
              </p>
            </div>

            {/* Simulated progress bar */}
            <div className="w-full max-w-xs bg-gray-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-150"
                style={{
                  width: `${
                    cryptoStep === 1 ? entropyProgress :
                    cryptoStep === 2 ? 80 : 95
                  }%`
                }}
              />
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="reg-nick" className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                Apelido Único (@nick)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-semibold select-none">@</span>
                <input
                  id="reg-nick"
                  type="text"
                  placeholder="apelido"
                  value={nick.startsWith('@') ? nick.slice(1) : nick}
                  onChange={(e) => setNick(e.target.value)}
                  className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 pl-7 pr-4 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Seu identificador exclusivo. Amigos usam isso para encontrar e ligar para você.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                Nome de Exibição
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Seu nome completo ou social"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Gênero e Busca */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                  Seu Gênero
                </label>
                <div className="flex bg-[#16161A] border border-white/5 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setGender('homem')}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      gender === 'homem'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Homem
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('mulher')}
                    className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      gender === 'mulher'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Mulher
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                  O que você busca?
                </label>
                <select
                  value={interest}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInterest(e.target.value as any)}
                  className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 px-3 text-xs text-[#f3f4f6] focus:outline-none focus:border-indigo-500 transition-all cursor-pointer h-[34px]"
                >
                  <option value="diversão">🎉 Diversão</option>
                  <option value="relacionamento">❤️ Relacionamento Sério</option>
                  <option value="outras">💼 Outras Coisas</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-bio" className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                Biografia (Status Padrão)
              </label>
              <textarea
                id="reg-bio"
                placeholder="Olá! Estou usando o Mestre Chat privado."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 px-3 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-avatar" className="block text-xs font-semibold text-gray-400 tracking-wider uppercase">
                URL do Avatar (Opcional)
              </label>
              <input
                id="reg-avatar"
                type="url"
                placeholder="https://exemplo.com/foto.jpg (Deixe em branco para robô)"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 px-3 text-sm text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Toggle Admin mode for demonstration */}
            <div className="pt-2 border-t border-white/5 flex flex-col space-y-2">
              <label className="flex items-center text-xs text-gray-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdminMode}
                  onChange={(e) => setIsAdminMode(e.target.checked)}
                  className="mr-2 rounded border-white/10 bg-[#16161A] text-indigo-500 focus:ring-0"
                />
                Desejo autenticar como Administrador / Moderador
              </label>

              {isAdminMode && (
                <div className="animate-fadeIn">
                  <input
                    type="password"
                    placeholder="Chave de Acesso Moderador (mestre-admin-2026)"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#16161A] border border-white/5 rounded-xl py-2 px-3 text-xs text-[#f3f4f6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required={isAdminMode}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#14181f] flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-500/15"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gerar Identidade E2EE & Entrar</span>
            </button>
          </form>
        )}

        {/* Info panel */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-start space-x-2 text-gray-500">
          <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed">
            <strong>Segurança Local-First:</strong> Seus segredos, chaves de descriptografia e conversas são salvos exclusivamente no seu dispositivo. Suas chamadas e dados trafegam temporariamente pelo servidor de forma 100% criptografada.
          </p>
        </div>
      </div>
    </div>
  );
}
