import type { InjectionKey } from 'vue'
import type { ModalRegistry } from '@/lib/store'

export const MODAL_OPEN_PROP_NAME: InjectionKey<string> = Symbol('Modal open prop name')
export const MODAL_OPEN_EVENT_NAME: InjectionKey<string> = Symbol('Modal open event name')
export const MODAL_STORE: InjectionKey<ModalRegistry> = Symbol('Modal store')
