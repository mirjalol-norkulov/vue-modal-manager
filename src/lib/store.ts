import { type Component, reactive } from 'vue'

export type ModalState = {
  component: Component
  isOpen: boolean
  props?: Record<string, unknown>
  initialProps?: Record<string, unknown>
  slots?: any
  resetPropsOnClose?: boolean
}
export const modals = reactive<Record<string, ModalState>>({})
