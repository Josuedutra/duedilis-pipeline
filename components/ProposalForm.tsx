
import React, { useState, useEffect } from 'react';
import { X, Save, Briefcase, Users, Plus, Trash2, Euro, Info, Layers } from 'lucide-react';
import { Proposta, EstadoProposta, Plataforma, TipoServico, EquipaMembro } from '../types';
import { getRhCosts, getRegionalFactors } from '../services/storage';
import { isTrackB, TIPO_SERVICO_LABELS } from '../constants';

interface ProposalFormProps {
  proposal?: Proposta | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Proposta>) => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ proposal, isOpen, onClose, onSave }) => {
  const [refCosts, setRefCosts] = useState<any[]>([]);
  const [factors, setFactors] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Proposta>>({
    referencia_concurso: '',
    objeto: '',
    entidade_contratante: '',
    nif_entidade: '',
    plataforma: Plataforma.OUTROS,
    tipo_servico: TipoServico.FISCALIZACAO,
    estado: EstadoProposta.PREPARACAO,
    track: 'A',
    modelo_execucao: 'interno',
    valor_base_edital: 0,
    valor_proposto: 0,
    custos_diretos_percentual: 5,
    custos_indiretos_percentual: 12,
    margem_percentual: 15,
    markup_percentual: 30,
    fee_duedilis_percentual: 12,
    prazo_execucao_meses: 0,
    local_execucao: '',
    equipa_resumo: [],
    num_tecnicos: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadReferences();
    }
  }, [isOpen]);

  const loadReferences = async () => {
    setIsLoadingRef(true);
    try {
      const [c, f] = await Promise.all([getRhCosts(), getRegionalFactors()]);
      setRefCosts(c);
      setFactors(f);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRef(false);
    }
  };

  useEffect(() => {
    if (proposal && isOpen) {
      setFormData({
        ...proposal,
        data_limite_submissao: proposal.data_limite_submissao ? new Date(proposal.data_limite_submissao).toISOString().split('T')[0] : '',
        equipa_resumo: proposal.equipa_resumo || [],
      });
    } else if (isOpen) {
      setFormData({
        referencia_concurso: '',
        objeto: '',
        entidade_contratante: '',
        nif_entidade: '',
        plataforma: Plataforma.OUTROS,
        tipo_servico: TipoServico.FISCALIZACAO,
        estado: EstadoProposta.PREPARACAO,
        valor_base_edital: 0,
        valor_proposto: 0,
        custos_diretos_percentual: 5,
        custos_indiretos_percentual: 12,
        margem_percentual: 15,
        data_limite_submissao: new Date().toISOString().split('T')[0],
        prazo_execucao_meses: 0,
        local_execucao: '',
        equipa_resumo: [],
        num_tecnicos: 0
      });
    }
  }, [proposal, isOpen]);

  const suggestCost = (cargo: string) => {
    if (!cargo || refCosts.length === 0) return 0;
    const local = formData.local_execucao?.toLowerCase() || '';
    let factor = 1.0;
    if (local.includes('lisboa')) factor = 1.2;
    else if (local.includes('algarve')) factor = 1.05;
    else if (local.includes('alentejo')) factor = 0.88;

    const match = refCosts.find(rc => 
      cargo.toLowerCase().includes(rc.funcao.toLowerCase()) || 
      cargo.toLowerCase().includes(rc.codigo.toLowerCase())
    );
    return match ? Number(match.custo_mensal_empresa) * factor : 0;
  };

  const addMembro = () => {
    const novaEquipa = [...(formData.equipa_resumo || []), { cargo: '', dedicacao_percentual: 100, custo_mensal: 0 }];
    setFormData({ ...formData, equipa_resumo: novaEquipa, num_tecnicos: novaEquipa.length });
  };

  const updateMembro = (index: number, field: keyof EquipaMembro, value: any) => {
    const novaEquipa = [...(formData.equipa_resumo || [])];
    novaEquipa[index] = { ...novaEquipa[index], [field]: value };
    if (field === 'cargo' && (novaEquipa[index].custo_mensal || 0) === 0) {
      const suggested = suggestCost(value);
      if (suggested > 0) novaEquipa[index].custo_mensal = suggested;
    }
    setFormData({ ...formData, equipa_resumo: novaEquipa });
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-8 border-b bg-slate-50/30">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic flex items-center space-x-3">
             <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
             <span>{proposal ? 'Editar Proposta' : 'Nova Proposta'}</span>
          </h2>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl"><X size={24} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center space-x-2"><Briefcase size={14} /><span>Dados do Projeto</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1"><label className={labelClass}>Referência</label><input type="text" required className={inputClass} value={formData.referencia_concurso} onChange={e => setFormData({...formData, referencia_concurso: e.target.value})} /></div>
              <div className="lg:col-span-3"><label className={labelClass}>Objeto</label><input type="text" required className={inputClass} value={formData.objeto} onChange={e => setFormData({...formData, objeto: e.target.value})} /></div>
              <div className="lg:col-span-2"><label className={labelClass}>Local</label><input type="text" className={inputClass} value={formData.local_execucao} onChange={e => setFormData({...formData, local_execucao: e.target.value})} /></div>
              <div><label className={labelClass}>Prazo (Meses)</label><input type="number" className={inputClass} value={formData.prazo_execucao_meses} onChange={e => setFormData({...formData, prazo_execucao_meses: parseInt(e.target.value) || 0})} /></div>
              <div>
                <label className={labelClass}>Tipo de Serviço</label>
                <select className={inputClass} value={formData.tipo_servico} onChange={e => {
                  const tipo = e.target.value as TipoServico;
                  const track = isTrackB(tipo) ? 'B' : 'A';
                  const modelo = track === 'B' ? 'consorcio' as const : 'interno' as const;
                  setFormData({...formData, tipo_servico: tipo, track, modelo_execucao: modelo});
                }}>
                  <optgroup label="Track A — Fiscalização">
                    <option value={TipoServico.FISCALIZACAO}>{TIPO_SERVICO_LABELS[TipoServico.FISCALIZACAO]}</option>
                    <option value={TipoServico.CSO}>{TIPO_SERVICO_LABELS[TipoServico.CSO]}</option>
                    <option value={TipoServico.FISCALIZACAO_CSO}>{TIPO_SERVICO_LABELS[TipoServico.FISCALIZACAO_CSO]}</option>
                    <option value={TipoServico.DIRECAO_OBRA}>{TIPO_SERVICO_LABELS[TipoServico.DIRECAO_OBRA]}</option>
                    <option value={TipoServico.COORDENACAO_OBRA}>{TIPO_SERVICO_LABELS[TipoServico.COORDENACAO_OBRA]}</option>
                  </optgroup>
                  <optgroup label="Track B — Projetos / Consórcio">
                    <option value={TipoServico.PROJETO_ARQUITETURA}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_ARQUITETURA]}</option>
                    <option value={TipoServico.PROJETO_PAISAGISMO}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_PAISAGISMO]}</option>
                    <option value={TipoServico.PROJETO_ARQUITETURA_ESPECIALIDADES}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_ARQUITETURA_ESPECIALIDADES]}</option>
                    <option value={TipoServico.PROJETO_PAISAGISMO_ESPECIALIDADES}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_PAISAGISMO_ESPECIALIDADES]}</option>
                    <option value={TipoServico.PROJETO_ESPECIALIDADES}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_ESPECIALIDADES]}</option>
                    <option value={TipoServico.PROJETO_OUTRO}>{TIPO_SERVICO_LABELS[TipoServico.PROJETO_OUTRO]}</option>
                  </optgroup>
                </select>
              </div>
            </div>
            {formData.track === 'B' && (
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center space-x-2 mb-3">
                  <Layers size={14} className="text-purple-600" />
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Consórcio — Track B</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Categoria Obra</label>
                    <select className={inputClass} value={formData.categoria_obra || ''} onChange={e => setFormData({...formData, categoria_obra: e.target.value as any})}>
                      <option value="">Selecionar...</option>
                      <option value="urbanizacao">Urbanização (×1,00)</option>
                      <option value="obras_novas">Obras Novas (×1,10)</option>
                      <option value="reabilitacao">Reabilitação (×1,20)</option>
                      <option value="acompanhamento">Acompanhamento (×0,85)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Markup (%)</label>
                    <select className={inputClass} value={formData.markup_percentual || 30} onChange={e => setFormData({...formData, markup_percentual: parseInt(e.target.value)})}>
                      <option value="30">30% — Default</option>
                      <option value="45">45% — Moderado</option>
                      <option value="50">50% — Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Fee Duedilis (%)</label>
                    <input type="number" step="1" className={inputClass} value={formData.fee_duedilis_percentual || 12} onChange={e => setFormData({...formData, fee_duedilis_percentual: parseInt(e.target.value) || 12})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center space-x-2"><Euro size={14} /><span>Orçamentação e Estrutura</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div><label className={labelClass}>Preço Venda (€)</label><input type="number" step="0.01" className={inputClass} value={formData.valor_proposto} onChange={e => setFormData({...formData, valor_proposto: parseFloat(e.target.value) || 0})} /></div>
              <div>
                <label className={labelClass}>% Outros Diretos (sobre RH)</label>
                <input type="number" step="0.1" className={inputClass} value={formData.custos_diretos_percentual} onChange={e => setFormData({...formData, custos_diretos_percentual: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className={labelClass}>% Indiretos (Overhead)</label>
                <input type="number" step="0.1" className={inputClass} value={formData.custos_indiretos_percentual} onChange={e => setFormData({...formData, custos_indiretos_percentual: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className={labelClass}>% Margem Alvo (%)</label>
                <input type="number" step="0.1" className={inputClass} value={formData.margem_percentual} onChange={e => setFormData({...formData, margem_percentual: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center space-x-2"><Users size={14} /><span>Equipa Técnica</span></h3>
              <button type="button" onClick={addMembro} className="text-blue-600 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[10px] font-black uppercase flex items-center space-x-2"><Plus size={14} /> <span>Adicionar</span></button>
            </div>
            <div className="space-y-4">
              {formData.equipa_resumo?.map((membro, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="md:col-span-5"><label className={labelClass}>Cargo</label><input type="text" className={inputClass} value={membro.cargo} onChange={e => updateMembro(index, 'cargo', e.target.value)} /></div>
                  <div className="md:col-span-3"><label className={labelClass}>Custo/Mês (€)</label><input type="number" className={inputClass} value={membro.custo_mensal} onChange={e => updateMembro(index, 'custo_mensal', parseFloat(e.target.value) || 0)} /></div>
                  <div className="md:col-span-3"><label className={labelClass}>Dedicacão (%)</label><input type="number" className={inputClass} value={membro.dedicacao_percentual} onChange={e => updateMembro(index, 'dedicacao_percentual', parseInt(e.target.value) || 0)} /></div>
                  <div className="md:col-span-1 flex justify-center pb-1"><button type="button" onClick={() => {
                    const novaEquipa = (formData.equipa_resumo || []).filter((_, i) => i !== index);
                    setFormData({ ...formData, equipa_resumo: novaEquipa });
                  }} className="text-slate-300 hover:text-red-500"><Trash2 size={20} /></button></div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="p-10 border-t flex justify-end space-x-4 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-10 py-4 text-slate-600 font-black uppercase text-xs rounded-2xl">Cancelar</button>
          <button onClick={() => onSave(formData)} className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-2xl hover:bg-blue-700 shadow-2xl flex items-center space-x-3">
            <Save size={20} /><span>Guardar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalForm;
