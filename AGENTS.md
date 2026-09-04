# AGENTS.md

This file provides guidance to coding agents (Claude Code and others) when working with code in this repository.

## Commands

Package manager is pnpm (`packageManager: pnpm@11.1.2`).

```sh
pnpm dev              # Vite dev server for the demo playground (src/main.ts + src/App.vue)
pnpm build            # type-check + build-only, in parallel via npm-run-all2
pnpm build-only       # vite build (library mode) -> dist/
pnpm type-check       # vue-tsc --noEmit -p tsconfig.vitest.json --composite false
pnpm lint             # eslint --fix across the repo
pnpm format           # prettier --write src/
pnpm test:unit        # vitest (watch mode)
pnpm docs:dev         # VitePress docs site from docs/
```

Single test run: `pnpm test:unit run path/to/file.spec.ts` (add `-t "test name"` to filter by name). There are currently no test files in the repo; vitest is configured (jsdom, `vitest.config.ts` merges `vite.config.ts`) but unused.

## Repository shape

Three things live side by side:

- `src/lib/` — the published library. This is the only code that ships.
- `src/main.ts`, `src/App.vue`, `src/components/` — a throwaway demo app used as a manual playground (currently wired to naive-ui). Not published (`build.copyPublicDir: false`, `files: ["dist"]`).
- `docs/` — VitePress site published to https://vue-modal-manager.netlify.app.

## Architecture

**Single global registry.** `src/lib/store.ts` exports one module-level `reactive<Record<string, ModalState>>({})`. Every `useModal()` call inserts an entry keyed by `options.id` (uuid v4 when omitted); `ModalProvider` renders `v-for` over the whole registry. So modal state is app-global, not component-local — a duplicate `id` means two `useModal` callers share (and clobber) one entry. `useModal` deletes its entry in `onBeforeUnmount`, so it must be called inside a component `setup`.

**The prop/event adapter is the core idea.** The library never renders a modal itself; it renders whatever component you hand it and drives its open state through *configurable* prop and event names, so any third-party dialog works. The plugin (`src/lib/index.ts`) `provide`s two injection keys (`src/lib/injection-keys.ts`):

- `MODAL_OPEN_PROP_NAME` — e.g. `show`, `model-value`, `visible`
- `MODAL_OPEN_EVENT_NAME` — e.g. `update:show`

Options are either `{ preset }` (looked up in `presetConfigurations`, `src/lib/config.ts`) or explicit `{ openPropName, openEventName }`. `ModalProvider` injects both, throws a doc-link error if either is missing, converts the event name to listener form (`update:show` → `onUpdate:show`, via `capitalize` in `helpers.ts`), and `v-bind`s them as computed keys alongside `item.props`.

Adding a UI-kit preset means touching: the `ModalManagerPreset` union + `presetConfigurations` in `config.ts`, a page under `docs/third-party-integrations/`, and the sidebar in `docs/.vitepress/config.ts`.

**Props lifecycle.** `useModal` snapshots `props` into `initialProps`. `open({ props })` merges over the current props. When `resetPropsOnClose` (default `true`) the props are restored to the snapshot — this reset exists in two places, `close()` in `use-modal.ts` and `handleUpdate()` in `ModalProvider.vue` (the latter fires when the modal closes itself via its own event). Changes to reset behaviour usually need both.

Known gap: `UseModalOptions.slots` is accepted and stored in `ModalState`, but `ModalProvider` never renders it — the `<component>` has no children. The demo in `src/App.vue` passes slots that do not appear.

`VITE_DOC_LINK` (in the committed `.env`) is inlined into the `ModalProvider` setup error; it must be present at build time.

## Build & packaging

`vite.config.ts` builds in library mode from `src/lib/index.ts` → ESM (`vue-modal-manager.js`) + UMD (`vue-modal-manager.umd.cjs`). Only `vue` is external; **`uuid` is bundled on purpose** so the package has no runtime dependencies beyond the Vue peer — keep it in `devDependencies`.

Types: `vite-plugin-dts` with `rollupTypes: true` emits a single flat `dist/index.d.ts` (using `tsconfig.app.json`). An inline plugin (`emit-cts-declarations`) byte-copies it to `dist/index.d.cts` for `require()` consumers under node16/nodenext, and throws if declaration generation produced nothing. The `exports` map in `package.json` points at all four files — if you rename an output, update `exports`, `main`, `module`, and `types` together.

Path alias `@` → `./src` is defined in `vite.config.ts` and `tsconfig.app.json`; library source uses `@/lib/...` imports throughout.

## Conventions

- Prettier: no semicolons, single quotes, width 100, no trailing commas. Run `pnpm format` rather than hand-formatting.
- Releases follow the git history pattern: a conventional commit for the change (`feat:`, `fix(build):`, …), then a separate bare-version commit (`0.0.11`) carrying the `package.json` bump with an annotated `vX.Y.Z` tag.

## Critical

MUST NOT include Co-Authored-By or similar attribution lines in commit messages.
