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
function useModal<T extends Component>(
  options: UseModalOptions
): UseModalReturnType

interface UseModalReturnType { 
  isOpen: ComputedRef<boolean>; 
  close: () => void; 
  open: () => void
  closeAllModals: () => void
}

interface UseModalOptions<ComponentType extends Component> {
  id?: string
  component: Component
  props?: ExtractPropTypes<ComponentType>
  onOpen?: () => void
  resetPropsOnClose?: boolean
}
```

When `id` is omitted, one is generated with Vue's
[`useId()`](https://vuejs.org/api/composition-api-helpers.html#useid), so it is stable
across a server render and the client render of the same component. Passing an `id` that
is already registered logs a development warning: the later registration replaces the
earlier one, so both callers end up driving a single modal.

`options` is never written to. Passing one options object to two `useModal()` calls
registers two independent modals.

`onOpen` fires only when a modal actually opened. It is skipped during a server render,
where `open()` is inert, and after the owning component has unmounted, where there is no
longer a modal to open. `close()` after unmount is likewise a no-op.

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
`useModal()` return value is an alias for it, kept for compatibility.

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
