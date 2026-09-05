import { describe, expectTypeOf, it } from 'vitest'
import { defineAsyncComponent, defineComponent, ref, type Component } from 'vue'
import { NModal } from 'naive-ui'
import { useModal } from '@/lib'
import TitledModal from './TitledModal.vue'

/*
 * Compile-time assertions. `vitest typecheck --run` executes these; a plain
 * `vitest run` does not, which is why they carry the `.test-d.ts` suffix and
 * have their own script.
 *
 * Negative cases are written as `@ts-expect-error` rather than raw errors, so
 * `pnpm type-check` — which covers this file through `tsconfig.vitest.json` —
 * stays green while still failing if the error ever stops being reported.
 */

/**
 * Components whose props type cannot be destructured from their value. An
 * async component is *not* one of them — `defineAsyncComponent` returns the
 * wrapped component's own type, so its props still resolve.
 */
const BareComponent: Component = TitledModal
const PlainObjectModal = { template: '<div />' }
const AsyncModal = defineAsyncComponent(() => Promise.resolve(TitledModal))

describe('props are inferred from the supplied component', () => {
  it('infers with no explicit type argument', () => {
    useModal({ component: NModal, props: { show: true } })
    useModal({ component: NModal, props: { preset: 'card' } })
  })

  it('still accepts an explicit type argument', () => {
    useModal<typeof NModal>({ component: NModal, props: { preset: 'card' } })
  })

  it('infers the props of a single-file component', () => {
    useModal({ component: TitledModal, props: { title: 'Hello' } })
    useModal({ component: TitledModal, props: { title: 'Hello', subtitle: 'World' } })
  })

  it('infers through defineAsyncComponent, which keeps the wrapped type', () => {
    useModal({ component: AsyncModal, props: { title: 'Hello' } })

    // @ts-expect-error `nope` is not a prop of the wrapped component
    useModal({ component: AsyncModal, props: { title: 'Hello', nope: true } })
  })
})

describe('props outside the component prop surface are rejected', () => {
  it('rejects an unknown prop at registration', () => {
    // @ts-expect-error `totallyMadeUpProp` does not exist on the props of NModal
    useModal({ component: NModal, props: { totallyMadeUpProp: 123 } })

    // @ts-expect-error nor on the props of a single-file component
    useModal({ component: TitledModal, props: { title: 'Hello', nope: true } })
  })

  it('rejects an unknown prop when opening', () => {
    const { open, openAsync } = useModal({ component: NModal })

    // @ts-expect-error `totallyMadeUpProp` does not exist on the props of NModal
    open({ props: { totallyMadeUpProp: 123 } })

    // @ts-expect-error the same check applies to the async open
    void openAsync({ props: { totallyMadeUpProp: 123 } })
  })

  it('rejects a wrong value type for a known prop', () => {
    // @ts-expect-error `show` is a boolean prop
    useModal({ component: NModal, props: { show: 'yes' } })

    // @ts-expect-error `title` is a string prop
    useModal({ component: TitledModal, props: { title: 42 } })
  })

  it('accepts the standard component attributes, which `$props` carries', () => {
    useModal({ component: NModal, props: { style: 'max-width: 480px' } })
    useModal({ component: NModal, props: { class: 'wide' } })
  })

  it('rejects the vnode-level attributes the provider owns', () => {
    // @ts-expect-error the provider supplies its own key per registry entry
    useModal({ component: NModal, props: { key: 'mine' } })

    // @ts-expect-error a ref would register against markup no consumer wrote
    useModal({ component: NModal, props: { ref: 'mine' } })
  })
})

describe('components whose props cannot be inferred stay permissive', () => {
  it('accepts props for a component with no inferrable props type', () => {
    useModal({ component: BareComponent, props: { anything: 'at all' } })
    useModal({ component: PlainObjectModal, props: { anything: 'at all' } })
  })

  it('keeps the documented `as any` escape hatch available', () => {
    // Both branches matter: a `never` fallback would break this for exactly the
    // components the utility cannot destructure, which is where it is needed.
    useModal({ component: NModal, props: { whatever: 1 } as any })
    useModal({ component: BareComponent, props: { whatever: 1 } as any })
  })
})

describe('props are partial at every call site', () => {
  it('accepts a subset at registration', () => {
    useModal({ component: TitledModal, props: { subtitle: 'only the optional one' } })
  })

  it('accepts the remainder when opening', () => {
    const { open } = useModal({ component: TitledModal, props: { subtitle: 'World' } })

    open({ props: { title: 'Hello' } })
  })

  it('accepts no props at all for a component declaring required ones', () => {
    useModal({ component: TitledModal })
  })
})

describe('a prop value may be a ref', () => {
  it('accepts a ref of the prop type, which the provider unwraps when binding', () => {
    useModal({ component: TitledModal, props: { title: ref('Hello') } })
    useModal({ component: NModal, props: { show: ref(true) } })
  })

  it('accepts the remainder as a ref when opening', () => {
    const { open } = useModal({ component: TitledModal })

    open({ props: { title: ref('Hello') } })
  })

  it('still checks what the ref holds', () => {
    // @ts-expect-error `title` is a string prop, so this must be Ref<string>
    useModal({ component: TitledModal, props: { title: ref(42) } })
  })
})

describe('the result types of openAsync and close are related', () => {
  it('resolves to the close argument type, widened with undefined', () => {
    const { openAsync, close } = useModal<typeof NModal, boolean>({ component: NModal })

    // Asserted against an explicit result type on purpose: under the `unknown`
    // default, `unknown | undefined` collapses to `unknown` and this assertion
    // would hold vacuously.
    expectTypeOf(openAsync()).resolves.toEqualTypeOf<boolean | undefined>()
    expectTypeOf(close).parameter(0).toEqualTypeOf<boolean | undefined>()
  })

  it('keeps open() synchronous', () => {
    const { open } = useModal({ component: NModal })

    expectTypeOf(open).returns.toBeVoid()
    expectTypeOf(open).returns.not.toMatchTypeOf<Promise<unknown>>()
  })
})

describe('per-modal configuration options are typed', () => {
  it('accepts a valid preset', () => {
    useModal({ component: NModal, preset: 'element-plus' })
  })

  it('rejects an unknown preset', () => {
    // @ts-expect-error not a ModalManagerPreset
    useModal({ component: NModal, preset: 'not-a-real-kit' })
  })

  it('accepts a complete explicit pair', () => {
    useModal({ component: NModal, openPropName: 'visible', openEventName: 'update:visible' })
  })

  it('rejects half an explicit pair', () => {
    // @ts-expect-error `openEventName` is missing
    useModal({ component: NModal, openPropName: 'visible' })

    // @ts-expect-error `openPropName` is missing
    useModal({ component: NModal, openEventName: 'update:visible' })
  })

  it('rejects a preset combined with an explicit pair', () => {
    // @ts-expect-error the three configuration shapes are mutually exclusive
    useModal({
      component: NModal,
      preset: 'naive-ui',
      openPropName: 'visible',
      openEventName: 'update:visible'
    })
  })
})

describe('unrelated options keep working', () => {
  it('accepts slots, hooks and the reset flag', () => {
    useModal({
      component: TitledModal,
      slots: { default: () => 'content' },
      onOpen: () => {},
      resetPropsOnClose: false
    })
  })

  it('accepts a component declared inline', () => {
    const Inline = defineComponent({
      props: { label: { type: String, required: true } },
      setup: () => () => null
    })

    useModal({ component: Inline, props: { label: 'ok' } })

    // @ts-expect-error `label` is a string prop
    useModal({ component: Inline, props: { label: 1 } })
  })
})
