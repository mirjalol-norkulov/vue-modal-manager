## ADDED Requirements

### Requirement: Props type is inferred from the supplied component

`useModal()` SHALL infer its props type from the value passed as `component`, without requiring an explicit
type argument. The `component` option SHALL be typed by the generic parameter rather than the general
`Component` type.

#### Scenario: Inference without an explicit type argument

- **WHEN** `useModal({ component: NModal, props: { show: true } })` is written with no type argument
- **THEN** the call type-checks and `props` is checked against the props of `NModal`

#### Scenario: Explicit type argument still accepted

- **WHEN** `useModal<typeof NModal>({ component: NModal, props: { preset: 'card' } })` is written
- **THEN** the call type-checks

#### Scenario: Single-file component

- **WHEN** `useModal({ component: MyModal, props: { title: 'Hello' } })` is written for a single-file
  component declaring a `title` prop
- **THEN** the call type-checks

### Requirement: Props outside the component prop surface are rejected

A props entry that is not part of the supplied component `$props` SHALL produce a type error. This replaces the
current behaviour in which every props object is accepted. `$props` is wider than the component own declared
props — it also carries the standard component attributes — so those remain acceptable.

#### Scenario: Unknown prop at registration

- **WHEN** `useModal({ component: NModal, props: { totallyMadeUpProp: 123 } })` is written
- **THEN** a type error reports that `totallyMadeUpProp` does not exist on the props of `NModal`

#### Scenario: Unknown prop when opening

- **WHEN** `open({ props: { totallyMadeUpProp: 123 } })` is written for a modal registered with `NModal`
- **THEN** a type error reports that `totallyMadeUpProp` does not exist on the props of `NModal`

#### Scenario: Wrong type for a known prop

- **WHEN** a boolean prop is supplied a string value
- **THEN** a type error reports the mismatch

#### Scenario: Standard component attributes remain acceptable

- **WHEN** `useModal({ component: NModal, props: { style: 'max-width: 480px' } })` is written
- **THEN** the call type-checks

#### Scenario: Vnode-level attributes are excluded

- **WHEN** `key` or `ref` is supplied through `props`
- **THEN** a type error is reported, because the provider owns both and neither is a component prop

### Requirement: Components whose props cannot be inferred stay permissive

The props type SHALL fall back to a permissive record, rather than to `never`, when it cannot be resolved from
the supplied component — an async component, a plain object component, a string tag, or a value typed as bare
`Component`. Such a component MUST remain usable, and the documented `as any` escape hatch MUST remain
available.

#### Scenario: Component with no inferrable props type

- **WHEN** a modal is registered with a component whose props type cannot be resolved, supplying props
- **THEN** the call type-checks rather than rejecting every possible props object

#### Scenario: Escape hatch remains available

- **WHEN** props are supplied as `props: { ... } as any`
- **THEN** the call type-checks, for a component whose props resolve and for one whose props do not

### Requirement: Props are partial at every call site

The inferred props type SHALL be partial, so that props may be supplied across registration and opening rather
than being complete at either call site. A component with required props SHALL NOT force those props to be
present in `useModal({ props })`.

#### Scenario: Registering with a subset of props

- **WHEN** a modal is registered supplying only some of its component props
- **THEN** the call type-checks

#### Scenario: Supplying the remainder when opening

- **WHEN** the remaining props are supplied through `open({ props })`
- **THEN** the call type-checks

#### Scenario: Registering with no props at all

- **WHEN** a modal is registered with a component that declares required props and no `props` option
- **THEN** the call type-checks

### Requirement: Result types of openAsync and close are related

`openAsync()` SHALL be typed to resolve with the result type accepted by `close()`, widened to include
`undefined` because the modal may close without producing a result.

#### Scenario: Awaited value includes undefined

- **WHEN** the value of `await openAsync()` is inspected
- **THEN** its type includes `undefined`

#### Scenario: open is not a promise

- **WHEN** the return type of `open()` is inspected
- **THEN** it is `void` and not a promise

### Requirement: Per-modal configuration options are typed

`useModal()` SHALL accept either a `preset` drawn from `ModalManagerPreset`, or both `openPropName` and
`openEventName`, and SHALL reject a partial explicit pair.

#### Scenario: Valid preset

- **WHEN** `useModal({ component, preset: 'element-plus' })` is written
- **THEN** the call type-checks

#### Scenario: Unknown preset

- **WHEN** `useModal({ component, preset: 'not-a-real-kit' })` is written
- **THEN** a type error reports the value is not a `ModalManagerPreset`

#### Scenario: Explicit pair

- **WHEN** `useModal({ component, openPropName: 'visible', openEventName: 'update:visible' })` is written
- **THEN** the call type-checks

#### Scenario: Half of an explicit pair

- **WHEN** `useModal({ component, openPropName: 'visible' })` is written with no `openEventName`
- **THEN** a type error reports the missing counterpart
