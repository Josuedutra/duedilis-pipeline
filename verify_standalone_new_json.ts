
// --- COPY OF TYPES (Simplified) ---
enum Plataforma {
    ANOGOV = 'anogov',
    VORTAL = 'vortal',
    ACINGOV = 'acingov',
    VORTALGOV = 'vortalgov',
    SAPHETYGOV = 'saphetygov',
    GATEWIT = 'gatewit',
    OUTROS = 'outros'
}

enum TipoServico {
    FISCALIZACAO = 'fiscalizacao',
    CSO = 'cso',
    FISCALIZACAO_CSO = 'fiscalizacao_cso',
    DIRECAO_OBRA = 'direcao_obra',
    COORDENACAO_OBRA = 'coordenacao_obra'
}

enum EstadoProposta {
    PREPARACAO = 'preparacao',
    SUBMETIDA = 'submetida',
    EM_ANALISE = 'em_analise',
    ADJUDICADA = 'adjudicada',
    NAO_ADJUDICADA = 'nao_adjudicada',
    CANCELADA = 'cancelada'
}

enum CriterioTipo {
    MONOFATOR = 'monofator',
    MULTIFATOR = 'multifator'
}

// --- COPY OF IMPORTER LOGIC ---
const parseSkillJson = (jsonStr: string): any => {
    try {
        const data = JSON.parse(jsonStr);
        const isNested = 'concurso' in data;

        let base: any = {
            estado: EstadoProposta.PREPARACAO,
            tags: [],
            observacoes: '',
            created_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (isNested) {
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
            };
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
            base = {
                ...base,
                ...data,
                referencia_concurso: data.referencia_concurso || data.referencia || '',
                objeto: data.objeto || data.designacao || '',
                entidade_contratante: data.entidade_contratante || data.entidade || '',
                equipa_resumo: Array.isArray(data.equipa_resumo) ? data.equipa_resumo : [],
                num_tecnicos: typeof data.num_tecnicos === 'number' ? data.num_tecnicos : (Array.isArray(data.equipa_resumo) ? data.equipa_resumo.length : 0),
            };
        }
        return base;
    } catch (e) {
        throw new Error('Formato JSON inválido.');
    }
};

// --- TEST CASE ---
const sectionedJson = `{
  "metadata": {
    "versao_template": "1.0",
    "data_analise": "2026-01-15",
    "analisado_por": "Claude AI"
  },
  "identificacao": {
    "referencia_concurso": "CPI/10/2025_41043/25-LOT1",
    "designacao_anogov": "Anúncio de procedimento n.º 480/2026",
    "referencia_interna": "PROP-2026-PTM-001",
    "objeto": "Fiscalização, Gestão da Qualidade, Coordenação de Segurança e Gestão Ambiental da Empreitada de Construção de 204 Fogos - Bairro Coca Maravilhas, Portimão",
    "tipo_servico": "fiscalizacao_cso"
  },
  "entidade": {
    "entidade_contratante": "Município de Portimão",
    "nif_entidade": "505309939",
    "morada_entidade": "Praça 1.º de Maio, 8500-543 Portimão",
    "plataforma": "acingov",
    "url_plataforma": "https://www.acingov.pt",
    "local_execucao": "Bairro Coca Maravilhas, Portimão, Algarve"
  },
  "valores_prazos": {
    "valor_base": 210000.00,
    "valor_obra": null,
    "iva_percentual": 23,
    "duracao_meses": 18,
    "prazo_obra_meses": 18,
    "data_limite_proposta": "2026-02-08T17:00:00",
    "validade_proposta_dias": 180,
    "caucao_exigida": false,
    "caucao_percentual": null,
    "propostas_variantes": false,
    "fase_negociacao": false,
    "publicacao_joue": true
  },
  "criterio_adjudicacao": {
    "tipo": "multifator",
    "preco_peso": 70,
    "qualidade_peso": 30,
    "subfatores": []
  },
  "requisitos_equipe": [
    {
      "cargo": "Coordenador de Fiscalização",
      "horas_mes": 176,
      "dedicacao_percentual": 100
    }
  ],
  "areas_funcionais": [],
  "calendario_pagamentos": [],
  "enquadramento_legal": {},
  "alertas": [
    "ALTO: Critério MULTIFATOR - Preço 70%, Experiência Equipa 30%"
  ],
  "recomendacoes": [
    "Selecionar Coordenador com 7+ projetos"
  ],
  "notas": "Lote 1 de 2 lotes.",
  "confianca_analise": 0.95
}`;

try {
    const result = parseSkillJson(sectionedJson);
    console.log('✅ Sectioned JSON Parsed Successfully!');
    console.log('--- Extracted Data ---');
    console.log('Referencia:', result.referencia_concurso);
    console.log('Entidade:', result.entidade_contratante);
    console.log('Valor Base:', result.valor_base_edital);
    console.log('Obs (Has Notes?):', result.observacoes?.includes('Lote 1'));
    console.log('Obs (Has Alerts?):', result.observacoes?.includes('ALTO:'));
    console.log('Obs (Has Recs?):', result.observacoes?.includes('Selecionar Coordenador'));
} catch (e) {
    console.error('❌ Parse Failed:', e);
}
