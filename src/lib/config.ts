export type ModalManagerPreset = 'naive-ui' | 'element-plus' | 'vuetify' | 'quasar' | 'prime-vue'

/** The pair of names that drives a dialog's open state. */
export type ModalOpenConfig = { openPropName: string; openEventName: string }

/**
 * Whatever carries configuration: a registry entry, or the application-wide
 * defaults the plugin provided.
 */
export type ModalOpenConfigSource = {
  preset?: ModalManagerPreset
  openPropName?: string
  openEventName?: string
}

export const presetConfigurations: Record<ModalManagerPreset, ModalOpenConfig> = {
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

const documentationHint = `Please refer to the documentation on how to setup Vue modal manager: ${
  import.meta.env.VITE_DOC_LINK
}`

/**
 * Looks a preset up, failing with a named error rather than the `TypeError`
 * that reading `.openPropName` off an absent entry would produce. Only types
 * stand between a consumer and a bogus preset name, and a cast defeats those.
 */
export const resolvePresetConfig = (
  preset: ModalManagerPreset,
  subject: string
): ModalOpenConfig => {
  const config = presetConfigurations[preset]

  if (!config) {
    throw new Error(
      `${subject} declares an unknown modal preset "${preset}". Expected one of: ${Object.keys(
        presetConfigurations
      ).join(', ')}. ${documentationHint}`
    )
  }

  return config
}

/**
 * Resolves the names one modal is rendered with, in strict precedence:
 *
 * 1. an explicit per-modal `openPropName` + `openEventName` pair
 * 2. a per-modal `preset`
 * 3. the application-wide values the plugin provided
 *
 * The error names the modal id, because per-modal configuration means a single
 * misconfigured modal now fails on its own rather than the provider failing
 * once, loudly, for the whole application.
 */
export const resolveModalConfig = (
  id: string,
  modal: ModalOpenConfigSource,
  defaults: ModalOpenConfigSource
): ModalOpenConfig => {
  if (modal.openPropName && modal.openEventName) {
    return { openPropName: modal.openPropName, openEventName: modal.openEventName }
  }

  if (modal.preset) {
    return resolvePresetConfig(modal.preset, `Modal "${id}"`)
  }

  if (defaults.openPropName && defaults.openEventName) {
    return { openPropName: defaults.openPropName, openEventName: defaults.openEventName }
  }

  throw new Error(
    `Modal "${id}" has no open prop and event names. Configure them application-wide by passing \`preset\`, or \`openPropName\` and \`openEventName\`, to VueModalManager, or per modal through the same options on \`useModal()\`. ${documentationHint}`
  )
}
