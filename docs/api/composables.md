---
outline: deep
---

# API reference

## Composables

### `useModal`

Used to create handler for single or multiple modals

::: warning Must be called inside a component `setup()`
`useModal()` reaches the app-scoped modal registry with `inject()`, so it only works
during a component's `setup()` — the same place you would call `ref()` or `computed()`.
Calling it from module scope, a store action, a router guard, or a plain helper function
throws:

```
Missing modal registry. `useModal()`, `useModalManager()` and `<ModalProvider>` must be
called from a component setup in an app that installed VueModalManager. Please refer to
the documentation on how to setup Vue modal manager: https://vue-modal-manager.netlify.app
```

The same error is thrown when the app never called `app.use(VueModalManager, ...)`. To
reach one modal from several components, give it an explicit `id` and call `useModal()`
with that `id` in each. See the [`0.1.0` migration guide](/migration/0-1-0) if you are
upgrading from `0.0.x`.
:::

#### Type

```ts
function useModal<T extends Component, ResultType = unknown>(
  options: UseModalOptions<T>
): UseModalReturnType<T, ResultType>

type UseModalReturnType<T extends Component, ResultType = unknown> = {
  isOpen: ComputedRef<boolean>
  open: (openOptions?: OpenModalOptions<T>) => void
  openAsync: (openOptions?: OpenModalOptions<T>) => Promise<ResultType | undefined>
  close: (result?: ResultType) => void
  closeAllModals: () => void
}

type UseModalOptions<T extends Component> = {
  id?: string
  component: T
  props?: ModalComponentProps<T>
  slots?: ModalSlots
  onOpen?: () => void
  resetPropsOnClose?: boolean
} & ModalConfigOptions

type OpenModalOptions<T extends Component> = {
  props?: ModalComponentProps<T>
}

// Either nothing, or a preset, or both explicit names — never half a pair.
type ModalConfigOptions =
  | { preset?: never; openPropName?: never; openEventName?: never }
  | { preset: ModalManagerPreset; openPropName?: never; openEventName?: never }
  | { preset?: never; openPropName: string; openEventName: string }

type ModalSlots = Record<string, (...args: any[]) => unknown>

// Every prop optional, `key` and `ref` excluded, and each value may be a ref —
// `<ModalProvider>` unwraps those when it binds them.
type ModalComponentProps<T> = {
  [Name in keyof Omit<ComponentProps<T>, 'key' | 'ref'>]?: MaybeRef<...>
}
```

When `id` is omitted, one is generated with Vue's
[`useId()`](https://vuejs.org/api/composition-api-helpers.html#useid), so it is stable
across a server render and the client render of the same component. Passing an `id` that
is already registered logs a development warning: the later registration replaces the
earlier one, so both callers end up driving a single modal.

`options` is never written to. Passing one options object to two `useModal()` calls
registers two independent modals.

`onOpen` fires only when a modal actually opened, whether it was opened with `open()` or
`openAsync()`. It is skipped during a server render, where both are inert, and after the
owning component has unmounted, where there is no longer a modal to open. `close()` after
unmount is likewise a no-op.

#### `props`

`props` is type-checked against the component you passed as `component` — the type is
inferred from the value, so no explicit type argument is needed:

```ts
useModal({ component: NModal, props: { preset: 'card' } })
useModal({ component: NModal, props: { totallyMadeUpProp: 1 } }) // type error
```

Props are **partial at every call site**. They arrive in two phases — some at
registration, the rest at `open({ props })` — so a component with required props does not
have to receive them all up front. `open({ props })` merges over the current props rather
than replacing them.

The check runs against the component's `$props`, which is wider than its own declared
props: `class`, `style` and the `onVnode*` hooks type-check too. `key` and `ref` are
excluded, because `<ModalProvider>` owns both.

For a component whose props type cannot be resolved — a plain object component, a value
you have typed as bare `Component` — the type falls back to a permissive record and
nothing is checked. See the [migration guide](/migration/0-1-0) for the
`props: { ... } as any` escape hatch and when to reach for it.

##### Props that keep changing

The props **object** is copied when the modal registers, so the object you passed is never
written to — and mutating it afterwards does not reach the modal. There are two supported
ways to change a prop after registration:

```ts
const title = ref('Initial')

// A ref as a prop *value* stays live: the provider unwraps it when binding, the
// way a template would, so writing `title.value` re-renders the modal.
const { open } = useModal({ component: NModal, props: { title } })

// Or merge new values in at the moment you open.
open({ props: { title: 'Set when opening' } })
```

A ref is unwrapped one level deep, at the top of `props`. Refs nested inside a plain object
in `props` reach the component as refs.

#### `slots`

Slot functions passed as `slots` are forwarded to the rendered component as its own
slots, with no wrapper element between them:

```ts
useModal({
  component: NModal,
  slots: {
    default: () => h('p', 'Are you sure?'),
    footer: () => h(NButton, { onClick: close }, () => 'Close')
  }
})
```

Each value is a function returning whatever a render function may return — a vnode, an
array of vnodes, or a string. It receives the slot props the component passes, so a
scoped slot works too: `item: ({ row }) => h('span', row.name)`.

#### `resetPropsOnClose`

Defaults to `true`. When enabled, closing a modal restores the props to a snapshot taken
at registration, so props merged in through `open({ props })` do not leak into the next
opening. Set it to `false` to keep whatever the props were when the modal closed.

::: warning Reset is shallow
The snapshot is a shallow copy. A nested object inside `props` is shared with the
snapshot and is **not** restored — mutating `props.user.name` changes it in both. Pass a
fresh nested object through `open({ props })` when you need nested values reset.

Deep cloning is deliberately not done: modal props legitimately carry functions,
component references, and reactive objects, and `structuredClone` throws on functions.
:::

#### `closeAllModals`

Closes every modal registered in the application, not only this one. It is an alias for
[`useModalManager().closeAll`](#usemodalmanager) kept on the handle for convenience; both
do the same thing, so pick whichever reads better at the call site.

#### `open` and `openAsync`

`open()` returns `void`. `openAsync()` opens the modal exactly the same way and returns a
promise that resolves **when the modal closes** — not when it finishes opening. The name
describes the return type, not the moment.

Both exist because `@typescript-eslint/no-floating-promises` flags any statement-position
expression whose type is a promise, and statement position is how a fire-and-forget open
is overwhelmingly written. Keeping `open()` synchronous keeps those call sites clean.

`close(result?)` accepts an optional value, which becomes the resolution of a pending
`openAsync()`. Calling `close()` with no argument behaves exactly as before.

##### The promise always settles, and never rejects

| How the modal ends                                | Settlement                                  |
| ------------------------------------------------- | ------------------------------------------- |
| `close(result)` from the handle                    | resolves with `result`                      |
| The modal's own event (close button, escape, backdrop) | resolves with `undefined`              |
| `closeAll()` / `closeAllModals()`                  | resolves with `undefined`                   |
| The owning component unmounts while open           | resolves with `undefined`                   |
| Rendered on the server                             | resolves with `undefined` immediately       |
| `openAsync()` called again while already open      | the prior promise resolves with `undefined` |
| `open()` called while an `openAsync()` is pending  | stays pending, settles at the eventual close |

Rejection is prohibited rather than discouraged: an un-awaited rejection terminates a Node
process by default, which on an SSR server is a crash rather than a console warning.
Dismissal is an outcome, not an error, so it resolves.

::: warning Do not pass a promise to `close()`
A promise resolved with a thenable *adopts* it — that is a language rule, not something
this library can wrap its way out of. So `close(somePromise)` resolves the `openAsync()`
promise with the **awaited value**, not with the promise, and a rejecting one would reject
it. The never-rejects guarantee is kept by catching, so the modal result becomes
`undefined` and the error is swallowed. A development-only warning names this when it
happens. Await the value first: `close(await save())`.
:::

##### Example: asking a question

The result travels back through the props channel you already control — no extra API:

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// Destructured rather than kept as a handle object: `close` is referenced from
// the options that return it, and the destructured binding is what breaks that
// inference cycle without an explicit type annotation.
const { openAsync, close } = useModal({
  component: ConfirmDialog,
  props: {
    onConfirm: () => close(true),
    onCancel: () => close(false)
  }
})

const remove = async () => {
  const confirmed = await openAsync()

  // `undefined` when the dialog was dismissed rather than answered.
  if (confirmed) {
    await api.deleteUser()
  }
}
</script>
```

::: warning The dialog must report its result before it closes
Whatever closes the modal settles the promise, and only the first settlement counts. A
dialog that emits its own open event (`update:visible`, `update:show`, …) *before* calling
your `onConfirm` handler therefore resolves the promise with `undefined`, and the
`close(true)` that follows does nothing.

If you write the dialog, emit the result first:

```js
const answer = (value) => {
  emit('confirm', value) // your handler calls close(value) — first
  emit('update:visible', false) // the provider closes the modal — second
}
```

If it is a third-party dialog that closes itself first, drive it from a confirm button
handler that calls `close(value)` directly rather than from an event it emits on its way
out.
:::

#### Per-modal `preset`, `openPropName` and `openEventName`

The prop and event names passed to `app.use(VueModalManager, ...)` are the application
**default**. Any modal may override them, so several UI kits can coexist in one app.

Resolution is in strict precedence:

1. the modal's own `openPropName` + `openEventName`
2. the modal's own `preset`
3. the application-wide values from `app.use(VueModalManager, ...)`

If none of those resolve, `<ModalProvider>` throws an error naming the modal's id. A
`preset` that is not one of the [supported UI kits](/third-party-integrations/naive-ui)
counts as not resolving, and raises that same error — which lists the valid preset names —
rather than binding an undefined prop name.

Because a modal may configure itself, plugin options are optional — `app.use(VueModalManager)`
is valid for an application whose every modal carries its own configuration.

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import { NModal } from 'naive-ui'
import Dialog from 'primevue/dialog'

// Uses the application default from app.use(VueModalManager, { preset: 'naive-ui' }).
const naive = useModal({ component: NModal })

// Same app, different UI kit.
const prime = useModal({ component: Dialog, preset: 'prime-vue' })

// Same app, a custom dialog with names no preset covers.
const custom = useModal({
  component: MyDialog,
  openPropName: 'isShown',
  openEventName: 'update:isShown'
})
</script>
```

#### Example

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import UserCreateModal from '@/components/UserCreateModal'

const { open } = useModal({
  id: 'user-create-modal',
  component: UserCreateModal
})
</script>

<template>
  <div>
    <button @click="open">Create user</button>
  </div>
</template>
```

### `useModalManager`

Modal operations that apply to the whole application, with no per-modal handle needed.
Like `useModal()`, it has to be called inside a component `setup()`, and it throws the
same error when the registry cannot be injected.

#### Type

```ts
function useModalManager(): UseModalManagerReturnType

interface UseModalManagerReturnType {
  closeAll: () => void
}
```

`closeAll()` closes every modal registered in the application. `closeAllModals` on the
`useModal()` return value is an alias for it, kept for compatibility. Both reset props
according to each modal's own `resetPropsOnClose`, and both resolve any pending
`openAsync()` promise with `undefined`.

#### Example

```vue
<script setup>
import { useModalManager } from 'vue-modal-manager'

const { closeAll } = useModalManager()
</script>

<template>
  <button @click="closeAll">Close everything</button>
</template>
```
