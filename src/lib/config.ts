export type ModalManagerPreset = 'naive-ui' | 'element-plus' | 'vuetify' | 'quasar' | 'prime-vue'

export const presetConfigurations: Record<
  ModalManagerPreset,
  { openPropName: string; openEventName: string }
> = {
  'naive-ui': {
    openPropName: 'show',
    openEventName: 'update:show'
  },
  'element-plus': {
    openPropName: 'model-value',
    openEventName: 'update:model-value'
  },
  vuetify: {
    openPropName: 'model-value',
    openEventName: 'update:model-value'
  },
  quasar: {
    openPropName: 'model-value',
    openEventName: 'update:model-value'
  },
  'prime-vue': {
    openPropName: 'visible',
    openEventName: 'update:visible'
  }
}
