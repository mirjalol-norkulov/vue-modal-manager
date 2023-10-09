import { type Component, computed, onBeforeUnmount } from 'vue'
import { modals } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'

export interface UseModalOptions {
  id?: string
  component: Component
}

export const useModal = (options: UseModalOptions) => {
  if (!options?.id) {
    options.id = uuidv4()
  }

  const isOpen = computed(() => options.id && !!modals[options.id]?.isOpen)

  onBeforeUnmount(() => {
    if (!options.id) {
      return
    }
    if (modals[options.id]) {
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
      } else {
        modals[options.id] = {
          isOpen: true,
          component: options.component
        }
      }
    },
    close: () => {
      if (!options.id) {
        return
      }
      if (modals[options.id]) {
        modals[options.id].isOpen = false
      } else {
        modals[options.id] = {
          isOpen: false,
          component: options.component
        }
      }
    },
    isOpen
  }
}
