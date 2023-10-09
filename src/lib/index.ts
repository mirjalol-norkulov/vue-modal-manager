import type { App } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'

export type ModalManagerOptions = {
  openPropName: string
  openEventName: string
}
export const VueModalManager = {
  install: (app: App, options: ModalManagerOptions) => {
    app.provide(MODAL_OPEN_PROP_NAME, options.openPropName)
    app.provide(MODAL_OPEN_EVENT_NAME, options.openEventName)
  }
}

export * from './composables'
export * from './components'
