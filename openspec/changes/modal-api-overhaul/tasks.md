## 1. Prerequisites

- [x] 1.1 Confirm `ssr-safe-store` is fully applied: registry is application-scoped and injected, server-render
      detection exists, and `pnpm test:unit run` is green
- [x] 1.2 Wire up type testing properly. The `modal-typing` requirements are compile-time assertions, and
      vitest 0.34 runs those as a separate mode rather than as part of `vitest run`, so all four of these are
      needed:
      - a `test.typecheck` block in `vitest.config.ts` with `checker: 'vue-tsc'` — needed because the
        single-file-component scenario imports a `.vue` fixture and the default `tsc` checker cannot parse one
      - type tests named `*.test-d.ts`, which is what the typecheck `include` default matches
      - a `test:types` script (`vitest typecheck --run`), since `pnpm test:unit run` will not execute them
      - negative assertions written as `@ts-expect-error` rather than raw errors, so `pnpm type-check` — which
        covers the whole repo through `tsconfig.vitest.json` — stays green

## 2. Store shape

- [x] 2.1 Extend `ModalState` with optional per-modal `preset`, `openPropName`, and `openEventName`
- [x] 2.2 Replace `slots?: any` with a typed slot record of name to slot function
- [x] 2.3 Add internal pending-result tracking to `ModalState` so a modal can hold at most one unsettled
      `openAsync()` resolver

## 3. Shared internals

- [x] 3.1 Widen the internal `closeModal(registry, id)` from `ssr-safe-store` to
      `closeModal(registry, id, result?)`, so one function resets props, settles any pending `openAsync()`, and
      clears the open state. Do not add reset and settle as two helpers that four call sites must remember to
      pair — that is a worse version of the duplication this change exists to remove
- [x] 3.2 Add a config resolver taking a modal entry and the injected defaults, returning the open prop and
      event names, applying the precedence explicit pair > per-modal preset > application default, and
      throwing an error naming the modal id when nothing resolves. A `preset` absent from the preset table
      counts as nothing resolving: `presetConfigurations[bogus]` is `undefined`, and reading `.openPropName`
      off it throws an unhelpful `TypeError` instead. `install()` has the same hole today, and per-modal
      resolution multiplies where it can happen
- [x] 3.3 Confirm all four close paths go through `closeModal`: `close()`, the provider `handleUpdate()`,
      `closeAllModals()` on the handle, and `useModalManager().closeAll`. Settling when nothing is pending must
      be a no-op

## 4. useModal — props lifecycle

- [x] 4.1 Take `initialProps` as a shallow copy `{ ...options.props }` at registration instead of aliasing
      `props`
- [x] 4.2 Route `close()` through `closeModal` from 3.1
- [x] 4.3 Restore the snapshot as a fresh copy, `{ ...initialProps }`, not by assigning `initialProps`
      itself. Assigning it makes the live props object *be* the snapshot after the first close, so the next
      in-place mutation corrupts it and reset silently stops working from the second cycle on
- [x] 4.4 Verify `open({ props })` still merges over current props and does not mutate the snapshot
- [x] 4.5 Mark the props snapshot and the slots record raw before they enter the reactive registry. A component
      reference passed as a prop is otherwise handed back as a reactive proxy and Vue logs "received a Component
      that was made a reactive object" — latent today, likely once props are checked and slots render

## 5. useModal — async open

- [x] 5.1 Add `openAsync()` returning a promise that settles when the modal closes; leave `open()` returning
      `void`. It fires `onOpen` exactly as `open()` does — and move that call inside the entry-existence guard
      while you are there, since today it fires even when the entry does not exist
- [x] 5.2 Add an optional result argument to `close(result?)` that settles the pending promise
- [x] 5.3 Settle with `undefined` when the modal closes via its own event, via `closeAll()` /
      `closeAllModals()`, or when the owning component unmounts. The first three fall out of 3.1 for free;
      unmount is the one that needs its own call, in the existing `onBeforeUnmount`
- [x] 5.4 Settle the prior promise with `undefined` when `openAsync()` is called while already open, then
      return a fresh promise
- [x] 5.5 Make `openAsync()` resolve immediately with `undefined` during a server render without opening the
      modal
- [x] 5.6 Audit every settlement path and confirm no code path can reject

## 6. useModal — per-modal configuration

- [x] 6.1 Accept `preset`, or `openPropName` + `openEventName`, in `UseModalOptions` and store them on the
      registry entry
- [x] 6.2 Make plugin options optional in `VueModalManager.install()` while keeping registry creation mandatory

## 7. ModalProvider rewrite

- [x] 7.1 Convert `ModalProvider` from an SFC template to a render function
- [x] 7.2 Render each modal with `h(component, resolvedProps, slots)`, forwarding slot functions with no
      wrapper element
- [x] 7.3 Resolve prop and event names per modal via the resolver from 3.2 instead of the provider-level
      `inject()` throw
- [x] 7.4 Keep the event-to-listener conversion, including the already-prefixed `on` case
- [x] 7.5 Route `handleUpdate` through `closeModal` from 3.1, which resets props and settles any pending
      `openAsync()` with `undefined` in one call
- [x] 7.6 Preserve the default slot passthrough that wraps application content, including its position:
      modals render before it today, and a render function returning the array in the other order would
      silently change DOM order and stacking, and break the hydration-parity requirement

## 8. Types

- [x] 8.1 Add the hand-rolled `ComponentProps<T>` utility, since Vue exports no equivalent. Its unresolved
      branch is `Record<string, any>`, not `never`: `Partial<never>` is `never`, and `any` is assignable to
      every type except `never`, so a `never` fallback makes `props: {...} as any` fail with `Type 'any' is not
      assignable to type 'never'` — killing the documented escape hatch exactly where it is needed
- [x] 8.2 Type `component` as `T` rather than `Component` so the generic is inferred from the value
- [x] 8.3 Replace `props?: ExtractPropTypes<ComponentType>` with the inferred partial props type, at both
      `useModal()` and `open()` / `openAsync()`
- [ ] 8.4 Type the per-modal configuration options so a partial explicit pair is rejected. A plain union of
      `{}` / `{ preset }` / `{ openPropName, openEventName }` does **not** do this — TypeScript
      excess-property check against a union admits a property present in any constituent, so a call supplying
      `openPropName` alone type-checks clean. Each member needs its siblings closed off with `?: never`, and
      the resulting shape must be re-checked to confirm `T` still infers from `component` through it
- [ ] 8.5 Relate the `openAsync()` resolution type to the `close(result?)` argument type, widened with
      `undefined`. The result type cannot be inferred from `options`, so it needs a second type parameter —
      which **must** carry a default, or `useModal<typeof NModal>({ ... })` fails with "Expected 2 type
      arguments, but got 1" and contradicts the `modal-typing` scenario that keeps a single explicit type
      argument working. `src/App.vue` and `docs/api/composables.md` both write it that way today. Note the
      default also decides what the "resolution includes `undefined`" scenario can assert: with
      `unknown`, `unknown | undefined` collapses to `unknown` and the assertion becomes vacuous
- [ ] 8.6 Confirm `pnpm type-check` passes and `dist/index.d.ts` still emits as a single flat declaration.
      `UseModalOptions` becomes a union `type` rather than an `interface`, so verify the api-extractor rollup
      flattens it intact
- [x] 8.7 Omit `key` and `ref` from the inferred props. The provider supplies its own `:key` per entry, so a
      `key` arriving through `props` is spread into the same binding and fights it, and a `ref` would register
      a template ref for markup the consumer never wrote. Keep `class`, `style`, and the `onVnode*` hooks —
      passing those is meaningful and `src/App.vue` passes `style` today

## 9. Specification tests

- [ ] 9.1 `modal-rendering`: modal rendered once with resolved open prop; props bound; wrapped content still
      renders, in the same position relative to the modals as before the rewrite
- [ ] 9.2 `modal-rendering`: `update:show` becomes `onUpdate:show`; an already-prefixed name is unchanged
- [ ] 9.3 `modal-rendering`: precedence — explicit pair beats per-modal preset beats application default
- [ ] 9.4 `modal-rendering`: two UI kits coexist in one application
- [ ] 9.5 `modal-rendering`: unresolvable configuration errors naming the modal id, and a `preset` absent
      from the preset table raises that same error rather than a `TypeError`
- [ ] 9.6 `modal-rendering`: plugin installs with no options when modals self-configure
- [ ] 9.7 `modal-rendering`: default and named slots render; slot functions forwarded unwrapped; no-slots case
- [ ] 9.8 `modal-lifecycle`: open merges props; snapshot uncorrupted; reset restores it, including across a
      second open/close cycle after an in-place mutation — the case that fails if restore aliases the snapshot
- [ ] 9.9 `modal-lifecycle`: handle-close and self-close reset identically; `resetPropsOnClose: false` retains
- [ ] 9.10 `modal-lifecycle`: `openAsync()` resolves with the `close(result)` value, and `undefined` for every
      other close path
- [ ] 9.11 `modal-lifecycle`: `closeAll()`, unmount, and reopen all settle pending promises with `undefined`;
      a plain `open()` during a pending promise leaves it pending until the eventual close
- [ ] 9.12 `modal-lifecycle`: no settlement path rejects; dismissal resolves
- [ ] 9.13 `modal-lifecycle`: `openAsync()` during a server render resolves immediately and leaves the modal
      closed
- [ ] 9.14 `modal-typing`: props inferred with no explicit type argument; explicit argument still accepted
- [ ] 9.15 `modal-typing`: unknown prop rejected at registration and at open; wrong value type rejected
- [ ] 9.16 `modal-typing`: props partial at every call site, including a component with required props
- [ ] 9.17 `modal-typing`: `openAsync()` resolution includes `undefined`; `open()` is not a promise
- [ ] 9.18 `modal-typing`: valid preset accepted, unknown preset rejected, half an explicit pair rejected
- [ ] 9.19 `modal-typing`: a component whose props type cannot be resolved stays usable, and an `as any` props
      object type-checks for both a resolvable and an unresolvable component
- [ ] 9.20 `modal-typing`: a `style` prop still type-checks, since `$props` carries the standard component
      attributes, while `key` and `ref` are rejected
- [ ] 9.21 `modal-lifecycle`: `onOpen` fires once for `openAsync()`, and does not fire when the registry entry
      no longer exists

## 10. Documentation and changelog

- [ ] 10.1 Document `slots` in `docs/api/composables.md`, including the slot-function shape
- [ ] 10.2 Document `resetPropsOnClose`, and state that reset is shallow — nested objects are shared with the
      snapshot and are not restored
- [ ] 10.3 Document `closeAllModals` on the handle alongside `useModalManager().closeAll`
- [ ] 10.4 Document `openAsync()` and `close(result?)`, stating in the first sentence that the promise resolves
      when the modal **closes**, not when it opens, since the name does not convey this
- [ ] 10.5 Document the settlement table: result, dismissal, close-all, unmount, server render, reopen
- [ ] 10.6 Document per-modal `preset` / `openPropName` / `openEventName` and the precedence order, with a
      two-UI-kit example
- [ ] 10.7 Correct the `UseModalReturnType` and `UseModalOptions` signatures in the API reference, which are
      currently out of date
- [ ] 10.8 Complete `docs/migration/0-1-0.md`, created in `ssr-safe-store`, with the breaks owned by this
      change: `props` now type-checked (the headline), `slots` now rendering, and top-level props now
      resetting on close
- [ ] 10.9 Give the props-typing section a worked before/after, and document the `props: {...} as any` escape
      hatch that unblocks a build while the real prop errors are fixed one at a time
- [ ] 10.10 Add a summary table at the top of the guide listing every break with a "does this affect me?"
      column, so a reader can triage without reading the whole page
- [ ] 10.11 Verify the migration guide resolves from both the sidebar and the nav in `pnpm docs:dev`, and that
      every code sample in it type-checks against the shipped `0.1.0` types
- [ ] 10.12 Create `CHANGELOG.md` at the repo root in Keep a Changelog format, newest version first
- [ ] 10.13 Write the `0.1.0` entry covering both this change and `ssr-safe-store`, grouped into Added /
      Changed / Fixed with every breaking item explicitly marked, and link `docs/migration/0-1-0.md` from the
      top of the entry rather than restating it
- [ ] 10.14 State that versions before `0.1.0` are not backfilled, pointing readers at the annotated tags
      `v0.0.2` through `v0.0.11`
- [ ] 10.15 Verify `CHANGELOG.md` actually ships: `package.json` declares `files: ["dist"]`, and npm's
      always-included set covers `package.json`, README, and LICENSE but not reliably a changelog. Run
      `npm pack --dry-run`, inspect the file list, and add `CHANGELOG.md` to `files` if it is absent
- [ ] 10.16 Add a short "Upgrading to 0.1.0" section to `README.md` linking the migration guide. The npm
      package page renders the README and not the changelog, so this is the only upgrade signal an npm
      visitor sees
- [ ] 10.17 Add a changelog step to `.agents/skills/release/SKILL.md`, before the version bump, so the entry
      is written as part of every release rather than only this one
- [ ] 10.18 Run `pnpm skills:sync` to mirror the release skill into `.claude/skills/`, then confirm
      `pnpm skills:check` reports no drift
- [ ] 10.19 Update `AGENTS.md`, which every coding agent reads first and which this change falsifies in three
      places: the Architecture description of `ModalProvider` injecting both keys and throwing a doc-link error
      if either is missing, the "Known gap: `UseModalOptions.slots`" note, and the Props lifecycle paragraph
      stating that reset exists in two places and changes usually need both
- [ ] 10.20 Fix the package name in the `<ModalProvider>` import sample in `docs/getting-started.md`, which
      names a package that does not exist. Unrelated to this change, but it is the first code sample a new
      reader runs and this change is already editing the docs around it

## 11. Playground

- [ ] 11.1 Update `src/App.vue` so its currently-inert `default` slot is a live assertion that slots render
- [ ] 11.2 Add a second modal from a different UI kit, or a custom component with its own `openPropName`, to
      exercise per-modal configuration
- [ ] 11.3 Add a confirm-dialog example exercising `openAsync()` with `close(result)` wired through props

## 12. Verification

- [ ] 12.1 `pnpm lint` and `pnpm format` clean
- [ ] 12.2 `pnpm type-check` passes
- [ ] 12.3 `pnpm test:unit run` fully green, and the type-test script separately green — type tests are a
      distinct vitest mode and will not run as part of `test:unit`
- [ ] 12.4 `pnpm build` emits all four files and `exports` still resolves for both ESM and CJS consumers
- [ ] 12.5 `pnpm docs:dev` builds with no broken links
- [ ] 12.6 Confirm `CHANGELOG.md` is present in `npm pack --dry-run` output and that the `0.1.0` entry is
      complete before tagging
- [ ] 12.7 Release `0.1.0` following the updated `release` skill, covering both this change and
      `ssr-safe-store`
