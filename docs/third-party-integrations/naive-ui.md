# Naive UI

To use modal manager with **Naive UI** component library just set `preset` option to `naive-ui`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'naive-ui'
})

app.mount('#app')
```