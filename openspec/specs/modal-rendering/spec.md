# modal-rendering Specification

## Purpose
How `<ModalProvider>` turns each registry entry into a rendered dialog: resolving the open
prop and event names for that modal, converting the event name to listener form, binding the
modal's own props over the open state, unwrapping top-level refs among them, and forwarding
slot functions to the component without an intervening wrapper.

## Requirements

### Requirement: Provider renders each registered modal with resolved open state

`ModalProvider` SHALL render one instance of each registered modal component, binding the resolved open prop
name to that modal open state and the resolved listener name to a handler that writes the new state back.
Entries in `item.props` SHALL be bound alongside.

#### Scenario: Registered modal is rendered

- **WHEN** a modal is registered and `ModalProvider` renders
- **THEN** its component is rendered once with the resolved open prop bound to `false`

#### Scenario: Modal props are bound

- **WHEN** a modal is registered with `props: { title: 'Hello' }`
- **THEN** the rendered component receives `title` with the value `Hello`

#### Scenario: Provider still renders wrapped application content

- **WHEN** `ModalProvider` is given default slot content
- **THEN** that content is rendered, in the same position relative to the rendered modals as before the render
  function rewrite

### Requirement: Top-level ref prop values are unwrapped when bound

The provider SHALL read each top-level entry of a modal `props` through `unref` before
binding it, so a `ref` supplied as a prop value reaches the modal component as its value.
Reading the ref SHALL also track it, so a later write re-renders that modal. Props are
`markRaw`ed before entering the reactive registry, so nothing else unwraps them.

#### Scenario: A ref supplied as a prop value

- **WHEN** a modal is registered with a `ref` as one of its prop values
- **THEN** the rendered component receives that ref value, not the ref itself

#### Scenario: Writing to the ref after registration

- **WHEN** that ref is written to after the modal was registered
- **THEN** the rendered component receives the new value

### Requirement: Open event name is converted to a listener name

The provider SHALL convert the resolved open event name into its listener form by prefixing `on` and
capitalising the first character, and SHALL leave a name already beginning with `on` unchanged.

#### Scenario: Standard event name

- **WHEN** the resolved open event name is `update:show`
- **THEN** the component receives a listener bound as `onUpdate:show`

#### Scenario: Name already in listener form

- **WHEN** the resolved open event name is `onUpdate:show`
- **THEN** the listener name is used unchanged

### Requirement: Per-modal configuration overrides application defaults

Modal configuration SHALL resolve in strict precedence: explicit per-modal `openPropName` and `openEventName`
first, then a per-modal `preset`, then the application-wide injected values. A modal for which no
configuration resolves SHALL raise an error naming that modal id. A `preset` value that is not present in the
preset table SHALL be treated as a resolution failure and raise the same error, rather than resolving to an
undefined prop name.

#### Scenario: Explicit per-modal names win

- **WHEN** the application is configured with the `naive-ui` preset and a modal declares
  `openPropName: 'visible'` and `openEventName: 'update:visible'`
- **THEN** that modal is bound with `visible` and `onUpdate:visible`

#### Scenario: Per-modal preset wins over the application default

- **WHEN** the application is configured with the `naive-ui` preset and a modal declares
  `preset: 'element-plus'`
- **THEN** that modal is bound with `model-value` and `onUpdate:model-value`

#### Scenario: Application default applies when the modal declares nothing

- **WHEN** the application is configured with the `naive-ui` preset and a modal declares no configuration
- **THEN** that modal is bound with `show` and `onUpdate:show`

#### Scenario: Two UI kits coexist

- **WHEN** one modal declares `preset: 'naive-ui'` and another declares `preset: 'prime-vue'` in the same
  application
- **THEN** the first is bound with `show` and the second with `visible`

#### Scenario: Unresolvable configuration

- **WHEN** a modal declares no configuration and the application provided no defaults
- **THEN** an error is raised naming that modal id and linking the documentation

#### Scenario: Preset name absent from the preset table

- **WHEN** a modal declares a `preset` value that the preset table does not contain, as an untyped consumer or
  a cast can produce
- **THEN** the same named error is raised, rather than the modal being bound with an undefined prop name

### Requirement: Plugin configuration is optional

Installing the plugin without prop and event options SHALL succeed, so that an application whose modals all
carry their own configuration is not required to nominate an application-wide default.

#### Scenario: Install without options

- **WHEN** the plugin is installed with no preset and no explicit prop and event names
- **THEN** installation succeeds and modals that carry their own configuration render correctly

### Requirement: Slots are forwarded to the modal component

Slot functions supplied through `useModal({ slots })` SHALL be passed to the rendered component as its slots,
forwarded without an intervening wrapper element.

#### Scenario: Default slot renders

- **WHEN** a modal is registered with a `default` slot function returning content
- **THEN** that content appears inside the rendered modal component

#### Scenario: Named slots render

- **WHEN** a modal is registered with `header` and `footer` slot functions
- **THEN** each renders into the corresponding named slot of the modal component

#### Scenario: Slot functions are forwarded unwrapped

- **WHEN** a modal component inspects its own slot children to decide layout
- **THEN** it observes the content produced by the supplied slot function, with no wrapper element added by
  the provider

#### Scenario: No slots supplied

- **WHEN** a modal is registered without slots
- **THEN** the component renders with no slots and its own defaults apply
