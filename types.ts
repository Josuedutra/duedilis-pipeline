
export enum Plataforma {
  ANOGOV = 'anogov',
  VORTAL = 'vortal',
  ACINGOV = 'acingov',
  VORTALGOV = 'vortalgov',
  SAPHETYGOV = 'saphetygov',
  GATEWIT = 'gatewit',
  OUTROS = 'outros'
}

export enum TipoServico {
  FISCALIZACAO = 'fiscalizacao',
  CSO = 'cso',
  FISCALIZACAO_CSO = 'fiscalizacao_cso',
  DIRECAO_OBRA = 'direcao_obra',
  COORDENACAO_OBRA = 'coordenacao_obra'
}

export enum EstadoProposta {
  PREPARACAO = 'preparacao',
  SUBMETIDA = 'submetida',
  EM_ANALISE = 'em_analise',
  ADJUDICADA = 'adjudicada',
  NAO_ADJUDICADA = 'nao_adjudicada',
  CANCELADA = 'cancelada'
}

export enum CriterioTipo {
  MONOFATOR = 'monofator',
  MULTIFATOR = 'multifator'
}

export interface EquipaMembro {
  cargo: string;
  dedicacao_percentual: number;
  custo_mensal?: number;
}

export interface Proposta {
  id: string;
  referencia_concurso: string;
  objeto: string;
  entidade_contratante: string;
  nif_entidade: string;
  plataforma: Plataforma;
  tipo_servico: TipoServico;
  local_execucao: string;

  valor_base_edital: number;
  valor_obra?: number;
  valor_proposto: number;
  custos_diretos: number; // Valor absoluto (legado/fallback)
  custos_diretos_percentual?: number; // Nova regra: % sobre RH
  custos_indiretos_percentual: number;
  margem_percentual: number;
  competitividade_percentual: number;

  data_limite_submissao: string;
  data_submissao_real?: string;
  data_abertura_propostas?: string;
  data_adjudicacao?: string;
  prazo_execucao_meses: number;
  prazo_obra_meses?: number;

  equipa_resumo: EquipaMembro[];
  num_tecnicos: number;

  criterio_tipo: CriterioTipo;
  preco_peso_percentual?: number;
  qualidade_peso_percentual?: number;

  estado: EstadoProposta;

  valor_adjudicado?: number;
  entidade_adjud_nome?: string; // Corrigido de entidade_adjudicada para evitar confusão
  nosso_ranking?: number;
  num_concorrentes?: number;
  desvio_percentual?: number;

  pdf_analise?: string;
  pdf_orcamento?: string;
  pdf_proposta?: string;
  pdf_ata_abertura?: string;
  pdf_relatorio_final?: string;

  tags: string[];
  observacoes: string;
  alerta_prazo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;

// --- FASE 3: RELATÓRIO DE DECISÃO ---
export interface DecisaoInfo {
  tipo: string;
  data_decisao: string;
  decidido_por: string;
}

export interface AnaliseRealizada {
  fase_1: boolean;
  fase_2: boolean;
  fase_3: boolean;
  cenario_analisado: string;
  custo_real_estimado_eur: number;
  gap_vs_preco_base_eur: number;
  gap_vs_preco_base_pct: number;
}

export interface RelatorioDecisao {
  decisao: DecisaoInfo;
  motivos_recusa?: string[];
  licoes_aprendidas?: string[];
  proximos_passos?: string;
  analise_realizada?: AnaliseRealizada;
}

export interface Proposta {
  id: string;
  referencia_concurso: string;
  objeto: string;
  entidade_contratante: string;
  nif_entidade: string;
  plataforma: Plataforma;
  tipo_servico: TipoServico;
  local_execucao: string;
  valor_base_edital: number;
  valor_obra?: number;
  prazo_execucao_meses: number;
  prazo_obra_meses?: number;
  data_limite_submissao: string;
  criterio_tipo: CriterioTipo;
  preco_peso_percentual?: number;
  qualidade_peso_percentual?: number;
  equipa_resumo?: EquipaMembro[];
  num_tecnicos?: number;
  custos_diretos_percentual?: number;
  custos_indiretos_percentual?: number;
  margem_percentual?: number;
  valor_proposto?: number;
  competitividade_percentual?: number;
  estado: EstadoProposta;
  tags: string[];
  observacoes: string;
  pdf_analise?: string;
  pdf_orcamento?: string;
  pdf_proposta?: string;
  pdf_ata_abertura?: string;
  pdf_relatorio_final?: string;
  orcamento_detalhado?: OrcamentoDetalhado;
  relatorio_decisao?: RelatorioDecisao;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Lote {
  lote: string;
  descricao: string;
  preco_base_eur: number;
  custos_diretos_equipa_eur: number;
  outros_custos_diretos_eur: number;
  total_custos_diretos_eur: number;
  custos_indiretos_pct: number;
  custos_indiretos_eur: number;
  base_custo_eur: number;
  gap_vs_preco_base_eur: number;
  gap_vs_preco_base_pct: number;
  viabilidade: 'VIAVEL' | 'INVIAVEL' | 'RISCO';
}

export interface OrcamentoTotal {
  preco_base_eur: number;
  custo_real_eur: number;
  gap_eur: number;
  gap_pct: number;
}

export interface OrcamentoDetalhado {
  fase: number;
  data_calculo: string;
  lotes: Lote[];
  total: OrcamentoTotal;
  recomendacao?: string;
  alertas?: string[];
}
