<script setup lang="ts">
import ModalProvider from '@/lib/components/ModalProvider.vue'
import { useModal } from '@/lib/composables/use-modal'
import { NModal, NButton } from 'naive-ui'
import { h } from 'vue'

const { open } = useModal<typeof NModal>({
  component: NModal,
  props: {
    preset: 'card',
    style: 'max-width: 480px'
  },
  slots: {
    default: () => h('h1', () => 'Hello World')
  }
})

const handleOpen = () => {
  open({
    props: {
      title: 'Hello'
    }
  })
}
</script>

<template>
  <ModalProvider>
    <div style="padding: 2rem">
      <n-button @click="handleOpen"> Open modal </n-button>
    </div>
  </ModalProvider>
</template>
