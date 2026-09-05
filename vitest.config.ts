import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/*'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      typecheck: {
        // `vue-tsc` rather than the default `tsc`: the single-file-component
        // scenario imports a `.vue` fixture, which plain `tsc` cannot parse.
        checker: 'vue-tsc',
        // `tsconfig.app.json` excludes `__tests__`, so the type tests need the
        // vitest config, which is also what `pnpm type-check` runs against.
        tsconfig: './tsconfig.vitest.json',
        include: ['src/**/*.test-d.ts']
      }
    }
  })
)
