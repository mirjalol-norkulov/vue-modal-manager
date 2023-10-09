import { type Component, reactive } from 'vue'

export type ModalState = {
  component: Component
  isOpen: boolean
}
export const modals = reactive<Record<string, ModalState>>({})
