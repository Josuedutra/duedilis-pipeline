
import { Proposta, EstadoProposta, Plataforma, TipoServico, CriterioTipo } from '../types';

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
