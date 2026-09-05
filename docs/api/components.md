---
outline: deep
---

# API reference

## Components

### `<ModalProvider>`

Main wrapper component for all modals.
It should be used in the top root component of the project to make it available to the whole project.

It reads the modal registry created by `app.use(VueModalManager, ...)`, and throws the
same error `useModal()` does when that registry cannot be injected.

::: warning Use exactly one provider
`<ModalProvider>` renders every modal in the registry, and the registry is shared by the
whole application. Two `<ModalProvider>` instances in one app therefore each render every
registered modal — you get two of each dialog. Mount a single provider near the root.
:::

#### What it renders

For each registered modal, the provider renders the component you passed to `useModal()`
once, binding:

- the resolved open prop name to that modal's open state
- the resolved open event name, converted to listener form (`update:show` becomes
  `onUpdate:show`; a name already starting with `on` is left alone), to a handler that
  writes the new state back
- everything in that modal's `props`, with a top-level `ref` value unwrapped the way a
  template would unwrap it
- everything in that modal's `slots`, forwarded as the component's own slots with no
  wrapper element between them

Its own default slot — your application content — renders after the modals, which is what
keeps stacking order and hydration stable.

`props` is bound **after** the open state, so a modal whose own `props` happen to carry the
resolved open prop name overrides it — `props: { show: true }` under the `naive-ui` preset
pins that dialog open and no `close()` will shut it. Drive the open state through `open()`
and `close()`, and leave the open prop out of `props`.

Prop and event names are resolved [per modal](/api/composables#per-modal-preset-openpropname-and-openeventname),
so the plugin's options act as a default that any modal may override. A modal for which no
configuration resolves throws an error naming that modal's id. The throw happens while the
provider renders, so it aborts that render — the other modals and your wrapped application
content go with it. What per-modal resolution changed is which modal the message blames,
not how much stops working.

#### Example

```vue[App.vue]
<script setup>
import { ModalProvider } from 'vue-modal-manager'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
</script>

<template>
<ModalProvider>
 <DefaultLayout>
   <router-view />
 </DefaultLayout>
</ModalProvider>
</template>
```