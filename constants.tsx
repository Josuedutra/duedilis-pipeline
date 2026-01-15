
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
  [TipoServico.FISCALIZACAO]: 'Fiscalização',
  [TipoServico.CSO]: 'CSO',
  [TipoServico.FISCALIZACAO_CSO]: 'Fisc. + CSO',
  [TipoServico.DIRECAO_OBRA]: 'Direção de Obra',
  [TipoServico.COORDENACAO_OBRA]: 'Coord. de Obra',
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
