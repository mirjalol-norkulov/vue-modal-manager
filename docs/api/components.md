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