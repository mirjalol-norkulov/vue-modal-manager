## Context

`src/lib/store.ts` is eleven lines: a `ModalState` type and `export const modals = reactive({})`. Every other
part of the library imports that binding directly — `use-modal.ts` writes to it, `ModalProvider.vue` iterates
it. That single module-level binding is the whole problem. In a browser there is one app per page and the
singleton is indistinguishable from correct behaviour; in Node there is one module instance per *process* and
many app instances per process.

Two properties of server rendering combine badly with it:

1. `createApp()` is called per request, but module state is not re-created.
2. Server rendering produces a string and never runs unmount lifecycle hooks, so the `onBeforeUnmount` in
   `useModal` — the only code that deletes entries — never executes.

Registration is therefore append-only on the server. Because ids default to `uuidv4()`, no key ever collides,
so nothing is overwritten and nothing is reclaimed.

Constraints the design has to respect:

- The library identity is the prop/event adapter. Nothing here should change what `ModalProvider` binds or how
  presets work — that is the next change.
- `useModal` already calls `onBeforeUnmount`, so it is already setup-only in practice. Making the registry
  injected converts an existing soft requirement into a hard one rather than inventing a new constraint.
- The package advertises no runtime dependencies beyond the Vue peer, which is why `uuid` is bundled rather
  than declared. Any id strategy must preserve that.
- There are no tests. Every requirement in this change is a behavioural claim about code with no existing
  coverage.

## Goals / Non-Goals

**Goals:**

- One registry per Vue app instance, so concurrent SSR requests cannot observe each other modal state.
- Auto-generated ids that agree between the server render and the client hydration of the same component.
- A loud, actionable failure when `useModal()` is called somewhere `inject()` cannot reach the registry.
- Global close-all reachable without holding a per-modal handle.
- A first vitest suite, covering both the browser and server paths, that the next change can build on.

**Non-Goals:**

- A Nuxt module (`vue-modal-manager/nuxt`). SSR *correctness* plus documented manual plugin setup is in scope;
  a second shipped build artifact with its own pipeline is a later change.
- Any change to `ModalProvider` prop/event binding, preset resolution, slot handling, or prop-reset semantics.
  All of that is the follow-up change.
- Supporting more than one `<ModalProvider>` per app. Two providers currently both render every registered
  modal; this change neither fixes nor worsens that.
- Server-side *opening* of modals as a feature. The server path makes `open()` inert, it does not make
  server-opened modals work.

## Decisions

### Registry created by `install()` and reached via `inject()`

`VueModalManager.install()` creates `reactive({})` and provides it under a new `MODAL_STORE` injection key.
`useModal` and `ModalProvider` both inject it.

*Alternatives considered.* **Keep the singleton and expose a reset hook** for SSR users to call per request:
rejected because correctness would depend on every consumer remembering to call it, and forgetting produces
exactly the silent leak we are fixing. **An explicit `createModalManager()` factory** passed to `app.use()`:
more testable, and it would allow several independent registries per app, but it adds a required step to every
consumer setup for a capability nobody has asked for. Provide/inject matches the plugin idiom the library
already uses for `MODAL_OPEN_PROP_NAME`, and `install()` is already mandatory, so per-request isolation
becomes automatic rather than opt-in.

### Ids from Vue `useId()`, accepting the `^3.5.0` peer bump

*Alternatives considered.* **Keep `uuidv4()`**: values differ between the server and client render of the same
component, so anything deriving output from an id diverges across hydration. **A module-level counter**:
strictly worse — the counter is itself a process-wide singleton, so request N starts where request N−1 left
off and server ids drift from the client. **An app-scoped counter stored on the registry**: correct, and it
avoids the peer bump, but it reimplements the exact primitive Vue 3.5 added for this problem and would need
its own hydration-order reasoning. `useId()` also requires a setup context, which the design already demands,
so the constraints coincide. The peer bump is nearly free right now: the npm caret is an exact pin below
`0.1.0`, so no existing consumer receives this automatically regardless.

Removing `uuid` also drops a bundled module, strengthening the no-runtime-dependencies property.

### Duplicate explicit ids warn, they do not throw

Sharing an id across components may be deliberate — several call sites reaching one modal is a plausible, if
undocumented, pattern that works today. Throwing would break it; warning surfaces the accidental case without
removing the deliberate one. The clobbering behaviour itself is left as-is.

The warning is development-only, and the gating mechanism was measured rather than assumed: both candidate
guards were compiled through this repo actual `vite build` in library mode and the emitted bundles inspected.

- `import.meta.env.DEV` is **baked to a constant and the branch eliminated**. The probe string does not appear
  anywhere in either bundle, and `import.meta.env` appears nowhere in the ESM output at all. `VITE_DOC_LINK`
  in `ModalProvider.vue` survives only because it is inlined as a literal URL string, which is the same
  mechanism seen from the other side.
- `process.env.NODE_ENV !== 'production'` **survives verbatim** in both `vue-modal-manager.js` and
  `vue-modal-manager.umd.cjs`. Vite lib mode does not replace it, so a consumer bundler gets to.

So the intended guard works, and the feared failure — a warning that can never fire — does not happen. The
measurement surfaced the opposite hazard instead. Because `process.env` survives *verbatim*, a consumer who
loads the UMD build directly in a browser with no bundler hits `process is not defined` and a `ReferenceError`
on the first duplicate id. The UMD bundle exists precisely to be self-contained, so the guard has to be
written defensively:

```ts
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production')
```

which is the same shape as the `typeof` guard the `ssr-rendering` requirement permits for `window`, and for
the same reason: reference a global that may not exist only behind an existence check.

### Global close-all is a composable, not a bare function

A plain exported `closeAllModals()` cannot work, because reaching the registry requires `inject()` and
`inject()` requires a setup context. The global operation is therefore exposed as `useModalManager()`
returning `{ closeAll }`. The existing `closeAllModals` on the `useModal` return value is retained unchanged
so no consumer breaks; it becomes a documented alias.

### One internal code path closes a modal

By the end of this change three places set `isOpen = false`: `close()` on the handle, `handleUpdate()` in the
provider when a modal closes itself, and the shared implementation behind `closeAll()` / `closeAllModals()`.
The follow-up change adds a fourth obligation to every one of them — settling a pending `openAsync()` promise
— and prop reset is *already* duplicated across the first two in two non-equivalent forms.

So all of them delegate to one internal `closeModal(registry, id)`. The follow-up change then widens that
single function to `closeModal(registry, id, result?)` and its settlement table becomes structurally true
instead of a convention applied at four call sites. Introducing the indirection here, while there is still
nothing to settle, is behaviour-preserving and cheap: `initialProps` and `options.props` are still the same
object at this point, so the two existing reset expressions collapse without changing what either did.
Retrofitting it afterwards means auditing every close path a second time.

### `open()` is inert during server rendering, and the server is detected once per app

If `open()` ran on the server, the server would emit an open modal while the client fresh registry starts
closed, producing a hydration mismatch on top of the leak. Since a server-rendered modal can never be
interacted with or closed, opening one has no meaning. `open()` therefore no-ops when rendering on the server.

Inertness is a property of the *application instance*, not of the call. `open()` is overwhelmingly called from
a click handler, which never runs on the server at all; the fact that decides inertness is "this app is being
server-rendered", and that is fixed for the lifetime of the app. So it is resolved once, in `install()`, and
stored on the registry beside the entries rather than re-checked on every call.

The check itself is `typeof window === 'undefined'`. *Alternatives considered.* **`useSSRContext()`** is the
Vue-native signal, but it is only meaningful inside a component setup during an SSR render and warns in client
dev builds, so it cannot be read at install time. **A build-time flag** (`import.meta.env.SSR`) is inlined at
*library* build time by Vite lib mode — the same trap the duplicate-id warning has to avoid — so it would bake
to a constant in the published `dist`. **An explicit `ssr: true` plugin option** puts correctness back in the
consumer hands, which is the failure mode this whole change exists to remove.

A `typeof` guard is the standard idiom and cannot throw, but it *is* a syntactic reference to `window`. The
`ssr-rendering` requirement is therefore written against unguarded *access* rather than any mention, because a
rule forbidding the mention would forbid the only workable implementation while its own scenario — no
`ReferenceError` in a bare Node environment — is satisfied by it.

`onOpen` does not fire on the inert path. It is the consumer "the modal opened" hook, and on the server the
modal did not open.

## Risks / Trade-offs

- **`useModal()` callers outside a component setup break.** → The failure is a thrown error naming the cause
  and linking the docs, not a silent misbehaviour. The constraint is already implied by the existing
  `onBeforeUnmount` call, so working code in this position already relies on undefined behaviour. Called out
  in the `0.1.0` migration note.

- **The `^3.5.0` peer range excludes Vue 3.3 and 3.4 users.** → Unavoidable given `useId()`, and cheap now:
  `^0.0.11` pins exactly, so nobody is upgraded into it by accident. Consumers who cannot move off 3.4 stay on
  `0.0.11`, which remains published.

- **The dev-only warning guard reaches a bundler-less UMD consumer as a bare `process` reference.** →
  Measured, not assumed: `process.env.NODE_ENV` survives the library build verbatim while
  `import.meta.env.DEV` is baked out. Guarded with `typeof process !== 'undefined'` so a browser-direct UMD
  consumer gets no warning rather than a `ReferenceError`. Re-verify in `dist/` after implementing, since this
  is a property of the build pipeline rather than of the source.

- **Injection makes the plugin genuinely mandatory.** → It already is in practice: `ModalProvider` throws
  today when the prop/event keys are missing. This widens *what* is missing, not *whether* setup is required.

- **Two `<ModalProvider>` instances in one app share an injected registry and each render every modal.** →
  Pre-existing behaviour, unchanged by this design, and newly easy to describe. Documented as a known
  limitation rather than fixed here.

- **SSR requirements are hard to test convincingly.** → Test with the `renderToString` from
  `@vue/server-renderer` against two sequentially created apps and assert their registries never intersect.
  This is the specific failure mode being fixed, so it is the specific thing that must be covered.

## Migration Plan

This change is not released on its own. It lands first because everything in the follow-up API change builds
on the registry shape, then both ship together as `0.1.0`.

Both changes write into one shared migration guide at `docs/migration/0-1-0.md`, created here and completed by
the follow-up change. It is a VitePress page, so it is only reachable once it is registered in both the
sidebar and the `nav` array in `docs/.vitepress/config.ts` — an unregistered page builds fine and is invisible,
which is the failure mode to avoid.

Steps for consumers upgrading `0.0.11` → `0.1.0`, for the portion owned by this change:

1. Raise `vue` to `>=3.5.0`.
2. Move any `useModal()` call that is not inside a component `setup()` into one.
3. No change required for `app.use(VueModalManager, ...)` — the existing call now also creates the registry.
4. SSR/Nuxt users: register the plugin via `defineNuxtPlugin(nuxtApp => nuxtApp.vueApp.use(...))` and place
   `<ModalProvider>` in `app.vue`. Documented as part of this change.

Rollback: `0.0.11` stays published and is what every existing `^0.0.11` range already resolves to, so rollback
is "do not upgrade".

## Open Questions

- ~~**Does a `process.env.NODE_ENV` guard survive `vite build` in library mode?**~~ Resolved by measurement
  before implementation: it survives verbatim in both bundles, while `import.meta.env.DEV` is baked to a
  constant and eliminated. See the duplicate-id decision, including the `typeof process` guard the result
  makes necessary.
- **Should `useModalManager()` eventually own more than `closeAll`** — an `isAnyOpen`, a `closeById`? Deferred;
  this change adds only what replaces existing global behaviour.
