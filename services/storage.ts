
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

  // Whitelist de campos permitidos na BD (baseado em Types.ts)
  const VALID_KEYS = [
    'id', 'referencia_concurso', 'objeto', 'entidade_contratante', 'nif_entidade', 'plataforma',
    'tipo_servico', 'local_execucao', 'valor_base_edital', 'valor_obra', 'valor_proposto',
    'custos_diretos', 'custos_diretos_percentual', 'custos_indiretos_percentual', 'margem_percentual',
    'competitividade_percentual', 'data_limite_submissao', 'data_submissao_real',
    'data_abertura_propostas', 'data_adjudicacao', 'prazo_execucao_meses', 'prazo_obra_meses',
    'equipa_resumo', 'num_tecnicos', 'criterio_tipo', 'preco_peso_percentual',
    'qualidade_peso_percentual', 'estado', 'valor_adjudicado', 'entidade_adjud_nome',
    'nosso_ranking', 'num_concorrentes', 'desvio_percentual', 'pdf_analise', 'pdf_orcamento',
    'pdf_proposta', 'pdf_ata_abertura', 'pdf_relatorio_final', 'tags', 'observacoes',
    'alerta_prazo', 'created_at', 'updated_at', 'created_by'
  ];

  const sanitizedProposal: any = {};
  Object.keys(cleanProposal).forEach(key => {
    if (VALID_KEYS.includes(key)) {
      sanitizedProposal[key] = (cleanProposal as any)[key];
    }
  });

  const { error } = await supabase
    .from('propostas')
    .upsert(sanitizedProposal);

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
