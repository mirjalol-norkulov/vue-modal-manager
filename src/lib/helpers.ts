export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// The library is type-checked with `types: []` (the Vue DOM config), so the Node
// global is declared narrowly here rather than pulling @types/node into the
// shipped type surface.
declare const process: { env: Record<string, string | undefined> } | undefined

/**
 * The one development-only warning path, so the guard below is written once.
 *
 * `process.env.NODE_ENV` survives this library's build verbatim, so a consumer's
 * bundler is what strips these branches. The `typeof` guard is what keeps a
 * bundler-less UMD consumer from hitting `process is not defined`.
 * `import.meta.env.DEV` does *not* work here — it bakes to a constant at
 * *library* build time and the branch is eliminated before a consumer sees it.
 */
export const warnInDevelopment = (message: string) => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[vue-modal-manager] ${message}`)
  }
}

/** Anything with a `then` method, which a promise adopts rather than wraps. */
export const isThenable = (value: unknown): boolean =>
  typeof (value as { then?: unknown } | null | undefined)?.then === 'function'
