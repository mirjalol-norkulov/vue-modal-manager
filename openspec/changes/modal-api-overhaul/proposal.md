## Why

The library premise is that any third-party dialog works, driven through configurable prop and event names.
Three gaps sit between that premise and what ships:

The prop and event names are provided **once, application-wide**, so exactly one kind of dialog works per app.
A team migrating between UI kits, or pairing a headless custom modal with their kit, cannot express it.

`UseModalOptions.slots` is accepted, typed `any`, and stored in `ModalState` — and `ModalProvider` renders
`<component>` with no children, so slots silently vanish. The demo in `src/App.vue` passes a `default` slot
that never appears.

`props` is entirely unchecked. `ExtractPropTypes` expects a props *options object*, not a component type;
applied to `typeof SomeComponent` it collapses to an empty type, so `props: { totallyMadeUpProp: 123 }`
type-checks clean today. The generic is decorative.

Two smaller defects compound: `initialProps` is assigned the *same object reference* as `props` at
registration, so the prop-reset it exists to serve is a no-op against in-place mutation; and the reset logic
is duplicated in `close()` and `handleUpdate()` in two non-equivalent forms.

Separately, the most common modal use case in the wild — ask the user something, wait for the answer — has no
channel at all. `open()` returns `void`, and a result can only travel back through an ad-hoc callback.

This change depends on `ssr-safe-store`, which moves the registry to application scope. Both ship together as
`0.1.0`.

## What Changes

- `ModalProvider` is rewritten from an SFC template to a render function. Dynamic slot names are expressible
  in a template, but only by wrapping each slot result in another `<component :is>`, which changes what the
  child receives; `h(component, props, slots)` forwards the slot functions untouched.
- Per-modal prop/event configuration: `useModal()` accepts `preset`, or `openPropName` + `openEventName`,
  overriding the application-wide values. The plugin configuration becomes the *default* contract rather than
  the only one, so several UI kits can coexist in one application.
- **BEHAVIOURAL** `slots` are rendered. Content that silently vanished now appears. Anyone who worked around
  the gap by also passing content through `props` will render it twice.
- `openAsync()` is added alongside `open()`, returning a promise that settles when the modal closes.
  `open()` keeps returning `void` so existing fire-and-forget call sites stay clean under
  `@typescript-eslint/no-floating-promises`.
- `close(result?)` accepts an optional value that becomes the resolution of a pending `openAsync()`. The
  existing no-argument call is unchanged.
- **BEHAVIOURAL** `initialProps` is a shallow copy taken at registration instead of an alias of `props`, so
  top-level prop reset actually restores the snapshot. Props that previously persisted across a close will now
  reset.
- The duplicated reset logic in `close()` and `handleUpdate()` collapses into one helper, so reset behaviour
  has a single definition.
- **BREAKING** `props` is inferred from the `component` passed to `useModal()` and genuinely type-checked.
  Consumer code that compiles today because nothing was checked will surface errors.
- **BREAKING** `UseModalOptions` stops being an `interface` and becomes a union `type`, which is what makes a
  half-supplied `openPropName` / `openEventName` pair rejectable. Consumers who wrote against it as an
  interface — declaration merging, `implements` — are affected.
- Documentation catches up: `slots`, `resetPropsOnClose`, and `closeAllModals` all exist in code and appear
  nowhere in `docs/api/composables.md`.

## Capabilities

### New Capabilities

- `modal-rendering`: What `ModalProvider` renders for each registered modal — resolution of the open prop and
  event names, per-modal override precedence over application defaults, event-name to listener-name
  conversion, prop binding order, and slot forwarding.
- `modal-lifecycle`: How a modal moves between open and closed and what happens to its props — opening with
  merged props, closing from the handle or from the modal own event, prop-reset semantics, and the settlement
  rules for `openAsync()`.
- `modal-typing`: The public type surface of `useModal()` — inference of the props type from the component,
  what a mismatched prop produces, and the typing of `openAsync()` and `close(result?)`.

### Modified Capabilities

None at spec level. `modal-registry` and `ssr-rendering` from `ssr-safe-store` keep their requirements; this
change adds new capabilities beside them rather than altering them.

## Impact

Affected code:

- `src/lib/components/ModalProvider.vue` — rewritten as a render function; per-modal config resolution; slot
  forwarding; reset logic replaced by the shared helper
- `src/lib/composables/use-modal.ts` — per-modal config options, `openAsync()`, `close(result?)`,
  `initialProps` snapshot, prop type inference
- `src/lib/store.ts` — `ModalState` gains per-modal config, a typed `slots` shape, and pending-result tracking
- `src/lib/config.ts` — preset lookup reused per modal rather than only at install time
- `src/lib/index.ts` — export surface for the new options and return types
- `docs/api/composables.md`, `docs/api/components.md` — undocumented options, `openAsync`, per-modal config
- `docs/migration/0-1-0.md` — completes the shared migration guide created by `ssr-safe-store` with the three
  breaks owned here, plus the triage table at the top of the page
- `CHANGELOG.md` — new; the repo has none today, and `0.1.0` is the release where arriving cold and upgrading
  blindly is most costly
- `README.md` — an "Upgrading to 0.1.0" pointer, since the npm package page renders the README rather than the
  changelog
- `package.json` — `files` may need `CHANGELOG.md` added; it currently declares only `["dist"]`
- `.agents/skills/release/SKILL.md` and its `.claude/skills/` mirror — the release procedure gains a changelog
  step, otherwise the changelog goes stale at the next release
- `vitest.config.ts` — a `test.typecheck` block, since the `modal-typing` requirements are compile-time
  assertions and vitest runs those as a separate mode rather than as part of `vitest run`
- `AGENTS.md` — falsified in three places by this change: the Architecture description of `ModalProvider`
  injecting both keys and throwing "a doc-link error if either is missing", the "Known gap:
  `UseModalOptions.slots` … `ModalProvider` never renders it" note, and the Props lifecycle paragraph stating
  that reset "exists in two places … Changes to reset behaviour usually need both"
- `src/App.vue` — the playground slot that currently does nothing becomes a real assertion that slots work

Affected APIs: `props` type inference is the one loud break. `openAsync()`, `close(result?)`, and per-modal
config are additive. Slot rendering and prop reset change runtime behaviour under an unchanged signature.

Dependencies: none added.

Depends on: `ssr-safe-store`. `openAsync()` must resolve immediately during server rendering rather than
pending forever, which relies on the SSR detection introduced there.

Release: ships with `ssr-safe-store` as `0.1.0` under a single migration note. Consumers on `^0.0.11` receive
nothing automatically, since the npm caret is an exact pin below `0.1.0`.
