import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, isRef, nextTick, ref, type Component, type VNode } from 'vue'
import { ModalProvider, useModal, type ModalManagerOptions, type UseModalOptions } from '@/lib'
import type { ModalManagerPreset } from '@/lib/config'
import { createTestApp, mountApp } from './helpers'

/**
 * A stand-in for a third-party dialog that declares no props at all, so
 * everything the provider binds — the resolved open prop, the listener, and the
 * modal's own props — lands in `attrs` where a test can read it back verbatim.
 */
const createProbe = (name = 'ProbeModal') => {
  let received: Record<string, unknown> = {}
  let slotChildren: VNode[] | null = null

  const component = defineComponent({
    name,
    inheritAttrs: false,
    setup:
      (_props, { attrs, slots }) =>
      () => {
        received = { ...attrs }
        slotChildren = slots.default ? slots.default() : null

        return h('div', { class: 'probe', 'data-name': name }, [
          slots.default?.(),
          slots.header?.(),
          slots.footer?.()
        ])
      }
  })

  return {
    component,
    /** Everything the provider bound on the most recent render. */
    received: () => received,
    /** The vnodes the supplied `default` slot produced, as the child sees them. */
    slotChildren: () => slotChildren
  }
}

const hostFor = (...modals: Array<UseModalOptions<Component>>) =>
  defineComponent({
    name: 'ModalHost',
    setup() {
      modals.forEach((options) => useModal(options))
      return () => h(ModalProvider, null, { default: () => h('main', 'page content') })
    }
  })

/**
 * Mounts a root expected to throw during render and hands back the *first*
 * thing it threw, so a knock-on error cannot mask the cause.
 */
const captureRenderError = (root: Component, options?: ModalManagerOptions | null) => {
  const app = createTestApp(root, options)
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the provider renders each registered modal', () => {
  it('renders the component once, with the resolved open prop bound to false', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(hostFor({ component: probe.component }))

    expect(container.querySelectorAll('.probe')).toHaveLength(1)
    expect(probe.received().show).toBe(false)

    unmount()
  })

  it('binds the modal props alongside the open state', () => {
    const probe = createProbe()
    const { unmount } = mountApp(hostFor({ component: probe.component, props: { title: 'Hello' } }))

    expect(probe.received().title).toBe('Hello')

    unmount()
  })

  it('still renders wrapped application content, after the modals', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(hostFor({ component: probe.component }))
    const html = container.innerHTML

    expect(html).toContain('page content')
    // Position, not just presence: the render function returning the array in
    // the other order would silently change DOM order and stacking.
    expect(html.indexOf('class="probe"')).toBeLessThan(html.indexOf('page content'))

    unmount()
  })
})

describe('ref-valued props are unwrapped when bound', () => {
  it('binds the value rather than the ref', () => {
    const probe = createProbe()
    const title = ref('from a ref')
    const { unmount } = mountApp(hostFor({ component: probe.component, props: { title } }))

    // Props are `markRaw`ed before they enter the reactive registry, so nothing
    // unwraps them on the way out any more. Binding a `Ref` straight through
    // would reach the modal as an object and render `[object Object]`.
    expect(isRef(probe.received().title)).toBe(false)
    expect(probe.received().title).toBe('from a ref')

    unmount()
  })

  it('keeps tracking the ref, so a later write re-renders the modal', async () => {
    const probe = createProbe()
    const title = ref('first')
    const { unmount } = mountApp(hostFor({ component: probe.component, props: { title } }))

    title.value = 'second'
    await nextTick()

    // Reading `.value` during render tracks it. This is the supported way to
    // have a prop that keeps changing: the props *object* is snapshotted at
    // registration, so mutating that is not.
    expect(probe.received().title).toBe('second')

    unmount()
  })
})

describe('the open event name becomes a listener name', () => {
  it('prefixes and capitalises a standard event name', () => {
    const probe = createProbe()
    const { unmount } = mountApp(hostFor({ component: probe.component }), {
      openPropName: 'show',
      openEventName: 'update:show'
    })

    expect(typeof probe.received()['onUpdate:show']).toBe('function')

    unmount()
  })

  it('leaves a name already in listener form unchanged', () => {
    const probe = createProbe()
    const { unmount } = mountApp(hostFor({ component: probe.component }), {
      openPropName: 'show',
      openEventName: 'onUpdate:show'
    })

    expect(typeof probe.received()['onUpdate:show']).toBe('function')
    expect(probe.received()).not.toHaveProperty('onOnUpdate:show')

    unmount()
  })
})

describe('per-modal configuration overrides the application default', () => {
  const naiveUi: ModalManagerOptions = { preset: 'naive-ui' }

  it('lets an explicit per-modal pair win over the application preset', () => {
    const probe = createProbe()
    const { unmount } = mountApp(
      hostFor({
        component: probe.component,
        openPropName: 'visible',
        openEventName: 'update:visible'
      }),
      naiveUi
    )

    expect(probe.received().visible).toBe(false)
    expect(typeof probe.received()['onUpdate:visible']).toBe('function')
    expect(probe.received()).not.toHaveProperty('show')

    unmount()
  })

  it('lets a per-modal preset win over the application preset', () => {
    const probe = createProbe()
    const { unmount } = mountApp(
      hostFor({ component: probe.component, preset: 'element-plus' }),
      naiveUi
    )

    expect(probe.received()['model-value']).toBe(false)
    expect(typeof probe.received()['onUpdate:model-value']).toBe('function')
    expect(probe.received()).not.toHaveProperty('show')

    unmount()
  })

  it('falls back to the application default when the modal declares nothing', () => {
    const probe = createProbe()
    const { unmount } = mountApp(hostFor({ component: probe.component }), naiveUi)

    expect(probe.received().show).toBe(false)
    expect(typeof probe.received()['onUpdate:show']).toBe('function')

    unmount()
  })

  it('renders two UI kits in one application', () => {
    const naive = createProbe('NaiveProbe')
    const prime = createProbe('PrimeProbe')

    const { unmount } = mountApp(
      hostFor(
        { component: naive.component, preset: 'naive-ui' },
        { component: prime.component, preset: 'prime-vue' }
      ),
      naiveUi
    )

    expect(naive.received().show).toBe(false)
    expect(naive.received()).not.toHaveProperty('visible')
    expect(prime.received().visible).toBe(false)
    expect(prime.received()).not.toHaveProperty('show')

    unmount()
  })
})

describe('configuration that cannot resolve', () => {
  it('raises an error naming the modal, rather than binding an undefined prop', () => {
    const probe = createProbe()
    const error = captureRenderError(
      hostFor({ id: 'unconfigured', component: probe.component }),
      null
    )

    expect(error?.message).toContain('unconfigured')
    expect(error?.message).toContain(import.meta.env.VITE_DOC_LINK)
  })

  it('treats a preset absent from the preset table as the same failure', () => {
    const probe = createProbe()
    const error = captureRenderError(
      hostFor({
        id: 'bogus-preset',
        component: probe.component,
        // What an untyped consumer, or a cast, can produce. Reading
        // `.openPropName` off the absent entry would raise a bare `TypeError`.
        preset: 'not-a-real-kit' as ModalManagerPreset
      })
    )

    expect(error).toBeInstanceOf(Error)
    expect(error?.message).not.toMatch(/Cannot read propert/)
    expect(error?.message).toContain('bogus-preset')
    expect(error?.message).toContain('not-a-real-kit')
    expect(error?.message).toContain(import.meta.env.VITE_DOC_LINK)
  })
})

describe('plugin configuration is optional', () => {
  it('installs with no options when every modal configures itself', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(
      hostFor({
        component: probe.component,
        openPropName: 'visible',
        openEventName: 'update:visible'
      }),
      null
    )

    expect(container.querySelectorAll('.probe')).toHaveLength(1)
    expect(probe.received().visible).toBe(false)

    unmount()
  })
})

describe('slots are forwarded to the modal component', () => {
  it('renders a default slot', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(
      hostFor({
        component: probe.component,
        slots: { default: () => h('p', 'slotted body') }
      })
    )

    expect(container.querySelector('.probe')?.innerHTML).toContain('slotted body')

    unmount()
  })

  it('renders named slots into their corresponding positions', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(
      hostFor({
        component: probe.component,
        slots: {
          header: () => h('h2', 'slotted header'),
          footer: () => h('footer', 'slotted footer')
        }
      })
    )

    const html = container.querySelector('.probe')?.innerHTML ?? ''

    expect(html).toContain('slotted header')
    expect(html).toContain('slotted footer')

    unmount()
  })

  it('forwards slot functions unwrapped, as the child inspects them', () => {
    const probe = createProbe()
    const { unmount } = mountApp(
      hostFor({
        component: probe.component,
        slots: { default: () => h('strong', 'inspected') }
      })
    )

    const children = probe.slotChildren()

    // Exactly the vnode the supplied slot function produced. Rendering each
    // slot through a nested `<component :is>` — the only way a template
    // expresses dynamic slot names — would put a wrapper vnode here instead,
    // and several UI kits inspect their slot children to decide layout.
    expect(children).toHaveLength(1)
    expect(children?.[0].type).toBe('strong')

    unmount()
  })

  it('renders with no slots when none were supplied', () => {
    const probe = createProbe()
    const { container, unmount } = mountApp(hostFor({ component: probe.component }))

    // No slot function reached the child, so every slot position it offers is
    // empty and its own defaults apply.
    expect(probe.slotChildren()).toBeNull()
    expect(container.querySelector('.probe')?.textContent).toBe('')

    unmount()
  })
})
