// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import alpinejs from '@astrojs/alpinejs';
import compress from 'astro-compress';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto'
  },
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    compress({
      HTML: false,
      CSS: true,
      JavaScript: true,
      Image: true
    })
  ]
});