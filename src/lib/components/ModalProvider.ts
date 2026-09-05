import { defineComponent, Fragment, h, inject, renderSlot, unref, type VNode } from 'vue'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'
import { capitalize } from '@/lib/helpers'
import { resolveModalConfig } from '@/lib/config'
import { closeModal, injectModalRegistry, type ModalProps } from '@/lib/store'

/** `update:show` becomes `onUpdate:show`; a name already in listener form is left alone. */
const listenerName = (openEventName: string) =>
  openEventName.startsWith('on') ? openEventName : `on${capitalize(openEventName)}`

/**
 * Top-level prop values are read through `unref`, which is what a template does
 * and what the reactive registry used to do on the library's behalf: props are
 * `markRaw`ed before they enter it, so nothing unwraps them any more.
 *
 * Reading `.value` here also tracks the ref, so `props: { title: someRef }` is
 * how a modal gets a prop that keeps updating after registration — the props
 * object itself is snapshotted, so mutating it later is not.
 *
 * Only the top level, matching how shallow the rest of the props contract is.
 */
const unwrapProps = (props: ModalProps): ModalProps => {
  const unwrapped: ModalProps = {}

  Object.keys(props).forEach((name) => {
    unwrapped[name] = unref(props[name])
  })

  return unwrapped
}

/**
 * A render function rather than a template. Rendering a slot through a nested
 * `<component :is="fn(scope)">` — the only way a template expresses dynamic
 * slot names — wraps the result in an extra vnode, and several UI kits inspect
 * their slot children to decide layout. `h(component, props, slots)` forwards
 * the slot functions themselves, untouched, which is what a transparent
 * adapter has to do.
 */
export const ModalProvider = defineComponent({
  name: 'ModalProvider',

  setup: (_props, { slots }) => {
    // Fails the same way `useModal()` does, so a missing installation is
    // reported identically wherever it is first observed.
    const registry = injectModalRegistry()

    // Injection is setup-only, so the application-wide defaults are read once
    // here and applied per modal at render time. Both are optional: an
    // application whose every modal carries its own configuration does not have
    // to nominate a global preset.
    const defaults = {
      openPropName: inject<string | undefined>(MODAL_OPEN_PROP_NAME, undefined),
      openEventName: inject<string | undefined>(MODAL_OPEN_EVENT_NAME, undefined)
    }

    const handleUpdate = (value: boolean, id: string) => {
      if (!value) {
        // The same close path as the handle's own `close()`, so a modal that
        // closes itself resets props and settles a pending `openAsync()`
        // identically.
        closeModal(registry, id)
        return
      }

      const modal = registry.modals[id]

      if (modal) {
        modal.isOpen = value
      }
    }

    return () => {
      const modals: VNode[] = Object.entries(registry.modals).map(([id, item]) => {
        const { openPropName, openEventName } = resolveModalConfig(id, item, defaults)

        return h(
          item.component,
          {
            [openPropName]: item.isOpen,
            [listenerName(openEventName)]: (value: boolean) => handleUpdate(value, id),
            // After the open state, so a modal whose own props happen to carry
            // the resolved open prop name drives itself. Documented, and the
            // order the template produced.
            ...unwrapProps(item.props),
            // Last, so the provider's own key wins over anything in `props`.
            key: id
          },
          item.slots
        )
      })

      // Modals first, then the wrapped application content — the order the
      // template produced, and the one hydration parity depends on.
      return [h(Fragment, modals), renderSlot(slots, 'default')]
    }
  }
})
