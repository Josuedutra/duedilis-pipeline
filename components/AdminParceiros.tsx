import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/storage';
// Uses direct Supabase queries — no dependency on constants or types
import {
  Users, CheckCircle2, Clock, XCircle, Shield, ShieldOff,
  Search, Mail, Phone, Calendar, Building2, ChevronDown, ChevronUp, Tag
} from 'lucide-react';

/* ───────────────────────────────────────────────────────
   AdminParceiros — Partner management for admin
   List all partners + activate/deactivate + view details
   ─────────────────────────────────────────────────────── */

interface Parceiro {
  id: string;
  nome: string;
  nome_curto: string;
  nipc: string | null;
  email: string | null;
  telefone: string | null;
  contacto_operacional: string | null;
  disciplinas: string[];
  status: string;
  data_adesao: string | null;
  notas: string | null;
  auth_email: string | null;
  auth_ativo: boolean;
  custo_hora_seco_senior: number | null;
  custo_hora_seco_pleno: number | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  inativo: { label: 'Inativo', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

const AdminParceiros: React.FC = () => {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadParceiros();
  }, []);

  const loadParceiros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parceiros')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error loading parceiros:', error);
    setParceiros(data || []);
    setLoading(false);
  };

  const toggleAuth = async (parceiro: Parceiro) => {
    setActionLoading(parceiro.id);
    const newActive = !parceiro.auth_ativo;
    const newStatus = newActive ? 'confirmado' : 'inativo';

    const { error } = await supabase
      .from('parceiros')
      .update({ auth_ativo: newActive, status: newStatus })
      .eq('id', parceiro.id);

    if (error) {
      console.error('Error toggling auth:', error);
    } else {
      setParceiros(prev =>
        prev.map(p =>
          p.id === parceiro.id ? { ...p, auth_ativo: newActive, status: newStatus } : p
        )
      );
    }
    setActionLoading(null);
  };

  const filteredParceiros = useMemo(() => {
    let result = parceiros;
    if (filterStatus !== 'todos') {
      result = result.filter(p => p.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.auth_email || '').toLowerCase().includes(q) ||
        p.disciplinas.some(d => d.toLowerCase().includes(q))
      );
    }
    return result;
  }, [parceiros, filterStatus, search]);

  const stats = useMemo(() => ({
    total: parceiros.length,
    ativos: parceiros.filter(p => p.status === 'confirmado').length,
    pendentes: parceiros.filter(p => p.status === 'pendente').length,
    inativos: parceiros.filter(p => p.status === 'inativo').length,
  }), [parceiros]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Gestão de Parceiros</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rede curada de agrupamentos Track B</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: 'Total', value: stats.total, cls: 'bg-slate-100 text-slate-700' },
            { label: 'Ativos', value: stats.ativos, cls: 'bg-green-100 text-green-700' },
            { label: 'Pendentes', value: stats.pendentes, cls: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, cls }) => (
            <span key={label} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${cls}`}>
              {value} {label}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email ou disciplina..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {['todos', 'confirmado', 'pendente', 'inativo'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                filterStatus === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s === 'todos' ? 'Todos' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredParceiros.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum parceiro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParceiros.map(parceiro => {
            const isExpanded = expandedId === parceiro.id;
            const cfg = statusConfig[parceiro.status] || statusConfig.pendente;
            const StatusIcon = cfg.icon;
            const isLoading = actionLoading === parceiro.id;

            return (
              <div
                key={parceiro.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-extrabold text-slate-500">
                        {parceiro.nome_curto.substring(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-slate-900">{parceiro.nome}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                        {parceiro.auth_ativo && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold">
                            AUTH ✓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {parceiro.auth_email && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {parceiro.auth_email}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-300" />
                          {parceiro.disciplinas.map(d => (
                            <span key={d} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-semibold">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Activate/Deactivate */}
                    <button
                      onClick={() => toggleAuth(parceiro)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        parceiro.auth_ativo
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {isLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : parceiro.auth_ativo ? (
                        <><ShieldOff className="w-3.5 h-3.5" /> Desativar</>
                      ) : (
                        <><Shield className="w-3.5 h-3.5" /> Ativar</>
                      )}
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : parceiro.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                      <Detail label="NIPC" value={parceiro.nipc} />
                      <Detail label="Email" value={parceiro.email} />
                      <Detail label="Telefone" value={parceiro.telefone} />
                      <Detail label="Contacto operacional" value={parceiro.contacto_operacional} />
                      <Detail
                        label="Data de adesão"
                        value={parceiro.data_adesao
                          ? new Date(parceiro.data_adesao).toLocaleDateString('pt-PT')
                          : null}
                      />
                      <Detail
                        label="Custo/h sénior (seco)"
                        value={parceiro.custo_hora_seco_senior
                          ? `€${parceiro.custo_hora_seco_senior.toFixed(2)}`
                          : null}
                      />
                      <Detail
                        label="Custo/h pleno (seco)"
                        value={parceiro.custo_hora_seco_pleno
                          ? `€${parceiro.custo_hora_seco_pleno.toFixed(2)}`
                          : null}
                      />
                      <Detail label="Auth email" value={parceiro.auth_email} />
                    </div>
                    {parceiro.notas && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Notas</span>
                        <p className="text-xs text-slate-600">{parceiro.notas}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{label}</span>
    <span className="text-sm text-slate-700">{value || '—'}</span>
  </div>
);

export default AdminParceiros;
