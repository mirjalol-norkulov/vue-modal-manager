<script setup lang="ts">
import { ref } from 'vue'
import UiModal from '@/components/UiModal.vue'
import ModalProvider from '@/lib/components/ModalProvider.vue'
import { useModal } from '@/lib/composables/use-modal'

const title = ref<string | undefined>()

const { open } = useModal<typeof UiModal>({
  id: 'example-modal',
  component: UiModal,
  props: {
    title
  },
  onOpen() {
    setTimeout(() => {
      title.value = 'Title of the modal'
    }, 1000)
  }
})
</script>

<template>
  <ModalProvider>
    <button @click="open">Open modal</button>
    <p>Title: {{ title }}</p>
  </ModalProvider>
</template>
