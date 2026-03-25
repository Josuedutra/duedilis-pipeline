import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../services/storage';

/* ───────────────────────────────────────────────────────
   AuthGate — email-only auth against `parceiros` table
   No passwords, no Supabase Auth, no JWT.
   Session stored in localStorage.
   ─────────────────────────────────────────────────────── */

const ADMIN_EMAILS = ['josue@duedilis.pt', 'duediliscde@gmail.com'];
const SESSION_KEY = 'duedilis_session';

export type UserRole = 'admin' | 'parceiro';

export interface Session {
  parceiro_id: string;
  nome: string;
  nome_curto: string;
  disciplinas: string[];
  tipo: UserRole;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string; pendente?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Session;
        if (parsed.parceiro_id && parsed.tipo) {
          setSession(parsed);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const login = async (email: string): Promise<{ success: boolean; error?: string; pendente?: boolean }> => {
    const normalised = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from('parceiros')
      .select('id, nome, nome_curto, disciplinas, status, auth_ativo')
      .eq('auth_email', normalised)
      .single();

    if (error || !data) {
      return { success: false, error: 'not_found' };
    }

    if (!data.auth_ativo) {
      return { success: false, pendente: true };
    }

    const isAdmin =
      data.nome_curto === 'Duedilis' || ADMIN_EMAILS.includes(normalised);

    const newSession: Session = {
      parceiro_id: data.id,
      nome: data.nome,
      nome_curto: data.nome_curto,
      disciplinas: data.disciplinas || [],
      tipo: isAdmin ? 'admin' : 'parceiro',
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
