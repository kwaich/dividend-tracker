# AGENTS.md

AI agent guide for this repository. Covers behavioral rules, architecture, and
common task playbooks.

---

## Overview

Wealthfolio addon plugin. React + Vite + TanStack Query + Tailwind v4. Fetches
Yahoo Finance dividend history, compares against existing activities, suggests
missing ones.

## Code Layout

```
src/
├── addon.tsx              # Entry point (enable/disable lifecycle)
├── pages/                 # Route pages (DividendPage)
├── components/            # Tab components (SuggestionsTab, HistoryTab)
├── hooks/                 # Data-fetching hooks (TanStack Query)
├── lib/                   # Pure utility functions
└── types/                 # Shared interfaces
```

## Run Targets

| Task                    | Command           |
| ----------------------- | ----------------- |
| Dev (watch build)       | `pnpm dev`        |
| Dev server              | `pnpm dev:server` |
| Build                   | `pnpm build`      |
| Tests                   | `pnpm test`       |
| Type check              | `pnpm type-check` |
| Lint                    | `pnpm lint`       |
| Bundle for distribution | `pnpm bundle`     |

---

## Architecture

```
addon.tsx → DividendPage → SuggestionsTab / HistoryTab
                              ↓
                    useDividendSuggestions (orchestrator)
                    ├── useAccounts
                    ├── useHoldingsByAccount
                    ├── useAssetProfiles
                    ├── useYahooDividends
                    ├── usePositionActivities
                    └── useExistingDividends
                              ↓
                    lib/quantity-timeline.ts (shares at date)
                    lib/is-duplicate.ts (3-day dedup window)
                    lib/yahoo-dividends.ts (MIC→Yahoo suffix)
                              ↓
                    Host API via ctx.api.*
```

---

## Conventions

- Files: kebab-case. Hooks: `use-` prefix, one per file.
- Components: default exports, PascalCase. Hooks: named exports.
- Tests: co-located `.test.ts`/`.test.tsx`. Vitest + Testing Library.
- UI from `@wealthfolio/ui`. Host APIs from `@wealthfolio/addon-sdk`.
- `type` imports for type-only. Relative imports preferred.
- Strict TS. No unused locals/params. `_` prefix for intentionally unused.

### TypeScript

- Prefer interfaces over types, avoid enums
- Functional components, named exports
- Directory names: lowercase-with-dashes

### Rust

- Idiomatic Rust, small focused functions
- `Result`/`Option`, propagate with `?`, `thiserror` for domain errors

### Security

- All data local (SQLite), no cloud
- Secrets via OS keyring—never disk/localStorage
- Never log secrets or financial data

---

## Behavioral Guidelines

**These come first because they prevent the most mistakes.**

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them—don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

### 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated issues, mention them—don't fix them.
- Remove only what YOUR changes made unused.

### 4. Goal-Driven Execution

- Transform tasks into verifiable goals.
- For multi-step tasks, state a brief plan with verification steps.
- Unverified work is incomplete work.

### 5. Output Precision

- Lead with findings, not process descriptions.
- Use structured formats (lists, tables, code blocks).
- Include absolute file paths—never relative.

---

## Validation Checklist

Before completing any task:

- [ ] `pnpm test` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] Changes are minimal and surgical

---

## Plan Mode

- Make plans extremely concise. Sacrifice grammar for brevity.
- End with unresolved questions, if any.

---

When in doubt, follow the nearest existing pattern.
