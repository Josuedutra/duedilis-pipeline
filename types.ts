
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
  // Track A
  FISCALIZACAO = 'fiscalizacao',
  CSO = 'cso',
  FISCALIZACAO_CSO = 'fiscalizacao_cso',
  DIRECAO_OBRA = 'direcao_obra',
  COORDENACAO_OBRA = 'coordenacao_obra',
  // Track B
  PROJETO_ARQUITETURA = 'projeto_arquitetura',
  PROJETO_PAISAGISMO = 'projeto_paisagismo',
  PROJETO_ARQUITETURA_ESPECIALIDADES = 'projeto_arquitetura_especialidades',
  PROJETO_PAISAGISMO_ESPECIALIDADES = 'projeto_paisagismo_especialidades',
  PROJETO_ESPECIALIDADES = 'projeto_especialidades',
  PROJETO_OUTRO = 'projeto_outro'
}

export enum EstadoProposta {
  // Pré-contratuais
  PREPARACAO = 'preparacao',
  SUBMETIDA = 'submetida',
  EM_ANALISE = 'em_analise',
  ADJUDICADA = 'adjudicada',
  NAO_ADJUDICADA = 'nao_adjudicada',
  DECLINADA = 'declinada',
  CANCELADA = 'cancelada',
  // Pós-contratuais
  EM_HABILITACAO = 'em_habilitacao',
  CONTRATADA = 'contratada',
  EM_EXECUCAO = 'em_execucao',
  EM_ENCERRAMENTO = 'em_encerramento',
  CONCLUIDA = 'concluida'
}

export enum CriterioTipo {
  MONOFATOR = 'monofator',
  MULTIFATOR = 'multifator'
}

export type Track = 'A' | 'B';
export type ModeloExecucao = 'interno' | 'consorcio';
export type CategoriaObra = 'urbanizacao' | 'obras_novas' | 'reabilitacao' | 'acompanhamento';

export interface EquipaMembro {
  cargo: string;
  dedicacao_percentual: number;
  custo_mensal?: number;
  qtd?: number;
  partilhado?: boolean;
  nota?: string;
}



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

export interface OrcamentoCustos {
  [key: string]: number | undefined;
  subtotal?: number;
}

export interface OrcamentoSimples {
  custos_exclusivos: OrcamentoCustos;
  custos_partilhados: OrcamentoCustos & { proporcao_percentual?: number };
  custos_diretos_total: number;
  custos_indiretos_percentual: number;
  custos_indiretos_valor: number;
  base_calculo: number;
  margem_percentual: number;
  margem_valor: number;
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
  // Campos novos do JSON
  cenario_usado?: string;
  otimizacoes_aplicadas?: string[];
  requisitos_validar?: string[];
  dependencia_lote?: string;
  alerta_prazo?: boolean;
  orcamento?: OrcamentoSimples;
  // Track B — Consórcio
  track?: Track;
  modelo_execucao?: ModeloExecucao;
  categoria_obra?: CategoriaObra;
  markup_percentual?: number;
  markup_decisao?: string;
  fee_duedilis_percentual?: number;
  fee_duedilis_valor?: number;
  custos_comuns?: number;
  subtotal_producao_secos?: number;
  markup_valor?: number;
  producao_com_markup?: number;
  fator_complexidade?: number;
  metodo_quotas?: string;
  composicao_parceiros?: any;
  distribuicao?: any;
  tabelas_consultadas?: any;
  // Pós-adjudicação
  data_adjudicacao?: string;
  data_contrato?: string;
  data_consignacao?: string;
  data_recepcao_provisoria?: string;
  valor_adjudicado?: number;
  percentual_faturado?: number;
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
