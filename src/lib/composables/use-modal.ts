import { type Component, computed, onBeforeUnmount, type ExtractPropTypes, markRaw } from 'vue'
import { modals } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'

export interface UseModalOptions<ComponentType extends Component> {
  id?: string
  component: Component
  props?: ExtractPropTypes<ComponentType>
  onOpen?: () => void
}

export const useModal = <T extends Component>(options: UseModalOptions<T>) => {
  if (!options?.id) {
    options.id = uuidv4()
  }

  modals[options.id] = {
    isOpen: false,
    component: markRaw(options.component),
    props: options.props
  }

  const isOpen = computed(() => !!options.id && !!modals[options.id]?.isOpen)

  onBeforeUnmount(() => {
    if (typeof options.id === 'string' && modals[options.id]) {
      delete modals[options.id]
    }
  })

  return {
    open: () => {
      if (!options.id) {
        return
      }
      if (modals[options.id]) {
        modals[options.id].isOpen = true
      }
      options.onOpen?.()
    },
    close: () => {
      if (!options.id) {
        return
      }
      if (modals[options.id]) {
        modals[options.id].isOpen = false
      }
    },
    isOpen
  }
}
