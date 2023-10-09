<script setup lang="ts">
import { modals } from '@/lib/store'
import { MODAL_OPEN_EVENT_NAME, MODAL_OPEN_PROP_NAME } from '@/lib/injection-keys'
import { inject } from 'vue'
import { capitalize } from '@/lib/helpers'

const openPropName = inject(MODAL_OPEN_PROP_NAME) as string
const openEventName = inject(MODAL_OPEN_EVENT_NAME) as string

const event = openEventName.startsWith('on') ? openEventName : `on${capitalize(openEventName)}`

const handleUpdate = (value: boolean, id: string) => {
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
