import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import prefetch from "@astrojs/prefetch";
import vercel from "@astrojs/vercel/serverless";
import image from "@astrojs/image";
import svelte from "@astrojs/svelte";

import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
	integrations: [tailwind(), sitemap(), prefetch(), image({
		serviceEntryPoint: '@astrojs/image/sharp'
	}), svelte(), robotsTxt()],
	site: "https://jussinevavuori.com",
	output: "hybrid",
	adapter: vercel(),
	experimental: {
		hybridOutput: true
	}
});