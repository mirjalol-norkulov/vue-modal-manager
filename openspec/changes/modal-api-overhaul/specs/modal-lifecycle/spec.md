## ADDED Requirements

### Requirement: Opening merges supplied props over current props

`open()` SHALL mark the modal open. When called with `props`, those entries SHALL be merged over the current
props rather than replacing them, and SHALL NOT mutate the registration snapshot.

#### Scenario: Opening without props

- **WHEN** `open()` is called on a registered modal
- **THEN** the modal reports open and its props are unchanged

#### Scenario: Opening with props

- **WHEN** a modal registered with `props: { preset: 'card' }` is opened with `props: { title: 'Hello' }`
- **THEN** the rendered component receives both `preset` and `title`

#### Scenario: Merging does not corrupt the snapshot

- **WHEN** a modal is opened with props and then closed with `resetPropsOnClose` enabled
- **THEN** the props returned to their registration values

### Requirement: Prop reset has a single definition

Prop reset SHALL be defined once and produce identical results whether the modal was closed through the
returned `close()` or by the modal own open event. Reset SHALL restore the shallow snapshot taken at
registration, and SHALL be skipped when `resetPropsOnClose` is `false`.

#### Scenario: Closing from the handle resets props

- **WHEN** a modal opened with extra props is closed via `close()` and `resetPropsOnClose` is enabled
- **THEN** its props equal the registration snapshot

#### Scenario: Modal closing itself resets props identically

- **WHEN** the same modal instead emits its own open event with `false`
- **THEN** its props equal the registration snapshot

#### Scenario: Reset disabled

- **WHEN** a modal registered with `resetPropsOnClose: false` is opened with extra props and closed
- **THEN** the merged props are retained

#### Scenario: Snapshot is independent of live props

- **WHEN** a top-level entry of a modal live props is reassigned in place and the modal is then closed with
  reset enabled
- **THEN** the registration value is restored

#### Scenario: Snapshot survives repeated open and close cycles

- **WHEN** a modal is opened with props, closed, then has a top-level entry of its live props reassigned in
  place, and is closed again with reset enabled
- **THEN** the registration value is still restored, because restoring the snapshot copies it rather than
  handing back the snapshot object itself

### Requirement: Modals can be closed with a result

`close()` SHALL accept an optional result value. Calling `close()` with no argument SHALL behave exactly as
before.

#### Scenario: Closing with a result

- **WHEN** `close(true)` is called on an open modal
- **THEN** the modal reports closed

#### Scenario: Closing with no argument

- **WHEN** `close()` is called on an open modal
- **THEN** the modal reports closed

### Requirement: openAsync resolves when the modal closes

`openAsync()` SHALL open the modal and return a promise that settles when that modal closes, resolving with
the value passed to `close(result)` or `undefined` when the modal was closed any other way. `open()` SHALL
continue to return `void`.

#### Scenario: Resolving with a result

- **WHEN** `openAsync()` is awaited and the modal is later closed with `close('confirmed')`
- **THEN** the promise resolves with `confirmed`

#### Scenario: Closing without a result

- **WHEN** `openAsync()` is awaited and the modal is later closed with `close()`
- **THEN** the promise resolves with `undefined`

#### Scenario: Modal closes itself

- **WHEN** `openAsync()` is awaited and the modal emits its own open event with `false`
- **THEN** the promise resolves with `undefined`

#### Scenario: open remains synchronous

- **WHEN** `open()` is called
- **THEN** it returns `undefined` rather than a promise

### Requirement: The open hook fires for both open operations

An `onOpen` hook supplied to `useModal()` SHALL be invoked when the modal is opened, whether through `open()`
or `openAsync()`, and SHALL NOT be invoked when the modal was not opened.

#### Scenario: Opening through openAsync

- **WHEN** a modal registered with an `onOpen` hook is opened with `openAsync()`
- **THEN** the hook is invoked exactly once

#### Scenario: Registry entry no longer exists

- **WHEN** the owning component has unmounted and a retained `open()` reference is invoked
- **THEN** the hook is not invoked, because no modal was opened

### Requirement: openAsync always settles and never rejects

A promise returned by `openAsync()` MUST NOT reject under any circumstance, and MUST NOT remain pending once
the modal can no longer be closed. Dismissal is an outcome, not an error.

#### Scenario: Global close-all settles pending promises

- **WHEN** two modals are awaiting `openAsync()` and `closeAll()` is called
- **THEN** both promises resolve with `undefined`

#### Scenario: Owning component unmounts while open

- **WHEN** a modal is awaiting `openAsync()` and its owning component unmounts
- **THEN** the promise resolves with `undefined`

#### Scenario: Reopening while already open

- **WHEN** `openAsync()` is called on a modal that is already open with a pending promise
- **THEN** the pending promise resolves with `undefined` and a new promise is returned

#### Scenario: Dismissal does not reject

- **WHEN** a modal awaiting `openAsync()` is dismissed by its own close control
- **THEN** the promise resolves and no rejection is produced

#### Scenario: Plain open called while a promise is pending

- **WHEN** `open()` is called on a modal that is already open with a pending `openAsync()` promise
- **THEN** the promise remains pending and settles when the modal is eventually closed

### Requirement: openAsync is inert during server rendering

When invoked during a server render, `openAsync()` SHALL resolve immediately with `undefined` and SHALL NOT
open the modal, so that a server render can never block on a user interaction that cannot occur.

#### Scenario: Awaited during a server render

- **WHEN** a component awaits `openAsync()` during `renderToString`
- **THEN** the promise resolves with `undefined` and the render completes

#### Scenario: Server markup shows the modal closed

- **WHEN** `openAsync()` is called during a server render
- **THEN** the rendered markup represents the modal as closed
