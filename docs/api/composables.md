---
outline: deep
---

# API reference

## Composables

### `useModal`

Used to create handler for single or multiple modals

#### Type

```ts
function useModal<T extends Component>(
  options: UseModalOptions
): UseModalReturnType

interface UseModalReturnType { 
  isOpen: ComputedRef<boolean>; 
  close: () => void; 
  open: () => void
}

interface UseModalOptions<ComponentType extends Component> {
  id?: string
  component: Component
  props?: ExtractPropTypes<ComponentType>
  onOpen?: () => void
}
```

#### Example

```vue
<script setup>
import { useModal } from 'vue-modal-manager'
import UserCreateModal from '@/components/UserCreateModal'

const { open } = useModal({
  id: 'user-create-modal',
  component: UserCreateModal
})
</script>

<template>
  <div>
    <button @click="open">Create user</button>
  </div>
</template>
```