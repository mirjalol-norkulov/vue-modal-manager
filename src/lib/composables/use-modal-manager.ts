import { closeAllModals, injectModalRegistry } from '@/lib/store'

/**
 * Global modal operations that need no per-modal handle. It has to be a
 * composable rather than a bare function, because reaching the app-scoped
 * registry requires `inject()`.
 */
export const useModalManager = () => {
  const registry = injectModalRegistry()

  return {
    closeAll: () => closeAllModals(registry)
  }
}
