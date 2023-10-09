import type { App } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'
import { type ModalManagerPreset, presetConfigurations } from '@/lib/config'

export type ModalManagerOptions = {
  openPropName?: string
  openEventName?: string
  preset?: ModalManagerPreset
}

export const VueModalManager = {
  install: (app: App, options: ModalManagerOptions) => {
    if (options.preset) {
      const config = presetConfigurations[options.preset]
      app.provide(MODAL_OPEN_PROP_NAME, config.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, config.openEventName)
    } else {
      app.provide(MODAL_OPEN_PROP_NAME, options.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, options.openEventName)
    }
  }
}

export * from './composables'
export * from './components'
