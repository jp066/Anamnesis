# Anamnesis

App pessoal feito com Svelte, Vite, Supabase Auth e Postgres para criar roadmaps de estudo, metas, materiais e sessões da semana.

## Rodar localmente

```bash
npm install
npm run dev
```

## Supabase

Este projeto usa Supabase somente como banco/autenticação:

- Supabase Auth com email/senha e provedor GitHub
- Tabelas `roadmaps` e `resources` para salvar os dados por usuário

Configuração:

1. Crie um projeto no Supabase.
2. Ative `Email` e o provedor GitHub em `Authentication`.
3. Configure o Callback URL do OAuth como `https://wtmtmweqfvgaxskexqcg.supabase.co/auth/v1/callback`.
4. Rode o SQL de `supabase/schema.sql` no editor SQL.
5. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Sem `.env` ou sem sessão autenticada, a aplicação mostra os dados iniciais apenas como visualização. Criações, edições e remoções são salvas somente no Supabase após login.
