# AGENTS.md

AI agent guide for this repository. Covers behavioral rules, architecture, and
common task playbooks.

---

## Overview

Wealthfolio addon plugin. React + Vite + TanStack Query + Tailwind v4. Fetches
market-provider dividend history, compares against existing activities, suggests
missing ones.

## Code Layout

```
src/
├── addon.tsx              # Entry point (enable/disable lifecycle)
├── pages/                 # Route pages (DividendPage)
├── components/            # DividendSuggestions table, toolbar inputs
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
| Tests (watch)           | `pnpm test:watch` |
| Type check              | `pnpm type-check` |
| Lint                    | `pnpm lint`       |
| Format                  | `pnpm format`     |
| Bundle for distribution | `pnpm bundle`     |

---

## Architecture

```
addon.tsx → DividendPage → DividendSuggestions (components/suggestions.tsx)
                              ├── useLocalDividendData (editable row state)
                              ├── useSaveDividends (writes activities)
                              ↓
                    useDividendSuggestions (orchestrator)
                    ├── useAccounts
                    ├── useHoldingsByAccount
                    ├── useAssetProfiles
                    ├── useMarketDividends
                    ├── usePositionActivities
                    └── useExistingDividends
                              ↓
                    lib/quantity-timeline.ts (shares at date)
                    lib/is-duplicate.ts (dedup window: ex-date −min(N,3)d to +Nd, default N=3)
                    types/index.ts (DividendRequest — provider-neutral fetch)
                              ↓
                    Host API via ctx.api.*
```

---

## Gotchas

- **Host-provided deps**: `@wealthfolio/addon-sdk`, `@wealthfolio/ui`, React,
  react-query, and date-fns are published on npm (standalone `pnpm install`
  works) but are rollup `external`s at build time — the Wealthfolio host
  resolves them at runtime (`hostProvidedDependencies` in `vite.config.ts`).
  Don't bundle them.
- **Addon lifecycle**: `addon.tsx` must export `enable(sdk)` and `disable()`
  — Wealthfolio calls these on install/uninstall.
- **Test mocks**: `src/test-utils/mock-wealthfolio-ui.tsx` mocks `@wealthfolio/ui`
  for tests. Use it when testing components that consume Wealthfolio UI primitives.
- **User settings**: persisted in `localStorage` (withholding rate in
  `lib/withholding.ts`, match window in `lib/is-duplicate.ts`). Wrap every
  access in try/catch — it can throw in the sandboxed iframe.
- **Row edits reset**: any change to the set of suggestion IDs (refresh,
  match-window change) makes `useLocalDividendData` replace `localData`,
  dropping unsaved row edits and re-selecting all rows. Inputs that feed
  `useDividendSuggestions` should commit on blur/Enter, not per keystroke.
- **Dedup matching is many-to-one**: `isDuplicate` doesn't consume matched
  activities, so one recorded dividend can suppress several suggestions within
  the window. Keep the window cap (31 days) in mind for weekly/monthly payers.
- **Manifest permissions**: every `ctx.api.*` call must be declared under
  `permissions` in `manifest.json` (category + function + purpose).
- **Version lives in two places**: bump `package.json` and `manifest.json`
  together.

---

## Conventions

- Files: kebab-case. Hooks: `use-` prefix, one per file.
- Components: PascalCase. Page/top-level components default-export; small
  reusable components (e.g. `MatchWindowInput`) and hooks use named exports.
- Tests: co-located `.test.ts`/`.test.tsx`. Vitest + Testing Library.
- UI from `@wealthfolio/ui`. Host APIs from `@wealthfolio/addon-sdk`.
- `type` imports for type-only. Relative imports preferred.
- Strict TS. No unused locals/params. `_` prefix for intentionally unused.

### TypeScript

- Prefer interfaces over types, avoid enums
- Functional components
- Directory names: lowercase-with-dashes

### Security

- All data access via host `ctx.api.*` — stays local, no cloud calls
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
