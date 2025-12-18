
import { Proposta, EstadoProposta, Plataforma, TipoServico, CriterioTipo } from '../types';

export const parseSkillJson = (jsonStr: string): Partial<Proposta> => {
  try {
    const data = JSON.parse(jsonStr);
    
    let base: Partial<Proposta> = {
      estado: EstadoProposta.PREPARACAO,
      tags: [],
      observacoes: '',
      created_by: 'system'
    };

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
        // Ao importar, definimos percentagens padrão seguras em vez de valores absolutos fixos
        custos_diretos_percentual: 5, 
        custos_indiretos_percentual: o.custos_indiretos?.percentual || 12,
        margem_percentual: o.margem?.percentual || 15,
        valor_proposto: proposedValue,
        competitividade_percentual: o.competitividade?.percentual_face_base || 0
      };
    }

    return base;
  } catch (e) {
    throw new Error('Formato JSON inválido.');
  }
};
