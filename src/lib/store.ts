import { type Component, inject, markRaw, reactive } from 'vue'
import { MODAL_STORE } from '@/lib/injection-keys'
import { isThenable, warnInDevelopment } from '@/lib/helpers'
import type { ModalManagerPreset } from '@/lib/config'

/**
 * A slot function, as a render function may return it: a vnode, an array of
 * them, a string, or nothing. Deliberately looser than Vue's own `Slot`, whose
 * `VNode[]` return type rejects the common `() => h('p', 'text')` form.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalSlot = (...args: any[]) => unknown

/** Slot name to slot function, forwarded to the rendered component as-is. */
export type ModalSlots = Record<string, ModalSlot>

export type ModalProps = Record<string, unknown>

/**
 * Settles a pending `openAsync()`. Internal: never handed to a consumer, and
 * typed with `any` so a resolver of any result type can be stored here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalResultSettler = (result?: any) => void

export type ModalState = {
  component: Component
  isOpen: boolean
  props: ModalProps
  /** The shallow snapshot taken at registration, restored on close. */
  initialProps: ModalProps
  slots?: ModalSlots
  resetPropsOnClose: boolean
  /** Per-modal configuration, overriding the application-wide defaults. */
  preset?: ModalManagerPreset
  openPropName?: string
  openEventName?: string
  /** At most one unsettled `openAsync()` resolver, held while the modal is open. */
  pendingResult?: ModalResultSettler
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
 * Resolves a pending `openAsync()` promise exactly once, if there is one, and
 * is a no-op otherwise — so every caller can settle unconditionally.
 *
 * Never rejects: an un-awaited rejection terminates a Node process by default,
 * which on an SSR server is a crash rather than a console warning. Dismissal is
 * an outcome, not an error.
 */
export const settleModalResult = (modal: ModalState | undefined, result?: unknown) => {
  if (!modal?.pendingResult) {
    return
  }

  if (isThenable(result)) {
    // A promise resolved with a thenable *adopts* it — that is the language
    // rule, not something this library can wrap its way out of. So the result
    // is the awaited value rather than the thenable, and a rejecting one would
    // reject the `openAsync()` promise. `openAsync()` catches that (resolving
    // with `undefined`) to keep the never-rejects guarantee, and says so here,
    // because a silently swallowed error is worth one line of warning.
    warnInDevelopment(
      'close() was given a thenable as its result, which the openAsync() promise adopts rather than resolves with. Await the value before calling close(); if the thenable rejects, the modal result is `undefined`.'
    )
  }

  const settle = modal.pendingResult

  // Cleared before resolving, so a continuation that reopens the modal
  // synchronously cannot have its own resolver overwritten by this one.
  modal.pendingResult = undefined
  settle(result)
}

/**
 * The single close path. `close()`, the provider's own close event and
 * close-all all delegate here, so prop reset and result settlement are each
 * defined once rather than being an obligation four call sites must remember.
 */
export const closeModal = (registry: ModalRegistry, id: string, result?: unknown) => {
  const modal = registry.modals[id]

  if (!modal) {
    return
  }

  if (modal.resetPropsOnClose) {
    // A fresh copy every time. Handing back the snapshot object itself makes
    // the live props *be* the snapshot, so the next in-place mutation corrupts
    // it and reset silently stops working from the second cycle on.
    modal.props = markRaw({ ...modal.initialProps })
  }

  modal.isOpen = false

  settleModalResult(modal, result)
}

export const closeAllModals = (registry: ModalRegistry) => {
  Object.keys(registry.modals).forEach((id) => closeModal(registry, id))
}
