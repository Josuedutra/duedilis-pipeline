import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthGate';
import { supabase } from '../services/storage';
import { ESTADO_LABELS, formatCurrency as fmtCurrency } from '../constants';
import { EstadoProposta } from '../types';
import {
  Building2, LogOut, FileText, Euro, AlertTriangle, Users,
  Calendar, ChevronDown, ChevronUp, CheckCircle2,
  Clock, XCircle, CircleDot, Briefcase, TrendingUp, Globe
} from 'lucide-react';

/* ───────────────────────────────────────────────────────
   AgrupamentoDashboard — Partner-facing view
   A: Personal metrics
   B: Full Track B pipeline
   C: My participations (exclusive detail)
   D: Network stats footer
   ─────────────────────────────────────────────────────── */

interface PropostaPipeline {
  id: string;
  referencia_concurso: string;
  objeto: string;
  entidade_contratante: string;
  estado: string;
  track: string;
  categoria_obra: string | null;
  data_limite_submissao: string | null;
  valor_base_edital: number | null;
  created_at: string;
  updated_at: string;
}

interface MinhaParticipacao {
  proposta_id: string;
  parceiro_id: string;
  referencia_concurso: string;
  objeto: string;
  entidade_contratante: string;
  estado: string;
  disciplinas: string[];
  quota_percentual: number | null;
  valor_a_receber: number | null;
  status: string;
  horas_validadas: boolean;
  quota_validada: boolean;
  perfis: any[] | null;
}

interface RedeStats {
  parceiros_ativos: number;
  disciplinas_cobertas: number;
  propostas_consorcio: number;
  adjudicadas: number;
}

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (v: number | null): string => {
  if (v == null) return '—';
  return fmtCurrency(v);
};

const estadoBadge = (estado: string) => {
  // ESTADO_LABELS uses EstadoProposta enum keys → { label, color }
  const entry = ESTADO_LABELS[estado as EstadoProposta];
  const label = entry?.label || estado;
  const cls = entry?.color || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
};

const statusParceiroIcon = (status: string) => {
  switch (status) {
    case 'confirmado': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case 'convidado': return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    case 'recusado': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'em_execucao': return <CircleDot className="w-3.5 h-3.5 text-blue-500" />;
    case 'concluido': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const AgrupamentoDashboard: React.FC = () => {
  const { session, logout } = useAuth();
  const [propostas, setPropostas] = useState<PropostaPipeline[]>([]);
  const [participacoes, setParticipacoes] = useState<MinhaParticipacao[]>([]);
  const [redeStats, setRedeStats] = useState<RedeStats>({ parceiros_ativos: 0, disciplinas_cobertas: 0, propostas_consorcio: 0, adjudicadas: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  const loadData = async () => {
    setLoading(true);

    // 1. All Track B proposals
    const { data: props } = await supabase
      .from('propostas')
      .select('id, referencia_concurso, objeto, entidade_contratante, estado, track, categoria_obra, data_limite_submissao, valor_base_edital, created_at, updated_at')
      .eq('track', 'B')
      .order('updated_at', { ascending: false });

    setPropostas(props || []);

    // 2. My participations
    const { data: parts } = await supabase
      .from('v_dashboard_parceiro')
      .select('*')
      .eq('parceiro_id', session!.parceiro_id);

    setParticipacoes(parts || []);

    // 3. Network stats
    try {
      const { data: stats } = await supabase
        .from('v_estatisticas_rede')
        .select('*')
        .single();

      if (stats) {
        setRedeStats({
          parceiros_ativos: stats.parceiros_ativos || 0,
          disciplinas_cobertas: stats.disciplinas_cobertas || 0,
          propostas_consorcio: stats.propostas_consorcio || 0,
          adjudicadas: stats.adjudicadas || 0,
        });
      }
    } catch (e) {
      console.warn('Stats view not available:', e);
    }

    setLoading(false);
  };

  const metricas = useMemo(() => {
    const valorPotencial = participacoes.reduce((acc, p) => acc + (p.valor_a_receber || 0), 0);
    const acoesPendentes = participacoes.filter(p => !p.horas_validadas || !p.quota_validada).length;
    return { totalParticipacoes: participacoes.length, valorPotencial, acoesPendentes };
  }, [participacoes]);

  const estados = useMemo(() => {
    const set = new Set(propostas.map(p => p.estado));
    return ['todos', ...Array.from(set)];
  }, [propostas]);

  const propostasFiltradas = useMemo(() => {
    if (filterEstado === 'todos') return propostas;
    return propostas.filter(p => p.estado === filterEstado);
  }, [propostas, filterEstado]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">{session?.nome}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {session?.disciplinas.map(d => (
                  <span key={d} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[10px] font-semibold">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* A: METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Minhas propostas', value: metricas.totalParticipacoes, icon: FileText, bg: 'bg-purple-50' },
            { label: 'Valor potencial', value: formatMoney(metricas.valorPotencial), icon: Euro, bg: 'bg-teal-50' },
            { label: 'Ações pendentes', value: metricas.acoesPendentes, icon: AlertTriangle, bg: 'bg-amber-50' },
            { label: 'Parceiros na rede', value: redeStats.parceiros_ativos, icon: Users, bg: 'bg-blue-50' },
          ].map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {/* B: PIPELINE TRACK B */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Pipeline do Agrupamento</h2>
              <p className="text-xs text-slate-500 mt-0.5">Todos os concursos Track B em tempo real</p>
            </div>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              {estados.map(e => (
                <option key={e} value={e}>
                  {e === 'todos' ? 'Todos os estados' : (ESTADO_LABELS[e as EstadoProposta]?.label || e)}
                </option>
              ))}
            </select>
          </div>

          {propostasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Sem propostas Track B no pipeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {propostasFiltradas.map(p => {
                const isMyProposal = participacoes.some(part => part.proposta_id === p.id);
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md ${
                      isMyProposal ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900">{p.referencia_concurso || 'Sem referência'}</span>
                          {isMyProposal && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[9px] font-bold uppercase tracking-wider">
                              Participo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{p.objeto || '—'}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {p.entidade_contratante || '—'}
                          </span>
                          {p.data_limite_submissao && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {formatDate(p.data_limite_submissao)}
                            </span>
                          )}
                          {p.categoria_obra && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {p.categoria_obra}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {estadoBadge(p.estado)}
                        <span className="text-sm font-bold text-slate-700">
                          {p.valor_base_edital ? formatMoney(p.valor_base_edital) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* C: MY PARTICIPATIONS */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">Minhas Participações</h2>
            <p className="text-xs text-slate-500 mt-0.5">Concursos onde faço parte do consórcio — informação exclusiva</p>
          </div>

          {participacoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Ainda não participa em nenhum consórcio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participacoes.map(part => {
                const isExpanded = expandedId === part.proposta_id;
                return (
                  <div key={part.proposta_id} className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : part.proposta_id)}
                      className="w-full p-5 flex items-center justify-between text-left hover:bg-teal-50/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900">{part.referencia_concurso || '—'}</span>
                          {estadoBadge(part.estado)}
                          <div className="flex items-center gap-1">
                            {statusParceiroIcon(part.status)}
                            <span className="text-[10px] font-semibold text-slate-500">{part.status}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 truncate">{part.objeto || '—'}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-teal-700">
                            {part.quota_percentual != null ? `${part.quota_percentual}%` : '—'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Quota</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-slate-900">
                            {formatMoney(part.valor_a_receber)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">A receber</div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-teal-100">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Disciplinas</span>
                            <div className="flex flex-wrap gap-1">
                              {(part.disciplinas || []).map(d => (
                                <span key={d} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-[11px] font-semibold">{d}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Horas validadas</span>
                            <span className={`text-sm font-bold ${part.horas_validadas ? 'text-green-600' : 'text-amber-600'}`}>
                              {part.horas_validadas ? '✓ Sim' : '⏳ Pendente'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Quota validada</span>
                            <span className={`text-sm font-bold ${part.quota_validada ? 'text-green-600' : 'text-amber-600'}`}>
                              {part.quota_validada ? '✓ Sim' : '⏳ Pendente'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Entidade</span>
                            <span className="text-sm text-slate-700">{part.entidade_contratante || '—'}</span>
                          </div>
                        </div>

                        {part.perfis && part.perfis.length > 0 && (
                          <div className="mt-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Perfis e horas</span>
                            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left p-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Perfil</th>
                                    <th className="text-right p-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">€/h</th>
                                    <th className="text-right p-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Horas</th>
                                    <th className="text-right p-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {part.perfis.map((perfil: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-100 last:border-0">
                                      <td className="p-2.5 text-slate-700 font-medium">{perfil.perfil || '—'}</td>
                                      <td className="p-2.5 text-right text-slate-600">{formatMoney(perfil.custo_hora_seco)}</td>
                                      <td className="p-2.5 text-right text-slate-600">{perfil.horas || '—'}</td>
                                      <td className="p-2.5 text-right font-bold text-slate-700">{formatMoney(perfil.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <button disabled title="Em breve" className="px-4 py-2 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-not-allowed">
                            Validar horas
                          </button>
                          <button disabled title="Em breve" className="px-4 py-2 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-not-allowed">
                            Validar quota
                          </button>
                          <button disabled title="Em breve" className="px-4 py-2 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-not-allowed">
                            Upload documentos
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* D: NETWORK STATS */}
        <section>
          <div className="bg-slate-900 rounded-[2rem] p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">Estado da Rede</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Parceiros ativos', value: redeStats.parceiros_ativos, icon: Users },
                { label: 'Disciplinas cobertas', value: redeStats.disciplinas_cobertas, icon: Globe },
                { label: 'Propostas consórcio', value: redeStats.propostas_consorcio, icon: FileText },
                { label: 'Adjudicadas', value: redeStats.adjudicadas, icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <Icon className="w-5 h-5 text-purple-400 mb-2" />
                  <div className="text-3xl font-extrabold text-white">{value}</div>
                  <div className="text-xs text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Duedilis — Discoverypact Lda.
      </footer>
    </div>
  );
};

export default AgrupamentoDashboard;
