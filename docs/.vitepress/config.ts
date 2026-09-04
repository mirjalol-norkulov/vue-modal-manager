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
      { text: 'Migration', link: '/migration/0-1-0' }
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
        // an added sibling rather than a restructure.
        text: 'Migration',
        items: [
          { text: 'To 0.1.0', link: '/migration/0-1-0' },
        ]
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }]
  }
})
