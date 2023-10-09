import { type Component, reactive } from 'vue'

export type ModalState = {
  component: Component
  isOpen: boolean
  props?: Record<string, unknown>
}
export const modals = reactive<Record<string, ModalState>>({})
