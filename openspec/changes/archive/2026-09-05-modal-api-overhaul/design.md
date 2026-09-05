## Context

`ModalProvider.vue` is a twelve-line template over a `v-for`, and `use-modal.ts` is seventy lines. The whole
adapter is small, which means the constraints are shape constraints rather than tangles.

Three things are settled before this change starts, and they are the reason it is second in the sequence:

- `ssr-safe-store` moves the registry to application scope and reached by injection. Everything here reads the
  registry the new way.
- The same change introduces server-render detection, which `openAsync()` needs in order to resolve
  immediately instead of pending forever.
- The same change lands the first vitest suite. Two of the changes here are behavioural under an unchanged
  signature, which is exactly the category that needs existing coverage.

Two findings from investigation shape the decisions below.

**Props are genuinely unchecked today.** `props?: ExtractPropTypes<ComponentType>` is a misuse:
`ExtractPropTypes` expects a props *options object* such as `{ title: { type: String } }`, not a component
type. Applied to `typeof NModal` it collapses, and `props: { totallyMadeUpProp: 123, anotherFakeOne: 'x' }`
compiles clean — verified against the current source. The generic is also only reachable by an explicit type
argument, since `component` is typed `Component` rather than `T`.

**Vue exports no `ComponentProps` utility.** Confirmed against the installed Vue 3.5.42 type declarations, so
prop inference has to be hand-rolled.

## Goals / Non-Goals

**Goals:**

- Several UI kits usable in one application, with plugin configuration acting as the default rather than the
  only contract.
- `slots` either works or is removed. Accepting an option and silently discarding it is the worst of the three
  states.
- A supported way to ask the user something and await the answer, without imposing lint noise on call sites
  that do not want it.
- Prop reset with one definition and one meaning.
- `props` that is actually type-checked against the component supplied.

**Non-Goals:**

- A `useModalContext()` composable letting a modal component close itself with a result. Discussed and
  deferred; see the result-channel decision.
- Modal stacking, z-index management, or explicit render ordering. The provider still iterates the registry in
  insertion order.
- Deep prop reset. See the snapshot decision for why this is deliberate.
- Fixing multiple `<ModalProvider>` instances rendering every modal. Carried over as a known limitation.
- Any change to the preset table contents. Adding UI kits stays the `add-preset` workflow.

## Decisions

### `ModalProvider` becomes a render function

Dynamic slot names *are* expressible in a template — `<template v-for="(fn, name) in slots" #[name]>` is valid
Vue 3 — so the template is not a hard blocker. It is the wrong tool for a narrower reason: rendering each slot
through a nested `<component :is="fn(scope)">` wraps the result in an extra VNode. Several UI kits inspect
their slot children to decide layout, and a wrapper changes what they see. `h(item.component, boundProps,
item.slots)` forwards the slot functions themselves, untouched, which is what a transparent adapter must do.

The cost is that the provider stops being readable as markup. Accepted: it is one `h()` call over a `v-for`,
and it now does three things a template would express awkwardly — dynamic props, a dynamic listener key, and
dynamic slot forwarding.

The default slot passthrough (`<slot />`, how `ModalProvider` wraps application content) is preserved.

### Per-modal configuration resolves with explicit precedence

```
per-modal openPropName / openEventName    (most specific)
  ↓ falls back to
per-modal preset
  ↓ falls back to
application-wide injected values          (plugin options)
  ↓ if nothing resolves
error naming the modal id
```

Two consequences. First, validation moves from the provider `setup()` to per-modal resolution — today the
provider throws unconditionally when injection is missing, and it must now throw only for a modal that cannot
resolve a configuration. That is a relaxation, so it breaks nobody, but the error must name the offending
modal id or it becomes harder to debug than what it replaces.

Second, plugin options become optional. `install()` is still mandatory because it creates the registry, but an
application whose every modal carries its own configuration should not have to nominate a global preset.

### The config option shapes need `?: never` siblings to reject half a pair

`UseModalOptions` becomes a union: no configuration, a `preset`, or an explicit `openPropName` +
`openEventName` pair. Written the obvious way, that union does not reject half a pair. Verified:

```ts
type Opts<T> = { component: T } & ({} | { preset: ModalManagerPreset } | ExplicitPair)
useModal({ component: NModal, openPropName: 'visible' })   // no error
```

TypeScript excess-property check against a union admits any property present in *any* constituent, and the
object is still assignable to the no-configuration constituent, so nothing complains. Each member has to be
closed off against its siblings:

```ts
type NoConfig     = { preset?: never; openPropName?: never; openEventName?: never }
type PresetConfig = { preset: ModalManagerPreset; openPropName?: never; openEventName?: never }
type ExplicitPair = { preset?: never; openPropName: string; openEventName: string }
```

Verified: the half-pair call then errors with `Property 'openEventName' is missing ... but required in type
'ExplicitPair'`, `T` still infers from `component` through the union, and unknown props are still rejected
inside it. That last point was the real risk — generic inference across a union of object types is where
this shape could have failed quietly.

One consequence for the public surface: `UseModalOptions` stops being an `interface` and becomes a union
`type`. Anything a consumer wrote against it as an interface — declaration merging, `implements` — breaks,
so it belongs in the migration guide, and the api-extractor rollup that flattens `dist/index.d.ts` needs a
look.

### `openAsync()` beside `open()`, rather than `open()` returning a promise

Returning a promise from `open()` reads better in isolation and is worse everywhere it is used.
`@typescript-eslint/no-floating-promises` flags any statement-position expression whose type is a promise, and
statement position is how `open()` is overwhelmingly called — `src/App.vue` in this repo is a textbook
instance. Every existing fire-and-forget call site in every consumer project on a type-checked lint config
would need `void open(...)`. Template usage (`@click="open"`) is unaffected, which makes the noise land
specifically on handler bodies.

`openAsync` was chosen over `openAndWait` and `openForResult` by the maintainer. Worth recording that the name
describes the return type rather than the resolution point, and a reader may reasonably expect it to settle
when the modal finishes *opening* rather than when it closes. Documentation must state the resolution point
explicitly, since the name does not.

`openAsync()` fires `onOpen` exactly as `open()` does — it is the same operation with a result channel
attached, and a consumer who registered an open hook wants it either way. (`ssr-safe-store` settles the other
half: `onOpen` does not fire on the server-inert path, because the modal did not open.) This needs stating
because today `onOpen` fires *outside* the entry-existence guard in `open()`, so it runs even when the entry
does not exist. Move it inside the guard while adding `openAsync`, so "exactly as `open()` does" means the
fixed behaviour rather than the current one.

### `openAsync()` never rejects, and always settles

| How the modal ends | Settlement |
|---|---|
| `close(result)` from the handle | resolves with `result` |
| Modal own event (close button, escape, backdrop) | resolves with `undefined` |
| `closeAll()` / `closeAllModals()` | resolves with `undefined` |
| Owning component unmounts while open | resolves with `undefined` |
| Rendered on the server | resolves with `undefined` immediately, never pends |
| `openAsync()` called again while already open | prior promise resolves with `undefined`, a fresh one is returned |
| `open()` called while an `openAsync()` is pending | promise stays pending, and settles at the eventual close |

Rejection is prohibited rather than discouraged. An un-awaited rejecting promise is an unhandled rejection,
and Node 15 and later terminate the process on those by default — on an SSR server that is a crash, not a
console warning. Dismissal is an outcome, not an error, so it resolves.

The unmount and reopen rows exist because a promise that never settles retains its continuation forever. One
registry entry per id means one pending result per id; a second `openAsync()` has to dispose of the first.

### The result travels through the existing props channel

No new API is needed. `close(result?)` resolves the pending promise, and the owner already controls the modal
props:

```ts
const { openAsync, close } = useModal({
  component: ConfirmDialog,
  props: { onConfirm: () => close(true), onCancel: () => close(false) }
})

const confirmed = await openAsync()
```

*Alternative considered.* A `useModalContext()` composable, injected by the provider, letting the modal
component call `close(result)` on itself. It is the more elegant end state and it is what a modal-first library
would offer — but it is new public surface, it only helps components written against this library, and third-
party dialogs cannot use it at all. Deferred until there is a concrete request. The props channel covers the
confirm pattern today with zero additions.

### `initialProps` is a shallow snapshot, deliberately not a deep clone

At registration `props` and `initialProps` are assigned the *same object*, so the snapshot is not a snapshot.
`open({ props })` happens to work because it assigns a new merged object rather than mutating, which is why
top-level reset appears to function; any in-place mutation of `props` corrupts the snapshot silently.

The fix is `{ ...options.props }`. Deep cloning was considered and rejected: modal props legitimately carry
functions (`onConfirm` above), component references, and reactive objects, and `structuredClone` throws on
functions. So reset is defined as shallow, and that is a documented limitation rather than a bug — a nested
object inside `props` is shared with the snapshot and will not be restored on close. Consumers needing nested
reset should pass fresh nested objects through `open({ props })`.

Restoring the snapshot has to copy it too, not alias it. The current reset is
`modals[id].props = modals[id].initialProps`, so after one close the live props object *is* the snapshot, and
the next in-place mutation corrupts the thing reset exists to protect. Taking the snapshot with a spread and
then handing that same object back on close only moves the aliasing bug one step later — the second
open/close cycle reintroduces it. Both ends copy: `{ ...options.props }` at registration, `{ ...initialProps }`
on restore.

Props and slots also need `markRaw`. They live inside the `reactive` registry, so a component reference passed
as a prop — `props: { icon: SomeIcon }` — comes back out as a reactive proxy and Vue logs "received a
Component that was made a reactive object". That is latent today and this change makes it likely: props become
type-checked, so consumers start passing what the component actually accepts, including component-valued props,
and slots start rendering at all. `component` is already marked raw for exactly this reason; the props snapshot
and the slots record need the same treatment. Slot *functions* are safe on their own — `reactive()` does not
wrap functions — but the record holding them is a plain object and is proxied.

### One close definition, not a reset helper plus a settle helper

Reset currently exists in `close()` in `use-modal.ts` (reading `options.props`) and in `handleUpdate()` in
`ModalProvider.vue` (reading `initialProps`) — two non-equivalent expressions of one rule.
`handleUpdate` is the path that fires when a modal closes itself, so the two must agree or self-closing and
handle-closing diverge.

The fix is not two helpers. Four places close a modal: `close()` on the handle, `handleUpdate()` in the
provider, `closeAllModals()` on the handle, and `useModalManager().closeAll`. Reset and settlement would be two
obligations each of those four has to remember, in the right order — a strictly worse version of
the two-place duplication this change exists to remove. `ssr-safe-store` therefore lands a single internal
`closeModal(registry, id)` that all four already delegate to, and this change widens it to
`closeModal(registry, id, result?)` so that resetting props and settling a pending `openAsync()` happen in one
place.

The settlement table above then describes one function rather than a convention applied at four call sites.

### Prop inference is hand-rolled, and necessarily `Partial`

Vue exports no `ComponentProps`, so:

```ts
type ComponentProps<T> = T extends new (...args: any) => { $props: infer P }
  ? NonNullable<P>
  : T extends (props: infer P, ...args: any) => any
    ? P
    : Record<string, any>
```

Verified against `naive-ui`: this resolves `typeof NModal` to its real props, accepts
`{ show: true, preset: 'card' }`, and rejects `{ totallyMadeUpProp: 123 }` both directly and through a generic
function signature of the same shape as `useModal`.

`component` must also be typed `T` rather than `Component` so the type argument is inferred from the value
instead of hand-written.

The resolved type comes out `Partial`, which is required rather than merely tolerable: props arrive in two
phases — some at registration, the rest at `open({ props })` — so demanding a
complete props object at either call site would be wrong.

**The unresolved branch is `Record<string, any>`, not `never`.** This matters more than it looks.
`Partial<never>` is `never`, and `any` is assignable to every type *except* `never` — so under a
`never` fallback, `props: {...} as any` fails with `Type 'any' is not assignable to type 'never'`. Verified.
That is the exact escape hatch the migration guide offers, and it would fail precisely for the components the
utility cannot destructure: async components, plain object components, string tags, and anything a consumer has
typed as bare `Component`. Those consumers would have no way past the error at all. Permissive-on-unresolved
keeps the check where it works and gets out of the way where it does not, which is the right failure direction
for a type whose job is catching typos.

**`$props` is wider than the component declared props.** It carries `VNodeProps`, `AllowedComponentProps`, and
`ComponentCustomProps`, so `class`, `style`, `key`, `ref`, and the `onVnode*` hooks all type-check — verified
against `typeof NModal`. `class` and `style` passing is wanted; `src/App.vue` already passes `style`.
But it means "rejects anything the component does not declare" is not literally what ships, which is why the
requirement is stated against `$props`.

`key` and `ref` are omitted from the inferred type. Both are vnode concerns rather than props, and both are
actively harmful here: the provider already supplies its own `:key` per registry entry, so a `key` arriving
through `props` would be spread into the same binding and fight it, and a `ref` would try to register a
template ref against a component the consumer never wrote markup for. Neither has a legitimate use in this
position, so they are removed rather than left as a documented footgun. `class`, `style`, and the `onVnode*`
hooks stay, because passing them is meaningful and `src/App.vue` already does.

## Risks / Trade-offs

- **Prop inference will break consumer builds.** → This is the intended effect and the reason `0.1.0` exists.
  The errors are accurate: every one of them is a prop the component never accepted. Migration note calls it
  out as the headline change, with the escape hatch that an explicit `props: {...} as any` unblocks a build
  while the real fix is made.

- **The permissive fallback checks nothing for components it cannot resolve.** → Deliberate. A
  hard `never` would leave those consumers stranded with no escape hatch at all, which is a worse outcome than
  an unchecked props object. Named in the migration guide so a clean build is not misread as proof the props
  were checked.

- **Slots appearing changes rendered output.** → Anyone who compensated for the gap by passing content through
  `props` will now render it twice. Only visible on upgrade, listed in the migration note.

- **`openAsync` names the wrong moment.** → Accepted maintainer decision. Mitigated by documenting the
  resolution point in the first sentence of its API entry and in the example.

- **Nested props still do not reset.** → Deliberate and documented, with the reasoning, so it reads as a
  boundary rather than an oversight.

- **A render-function provider is harder to read than the template it replaces.** → Keep it to a single `h()`
  call with the prop resolution extracted into a named helper, so the render body stays scannable.

- **Per-modal config makes misconfiguration harder to spot.** → The provider used to fail once, loudly, at
  setup. Now a single misconfigured modal fails on its own, so the error must name the modal id.

- **Reopen-while-open silently discards the first promise.** → Documented in the settlement table. The
  alternative, returning the same pending promise, means two logical requests share one answer, which is worse.

## Migration Plan

Ships with `ssr-safe-store` as a single `0.1.0` release, documented in the shared migration guide at
`docs/migration/0-1-0.md` that `ssr-safe-store` creates and this change completes. Steps owned by this change:

1. Fix the prop errors that appear once `props` is checked. They are real.
2. Check any `useModal({ slots })` call site — that content now renders.
3. Check any reliance on props persisting across a close; top-level props now reset when `resetPropsOnClose`
   is on, which is the documented default.
4. Optional: adopt per-modal `preset` / `openPropName` where several dialog kinds are in play.
5. Optional: replace ad-hoc result callbacks with `openAsync()` plus `close(result)`.

No changes required for `open()`, `close()`, `isOpen`, `closeAllModals`, or `<ModalProvider>` placement.

Rollback: `0.0.11` remains published and is what every existing `^0.0.11` range already resolves to.

## Open Questions

None blocking. Two deferred items recorded so they are not rediscovered:

- Whether `closeAllModals` on the `useModal` handle should be formally deprecated in favour of
  `useModalManager().closeAll`. Both work; picking one is a later documentation decision.
- Whether `useModalContext()` should exist, letting library-native modal components report their own result.
  Revisit if the props-channel pattern proves awkward in practice.
