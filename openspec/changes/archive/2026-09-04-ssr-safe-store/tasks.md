## 1. Test scaffolding

The repo has vitest configured and zero test files. Every task below this group changes behaviour, so the
harness comes first.

- [x] 1.1 Add `@vue/server-renderer` to `devDependencies`, pinned to the same version as `vue` — a drift
      between the two warns at runtime (`@vue/test-utils` is already installed)
- [x] 1.2 Create `src/lib/__tests__/helpers.ts` with a factory that builds an app, installs the plugin, mounts
      a component, and returns the injected registry for assertions
- [x] 1.3 Add an SSR helper that creates an app and renders it with `renderToString` in a Node environment
      with no DOM globals. `vitest.config.ts` sets `environment: 'jsdom'` for every test, so the SSR spec files
      must carry a `// @vitest-environment node` docblock, or be matched by `environmentMatchGlobs`. Without
      this every "no DOM globals" scenario passes vacuously under jsdom
- [x] 1.4 Write characterisation tests for current behaviour that must survive: modal registers closed, entry
      removed on unmount, `open({ props })` merges over current props, `close()` resets props when
      `resetPropsOnClose`
- [x] 1.5 Confirm `pnpm test:unit run` executes and the characterisation tests pass. Note what this can and
      cannot show: the tests reach modal state through the injected registry (`helpers.ts` → `getRegistry`),
      which does not exist before group 2, so they cannot literally be run against unmodified source. They pin
      the behaviour that had to survive the rewrite, and are verified after it

## 2. Registry and injection key

- [x] 2.1 Add `MODAL_STORE` injection key to `src/lib/injection-keys.ts`, typed for the registry
- [x] 2.2 Rewrite `src/lib/store.ts`: keep and export the `ModalState` type, replace the exported `reactive({})`
      singleton with a `createModalRegistry()` factory and a `ModalRegistry` type
- [x] 2.3 Verify no mutable modal registry remains reachable from the public entry point
      (spec: registry is not reachable as a module export). Note this already holds — `store.ts` is not
      re-exported from `src/lib/index.ts` today — so it is a regression guard rather than a change
- [x] 2.4 Create and provide the registry in `VueModalManager.install()` alongside the existing prop/event
      injections
- [x] 2.5 Add a shared internal helper that injects the registry and throws a `VITE_DOC_LINK` error naming the
      missing registry, so `useModal` and `useModalManager` fail identically
- [x] 2.6 Resolve the server-render flag once in `install()` behind a `typeof window === 'undefined'` guard and
      store it on the registry. Do not re-check per call — `open()` is normally called from a click handler
      that never runs on the server, and the fact that decides inertness is app-scoped. Do not use
      `import.meta.env.SSR`: Vite lib mode inlines it at library build time, the same trap as the
      duplicate-id warning guard
- [x] 2.7 Add the internal `closeModal(registry, id)` that every close path delegates to. Behaviour-preserving
      here, since `initialProps` and `options.props` are still the same object, and it gives the follow-up
      change one place to add `openAsync()` settlement instead of four

## 3. useModal

- [x] 3.1 Replace the direct `modals` import with the injecting helper from 2.5
- [x] 3.2 Stop writing to the caller `options` object. `options.id = uuidv4()` and
      `options.resetPropsOnClose = true` both mutate the object the consumer passed in; derive both into local
      values instead. This is observable today: one options object reused across two `useModal()` calls has an
      `id` on it by the second call, so both callers silently share and clobber a single registry entry
- [x] 3.3 Replace `uuidv4()` with Vue `useId()` for the omitted-id path; keep explicit ids verbatim
- [x] 3.4 Emit a development-only warning when an explicit id already exists in the registry, without throwing
      and without changing which entry wins. Guard it as
      `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`. Both halves are load-bearing
      and were measured against this repo build: `process.env.NODE_ENV` survives lib mode verbatim (so the
      guard works), which is exactly why the `typeof` half is needed (so a bundler-less UMD consumer does not
      hit `process is not defined`). Do not use `import.meta.env.DEV` — it bakes to a constant and the branch
      is eliminated
- [x] 3.5 Route `close()` through `closeModal` from 2.7, fixing the ordering so the entry existence check
      precedes the props write and a post-unmount `close()` is a no-op instead of a `TypeError`
- [x] 3.6 Make `open()` inert during server rendering by reading the registry server-render flag from 2.6, so
      server markup always represents modals as closed. `onOpen` does not fire on the inert path — the modal
      did not open
- [x] 3.7 Keep `closeAllModals` on the returned handle behaviourally unchanged, but route it through
      `closeModal` from 2.7 rather than writing `isOpen` directly
- [x] 3.8 Return early from `open()` when the entry is gone, so `onOpen` does not fire after the owning
      component unmounted. `close()` is hardened for this by 3.5 but `open()` was not: `onOpen` sat outside
      the entry-exists branch, so a retained handle reported that a modal opened when nothing did. Same rule
      as the inert server path in 3.6, and it matters for the follow-up change, where this is the path that
      would hand back an `openAsync()` promise with no entry left to ever settle it

## 4. ModalProvider

- [x] 4.1 Replace the `modals` import in `ModalProvider.vue` with the injected registry, throwing the same
      doc-link error from 2.5 when it cannot be injected. The provider throws today for the missing prop/event
      keys, so it must not become the one place that silently renders nothing instead
- [x] 4.2 Leave prop/event binding and preset resolution untouched — those belong to the follow-up change.
      `handleUpdate` keeps its behaviour but routes its close branch through `closeModal` from 2.7, which is
      behaviour-preserving today because `initialProps` and `options.props` are still the same object

## 5. useModalManager

- [x] 5.1 Add `useModalManager()` returning `{ closeAll }`, using the injecting helper from 2.5 and
      `closeModal` from 2.7, so it shares one close path with `close()` and `closeAllModals`
- [x] 5.2 Export it from `src/lib/index.ts` and from the composables barrel

## 6. Dependencies and build

- [x] 6.1 Bump `peerDependencies.vue` from `^3.3.0` to `^3.5.0` **and** `devDependencies.vue` from `^3.3.4` to
      `^3.5.0`. The lockfile resolves the `^3.3.4` devDependency to 3.5.42 today, so `useId()` type-checks
      locally while a fresh resolution could land on 3.3.x and break `pnpm type-check`
- [x] 6.2 Remove `uuid` and `@types/uuid` from `devDependencies` and confirm no import remains
- [x] 6.3 Run `pnpm build` and confirm `dist/index.d.ts`, `dist/index.d.cts`, and both bundles are emitted
- [x] 6.4 Re-verify the duplicate-id guard in the built bundles, since it is a property of the pipeline rather
      than of the source: `process.env.NODE_ENV` must still appear verbatim in both `vue-modal-manager.js` and
      `vue-modal-manager.umd.cjs`, and must still be reached through a `typeof process` check. Measured to
      hold before implementation; the task is to confirm the shipped output, not to rediscover it
- [x] 6.5 Confirm the built bundle no longer contains `uuid` and that `vue` remains the only external
- [x] 6.6 Update the two places that assert `uuid` is bundled on purpose: the comment on
      `rollupOptions.external` in `vite.config.ts`, and step 2 of `.agents/skills/release/SKILL.md`, which
      tells the releaser to "sanity-check that `uuid` is still in `devDependencies`"
- [x] 6.7 Run `pnpm skills:sync` to mirror the edited release skill into `.claude/skills/`, then confirm
      `pnpm skills:check` reports no drift
- [x] 6.8 Unplanned but required by 6.7: `scripts/sync-skills.mjs` pruned every `.claude/skills/` path with no
      `.agents/` counterpart, so running the sync would have deleted the four committed `openspec-*` skills
      that `openspec init` added after this script was written. Restrict pruning to skill directories that
      exist in `.agents/skills/`, and record the non-exclusive mirror in the script comment and `AGENTS.md`.
      This is repo tooling rather than library behaviour — commit it separately from the SSR change

## 7. Specification tests

- [x] 7.1 `modal-registry`: registry created per application, two applications do not share state, registry not
      exported
- [x] 7.2 `modal-registry`: `useModal`, `useModalManager`, and `ModalProvider` all throw with a doc link
      outside a setup context and without the plugin
- [x] 7.3 `modal-registry`: registration inserts one closed entry; unmount removes it; one options object
      reused across two `useModal()` calls yields two independent entries rather than one shared one
- [x] 7.4 `modal-registry`: omitted ids are unique, explicit ids used verbatim, two sibling modals get distinct
      ids
- [x] 7.5 `modal-registry`: duplicate explicit id warns, does not throw, resolves to one entry
- [x] 7.6 `modal-registry`: `closeAll` and the `closeAllModals` alias both close every modal
- [x] 7.7 `modal-registry`: `close()` after unmount does not throw, and `open()` after unmount neither throws
      nor fires `onOpen`
- [x] 7.8 `ssr-rendering`: two sequential server renders do not share entries or props
- [x] 7.9 `ssr-rendering`: fifty sequential renders each hold exactly one entry, and markup contains no foreign
      modals
- [x] 7.10 `ssr-rendering`: `open()` during a server render is inert and does not fire `onOpen`; the client
      can open after hydration
- [x] 7.11 `ssr-rendering`: auto-generated ids match between the server and client render of the same tree
- [x] 7.12 `ssr-rendering`: hydrating a provider with registered closed modals emits no mismatch warning. Use
      a plain hydration-stable stub as the modal component rather than a naive-ui dialog — the requirement
      covers the provider own output, and a teleporting third-party dialog would make the test assert someone
      else correctness
- [x] 7.13 `ssr-rendering`: import and render in Node with no DOM globals completes without `ReferenceError`,
      and installing the plugin there still marks the app as server-rendering. Runs under the Node environment
      from 1.3, not jsdom

## 8. Documentation

- [x] 8.1 Add an SSR / Nuxt setup page covering `defineNuxtPlugin(nuxtApp => nuxtApp.vueApp.use(...))` and
      `<ModalProvider>` placement in `app.vue`
- [x] 8.2 Register the new page in the sidebar in `docs/.vitepress/config.ts`
- [x] 8.3 Document `useModalManager()` in `docs/api/composables.md`
- [x] 8.4 Document that `useModal()` must be called inside a component `setup()`
- [x] 8.5 Create `docs/migration/0-1-0.md`, the `0.1.0` migration guide. Structure it as one section per
      break, each carrying a before/after snippet and a one-line "how to tell if this affects you"
- [x] 8.6 Fill in the portion owned by this change: the Vue `^3.5.0` peer requirement, and `useModal()` now
      requiring a component `setup()` context — quote the exact error a consumer will see
- [x] 8.7 Note in the guide that the modal registry was never a public export, so consumers who reached into
      `vue-modal-manager` internals for it have no supported path forward
- [x] 8.8 Add a top-level `Migration` section to the sidebar in `docs/.vitepress/config.ts` registering the
      `0.1.0` guide, shaped so later versions add siblings rather than restructuring
- [x] 8.9 Add a `Migration` entry to the `nav` array so the guide is reachable from the top bar
- [x] 8.10 Link the migration guide from `docs/getting-started.md` for readers arriving from an older version
- [x] 8.11 Note the known limitation that two `<ModalProvider>` instances in one app each render every modal
- [x] 8.12 Update `AGENTS.md`, which every coding agent reads first and which this change falsifies in three
      places: the "Single global registry" paragraph under Architecture, "**`uuid` is bundled on purpose** —
      keep it in `devDependencies`" under Build & packaging, and "There are currently no test files in the
      repo" under Commands

## 9. Verification

- [x] 9.1 `pnpm lint` and `pnpm format` clean
- [x] 9.2 `pnpm type-check` passes
- [x] 9.3 `pnpm test:unit run` fully green, and confirm the SSR specs really ran without a DOM — assert
      `typeof window === 'undefined'` inside one of them so a misconfigured environment fails loudly rather
      than passing vacuously
- [x] 9.4 `pnpm dev` playground still opens and closes a naive-ui modal
- [x] 9.5 Do not release. This change lands on `main` and ships with the follow-up change as `0.1.0`
