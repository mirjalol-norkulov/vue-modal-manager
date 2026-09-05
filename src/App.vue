<script setup lang="ts">
import { ModalProvider, useModal } from '@/lib'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { NModal, NButton } from 'naive-ui'
import { h, ref } from 'vue'

// Uses the application-wide `naive-ui` preset from `main.ts`.
const naive = useModal({
  component: NModal,
  props: {
    preset: 'card',
    style: 'max-width: 480px'
  },
  slots: {
    // A live assertion that slots render: nothing else on the page produces
    // this text, so if it is missing, slot forwarding is broken.
    default: () => h('h1', 'Hello from a forwarded default slot'),
    footer: () => h('small', 'and from a named one')
  }
})

// A second dialog in the same application, driven by its own prop and event
// names rather than the `naive-ui` preset.
const answer = ref<boolean | undefined>()

// Destructured rather than kept as a handle object: `close` is referenced from
// the options it is returned by, and only the destructured binding breaks that
// inference cycle without an explicit type annotation.
const { openAsync: askForConfirmation, close: answerConfirmation } = useModal<
  typeof ConfirmDialog,
  boolean
>({
  component: ConfirmDialog,
  openPropName: 'visible',
  openEventName: 'update:visible',
  props: {
    question: 'Delete this item?',
    // The result travels back through the existing props channel: no extra
    // API, and the owner already controls the modal's props.
    onAnswer: (value: boolean) => answerConfirmation(value)
  },
  slots: {
    details: () => h('em', 'This cannot be undone.')
  }
})

const handleOpen = () => {
  naive.open({ props: { title: 'Hello' } })
  setTimeout(() => naive.closeAllModals(), 2000)
}

const handleConfirm = async () => {
  // Resolves when the dialog *closes*: with `true`/`false` from `close(result)`,
  // or `undefined` when it was dismissed through the backdrop.
  answer.value = await askForConfirmation()
}
</script>

<template>
  <ModalProvider>
    <div style="padding: 2rem; display: flex; gap: 0.5rem; align-items: center">
      <n-button @click="handleOpen">Open modal</n-button>
      <n-button @click="handleConfirm">Ask for confirmation</n-button>
      <span>Last answer: {{ answer === undefined ? 'dismissed' : answer }}</span>
    </div>
  </ModalProvider>
</template>
