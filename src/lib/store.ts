import { type Component, inject, reactive } from 'vue'
import { MODAL_STORE } from '@/lib/injection-keys'

export type ModalState = {
  component: Component
  isOpen: boolean
  props?: Record<string, unknown>
  initialProps?: Record<string, unknown>
  slots?: any
  resetPropsOnClose?: boolean
}

export type ModalRegistry = {
  modals: Record<string, ModalState>
  /**
   * Resolved once per application by `install()`. A server render never runs
   * unmount hooks and its markup can never be interacted with, so `open()`
   * stays inert for the whole lifetime of an app rendered on the server.
   */
  isServerRendered: boolean
}

/**
 * One registry per Vue application. `createApp()` runs per request under SSR,
 * so this is what keeps concurrent requests from observing each other's modals.
 */
export const createModalRegistry = (isServerRendered = false): ModalRegistry => ({
  modals: reactive<Record<string, ModalState>>({}),
  isServerRendered
})

/**
 * Reaching the registry needs `inject()`, so every entry point that touches it
 * is setup-only and fails here identically when the plugin is missing.
 */
export const injectModalRegistry = (): ModalRegistry => {
  const registry = inject(MODAL_STORE, null)

  if (!registry) {
    throw new Error(
      `Missing modal registry. \`useModal()\`, \`useModalManager()\` and \`<ModalProvider>\` must be called from a component setup in an app that installed VueModalManager. Please refer to the documentation on how to setup Vue modal manager: ${
        import.meta.env.VITE_DOC_LINK
      }`
    )
  }

  return registry
}

/**
 * The single close path. `close()`, the provider's own close event and
 * close-all all delegate here, so prop reset is defined once.
 */
export const closeModal = (registry: ModalRegistry, id: string) => {
  const modal = registry.modals[id]

  if (!modal) {
    return
  }

  if (modal.resetPropsOnClose) {
    modal.props = modal.initialProps
  }

  modal.isOpen = false
}

export const closeAllModals = (registry: ModalRegistry) => {
  Object.keys(registry.modals).forEach((id) => closeModal(registry, id))
}
