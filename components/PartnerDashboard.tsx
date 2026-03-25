
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/storage';
import { ESTADO_LABELS, formatCurrency } from '../constants';
import { EstadoProposta } from '../types';
import { Loader2, LogOut, Building2, Clock, TrendingUp, FileText, CheckCircle2, AlertCircle, Layers, BarChart3 } from 'lucide-react';

interface Parceiro {
  id: string;
  nome: string;
  nome_curto: string;
  disciplinas: string[];
  email: string;
}

interface PropostaParceiro {
  parceiro_id: string;
  parceiro_nome: string;
  proposta_id: string;
  referencia_concurso: string;
  objeto: string;
  entidade_contratante: string;
  estado: string;
  track: string;
  categoria_obra: string;
  data_limite_submissao: string;
  valor_base_edital: number;
  markup_percentual: number;
  minhas_disciplinas: string[];
  minha_quota_pct: number;
  meu_valor_a_receber: number;
  meu_status: string;
  horas_validadas: boolean;
  quota_validada: boolean;
  updated_at: string;
}

interface EstatisticasRede {
  total_propostas_track_b: number;
  adjudicadas_track_b: number;
  submetidas_track_b: number;
  em_preparacao_track_b: number;
  parceiros_ativos: number;
  volume_adjudicado_track_b: number;
  disciplinas_cobertas: string[];
}

interface PartnerDashboardProps {
  onLogout: () => void;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onLogout }) => {
  const [step, setStep] = useState<'login' | 'dashboard'>('login');
  const [email, setEmail] = useState('');
  const [parceiro, setParceiro] = useState<Parceiro | null>(null);
  const [propostas, setPropostas] = useState<PropostaParceiro[]>([]);
  const [stats, setStats] = useState<EstatisticasRede | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('parceiros')
        .select('id, nome, nome_curto, disciplinas, email')
        .eq('auth_email', email.trim().toLowerCase())
        .eq('auth_ativo', true)
        .single();

      if (err || !data) {
        setError('Email não reconhecido ou acesso não ativado. Contacte a Duedilis.');
        return;
      }

      setParceiro(data);
      await loadDashboard(data.id);
      setStep('dashboard');
    } catch (e: any) {
      setError(e.message || 'Erro de ligação');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (parceiroId: string) => {
    setLoading(true);
    try {
      const [propRes, statsRes] = await Promise.all([
        supabase.from('v_dashboard_parceiro').select('*').eq('parceiro_id', parceiroId),
        supabase.from('v_estatisticas_rede').select('*').single()
      ]);

      if (propRes.data) setPropostas(propRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoStyle = (estado: string) => {
    const e = estado as EstadoProposta;
    return ESTADO_LABELS[e] || { label: estado, color: 'bg-gray-100 text-gray-600' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'convidado': return <AlertCircle size={14} className="text-amber-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  // LOGIN
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-600/30">
              <span className="text-white text-2xl font-black">D</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Duedilis</h1>
            <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest font-bold">Portal do Parceiro</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900 mb-1">Acesso ao Pipeline</h2>
            <p className="text-sm text-slate-500 mb-6">Introduza o email registado na rede Duedilis.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="parceiro@exemplo.pt"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !email.includes('@')}
                className="w-full py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Entrar</span>}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-6">
              Acesso reservado a parceiros da rede curada Duedilis.
              <br />Contacte josue@duedilis.pt para ativação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50">
      {loading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">D</div>
          <div>
            <h1 className="font-bold text-lg leading-none">Duedilis</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Portal do Parceiro</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-bold">{parceiro?.nome}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{parceiro?.disciplinas?.join(', ')}</p>
          </div>
          <button onClick={() => { setStep('login'); setParceiro(null); setPropostas([]); onLogout(); }}
            className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors">
            <LogOut size={18} className="text-slate-400" />
          </button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto p-6 md:p-8 space-y-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><FileText size={16} className="text-blue-600" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Minhas propostas</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{propostas.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center"><TrendingUp size={16} className="text-green-600" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor potencial</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {formatCurrency(propostas.reduce((s, p) => s + (p.meu_valor_a_receber || 0), 0))}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><Layers size={16} className="text-purple-600" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rede</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stats?.parceiros_ativos || 0} <span className="text-sm font-bold text-slate-400">parceiros</span></p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center"><BarChart3 size={16} className="text-amber-600" /></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline rede</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stats?.total_propostas_track_b || 0} <span className="text-sm font-bold text-slate-400">propostas</span></p>
          </div>
        </div>

        {/* Ações pendentes */}
        {propostas.some(p => !p.horas_validadas || !p.quota_validada) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center space-x-2 mb-3">
              <AlertCircle size={14} />
              <span>Ações pendentes</span>
            </h3>
            <div className="space-y-2">
              {propostas.filter(p => !p.horas_validadas || !p.quota_validada).map(p => (
                <div key={p.proposta_id} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-amber-900">{p.referencia_concurso}</span>
                  <div className="flex space-x-3">
                    {!p.horas_validadas && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded-lg font-bold">Validar horas</span>}
                    {!p.quota_validada && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded-lg font-bold">Validar quota</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Propostas list */}
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center space-x-2">
            <FileText size={16} className="text-blue-600" />
            <span>Propostas com a minha participação</span>
          </h2>

          {propostas.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
              <p className="text-slate-400 text-sm font-bold">Sem propostas associadas de momento.</p>
              <p className="text-slate-300 text-xs mt-2">Quando for incluído num concurso, aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {propostas.map(p => {
                const estadoStyle = getEstadoStyle(p.estado);
                const diff = p.data_limite_submissao ? new Date(p.data_limite_submissao).getTime() - Date.now() : 0;
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

                return (
                  <div key={p.proposta_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-black text-blue-600">{p.referencia_concurso}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estadoStyle.color}`}>{estadoStyle.label}</span>
                            {p.track === 'B' && <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">Track B</span>}
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 leading-tight">{p.objeto}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(p.meu_status)}
                          <span className="text-[9px] font-black text-slate-400 uppercase">{p.meu_status}</span>
                        </div>
                      </div>

                      <div className="flex items-center text-xs text-slate-500 mb-4">
                        <Building2 size={13} className="mr-2 text-slate-400" />
                        <span>{p.entidade_contratante}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-50">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Disciplinas</span>
                          <span className="text-xs font-bold text-slate-700">{(p.minhas_disciplinas || []).join(', ') || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Minha quota</span>
                          <span className="text-xs font-bold text-slate-700">{p.minha_quota_pct ? `${p.minha_quota_pct}%` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Valor a receber</span>
                          <span className="text-xs font-black text-green-700">{p.meu_valor_a_receber ? formatCurrency(p.meu_valor_a_receber) : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Preço base</span>
                          <span className="text-xs font-bold text-slate-700">{p.valor_base_edital ? formatCurrency(p.valor_base_edital) : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-0.5">Prazo submissão</span>
                          <span className={`text-xs font-bold ${days < 3 && days > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {isNaN(days) ? '—' : days > 0 ? `${days} dias` : days === 0 ? 'Hoje' : 'Expirado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rede info */}
        {stats && (
          <div className="bg-slate-900 rounded-2xl p-6 text-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Estado da rede Duedilis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-black">{stats.parceiros_ativos}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Parceiros ativos</p>
              </div>
              <div>
                <p className="text-2xl font-black">{(stats.disciplinas_cobertas || []).length}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Disciplinas</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.total_propostas_track_b}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Propostas consórcio</p>
              </div>
              <div>
                <p className="text-2xl font-black">{stats.adjudicadas_track_b}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Adjudicadas</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-slate-400">
            Duedilis Pipeline Manager — Portal do Parceiro v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
