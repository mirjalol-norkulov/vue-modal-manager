import { describe, it } from 'vitest'
import { defineComponent, h, reactive, ref, type PropType } from 'vue'
import { NModal, NButton } from 'naive-ui'
import { useModal, type UseModalOptions } from '@/lib'

/** Stands in for the `ConfirmDialog` the documented confirm pattern uses. */
const ConfirmDialog = defineComponent({
  props: {
    visible: Boolean,
    onConfirm: Function as PropType<() => void>,
    onCancel: Function as PropType<() => void>
  },
  setup: () => () => null
})

// Every code sample from docs/migration/0-1-0.md and docs/api/composables.md.
describe('documented samples', () => {
  it('migration: explicit type argument still works', () => {
    useModal<typeof NModal>({ component: NModal, props: { preset: 'card' } })
  })

  it('migration: the as any escape hatch', () => {
    const whatever = { totallyMadeUpProp: 123 }
    useModal({ component: NModal, props: { ...whatever } as any })
  })

  it('migration: UseModalOptions still usable as a reference', () => {
    const options: UseModalOptions<typeof NModal> = { component: NModal }
    void options
  })

  it('migration + api: slots', () => {
    useModal({
      component: NModal,
      slots: {
        default: () => h('p', 'Are you sure?'),
        footer: () => h(NButton, () => 'Close')
      }
    })
  })

  it('api: inference with no type argument', () => {
    useModal({ component: NModal, props: { preset: 'card' } })
  })

  it('api: the confirm pattern', async () => {
    const { openAsync, close } = useModal({
      component: ConfirmDialog,
      props: {
        onConfirm: () => close(true),
        onCancel: () => close(false)
      }
    })

    const confirmed = await openAsync()
    void confirmed
  })

  it('migration + api: a ref as a prop value stays live', () => {
    const title = ref('Initial')
    const { open } = useModal({ component: NModal, props: { title } })

    title.value = 'Changed'
    open({ props: { title: 'Set when opening' } })
  })

  it('migration: the props object is copied at registration', () => {
    const props = reactive({ title: 'Initial' })
    useModal({ component: NModal, props })

    props.title = 'Changed'
  })

  it('api: per-modal configuration', () => {
    useModal({ component: NModal })
    useModal({ component: NModal, preset: 'prime-vue' })
    useModal({
      component: NModal,
      openPropName: 'isShown',
      openEventName: 'update:isShown'
    })
  })

  it('api: scoped slot', () => {
    useModal({
      component: NModal,
      slots: { item: ({ row }: { row: { name: string } }) => h('span', row.name) }
    })
  })
})
