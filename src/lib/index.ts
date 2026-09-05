import type { App } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME, MODAL_STORE } from '@/lib/injection-keys'
import { type ModalManagerPreset, resolvePresetConfig } from '@/lib/config'
import { useModal, useModalManager } from '@/lib/composables'
import type {
  ComponentProps,
  ModalComponentProps,
  ModalConfigOptions,
  OpenModalOptions,
  UseModalOptions,
  UseModalReturnType
} from '@/lib/composables/use-modal'
import type { ModalSlot, ModalSlots } from '@/lib/store'
import { ModalProvider } from '@/lib/components'
import { createModalRegistry } from '@/lib/store'

export { useModal, useModalManager, ModalProvider }
export type {
  ModalManagerPreset,
  ComponentProps,
  ModalComponentProps,
  ModalConfigOptions,
  ModalSlot,
  ModalSlots,
  OpenModalOptions,
  UseModalOptions,
  UseModalReturnType
}

export type ModalManagerWithPresetOptions = {
  preset: ModalManagerPreset
}

export type ModalManagerCustomOptions = {
  openPropName: string
  openEventName: string
}

export type ModalManagerOptions = ModalManagerCustomOptions | ModalManagerWithPresetOptions

export const VueModalManager = {
  /**
   * `options` is optional: it supplies the *default* prop and event names, and
   * an application whose modals all carry their own configuration needs none.
   * Creating the registry is not optional, which is why installing still is.
   */
  install: (app: App, options?: ModalManagerOptions) => {
    // `typeof window` is the only signal available at install time:
    // `useSSRContext()` is meaningful only inside a setup during an SSR render,
    // and `import.meta.env.SSR` would be inlined when this library is built.
    app.provide(MODAL_STORE, createModalRegistry(typeof window === 'undefined'))

    if (!options) {
      return
    }

    if ('preset' in options && options.preset) {
      const config = resolvePresetConfig(options.preset, 'VueModalManager')
      app.provide(MODAL_OPEN_PROP_NAME, config.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, config.openEventName)
    }

    if ('openPropName' in options) {
      app.provide(MODAL_OPEN_PROP_NAME, options.openPropName)
      app.provide(MODAL_OPEN_EVENT_NAME, options.openEventName)
    }
  }
}
