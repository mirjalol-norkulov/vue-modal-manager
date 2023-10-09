import { createApp } from 'vue'
import App from './App.vue'
import { VueModalManager } from './lib'

const app = createApp(App)
app.use(VueModalManager, {
  preset: 'naive-ui'
})
app.mount('#app')
