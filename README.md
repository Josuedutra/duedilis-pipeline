
# Duedilis Pipeline Manager 🚀

Plataforma avançada de gestão de pipeline de propostas para concursos públicos (CCP), com inteligência artificial para análise de viabilidade e rentabilidade.

## 🛠️ Tecnologias
- **Frontend:** React 19 (ES6 Modules via ESM.sh)
- **Estilização:** Tailwind CSS
- **Base de Dados:** Supabase (PostgreSQL)
- **IA:** Google Gemini 3 (Análise de CCP)

## 🚀 Como Colocar em Produção
1. Crie um novo projeto na **Vercel** ou **Netlify**.
2. Conecte este repositório do GitHub.
3. Configure a variável de ambiente (Environment Variable):
   - `API_KEY`: A sua chave do Google AI Studio.
4. O deploy será feito automaticamente.

## 📊 Estrutura de Dados
A aplicação espera uma tabela `propostas` no Supabase. Caso encontre erros de sincronização ou veja o aviso vermelho na aplicação, execute o seguinte script no SQL Editor do Supabase:

```sql
-- SCRIPT DE REPARAÇÃO DE BASE DE DADOS
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS custos_diretos_percentual NUMERIC DEFAULT 5;
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS local_execucao TEXT;
NOTIFY pgrst, 'reload schema';
```

---
Desenvolvido por Duedilis.
