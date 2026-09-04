// @vitest-environment node
//
// `vitest.config.ts` sets `environment: 'jsdom'` globally. Every scenario below
// is about behaviour in a DOM-free process, so under jsdom they would all pass
// vacuously — the docblock above is load-bearing.
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { ModalProvider, useModal } from '@/lib'
import { StubModal, renderApp } from './helpers'

const hostRegistering = (id: string, label: string, openOnSetup = false) =>
  defineComponent({
    name: 'ModalHost',
    setup() {
      const modal = useModal({ id, component: StubModal, props: { label } })

      if (openOnSetup) {
        modal.open()
      }

      return () => h(ModalProvider)
    }
  })

describe('the test environment itself', () => {
  it('has no DOM globals, so the scenarios below are not vacuous', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(typeof localStorage).toBe('undefined')
  })
})

describe('server renders do not share modal state', () => {
  it('gives two sequential renders their own entries', async () => {
    const first = await renderApp(hostRegistering('first', 'first-label'))
    const second = await renderApp(hostRegistering('second', 'second-label'))

    expect(Object.keys(first.registry.modals)).toEqual(['first'])
    expect(Object.keys(second.registry.modals)).toEqual(['second'])
    expect(second.registry).not.toBe(first.registry)
  })

  it('does not leak props from one render into another', async () => {
    const first = await renderApp(hostRegistering('first', 'request-1-secret'))
    const second = await renderApp(hostRegistering('second', 'request-2-label'))

    expect(first.html).toContain('request-1-secret')
    expect(JSON.stringify(second.registry.modals)).not.toContain('request-1-secret')
    expect(second.html).not.toContain('request-1-secret')
  })
})

describe('server-side registration does not accumulate', () => {
  it('holds exactly one entry across fifty sequential renders', async () => {
    for (let index = 0; index < 50; index += 1) {
      const { registry } = await renderApp(hostRegistering(`modal-${index}`, `label-${index}`))

      expect(Object.keys(registry.modals)).toEqual([`modal-${index}`])
    }
  })

  it('renders markup containing only its own modals', async () => {
    for (let index = 0; index < 5; index += 1) {
      await renderApp(hostRegistering(`earlier-${index}`, `earlier-label-${index}`))
    }

    const { html } = await renderApp(hostRegistering('latest', 'latest-label'))

    expect(html).toContain('latest-label')
    expect(html).not.toContain('earlier-label')
  })
})

describe('opening a modal during a server render', () => {
  it('is inert, and the markup is the closed-state markup', async () => {
    const { registry, html } = await renderApp(hostRegistering('inert', 'inert-label', true))

    expect(registry.modals.inert.isOpen).toBe(false)
    expect(html).toContain('data-open="false"')
    expect(html).not.toContain('data-open="true"')
  })

  it('does not fire onOpen, because the modal did not open', async () => {
    const onOpen = vi.fn()

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        const modal = useModal({ id: 'inert', component: StubModal, onOpen })
        modal.open()
        return () => h(ModalProvider)
      }
    })

    const { registry } = await renderApp(Host)

    expect(onOpen).not.toHaveBeenCalled()
    expect(registry.modals.inert.isOpen).toBe(false)
  })
})

describe('the library in a bare Node environment', () => {
  it('imports and renders without a ReferenceError', async () => {
    await expect(renderApp(hostRegistering('bare', 'bare-label'))).resolves.toBeDefined()
  })

  it('marks the application as server-rendering on install', async () => {
    const { registry } = await renderApp(hostRegistering('bare', 'bare-label'))

    expect(registry.isServerRendered).toBe(true)
  })
})
