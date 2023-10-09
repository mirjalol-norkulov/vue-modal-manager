# Quasar

To use modal manager with **Quasar** component library just set `preset` option to `quasar`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'quasar'
})

app.mount('#app')
```