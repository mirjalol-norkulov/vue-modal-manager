import type { App } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME, MODAL_STORE } from '@/lib/injection-keys'
import { type ModalManagerPreset, presetConfigurations } from '@/lib/config'
import { useModal, useModalManager } from '@/lib/composables'
import { ModalProvider } from '@/lib/components'
import { createModalRegistry } from '@/lib/store'

export { useModal, useModalManager, ModalProvider }
export type { ModalManagerPreset }

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
    // `typeof window` is the only signal available at install time:
    // `useSSRContext()` is meaningful only inside a setup during an SSR render,
    // and `import.meta.env.SSR` would be inlined when this library is built.
    app.provide(MODAL_STORE, createModalRegistry(typeof window === 'undefined'))

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
