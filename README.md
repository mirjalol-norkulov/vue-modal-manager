# Vue modal manager

Modal manager for Vue 3 applications

## Installation

### With npm

```sh
npm install vue-modal-manager
```

### With yarn

```sh
yarn add vue-modal-manager
```

### With pnpm

```sh
pnpm add vue-modal-manager
```

## Upgrading to `0.1.0`

`0.1.0` is the first release with breaking changes, so read the
[migration guide](https://vue-modal-manager.netlify.app/migration/0-1-0) before upgrading.
It opens with a table telling you in a minute which changes touch your code.

The headline change: `props` passed to `useModal()` is now inferred from the component and
genuinely type-checked. It was never checked before, so code that compiles today may
surface real errors.

npm's caret is an exact pin below `1.0.0`, so an existing `^0.0.11` range never resolves to
`0.1.0` — you only arrive there deliberately, and `0.0.11` stays published.

Full release notes are in [CHANGELOG.md](./CHANGELOG.md).

## Documentation

Visit documentation for more details on how to configure and use:

https://vue-modal-manager.netlify.app