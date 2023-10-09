<script setup lang="ts">
import ModalProvider from '@/lib/components/ModalProvider.vue'
import { useModal } from '@/lib/composables/use-modal'
import { NModal, NButton } from 'naive-ui'

const { open } = useModal<typeof NModal>({
  id: 'example-modal',
  component: NModal,
  props: {
    title: 'Modal example',
    preset: 'card',
    style: 'max-width: 480px'
  }
})
</script>

<template>
  <ModalProvider>
    <div style="padding: 2rem;">
      <n-button @click="open">Open modal</n-button>
    </div>
  </ModalProvider>
</template>
