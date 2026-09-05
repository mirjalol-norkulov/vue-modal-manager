<script setup lang="ts">
/**
 * A fixture for the type tests: a single-file component with one *required*
 * prop, so "props are partial at every call site" is a real assertion rather
 * than one that would pass anyway.
 */
defineProps<{
  title: string
  subtitle?: string
  visible?: boolean
}>()
</script>

<template>
  <div v-if="visible">
    <h2>{{ title }}</h2>
    <p>{{ subtitle }}</p>
  </div>
</template>
