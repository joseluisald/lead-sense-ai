// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import alpinejs from '@astrojs/alpinejs';
import compress from 'astro-compress';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto'
  },
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