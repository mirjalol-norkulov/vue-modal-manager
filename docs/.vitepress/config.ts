import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Vue 3 modal manager',
  description: 'Modal manager for Vue 3',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/getting-started' },
      { text: 'API', link: '/api/components' },
      // Points at the index rather than a version, so it does not go stale the
      // release after next. `activeMatch` is what keeps the item highlighted
      // while the reader is on one of the guides underneath it.
      { text: 'Migration', link: '/migration/', activeMatch: '/migration/' }
    ],

    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Server-side rendering', link: '/server-side-rendering' },
          {
            text: 'Third party integrations',
            items: [
              { text: 'Naive UI', link: '/third-party-integrations/naive-ui' },
              { text: 'Element Plus', link: '/third-party-integrations/element-plus' },
              { text: 'Vuetify', link: '/third-party-integrations/vuetify' },
              { text: 'Quasar', link: '/third-party-integrations/quasar' },
              { text: 'Prime Vue', link: '/third-party-integrations/prime-vue' },
            ]
          }
        ]
      },
      {
        text: 'API reference',
        items: [
          { text: 'Components', link: '/api/components' },
          { text: 'Composables', link: '/api/composables' },
        ]
      },
      {
        // One entry per released version, newest first, so a later version is
        // an added sibling rather than a restructure. Labelled `<from> → <to>`
        // because the question a reader arrives with is whether the guide
        // covers the version they are on: `0.0.x` answers it, where a specific
        // `0.0.11` would wrongly narrow a guide that covers every 0.0.x.
        text: 'Migration',
        link: '/migration/',
        items: [
          { text: '0.0.x → 0.1.0', link: '/migration/0-1-0' },
        ]
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }]
  }
})
