
import { createClient } from '@supabase/supabase-js';
import { Proposta } from '../types';

const SUPABASE_URL = 'https://kacvbdaparhqmellkebp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y_pCKxpPI5MWAao80n9CYg_tvCxP4UD';

// Inicialização singleton para evitar múltiplas instâncias em produção
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const getProposals = async (): Promise<Proposta[]> => {
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro Supabase:", error.message);
    throw new Error(error.message);
  }
  return (data as Proposta[]) || [];
};

export const saveProposal = async (proposal: Proposta): Promise<void> => {
  // Garantimos que campos numéricos são tratados corretamente
  const cleanProposal = {
    ...proposal,
    valor_proposto: Number(proposal.valor_proposto) || 0,
    valor_base_edital: Number(proposal.valor_base_edital) || 0,
    prazo_execucao_meses: Number(proposal.prazo_execucao_meses) || 0,
    updated_at: new Date().toISOString()
  };

  // Remover campo 'alertas' que pode vir do JSON mas não existe na BD
  if ('alertas' in cleanProposal) {
    delete (cleanProposal as any).alertas;
  }

  const { error } = await supabase
    .from('propostas')
    .upsert(cleanProposal);

  if (error) throw new Error(error.message);
};

export const deleteProposal = async (id: string): Promise<void> => {
  if (!id) throw new Error('ID inválido');

  const { data, error } = await supabase
    .from('propostas')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Eliminação recusada ou registo não encontrado.');
};

export const getProposalById = async (id: string): Promise<Proposta | undefined> => {
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return undefined;
  return data as Proposta;
};

export const getRhCosts = async () => {
  const { data, error } = await supabase.from('custos_rh').select('*');
  if (error) return [];
  return data;
};

export const getRegionalFactors = async () => {
  const { data, error } = await supabase.from('fatores_regionais').select('*');
  if (error) return [];
  return data;
};

export const uploadFile = async (proposalId: string, file: File, type: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${proposalId}/${type}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('documentos')
    .getPublicUrl(fileName);

  return data.publicUrl;
};
