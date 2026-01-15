
import { Proposta, EstadoProposta, Plataforma, TipoServico, CriterioTipo, OrcamentoDetalhado, RelatorioDecisao } from '../types';

export const parseSkillJson = (jsonStr: string): Partial<Proposta> => {
  try {
    const data: any = JSON.parse(jsonStr);

    // Detecção: Formato Aninhado (Skill/Antigo) vs Flat (Novo/Direto)
    const isNested = 'concurso' in data;

    let base: Partial<Proposta> = {
      estado: EstadoProposta.PREPARACAO,
      tags: [],
      observacoes: '',
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isNested) {
      // --- LÓGICA ANINHADA (LEGADO) ---
      if (data.concurso) {
        const c = data.concurso;
        base = {
          ...base,
          referencia_concurso: c.referencia || '',
          objeto: c.objeto || '',
          entidade_contratante: c.entidade?.nome || '',
          nif_entidade: c.entidade?.nif || '',
          plataforma: (c.plataforma as Plataforma) || Plataforma.OUTROS,
          tipo_servico: (c.tipo_servico as TipoServico) || TipoServico.FISCALIZACAO,
          local_execucao: c.local_execucao || '',
          valor_base_edital: c.valores?.preco_base_sem_iva || 0,
          valor_obra: c.valores?.valor_obra,
          prazo_execucao_meses: c.prazos?.duracao_fiscalizacao_meses || 0,
          prazo_obra_meses: c.prazos?.prazo_obra_meses,
          data_limite_submissao: c.prazos?.data_limite_proposta || '',
          criterio_tipo: (c.criterio?.tipo as CriterioTipo) || CriterioTipo.MONOFATOR,
          preco_peso_percentual: c.criterio?.preco_peso,
          qualidade_peso_percentual: c.criterio?.qualidade_peso,
          equipa_resumo: (c.equipa_exigida || []).map((e: any) => ({
            cargo: e.cargo,
            dedicacao_percentual: e.dedicacao_percentual,
            custo_mensal: 0
          })),
          num_tecnicos: (c.equipa_exigida || []).length
        };
      }

      if (data.orcamento) {
        const o = data.orcamento;
        const proposedValue = o.valor_total_sem_iva || 0;

        base = {
          ...base,
          custos_diretos_percentual: 5,
          custos_indiretos_percentual: o.custos_indiretos?.percentual || 12,
          margem_percentual: o.margem?.percentual || 15,
          valor_proposto: proposedValue,
          competitividade_percentual: o.competitividade?.percentual_face_base || 0
        };
      }
    } else if (data.identificacao) {
      // --- LÓGICA NOVO FORMATO (SECTIONED) ---
      const i = data.identificacao;
      const e = data.entidade || {};
      const v = data.valores_prazos || {};
      const ca = data.criterio_adjudicacao || {};
      const re = data.requisitos_equipe || [];
      const alerts = data.alertas || [];
      const recs = data.recomendacoes || [];
      const notes = data.notas || '';

      // Consolidar observações
      const obsParts = [];
      if (notes) obsParts.push(`NOTAS: ${notes}`);
      if (alerts.length) obsParts.push(`\nALERTAS:\n- ${alerts.join('\n- ')}`);
      if (recs.length) obsParts.push(`\nRECOMENDAÇÕES:\n- ${recs.join('\n- ')}`);

      base = {
        ...base,
        referencia_concurso: i.referencia_concurso || i.referencia_interna || '',
        objeto: i.objeto || '',
        tipo_servico: (i.tipo_servico as TipoServico) || TipoServico.FISCALIZACAO,

        entidade_contratante: e.entidade_contratante || '',
        nif_entidade: e.nif_entidade || '',
        plataforma: (e.plataforma as Plataforma) || Plataforma.OUTROS,
        local_execucao: e.local_execucao || '',

        valor_base_edital: v.valor_base || 0,
        valor_obra: v.valor_obra,
        data_limite_submissao: v.data_limite_proposta || '',
        prazo_execucao_meses: v.duracao_meses || 0,
        prazo_obra_meses: v.prazo_obra_meses,

        criterio_tipo: (ca.tipo as CriterioTipo) || CriterioTipo.MONOFATOR,
        preco_peso_percentual: ca.preco_peso,
        qualidade_peso_percentual: ca.qualidade_peso,

        equipa_resumo: re.map((m: any) => ({
          cargo: m.cargo,
          dedicacao_percentual: m.dedicacao_percentual,
          custo_mensal: 0
        })),
        num_tecnicos: re.length,

        observacoes: obsParts.join('\n\n')
      };
    } else {
      // --- LÓGICA FLAT (NOVO) ---
      // Mapeamento direto + normalização de chaves comuns
      base = {
        ...base,
        ...data,
        // Garantir campos obrigatórios que podem ter nomes ligeiramente diferentes
        referencia_concurso: data.referencia_concurso || data.referencia || '',
        objeto: data.objeto || data.designacao || '',
        entidade_contratante: data.entidade_contratante || data.entidade || '',

        // Garantir arrays e números
        equipa_resumo: Array.isArray(data.equipa_resumo) ? data.equipa_resumo : [],
        num_tecnicos: typeof data.num_tecnicos === 'number' ? data.num_tecnicos : (Array.isArray(data.equipa_resumo) ? data.equipa_resumo.length : 0),
      };
    }

    return base;
  } catch (e) {
    throw new Error('Formato JSON inválido.');
  }
};

// --- NOVA FUNÇÃO: Parse Orçamento (Fase 2) ---

export const parseBudgetJson = (jsonStr: string): OrcamentoDetalhado => {
  try {
    const data = JSON.parse(jsonStr);

    // Validação robusta
    let root = Array.isArray(data) ? data[0] : data;

    // Tentar desenrolar wrappers comuns
    if (root.orcamento_detalhado) {
      root = root.orcamento_detalhado;
    } else if (root.data) { // Wrapper genérico
      root = root.data;
    }

    if (!root.lotes || !root.total) {
      console.error("Campos encontrados no JSON:", Object.keys(root));
      throw new Error("JSON de orçamento inválido: Campos obrigatórios 'lotes' ou 'total' não encontrados na raiz ou em 'orcamento_detalhado'.");
    }

    // Mapear para garantir tipagem limpa (whitelist implícita)
    const orcamento: OrcamentoDetalhado = {
      fase: root.fase || 2,
      data_calculo: root.data_calculo || new Date().toISOString().split('T')[0],
      lotes: (root.lotes || []).map((l: any) => ({
        lote: l.lote,
        descricao: l.descricao,
        preco_base_eur: l.preco_base_eur,
        custos_diretos_equipa_eur: l.custos_diretos_equipa_eur,
        outros_custos_diretos_eur: l.outros_custos_diretos_eur,
        total_custos_diretos_eur: l.total_custos_diretos_eur,
        custos_indiretos_pct: l.custos_indiretos_pct,
        custos_indiretos_eur: l.custos_indiretos_eur,
        base_custo_eur: l.base_custo_eur,
        gap_vs_preco_base_eur: l.gap_vs_preco_base_eur,
        gap_vs_preco_base_pct: l.gap_vs_preco_base_pct,
        viabilidade: l.viabilidade
      })),
      total: {
        preco_base_eur: root.total.preco_base_eur,
        custo_real_eur: root.total.custo_real_eur,
        gap_eur: root.total.gap_eur,
        gap_pct: root.total.gap_pct
      },
      recomendacao: root.recomendacao,
      alertas: root.alertas
    };
    return orcamento;
  } catch (e) {
    throw new Error('Erro ao ler JSON de Orçamento: ' + (e as Error).message);
  }
};

// --- FASE 3: RELATÓRIO DE DECISÃO ---

export const parseDecisionJson = (jsonStr: string): RelatorioDecisao => {
  try {
    const data = JSON.parse(jsonStr);

    // Suporte a Array (exemplo do user) ou Objeto único
    let root = Array.isArray(data) ? data[0] : data;

    // Suporte a wrappers
    if (root.relatorio_decisao) root = root.relatorio_decisao;
    else if (root.data) root = root.data;

    if (!root.decisao) {
      throw new Error("JSON Inválido: Objeto 'decisao' não encontrado.");
    }

    const relatorio: RelatorioDecisao = {
      decisao: {
        tipo: root.decisao.tipo || 'DESCONHECIDO',
        data_decisao: root.decisao.data_decisao || new Date().toISOString(),
        decidido_por: root.decisao.decidido_por || 'Sistema'
      },
      motivos_recusa: root.motivos_recusa || [],
      licoes_aprendidas: root.licoes_aprendidas || [],
      proximos_passos: root.proximos_passos || '',
      analise_realizada: root.analise_realizada ? {
        fase_1: !!root.analise_realizada.fase_1,
        fase_2: !!root.analise_realizada.fase_2,
        fase_3: !!root.analise_realizada.fase_3,
        cenario_analisado: root.analise_realizada.cenario_analisado || '',
        custo_real_estimado_eur: root.analise_realizada.custo_real_estimado_eur || 0,
        gap_vs_preco_base_eur: root.analise_realizada.gap_vs_preco_base_eur || 0,
        gap_vs_preco_base_pct: root.analise_realizada.gap_vs_preco_base_pct || 0
      } : undefined
    };

    return relatorio;
  } catch (e) {
    throw new Error('Erro ao ler JSON de Decisão: ' + (e as Error).message);
  }
};
