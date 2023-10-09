import type { InjectionKey } from 'vue'

export const MODAL_OPEN_PROP_NAME: InjectionKey<string> = Symbol('Modal open prop name')
export const MODAL_OPEN_EVENT_NAME: InjectionKey<string> = Symbol('Modal open event name')
