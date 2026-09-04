## Why

`src/lib/store.ts` exports a single module-level `reactive<Record<string, ModalState>>({})`. Under SSR that
module is evaluated once per Node process and shared by every concurrent request, while `onBeforeUnmount` —
the only thing that removes entries — never fires during server rendering. Every server-rendered `useModal()`
call therefore appends an entry that is never reclaimed: server memory grows monotonically for the process
lifetime, every page server-renders every prior request's modals, and the resulting server/client divergence
guarantees hydration mismatches. With explicit `id`s the leak is bounded but becomes cross-request data bleed,
since `props` is exactly where user-specific data lives.

The library is otherwise SSR-clean (no `window`/`document`/`localStorage` anywhere in `src/lib`), so the store
is the single blocking defect. It is also the foundation every other planned change builds on, which makes it
the right thing to land first and independently.

## What Changes

- **BREAKING** The modal registry moves from a module-level singleton to app-scoped state created by
  `VueModalManager.install()` and reached through a new injection key. `createApp()` runs per request under
  SSR, so each request gets its own registry.
- **BREAKING** `useModal()` must now be called from within a component `setup()`. It reads the registry via
  `inject()`, so calls from a Pinia store, a router guard, or module scope now fail loudly instead of
  half-working.
- **BREAKING** `peerDependencies.vue` moves from `^3.3.0` to `^3.5.0` to make Vue's SSR-stable `useId()`
  available.
- Auto-generated modal ids come from `useId()` instead of `uuid`, so an id agrees between the server and
  client render of the same component.
- Duplicate explicit `id`s emit a development-only warning. Two `useModal()` callers sharing one id silently
  clobber each other's state today, and the first to unmount deletes the entry out from under the second.
- Global close-all becomes reachable without a per-modal handle via a new `useModalManager()` composable
  returning `{ closeAll }`. It must be a composable rather than a bare exported function because reaching the
  registry requires `inject()`. The existing `closeAllModals` on the `useModal()` return value is retained
  unchanged as a documented alias, so nothing breaks.
- `close()` stops throwing when called after its entry was removed. It writes `modals[id].props` before
  checking that `modals[id]` exists, so calling `close()` post-unmount is a `TypeError` today.
- The three code paths that close a modal — `close()`, the provider `handleUpdate()`, and close-all — collapse
  into one internal `closeModal(registry, id)`. Prop reset is already duplicated across two of them in
  non-equivalent forms, and the follow-up change adds promise settlement to all three.
- A vitest suite covers the registry and its SSR behaviour. Vitest is fully configured (jsdom,
  `vitest.config.ts`) and the repo currently contains zero test files, so every behavioural change in this
  change and the next one lands with no safety net.
- `uuid` is dropped from the bundle. It exists only to generate ids and was deliberately bundled to keep the
  package dependency-free; `useId()` removes the need.

## Capabilities

### New Capabilities

- `modal-registry`: How modal state is stored, scoped, and keyed — app-scoped registry creation, registration
  and removal lifecycle, id assignment and duplicate-id handling, and the global close-all operation.
- `ssr-rendering`: How the library behaves when rendered on a server — per-request state isolation, id
  stability across the server/client boundary, hydration parity, and the absence of browser-only globals.

### Modified Capabilities

None. `openspec/specs/` is empty; this change introduces the project's first specs.

## Impact

Affected code:

- `src/lib/store.ts` — singleton replaced by a registry factory and its type; the registry also carries the
  server-render flag, and the shared internal `closeModal` path lands here
- `src/lib/injection-keys.ts` — new `MODAL_STORE` injection key
- `src/lib/index.ts` — `install()` creates and provides the registry and resolves the server-render flag;
  `useModalManager` joins the export surface
- `src/lib/composables/use-modal.ts` — injects the registry, `useId()` for ids, duplicate-id warning,
  `close()` ordering fix, `open()` inert on the server and after unmount
- `src/lib/components/ModalProvider.vue` — injects the registry instead of importing it
- `package.json` — `peerDependencies.vue` and `devDependencies.vue` both bumped, `@vue/server-renderer` added
  pinned to the `vue` version, `uuid` and `@types/uuid` removed
- `vitest.config.ts` — the global `jsdom` environment has to be overridden per file for the SSR specs, or
  every "no DOM globals" scenario passes vacuously
- `vite.config.ts` — the `uuid`-is-bundled comment on `rollupOptions.external` becomes false
- `AGENTS.md` — falsified in three places by this change: the "Single global registry" paragraph under
  Architecture, "**`uuid` is bundled on purpose** — keep it in `devDependencies`" under Build & packaging, and
  "There are currently no test files in the repo" under Commands. It is the first file every coding agent
  reads, so a stale entry there misleads more than stale prose docs
- `.agents/skills/release/SKILL.md` and its `.claude/skills/` mirror — step 2 tells the releaser to
  "sanity-check that `uuid` is still in `devDependencies`", which becomes wrong
- `scripts/sync-skills.mjs` — not anticipated when this change was written, but running the sync above would
  delete the committed `openspec-*` skills in `.claude/skills/`, which have no `.agents/` counterpart. Repo
  tooling rather than library behaviour, so it belongs in its own commit
- `docs/migration/0-1-0.md` — new shared migration guide, created here and completed by the follow-up change
- `docs/.vitepress/config.ts` — new `Migration` sidebar section and `nav` entry, plus the SSR setup page
- `docs/api/composables.md`, `docs/getting-started.md` — `useModalManager()`, the setup-only constraint, and a
  link to the migration guide

Affected APIs: `useModal()` call-site constraint (setup-only) is the one consumer-visible break. The returned
handle keeps its existing shape. One smaller behaviour change rides along: `onOpen` no longer fires when
`open()` is called on a modal whose owning component has already unmounted.

Affected dependencies: Vue peer range narrows to `^3.5.0`, and `devDependencies.vue` has to move with it — it
is `^3.3.4` today and only resolves to 3.5.42 by luck of the lockfile, so `useId()` type-checks locally while a
fresh resolution could land on 3.3.x and break `pnpm type-check`. `@vue/server-renderer` joins
`devDependencies` pinned to the same version as `vue`, since a drift between the two warns at runtime. `uuid`
and `@types/uuid` are removed entirely, so the package keeps its "no runtime dependencies beyond the Vue peer"
property with one less bundled module.

Release: consumers on `^0.0.11` receive nothing automatically — npm's caret is an exact pin below `0.1.0` — so
these breaks reach only deliberate upgraders. Both this change and the follow-up API change are intended to
ship together as `0.1.0` with a single migration note.
