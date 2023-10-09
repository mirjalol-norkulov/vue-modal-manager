<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'radix-vue'

defineProps<{
  title?: string
}>()
</script>

<template>
  <DialogRoot>
    <DialogPortal>
      <DialogOverlay />
      <DialogContent>
        <DialogTitle>
          <slot name="title">
            {{ title }}
          </slot>
        </DialogTitle>
        <DialogDescription>
          <slot name="description"></slot>
        </DialogDescription>
        <DialogClose>X</DialogClose>

        <slot>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam aspernatur culpa
            delectus earum eius enim et eveniet excepturi hic illo ipsum modi molestiae nemo nulla
            reiciendis reprehenderit, saepe sunt voluptatem?
          </p>
        </slot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
