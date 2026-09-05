// @vitest-environment node
//
// `vitest.config.ts` sets `environment: 'jsdom'` globally, and the whole point
// of these scenarios is a DOM-free process: under jsdom `window` exists, so the
// app is not marked server-rendering and `openAsync()` would not be inert. The
// docblock above is load-bearing.
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { ModalProvider, useModal } from '@/lib'
import { StubModal, renderApp } from './helpers'

describe('openAsync is inert during a server render', () => {
  it('resolves immediately, so an awaiting render completes', async () => {
    let resolved: unknown = 'not resolved'

    // Awaited inside the setup, so the render genuinely blocks on it. A promise
    // that pended until a user interaction would hang `renderToString` forever.
    const Host = defineComponent({
      name: 'AwaitingHost',
      async setup() {
        const { openAsync } = useModal({ id: 'awaited', component: StubModal })
        resolved = await openAsync()

        return () => h(ModalProvider)
      }
    })

    const { html } = await renderApp(Host)

    expect(resolved).toBeUndefined()
    expect(html).toContain('stub-modal')
  })

  it('leaves the modal closed, so the markup is the closed-state markup', async () => {
    let result!: Promise<unknown>

    const Host = defineComponent({
      name: 'ModalHost',
      setup() {
        const { openAsync } = useModal({ id: 'inert', component: StubModal })
        result = openAsync()

        return () => h(ModalProvider)
      }
    })

    const { registry, html } = await renderApp(Host)

    await expect(result).resolves.toBeUndefined()
    expect(registry.modals.inert.isOpen).toBe(false)
    expect(html).toContain('data-open="false"')
    expect(html).not.toContain('data-open="true"')
  })
})
