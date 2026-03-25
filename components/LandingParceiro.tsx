import React, { useState } from 'react';
import { useAuth } from './AuthGate';
import { supabase } from '../services/storage';
import { Building2, LogIn, UserPlus, ArrowRight, Shield, Eye, Handshake, CheckCircle2, AlertCircle, Clock, ChevronDown } from 'lucide-react';

/* ───────────────────────────────────────────────────────
   LandingParceiro — Public landing page
   Hero + tabs (Entrar / Aderir à rede)
   Standalone layout — no sidebar
   ─────────────────────────────────────────────────────── */

const DISCIPLINAS_OPTIONS = [
  'arquitetura',
  'paisagismo',
  'estruturas',
  'hidráulica',
  'eletricidade/IP',
  'ITED',
  'AVAC',
  'SCIE',
  'topografia',
  'outro',
];

interface CadastroForm {
  nome: string;
  email: string;
  disciplinas: string[];
  nipc: string;
  telefone: string;
  contacto: string;
  notas: string;
}

const INITIAL_FORM: CadastroForm = {
  nome: '',
  email: '',
  disciplinas: [],
  nipc: '',
  telefone: '',
  contacto: '',
  notas: '',
};

interface LandingParceiroProps {
  onLoginSuccess: () => void;
}

const LandingParceiro: React.FC<LandingParceiroProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [tab, setTab] = useState<'login' | 'cadastro'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPendente, setLoginPendente] = useState(false);

  const [form, setForm] = useState<CadastroForm>(INITIAL_FORM);
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroSuccess, setCadastroSuccess] = useState(false);
  const [cadastroError, setCadastroError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginPendente(false);
    setLoginLoading(true);

    const result = await login(loginEmail);
    setLoginLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else if (result.pendente) {
      setLoginPendente(true);
    } else {
      setLoginError('not_found');
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadastroError(null);
    setCadastroLoading(true);

    if (!form.nome.trim() || !form.email.trim() || form.disciplinas.length === 0) {
      setCadastroError('Preencha nome, email e pelo menos uma disciplina.');
      setCadastroLoading(false);
      return;
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('parceiros')
      .select('id')
      .eq('auth_email', form.email.trim().toLowerCase())
      .single();

    if (existing) {
      setCadastroError('Este email já está registado. Use a tab "Entrar".');
      setCadastroLoading(false);
      return;
    }

    const { error } = await supabase
      .from('parceiros')
      .insert({
        nome: form.nome.trim(),
        nome_curto: form.nome.trim().split(' ')[0],
        email: form.email.trim(),
        auth_email: form.email.trim().toLowerCase(),
        auth_ativo: false,
        status: 'pendente',
        disciplinas: form.disciplinas,
        nipc: form.nipc.trim() || null,
        telefone: form.telefone.trim() || null,
        contacto_operacional: form.contacto.trim() || null,
        notas: form.notas.trim() || null,
        data_adesao: new Date().toISOString(),
      });

    setCadastroLoading(false);

    if (error) {
      setCadastroError('Erro ao submeter. Tente novamente.');
      console.error('Cadastro error:', error);
    } else {
      setCadastroSuccess(true);
    }
  };

  const toggleDisciplina = (d: string) => {
    setForm(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(d)
        ? prev.disciplinas.filter(x => x !== d)
        : [...prev.disciplinas, d],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* ══════ HERO ══════ */}
      <div className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-6">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">Duedilis</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-300/80">
                Rede de Agrupamentos
              </span>
            </div>
          </div>

          {/* Hero content */}
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left — Value proposition */}
            <div className="pt-4">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
                Pipeline de concursos
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-teal-300">
                  do agrupamento.
                </span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-10 max-w-lg">
                Aceda em tempo real às oportunidades Track B. Acompanhe propostas, valide quotas e faça parte de uma rede curada de parceiros de projetos.
              </p>

              <div className="grid grid-cols-3 gap-6 mb-10">
                {[
                  { icon: Eye, label: 'Pipeline visível', desc: 'Concursos em tempo real' },
                  { icon: Shield, label: 'Rede curada', desc: 'Parceiros validados' },
                  { icon: Handshake, label: 'Consórcio', desc: 'Quotas transparentes' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="text-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>

              {/* Quick nav */}
              <div className="flex gap-3">
                <button
                  onClick={() => setTab('login')}
                  className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25"
                >
                  Entrar
                </button>
                <button
                  onClick={() => setTab('cadastro')}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/10 transition-all duration-200"
                >
                  Aderir à rede
                </button>
              </div>
            </div>

            {/* Right — Auth form card */}
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/20 p-8 relative">
              {/* Tab toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-8">
                <button
                  onClick={() => { setTab('login'); setCadastroSuccess(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    tab === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Entrar
                </button>
                <button
                  onClick={() => { setTab('cadastro'); setLoginError(null); setLoginPendente(false); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    tab === 'cadastro'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Aderir
                </button>
              </div>

              {/* ── LOGIN TAB ── */}
              {tab === 'login' && (
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-1">Aceder ao pipeline</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Introduza o email registado na rede Duedilis.
                  </p>
                  <form onSubmit={handleLogin}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => { setLoginEmail(e.target.value); setLoginError(null); setLoginPendente(false); }}
                      placeholder="parceiro@empresa.pt"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                    />

                    {loginPendente && (
                      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-700">
                          <strong>Candidatura pendente de aprovação.</strong>
                          <br />A Duedilis irá contactá-lo em breve.
                        </div>
                      </div>
                    )}

                    {loginError === 'not_found' && (
                      <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-700">
                          <strong>Email não registado.</strong>
                          <br />
                          <button
                            type="button"
                            onClick={() => setTab('cadastro')}
                            className="underline hover:no-underline font-semibold"
                          >
                            Quer aderir à rede?
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20"
                    >
                      {loginLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Aceder ao pipeline <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── CADASTRO TAB ── */}
              {tab === 'cadastro' && !cadastroSuccess && (
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-1">Aderir à rede</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Submeta a sua candidatura. A Duedilis analisa e contacta em 48h.
                  </p>
                  <form onSubmit={handleCadastro} className="space-y-4">
                    {/* Nome */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                        Nome da empresa *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nome}
                        onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Projétil — Projetos de Engenharia"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="contacto@empresa.pt"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
                      />
                    </div>

                    {/* Disciplinas — multi-select */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        Disciplinas *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DISCIPLINAS_OPTIONS.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDisciplina(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                              form.disciplinas.includes(d)
                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional fields toggle */}
                    <button
                      type="button"
                      onClick={() => setShowOptional(!showOptional)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                      Campos opcionais (NIPC, telefone, etc.)
                    </button>

                    {showOptional && (
                      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">NIPC</label>
                            <input
                              type="text"
                              value={form.nipc}
                              onChange={e => setForm(prev => ({ ...prev, nipc: e.target.value }))}
                              placeholder="500000000"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Telefone</label>
                            <input
                              type="tel"
                              value={form.telefone}
                              onChange={e => setForm(prev => ({ ...prev, telefone: e.target.value }))}
                              placeholder="912 345 678"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nome do contacto</label>
                          <input
                            type="text"
                            value={form.contacto}
                            onChange={e => setForm(prev => ({ ...prev, contacto: e.target.value }))}
                            placeholder="Nome do contacto operacional"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notas / Mensagem</label>
                          <textarea
                            value={form.notas}
                            onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
                            placeholder="Experiência, portfólio, motivação..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {cadastroError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-red-700">{cadastroError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={cadastroLoading}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20"
                    >
                      {cadastroLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Submeter candidatura <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── CADASTRO SUCCESS ── */}
              {tab === 'cadastro' && cadastroSuccess && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-2">Candidatura recebida!</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    A Duedilis irá contactá-lo em 48h para validação.
                  </p>
                  <button
                    onClick={() => { setCadastroSuccess(false); setForm(INITIAL_FORM); setTab('login'); }}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto px-6 py-8 mt-8">
        <div className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Duedilis — Discoverypact Lda. · NIPC 519052277
        </div>
      </div>
    </div>
  );
};

export default LandingParceiro;
