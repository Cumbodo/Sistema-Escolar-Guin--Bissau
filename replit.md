# Gestão Escolar Guiné-Bissau

Plataforma em português para escolas da Guiné-Bissau gerirem matrículas, turmas, propinas, despesas, notas trimestrais e documentos oficiais.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gestao-escolar/src/App.tsx` — shell, rotas e interfaces do painel.
- `artifacts/gestao-escolar/src/index.css` — tokens visuais, responsividade e impressão A4.
- `lib/api-spec/openapi.yaml` — contrato único dos endpoints escolares.
- `artifacts/api-server/src/routes/school.ts` — rotas de escolas, classes, alunos, finanças e pautas.
- `lib/db/src/schema/` — tabelas PostgreSQL para escolas, classes, alunos, propinas, despesas e pautas.

## Architecture decisions

- A plataforma usa uma API partilhada com contrato OpenAPI e hooks gerados para manter a interface e o servidor alinhados.
- As notas ficam organizadas por turma e trimestre, com campos independentes para P1, P2, P3, coordenação, média e época.
- A impressão é feita no navegador com folhas A4 em formato horizontal, deixando os controlos fora do documento.
- O dinheiro é apresentado em FCFA/XOF e as datas escolares são guardadas como datas de calendário.

## Product

- Painel de controlo com totais de alunos, desistências, classes, propinas, despesas e ocupação.
- Aprovação ou rejeição de pedidos de adesão de escolas.
- Personalização de classes do Jardim ao 12.º ano e subdivisões como A1/A2.
- Matrículas com escolha obrigatória da classe.
- Contabilidade geral com receitas, propinas pendentes, despesas e saldo.
- Pautas trimestrais editáveis e imprimíveis, além de declarações e certificados.

## User preferences

- A interface deve permanecer em português e adequada ao uso de escolas da Guiné-Bissau.

## Gotchas

- Depois de alterar `lib/api-spec/openapi.yaml`, executar `pnpm --filter @workspace/api-spec run codegen` antes de validar os pacotes.
- O app web e a API precisam ser reiniciados pelos workflows geridos para refletir alterações de código.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
