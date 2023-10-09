<script setup lang="ts">
import UiModal from '@/components/UiModal.vue'
import ModalProvider from '@/lib/components/ModalProvider.vue'
import { useModal } from '@/lib/composables/use-modal'

const { open } = useModal({
  id: 'example-modal',
  component: UiModal
})
</script>

<template>
  <ModalProvider>
    <button @click="open">Open modal</button>
  </ModalProvider>
</template>
