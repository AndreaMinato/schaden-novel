// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://schaden-novel.netlify.app/',
  cacheDir: './build-cache',
	integrations: [mdx(), sitemap()],
	server: {
		port: 4321,
	},
	vite: {
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						'astro-chunks': ['astro'],
					},
				},
			},
		},
	},
});
