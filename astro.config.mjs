// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.invalid',
	output: 'static',
	server: {
		headers: {
			'X-Robots-Tag': 'noindex, nofollow',
		},
	},
	build: {
		assets: '_assets',
	},
});
