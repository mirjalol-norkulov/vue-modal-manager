<script setup lang="ts">
import { modals } from '@/lib/store'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'
import { inject } from 'vue'
import { capitalize } from '@/lib/helpers'

const openPropName = inject(MODAL_OPEN_PROP_NAME) as string
const openEventName = inject(MODAL_OPEN_EVENT_NAME) as string

if (!openPropName || !openEventName) {
  throw new Error(
    `Missing modal injection keys. Please refer to the documentation on how to setup Vue modal manager: ${
      import.meta.env.VITE_DOC_LINK
    }`
  )
}

const event = openEventName.startsWith('on') ? openEventName : `on${capitalize(openEventName)}`

const handleUpdate = (value: boolean, id: string) => {
  if (!value && modals[id].resetPropsOnClose) {
    modals[id].props = modals[id].initialProps
  }
  modals[id].isOpen = value
}
</script>

<template>
  <component
    v-for="(item, id) in modals"
    :key="id"
    :is="item.component"
    v-bind="{
      [openPropName]: item.isOpen,
      [event]: (value: boolean) => handleUpdate(value, id),
      ...item.props
    }"
  />
  <slot />
</template>
