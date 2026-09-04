import { createApp, createSSRApp, defineComponent, h, type App, type Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { VueModalManager, type ModalManagerOptions } from '@/lib'
import { injectModalRegistry, type ModalRegistry } from '@/lib/store'

export const testOptions: ModalManagerOptions = {
  openPropName: 'show',
  openEventName: 'update:show'
}

/**
 * A dialog stand-in: no teleport, no conditional rendering, identical output on
 * the server and the client for the same props.
 */
export const StubModal = defineComponent({
  name: 'StubModal',
  props: {
    show: { type: Boolean, default: false },
    label: { type: String, default: '' }
  },
  setup: (props) => () =>
    h('div', { class: 'stub-modal', 'data-open': String(props.show) }, props.label)
})

/** The registry the plugin provided to this app, as the app's own code sees it. */
export const getRegistry = (app: App): ModalRegistry =>
  app.runWithContext(() => injectModalRegistry())

/** Builds an application with the plugin installed, but does not render it. */
export const createTestApp = (root: Component, options: ModalManagerOptions = testOptions): App => {
  const app = createApp(root)
  app.use(VueModalManager, options)
  return app
}

/** The same, for the render/hydrate pair — `createSSRApp` on both sides. */
export const createTestSSRApp = (
  root: Component,
  options: ModalManagerOptions = testOptions
): App => {
  const app = createSSRApp(root)
  app.use(VueModalManager, options)
  return app
}

/** Mounts into a throwaway container and hands back the registry to assert on. */
export const mountApp = (root: Component, options?: ModalManagerOptions) => {
  const app = createTestApp(root, options)
  const container = document.createElement('div')
  document.body.appendChild(container)
  app.mount(container)

  return {
    app,
    container,
    registry: getRegistry(app),
    html: () => container.innerHTML,
    unmount: () => {
      app.unmount()
      container.remove()
    }
  }
}

/**
 * Renders to a string with no DOM involvement. Under the `node` test
 * environment this is a faithful server render; under `jsdom` it still produces
 * server markup, but `window` exists so the app is not marked server-rendering.
 */
export const renderApp = async (root: Component, options?: ModalManagerOptions) => {
  const app = createTestSSRApp(root, options)
  const registry = getRegistry(app)
  const html = await renderToString(app)

  return { app, html, registry }
}

/**
 * Server-renders a tree, then hydrates a second application of the same shape
 * over that markup — the pair hydration parity has to hold across.
 */
export const renderThenHydrate = async (root: Component, options?: ModalManagerOptions) => {
  const html = await renderToString(createTestSSRApp(root, options))

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const app = createTestSSRApp(root, options)
  app.mount(container)

  return {
    app,
    container,
    html,
    registry: getRegistry(app),
    unmount: () => {
      app.unmount()
      container.remove()
    }
  }
}
