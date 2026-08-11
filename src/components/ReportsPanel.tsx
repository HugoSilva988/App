import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, UserX, Trash2, CheckCircle } from 'lucide-react';
import { ReportItem } from '../types';

interface ReportsPanelProps {
  myNick: string;
}

export default function ReportsPanel({ myNick }: ReportsPanelProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [banConfirmReport, setBanConfirmReport] = useState<{ id: string; reported: string } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/reports', {
        headers: {
          'x-auth-nick': myNick
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar denúncias de moderação.');
      }
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Erro de rede ou acesso negado.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [myNick]);

  const handleResolve = async (id: string, action: 'ban' | 'warn' | 'dismiss') => {
    setActioningId(id);
    setSuccessBanner(null);
    setErrorBanner(null);
    try {
      const response = await fetch(`/api/reports/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-nick': myNick
        },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao executar ação.');
      }
      setSuccessBanner(result.message || 'Denúncia resolvida com sucesso!');
      setTimeout(() => setSuccessBanner(null), 4000);
      // Refresh
      fetchReports();
    } catch (err: any) {
      setErrorBanner(err.message || 'Erro de conexão.');
      setTimeout(() => setErrorBanner(null), 4000);
    } finally {
      setActioningId(null);
    }
  };

  if (error) {
    return (
      <div className="flex-1 bg-[#0b0c10] text-[#f3f4f6] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md bg-[#14181f] border border-red-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="inline-flex p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold">Acesso Restrito / Negado</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Seu nível de privilégio atual não permite visualizar o painel administrativo de moderação. Todas as permissões são validadas de forma estrita no servidor Node.
          </p>
          <div className="p-3 bg-blue-950/25 border border-blue-500/10 rounded-xl text-left">
            <p className="text-[10px] text-blue-400 leading-relaxed font-semibold">
              💡 Para testar como Administrador: Crie uma nova conta clicando em "Sair", selecione a opção "Desejo autenticar como Administrador" e forneça a chave secreta de desenvolvimento: <code className="bg-blue-900/30 px-1 py-0.5 rounded text-white font-mono text-[10px]">mestre-admin-2026</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0b0c10] text-[#f3f4f6] p-4 sm:p-6 md:p-8 overflow-y-auto pb-16 md:pb-8 font-sans">
      
      {/* Visual Banners */}
      {successBanner && (
        <div className="mb-4 p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold animate-fadeIn">
          {successBanner}
        </div>
      )}
      {errorBanner && (
        <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold animate-fadeIn">
          {errorBanner}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 border-b border-[#1f2838] pb-5 gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center space-x-2">
            <ShieldAlert className="w-5.5 h-5.5 text-blue-400 shrink-0" />
            <span>Painel Administrativo de Moderação</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Análise estrita de denúncias de abuso da rede. Ações aplicam restrições em tempo real.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="p-2 bg-[#141922] border border-[#232e41] hover:bg-[#1a212e] text-gray-400 hover:text-white rounded-xl cursor-pointer focus:outline-none"
          title="Recarregar"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-[#10141d]/50 rounded-2xl animate-pulse border border-[#212b3d]" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#232d3d] rounded-2xl bg-[#10141d]/30">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-sm font-semibold text-gray-300">Nenhuma denúncia pendente</p>
          <p className="text-xs text-gray-500 mt-1">A plataforma está segura e limpa neste nó.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="bg-[#10141d] border border-[#222c3e] rounded-2xl p-5 shadow-sm text-left relative flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className="bg-red-500/15 text-red-400 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                    {rep.reason.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(rep.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-gray-300">
                  <p>
                    <strong className="text-gray-400">Denunciante:</strong>{' '}
                    <span className="text-blue-400 font-bold">{rep.reporter}</span>
                  </p>
                  <p>
                    <strong className="text-gray-400">Denunciado:</strong>{' '}
                    <span className="text-red-400 font-bold">{rep.reported}</span>
                  </p>
                  <div className="mt-2.5 p-3 bg-black/30 rounded-xl border border-[#21293c] text-gray-400 text-[11px] leading-relaxed break-words">
                    {rep.details || 'Nenhum detalhe adicional fornecido.'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0 border-t md:border-t-0 border-[#1f2838] pt-3 md:pt-0">
                <button
                  onClick={() => handleResolve(rep.id, 'dismiss')}
                  disabled={actioningId !== null}
                  className="flex-1 md:flex-none text-xs font-semibold px-3 py-1.5 bg-[#171d2b] border border-[#29374d] text-gray-300 hover:text-white rounded-xl hover:bg-[#20293d] cursor-pointer transition-colors"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => handleResolve(rep.id, 'warn')}
                  disabled={actioningId !== null}
                  className="flex-1 md:flex-none text-xs font-semibold px-3 py-1.5 bg-yellow-600/10 border border-yellow-500/20 text-yellow-400 hover:text-yellow-300 rounded-xl hover:bg-yellow-600/20 cursor-pointer transition-colors"
                >
                  Alertar
                </button>
                <button
                  id={`reports-ban-btn-${rep.id}`}
                  onClick={() => setBanConfirmReport({ id: rep.id, reported: rep.reported })}
                  disabled={actioningId !== null}
                  className="flex-1 md:flex-none text-xs font-bold px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl cursor-pointer transition-colors flex items-center justify-center space-x-1 shadow-md shadow-red-600/10"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Banir Conta</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {banConfirmReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141d] border border-[#222c3d] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-fadeIn text-left text-[#f3f4f6]">
            <h3 className="text-md font-extrabold text-red-400 mb-1">Banir Usuário?</h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              Tem certeza de que deseja BANIR o usuário {banConfirmReport.reported}? Todas as suas sessões ativas serão canceladas no servidor permanentemente.
            </p>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a212e]">
              <button
                type="button"
                onClick={() => setBanConfirmReport(null)}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { id } = banConfirmReport;
                  setBanConfirmReport(null);
                  handleResolve(id, 'ban');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Banir Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
