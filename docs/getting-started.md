# Getting started

::: tip Upgrading from `0.0.x`?
`0.1.0` requires Vue `^3.5.0` and `useModal()` must now be called inside a component
`setup()`. See the [`0.1.0` migration guide](/migration/0-1-0).
:::

## Installation

::: code-group

```shell[npm]
npm install vue-modal-manager
```

```shell[yarn]
yarn add vue-modal-manager
```

```shell[pnpm]
pnpm add vue-modal-manager
```
:::

## Setup

### Install plugin

Import modal manager plugin in your project's main Javascript file. For example in main.js.

```js[main.js]
import { createApp } from 'vue'
import { VueModalManager } from 'vue-modal-manager'
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  openPropName: 'open',
  openEventName: 'update:open'
});

app.mount('#app')
```

### Wrap root component with `<ModalProvider>` component

In your root Vue component, for example in `App.vue` component import `<ModalProvider>` component and wrap all elements inside it.

````vue[App.vue]
<script setup>
import { ModalProvider } from 'vue-modal-manager'
</script>

<template>
<ModalProvider>
  ...other components
</ModalProvider>
</template>
````

That's it, now you are ready to use your first modal manager to open and close modals.

Use a single `<ModalProvider>` near the root of your app. The registry is shared by the
whole application and the provider renders every modal in it, so two providers in one app
each render every registered modal.

Rendering on a server? See [Server-side rendering](/server-side-rendering) — it works out
of the box, but Nuxt needs the plugin registered against `nuxtApp.vueApp`.

## Usage

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import UserCreateModal from '@/components/UserCreateModal.vue'
  
const { open } = useModal({
  component: UserCreateModal
})
</script>

<template>
  <div>
    <button @click="open">Open modal</button>
  </div>
</template>
```

`useModal()` has to be called inside a component's `setup()`, the same way `ref()` is. To
drive one modal from several components, give it an explicit `id` and call `useModal()`
with that `id` in each of them.
