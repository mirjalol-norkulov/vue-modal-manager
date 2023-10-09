# PrimeVue

To use modal manager with **PrimeVue** component library just set `preset` option to `prime-vue`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'prime-vue'
})

app.mount('#app')
```