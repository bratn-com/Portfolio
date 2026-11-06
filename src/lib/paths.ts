import type { ImageMetadata } from 'astro';

/** Glob map from Vite: keys are relative to this file in dev/build. */
export type ImageGlobMap = Record<string, { default: ImageMetadata }>;

export function resolveProjectImage(
	globMap: ImageGlobMap,
	slug: string,
	relativePath: string,
): ImageMetadata | undefined {
	const normalized = relativePath.replace(/^\.?\//, '');
	const key = `../../content/projects/${slug}/${normalized}`;
	const mod = globMap[key];
	return mod?.default;
}
