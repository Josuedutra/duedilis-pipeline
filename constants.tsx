
import React from 'react';
import { EstadoProposta, Plataforma, TipoServico } from './types';

export const ESTADO_LABELS: Record<EstadoProposta, { label: string; color: string }> = {
  [EstadoProposta.PREPARACAO]: { label: 'Preparação', color: 'bg-yellow-100 text-yellow-800' },
  [EstadoProposta.SUBMETIDA]: { label: 'Submetida', color: 'bg-blue-100 text-blue-800' },
  [EstadoProposta.EM_ANALISE]: { label: 'Em Análise', color: 'bg-purple-100 text-purple-800' },
  [EstadoProposta.ADJUDICADA]: { label: 'Adjudicada', color: 'bg-green-100 text-green-800' },
  [EstadoProposta.NAO_ADJUDICADA]: { label: 'Não Adjudicada', color: 'bg-red-100 text-red-800' },
  [EstadoProposta.DECLINADA]: { label: 'Declinada', color: 'bg-zinc-200 text-zinc-700' },
  [EstadoProposta.CANCELADA]: { label: 'Cancelada', color: 'bg-slate-100 text-slate-800' },
  // Pós-contratuais
  [EstadoProposta.EM_HABILITACAO]: { label: 'Em Habilitação', color: 'bg-amber-100 text-amber-800' },
  [EstadoProposta.CONTRATADA]: { label: 'Contratada', color: 'bg-emerald-100 text-emerald-800' },
  [EstadoProposta.EM_EXECUCAO]: { label: 'Em Execução', color: 'bg-cyan-100 text-cyan-800' },
  [EstadoProposta.EM_ENCERRAMENTO]: { label: 'Encerramento', color: 'bg-orange-100 text-orange-800' },
  [EstadoProposta.CONCLUIDA]: { label: 'Concluída', color: 'bg-teal-100 text-teal-800' },
};

export const PLATAFORMA_LABELS: Record<Plataforma, string> = {
  [Plataforma.ANOGOV]: 'ANOGov',
  [Plataforma.VORTAL]: 'Vortal',
  [Plataforma.ACINGOV]: 'Acingov',
  [Plataforma.VORTALGOV]: 'VortalGov',
  [Plataforma.SAPHETYGOV]: 'SaphetyGov',
  [Plataforma.GATEWIT]: 'Gatewit',
  [Plataforma.OUTROS]: 'Outros',
};

export const TIPO_SERVICO_LABELS: Record<TipoServico, string> = {
  // Track A
  [TipoServico.FISCALIZACAO]: 'Fiscalização',
  [TipoServico.CSO]: 'CSO',
  [TipoServico.FISCALIZACAO_CSO]: 'Fisc. + CSO',
  [TipoServico.DIRECAO_OBRA]: 'Direção de Obra',
  [TipoServico.COORDENACAO_OBRA]: 'Coord. de Obra',
  // Track B
  [TipoServico.PROJETO_ARQUITETURA]: 'Projeto Arquitetura',
  [TipoServico.PROJETO_PAISAGISMO]: 'Projeto Paisagismo',
  [TipoServico.PROJETO_ARQUITETURA_ESPECIALIDADES]: 'Arq. + Especialidades',
  [TipoServico.PROJETO_PAISAGISMO_ESPECIALIDADES]: 'Pais. + Especialidades',
  [TipoServico.PROJETO_ESPECIALIDADES]: 'Especialidades',
  [TipoServico.PROJETO_OUTRO]: 'Projeto (Outro)',
};

export const TRACK_LABELS: Record<string, { label: string; color: string }> = {
  'A': { label: 'Track A', color: 'bg-blue-100 text-blue-700' },
  'B': { label: 'Track B', color: 'bg-purple-100 text-purple-700' },
};

export const isTrackB = (tipo: TipoServico): boolean => {
  return [
    TipoServico.PROJETO_ARQUITETURA,
    TipoServico.PROJETO_PAISAGISMO,
    TipoServico.PROJETO_ARQUITETURA_ESPECIALIDADES,
    TipoServico.PROJETO_PAISAGISMO_ESPECIALIDADES,
    TipoServico.PROJETO_ESPECIALIDADES,
    TipoServico.PROJETO_OUTRO,
  ].includes(tipo);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};
