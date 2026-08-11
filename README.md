# Gestor de Demandas

App interno de gerenciamento de demandas/tarefas para agência de marketing digital. Dois papéis — **admin** (cadastra colaboradores e demandas, vê tudo) e **colaborador** (vê e atualiza só as próprias demandas) — com board Kanban, lista filtrável, "Minhas tarefas" e um dashboard com indicadores da equipe.

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Supabase](https://supabase.com) — Postgres + Auth
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (base Radix)
- [react-hook-form](https://react-hook-form.com) + [zod](https://zod.dev)
- [@dnd-kit](https://dndkit.com) (Kanban) · [next-themes](https://github.com/pacocoursey/next-themes) (dark/light)

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- Uma conta e um projeto no [Supabase](https://supabase.com)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o banco de dados

No painel do seu projeto Supabase, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria as tabelas (`profiles`, `demandas`, `comentarios`), os enums, os triggers (perfil criado automaticamente ao registrar um usuário) e as policies de RLS (admin vê tudo; colaborador só as próprias demandas).

Em seguida, crie o primeiro usuário admin:

1. **Authentication → Users → Add user** — defina e-mail e senha.
2. No **SQL Editor**, rode (trocando o e-mail):

   ```sql
   update public.profiles set role = 'admin', nome = 'Seu Nome', status = 'ativo'
   where email = 'seu-email@empresa.com';
   ```

Os próximos colaboradores são criados diretamente pela tela **Colaboradores** do app (ela já usa a Admin API do Supabase para criar o usuário com o papel certo e gera uma senha temporária para você repassar).

### 4. Variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com os valores de **Project Settings → API Keys** do seu projeto Supabase:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave `publishable` (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | chave `secret` (`sb_secret_...`) — **nunca** exponha no client; usada só em Server Actions para criar/editar colaboradores |

### 5. Rodar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e entre com o usuário admin criado no passo 3.

## Deploy na Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new) (projeto Next.js é detectado automaticamente, sem configuração extra de build).
2. Em **Project Settings → Environment Variables**, adicione as mesmas três variáveis do `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).
3. Deploy.

Se no futuro adicionar fluxos de e-mail do Supabase Auth (recuperação de senha, convite por e-mail), configure também **Authentication → URL Configuration → Site URL** no Supabase com o domínio da Vercel — não é necessário para o login por e-mail/senha atual.

## Scripts

```bash
npm run dev     # ambiente de desenvolvimento
npm run build   # build de produção (roda type-check + lint)
npm run start   # serve o build de produção
npm run lint    # eslint
```

## Estrutura

```
app/
  login/              página de login
  actions/             Server Actions (auth, colaboradores, demandas)
  (app)/                shell autenticado (sidebar + header)
    dashboard/
    demandas/           lista, board/, minhas/, [id]/
    colaboradores/      admin only
components/
  demandas/, colaboradores/, dashboard/, layout/, ui/ (shadcn)
lib/
  supabase/             clientes browser/server/admin + middleware de sessão
  auth.ts               guards requireProfile()/requireAdmin()
  validations/           schemas zod
supabase/
  schema.sql            schema documentado (rodar manualmente no Supabase)
```

## Fora de escopo (por enquanto)

- Comentários por demanda — a tabela `comentarios` já existe no schema, mas a UI ainda não foi construída.
- Notificações por e-mail/push, app mobile nativo, integrações externas.
