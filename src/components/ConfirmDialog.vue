<script setup lang="ts">
/**
 * A headless dialog that belongs to no UI kit, so the playground has a modal
 * whose open prop and event names differ from the application-wide `naive-ui`
 * preset. It is driven through `visible` / `update:visible`.
 */
defineProps<{
  visible?: boolean
  question?: string
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'answer', value: boolean): void
}>()

// Order is load-bearing: whatever closes the modal settles a pending
// `openAsync()`, and only the first settlement counts. Emitting `update:visible`
// first would resolve the promise with `undefined` and make the `close(value)`
// that follows a no-op.
const answer = (value: boolean) => {
  emit('answer', value)
  emit('update:visible', false)
}
</script>

<template>
  <div v-if="visible" class="confirm-backdrop" @click.self="emit('update:visible', false)">
    <div class="confirm-dialog">
      <p>{{ question }}</p>
      <slot name="details" />
      <footer>
        <button type="button" @click="answer(false)">Cancel</button>
        <button type="button" @click="answer(true)">Confirm</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 40%);
}

.confirm-dialog {
  min-width: 20rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: white;
}

footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
