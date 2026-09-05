# modal-registry Specification

## Purpose
One modal registry per Vue application, created by `VueModalManager.install()` and reached by
injection rather than imported as a module singleton. Covers what registration, automatic id
assignment and removal guarantee, and what the operations on a modal do once its entry is gone.

## Requirements
### Requirement: Registry is created per Vue application

The plugin SHALL create a new reactive modal registry each time it is installed into a Vue application, and
SHALL make that registry available to descendant components through a dedicated injection key. Modal state
MUST NOT be held in module scope.

#### Scenario: Installing the plugin provides a registry

- **WHEN** `app.use(VueModalManager, options)` is called on an application
- **THEN** a new empty reactive registry is created and provided to that application

#### Scenario: Two applications do not share modal state

- **WHEN** two applications are created and each installs the plugin, and a modal is registered in the first
- **THEN** the registry of the second application contains no entries

#### Scenario: Registry is not reachable as a module export

- **WHEN** the library public entry point is inspected
- **THEN** no mutable module-level modal registry is exported

### Requirement: useModal requires a component setup context

`useModal()` SHALL throw an error when the registry cannot be injected, and that error MUST identify the cause
and include the documentation link.

#### Scenario: Called outside a setup context

- **WHEN** `useModal()` is called from module scope, a router guard, or a store rather than a component
  `setup()`
- **THEN** an error is thrown naming the missing registry and linking the documentation

#### Scenario: Called without the plugin installed

- **WHEN** `useModal()` is called inside a component `setup()` in an application that never installed the
  plugin
- **THEN** an error is thrown naming the missing registry and linking the documentation

### Requirement: ModalProvider requires the registry

`ModalProvider` SHALL throw the same error as `useModal()` when the registry cannot be injected, so that a
missing plugin installation fails identically wherever it is first observed.

#### Scenario: Provider rendered without the plugin installed

- **WHEN** `ModalProvider` is rendered in an application that never installed the plugin
- **THEN** an error is thrown naming the missing registry and linking the documentation

### Requirement: Modal registration and removal

`useModal()` SHALL insert exactly one registry entry keyed by the modal id, with the modal initially closed.
The entry SHALL be removed when the owning component unmounts.

#### Scenario: Registering a modal

- **WHEN** `useModal({ component })` is called inside a component `setup()`
- **THEN** the registry contains one entry for that modal and its open state is `false`

#### Scenario: Entry is removed on unmount

- **WHEN** the component that called `useModal()` is unmounted
- **THEN** the entry for that modal is deleted from the registry

#### Scenario: The supplied options object is not modified

- **WHEN** one options object with no `id` is passed to two separate `useModal()` calls
- **THEN** each call registers its own entry, and the caller object is left without an `id` written onto it

### Requirement: Automatic id assignment is SSR-stable

When `options.id` is omitted, `useModal()` SHALL derive the id from the Vue `useId()` primitive so that the
same component position produces the same id on the server and on the client. When `options.id` is supplied,
it SHALL be used verbatim.

#### Scenario: Id omitted

- **WHEN** `useModal({ component })` is called without an `id`
- **THEN** an id is assigned that is unique within the registry

#### Scenario: Id supplied

- **WHEN** `useModal({ id: 'user-create-modal', component })` is called
- **THEN** the registry entry is keyed by `user-create-modal`

#### Scenario: Two sibling modals without ids

- **WHEN** two `useModal({ component })` calls are made without ids in the same component
- **THEN** each receives a distinct id and the registry contains two entries

### Requirement: Duplicate explicit ids are reported

When `useModal()` is called with an explicit id already present in the registry, the library SHALL emit a
warning identifying the duplicated id. It MUST NOT throw, and MUST NOT change the existing behaviour in which
the later caller replaces the earlier entry.

#### Scenario: Second caller reuses an id

- **WHEN** two components each call `useModal({ id: 'confirm', component })`
- **THEN** a warning naming the id `confirm` is emitted

#### Scenario: Duplicate registration still resolves to one entry

- **WHEN** two components each call `useModal({ id: 'confirm', component })`
- **THEN** the registry holds a single entry for `confirm` and neither call throws

### Requirement: Global close-all is available without a modal handle

The library SHALL expose a `useModalManager()` composable returning a `closeAll` operation that closes every
modal in the injected registry. The existing `closeAllModals` on the `useModal()` return value SHALL be
retained with unchanged behaviour.

#### Scenario: Closing every open modal

- **WHEN** three modals are open and `closeAll()` from `useModalManager()` is called
- **THEN** all three modals report closed

#### Scenario: Existing per-handle alias still works

- **WHEN** `closeAllModals()` from a `useModal()` return value is called while modals are open
- **THEN** all modals report closed

#### Scenario: Manager requires a setup context

- **WHEN** `useModalManager()` is called where the registry cannot be injected
- **THEN** an error is thrown naming the missing registry and linking the documentation

### Requirement: Closing a removed modal is safe

`close()` SHALL verify that its registry entry still exists before reading or writing it, so that calling
`close()` after the entry has been removed has no effect instead of throwing.

#### Scenario: Close called after unmount

- **WHEN** the owning component has unmounted and a retained `close()` reference is invoked
- **THEN** the call returns without throwing and the registry is unchanged

### Requirement: Opening a removed modal is inert

`open()` SHALL verify that its registry entry still exists before doing anything, and MUST NOT invoke the
`onOpen` hook when the entry is gone — for the same reason the server-render path does not, in that nothing
opened, so the consumer must not be told that something did.

#### Scenario: Open called after unmount

- **WHEN** the owning component has unmounted and a retained `open()` reference is invoked
- **THEN** the call returns without throwing, the registry is unchanged, and `onOpen` is not invoked

