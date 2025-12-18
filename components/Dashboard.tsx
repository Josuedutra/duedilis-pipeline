
import React from 'react';
import { Proposta, EstadoProposta } from '../types';
import { formatCurrency, ESTADO_LABELS } from '../constants';
import { 
  TrendingUp, CheckCircle2, DollarSign, Clock, 
  AlertCircle, Target, BarChart3, XCircle, Briefcase
} from 'lucide-react';

interface DashboardProps {
  proposals: Proposta[];
  onSelect: (id: string) => void;
}

const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend }: { title: string; value: string | number; icon: any; color: string; subtitle?: string; trend?: { label: string; positive: boolean } }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
      </div>
    </div>
    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
      <p className="text-[10px] text-slate-400 font-bold italic">{subtitle}</p>
      {trend && (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend.label}
        </span>
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ proposals, onSelect }) => {
  // 1. Pipeline Total (Propostas em curso: Preparação, Submetida, Em Análise)
  const pipelineProposals = proposals.filter(p => 
    [EstadoProposta.PREPARACAO, EstadoProposta.SUBMETIDA, EstadoProposta.EM_ANALISE].includes(p.estado)
  );
  const pipelineValue = pipelineProposals.reduce((acc, p) => acc + (p.valor_proposto || 0), 0);

  // 2. Vencedoras (Adjudicadas)
  const wonProposals = proposals.filter(p => p.estado === EstadoProposta.ADJUDICADA);
  const wonValue = wonProposals.reduce((acc, p) => acc + (p.valor_adjudicado || p.valor_proposto || 0), 0);

  // 3. Perdidas (Não Adjudicadas)
  const lostProposals = proposals.filter(p => p.estado === EstadoProposta.NAO_ADJUDICADA);
  const lostValue = lostProposals.reduce((acc, p) => acc + (p.valor_proposto || 0), 0);

  // 4. Cálculo da Taxa de Conversão (Baseada no histórico de decisão)
  const totalDecided = wonProposals.length + lostProposals.length;
  const successRate = totalDecided > 0 ? (wonProposals.length / totalDecided) * 100 : 0;

  const upcoming = proposals
    .filter(p => p.estado === EstadoProposta.PREPARACAO)
    .sort((a, b) => {
      const dateA = a.data_limite_submissao ? new Date(a.data_limite_submissao).getTime() : Infinity;
      const dateB = b.data_limite_submissao ? new Date(b.data_limite_submissao).getTime() : Infinity;
      return dateA - dateB;
    })
    .slice(0, 3);

  const recent = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Dashboard</h1>
          <p className="text-slate-500 font-medium">Performance global e estado do pipeline ativo.</p>
        </div>
        <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest shadow-sm">
          {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Destaque para o valor total em Pipeline */}
        <MetricCard 
          title="Pipeline Ativo (Total)" 
          value={formatCurrency(pipelineValue)} 
          icon={Briefcase} 
          color="bg-blue-600" 
          subtitle={`${pipelineProposals.length} propostas em curso`}
        />
        <MetricCard 
          title="Taxa de Sucesso" 
          value={`${successRate.toFixed(1)}%`} 
          icon={Target} 
          color="bg-emerald-600" 
          subtitle="Ganhos vs Decididos"
          trend={{ label: 'Conversão', positive: successRate > 20 }}
        />
        <MetricCard 
          title="Ganhos (Total)" 
          value={formatCurrency(wonValue)} 
          icon={CheckCircle2} 
          color="bg-indigo-600" 
          subtitle={`${wonProposals.length} propostas adjudicadas`}
        />
        <MetricCard 
          title="Não Adjudicadas" 
          value={lostProposals.length} 
          icon={XCircle} 
          color="bg-red-500" 
          subtitle={`Perda: ${formatCurrency(lostValue)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2">
            <Clock size={14} className="text-amber-500" />
            <span>Próximas Entregas</span>
          </h2>
          <div className="space-y-4">
            {upcoming.length > 0 ? upcoming.map(p => {
              const diff = p.data_limite_submissao ? new Date(p.data_limite_submissao).getTime() - Date.now() : 0;
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left flex items-start space-x-4 group"
                >
                  <div className={`mt-1 p-2.5 rounded-xl ${days < 3 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    <AlertCircle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 truncate">{p.referencia_concurso}</p>
                    <p className="text-[10px] text-slate-500 font-bold line-clamp-1 mt-0.5">{p.objeto}</p>
                    <div className="mt-3">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${days < 3 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {days <= 0 ? 'Expira Hoje' : `${days} dias restantes`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            }) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase italic">Sem entregas pendentes</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Atividade</h2>
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concurso</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map(p => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => onSelect(p.id)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.referencia_concurso}</span>
                          <span className="text-[10px] text-slate-400 font-bold line-clamp-1">{p.entidade_contratante}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-700">{formatCurrency(p.valor_proposto)}</td>
                      <td className="px-8 py-5">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${ESTADO_LABELS[p.estado].color}`}>
                          {ESTADO_LABELS[p.estado].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
