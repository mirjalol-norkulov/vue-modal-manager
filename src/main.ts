import { createApp } from 'vue'
import App from './App.vue'
import { VueModalManager } from './lib'

const app = createApp(App)
app.use(VueModalManager, {
  openPropName: 'open',
  openEventName: 'update:open'
})
app.mount('#app')
