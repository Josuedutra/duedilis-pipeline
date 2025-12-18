import { GoogleGenAI, Type } from "@google/genai";
import { getRhCosts, getRegionalFactors } from "./storage";

export interface AIAnalysisResult {
  summary: string;
  risks: string[];
  strengths: string[];
  strategy_suggestion: string;
  financial_warning?: string;
}

// Lazy singleton (não inicializa no topo do módulo)
let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  // Em Vite, env do frontend vem de import.meta.env e deve ser prefixada com VITE_
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set. Configure it in Vercel and redeploy.");
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export const analyzeProposal = async (proposalData: any): Promise<AIAnalysisResult> => {
  // Busca dinâmica dos dados de referência no Supabase
  let rhCosts: any;
  let regionalFactors: any;

  try {
    const [costsData, factorsData] = await Promise.all([getRhCosts(), getRegionalFactors()]);
    rhCosts = costsData;
    regionalFactors = factorsData;
  } catch (error) {
    console.warn("Falha ao buscar custos dinâmicos, usando fallback.", error);
    rhCosts = "Tabela de custos não disponível dinamicamente (ainda).";
    regionalFactors = "Fatores regionais não disponíveis dinamicamente (ainda).";
  }

  const prompt = `
    Analise a seguinte proposta de concurso público e forneça um relatório estruturado em JSON.

    DADOS DA PROPOSTA:
    Referência: ${proposalData.referencia_concurso}
    Objeto: ${proposalData.objeto}
    Entidade: ${proposalData.entidade_contratante}
    Local de Execução: ${proposalData.local_execucao || "Não especificado"}
    Valor Base: ${proposalData.valor_base_edital}€
    Valor Proposto: ${proposalData.valor_proposto}€
    Prazo: ${proposalData.prazo_execucao_meses} meses
    Equipa: ${JSON.stringify(proposalData.equipa_resumo)}
    Observações: ${proposalData.observacoes}

    KNOWLEDGE BASE (DADOS REAIS DO SUPABASE):
    Custos Referência: ${JSON.stringify(rhCosts)}
    Fatores Regionais: ${JSON.stringify(regionalFactors)}

    Instruções Adicionais de Cálculo:
    1. Localize o Fator Regional para o Local de Execução. Se for Lisboa, o fator é 1.20. Se for Porto ou Grande Porto, é 1.00.
    2. Para cada membro da equipa, multiplique o Custo Hora (ou Mensal) da Base pelo Fator Regional.
    3. Calcule o Custo Total de RH (Custo Ajustado * Meses * (Dedicacao/100)).
    4. Adicione uma margem de segurança de 15% sobre os custos de RH.
    5. Compare o total calculado com o "Valor Proposto".

    Regras de Resposta JSON:
    1. "summary": Resumo executivo da viabilidade.
    2. "risks": Lista de riscos (ex: margem negativa, falta de técnicos, prazos apertados).
    3. "strengths": Pontos fortes.
    4. "strategy_suggestion": Recomendação de alteração de preço ou estratégia de submissão.
    5. "financial_warning": Aviso se os custos superarem a receita.
  `;

  const aiClient = getAI();

  const response = await aiClient.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategy_suggestion: { type: Type.STRING },
          financial_warning: { type: Type.STRING, description: "Aviso crítico de rentabilidade" },
        },
        required: ["summary", "risks", "strengths", "strategy_suggestion"],
      },
      systemInstruction:
        "És um consultor sénior especialista em concursos públicos (CCP) e controlo de gestão na Duedilis. O teu objetivo é garantir a rentabilidade máxima usando dados reais de custos.",
    },
  });

  return JSON.parse(response.text);
};
