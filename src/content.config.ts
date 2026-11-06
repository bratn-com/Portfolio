import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Astro 7+ registers collections from `src/content.config.ts` (not `src/content/config.ts`).
 * Markdown and assets live under `src/content/projects/<slug>/`.
 */
export const collections = {
	projects: defineCollection({
		loader: glob({
			pattern: '**/index.md',
			base: './src/content/projects',
			generateId({ entry }) {
				const slug = entry.replace(/\/index\.md$/, '').replace(/\\/g, '/');
				return slug;
			},
		}),
		schema: z
			.object({
				title: z.string(),
				platform: z.enum(['desktop', 'mobile']),
				summary: z.string(),
				date: z.coerce.date().optional(),
				hero: z.string(),
				gallery: z.array(z.string()).default([]),
				videoUrl: z.string().url().optional(),
				videoFile: z
					.string()
					.regex(/^\//, { message: 'videoFile must be a site path starting with / (under public/)' })
					.optional(),
			})
			.refine((data) => !(data.videoUrl !== undefined && data.videoFile !== undefined), {
				message:
					'Use either videoUrl (YouTube/Vimeo embed) or videoFile (MP4 under public/), not both.',
				path: ['videoUrl'],
			}),
	}),
};
