import type { App } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'
import { type ModalManagerPreset, presetConfigurations } from '@/lib/config'

export type ModalManagerWithPresetOptions = {
  preset: ModalManagerPreset
}

export type ModalManagerCustomOptions = {
  openPropName: string
  openEventName: string
}

export type ModalManagerOptions = ModalManagerCustomOptions | ModalManagerWithPresetOptions

export const VueModalManager = {
  install: (app: App, options: ModalManagerOptions) => {
    if ('preset' in options && options.preset) {
      const config = presetConfigurations[options.preset]
      app.provide(MODAL_OPEN_PROP_NAME, config.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, config.openEventName)
    }

    if ('openPropName' in options) {
      app.provide(MODAL_OPEN_PROP_NAME, options.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, options.openEventName)
    }
  }
}

export * from './composables'
export * from './components'
