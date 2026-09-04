import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type Component } from 'vue'
import * as publicApi from '@/lib'
import { ModalProvider, useModal, useModalManager } from '@/lib'
import { StubModal, createTestApp, mountApp } from './helpers'

const docLink = import.meta.env.VITE_DOC_LINK

/**
 * Mounts a root that is expected to throw, and hands back the *first* thing it
 * threw — an `errorHandler` lets the failed component render anyway, so later
 * knock-on errors would otherwise mask the cause.
 */
const captureMountError = (root: Component, install = false) => {
  const app = install ? createTestApp(root) : createApp(root)
  const container = document.createElement('div')
  let captured: unknown

  vi.spyOn(console, 'warn').mockImplementation(() => {})
  app.config.errorHandler = (error) => {
    captured = captured ?? error
  }
  app.mount(container)
  app.unmount()

  return captured as Error | undefined
}

const hostRegistering = (...calls: Array<() => unknown>) =>
  defineComponent({
    name: 'ModalHost',
    setup() {
      calls.forEach((call) => call())
      return () => h(ModalProvider)
    }
  })

const openStates = (registry: { modals: Record<string, { isOpen: boolean }> }) =>
  Object.values(registry.modals).map((modal) => modal.isOpen)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registry is created per Vue application', () => {
  it('provides a new empty registry on install', () => {
    const { registry, unmount } = mountApp(defineComponent({ setup: () => () => h('div') }))

    expect(registry.modals).toEqual({})
    expect(registry.isServerRendered).toBe(false)

    unmount()
  })

  it('does not share modal state between two applications', () => {
    const first = mountApp(hostRegistering(() => useModal({ id: 'first', component: StubModal })))
    const second = mountApp(defineComponent({ setup: () => () => h(ModalProvider) }))

    expect(Object.keys(first.registry.modals)).toEqual(['first'])
    expect(second.registry.modals).toEqual({})
    expect(second.registry).not.toBe(first.registry)

    first.unmount()
    second.unmount()
  })

  it('exports no mutable module-level registry', () => {
    // Deliberately pins the whole public surface rather than only asserting the
    // absence of a registry: that is the only way an accidentally re-exported
    // `modals` gets caught. A change that genuinely adds an export updates this
    // list on purpose.
    expect(Object.keys(publicApi).sort()).toEqual([
      'ModalProvider',
      'VueModalManager',
      'useModal',
      'useModalManager'
    ])
  })
})

describe('the registry has to be injectable', () => {
  it('throws from useModal outside a setup context', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => useModal({ component: StubModal })).toThrowError(/Missing modal registry/)
    expect(() => useModal({ component: StubModal })).toThrowError(docLink)
  })

  it('throws from useModalManager outside a setup context', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => useModalManager()).toThrowError(/Missing modal registry/)
    expect(() => useModalManager()).toThrowError(docLink)
  })

  it('throws from useModal when the plugin was never installed', () => {
    const error = captureMountError(hostRegistering(() => useModal({ component: StubModal })))

    expect(error?.message).toMatch(/Missing modal registry/)
    expect(error?.message).toContain(docLink)
  })

  it('throws from useModalManager when the plugin was never installed', () => {
    const error = captureMountError(hostRegistering(() => useModalManager()))

    expect(error?.message).toMatch(/Missing modal registry/)
    expect(error?.message).toContain(docLink)
  })

  it('throws from ModalProvider when the plugin was never installed', () => {
    const error = captureMountError(defineComponent({ setup: () => () => h(ModalProvider) }))

    expect(error?.message).toMatch(/Missing modal registry/)
    expect(error?.message).toContain(docLink)
  })
})

describe('registration and removal', () => {
  it('inserts exactly one closed entry', () => {
    const { registry, unmount } = mountApp(
      hostRegistering(() => useModal({ id: 'only', component: StubModal }))
    )

    expect(Object.keys(registry.modals)).toEqual(['only'])
    expect(registry.modals.only.isOpen).toBe(false)

    unmount()
  })

  it('deletes the entry on unmount', () => {
    const { registry, unmount } = mountApp(
      hostRegistering(() => useModal({ id: 'only', component: StubModal }))
    )

    unmount()

    expect(registry.modals).toEqual({})
  })

  it('does not write onto the supplied options object', () => {
    const shared = { component: StubModal, props: { label: 'shared' } }
    const { registry, unmount } = mountApp(
      hostRegistering(
        () => useModal(shared),
        () => useModal(shared)
      )
    )

    expect(Object.keys(registry.modals)).toHaveLength(2)
    expect('id' in shared).toBe(false)
    expect('resetPropsOnClose' in shared).toBe(false)

    unmount()
  })
})

describe('id assignment', () => {
  it('generates a unique id when none is supplied', () => {
    const { registry, unmount } = mountApp(
      hostRegistering(() => useModal({ component: StubModal }))
    )

    const ids = Object.keys(registry.modals)

    expect(ids).toHaveLength(1)
    expect(ids[0]).toBeTruthy()

    unmount()
  })

  it('uses an explicit id verbatim', () => {
    const { registry, unmount } = mountApp(
      hostRegistering(() => useModal({ id: 'user-create-modal', component: StubModal }))
    )

    expect(registry.modals['user-create-modal']).toBeDefined()

    unmount()
  })

  it('gives two sibling modals distinct ids', () => {
    const { registry, unmount } = mountApp(
      hostRegistering(
        () => useModal({ component: StubModal }),
        () => useModal({ component: StubModal })
      )
    )

    const ids = Object.keys(registry.modals)

    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])

    unmount()
  })
})

describe('duplicate explicit ids', () => {
  const Duplicating = defineComponent({
    name: 'DuplicateIdHost',
    setup() {
      useModal({ id: 'confirm', component: StubModal })
      return () => h('div')
    }
  })

  const TwoDuplicates = defineComponent({
    name: 'TwoDuplicates',
    setup: () => () => [h(Duplicating), h(Duplicating)]
  })

  it('warns, naming the duplicated id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { unmount } = mountApp(TwoDuplicates)

    // Filtered rather than counted outright: an unrelated Vue dev warning on
    // this console must not decide whether our own warning fired.
    const ownWarnings = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('[vue-modal-manager]'))

    expect(ownWarnings).toHaveLength(1)
    expect(ownWarnings[0]).toContain('confirm')

    unmount()
  })

  it('does not throw and resolves to a single entry', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { registry, unmount } = mountApp(TwoDuplicates)

    expect(Object.keys(registry.modals)).toEqual(['confirm'])

    unmount()
  })
})

describe('global close-all', () => {
  const mountThreeOpenModals = () => {
    let closeAll!: () => void
    let closeAllModals!: () => void

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        const first = useModal({ id: 'a', component: StubModal })
        const second = useModal({ id: 'b', component: StubModal })
        const third = useModal({ id: 'c', component: StubModal })

        closeAll = useModalManager().closeAll
        closeAllModals = first.closeAllModals

        first.open()
        second.open()
        third.open()

        return () => h(ModalProvider)
      }
    })

    const mounted = mountApp(Host)

    return {
      ...mounted,
      closeAll: () => closeAll(),
      closeAllModals: () => closeAllModals()
    }
  }

  it('closes every modal through useModalManager', () => {
    const { registry, closeAll, unmount } = mountThreeOpenModals()

    expect(openStates(registry)).toEqual([true, true, true])

    closeAll()

    expect(openStates(registry)).toEqual([false, false, false])

    unmount()
  })

  it('closes every modal through the closeAllModals alias', () => {
    const { registry, closeAllModals, unmount } = mountThreeOpenModals()

    expect(openStates(registry)).toEqual([true, true, true])

    closeAllModals()

    expect(openStates(registry)).toEqual([false, false, false])

    unmount()
  })
})

describe('opening a removed modal', () => {
  it('is inert and does not fire onOpen', () => {
    const onOpen = vi.fn()
    let open!: () => void

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        open = useModal({ id: 'gone', component: StubModal, onOpen }).open
        return () => h('div')
      }
    })

    const { registry, unmount } = mountApp(Host)

    unmount()

    expect(() => open()).not.toThrow()
    expect(onOpen).not.toHaveBeenCalled()
    expect(registry.modals).toEqual({})
  })
})

describe('closing a removed modal', () => {
  it('is a no-op rather than a TypeError', () => {
    let close!: () => void

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        close = useModal({ id: 'gone', component: StubModal }).close
        return () => h('div')
      }
    })

    const { registry, unmount } = mountApp(Host)

    unmount()

    expect(() => close()).not.toThrow()
    expect(registry.modals).toEqual({})
  })
})
