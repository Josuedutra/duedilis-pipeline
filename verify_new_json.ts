
import { parseSkillJson } from './services/importer';

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
    console.log('Obs (Alerts included?):', result.observacoes?.includes('ALTO: Critério MULTIFATOR'));
    console.log('Recomendacoes included?', result.observacoes?.includes('Selecionar Coordenador'));
} catch (e) {
    console.error('❌ Parse Failed:', e);
}
