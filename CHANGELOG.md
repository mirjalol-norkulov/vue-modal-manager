# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions before `0.1.0` are not backfilled here. Their contents are the annotated git tags
[`v0.0.2`](https://github.com/mirjalol-norkulov/vue-modal-manager/releases) through
`v0.0.11`, and `git log v0.0.10..v0.0.11` reads them one release at a time.

## [0.1.0]

The first release with breaking changes. **Read the
[migration guide](https://vue-modal-manager.netlify.app/migration/0-1-0) before
upgrading** — it carries a triage table so you can tell in a minute which changes touch
your code.

npm's caret is an exact pin below `1.0.0`, so an existing `^0.0.11` range never resolves
to this release. You only arrive here deliberately, and `0.0.11` stays published.

### Added

- `openAsync()`, which opens a modal and returns a promise resolving **when the modal
  closes**, with the value passed to `close(result)`. It never rejects and never stays
  pending once the modal can no longer be closed. Passing a *thenable* to `close()` is the
  one case worth knowing about: a promise adopts a thenable rather than resolving with it,
  so the result becomes the awaited value, a rejecting one resolves as `undefined`, and a
  development-only warning says so.
- `close(result?)` accepts an optional result that settles a pending `openAsync()`.
- Per-modal `preset`, `openPropName` and `openEventName` on `useModal()`, so several UI
  kits can coexist in one application. The plugin's options become the application-wide
  *default* rather than the only contract, resolved as: explicit per-modal pair, then
  per-modal preset, then application default.
- Plugin options are now optional — `app.use(VueModalManager)` is valid when every modal
  configures itself.
- `useModalManager()`, giving `closeAll` with no per-modal handle needed.
- Exported types: `UseModalOptions`, `UseModalReturnType`, `OpenModalOptions`,
  `ModalComponentProps`, `ModalConfigOptions`, `ComponentProps`, `ModalSlot`,
  `ModalSlots`.
- A documented settlement table, a `0.1.0` migration guide, and this changelog.

### Changed

- **BREAKING** `props` is inferred from the component passed to `useModal()` and is
  genuinely type-checked. It was typed `ExtractPropTypes<ComponentType>` — a misuse that
  collapsed to an empty type — so every props object compiled clean. Code that compiled
  only because nothing was checked will now surface errors, and those errors are accurate.
  `key` and `ref` are excluded from the accepted props; `class`, `style` and the
  `onVnode*` hooks still type-check.
- **BREAKING** `UseModalOptions` is a union `type` rather than an `interface`, which is
  what lets it reject half an explicit `openPropName` / `openEventName` pair. Declaration
  merging and `implements` against it no longer work.
- **BREAKING** Vue `^3.5.0` is required, up from `^3.3.0`. Auto-generated ids come from
  `useId()`, the only id primitive that agrees across the hydration boundary.
- **BREAKING** The modal registry is created per Vue application by
  `app.use(VueModalManager, ...)` and reached with `inject()`, rather than being a
  module-level singleton. `useModal()`, `useModalManager()` and `<ModalProvider>` are
  therefore setup-only, and all three throw the same error when the plugin is missing.
  This is what makes server rendering safe: concurrent requests no longer share state.
- **BEHAVIOURAL** `slots` passed to `useModal()` now render. They were accepted, stored,
  and silently discarded. Content also passed through `props` as a workaround will now
  render twice.
- **BEHAVIOURAL** Top-level props now reset on close when `resetPropsOnClose` is enabled,
  which is the default. Reset is shallow and documented as such.
- **BEHAVIOURAL** The `props` object handed to `useModal()` is shallow-copied at
  registration rather than stored by reference, which is what makes the reset snapshot a
  snapshot and what keeps the library from writing back into your object. A modal therefore
  no longer follows later mutations of that object. Pass a `ref` as a prop *value* — those
  stay live, and `<ModalProvider>` unwraps them when binding, the way a template does — or
  merge new values in through `open({ props })`.
- `<ModalProvider>` is a render function rather than a template, so slot functions reach
  the modal component untouched instead of through a wrapper vnode.
- A modal whose prop and event names cannot be resolved raises an error naming that
  modal's id, rather than the provider failing once for the whole application.
- Duplicate explicit ids log a development warning naming the id. The behaviour is
  unchanged and production builds strip the warning.

### Fixed

- `initialProps` was assigned the *same object reference* as `props` at registration, so
  the snapshot prop reset exists to restore was corrupted by any in-place mutation. Both
  ends now copy: a shallow copy at registration, and a fresh copy on restore, so reset
  survives repeated open/close cycles.
- Prop reset had two non-equivalent definitions — one in `close()`, one in the provider's
  own close handler — so a modal that closed itself reset differently from one closed
  through the handle. All four close paths now go through a single internal function.
- `close()` after the owning component unmounted threw a `TypeError`. It is now a no-op.
- `onOpen` fired even when nothing opened: after unmount, and during a server render. It
  now fires only when a modal actually opened.
- A `preset` absent from the preset table raised an opaque `TypeError` from reading a
  property of `undefined`. It now raises a named error listing the valid presets.
- `open()` is inert during a server render, so server markup always shows modals closed
  and hydration cannot mismatch on modal state.

[0.1.0]: https://github.com/mirjalol-norkulov/vue-modal-manager/releases/tag/v0.1.0
