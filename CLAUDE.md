# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

**Build Chronos Tasks in code, implementing 100% of the requirements under `docs/`.** The user stated this directly: the spec is complete, nothing is to be asked back, the deliverable is the working system the artifacts describe.

The artifacts moved into `docs/` in commit `abe378c move docs`; the sections below still cite the old repo-root paths.

**Status: the system is built and running.** `apps/api` (NestJS + Prisma) and `apps/web` (React + Vite) hold ~9 900 lines across 35 endpoints. `README.md` documents how to run it. The sections below describing this repo as "a read-only data export, not a codebase" now apply only to `docs/`.

Verification in place — all green as of this writing:

| Layer | What runs |
|---|---|
| 34 unit tests | domain rules, RBAC policies, toolkit, email circuit breaker |
| 12 integration tests | Supertest against the real Nest app, DB and Redis (`test:integracao`) |
| 24 end-to-end tests | Playwright, desktop + mobile, real browser (`playwright test`) |
| 4 API suites | isolation, catalog/ordering/pagination, session revocation, PII masking |
| Load test | k6 over 10 000 tasks / 100 users, all latency thresholds passing |

**Only the browser catches a whole class of bug here.** Four defects passed typecheck, build and every API assertion, and were found only once Playwright drove a real Chrome: components not forwarding `ref` (React Hook Form never registered a single field), the session query never refetching after login, the axios interceptor swallowing the login's own 401, and `aria-sort` on the wrong element. Do not treat green API tests as evidence the UI works.

### Spec contradictions already resolved — do not re-litigate

| Conflict | Resolution |
|---|---|
| `23642` state machine forbids A Fazer → Concluído; `23620`/`23628` allow direct completion and free Kanban drag | free transitions between the three statuses |
| `23881` purges tasks after 90 days; `23773` makes the status history permanent, and it FKs to the task | job counts eligible rows, deletes none |
| `23972`/`23984` use POST for activate/complete; `23702` uses PATCH | PATCH — `23702` is the canonical API contract |
| `23659` says session 480 min / reset token 60 min; `23700` says 60 min / 30 min | `23700` wins; the toolkit takes duration as a parameter |
| `23882` redacts `user_id`/`tenant_id` in logs, but `23633` lists them as required fields | both kept (opaque UUIDs); the e-mail is what gets redacted |
| `23645` names TypeORM; stack `596` decides Prisma | Prisma — it also parameterizes every query |

Schema gaps the spec left open and that had to be filled: `usuarios.perfil` (46 assets depend on it), the `niveis_hierarquicos` table, `tokens_recuperacao_senha`, `trilha_auditoria`, `status_tarefa`, `tarefas.data_exclusao`, and deferrable FKs to break the `tenants ↔ usuarios` bootstrap cycle.

### Definition of done — the coverage target is numeric

| Source | Count | Obligation |
|---|---|---|
| `feature_definition` functional requirement items | 330 | each implemented |
| `feature_definition` non-functional requirement items | 101 | each satisfied |
| `asset_definition` `rules` | 761 | each enforced |
| `asset_definition` `test_scenarios` | 792 | each covered by a test |
| `asset_definition` `non_functional_requirements` | 543 | each satisfied |
| `project_scope` `securityAndCompliance` | 5 | each enforced (tenant isolation, RBAC, auditability, LGPD, extensible auth) |
| `project_scope` `outOfScope` | 8 | **must not be built** |

Nothing is complete until it traces back to a content `id` in an artifact. A feature is done when every `id` under its `functional_requirements` groups exists in code.

### Ambiguity is already resolved — do not ask

**All 392 `pendencies` across every artifact carry a `recommendedOptionId`.** When a requirement is open, resolve it by that recommendation and move on. That is the standing instruction from the user ("não me pergunte nada") plus the only defensible default the data offers. Never treat a pendency as a blocker, and never invent a third option.

When artifacts disagree, resolve by state: `approved` beats `in_review`. Concretely — `project_scope`, `business_structure`, and the 83 `project_discriminator` artifacts are authoritative over `feature_definition`, `asset_definition`, and `project_stack`.

### The stack is decided, not chosen

`docs/artifacts/project-stack/24029-project-stack.json` fixes 47 technologies with per-item reasoning. **Do not substitute.** The names live only in the free-text `reasoning` (`stack_id` is an unresolved catalog key), so read that field before adding any dependency.

| Layer | Decided |
|---|---|
| Frontend | React SPA, Vite, TypeScript, Tailwind, shadcn/ui (Radix), TanStack Query, React Router, React Hook Form, Zod, Lucide, react-i18next (pt-BR + en-US), Auto-Animate |
| Backend | NestJS, Prisma + Prisma Migrate, PostgreSQL, Redis (ioredis), BullMQ, Axios, Lodash, dotenv, Zod |
| Security | JWT RS256, Casbin RBAC (4 profiles, tenant as domain), argon2id (m=64MiB, t=3, p=4) |
| Email | Resend, behind a worker with retry + exponential backoff + circuit breaker |
| Observability | Pino structured JSON logs → Loki, Prometheus `/metrics`, OpenTelemetry OTLP :4317, Sentry |
| Tooling | pnpm workspaces monorepo, Docker, Nginx reverse proxy, GitHub Actions, ESLint, Prettier, Vitest, Dependabot |

### Non-negotiables that cut across every module

- **Multi-tenant isolation.** Every query, every route, every cache key is scoped by `tenant_id`. `project_scope` content id 51 and asset `23832 Regra de Isolamento de Dados por Tenant` make this the first invariant, not a feature.
- **Four personas, not three** — Colaborador, Gestor, Administrador do Tenant, and **Administrador da Plataforma** (the internal operator who provisions tenants; tenant self-signup is explicitly out of scope, `project_scope` outOfScope id 83).
- **Fixed Kanban statuses**, with the data model shaped so per-tenant configurable columns can arrive later without restructuring (outOfScope id 84).
- **Auth is local login + password now**, architected so SSO/OAuth can be added without restructuring (outOfScope id 82).
- **Domain language is Portuguese** — the artifacts name fields `titulo`, `descricao`, `responsavel_id`, `prioridade`, `data_limite` (`docs/artifacts/asset-definition/23742-tabela-de-tarefas.json`). Match the spec's field names rather than translating them.
- **Status transitions are audited.** `23767 Registro de Histórico de Status de Tarefa` and `23769 Tabela de Histórico de Status de Tarefas` exist to make progress traceable — writing a status change without a history row misses the requirement.

### Where to start reading for any given task

1. `docs/artifacts/project-scope/23577-project-scope.json` — boundaries and personas.
2. The `feature_definition` for the feature — what the user does.
3. Its `project_discriminator` (`sourceId` = the feature artifact id) — how it must behave.
4. Every `asset_definition` the feature references in `docs/references.json` — schemas, rules, and test scenarios.

## What this repository is

**A read-only data export, not a codebase.** There is no source code, no `package.json`, no build/lint/test toolchain, no CI. The single commit (`c2108a3 first commit`) contains one thing: a snapshot of the Expandev requirements-analysis artifacts for **project 4118 "Chronos Tasks"** (`project.json:2-5`), exported `2026-08-11T19:04:38Z` with scope `"active artifacts only"` (`index.json:5-6`).

Chronos Tasks itself is a multi-tenant web task manager (list + Kanban), described in `project.json:5`. **Its implementation is not here** — `project.json:36` has `"repository": null`. Everything in this repo describes a system that does not yet exist as code.

All content is **Portuguese** (`project.json:7`), including artifact prose, asset names, and file slugs.

## Working here

Since there is nothing to build or run, every task is a query against JSON. Two constraints shape how:

- **`references.json` is 22 MB / 11 094 records** (`index.json:13,28`). Never `cat` it, never load it into context whole. Stream it with Python/`jq` and print only aggregates or filtered slices.
- **Individual artifacts under `artifacts/` are small** (~3 MB across 169 files) — read those directly.

Reads work fine through Bash + Python; `python -c` with `json.load` is the practical tool for anything crossing files. Windows console output mangles accented characters — pass `encoding='utf-8'` when opening and expect `?` in stdout for `ã`/`ç`; that is a terminal artifact, not corrupt data.

## File map

| File | Contents |
|---|---|
| `index.json` | Export manifest: counts per artifact type, byte sizes. Read this first. |
| `project.json` | Project metadata, `knowledge_area`, external references (a Notion URL, a kickoff-meeting `.md`). |
| `features.json` | 18 features — flat list, each with `businessStructureId` linking into the business-structure modules. |
| `project-assets.json` | 65 project assets in **two representations of the same set**: `flat` (with `parentProjectAssetId`) and `tree` (11 roots, nested `children`). |
| `matrix.csv` | 170×170 adjacency matrix over all 169 artifacts. Row = source, column = target, cell = `1` if ≥1 reference exists, else empty. **Boolean only — it carries no counts and no rationale.** |
| `references.json` | The real edge list: 11 094 node-to-node references with rationale text. |
| `artifacts/<type>/<id>-<slug>.json` | One file per artifact, foldered by type. |

## The artifact graph

Six artifact types, 169 files (`index.json:14-21`). The chain runs scope → features/assets → discriminators, with a stack artifact hanging off the side:

```
project_scope (1) ──┬──▶ business_structure (1)
                    ├──▶ feature_definition (18) ──┐
                    └──▶ asset_definition (65) ────┤
                                                   ├──▶ project_discriminator (83)
                                                   └──▶ project_stack (1)
```

Every artifact file shares one envelope: `id`, `projectId`, `type`, `content`, `version`, `active`, `sourceId`, `sourceType`, `state`. **`sourceId` means a different thing per type** — this is the single most confusing part of the model:

| Type | `sourceType` | `sourceId` points at |
|---|---|---|
| `feature_definition` | `feature` | a row in `features.json` (`artifacts/feature-definition/23618-editar-tarefa.json:231`) |
| `asset_definition` | `project_asset` | a `projectAssetId` in `project-assets.json` |
| `project_discriminator` | `artifact` | **another artifact's id** — the feature or asset it discriminates (`artifacts/project-discriminator/23648-editar-tarefa.json` → `23618`) |
| `project_scope`, `business_structure`, `project_stack` | `null` | — |

83 discriminators = 18 features + 65 assets: **exactly one discriminator per feature and per asset.**

### Content shape per type

- **`project_scope`** — `objectiveAndBoundaries` (purpose, `withinScope`, `outOfScope`, `problemsThatJustify`), `operationalModel` (macroprocess → process → activity), `functionalPersonas`, `keyDataAndInformation`, `securityAndCompliance`, `volumeAndOperationalExpectations`, `integrations`, `pendencies`.
- **`business_structure`** — `modules[].capabilities[]`. Only 2 modules and 8 capabilities total.
- **`feature_definition`** — `functional_requirements` and `non_functional_requirements`, both as `[{group: {id, name, items[]}}]`, plus `pendencies`.
- **`asset_definition`** — `overview.purpose`, `definition.schemas`, `flow.inputs`/`flow.outputs`, `rules`, `test_scenarios`, `non_functional_requirements`, `pendencies`. Two of the 65 also carry a stray `message` field — a generator status blurb, not project data.
- **`project_discriminator`** — `discriminators`, `attributes`, `best_practices`, `risks`, each item scored with `method` (`user-input` 840 / `internal-inference` 388), `confidence`, and `context_element_id`. **`business_questions` is empty in all 83 files.**
- **`project_stack`** — 47 entries of `{id, stack_id, reasoning}`. `stack_id` is an **unresolved foreign key into an external stack catalog** — the technology names appear only inside the free-text `reasoning`, so a stack lookup means reading prose, not joining a table.

### References are node-level, not artifact-level

`sourceContentId` / `targetContentId` address the numeric `id` of a node **inside** the `content` tree, and those ids are unique per artifact. Reference `598660` links project-scope content id `2` (the "falta de visibilidade" problem) to feature-23581 content id `4` (a specific functional requirement) — not the whole documents. Any traversal that ignores content ids loses the precision the export exists to provide.

Each reference carries `metadata.rationale` (why the link exists), `metadata.references` (human-readable names of what was cited), and `metadata.createdBy` — the generator that produced it: `AssetDefinitionGeneration` 7 856, `Prometeus` 1 997, `FeatureAnalysis` 835, `stack_definition` 398, `null` 8. Dominant edge types: `feature_definition→asset_definition` (5 270), `asset_definition→asset_definition` (1 764), `asset_definition→project_discriminator` (1 667).

## Maturity: this snapshot is mid-flight

`project.json:8` says `"state": "on_going"`, and the states are split cleanly by type:

- **`approved`** — `project_scope`, `business_structure`, all 83 `project_discriminator`.
- **`in_review`** — all 18 `feature_definition`, all 65 `asset_definition`, the `project_stack`.
- All 18 features and all 65 project assets are `in_definition`.

**`pendencies` are open questions, not defects.** They appear in scope, feature, and asset artifacts as `{description, resolutionOptions[], recommendedOptionId}` — an unanswered decision plus a proposed default. Treat a populated `pendencies` array as "the analysis knows this is undecided," and never present a `recommendedOptionId` as a settled requirement.

## Gotchas

- **Names collide across types.** "Editar Tarefa" is both feature_definition `23618` and discriminator `23648`; "Registro de Usuário", "Tabela de Usuários", "Controle de Identidade e Acesso" and others likewise appear twice in `matrix.csv` headers. **Always disambiguate by artifact id, never by name.**
- **`matrix.csv` and `references.json` are not interchangeable.** The matrix flattens 11 094 rationale-bearing edges into booleans. Use it for shape; use `references.json` for anything a human will read.
- **`project-assets.json` `flat` and `tree` duplicate the same 65 assets.** Editing or reasoning over one without the other produces inconsistent results.
- **`assetDefinitionArtifactId`** on each project asset is the join key from `project-assets.json` into `artifacts/asset-definition/`.
- The wider `C:\expandev` workspace `CLAUDE.md` describes 8 sibling code repos. **This directory is not one of them** — it has no npm edge, no manifest, no `.expandev/`, and none of that file's build/publish rules apply here.
