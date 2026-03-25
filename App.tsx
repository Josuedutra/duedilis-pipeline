
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthGate';
import LandingParceiro from './components/LandingParceiro';
import AgrupamentoDashboard from './components/AgrupamentoDashboard';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProposalsList from './components/ProposalsList';
import ProposalDetails from './components/ProposalDetails';
import ImportModal from './components/ImportModal';
import ProposalForm from './components/ProposalForm';
import KanbanBoard from './components/KanbanBoard';
import AdminParceiros from './components/AdminParceiros';
import { Proposta, EstadoProposta } from './types';
import { getProposals, saveProposal, deleteProposal, getProposalById } from './services/storage';
import { parseSkillJson, parseBudgetJson, parseDecisionJson } from './services/importer';
import { Loader2, ShieldAlert, Copy, Check, X } from 'lucide-react';

/* ───────────────────────────────────────────────────────
   App v2.0 — AuthProvider wrapper + existing logic intact
   
   Auth layer:
   - Not authenticated → Login (or LandingParceiro if #parceiro)
   - Admin → Full app (all existing pages + AdminParceiros)
   - Partner → AgrupamentoDashboard
   
   AdminApp preserves 100% of original App.tsx logic/props.
   ─────────────────────────────────────────────────────── */

const isParceiroRoute = (): boolean => {
  const hash = window.location.hash;
  const params = new URLSearchParams(window.location.search);
  return hash === '#parceiro' || hash.startsWith('#parceiro') || params.get('parceiro') === '1';
};

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN (root /)
// ═══════════════════════════════════════════════════════
const LoginScreen: React.FC<{ onPartnerClick: () => void }> = ({ onPartnerClick }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendente(false);
    setLoading(true);
    const result = await login(email);
    setLoading(false);
    if (result.pendente) setPendente(true);
    else if (!result.success) setError('not_found');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">Duedilis</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300/80">Pipeline Manager</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/20 p-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-1">Aceder</h2>
          <p className="text-sm text-slate-500 mb-6">Introduza o seu email para aceder ao sistema.</p>

          <form onSubmit={handleSubmit}>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); setPendente(false); }}
              placeholder="utilizador@empresa.pt"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />

            {pendente && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <strong>Candidatura pendente de aprovação.</strong> A Duedilis irá contactá-lo em breve.
              </div>
            )}

            {error === 'not_found' && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <strong>Email não registado.</strong>{' '}
                <button type="button" onClick={onPartnerClick} className="underline hover:no-underline font-semibold">
                  Aderir à rede de parceiros?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={onPartnerClick} className="text-xs text-slate-400 hover:text-purple-600 transition-colors">
              É parceiro? Aceda ao portal de agrupamentos →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// ADMIN APP — 100% of original App.tsx logic preserved
// ═══════════════════════════════════════════════════════
const AdminApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
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
      let rawData;
      try {
        rawData = JSON.parse(text);
        if (Array.isArray(rawData)) rawData = rawData[0];
      } catch (e) {
        throw new Error('JSON inválido');
      }

      const updatedProposalStr = { ...proposals.find(p => p.id === id) };
      if (!updatedProposalStr.id) throw new Error('Proposta não encontrada');

      let hasUpdates = false;
      let updates: any = {};

      try {
        const proposalUpdates = parseSkillJson(text);
        updates = { ...updates, ...proposalUpdates };
        hasUpdates = true;
      } catch (e) { console.log('Skill parse skipped'); }

      if (rawData.decisao || rawData.motivos_recusa) {
        try {
          const decisionData = parseDecisionJson(text);
          updates.relatorio_decisao = decisionData;
          if (decisionData.decisao.tipo === 'DECLINADO') updates.estado = EstadoProposta.DECLINADA;
          else if (decisionData.decisao.tipo === 'ADJUDICADO') updates.estado = EstadoProposta.ADJUDICADA;
          hasUpdates = true;
        } catch (e) { console.warn('Decision parse failed:', e); }
      }

      if (rawData.orcamento || rawData.orcamento_detalhado || rawData.lotes || rawData.resumo_custos) {
        try {
          const budgetData = parseBudgetJson(text);
          updates.orcamento_detalhado = budgetData;
          hasUpdates = true;
        } catch (e) { console.warn('Budget parse failed:', e); }
      }

      if (!hasUpdates) {
        throw new Error('O ficheiro não contém dados reconhecidos (Orçamento ou Decisão).');
      }

      const finalProposal = {
        ...updatedProposalStr,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await saveProposal(finalProposal as Proposta);
      setProposals(prev => prev.map(p => p.id === id ? finalProposal as Proposta : p));

      if (selectedProposal?.id === id) {
        setSelectedProposal(finalProposal as Proposta);
      }
    } catch (err: any) {
      setError('Erro ao importar: ' + err.message);
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
    <>
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
        {currentPage === 'parceiros' && <AdminParceiros />}

        <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={handleSaveProposal} />
        <ProposalForm isOpen={isFormOpen} proposal={editingProposal} onClose={() => { setIsFormOpen(false); setEditingProposal(null); }} onSave={handleSaveProposal} />
      </Layout>
    </>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN ROUTER — Auth state + route selection
// ═══════════════════════════════════════════════════════
const AppRoutes: React.FC = () => {
  const { session, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(isParceiroRoute());

  useEffect(() => {
    const handler = () => setShowLanding(isParceiroRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Landing page for /#parceiro
  if (showLanding && !session) {
    return (
      <LandingParceiro
        onLoginSuccess={() => {
          setShowLanding(false);
          if (window.location.hash.includes('parceiro')) window.location.hash = '';
        }}
      />
    );
  }

  // Not authenticated — root login
  if (!session) {
    return (
      <LoginScreen
        onPartnerClick={() => {
          window.location.hash = '#parceiro';
          setShowLanding(true);
        }}
      />
    );
  }

  // Partner → AgrupamentoDashboard
  if (session.tipo === 'parceiro') {
    return <AgrupamentoDashboard />;
  }

  // Admin → Full app
  return <AdminApp />;
};

// ═══════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════
const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;
