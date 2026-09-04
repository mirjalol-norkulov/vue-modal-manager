import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { ModalProvider, useModal } from '@/lib'
import { StubModal, mountApp, renderApp, renderThenHydrate } from './helpers'

/**
 * These need a DOM on the client side of the boundary, so they stay under the
 * default jsdom environment. That also means the apps here are not marked
 * server-rendering — `window` exists — which is why the inert-`open()`
 * scenarios live in `ssr-rendering.spec.ts` instead.
 */

const AutoIdHost = defineComponent({
  name: 'AutoIdHost',
  setup() {
    useModal({ component: StubModal, props: { label: 'auto' } })
    return () => h(ModalProvider)
  }
})

const StableHost = defineComponent({
  name: 'StableHost',
  setup() {
    useModal({ id: 'stable', component: StubModal, props: { label: 'stable' } })
    return () => h(ModalProvider, null, { default: () => h('main', 'page content') })
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('automatic ids agree across the server and client boundary', () => {
  it('generates the same id for the same component position', async () => {
    const server = await renderApp(AutoIdHost)
    const client = mountApp(AutoIdHost)

    const serverIds = Object.keys(server.registry.modals)
    const clientIds = Object.keys(client.registry.modals)

    expect(serverIds).toHaveLength(1)
    expect(clientIds).toEqual(serverIds)

    client.unmount()
  })
})

describe('provider output is hydration-stable', () => {
  it('hydrates registered closed modals with no mismatch warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container, unmount } = await renderThenHydrate(StableHost)
    await nextTick()

    const logged = [...warn.mock.calls, ...error.mock.calls].map((call) => String(call[0]))

    expect(logged.filter((message) => /hydrat/i.test(message))).toEqual([])
    expect(container.innerHTML).toContain('page content')
    expect(container.innerHTML).toContain('data-open="false"')

    unmount()
  })

  it('lets the client open a modal after hydration', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    let open!: () => void

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        const modal = useModal({ id: 'stable', component: StubModal, props: { label: 'stable' } })
        open = modal.open
        return () => h(ModalProvider, null, { default: () => h('main', 'page content') })
      }
    })

    const { container, registry, unmount } = await renderThenHydrate(Host)

    expect(registry.modals.stable.isOpen).toBe(false)

    open()
    await nextTick()

    expect(registry.modals.stable.isOpen).toBe(true)
    expect(container.innerHTML).toContain('data-open="true"')

    unmount()
  })
})
