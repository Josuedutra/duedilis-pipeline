
import React, { useState, useRef, useEffect } from 'react';
import { Proposta, EquipaMembro } from '../types';
import { 
  ArrowLeft, Edit2, Trash2, MapPin, Building2, Briefcase, 
  DollarSign, Users, Clock, FileText, CheckCircle2, 
  ExternalLink, Loader2, Gavel, FileCheck,
  Sparkles, ShieldAlert, Target, FileWarning, TrendingDown,
  BarChart3, Calculator, Info
} from 'lucide-react';
import { formatCurrency, ESTADO_LABELS } from '../constants';
import { uploadFile, saveProposal, getRhCosts, getRegionalFactors } from '../services/storage';
import { analyzeProposal, AIAnalysisResult } from '../services/ai';

interface ProposalDetailsProps {
  proposal: Proposta;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposal, onBack, onDelete, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'docs' | 'finance' | 'ai'>('info');
  const [currentProposal, setCurrentProposal] = useState<Proposta>(proposal);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [refCosts, setRefCosts] = useState<any[]>([]);
  const [factors, setFactors] = useState<any[]>([]);
  const [isLoadingRef, setIsLoadingRef] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
      className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${
        activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
      }`}
    >
      {Icon && <Icon size={16} />}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />

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
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 animate-in fade-in duration-300">
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2"><Users size={16} /><span>Equipa Técnica</span></h3>
                <div className="space-y-3">
                  {currentProposal.equipa_resumo?.map((m, i) => {
                    const baseCost = getBaseMonthlyCost(m);
                    const alloc = m.dedicacao_percentual || 0;
                    const allocatedMonthly = baseCost * (alloc / 100);
                    
                    return (
                      <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{m.cargo}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-md font-black">{alloc}% Aloc.</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatCurrency(baseCost)} x {alloc}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-black text-sm text-slate-900">{formatCurrency(allocatedMonthly)}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">/ mês efetivo</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2"><Building2 size={16} /><span>Dados do Projeto</span></h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Local de Execução</p>
                      <p className="text-sm font-bold text-slate-900">{currentProposal.local_execucao || 'Nacional / Sede'}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Custo RH Total ({currentProposal.prazo_execucao_meses} meses)</p>
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(rhTotalCost)}</p>
                    </div>
                 </div>
                 <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 italic text-sm leading-relaxed">
                    "{currentProposal.objeto}"
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-10 animate-in fade-in duration-300">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><DollarSign size={160} /></div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-8 flex items-center space-x-2">
                       <Calculator size={14} />
                       <span>Estrutura Financeira Consolidada</span>
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                           <div className="flex justify-between items-baseline group">
                              <span className="text-sm text-slate-400 font-bold group-hover:text-slate-300 transition-colors">Custos Mão de Obra (RH)</span>
                              <span className="text-xl font-black">{formatCurrency(rhTotalCost)}</span>
                           </div>
                           <div className="flex justify-between items-baseline group">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-slate-400 font-bold group-hover:text-slate-300 transition-colors">Custos Diretos (Outros)</span>
                                <span className="bg-blue-600/30 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-black">{directPercent}% RH</span>
                              </div>
                              <span className="text-xl font-black">{formatCurrency(otherDirectCostsCalculated)}</span>
                           </div>
                           <div className="flex justify-between items-baseline group">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-slate-400 font-bold group-hover:text-slate-300 transition-colors">Custos Indiretos</span>
                                <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-black">{indirectPercent}%</span>
                              </div>
                              <span className="text-xl font-black">{formatCurrency(indirectCostsTotal)}</span>
                           </div>
                           <div className="pt-6 border-t border-white/10">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Custo Total de Execução</p>
                              <p className="text-3xl font-black text-white">{formatCurrency(totalInvestment)}</p>
                           </div>
                        </div>

                        <div className="flex flex-col justify-between p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Valor da Proposta (Venda)</p>
                              <p className="text-4xl font-black text-white mb-2">{formatCurrency(proposedValue)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Base Edital: {formatCurrency(currentProposal.valor_base_edital)}</p>
                           </div>
                           <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
                              <div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Resultado Bruto</p>
                                 <p className={`text-2xl font-black ${grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(grossProfit)}
                                 </p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Margem Real</p>
                                 <p className={`text-2xl font-black ${realMarginPercent >= expectedMarginPercent ? 'text-blue-400' : 'text-amber-400'}`}>
                                    {realMarginPercent.toFixed(1)}%
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

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
            </div>
          )}
          
          {activeTab === 'ai' && (
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
          )}

          {activeTab === 'docs' && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalDetails;
