
import { createClient } from '@supabase/supabase-js';
import { Proposta } from '../types';

const SUPABASE_URL = 'https://kacvbdaparhqmellkebp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_y_pCKxpPI5MWAao80n9CYg_tvCxP4UD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getProposals = async (): Promise<Proposta[]> => {
  const { data, error } = await supabase
    .from('propostas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Proposta[]) || [];
};

export const saveProposal = async (proposal: Proposta): Promise<void> => {
  const { error } = await supabase
    .from('propostas')
    .upsert({ 
      ...proposal, 
      updated_at: new Date().toISOString() 
    });

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
  if (!data || data.length === 0) throw new Error('Eliminação recusada por políticas de segurança.');
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

/**
 * Procura os custos de RH de referência no Supabase
 */
export const getRhCosts = async () => {
  const { data, error } = await supabase.from('custos_rh').select('*');
  if (error) throw error;
  return data;
};

/**
 * Procura os fatores regionais no Supabase
 */
export const getRegionalFactors = async () => {
  const { data, error } = await supabase.from('fatores_regionais').select('*');
  if (error) throw error;
  return data;
};

/**
 * Upload de documentos para o Supabase Storage
 */
export const uploadFile = async (proposalId: string, file: File, type: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${proposalId}/${type}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('documentos')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
