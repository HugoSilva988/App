import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  Settings,
  Sparkles,
  Info,
  Radio
} from 'lucide-react';
import { CallSession } from '../types';

interface CallUIProps {
  session: CallSession;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
}

export default function CallUI({
  session,
  onAccept,
  onDecline,
  onHangup
}: CallUIProps) {
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(session.type === 'voice');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Timer for active call
  useEffect(() => {
    let timer: any = null;
    if (session.status === 'connected') {
      timer = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [session.status]);

  // Handle Camera media stream capture for realistic WebRTC feedback
  useEffect(() => {
    async function startCamera() {
      if (session.type === 'video' && session.status === 'connected' && !isCameraOff) {
        try {
          const userStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 300, height: 200 },
            audio: false // handle audio separately or mock it to avoid loops
          });
          setStream(userStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userStream;
          }
        } catch (e) {
          console.warn('Falha ao acessar câmera local:', e);
        }
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [session.type, session.status, isCameraOff]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 font-sans text-[#f3f4f6]">
      
      {/* Background aesthetic glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg bg-[#11141e]/85 backdrop-blur-md border border-[#232e41] rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative z-10 overflow-hidden text-center justify-between min-h-[500px]">
        
        {/* Connection status header */}
        <div className="w-full flex items-center justify-between text-xs text-gray-500 border-b border-[#1c2434] pb-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Radio className={`w-3.5 h-3.5 ${session.status === 'connected' ? 'text-green-500 animate-pulse' : 'text-yellow-500'}`} />
            <span className="font-semibold tracking-wider uppercase text-gray-400">
              {session.status === 'connecting' && 'Conectando rede...'}
              {session.status === 'ringing' && 'Chamando...'}
              {session.status === 'connected' && 'Conexão E2EE Ativa'}
              {session.status === 'busy' && 'Ocupado'}
              {session.status === 'failed' && 'Chamada falhou'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] bg-blue-950/40 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Sinal WebRTC</span>
          </div>
        </div>

        {/* Video streams or avatar displays */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 w-full relative">
          
          {session.type === 'video' && session.status === 'connected' ? (
            /* VIDEO CALL INTERFACE */
            <div className="w-full h-64 bg-[#0a0c12] border border-[#20293a] rounded-2xl relative overflow-hidden flex items-center justify-center">
              
              {/* Remote video simulator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <img 
                  src={session.partnerAvatar} 
                  alt={session.partnerName} 
                  className="w-16 h-16 rounded-full opacity-45 mb-2 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs text-gray-500 font-semibold">Feed de Vídeo do Contato</span>
                <span className="text-[10px] text-gray-600 mt-1">Criptografado com Chave E2EE do Contato</span>
              </div>

              {/* Local Video Camera overlay */}
              <div className="absolute right-3.5 bottom-3.5 w-24 h-32 bg-[#121622] border border-[#33425b] rounded-xl overflow-hidden shadow-xl z-20">
                {isCameraOff ? (
                  <div className="w-full h-full flex items-center justify-center bg-[#0d1016]">
                    <VideoOff className="w-4 h-4 text-gray-600" />
                  </div>
                ) : (
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]" // mirror flip
                  />
                )}
                <span className="absolute bottom-1 left-2 text-[8px] text-gray-400 bg-black/60 px-1 py-0.2 rounded">Você</span>
              </div>
            </div>
          ) : (
            /* VOICE CALL / RINGING INTERFACE */
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                {/* Glowing ring effects */}
                <span className="absolute -inset-4 bg-blue-600/20 rounded-full animate-ping pointer-events-none" />
                <span className="absolute -inset-8 bg-blue-600/10 rounded-full animate-pulse pointer-events-none" />
                
                <img 
                  src={session.partnerAvatar} 
                  alt={session.partnerName} 
                  className="w-24 h-24 rounded-full border-4 border-[#232d3e] shadow-2xl relative z-10 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h3 className="text-xl font-extrabold text-gray-200">{session.partnerName}</h3>
              <p className="text-sm text-blue-400 font-semibold mt-1">{session.partnerNick}</p>
              
              {session.status === 'connected' && (
                <div className="mt-4 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                  ⏱️ {formatDuration(duration)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CALL INCOMING MODAL CONTROLS */}
        {session.direction === 'incoming' && session.status === 'ringing' ? (
          <div className="w-full flex flex-col items-center space-y-4 shrink-0 border-t border-[#1c2434] pt-5">
            <p className="text-xs text-gray-400">Chamada recebida por @nick seguro</p>
            <div className="flex items-center space-x-6">
              <button 
                id="call-decline-btn"
                onClick={onDecline}
                className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-red-500/20 cursor-pointer focus:outline-none transition-all"
                title="Recusar"
              >
                <PhoneOff className="w-5.5 h-5.5" />
              </button>
              <button 
                id="call-accept-btn"
                onClick={onAccept}
                className="w-14 h-14 bg-green-600 hover:bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-green-500/20 cursor-pointer focus:outline-none transition-all animate-bounce"
                title="Aceitar"
              >
                <Volume2 className="w-5.5 h-5.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE / OUTGOING CALL CONTROLS */
          <div className="w-full flex flex-col items-center space-y-5 shrink-0 border-t border-[#1c2434] pt-5">
            
            {/* Control bar buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-11 h-11 border rounded-2xl flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
                  isMuted 
                    ? 'bg-red-600/20 border-red-500/30 text-red-400' 
                    : 'bg-[#181f2b] border-[#2b384f] text-gray-300 hover:bg-[#212b3e] hover:text-white'
                }`}
                title={isMuted ? 'Ativar microfone' : 'Mutar microfone'}
              >
                {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>

              {session.type === 'video' && (
                <button
                  onClick={() => setIsCameraOff(!isCameraOff)}
                  className={`w-11 h-11 border rounded-2xl flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
                    isCameraOff 
                      ? 'bg-red-600/20 border-red-500/30 text-red-400' 
                      : 'bg-[#181f2b] border-[#2b384f] text-gray-300 hover:bg-[#212b3e] hover:text-white'
                  }`}
                  title={isCameraOff ? 'Ativar Câmera' : 'Desligar Câmera'}
                >
                  {isCameraOff ? <VideoOff className="w-4.5 h-4.5" /> : <Video className="w-4.5 h-4.5" />}
                </button>
              )}

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-11 h-11 border rounded-2xl flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
                  !isSpeakerOn 
                    ? 'bg-red-600/20 border-red-500/30 text-red-400' 
                    : 'bg-[#181f2b] border-[#2b384f] text-gray-300 hover:bg-[#212b3e] hover:text-white'
                }`}
                title="Toggle alto falante"
              >
                {isSpeakerOn ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
            </div>

            {/* Red hangup button */}
            <button 
              id="call-hangup-btn"
              onClick={onHangup}
              className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-red-500/30 cursor-pointer focus:outline-none transition-transform hover:scale-105 active:scale-95"
              title="Desligar"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Security Warning note */}
        <div className="w-full flex items-center justify-center space-x-2 text-[10px] text-gray-500 mt-4 shrink-0">
          <Info className="w-3 h-3 text-blue-500" />
          <span>Chamadas não gravadas. Chaves de sinal criptografadas localmente.</span>
        </div>
      </div>
    </div>
  );
}
