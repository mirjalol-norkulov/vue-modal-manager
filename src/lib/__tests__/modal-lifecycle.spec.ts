import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { ModalProvider, useModal, useModalManager, type UseModalOptions } from '@/lib'
import { StubModal, mountApp } from './helpers'

type ModalHandle = ReturnType<typeof useModal<typeof StubModal, string>>

/** Mounts a host registering one modal beneath the provider. */
const mountWithModal = (options: UseModalOptions<typeof StubModal>) => {
  let handle!: ModalHandle

  const Host = defineComponent({
    name: 'ModalHost',
    setup() {
      handle = useModal<typeof StubModal, string>(options)
      return () => h(ModalProvider)
    }
  })

  const mounted = mountApp(Host)
  const id = Object.keys(mounted.registry.modals)[0]

  return {
    ...mounted,
    id,
    handle: () => handle,
    entry: () => mounted.registry.modals[id]
  }
}

/**
 * The same, over a props-free probe that captures the listener the provider
 * bound — so `selfClose()` takes the path a real dialog takes when it closes
 * itself through a close button, escape, or the backdrop.
 */
const mountWithProbe = (options: { id?: string; props?: Record<string, unknown> } = {}) => {
  let handle!: ReturnType<typeof useModal>
  let received: Record<string, unknown> = {}

  const ProbeModal = defineComponent({
    name: 'ProbeModal',
    inheritAttrs: false,
    setup:
      (_props, { attrs }) =>
      () => {
        received = { ...attrs }
        return h('div', { class: 'probe' })
      }
  })

  const Host = defineComponent({
    name: 'ModalHost',
    setup() {
      handle = useModal({ id: options.id, component: ProbeModal, props: options.props })
      return () => h(ModalProvider)
    }
  })

  const mounted = mountApp(Host)

  return {
    ...mounted,
    handle: () => handle,
    id: Object.keys(mounted.registry.modals)[0],
    /** Closes the modal the way the modal itself would. */
    selfClose: () => (received['onUpdate:show'] as (value: boolean) => void)(false)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('opening merges supplied props over the current props', () => {
  it('leaves props unchanged when open() is called with none', () => {
    const { handle, entry, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      props: { label: 'initial' }
    })

    handle().open()

    expect(entry().isOpen).toBe(true)
    expect(entry().props).toEqual({ label: 'initial' })

    unmount()
  })

  it('merges rather than replaces', () => {
    const { handle, entry, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      props: { label: 'initial' }
    })

    handle().open({ props: { show: true } })

    expect(entry().props).toEqual({ label: 'initial', show: true })

    unmount()
  })

  it('does not corrupt the registration snapshot', () => {
    const { handle, entry, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      props: { label: 'initial' }
    })

    handle().open({ props: { label: 'opened' } })

    expect(entry().initialProps).toEqual({ label: 'initial' })
    expect(entry().props).not.toBe(entry().initialProps)

    handle().close()

    expect(entry().props).toEqual({ label: 'initial' })

    unmount()
  })
})

describe('registration copies the supplied props object', () => {
  it('never writes to the object the caller passed', () => {
    const passed = { label: 'initial' }
    const { handle, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      props: passed
    })

    handle().open({ props: { label: 'opened' } })
    handle().close()

    // The copy is what lets the documentation promise `options` is never
    // written to — aliasing would also stamp `markRaw`'s flag onto it.
    expect(passed).toEqual({ label: 'initial' })

    unmount()
  })

  it('does not follow later mutations of that object', () => {
    const passed = { label: 'initial' }
    const { entry, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      props: passed
    })

    passed.label = 'mutated after registration'

    // A `ref` as a prop *value* is the supported way to keep a prop live; the
    // provider unwraps and tracks those. The props object itself is a snapshot.
    expect(entry().props).toEqual({ label: 'initial' })

    unmount()
  })
})

describe('prop reset has a single definition', () => {
  const registered = { id: 'lifecycle', component: StubModal, props: { label: 'initial' } }

  it('restores the snapshot when closed from the handle', () => {
    const { handle, entry, unmount } = mountWithModal(registered)

    handle().open({ props: { label: 'opened' } })
    handle().close()

    expect(entry().props).toEqual({ label: 'initial' })

    unmount()
  })

  it('restores the snapshot identically when the modal closes itself', () => {
    const { handle, registry, id, selfClose, unmount } = mountWithProbe({
      id: 'lifecycle',
      props: { label: 'initial' }
    })

    handle().open({ props: { label: 'opened' } })
    selfClose()

    expect(registry.modals[id].props).toEqual({ label: 'initial' })
    expect(registry.modals[id].isOpen).toBe(false)

    unmount()
  })

  it('retains the merged props when resetPropsOnClose is false', () => {
    const { handle, entry, unmount } = mountWithModal({ ...registered, resetPropsOnClose: false })

    handle().open({ props: { label: 'opened' } })
    handle().close()

    expect(entry().props).toEqual({ label: 'opened' })

    unmount()
  })

  it('restores the snapshot after a top-level entry was reassigned in place', () => {
    const { handle, entry, unmount } = mountWithModal(registered)

    handle().open()
    entry().props.label = 'mutated in place'
    handle().close()

    expect(entry().props).toEqual({ label: 'initial' })

    unmount()
  })

  it('still restores it on a second cycle, because restore copies the snapshot', () => {
    const { handle, entry, unmount } = mountWithModal(registered)

    handle().open({ props: { label: 'opened' } })
    handle().close()

    // The case that fails when restore hands back the snapshot object itself:
    // the live props then *are* the snapshot, so this mutation corrupts it.
    handle().open()
    entry().props.label = 'mutated in place'
    handle().close()

    expect(entry().props).toEqual({ label: 'initial' })
    expect(entry().initialProps).toEqual({ label: 'initial' })

    unmount()
  })
})

describe('closing with a result', () => {
  it('closes when given one', () => {
    const { handle, entry, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    handle().open()
    handle().close('confirmed')

    expect(entry().isOpen).toBe(false)

    unmount()
  })

  it('closes when given none', () => {
    const { handle, entry, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    handle().open()
    handle().close()

    expect(entry().isOpen).toBe(false)

    unmount()
  })
})

describe('openAsync resolves when the modal closes', () => {
  it('resolves with the value passed to close()', async () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const result = handle().openAsync()
    handle().close('confirmed')

    await expect(result).resolves.toBe('confirmed')

    unmount()
  })

  it('resolves with undefined when close() carries no result', async () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const result = handle().openAsync()
    handle().close()

    await expect(result).resolves.toBeUndefined()

    unmount()
  })

  it('resolves with undefined when the modal closes itself', async () => {
    const { handle, selfClose, unmount } = mountWithProbe({ id: 'lifecycle' })

    const result = handle().openAsync()
    selfClose()

    await expect(result).resolves.toBeUndefined()

    unmount()
  })

  it('leaves open() returning undefined rather than a promise', () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    expect(handle().open()).toBeUndefined()

    unmount()
  })
})

describe('openAsync always settles and never rejects', () => {
  it('settles both pending promises on close-all', async () => {
    let first!: ReturnType<typeof useModal>
    let second!: ReturnType<typeof useModal>
    let closeAll!: () => void

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        first = useModal({ id: 'a', component: StubModal })
        second = useModal({ id: 'b', component: StubModal })
        closeAll = useModalManager().closeAll
        return () => h(ModalProvider)
      }
    })

    const { unmount } = mountApp(Host)

    const results = Promise.all([first.openAsync(), second.openAsync()])
    closeAll()

    await expect(results).resolves.toEqual([undefined, undefined])

    unmount()
  })

  it('settles when the owning component unmounts while open', async () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const result = handle().openAsync()
    unmount()

    await expect(result).resolves.toBeUndefined()
  })

  it('settles the prior promise when openAsync is called while already open', async () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const first = handle().openAsync()
    const second = handle().openAsync()

    await expect(first).resolves.toBeUndefined()

    handle().close('second answer')

    await expect(second).resolves.toBe('second answer')

    unmount()
  })

  it('leaves a pending promise pending when plain open() is called', async () => {
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const result = handle().openAsync()
    let settled = false
    void result.then(() => {
      settled = true
    })

    handle().open()
    await Promise.resolve()

    expect(settled).toBe(false)

    handle().close('eventually')

    await expect(result).resolves.toBe('eventually')

    unmount()
  })

  it('resolves rather than rejects when the modal is dismissed', async () => {
    const rejection = vi.fn()
    const { handle, selfClose, unmount } = mountWithProbe({ id: 'lifecycle' })

    const result = handle().openAsync().catch(rejection)
    selfClose()

    await expect(result).resolves.toBeUndefined()
    expect(rejection).not.toHaveBeenCalled()

    unmount()
  })

  it('resolves with undefined rather than rejecting when close() is given a rejecting thenable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onReject = vi.fn()
    const { handle, unmount } = mountWithModal({ id: 'lifecycle', component: StubModal })

    const result = handle().openAsync()

    // A promise resolved with a thenable adopts it — the language rule, not
    // something the library can wrap its way out of. So the never-rejects
    // guarantee is kept by catching, and the warning is what tells the consumer.
    handle().close(Promise.reject(new Error('boom')) as never)

    await expect(result.catch(onReject)).resolves.toBeUndefined()
    expect(onReject).not.toHaveBeenCalled()
    expect(
      warn.mock.calls
        .map((call) => String(call[0]))
        .filter((m) => m.includes('[vue-modal-manager]'))
    ).toHaveLength(1)

    unmount()
  })

  it('does not reject on any settlement path', async () => {
    const paths: Array<Promise<unknown>> = []
    const { handle, selfClose, unmount } = mountWithProbe({ id: 'lifecycle' })

    paths.push(handle().openAsync())
    handle().close('result')

    paths.push(handle().openAsync())
    selfClose()

    paths.push(handle().openAsync())
    handle().closeAllModals()

    const reopened = handle().openAsync()
    paths.push(reopened, handle().openAsync())
    handle().close()

    paths.push(handle().openAsync())
    unmount()

    await expect(Promise.allSettled(paths)).resolves.toEqual(
      paths.map(() => expect.objectContaining({ status: 'fulfilled' }))
    )
  })
})

describe('the open hook fires for both open operations', () => {
  it('fires exactly once for openAsync', () => {
    const onOpen = vi.fn()
    const { handle, unmount } = mountWithModal({
      id: 'lifecycle',
      component: StubModal,
      onOpen
    })

    void handle().openAsync()

    expect(onOpen).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('does not fire when the registry entry no longer exists', async () => {
    const onOpen = vi.fn()
    let handle!: ReturnType<typeof useModal>

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        handle = useModal({ id: 'gone', component: StubModal, onOpen })
        return () => h(ModalProvider)
      }
    })

    const { unmount } = mountApp(Host)

    unmount()

    handle.open()
    await expect(handle.openAsync()).resolves.toBeUndefined()

    expect(onOpen).not.toHaveBeenCalled()
  })
})
