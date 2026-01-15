
import React, { useState } from 'react';
import { Proposta, EstadoProposta } from '../types';
import { ESTADO_LABELS, formatCurrency } from '../constants';
import { Building2, GripVertical, AlertCircle, Clock, Trash2, XCircle, CheckCircle2 } from 'lucide-react';

interface KanbanBoardProps {
  proposals: Proposta[];
  onMoveProposal: (id: string, newState: EstadoProposta) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ proposals, onMoveProposal, onSelect, onDelete }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Lista explícita de todos os 6 estados na ordem correta do ciclo de vida
  const states = [
    EstadoProposta.PREPARACAO,
    EstadoProposta.SUBMETIDA,
    EstadoProposta.EM_ANALISE,
    EstadoProposta.ADJUDICADA,
    EstadoProposta.NAO_ADJUDICADA,
    EstadoProposta.CANCELADA
  ];

  const getProposalsByState = (state: EstadoProposta) => 
    proposals.filter(p => p.estado === state);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('proposalId', id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedId(null);
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newState: EstadoProposta) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('proposalId');
    if (id) {
      onMoveProposal(id, newState);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] overflow-x-auto pb-8 animate-in fade-in duration-500 custom-scrollbar">
      <div className="flex space-x-6 h-full min-w-max pr-12 pl-1">
        {states.map((state) => {
          const columnProposals = getProposalsByState(state);
          const { label, color } = ESTADO_LABELS[state];
          const isClosedState = state === EstadoProposta.ADJUDICADA || state === EstadoProposta.NAO_ADJUDICADA || state === EstadoProposta.CANCELADA;
          
          return (
            <div
              key={state}
              className={`w-72 flex flex-col rounded-[2.5rem] border p-5 transition-all shadow-sm ${
                isClosedState ? 'bg-slate-50/70 border-slate-200/50' : 'bg-slate-100/40 border-slate-200/40'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, state)}
            >
              <div className="flex items-center justify-between mb-6 px-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-3 h-3 rounded-full ${color.split(' ')[0]} shadow-md shadow-current/30`}></div>
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">{label}</h3>
                </div>
                <span className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-slate-400 border border-slate-100 shadow-sm">
                  {columnProposals.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
                {columnProposals.map((p) => {
                  const diff = p.data_limite_submissao ? new Date(p.data_limite_submissao).getTime() - Date.now() : 0;
                  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  const isUrgent = p.estado === EstadoProposta.PREPARACAO && days < 3;
                  const isWon = p.estado === EstadoProposta.ADJUDICADA;
                  const isLost = p.estado === EstadoProposta.NAO_ADJUDICADA;

                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelect(p.id)}
                      className={`bg-white p-5 rounded-[1.8rem] border shadow-sm hover:shadow-2xl hover:border-blue-400 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden ${
                        draggedId === p.id ? 'opacity-0' : 'opacity-100'
                      } ${isWon ? 'border-green-200 bg-green-50/20' : isLost ? 'border-red-200 bg-red-50/20' : 'border-slate-100'}`}
                    >
                      {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                      {isWon && <CheckCircle2 className="absolute top-4 right-4 text-green-500/10" size={56} />}
                      {isLost && <XCircle className="absolute top-4 right-4 text-red-500/10" size={56} />}

                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="text-[11px] font-black text-blue-600 tracking-tight">{p.referencia_concurso}</span>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          <GripVertical size={14} className="text-slate-300 group-hover:text-slate-400" />
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-5 group-hover:text-blue-700 transition-colors relative z-10">
                        {p.objeto}
                      </h4>

                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center text-[11px] text-slate-500 font-bold italic">
                          <Building2 size={13} className="mr-2 text-slate-400" />
                          <span className="truncate">{p.entidade_contratante}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Valor</span>
                            <span className="text-xs font-black text-slate-900">{formatCurrency(p.valor_proposto)}</span>
                          </div>
                          
                          <div className={`flex flex-col items-end ${isUrgent ? 'text-red-600' : 'text-slate-500'}`}>
                            <div className="flex items-center space-x-1">
                              {isUrgent ? <AlertCircle size={12} /> : <Clock size={12} />}
                              <span className="text-[9px] uppercase font-black tracking-widest">Prazo</span>
                            </div>
                            <span className="text-xs font-black">{isNaN(days) ? '-' : `${days}d`}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnProposals.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center bg-white/30 group hover:bg-white/50 transition-all">
                    <span className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Sem Items</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
          margin: 0 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default KanbanBoard;
