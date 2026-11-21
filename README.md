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

Os dados do modo local não são migrados automaticamente: use **Configurações → Exportar dados** no modo local e depois **Importar dados** já com a conta.

### Segurança

- **RLS** em todas as tabelas: cada usuário só lê/escreve linhas com `user_id = auth.uid()`. Visitantes anônimos não têm acesso.
- `user_id` é preenchido pelo servidor (`default auth.uid()`); um cliente não consegue gravar em nome de outro.
- Chaves estrangeiras compostas `(id, user_id)` impedem associar uma tarefa ao projeto/categoria de outra pessoa.
- Validação no servidor com `CHECK` (título 1–200 caracteres, estados e prioridades válidos, data limite ≥ data de início, cores `#RRGGBB`) e trigger que mantém `completed_at` coerente com o estado.
- A migração foi validada em um PostgreSQL embutido (PGlite) com testes de isolamento entre dois usuários.

## Publicar na Vercel

O projeto já vem configurado para a Vercel em [`vercel.json`](vercel.json): build com Vite, saída em `dist/`, todas as rotas (`/quadro`, `/semana`…) servindo `index.html`, cache longo para os arquivos em `/assets` e cabeçalhos básicos de segurança. A versão do Node fica fixada em `engines` no `package.json`.

1. Entre em [vercel.com](https://vercel.com) com **Continue with GitHub** (conta gratuita *Hobby*).
2. **Add New… → Project** e importe o repositório `fluxo-neo`. Se ele não aparecer, clique em *Adjust GitHub App Permissions* e libere o repositório.
3. Não altere nada nas configurações de build: a Vercel lê o `vercel.json`.
4. (Opcional, para contas e sincronização) Conecte o Supabase pela integração oficial (**Integrations → Supabase**): o app lê automaticamente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, que a integração cria e mantém. Também dá para criar à mão `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Environment Variables**. Sem nenhuma delas, o app online funciona em modo local.
5. Clique em **Deploy**. O app fica disponível em `https://<nome-do-projeto>.vercel.app`.

Depois disso, cada `git push` para `main` publica uma nova versão automaticamente, e cada outra branch ou pull request ganha um link de pré-visualização.

Se usar o Supabase, adicione o domínio da Vercel em **Authentication → URL Configuration**: *Site URL* `https://<seu-app>.vercel.app` e, em *Redirect URLs*, `https://<seu-app>.vercel.app/redefinir-senha`. Variáveis de ambiente alteradas só valem após um novo deploy (**Deployments → ⋯ → Redeploy**).

Em outra hospedagem estática, sirva a pasta `dist/` gerada por `npm run build` e redirecione todas as rotas para `/index.html`.

### Evitar a pausa do Supabase (plano grátis)

O Supabase pausa projetos gratuitos depois de cerca de uma semana sem uso. A automação [`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml) chama a função `public.keepalive()` (migração [`0003_keepalive.sql`](supabase/migrations/0003_keepalive.sql)) a cada 3 dias. Ela usa as variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` do repositório (**Settings → Secrets and variables → Actions → Variables**). Para rodar à mão: **Actions → Manter Supabase ativo → Run workflow**.

O GitHub desativa automações agendadas em repositórios públicos sem nenhum commit durante 60 dias (e avisa por email antes). Se isso acontecer, reative em **Actions**.

## Funcionalidades

| Área | O que faz |
|---|---|
| **Início** | Saudação, data, contadores (A Fazer / Fazendo / Feito), % das tarefas previstas para hoje, prioritárias, próximos prazos e o **calendário do mês** (prazos e inícios planejados; arrastar uma tarefa para outro dia muda a data) — tudo calculado dos dados reais. |
| **Meu quadro** | 3 colunas com contagem, botão “+”, adição rápida e área de soltar. Arrastar entre colunas e reordenar (mouse, toque e teclado). Limite configurável em “Fazendo” (WIP). No celular: uma coluna por vez + seletor de estado em cada cartão. |
| **Tarefas** | Título (obrigatório), descrição, estado, prioridade, datas de início e limite, projeto, categoria, subtarefas, notas e **repetição** (diária, semanal, mensal ou anual, a cada N). Ao concluir uma tarefa recorrente, a próxima ocorrência nasce em “A Fazer” com as datas avançadas e as subtarefas desmarcadas. Editar, duplicar, arquivar, excluir (com confirmação) e **Desfazer**. |
| **Backlog** | Anotação rápida, pesquisa, filtros, seleção múltipla, mover para “A Fazer”, definir data de execução, arquivar e aba **Arquivo** para restaurar. |
| **Projetos** | Nome, descrição, cor, datas e estado; progresso automático e tarefas por estado. |
| **Resumo da semana** | Navega semana a semana: concluídas (comparadas com a semana anterior), criadas, prazos da semana e atrasadas; gráfico de conclusões por dia e listas das tarefas concluídas e dos prazos. |
| **Estatísticas** | Concluídas por semana e por mês, distribuição por estado, atrasadas, histórico de conclusão e progresso por projeto. |
| **Backup** | Em Configurações: **Exportar dados** (JSON) e **Importar dados**. A importação só acrescenta (nada é apagado nem sobrescrito), mostra um resumo antes, ignora o que já existe (mesmo id, ou mesmo título com a mesma data de criação, então reimportar não duplica), valida cada campo com as regras do banco e refaz as ligações com projetos e categorias ([`src/lib/importData.ts`](src/lib/importData.ts)). |
| **Dicas de toque** | Em celular/tablet, o quadro e o calendário mostram uma vez como arrastar ("toque e segure"). Some ao tocar em “Entendi” ou depois do primeiro arrasto ([`TouchHint`](src/components/ui/TouchHint.tsx)). |
| **Pesquisa** | Barra no topo (título e descrição) + filtros por estado, prioridade, projeto, categoria, prazo e atrasadas; ordenação por data limite, prioridade e criação. |

### Uso sem internet (com conta)

- **Continua funcionando offline:** cada alteração entra numa fila guardada neste aparelho ([`src/data/offlineRepository.ts`](src/data/offlineRepository.ts)) e é enviada ao Supabase, na ordem, quando a conexão volta (evento `online` + nova tentativa a cada 20 s). Fechar ou recarregar a página não perde nada.
- **Cópia local dos dados:** atualizada a cada carga e a cada alteração, para o app abrir sem internet. É apagada ao **sair da conta**; se ainda houver alterações não enviadas, o app avisa antes.
- **Indicador:** no topo aparece **"Offline · N pendentes"**; ao reconectar, "Sincronizando…" e o ✓, com um aviso "Alterações sincronizadas".
- **Tela "Sem conexão":** só quando não há internet **e** este aparelho nunca carregou os dados. Tenta de novo sozinha quando a conexão volta.
- **Abrir o app offline:** o service worker ([`public/sw.js`](public/sw.js), só em produção) guarda a página e os arquivos do app. Chamadas ao Supabase nunca passam pelo cache dele.
- **Erros:** falha de rede mantém a operação na fila; recusa do servidor (validação, permissão) descarta a operação, avisa e recarrega o estado real. Em edições da mesma tarefa em dois aparelhos, a última enviada prevalece.

### Tela de carregamento (preload)

O preload fica direto no [`index.html`](index.html), em HTML e CSS, então aparece antes de o JavaScript baixar. Mostra o logo se montando, o nome FLUXO NEO e as 5 faixas da marca em onda, e segue o tema claro/escuro guardado. O app o remove com um fade quando a primeira tela real está pronta: os dados carregados (`AppShell`) ou a tela de login (`App.tsx`), via `useHidePreload` em [`src/lib/preload.ts`](src/lib/preload.ts). Fica no mínimo ~1,5 s na tela (entrada na marca, sem piscar) e sai sozinho após 12 s se algo falhar. Com "reduzir movimento" ativado no sistema, fica sem animação.

### Atalhos

`N` nova tarefa · `/` ou `Ctrl/⌘ + K` pesquisar · `Ctrl/⌘ + Enter` salvar · `Esc` fechar · num cartão: `Espaço` pegar/soltar, setas mover, `Enter` abrir.

## Textura visual (superfícies)

Seis utilitários em [`src/index.css`](src/index.css) dão profundidade às telas sem sair da paleta; use-os em vez de combinar `border`/`bg-surface`/`shadow` à mão:

| Utilitário | Quando usar | O que faz |
|---|---|---|
| `surface-panel` | Cartões, painéis, listas, menus | Vidro translúcido (`--glass-bg`) com desfoque do fundo, borda clara (`--glass-border`) e elevação `--shadow-card` |
| `surface-raised` | Cartões de tarefa, botões secundários | Degradê de luz sutil (`--raised-top` → `--raised-bottom`) com elevação `--shadow-card` |
| `surface-brand` | Indicadores com cor própria (ex.: Resumo da semana) | Vidro tingido pela cor de `--brand`, borda no mesmo tom e barra de 3 px no topo (`--brand-bar`). Use as cores do logo: `--color-brand-blue`, `-navy`, `-orange`, `-white`, `-gray` |
| `accent-bar` | Faixa de cor no topo de cartões e painéis | Barra de 3 px desenhada num `::before` (cor via `--bar`); funciona junto com `surface-panel` e com sombras de hover. Use em vez de `border-t-*` |
| `bar-gloss` | Barras de gráficos e de progresso | Degradê de luz, brilho de 1 px e sombra na cor de `--bar` (padrão: `--color-sky`) |
| `orb` | Números em destaque | Esfera com brilho e sombra; a cor vem de `--orb` (ex.: `[--orb:var(--color-accent)]`) |

Elevação: `shadow-card` (repouso) → `shadow-lift` (hover, item ativo) → `shadow-pop` (modais, menus). Todas incluem um brilho de 1 px no topo. O fundo da página tem dois brilhos difusos nas cores da marca (`--ambient-a`/`--ambient-b`). Os tokens mudam no tema claro em `:root[data-theme='light']`. A faixa branca do logo ganha um contorno no tema claro (`.brand-stripe-white`). O calendário do Início usa o cinza da marca (`graphite-soft` / `graphite-line` / `graphite-fg`, com barra `--color-brand-gray`).

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
  pages/                   Uma página por rota (carregadas sob demanda via pages/lazyPages.ts)
supabase/migrations/       Esquema SQL + RLS
```

**Carregamento:** cada página é um arquivo JS próprio (`React.lazy` em [`src/pages/lazyPages.ts`](src/pages/lazyPages.ts)). A página do endereço de entrada começa a baixar já na abertura, em paralelo com o login e os dados; as outras são antecipadas quando o navegador fica ocioso, para a navegação ser imediata. React, Supabase, dnd-kit e ícones ficam em arquivos separados (`build.rolldownOptions` no [`vite.config.ts`](vite.config.ts)), que mudam pouco e ficam no cache entre deploys; as animações da pesquisa (framer-motion) chegam por `LazyMotion` sem atrasar a abertura.

**Fluxo de dados:** a UI chama ações do `DataProvider` → o estado muda de imediato (otimista) → a gravação entra numa fila ordenada no `DataRepository`. Se falhar, aparece uma notificação e o estado é recarregado do servidor. Alterações vindas de outro dispositivo chegam por Realtime e disparam uma recarga.

### Preparado para as próximas fases

Cada funcionalidade futura entra pelos mesmos três pontos — migração SQL, `DataRepository` e `DataProvider` — sem tocar nas páginas existentes.

- **Notificações avançadas** — tabela `reminders (task_id, remind_at, channel, sent_at)` com RLS por `user_id`; um *Supabase Scheduled Function* (cron) envia email/push quando `remind_at` chega. No cliente, `saveReminders()` no repositório e um campo “Lembrar-me” no modal de tarefa.
- **Recorrência** — coluna `recurrence_rule text` (formato RRULE) em `tasks`. Quando uma tarefa recorrente passa a `done`, um trigger (ou a ação `moveTask`) cria a próxima ocorrência com as datas avançadas.
- **Colaboração** — tabelas `workspaces` e `workspace_members (workspace_id, user_id, role)`; acrescentar `workspace_id` a projetos/tarefas e trocar as políticas `user_id = auth.uid()` por “é membro do workspace”. O canal Realtime passa a filtrar por `workspace_id`.
- **Assistência por IA** — uma *Supabase Edge Function* (a chave do fornecedor de IA fica só no servidor) que recebe o contexto das tarefas do usuário autenticado e devolve sugestões (dividir em subtarefas, priorizar, planear a semana). No cliente, um método `suggest()` no repositório e um botão no modal de tarefa.
