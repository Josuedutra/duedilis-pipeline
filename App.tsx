
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProposalsList from './components/ProposalsList';
import ProposalDetails from './components/ProposalDetails';
import ImportModal from './components/ImportModal';
import ProposalForm from './components/ProposalForm';
import KanbanBoard from './components/KanbanBoard';
import { Proposta, EstadoProposta } from './types';
import { getProposals, saveProposal, deleteProposal, getProposalById } from './services/storage';
import { parseBudgetJson, parseDecisionJson } from './services/importer';
import { Loader2, ShieldAlert, Copy, Check, X } from 'lucide-react';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'propostas' | 'detalhes' | 'kanban'>('dashboard');
  const [proposals, setProposals] = useState<Proposta[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposta | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSqlHint, setShowSqlHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const generateUUID = () => {
    return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  const refreshProposals = async () => {
    setIsLoading(true);
    try {
      const data = await getProposals();
      setProposals(data || []);
      setError(null);
      setShowSqlHint(false);
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('column') || err.message.includes('relation')) {
        setShowSqlHint(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProposals();
  }, []);

  const handleSaveProposal = async (data: Partial<Proposta>) => {
    setIsLoading(true);
    try {
      const proposalToSave = {
        ...data,
        id: data.id || generateUUID(),
        estado: data.estado || EstadoProposta.PREPARACAO,
        updated_at: new Date().toISOString(),
        created_at: data.created_at || new Date().toISOString(),
      } as Proposta;

      await saveProposal(proposalToSave);
      await refreshProposals();
      setIsFormOpen(false);
      setIsImportModalOpen(false);

      if (selectedProposal && selectedProposal.id === proposalToSave.id) {
        setSelectedProposal(proposalToSave);
      } else if (!editingProposal) {
        handleSelect(proposalToSave.id);
      }
    } catch (err: any) {
      setError("Erro ao guardar: " + err.message);
      setShowSqlHint(true);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteProposal(id);
      setProposals(prev => prev.filter(p => p.id !== id));
      if (selectedProposal?.id === id) {
        setSelectedProposal(null);
        setCurrentPage('propostas');
      }
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError("Erro ao eliminar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setIsLoading(true);
    try {
      const proposal = await getProposalById(id);
      if (proposal) {
        setSelectedProposal(proposal);
        setCurrentPage('detalhes');
      }
    } catch (err: any) {
      setError('Erro ao carregar detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveProposal = async (id: string, newState: EstadoProposta) => {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    try {
      const updated = { ...proposal, estado: newState };
      await saveProposal(updated);
      setProposals(prev => prev.map(p => p.id === id ? updated : p));
    } catch (err: any) {
      setError('Erro ao mover proposta: ' + err.message);
    }
  };

  const handleImportBudget = async (id: string, file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const budgetData = parseBudgetJson(text);

      const proposal = proposals.find(p => p.id === id);
      if (!proposal) throw new Error('Proposta não encontrada');

      const updated = {
        ...proposal,
        orcamento_detalhado: budgetData,
        updated_at: new Date().toISOString()
      };

      await saveProposal(updated);
      setProposals(prev => prev.map(p => p.id === id ? updated : p));

      // Update selected if needed
      if (selectedProposal?.id === id) {
        setSelectedProposal(updated);
      }
    } catch (err: any) {
      setError('Erro ao importar orçamento: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDecision = async (id: string, file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const decisionData = parseDecisionJson(text);

      const proposal = proposals.find(p => p.id === id);
      if (!proposal) throw new Error('Proposta não encontrada');

      // Mapear estado do JSON para Enum se possível
      let novoEstado = proposal.estado;
      if (decisionData.decisao.tipo === 'DECLINADO') novoEstado = EstadoProposta.NAO_ADJUDICADA;
      else if (decisionData.decisao.tipo === 'ADJUDICADO') novoEstado = EstadoProposta.ADJUDICADA;

      const updated = {
        ...proposal,
        relatorio_decisao: decisionData,
        estado: novoEstado,
        updated_at: new Date().toISOString()
      };

      await saveProposal(updated);
      setProposals(prev => prev.map(p => p.id === id ? updated : p));

      if (selectedProposal?.id === id) setSelectedProposal(updated);
    } catch (err: any) {
      setError('Erro ao importar decisão: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const SQL_SCRIPT = `-- SCRIPT DE REPARAÇÃO DE BASE DE DADOS (DUEDILIS)
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS custos_diretos_percentual NUMERIC DEFAULT 5;
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS local_execucao TEXT;
NOTIFY pgrst, 'reload schema';`;

  return (
    <Layout
      currentPage={currentPage === 'detalhes' ? 'propostas' : currentPage}
      onNavigate={(p) => {
        if (p !== 'detalhes') refreshProposals();
        setCurrentPage(p as any);
      }}
    >
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-black text-center mb-2 text-slate-900">Confirmar Eliminação?</h3>
            <p className="text-slate-500 text-center text-sm mb-8">Esta ação é irreversível.</p>
            <div className="flex space-x-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Cancelar</button>
              <button onClick={() => executeDelete(confirmDeleteId)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showSqlHint && (
        <div className="mb-8 p-6 bg-red-950 text-white rounded-[2rem] border border-red-800 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-4 mb-4">
            <ShieldAlert className="text-red-500" size={24} />
            <div>
              <h3 className="font-black uppercase text-sm">Atualização da Base de Dados Necessária</h3>
              {error && <p className="text-xs font-mono text-pink-300 mt-1">{error}</p>}
            </div>
          </div>
          <div className="relative">
            <pre className="bg-black/40 p-4 rounded-xl text-[10px] font-mono text-blue-300 overflow-x-auto mb-4">{SQL_SCRIPT}</pre>
            <button
              onClick={() => { navigator.clipboard.writeText(SQL_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-[10px] font-black uppercase"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiado' : 'Copiar Script SQL'}</span>
            </button>
          </div>
          <button onClick={() => setShowSqlHint(false)} className="mt-2 text-[10px] text-red-400 hover:text-white uppercase font-bold tracking-widest flex items-center space-x-1">
            <X size={12} /> <span>Ignorar por agora</span>
          </button>
        </div>
      )}

      {currentPage === 'dashboard' && <Dashboard proposals={proposals} onSelect={handleSelect} />}
      {currentPage === 'propostas' && (
        <ProposalsList
          proposals={proposals}
          onSelect={handleSelect}
          onImport={() => setIsImportModalOpen(true)}
          onImportBudget={handleImportBudget}
          onImportDecision={handleImportDecision}
          onNew={() => { setEditingProposal(null); setIsFormOpen(true); }}
          onDelete={setConfirmDeleteId}
        />
      )}
      {currentPage === 'kanban' && (
        <KanbanBoard proposals={proposals} onMoveProposal={handleMoveProposal} onSelect={handleSelect} onDelete={setConfirmDeleteId} />
      )}
      {currentPage === 'detalhes' && selectedProposal && (
        <ProposalDetails
          proposal={selectedProposal}
          onBack={() => setCurrentPage('propostas')}
          onDelete={setConfirmDeleteId}
          onEdit={() => { setEditingProposal(selectedProposal); setIsFormOpen(true); }}
          onImportBudget={handleImportBudget}
        />
      )}

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={handleSaveProposal} />
      <ProposalForm isOpen={isFormOpen} proposal={editingProposal} onClose={() => { setIsFormOpen(false); setEditingProposal(null); }} onSave={handleSaveProposal} />
    </Layout>
  );
};

export default App;
