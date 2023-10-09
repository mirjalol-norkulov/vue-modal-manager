# Element plus

To use modal manager with **Element Plus** component library just set `preset` option to `element-plus`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'element-plus'
})

app.mount('#app')
```