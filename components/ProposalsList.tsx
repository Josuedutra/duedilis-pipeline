
import React, { useState } from 'react';
import { Proposta, EstadoProposta } from '../types';
import { Search, Plus, Filter, Eye, Edit2, Trash2, FileJson } from 'lucide-react';
import { formatCurrency, ESTADO_LABELS, PLATAFORMA_LABELS, TIPO_SERVICO_LABELS } from '../constants';

interface ProposalsListProps {
  proposals: Proposta[];
  onSelect: (id: string) => void;
  onImport: () => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ProposalsList: React.FC<ProposalsListProps> = ({ proposals, onSelect, onImport, onNew, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');

  const filtered = proposals.filter(p => {
    const matchesSearch = p.referencia_concurso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.entidade_contratante.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.objeto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = estadoFilter === 'todos' || p.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Propostas</h1>
          <p className="text-slate-500">Gestão e acompanhamento do pipeline.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onImport}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <FileJson size={20} className="text-blue-600" />
            <span>Importar JSON</span>
          </button>
          <button
            onClick={onNew}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por referência, entidade ou objeto..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="todos">Todos os Estados</option>
            {Object.entries(ESTADO_LABELS).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Referência</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Entidade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prazo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                 const diff = new Date(p.data_limite_submissao).getTime() - Date.now();
                 const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                 const isUrgent = p.estado === EstadoProposta.PREPARACAO && days < 3;

                 return (
                  <tr key={p.id} onClick={() => onSelect(p.id)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.referencia_concurso}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{PLATAFORMA_LABELS[p.plataforma]}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 max-w-[200px] truncate">{p.entidade_contratante}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-slate-900">
                      {formatCurrency(p.valor_proposto)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ESTADO_LABELS[p.estado].color}`}>
                        {ESTADO_LABELS[p.estado].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-sm ${isUrgent ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {p.data_limite_submissao ? new Date(p.data_limite_submissao).toLocaleDateString('pt-PT') : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onSelect(p.id); }} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(p.id); }} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProposalsList;
