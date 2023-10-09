# Getting started

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
import { ModalProvider } from 'vue-modal-provider'
</script>

<template>
<ModalProvider>
  ...other components
</ModalProvider>
</template>
````

That's it, now you are ready to use your first modal manager to open and close modals.

## Usage

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import { UserCreateModal } from '@/components/UserCreateModal.vue'
  
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