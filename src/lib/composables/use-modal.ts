import {
  type Component,
  type ComputedRef,
  type MaybeRef,
  computed,
  markRaw,
  onBeforeUnmount,
  useId
} from 'vue'
import type { ModalManagerPreset } from '@/lib/config'
import { warnInDevelopment } from '@/lib/helpers'
import {
  closeAllModals,
  closeModal,
  injectModalRegistry,
  settleModalResult,
  type ModalProps,
  type ModalResultSettler,
  type ModalSlots,
  type ModalState
} from '@/lib/store'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Vue exports no `ComponentProps`, so a component's props are destructured by
 * hand here.
 *
 * The unresolved branch is `Record<string, any>` and deliberately not `never`:
 * `Partial<never>` is `never`, and `any` is assignable to every type *except*
 * `never`, so a `never` fallback would make the documented
 * `props: {...} as any` escape hatch fail precisely for the components this
 * utility cannot destructure — async components, plain object components,
 * string tags, and anything typed as bare `Component`.
 *
 * Note that `$props` is wider than a component's own declared props: it also
 * carries `VNodeProps`, `AllowedComponentProps` and `ComponentCustomProps`, so
 * `class`, `style` and the `onVnode*` hooks type-check too.
 */
export type ComponentProps<T> = T extends new (...args: any) => { $props: infer P }
  ? NonNullable<P>
  : T extends (props: infer P, ...args: any) => any
    ? P
    : Record<string, any>

/**
 * `key` and `ref` are removed: both are vnode concerns rather than props, and
 * both are actively harmful here. The provider supplies its own `key` per
 * registry entry, and a `ref` would register a template ref against markup the
 * consumer never wrote.
 */
type BindableProps<T> = Omit<ComponentProps<T>, 'key' | 'ref'>

/**
 * Props are supplied across two call sites — registration and `open()` — so
 * requiring a complete props object at either would be wrong: every entry is
 * optional.
 *
 * Each value is a `MaybeRef` because `ModalProvider` binds through `unref`, the
 * way a template would. The props *object* is snapshotted at registration, so a
 * ref as a value is how a consumer keeps one prop live afterwards. This is
 * strictly wider than the plain props type, so it rejects nothing that used to
 * be accepted.
 */
export type ModalComponentProps<T> = {
  [Name in keyof BindableProps<T>]?: MaybeRef<BindableProps<T>[Name]>
}

export type OpenModalOptions<T extends Component = Component> = {
  props?: ModalComponentProps<T>
}

/**
 * The three configuration shapes a modal may declare. Each member closes off
 * its siblings with `?: never`, which is what makes half an explicit pair a
 * type error: TypeScript's excess-property check against a plain union admits
 * any property present in *any* constituent, so without these the call
 * `useModal({ component, openPropName: 'visible' })` type-checks clean.
 */
export type ModalConfigOptions =
  | { preset?: never; openPropName?: never; openEventName?: never }
  | { preset: ModalManagerPreset; openPropName?: never; openEventName?: never }
  | { preset?: never; openPropName: string; openEventName: string }

export type UseModalBaseOptions<T extends Component = Component> = {
  id?: string
  component: T
  props?: ModalComponentProps<T>
  slots?: ModalSlots
  onOpen?: () => void
  resetPropsOnClose?: boolean
}

export type UseModalOptions<T extends Component = Component> = UseModalBaseOptions<T> &
  ModalConfigOptions

export type UseModalReturnType<T extends Component = Component, ResultType = unknown> = {
  isOpen: ComputedRef<boolean>
  open: (openOptions?: OpenModalOptions<T>) => void
  /** Resolves when the modal **closes**, never when it finishes opening. */
  openAsync: (openOptions?: OpenModalOptions<T>) => Promise<ResultType | undefined>
  close: (result?: ResultType) => void
  closeAllModals: () => void
}

const warnDuplicateId = (id: string) =>
  warnInDevelopment(
    `A modal with the id "${id}" is already registered. The later registration replaces the earlier one, so both callers share a single modal. Give each modal a unique id, or omit \`id\` to have one generated.`
  )

export const useModal = <T extends Component, ResultType = unknown>(
  options: UseModalOptions<T>
): UseModalReturnType<T, ResultType> => {
  const registry = injectModalRegistry()

  // Called unconditionally so the id sequence stays in step between the server
  // and client render of the same tree, even where explicit ids are mixed in.
  const generatedId = useId()
  const id = options.id ?? generatedId
  const resetPropsOnClose =
    typeof options.resetPropsOnClose === 'boolean' ? options.resetPropsOnClose : true

  if (options.id && registry.modals[options.id]) {
    warnDuplicateId(options.id)
  }

  registry.modals[id] = {
    isOpen: false,
    component: markRaw(options.component),
    // Two independent copies. Aliasing the snapshot to the live props is what
    // made reset a no-op against in-place mutation; `markRaw` keeps a
    // component-valued prop from coming back out of the reactive registry as a
    // proxy, which Vue warns about.
    props: markRaw({ ...options.props } as ModalProps),
    initialProps: markRaw({ ...options.props } as ModalProps),
    slots: options.slots ? markRaw({ ...options.slots }) : undefined,
    resetPropsOnClose,
    preset: options.preset,
    openPropName: options.openPropName,
    openEventName: options.openEventName
  }

  const isOpen = computed(() => !!registry.modals[id]?.isOpen)

  /** The one open path. Returns the entry it opened, or nothing if it did not. */
  const openModal = (openOptions?: OpenModalOptions<T>): ModalState | undefined => {
    // A server-rendered modal can never be interacted with or closed, so
    // opening one would only guarantee a hydration mismatch.
    if (registry.isServerRendered) {
      return undefined
    }

    const modal = registry.modals[id]

    // The entry is gone once the owning component has unmounted. Bail out
    // before `onOpen`, for the same reason the server path does: nothing
    // opened, so the consumer must not be told that something did.
    if (!modal) {
      return undefined
    }

    if (openOptions?.props) {
      modal.props = markRaw({ ...modal.props, ...openOptions.props } as ModalProps)
    }

    modal.isOpen = true

    options.onOpen?.()

    return modal
  }

  onBeforeUnmount(() => {
    const modal = registry.modals[id]

    if (modal) {
      // The modal can no longer be closed once its entry is gone, and a promise
      // that never settles retains its continuation forever.
      settleModalResult(modal)
      delete registry.modals[id]
    }
  })

  return {
    isOpen,
    open: (openOptions) => {
      openModal(openOptions)
    },
    openAsync: (openOptions) => {
      // One entry per id means one pending result per id, so a second call has
      // to dispose of the first rather than leave two requests sharing an
      // answer, or leave the first pending forever.
      settleModalResult(registry.modals[id])

      const modal = openModal(openOptions)

      if (!modal) {
        return Promise.resolve(undefined)
      }

      let settle!: ModalResultSettler

      // The executor only captures the resolver, so there is no statement here
      // that can throw and turn this into a rejected promise.
      const result = new Promise<ResultType | undefined>((resolve) => {
        settle = resolve
      })

      modal.pendingResult = settle

      // The one remaining way this promise could reject is a consumer passing a
      // rejecting thenable to `close(result)`, which the language makes the
      // promise adopt. Attached here, synchronously, so the rejection is always
      // handled: an un-awaited rejection terminates a Node process by default,
      // which on an SSR server is a crash rather than a console warning.
      // `settleModalResult` warns in development when this can happen.
      return result.catch(() => undefined)
    },
    close: (result) => closeModal(registry, id, result),
    closeAllModals: () => closeAllModals(registry)
  }
}
