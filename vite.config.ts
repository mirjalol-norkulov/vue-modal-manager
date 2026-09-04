import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { copyFileSync, existsSync } from 'node:fs'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: 'tsconfig.app.json',
      include: ['src/lib', 'env.d.ts'],
      rollupTypes: true
    }),
    {
      // Ship a CJS-flavoured copy of the declarations so `require()` consumers
      // under node16/nodenext resolution get types too. Safe as a byte copy
      // only because `rollupTypes` flattens everything into one import-free file.
      name: 'emit-cts-declarations',
      closeBundle() {
        const src = resolve(__dirname, 'dist/index.d.ts')
        if (!existsSync(src)) {
          // Failing loudly here beats publishing a package whose
          // `exports.require.types` points at a file that was never written.
          throw new Error(`Expected ${src} to exist, but declaration generation produced nothing.`)
        }
        copyFileSync(src, resolve(__dirname, 'dist/index.d.cts'))
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    // The lib build ships only dist/; public/ assets belong to the dev demo.
    copyPublicDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'VueModalManager',
      fileName: 'vue-modal-manager'
    },
    rollupOptions: {
      // `uuid` is intentionally bundled so the UMD build stays self-contained
      // and consumers inherit no runtime dependencies beyond the Vue peer.
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
