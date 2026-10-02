# Discovered issues & gaps

Living log of product, agent, and ops problems found during development and review.  
Add new entries at the **top** of [Open issues](#open-issues) with date and source (e.g. chat, user report, QA).

**Legend:** `P0` user-blocking · `P1` major quality/trust · `P2` polish · `P3` doc/marketing mismatch

---

## Quick verify (Steps 1–5)

| Step | Automated (seconds) | Manual only (optional) |
|------|---------------------|-------------------------|
| 1 | `npm run test:fixes` — per-`projectId` localStorage round-trip | Builder → AI Settings → Save → reload → fields still there |
| 2 | same — empty env when nothing saved | New project preview: no PGRST to platform DB |
| 3 | same — ZIP bundle artifacts in `prepareExportBundle` | Export → open ZIP → see README / `.env.example` |
| 4 | same — prompt contains env doc rules | New backend build → `.env.example` in file tree |
| 5 | same — DB row beats localStorage in resolver | Re-run `schema.sql` → Save settings → reload on second browser |
| 6f | `agent-procedure-brief.test.ts` | Vague prompt → discovery; **Approve brief & build** → codegen |
| 6a | `runPreviewPreflight` in smoke tests | Auto-fix / post-wave: nested router unwrap without tokens |
| 6d | `mergeWaveNextPaths` in smoke tests | After wave: terminal shows audit-merged queue |
| 6e | `wave-completeness.test.ts` | Final wave targets hollow “Coming soon” screens |
| 6c | `previewAllowsNextWave` in smoke tests | Preview error mid-build → no auto next wave |
| Preview v2 | Sandpack chunk lazy-loaded | Preview **Draft** (iframe) default; **Live** = export Sandpack |
| Verify bundler | `preview-verify-flag.test.ts` | Set `VITE_BUILD_VERIFY_BUNDLER=1` — verify uses Sandpack, iframe UI unchanged |
| 7a | `ship-checklist.test.ts` | Export → **Ship checklist** → Copy SQL / Copy for Vercel |
| 7b | `validateRunnableExportBundle` smoke | GitHub push = ZIP bundle; README explains clone + `.env` |
| 7c | `export-deps.test.ts` smoke | Partial agent `package.json` gains missing deps at export |
| 8a | `parse-model-json.test.ts` | Truncated model JSON still applies complete `files[]` entries |

Full suite: `npm test` · Fix smoke only: **`npm run test:fixes`**

---

## Incremental fix roadmap (one problem at a time)

| Step | Status | Scope |
|------|--------|--------|
| **1** | **Done** (2026-10-01) | Persist builder **Supabase (optional)** URL + anon key per `projectId`; restore on project switch. |
| **2** | **Done** (2026-10-01) | Default preview inject: **empty** Supabase unless Step 1 saved values exist (no platform `VITE_*` in iframe). |
| **3** | **Done** (2026-10-01) | Export/GitHub post-process: `.env.example`, README, minimal Vite scaffold when missing (`prepareExportBundle`). |
| **4** | **Done** (2026-10-01) | Prompt contract: agent must emit `.env.example` + `README.md` when using `VITE_*` / schema. |
| **5** | **Done** (2026-10-01) | Per-project preview Supabase on `projects` + guest `localStorage` record; cloud sync on Save settings. |
| **6f** | **Done** (2026-10-01) | Stricter discovery + **Approve brief & build**; Build respects brief gate; UI explains. |
| **6c** | **Done** (2026-10-01) | No auto-continue waves unless preview is **live**. |
| **Preview v2** | **Pilot** (2026-10-01) | Sandpack bundler preview (export scaffold) — toggle **Bundler** in preview; default iframe draft. |
| **7a** | **Done** (2026-10-01) | Export **Ship checklist**: SQL / env copy, Vercel steps, preview vs prod note. |
| **6a** | **Done** (2026-10-01) | Deterministic **pre-flight** before verify / LLM auto-fix (`runPreviewPreflight`). |
| **6d** | **Done** (2026-10-01) | **Wave queue**: merge model `next_paths` + local audit (missing imports). |
| **6e** | **Done** (2026-10-01) | **Stub completeness**: detect hollow screens; target on later/final waves. |
| **7b** | **Done** (2026-10-01) | **GitHub = runnable source bundle** (`.gitignore`, `vercel.json`, validate + UX copy). |
| **7c** | **Done** (2026-10-01) | Export **package.json merge**: scan imports + fill deps/scripts (keep agent name/deps). |
| **8a** | **Done** (2026-10-01) | **JSON recovery**: shared `parseModelJson` (client + `/api/ai/generate`). |
| 6+ | Not started | One-click Vercel; auto-fix budget (see open issues below). |

---

## Open issues

### 2026-09-30 — Generated apps: no env / runbook / runnable export (`P0`–`P1`)

**Source:** Product review (agent behavior vs user expectations)

**Symptoms**

- Agent builds multifile apps that reference `VITE_*` (especially Supabase) but export does not include `.env.example`, setup README, or a full Vite scaffold.
- Non-technical users cannot go from preview → “works on my machine” or hosted app without engineer intervention.

**Root causes (code)**

| Area | What happens |
|------|----------------|
| ~~`src/lib/generation-prompt.ts`~~ | ~~No env doc requirement~~ **Fixed Step 4:** `ENV_DOCS_RULES` in system prompt (+ wave hints). Export still backfills via Step 3 if model skips. |
| ~~`src/pages/app/ExportPage.tsx`~~ | ~~ZIP = VFS only~~ **Fixed Step 3:** ZIP uses `prepareExportBundle` (additive artifacts). |
| ~~`src/services/github-service.ts`~~ | ~~package.json only~~ **Fixed Step 3:** push uses same bundle helper. |
| `public/preview-sandbox.html` | Injects `import.meta.env` via `window._import_meta_mock` from iframe `postMessage` — not from a project `.env`. |
| ~~`src/pages/app/ProjectBuilder.tsx`~~ | ~~Preview defaulted to platform `VITE_*`~~ **Fixed Step 2:** iframe gets empty env until user saves project preview Supabase (Step 1). |

**Risk**

- ~~Preview uses platform Supabase env~~ **Mitigated (Step 2)** for default path; user must opt in via AI Settings + Save.
- Demo localStorage path masks missing ops until export.

**Direction (not implemented)**

- ~~Per-project preview Supabase on `projects`~~ **Done Step 5** (`preview_supabase_url`, `preview_supabase_anon_key`).
- ~~Export bundle + prompt env docs~~ **Done Steps 3–4**.
- ~~Ship checklist on Export~~ **Done 7a** — `ship-checklist.ts` + Export page panel.

---

### 2026-09-30 — Agent “incompetence” vs Cursor / Lovable (`P1`)

**Source:** Architecture comparison

**Symptoms**

- Incomplete “standard” apps (stubs, broken preview, user must type “continue”).
- Poor recovery; feels unlike IDE agents or hosted builders.

**Root causes**

| Cursor / mature builders | ShipKernel today |
|--------------------------|------------------|
| Tool loop: read, edit, **run terminal / tsc / tests** | **One LLM call per wave** → JSON with `files[]` → apply VFS → iframe Babel preview |
| Full repo context | **Token-budgeted**, truncated VFS (`buildSmartVfsContext`, `waveBudget` in `src/lib/complexity.ts`) |
| Real `npm` / hosting stack | Sandbox: vendored React, Babel in iframe, limited deps (`public/preview-sandbox.html`) |
| Many retries until green | `AUTO_FIX_MAX = 2` in `ProjectBuilder.tsx`; then user follow-up (“continue”, “?”) |

**Related**

- **Build mode skips plan** (`shouldPlanFirst` in `src/lib/agent-procedure.ts`) → vague first prompts go straight to generation.
- **Standard** scale: **2 waves**; **simple**: **1 wave** — prompt allows “Coming soon” stubs in wave 1 (`generation-prompt.ts`).
- System prompt stacks conflicting goals (unique design, anti-slop, token economy, demo backend, voice/mood) → model tradeoffs.
- JSON-as-protocol: truncated/malformed JSON → mid-step failure with partial VFS.
- Preview verify: ~5s (+2.6s) wait; timeout still keeps files (`waitForPreviewOutcome`).

**Mitigations already in repo**

- `src/lib/agent-intelligence.ts` — error paths, nested router fixes, diagnosis for fix prompts (band-aid, not a tool loop).
- **Step 6a** — `runPreviewPreflight()` runs diagnosis + local repairs (routers, default exports, guarded missing-module stubs) after each build wave and **before** auto-fix LLM calls.
- **Step 6d/6e** — `wave-completeness.ts` merges `next_paths` with missing-import + hollow-stub audit; later waves get explicit priority targets.

---

### 2026-09-30 — Non-technical users cannot use the “end result” (`P0`)

**Source:** Product review

**Symptoms**

- User expects a shareable/live app; gets source fragments and dev concepts.

**Gaps**

| Expectation | Reality |
|-------------|---------|
| Hosted URL | Preview is iframe only; `ExportPage` states one-click Vercel **not wired** |
| Working auth/data | Demo localStorage / optional Supabase; OTP/email flows discouraged in prompt but models still slip |
| Deploy | GitHub push + manual Vercel; ZIP often not `npm run dev` ready |
| Errors | Terminal/stack traces; not guided “fix checkout step” UX |
| Modes / BYOK / credits | Builder assumes technical choices |

**Marketing note:** `README.md` oversells vs export/deploy path (`P3` trust).

---

## Fixed / closed

_(Move items here when resolved; keep one-line summary + PR/commit link.)_

### Step 1 — Builder Supabase preview settings persisted (`P1`) — **DONE 2026-10-01**

**Problem:** AI Settings dialog had Supabase URL/key fields, but **Save settings** only wrote provider API keys; values were lost on reload and were not scoped per project.

**Fix (verified):**

- `src/lib/project-preview-env.ts` — `readProjectPreviewEnv` / `writeProjectPreviewEnv` (`localStorage` key `shipkernel_project_preview_env:<projectId>`).
- `src/pages/app/ProjectBuilder.tsx` — `useEffect([projectId])` restores saved values via `resolveProjectPreviewEnv`; `onSettingsSave` calls `writeProjectPreviewEnv` when `projectId` is set.
- `src/test/project-preview-env.test.ts` — unit tests (round-trip, trim).

**Verification:** `npm test` passes (includes `project-preview-env.test.ts`). Manual: save Supabase fields → reload → values remain; switch project → each project’s saved pair loads independently.

**Not in scope for Step 1:** export bundle, prompt changes, Supabase columns on `projects` (Step 5).

### Step 2 — No platform Supabase in generated-app preview (`P0`) — **DONE 2026-10-01**

**Problem:** When a project had no saved preview Supabase settings, the builder injected **ShipKernel’s** `VITE_SUPABASE_*` into the iframe. Generated apps could treat `hasBackend === true` and call the **platform** Supabase (wrong DB, missing tables).

**Fix (verified):**

- `src/lib/project-preview-env.ts` — `resolveProjectPreviewEnv(projectId)` returns saved pair or `{ url: "", anonKey: "" }` (never reads `import.meta.env`).
- `src/pages/app/ProjectBuilder.tsx` — initial state `""`; `useEffect([projectId])` uses `resolveProjectPreviewEnv` only.

**Verification:** `npm test` (`resolveProjectPreviewEnv` cases). Manual: new project without saved Supabase → preview postMessage uses empty URL/key → generated `lib/supabase.ts` should set `hasBackend` false / demo path. ShipKernel app auth (`integrations/supabase/client.ts`) unchanged.

**Not in scope for Step 2:** DB-backed project config (Step 5).

### Step 3 — Export / GitHub bundle artifacts (`P0`–`P1`) — **DONE 2026-10-01**

**Problem:** Download ZIP and GitHub push shipped **raw VFS only** — no `.env.example`, README, or runnable Vite shell.

**Fix (verified):**

- `src/lib/export-bundle.ts` — `prepareExportBundle()` / `collectViteEnvKeys()`; **never overwrites** existing paths; merges missing keys into existing `.env.example`.
- `src/pages/app/ExportPage.tsx` — ZIP built from bundled map.
- `src/services/github-service.ts` — push uses bundled map (removed duplicate inline `package.json` block).
- `src/test/export-bundle.test.ts` — unit tests.

**Verification:** `npm test`. Manual: Export → ZIP contains `README.md`, `.env.example`, `package.json`, `vite.config.ts`, `index.html`, `main.tsx`, `tsconfig.json` when absent from workspace.

**Not in scope for Step 3:** in-app Ship checklist; Vercel one-click.

### Step 4 — Agent prompt: env docs in workspace VFS (`P1`) — **DONE 2026-10-01**

**Problem:** Step 3 added README/`.env.example` only at **download/push** time. The **workspace** (file tree, GitHub if someone copies VFS manually) still lacked env runbooks unless the model invented them. Users editing in builder never saw `.env.example` / README as first-class artifacts.

**Fix (verified):**

- `src/lib/generation-prompt.ts` — `ENV_DOCS_RULES` appended to system instruction; wave 1 / harden waves mention syncing `.env.example` + `README.md`.
- `src/test/generation-prompt-env.test.ts` — asserts contract text is present.

**Verification:** `npm test`. New builds with Supabase/`VITE_*` should include docs in VFS; Step 3 remains fallback if the model omits files.

| Date | Issue | Resolution |
|------|--------|------------|
| 2026-10-01 | Step 1: builder Supabase not persisted | See Step 1 subsection above. |
| 2026-10-01 | Step 2: platform `VITE_*` leaked into preview | See Step 2 subsection above. |
| 2026-10-01 | Step 3: export missing env/run scaffold | See Step 3 subsection above. |
| 2026-10-01 | Step 4: agent did not emit env docs in VFS | See Step 4 subsection above. |
| 2026-10-01 | Step 5: preview Supabase only in browser | See Step 5 subsection below. |

### Step 5 — Per-project preview Supabase in database (`P1`) — **DONE 2026-10-01**

**Problem:** Step 1 stored preview Supabase URL/key only in **browser `localStorage`**. Signed-in users lost settings on another device/browser; nothing in `projects` reflected the generated app’s backend target.

**Fix (verified):**

- `supabase/schema.sql` — `preview_supabase_url`, `preview_supabase_anon_key` on `public.projects` (RLS unchanged).
- `src/integrations/supabase/types.ts` — typed columns.
- `src/lib/project-preview-env.ts` — `previewEnvFromRecord`, `resolveProjectPreviewEnvFromSources` (row → localStorage fallback).
- `src/pages/app/ProjectBuilder.tsx` — load on project fetch; Save settings writes guest local project or Supabase `update` (graceful if columns not migrated yet).
- `src/hooks/use-projects.tsx` — guest `LocalProject` fields.

**Ops:** Re-run [`supabase/schema.sql`](../../supabase/schema.sql) on existing Supabase projects.

**Verification:** `npm test`. Manual: signed-in → set preview Supabase → Save → reload; optional second browser after SQL migration.

**Not in scope:** encrypting anon keys at rest; separate Supabase project per user auto-provisioning.

### Step 6a — Deterministic preview pre-flight before LLM (`P1`) — **DONE 2026-10-01**

**Problem:** Auto-fix burned tokens on crash classes the sandbox already diagnoses locally (nested routers, missing default export, obvious missing files). Waves could verify a broken tree when a zero-token patch would suffice.

**Fix (verified):**

- `src/lib/agent-intelligence.ts` — `runPreviewPreflight()` orchestrates `diagnoseWorkspace`, router unwrap, default-export repair, and guarded missing-module stubs (module-not-found errors only, max 2).
- `src/pages/app/ProjectBuilder.tsx` — pre-flight after each wave write (before iframe verify); before build waves when prior preview errors exist; auto-fix runs full pre-flight and skips the model when preview goes live.

**Verification:** `npm test` (`agent-intelligence.test.ts`, `fix-roadmap-smoke.test.ts` Step 6a). Manual: nested `MemoryRouter` in a page → build/auto-fix should unwrap without a model call when preview recovers.

**Not in scope:** full TypeScript compile check; unlimited stub files; replacing the 2-attempt LLM auto-fix budget.

### Step 6d / 6e — Wave queue + stub targeting (`P1`) — **DONE 2026-10-01**

**Problem:** Models often returned empty or incomplete `next_paths`, so wave 2+ lacked concrete targets and “Coming soon” placeholders survived the final wave. Users typed **continue** to finish obvious gaps.

**Fix (verified):**

- `src/lib/wave-completeness.ts` — `auditWorkspaceCompleteness`, `mergeWaveNextPaths`, `buildWaveTargetPaths`, `isHollowStubContent`, `hasRemainingStubWork`.
- `src/pages/app/ProjectBuilder.tsx` — each wave gets a **priority path** block in the prompt; VFS context pins audited targets; post-wave `nextPaths` merges model + local queue; chat nudge when the plan ends but stubs/imports remain.

**Verification:** `npm test` (`wave-completeness.test.ts`, smoke Step 6d). Manual: 2-wave standard build → wave 1 stubs → wave 2 prompt lists hollow paths; terminal may log `Wave queue + audit: …`.

**Not in scope:** auto-adding extra waves beyond scale budget; replacing user **continue** for optional polish.

---

## How to add an entry

```markdown
### YYYY-MM-DD — Short title (`P0`–`P3`)

**Source:** …

**Symptoms** …

**Root causes** …

**Direction / fix** …
```
