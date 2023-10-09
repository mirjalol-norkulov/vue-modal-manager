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
      { text: 'API', link: '/api/components' }
    ],

    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          {
            text: 'Third party integrations',
            items: [
              { text: 'Naive UI', link: '/third-party-integrations/naive-ui' },
              { text: 'Element Plus', link: '/third-party-integrations/element-plus' },
              { text: 'Vuetify', link: '/third-party-integrations/vuetify' },
              { text: 'Quasar', link: '/third-party-integrations/quasar' },
              { text: 'Prime Vue', link: '/third-party-integrations/prime-vue' },
              { text: 'Bootstrap Vue', link: '/third-party-integrations/bootstrap-vue' }
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
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }]
  }
})
