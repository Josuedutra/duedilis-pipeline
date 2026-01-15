
import { GoogleGenAI, Type } from "@google/genai";
import { getRhCosts, getRegionalFactors } from "./storage";

export interface AIAnalysisResult {
  summary: string;
  risks: string[];
  strengths: string[];
  strategy_suggestion: string;
  financial_warning?: string;
}

export const analyzeProposal = async (proposalData: any): Promise<AIAnalysisResult> => {
  // Inicialização dentro da função conforme as diretrizes da Google GenAI SDK
  // para garantir que a API_KEY é lida no momento da execução.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Busca dinâmica dos dados de referência no Supabase
  let rhCosts;
  let regionalFactors;
  
  try {
    const [costsData, factorsData] = await Promise.all([
      getRhCosts(),
      getRegionalFactors()
    ]);
    rhCosts = costsData;
    regionalFactors = factorsData;
  } catch (error) {
    console.warn("Falha ao buscar custos dinâmicos, usando fallback.", error);
    rhCosts = "Tabela de custos não disponível dinamicamente.";
    regionalFactors = "Fatores regionais não disponíveis dinamicamente.";
  }

  const prompt = `
    Analise a seguinte proposta de concurso público e forneça um relatório estruturado em JSON.
    
    DADOS DA PROPOSTA:
    Referência: ${proposalData.referencia_concurso}
    Objeto: ${proposalData.objeto}
    Entidade: ${proposalData.entidade_contratante}
    Local de Execução: ${proposalData.local_execucao || 'Não especificado'}
    Valor Base: ${proposalData.valor_base_edital}€
    Valor Proposto: ${proposalData.valor_proposto}€
    Prazo: ${proposalData.prazo_execucao_meses} meses
    Equipa: ${JSON.stringify(proposalData.equipa_resumo)}
    Observações: ${proposalData.observacoes}

    KNOWLEDGE BASE (DADOS REAIS):
    Custos Referência: ${JSON.stringify(rhCosts)}
    Fatores Regionais: ${JSON.stringify(regionalFactors)}

    Instruções de Cálculo:
    1. Localize o Fator Regional. Lisboa=1.20, Porto=1.00, Alentejo/Interior=0.88.
    2. Calcule o Custo Total de RH (Custo Base * Fator * Meses * Alocação).
    3. Verifique se o "Valor Proposto" cobre os custos de RH + 15% de margem.

    Regras de Resposta JSON:
    1. "summary": Resumo executivo.
    2. "risks": Lista de riscos.
    3. "strengths": Pontos fortes.
    4. "strategy_suggestion": Recomendação estratégica.
    5. "financial_warning": Aviso se a margem for negativa.
  `;

  const response = await ai.models.generateContent({
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
          financial_warning: { type: Type.STRING }
        },
        required: ["summary", "risks", "strengths", "strategy_suggestion"]
      },
      systemInstruction: "És um consultor sénior especialista em concursos públicos na Duedilis. Foca-te na viabilidade financeira e técnica."
    },
  });

  return JSON.parse(response.text);
};
