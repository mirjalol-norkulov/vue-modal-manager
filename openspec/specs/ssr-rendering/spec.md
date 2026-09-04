# ssr-rendering Specification

## Purpose
TBD - created by archiving change ssr-safe-store. Update Purpose after archive.
## Requirements
### Requirement: Server renders do not share modal state

Modal state MUST be isolated per application instance so that concurrent or sequential server renders cannot
observe each other entries. No modal registered during one server render may appear in the registry of
another.

#### Scenario: Two sequential server renders

- **WHEN** two applications are created in the same process and each is rendered with `renderToString`, and
  each registers one modal
- **THEN** each render observes exactly one modal, and neither observes the other

#### Scenario: Props from one render are not visible to another

- **WHEN** the first server render registers a modal with request-specific `props` and a second render then
  registers its own modal
- **THEN** the second render observes none of the props from the first

### Requirement: Server-side registration does not accumulate

Because unmount hooks never run during server rendering, the registry MUST NOT be process-wide. Repeated
server renders SHALL NOT cause registry growth that outlives the application instance being rendered.

#### Scenario: Many sequential server renders

- **WHEN** fifty applications are created and rendered sequentially, each registering one modal
- **THEN** each application registry holds exactly one entry

#### Scenario: Rendered output does not include foreign modals

- **WHEN** an application is server-rendered after other applications have already been rendered in the same
  process
- **THEN** its markup contains only the modals registered by that application

### Requirement: Opening a modal is inert during server rendering

`open()` SHALL have no effect when invoked during a server render, so that server markup always represents
every modal as closed and matches the client initial render.

#### Scenario: open called during a server render

- **WHEN** a component calls `open()` in its `setup()` and the application is rendered with `renderToString`
- **THEN** the modal is reported closed and the markup is the closed-state markup

#### Scenario: Client can still open after hydration

- **WHEN** the same component is mounted on the client and `open()` is called after hydration
- **THEN** the modal reports open

#### Scenario: The open hook does not fire on the inert path

- **WHEN** a modal registered with an `onOpen` hook has `open()` called during a server render
- **THEN** the hook is not invoked, because the modal did not open

### Requirement: Automatic ids agree across the server and client boundary

An id generated for a modal during a server render SHALL equal the id generated for the same modal in the same
component position during the client render.

#### Scenario: Same component tree rendered on server and client

- **WHEN** a component tree registering a modal without an explicit id is rendered on the server and then
  rendered on the client
- **THEN** the auto-generated id is identical in both

### Requirement: Provider output is hydration-stable

`ModalProvider` SHALL produce markup on the server that matches the client first render for the same registry
contents, so that hydration reports no mismatch. This constrains the provider own output — the wrapped
application content, and the props and open state it binds. It does not extend to what a third-party dialog
renders from those props: several UI kits teleport and several render nothing while closed, and the library
cannot guarantee their server behaviour.

#### Scenario: Hydrating a provider with registered but closed modals

- **WHEN** an application with registered modals whose component is a plain hydration-stable stub is
  server-rendered and then hydrated on the client
- **THEN** no hydration mismatch warning is emitted

### Requirement: Library does not access browser-only globals unguarded

The published library MUST NOT dereference `window`, `document`, `localStorage`, or `navigator` during module
evaluation, registration, or rendering, so that it can be imported and rendered in a bare Node environment. A
`typeof` existence check is permitted, and is how the server is detected; reading a property off one of these
objects is not.

#### Scenario: Imported in Node without a DOM

- **WHEN** the library is imported and an application using it is rendered with `renderToString` in a Node
  environment with no DOM globals
- **THEN** the render completes without a `ReferenceError`

#### Scenario: Server detection does not require a DOM

- **WHEN** the plugin is installed in a Node environment with no DOM globals
- **THEN** installation completes and the application is marked as server-rendering

