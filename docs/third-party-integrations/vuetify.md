# Vuetify

To use modal manager with **Vuetify** component library just set `preset` option to `vuetify`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'vuetify'
})

app.mount('#app')
```