import { type Component, computed, onBeforeUnmount, type ExtractPropTypes, markRaw } from 'vue'
import { modals } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'

export interface UseModalOptions<ComponentType extends Component> {
  id?: string
  component: Component
  props?: ExtractPropTypes<ComponentType>
  slots?: any
  onOpen?: () => void
  resetPropsOnClose?: boolean
}

export const useModal = <T extends Component>(options: UseModalOptions<T>) => {
  if (!options?.id) {
    options.id = uuidv4()
  }

  if (typeof options.resetPropsOnClose !== 'boolean') {
    options.resetPropsOnClose = true
  }

  modals[options.id] = {
    isOpen: false,
    component: markRaw(options.component),
    props: options.props,
    initialProps: options.props,
    slots: options.slots,
    resetPropsOnClose: options.resetPropsOnClose
  }

  const isOpen = computed(() => !!options.id && !!modals[options.id]?.isOpen)

  onBeforeUnmount(() => {
    if (typeof options.id === 'string' && modals[options.id]) {
      delete modals[options.id]
    }
  })

  return {
    open: (openOptions?: { props?: ExtractPropTypes<T> }) => {
      if (!options.id) {
        return
      }
      if (modals[options.id]) {
        if (openOptions?.props) {
          modals[options.id].props = { ...(modals[options.id].props || {}), ...openOptions.props }
        }
        modals[options.id].isOpen = true
      }
      options.onOpen?.()
    },
    close: () => {
      if (!options.id) {
        return
      }
      if (options.resetPropsOnClose) {
        modals[options.id].props = options.props
      }
      if (modals[options.id]) {
        modals[options.id].isOpen = false
      }
    },
    isOpen
  }
}
