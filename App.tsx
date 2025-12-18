
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
import { Loader2, ShieldAlert, AlertCircle, Copy, Check, Trash2, X } from 'lucide-react';

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
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const refreshProposals = async () => {
    setIsLoading(true);
    try {
      const data = await getProposals();
      setProposals(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('custos_diretos_percentual')) {
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
      const isNew = !data.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
      const proposalToSave = {
        ...data,
        id: isNew ? generateUUID() : data.id,
        estado: data.estado || EstadoProposta.PREPARACAO,
        updated_at: new Date().toISOString(),
      } as Proposta;

      await saveProposal(proposalToSave);
      await refreshProposals();
      setIsFormOpen(false);
      setIsImportModalOpen(false);
      
      // Atualiza a proposta selecionada para refletir os cálculos imediatos
      if (selectedProposal && selectedProposal.id === proposalToSave.id) {
        setSelectedProposal(proposalToSave);
      } else {
        setSelectedProposal(proposalToSave);
        setCurrentPage('detalhes');
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
    setError(null);
    const originalProposals = [...proposals];
    
    setProposals(prev => prev.filter(p => p.id !== id));
    if (selectedProposal?.id === id) {
      setSelectedProposal(null);
      setCurrentPage('propostas');
    }
    setConfirmDeleteId(null);

    try {
      await deleteProposal(id);
    } catch (err: any) {
      setProposals(originalProposals);
      setError(err.message);
      setShowSqlHint(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmDeleteId(id);
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
      setError('Erro ao carregar proposta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveProposal = async (id: string, newState: EstadoProposta) => {
    setIsLoading(true);
    try {
      const proposal = proposals.find(p => p.id === id);
      if (!proposal) return;
      const updatedProposal = { ...proposal, estado: newState, updated_at: new Date().toISOString() };
      await saveProposal(updatedProposal);
      await refreshProposals();
    } catch (err: any) {
      setError('Erro ao mover: ' + err.message);
      setShowSqlHint(true);
    } finally {
      setIsLoading(false);
    }
  };

  // SCRIPT ATUALIZADO COM A COLUNA EM FALTA
  const SQL_SCRIPT = `-- SCRIPT DE REPARAÇÃO DE BASE DE DADOS (DUEDILIS)
-- Execute este script no SQL EDITOR do Supabase para adicionar a coluna necessária.

-- 1. Adicionar coluna para percentagem de custos diretos
ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS custos_diretos_percentual NUMERIC DEFAULT 0;

-- 2. Garantir que as políticas de acesso estão corretas
DROP POLICY IF EXISTS "ACESSO_TOTAL_PUBLICO_V1" ON propostas;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ACESSO_TOTAL_PUBLICO_V1" 
ON propostas 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 3. Dar permissões totais aos utilizadores
GRANT ALL ON TABLE propostas TO anon;
GRANT ALL ON TABLE propostas TO authenticated;

-- 4. Recarregar cache de esquema
NOTIFY pgrst, 'reload schema';`;

  return (
    <Layout 
      currentPage={currentPage === 'detalhes' ? 'propostas' : currentPage} 
      onNavigate={(p) => {
        if (p === 'dashboard' || p === 'propostas' || p === 'kanban') refreshProposals();
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
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 mb-2">Confirmar Eliminação?</h3>
            <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
              Esta ação é irreversível. Todos os dados associados a esta proposta serão removidos permanentemente.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => executeDelete(confirmDeleteId)}
                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
              >
                Eliminar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {(error || showSqlHint) && (
        <div className="mb-8 p-8 bg-red-950 text-white rounded-[2.5rem] border border-red-800 shadow-2xl">
           <div className="flex items-center space-x-4 mb-6">
             <div className="p-3 bg-red-600 rounded-2xl">
               <ShieldAlert size={30} />
             </div>
             <div>
               <h3 className="text-2xl font-black uppercase">Erro de Sincronização</h3>
               <p className="text-red-200 text-sm">Ocorreu um erro ao comunicar com a base de dados (Coluna em falta).</p>
             </div>
           </div>
           <div className="bg-black/30 p-4 rounded-xl mb-6 font-mono text-xs text-red-200 border border-red-800/50">
             {error}
           </div>
           <div className="relative">
             <pre className="bg-black/60 p-6 rounded-2xl text-[11px] font-mono text-blue-300 overflow-x-auto max-h-64 no-scrollbar">
               {SQL_SCRIPT}
             </pre>
             <button onClick={() => { navigator.clipboard.writeText(SQL_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-4 right-4 flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black uppercase">
               {copied ? <Check size={16} /> : <Copy size={16} />}
               <span>{copied ? 'Copiado' : 'Copiar Script'}</span>
             </button>
           </div>
           <div className="mt-6 flex justify-end">
             <button onClick={() => { setError(null); setShowSqlHint(false); }} className="text-xs font-bold text-red-400 hover:text-white flex items-center space-x-2">
               <X size={14} />
               <span>Fechar Aviso</span>
             </button>
           </div>
        </div>
      )}

      {currentPage === 'dashboard' && <Dashboard proposals={proposals} onSelect={handleSelect} />}
      {currentPage === 'propostas' && (
        <ProposalsList 
          proposals={proposals} 
          onSelect={handleSelect} 
          onImport={() => setIsImportModalOpen(true)}
          onNew={() => { setEditingProposal(null); setIsFormOpen(true); }}
          onDelete={handleDeleteRequest}
        />
      )}
      {currentPage === 'kanban' && (
        <KanbanBoard proposals={proposals} onMoveProposal={handleMoveProposal} onSelect={handleSelect} onDelete={handleDeleteRequest} />
      )}
      {currentPage === 'detalhes' && selectedProposal && (
        <ProposalDetails 
          proposal={selectedProposal} 
          onBack={() => setCurrentPage('propostas')} 
          onDelete={handleDeleteRequest} 
          onEdit={() => { setEditingProposal(selectedProposal); setIsFormOpen(true); }} 
        />
      )}

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={handleSaveProposal} />
      <ProposalForm isOpen={isFormOpen} proposal={editingProposal} onClose={() => { setIsFormOpen(false); setEditingProposal(null); }} onSave={handleSaveProposal} />
    </Layout>
  );
};

export default App;
