---
outline: deep
---

# Server-side rendering

Vue modal manager is safe to render on a server. The modal registry is created by
`app.use(VueModalManager, ...)` and lives on the application instance, so every request
gets its own — nothing is held in module scope, and one request can never observe
another request's modals or props.

Two things follow from that, and both are automatic:

- Auto-generated modal ids come from Vue's [`useId()`](https://vuejs.org/api/composition-api-helpers.html#useid),
  so the id assigned on the server matches the one assigned on the client and hydration
  lines up. This is why the library requires Vue `^3.5.0`.
- `open()` does nothing during a server render. A server-rendered modal can never be
  interacted with or closed, so opening one would only guarantee a hydration mismatch.
  Modals always reach the client closed, and `onOpen` is not called on that path.

## Nuxt

Nuxt owns the `createApp()` call, so register the plugin against `nuxtApp.vueApp` from a
Nuxt plugin rather than in a `main.js`.

```ts[plugins/vue-modal-manager.ts]
import { VueModalManager } from 'vue-modal-manager'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueModalManager, {
    preset: 'naive-ui'
  })
})
```

Then wrap your application with `<ModalProvider>` in `app.vue`, so it sits above every
page and layout:

```vue[app.vue]
<script setup>
import { ModalProvider } from 'vue-modal-manager'
</script>

<template>
  <ModalProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ModalProvider>
</template>
```

The plugin needs no `.client` suffix and no `<ClientOnly>` wrapper — it is meant to run on
both sides.

## Other SSR frameworks

Any setup that calls `createApp()` (or `createSSRApp()`) per request works the same way:
install the plugin on that application, and place `<ModalProvider>` inside its root
component. The registry is created by the install, so per-request isolation needs no
further steps.

## Your modal components are still yours

The library guarantees hydration parity for what `<ModalProvider>` itself renders — the
component you registered, the open-state prop, and the props you passed. It cannot make
guarantees about what a third-party dialog does with them. Several UI kits teleport their
content to `<body>`, and several render nothing at all while closed. If a specific dialog
warns about hydration, check that library's own SSR guidance.

## Known limitation

`<ModalProvider>` renders every modal in the registry, and the registry is shared by the
whole application. Two `<ModalProvider>` instances in one app therefore each render every
registered modal. Use a single provider near the root.
