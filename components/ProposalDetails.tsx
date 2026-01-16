
import React, { useState, useRef, useEffect } from 'react';
import { Proposta, EquipaMembro } from '../types';
import {
  ArrowLeft, Edit2, Trash2, MapPin, Building2, Briefcase,
  DollarSign, Users, Clock, FileText, CheckCircle2,
  ExternalLink, Loader2, Gavel, FileCheck,
  Sparkles, ShieldAlert, Target, FileWarning, TrendingDown,
  BarChart3, Calculator, Info, UploadCloud, CheckCircle, AlertTriangle, ClipboardList
} from 'lucide-react';
import { formatCurrency, ESTADO_LABELS } from '../constants';
import { uploadFile, saveProposal, getRhCosts, getRegionalFactors } from '../services/storage';
import { analyzeProposal, AIAnalysisResult } from '../services/ai';
import { parseBudgetJson } from '../services/importer';

interface ProposalDetailsProps {
  proposal: Proposta;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  onImportBudget: (id: string, file: File) => void;
}

const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposal, onBack, onDelete, onEdit, onImportBudget }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'docs' | 'finance' | 'ai'>('info');
  const [currentProposal, setCurrentProposal] = useState<Proposta>(proposal);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [refCosts, setRefCosts] = useState<any[]>([]);
  const [factors, setFactors] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);
  const [targetDocType, setTargetDocType] = useState<string | null>(null);

  useEffect(() => {
    setCurrentProposal(proposal);
  }, [proposal]);

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [costs, facts] = await Promise.all([getRhCosts(), getRegionalFactors()]);
        setRefCosts(costs);
        setFactors(facts);
      } catch (err) {
        console.error("Erro ao carregar referências:", err);
      } finally {
        setIsLoadingRef(false);
      }
    };
    loadRefData();
  }, []);

  const getActiveFactor = () => {
    const local = currentProposal.local_execucao?.toLowerCase() || '';
    if (local.includes('lisboa')) return factors.find(f => f.regiao.includes('Lisboa'))?.fator || 1.2;
    if (local.includes('porto')) return factors.find(f => f.regiao.includes('Porto'))?.fator || 1.0;
    if (local.includes('algarve')) return factors.find(f => f.regiao.includes('Algarve'))?.fator || 1.05;
    if (local.includes('alentejo') || local.includes('guarda')) return factors.find(f => f.regiao.includes('Interior'))?.fator || 0.88;
    return 1.0;
  };

  const getBaseMonthlyCost = (m: EquipaMembro) => {
    if (m.custo_mensal && m.custo_mensal > 0) return m.custo_mensal;
    const cargoLower = m.cargo.toLowerCase();
    const factor = getActiveFactor();
    const match = refCosts.find(rc =>
      cargoLower.includes(rc.funcao.toLowerCase()) ||
      cargoLower.includes(rc.codigo.toLowerCase())
    );
    return match ? Number(match.custo_mensal_empresa) * factor : 0;
  };

  // --- LÓGICA FINANCEIRA REATIVADA E CONSOLIDADA ---

  // 1. Custo Total RH considerando Alocação e Prazo
  // Fórmula: SUM( Custo_Mensal * (Alocação / 100) * Prazo_Meses )
  const rhTotalCost = (currentProposal.equipa_resumo || []).reduce((acc, m) => {
    const baseCost = getBaseMonthlyCost(m);
    const allocation = (m.dedicacao_percentual || 0) / 100;
    const projectMonths = currentProposal.prazo_execucao_meses || 0;
    const allocatedMonthly = baseCost * allocation;
    return acc + (allocatedMonthly * projectMonths);
  }, 0);

  const directPercent = currentProposal.custos_diretos_percentual ?? 0;
  const otherDirectCostsCalculated = rhTotalCost * (directPercent / 100);

  const indirectPercent = currentProposal.custos_indiretos_percentual ?? 12;
  const indirectCostsTotal = (rhTotalCost + otherDirectCostsCalculated) * (indirectPercent / 100);

  const totalInvestment = rhTotalCost + otherDirectCostsCalculated + indirectCostsTotal;
  const proposedValue = currentProposal.valor_proposto || 0;
  const grossProfit = proposedValue - totalInvestment;
  const realMarginPercent = proposedValue > 0 ? (grossProfit / proposedValue) * 100 : 0;
  const expectedMarginPercent = currentProposal.margem_percentual || 15;

  const competitiveness = (proposedValue > 0 && currentProposal.valor_base_edital > 0)
    ? ((1 - (proposedValue / currentProposal.valor_base_edital)) * 100)
    : 0;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !targetDocType) return;
    try {
      const publicUrl = await uploadFile(currentProposal.id, file, targetDocType);
      const updatedProposal = { ...currentProposal, [targetDocType]: publicUrl, updated_at: new Date().toISOString() };
      await saveProposal(updatedProposal);
      setCurrentProposal(updatedProposal);
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    }
  };

  const handleBudgetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Delegar para o App.tsx via prop e aguardar conclusão
      await onImportBudget(currentProposal.id, file);
      alert('Orçamento importado com sucesso!');
      // A atualização do prop 'proposal' irá disparar o useEffect acima
    } catch (err) {
      alert('Erro ao importar: ' + (err as Error).message);
    }

    // Limpar input
    if (budgetInputRef.current) budgetInputRef.current.value = '';
  };

  const handleRunAI = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeProposal(currentProposal);
      setAiResult(result);
      setActiveTab('ai');
    } catch (err) {
      alert("Erro ao analisar com IA: " + (err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: any; label: string; icon?: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
        }`}
    >
      {Icon && <Icon size={16} />}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
      <input type="file" ref={budgetInputRef} className="hidden" accept=".json" onChange={handleBudgetUpload} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-500 hover:text-blue-600 hover:shadow-md transition-all">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{currentProposal.referencia_concurso}</h1>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${ESTADO_LABELS[currentProposal.estado].color}`}>
                {ESTADO_LABELS[currentProposal.estado].label}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium line-clamp-1">{currentProposal.objeto}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => budgetInputRef.current?.click()} className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
            <UploadCloud size={18} />
            <span>Importar Orçamento</span>
          </button>
          <button onClick={handleRunAI} disabled={isAnalyzing} className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 shadow-xl">
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-blue-400" />}
            <span>Análise IA</span>
          </button>
          <button onClick={onEdit} className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50"><Edit2 size={18} /></button>
          <button onClick={() => onDelete(currentProposal.id)} className="p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-2xl hover:bg-red-100"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
          <TabButton id="info" label="Informação" />
          <TabButton id="ai" label="Inteligência IA" icon={Sparkles} />
          <TabButton id="docs" label="Documentos" icon={FileText} />
          <TabButton id="finance" label="Financeiro" icon={DollarSign} />
        </div>

        <div className="p-10">
          {activeTab === 'info' && (<>
            {/* RELATÓRIO DE DECISÃO (Header) */}
            {proposal.relatorio_decisao && (
              <div className={`p-6 rounded-2xl border ${proposal.relatorio_decisao.decisao.tipo === 'ADJUDICADO' ? 'bg-emerald-50 border-emerald-100' :
                proposal.relatorio_decisao.decisao.tipo === 'DECLINADO' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList className={
                        proposal.relatorio_decisao.decisao.tipo === 'ADJUDICADO' ? 'text-emerald-600' :
                          proposal.relatorio_decisao.decisao.tipo === 'DECLINADO' ? 'text-red-600' : 'text-slate-600'
                      } size={20} />
                      <h3 className={`text-lg font-bold ${proposal.relatorio_decisao.decisao.tipo === 'ADJUDICADO' ? 'text-emerald-800' :
                        proposal.relatorio_decisao.decisao.tipo === 'DECLINADO' ? 'text-red-800' : 'text-slate-800'
                        }`}>
                        Relatório de Decisão: {proposal.relatorio_decisao.decisao.tipo}
                      </h3>
                    </div>
                    <div className="text-sm opacity-75 ml-7">
                      Decidido por <strong>{proposal.relatorio_decisao.decisao.decidido_por}</strong> em {new Date(proposal.relatorio_decisao.decisao.data_decisao).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                  {proposal.relatorio_decisao.decisao.tipo === 'ADJUDICADO' ? <CheckCircle className="text-emerald-600" size={28} /> : <AlertTriangle className="text-red-600" size={28} />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-1">
                  {(proposal.relatorio_decisao.motivos_recusa?.length || 0) > 0 && (
                    <div className="bg-white/60 p-4 rounded-xl border border-white/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-70 flex items-center gap-2">
                        <FileWarning size={14} /> Motivos da Decisão
                      </h4>
                      <ul className="space-y-2">
                        {proposal.relatorio_decisao.motivos_recusa?.map((m, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(proposal.relatorio_decisao.licoes_aprendidas?.length || 0) > 0 && (
                    <div className="bg-white/60 p-4 rounded-xl border border-white/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-70 flex items-center gap-2">
                        <Sparkles size={14} /> Lições Aprendidas
                      </h4>
                      <ul className="space-y-2">
                        {proposal.relatorio_decisao.licoes_aprendidas?.map((l, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span>{l}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {proposal.relatorio_decisao.proximos_passos && (
                  <div className="mt-4 pt-4 border-t border-black/5 ml-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Próximos Passos</h4>
                    <p className="text-sm font-medium">{proposal.relatorio_decisao.proximos_passos}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in duration-300">

              {/* LEFT COLUMN: Equipa & Dependências */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2"><Users size={16} /><span>Equipa Técnica</span></h3>
                <div className="space-y-3">
                  {currentProposal.equipa_resumo?.map((m, i) => {
                    const baseCost = getBaseMonthlyCost(m);
                    const alloc = m.dedicacao_percentual || 0;
                    const allocatedMonthly = baseCost * (alloc / 100);

                    return (
                      <div key={i} className="flex justify-between items-start p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all relative overflow-hidden">
                        {m.partilhado && (
                          <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-xl">
                            Partilhado
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate" title={m.cargo}>{m.cargo}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-md font-black">{alloc}% Aloc.</span>
                            {m.qtd && m.qtd > 1 && <span className="text-[9px] text-slate-500 font-bold">x{m.qtd}</span>}
                          </div>
                          {m.nota && <p className="text-[10px] text-slate-400 mt-1.5 italic">"{m.nota}"</p>}
                        </div>
                        <div className="text-right ml-4 pt-1">
                          <p className="font-black text-sm text-slate-900">{formatCurrency(allocatedMonthly)}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">/ mês</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dependência Lote */}
                {currentProposal.dependencia_lote && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700 mb-2"><AlertTriangle size={14} /> Dependência</h4>
                    <p className="text-sm font-medium text-amber-900">Esta proposta depende da adjudicação de: <strong>{currentProposal.dependencia_lote}</strong></p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMNS (Span 2): Project Data & Finance */}
              <div className="lg:col-span-2 space-y-8">

                {/* 1. Project Header Info (Entidade, Prazos) */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Entidade</p>
                    <p className="text-xs font-bold text-slate-900 line-clamp-2" title={currentProposal.entidade_contratante}>{currentProposal.entidade_contratante}</p>
                    {currentProposal.nif_entidade && <p className="text-[10px] text-slate-500 font-mono mt-1">NIF: {currentProposal.nif_entidade}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Critério</p>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{currentProposal.criterio_tipo === 'multifator' ? 'Multifator' : 'Monofator'}</span>
                      {currentProposal.criterio_tipo === 'multifator' && (
                        <span className="text-[9px] text-slate-500 font-medium">
                          Preço {currentProposal.preco_peso_percentual}% / Qual. {currentProposal.qualidade_peso_percentual}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Prazos</p>
                    <p className="text-xs font-bold text-slate-900 mb-0.5">{currentProposal.prazo_execucao_meses} Meses Execução</p>
                    {currentProposal.data_limite_submissao && <p className="text-[10px] text-red-600 font-medium truncate">Entrega: {new Date(currentProposal.data_limite_submissao).toLocaleDateString()}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Plataforma</p>
                    <p className="text-xs font-bold text-slate-900 lowercase first-letter:uppercase">{currentProposal.plataforma}</p>
                  </div>
                </div>

                {/* 2. Financeiro (Updated to use JSON or Calculation) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2"><Calculator size={16} /><span>Resumo Financeiro</span></h3>
                    {currentProposal.cenario_usado && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase">{currentProposal.cenario_usado}</span>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Valor Base</p>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(currentProposal.valor_base_edital)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Custos Totais</p>
                      {/* Use JSON value if exists, else calculation */}
                      <p className="text-sm font-bold text-slate-700">
                        {formatCurrency(
                          currentProposal.orcamento?.base_calculo || totalInvestment
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {/* If JSON has Margem value directly */}
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Valor Proposto</p>
                      <p className="text-sm font-bold text-blue-600">
                        {formatCurrency(
                          currentProposal.valor_proposto || (currentProposal.orcamento?.margem_valor ? (currentProposal.orcamento.base_calculo + currentProposal.orcamento.margem_valor) : proposedValue)
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Rentabilidade</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${(currentProposal.orcamento?.margem_percentual || realMarginPercent) < 5 ? 'text-red-500' : 'text-emerald-500'
                          }`}>
                          {(currentProposal.orcamento?.margem_percentual || realMarginPercent).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Otimizações & Requisitos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Otimizações */}
                  {currentProposal.otimizacoes_aplicadas && currentProposal.otimizacoes_aplicadas.length > 0 && (
                    <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 mb-3"><Sparkles size={14} /> Otimizações Aplicadas</h4>
                      <ul className="space-y-2">
                        {currentProposal.otimizacoes_aplicadas.map((opt, i) => (
                          <li key={i} className="text-xs font-medium text-emerald-900 flex items-start gap-2 text-justify">
                            <CheckCircle size={14} className="mt-0.5 shrink-0 opacity-50" />
                            <span>{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Requisitos */}
                  {currentProposal.requisitos_validar && currentProposal.requisitos_validar.length > 0 && (
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase text-blue-700 mb-3"><ClipboardList size={14} /> Requisitos a Validar</h4>
                      <ul className="space-y-2">
                        {currentProposal.requisitos_validar.map((req, i) => (
                          <li key={i} className="text-xs font-medium text-blue-900 flex items-start gap-2 text-justify">
                            <Target size={14} className="mt-0.5 shrink-0 opacity-50" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {currentProposal.observacoes && (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Observações</p>
                    <p className="text-sm text-slate-700 italic">"{currentProposal.observacoes}"</p>
                  </div>
                )}

              </div>
            </div>
          </>)}


          {activeTab === 'finance' && (
            <div className="space-y-10 animate-in fade-in duration-300">

              {/* --- SECTION: Orçamento (Fase 2) --- */}
              {currentProposal.orcamento_detalhado && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                      <Calculator size={20} className="text-emerald-500" />
                      <span>Orçamento Detalhado (Lotes)</span>
                    </h4>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                      Data Cálculo: {new Date(currentProposal.orcamento_detalhado.data_calculo).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Lote</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4 text-right">Valor Base</th>
                            <th className="px-6 py-4 text-right">Custo Total</th>
                            <th className="px-6 py-4 text-center">Gap (%)</th>
                            <th className="px-6 py-4 text-center">Viabilidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentProposal.orcamento_detalhado.lotes.map((l, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-bold text-slate-900">{l.lote}</td>
                              <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={l.descricao}>{l.descricao}</td>
                              <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(l.preco_base_eur)}</td>
                              <td className="px-6 py-4 text-right font-medium text-blue-600">{formatCurrency(l.base_custo_eur)}</td>
                              <td className={`px-6 py-4 text-center font-bold ${l.gap_vs_preco_base_pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {l.gap_vs_preco_base_pct.toFixed(1)}%
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black tracking-wide ${l.gap_vs_preco_base_pct < 0 ? 'bg-red-100 text-red-700' :
                                  l.viabilidade === 'RISCO' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                  {l.gap_vs_preco_base_pct < 0 ? 'CRÍTICO' : l.viabilidade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-slate-900 text-white p-6 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Gap (Valor Base vs Custo)</p>
                        <p className={`text-3xl font-black ${currentProposal.orcamento_detalhado.total.gap_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {currentProposal.orcamento_detalhado.total.gap_pct.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-medium italic">
                          {formatCurrency(currentProposal.orcamento_detalhado.total.gap_eur)}
                        </p>
                      </div>
                      {currentProposal.orcamento_detalhado.alertas && (
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                          <h5 className="text-[10px] font-black uppercase text-amber-800 mb-3 flex items-center space-x-1">
                            <FileWarning size={14} /> <span>Alertas Críticos</span>
                          </h5>
                          <ul className="space-y-2">
                            {currentProposal.orcamento_detalhado.alertas.slice(0, 3).map((a, i) => (
                              <li key={i} className="text-xs font-bold text-amber-700 leading-snug">• {a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}


              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center space-x-2">
                    <BarChart3 size={14} className="text-blue-600" />
                    <span>KPIs de Performance</span>
                  </h4>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Competitividade</span>
                        <span className="text-sm font-black text-slate-900">{competitiveness.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full">
                        <div className={`h-full rounded-full bg-green-500`} style={{ width: `${Math.min(competitiveness, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Break-even</p>
                        <p className="text-xs font-black text-slate-900">{formatCurrency(totalInvestment)}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Alvo</p>
                        <p className="text-xs font-black text-slate-900">{expectedMarginPercent}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingDown size={100} /></div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Efficiency Rating</h4>
                  <p className="text-2xl font-black italic">
                    {realMarginPercent > 10 ? 'ESTRUTURA SAUDÁVEL' : 'MARGEM CRÍTICA'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {
            activeTab === 'ai' && (
              <div className="animate-in fade-in duration-500">
                {aiResult ? (
                  <div className="space-y-8">
                    {aiResult.financial_warning && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-800">
                        <FileWarning size={20} className="shrink-0" />
                        <p className="text-sm font-bold">{aiResult.financial_warning}</p>
                      </div>
                    )}
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                      <h3 className="text-2xl font-black mb-4 flex items-center space-x-3 tracking-tight italic">
                        <Sparkles className="text-blue-400" />
                        <span>Análise IA</span>
                      </h3>
                      <p className="text-slate-300 leading-relaxed text-lg">{aiResult.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                        <h4 className="font-black text-red-800 uppercase text-xs mb-6 flex items-center space-x-2"><ShieldAlert size={16} /><span>Riscos</span></h4>
                        <ul className="space-y-4">
                          {aiResult.risks.map((r, i) => <li key={i} className="text-red-900 text-sm font-medium">• {r}</li>)}
                        </ul>
                      </div>
                      <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100">
                        <h4 className="font-black text-green-800 uppercase text-xs mb-6 flex items-center space-x-2"><Target size={16} /><span>Pontos Fortes</span></h4>
                        <ul className="space-y-4">
                          {aiResult.strengths.map((s, i) => <li key={i} className="text-green-900 text-sm font-medium">• {s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <button onClick={handleRunAI} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Analisar com IA</button>
                  </div>
                )}
              </div>
            )
          }

          {
            activeTab === 'docs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                {[
                  { name: 'Análise do Edital', type: 'pdf_analise', icon: FileText, desc: 'Análise técnica de requisitos.' },
                  { name: 'Cálculo de Orçamento', type: 'pdf_orcamento', icon: Briefcase, desc: 'Folha de cálculo Skill/Excel.' },
                  { name: 'Proposta Técnica', type: 'pdf_proposta', icon: CheckCircle2, desc: 'Ficheiro final submetido.' },
                  { name: 'Ata de Abertura', type: 'pdf_ata_abertura', icon: Gavel, desc: 'Documento público de concorrência.' },
                  { name: 'Relatório Final', type: 'pdf_relatorio_final', icon: FileCheck, desc: 'Relatório de adjudicação.' }
                ].map((doc) => {
                  const fileUrl = (currentProposal as any)[doc.type];
                  return (
                    <div key={doc.type} className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${fileUrl ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 border-dashed'}`}>
                      <div className="flex items-start justify-between mb-8">
                        <div className={`p-4 rounded-2xl ${fileUrl ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <doc.icon size={28} />
                        </div>
                        {fileUrl && <a href={fileUrl} target="_blank" className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all"><ExternalLink size={18} /></a>}
                      </div>
                      <h4 className="font-black text-slate-900 text-lg mb-1">{doc.name}</h4>
                      <p className="text-xs text-slate-500 mb-8">{doc.desc}</p>
                      <button onClick={() => { setTargetDocType(doc.type); fileInputRef.current?.click(); }} className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
                        {fileUrl ? 'Substituir PDF' : 'Carregar PDF'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div >
      </div >
    </div >
  );
};

export default ProposalDetails;
