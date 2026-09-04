import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { ModalProvider, useModal } from '@/lib'
import type { UseModalOptions } from '@/lib/composables/use-modal'
import { StubModal, mountApp } from './helpers'

type ModalHandle = ReturnType<typeof useModal>

/** Mounts a host that registers one modal and renders the provider beneath it. */
const mountWithModal = (options: UseModalOptions<typeof StubModal>) => {
  let handle!: ModalHandle

  const Host = defineComponent({
    name: 'ModalHost',
    setup() {
      handle = useModal(options)
      return () => h(ModalProvider)
    }
  })

  return { ...mountApp(Host), handle: () => handle }
}

describe('registration', () => {
  it('registers exactly one closed entry', () => {
    const { registry, unmount } = mountWithModal({ id: 'characterised', component: StubModal })

    expect(Object.keys(registry.modals)).toEqual(['characterised'])
    expect(registry.modals.characterised.isOpen).toBe(false)

    unmount()
  })

  it('removes the entry when the owning component unmounts', () => {
    const { registry, unmount } = mountWithModal({ id: 'characterised', component: StubModal })

    unmount()

    expect(registry.modals.characterised).toBeUndefined()
  })

  it('renders the registered component through the configured open prop', async () => {
    const { handle, html, unmount } = mountWithModal({
      id: 'characterised',
      component: StubModal,
      props: { label: 'initial' }
    })

    expect(html()).toContain('data-open="false"')
    expect(html()).toContain('initial')

    handle().open()
    await nextTick()

    expect(html()).toContain('data-open="true"')

    unmount()
  })
})

describe('props lifecycle', () => {
  it('merges props passed to open() over the current props', () => {
    const { handle, registry, unmount } = mountWithModal({
      id: 'characterised',
      component: StubModal,
      props: { label: 'initial' }
    })

    handle().open({ props: { show: true } })

    expect(registry.modals.characterised.props).toEqual({ label: 'initial', show: true })
    expect(registry.modals.characterised.isOpen).toBe(true)

    unmount()
  })

  it('restores the initial props on close when resetPropsOnClose defaults', () => {
    const { handle, registry, unmount } = mountWithModal({
      id: 'characterised',
      component: StubModal,
      props: { label: 'initial' }
    })

    handle().open({ props: { label: 'opened' } })
    expect(registry.modals.characterised.props).toEqual({ label: 'opened' })

    handle().close()

    expect(registry.modals.characterised.props).toEqual({ label: 'initial' })
    expect(registry.modals.characterised.isOpen).toBe(false)

    unmount()
  })

  it('keeps the merged props on close when resetPropsOnClose is false', () => {
    const { handle, registry, unmount } = mountWithModal({
      id: 'characterised',
      component: StubModal,
      props: { label: 'initial' },
      resetPropsOnClose: false
    })

    handle().open({ props: { label: 'opened' } })
    handle().close()

    expect(registry.modals.characterised.props).toEqual({ label: 'opened' })

    unmount()
  })

  it('exposes the open state through the returned isOpen computed', () => {
    const { handle, unmount } = mountWithModal({ id: 'characterised', component: StubModal })

    expect(handle().isOpen.value).toBe(false)
    handle().open()
    expect(handle().isOpen.value).toBe(true)
    handle().close()
    expect(handle().isOpen.value).toBe(false)

    unmount()
  })
})
