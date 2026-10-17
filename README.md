# FLUXO NEO

Gerenciamento de tarefas pessoais inspirada em um quadro Kanban físico: **A Fazer → Fazendo → Feito**, com um **Backlog** independente para ideias ainda não planejadas.

Stack: React 19 + TypeScript + Tailwind CSS 4 + Vite · dnd-kit (arrastar e soltar acessível) · Supabase (Auth + PostgreSQL + Realtime).

## Começar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

Sem configuração, o app abre em **modo local**: sem conta, dados salvos apenas neste navegador (`localStorage`). Esse modo serve para testar — **não** simula autenticação. Para contas reais e sincronização entre dispositivos, configure o Supabase (abaixo).

Outros comandos: `npm run typecheck`, `npm run build`, `npm run preview`.

## Configurar o Supabase (o que falta para contas e sincronização)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: cole e execute [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Cria as tabelas `profiles`, `projects`, `categories`, `tasks` e `subtasks`, as políticas RLS, os triggers de validação e ativa o Realtime.
3. **Project Settings → API**: copie o *Project URL* e a chave **anon / public**.
4. Copie `.env.example` para `.env.local` e preencha:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Use **apenas** a chave `anon`. Nunca coloque a `service_role` no frontend.
5. **Authentication → URL Configuration**: em *Site URL* coloque o endereço do app (ex.: `http://localhost:5173` ou o domínio de produção) e adicione `<endereço>/redefinir-senha` em *Redirect URLs* (necessário para a recuperação de senha).
6. Reinicie `npm run dev`. A tela de login aparece automaticamente.

Os dados do modo local não são migrados automaticamente; use **Configurações → Exportar dados** para salvar uma cópia em JSON.

### Segurança

- **RLS** em todas as tabelas: cada usuário só lê/escreve linhas com `user_id = auth.uid()`. Visitantes anônimos não têm acesso.
- `user_id` é preenchido pelo servidor (`default auth.uid()`); um cliente não consegue gravar em nome de outro.
- Chaves estrangeiras compostas `(id, user_id)` impedem associar uma tarefa ao projeto/categoria de outra pessoa.
- Validação no servidor com `CHECK` (título 1–200 caracteres, estados e prioridades válidos, data limite ≥ data de início, cores `#RRGGBB`) e trigger que mantém `completed_at` coerente com o estado.
- A migração foi validada em um PostgreSQL embutido (PGlite) com testes de isolamento entre dois usuários.

### Publicar

`npm run build` gera `dist/`. Como o app usa rotas do navegador (`/quadro`, `/agenda`…), configure a hospedagem para servir `index.html` em qualquer rota (Vercel/Netlify fazem isso com uma regra *rewrite* → `/index.html`).

## Funcionalidades

| Área | O que faz |
|---|---|
| **Início** | Saudação, data, contadores (A Fazer / Fazendo / Feito), % das tarefas previstas para hoje, prioritárias, próximos prazos e resumo da semana — tudo calculado dos dados reais. |
| **Meu quadro** | 3 colunas com contagem, botão “+”, adição rápida e área de soltar. Arrastar entre colunas e reordenar (mouse, toque e teclado). Limite configurável em “Fazendo” (WIP). No celular: uma coluna por vez + seletor de estado em cada cartão. |
| **Tarefas** | Título (obrigatório), descrição, estado, prioridade, datas de início e limite, projeto, categoria, subtarefas e notas. Editar, duplicar, arquivar, excluir (com confirmação) e **Desfazer**. |
| **Backlog** | Anotação rápida, pesquisa, filtros, seleção múltipla, mover para “A Fazer”, definir data de execução, arquivar e aba **Arquivo** para restaurar. |
| **Projetos** | Nome, descrição, cor, datas e estado; progresso automático e tarefas por estado. |
| **Agenda** | Visualizações mensal e semanal com prazos e inícios planejados; arrastar para outro dia muda a data; atrasadas destacadas com discrição. |
| **Estatísticas** | Concluídas por semana e por mês, distribuição por estado, atrasadas, histórico de conclusão e progresso por projeto. |
| **Pesquisa** | Barra no topo (título e descrição) + filtros por estado, prioridade, projeto, categoria, prazo e atrasadas; ordenação por data limite, prioridade e criação. |

### Atalhos

`N` nova tarefa · `/` ou `Ctrl/⌘ + K` pesquisar · `Ctrl/⌘ + Enter` salvar · `Esc` fechar · num cartão: `Espaço` pegar/soltar, setas mover, `Enter` abrir.

## Arquitetura

```
src/
  types.ts                 Modelo de domínio (Task, Project, Category…)
  data/
    repository.ts          Interface DataRepository (contrato do backend)
    localRepository.ts     Implementação localStorage (modo local)
    supabaseRepository.ts  Implementação Supabase (+ Realtime)
  auth/AuthProvider.tsx    Sessão, registro, login, recuperação, saída
  store/
    DataProvider.tsx       Estado do app, atualizações otimistas, fila de gravação, desfazer
    selectors.ts           Filtros, ordenação e indicadores (funções puras)
    history.ts             Séries para estatísticas
  components/              UI reutilizável (ui/, layout/, tasks/, board/, projects/, charts/)
  pages/                   Uma página por rota
supabase/migrations/       Esquema SQL + RLS
```

**Fluxo de dados:** a UI chama ações do `DataProvider` → o estado muda de imediato (otimista) → a gravação entra numa fila ordenada no `DataRepository`. Se falhar, aparece uma notificação e o estado é recarregado do servidor. Alterações vindas de outro dispositivo chegam por Realtime e disparam uma recarga.

### Preparado para as próximas fases

Cada funcionalidade futura entra pelos mesmos três pontos — migração SQL, `DataRepository` e `DataProvider` — sem tocar nas páginas existentes.

- **Notificações avançadas** — tabela `reminders (task_id, remind_at, channel, sent_at)` com RLS por `user_id`; um *Supabase Scheduled Function* (cron) envia email/push quando `remind_at` chega. No cliente, `saveReminders()` no repositório e um campo “Lembrar-me” no modal de tarefa.
- **Recorrência** — coluna `recurrence_rule text` (formato RRULE) em `tasks`. Quando uma tarefa recorrente passa a `done`, um trigger (ou a ação `moveTask`) cria a próxima ocorrência com as datas avançadas.
- **Colaboração** — tabelas `workspaces` e `workspace_members (workspace_id, user_id, role)`; acrescentar `workspace_id` a projetos/tarefas e trocar as políticas `user_id = auth.uid()` por “é membro do workspace”. O canal Realtime passa a filtrar por `workspace_id`.
- **Assistência por IA** — uma *Supabase Edge Function* (a chave do fornecedor de IA fica só no servidor) que recebe o contexto das tarefas do usuário autenticado e devolve sugestões (dividir em subtarefas, priorizar, planear a semana). No cliente, um método `suggest()` no repositório e um botão no modal de tarefa.
