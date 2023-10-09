---
outline: deep
---

# API reference

## Components

### `<ModalProvider>`

Main wrapper component for all modals.
It should be used in the top root component of the project to make it available to the whole project.

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