---
name: add-preset
description: Add support for a new Vue UI component library (a "preset") to vue-modal-manager. Use this whenever the user wants to support, add, or integrate another UI kit or dialog component - "add Ant Design Vue support", "integrate Naive UI", "add a preset", "make it work with <library>", or "why doesn't <library> close properly". Use it even when the user names only one file or seems to be asking a small question, because a preset spans four separate places and a half-finished preset ships broken.
---

# Add a UI-kit preset

A preset is just a pair of names: the prop that opens the dialog and the event it emits
when it closes itself. The library never renders a modal, so these two strings are the
entire integration. The work is small but spread across four places, and missing any one
of them fails in a different way:

| Skip this | Symptom |
|---|---|
| `ModalManagerPreset` union | `preset: 'x'` is a type error for consumers |
| `presetConfigurations` | `ModalProvider` throws its "missing prop name" setup error |
| docs page | Sidebar links to a 404 |
| docs sidebar | Page exists but is unreachable |

## Step 1: Find the real prop and event names

Do not guess these from other presets. Read the library's own dialog/modal docs and find
the prop its `v-model` binds to. The pattern is nearly always:

- `openPropName` — the v-model prop, in **kebab-case** as written in a template
- `openEventName` — `update:` + that same prop name

Existing evidence of the variation, which is why guessing fails: Naive UI uses `show`,
PrimeVue uses `visible`, and Element Plus / Vuetify / Quasar use `model-value`.

If the library's dialog has no v-model prop at all, stop and tell the user — it can't be
driven by a preset and needs explicit `openPropName`/`openEventName` from the consumer.

## Step 2: `src/lib/config.ts`

Add the key to both the union and the object. Choose the key as kebab-case of the library
name (`PrimeVue` → `prime-vue`, `Ant Design Vue` → `ant-design-vue`). This key is the
public API — consumers type it as `preset: '<key>'` — so it must read naturally.

Quote the key only if it contains a hyphen; single-word keys stay bare (`vuetify`,
`quasar`). Prettier here uses no semicolons, single quotes, width 100 and **no trailing
commas**.

## Step 3: `docs/third-party-integrations/<key>.md`

Filename matches the preset key exactly. Follow the existing pages — they are
deliberately near-identical, so copy one and change three things (H1, bold library name,
preset value):

````markdown
# PrimeVue

To use modal manager with **PrimeVue** component library just set `preset` option to `prime-vue`:

```ts
import { createApp } from 'vue'
import { VueModalManager } from "vue-modal-manager";
import App from './App.vue'

const app = createApp(App)

app.use(VueModalManager, {
  preset: 'prime-vue'
})

app.mount('#app')
```
````

Use the library's own spelling in the H1 and bold text (`PrimeVue`, not `Prime Vue`).

## Step 4: `docs/.vitepress/config.ts`

Add an entry to the `items` array nested under `text: 'Third party integrations'`:

```ts
{ text: 'Prime Vue', link: '/third-party-integrations/prime-vue' }
```

Keep the file's existing trailing-comma style and **do not run Prettier on `docs/`** —
`pnpm format` is scoped to `src/` only, so formatting this file would strip its trailing
commas and bury your one-line change in unrelated diff noise.

## Step 5: Verify

```sh
pnpm type-check
```

That catches the union/object mismatch, which is the most common half-finished state. To
check the names actually work, wire the new library's dialog into the playground
(`src/App.vue`) and confirm it both opens and — importantly — that closing it from its own
close button propagates back, since that path exercises `openEventName` via
`ModalProvider`'s `handleUpdate`.

Then report which of the four places you touched, so the user can see nothing was missed.
