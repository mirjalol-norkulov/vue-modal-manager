import {
  type Component,
  computed,
  onBeforeUnmount,
  type ExtractPropTypes,
  markRaw,
  useId
} from 'vue'
import { closeAllModals, closeModal, injectModalRegistry } from '@/lib/store'

export interface UseModalOptions<ComponentType extends Component> {
  id?: string
  component: Component
  props?: ExtractPropTypes<ComponentType>
  slots?: any
  onOpen?: () => void
  resetPropsOnClose?: boolean
}

// The library is type-checked with `types: []` (the Vue DOM config), so the Node
// global is declared narrowly here rather than pulling @types/node into the
// shipped type surface.
declare const process: { env: Record<string, string | undefined> } | undefined

const warnDuplicateId = (id: string) => {
  // `process.env.NODE_ENV` survives this library's build verbatim, so a
  // consumer's bundler is what strips this branch. The `typeof` guard is what
  // keeps a bundler-less UMD consumer from hitting `process is not defined`.
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[vue-modal-manager] A modal with the id "${id}" is already registered. The later registration replaces the earlier one, so both callers share a single modal. Give each modal a unique id, or omit \`id\` to have one generated.`
    )
  }
}

export const useModal = <T extends Component>(options: UseModalOptions<T>) => {
  const registry = injectModalRegistry()

  // Called unconditionally so the id sequence stays in step between the server
  // and client render of the same tree, even where explicit ids are mixed in.
  const generatedId = useId()
  const id = options.id ?? generatedId
  const resetPropsOnClose =
    typeof options.resetPropsOnClose === 'boolean' ? options.resetPropsOnClose : true

  if (options.id && registry.modals[options.id]) {
    warnDuplicateId(options.id)
  }

  registry.modals[id] = {
    isOpen: false,
    component: markRaw(options.component),
    props: options.props,
    initialProps: options.props,
    slots: options.slots,
    resetPropsOnClose
  }

  const isOpen = computed(() => !!registry.modals[id]?.isOpen)

  onBeforeUnmount(() => {
    if (registry.modals[id]) {
      delete registry.modals[id]
    }
  })

  return {
    open: (openOptions?: { props?: ExtractPropTypes<T> }) => {
      // A server-rendered modal can never be interacted with or closed, so
      // opening one would only guarantee a hydration mismatch.
      if (registry.isServerRendered) {
        return
      }

      const modal = registry.modals[id]

      // The entry is gone once the owning component has unmounted. Bail out
      // before `onOpen`, for the same reason the server path does: nothing
      // opened, so the consumer must not be told that something did.
      if (!modal) {
        return
      }

      if (openOptions?.props) {
        modal.props = { ...(modal.props || {}), ...openOptions.props }
      }

      modal.isOpen = true

      options.onOpen?.()
    },
    close: () => closeModal(registry, id),
    closeAllModals: () => closeAllModals(registry),
    isOpen
  }
}
