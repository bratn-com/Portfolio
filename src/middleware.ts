import { defineMiddleware } from 'astro:middleware';

/**
 * Sets X-Robots-Tag for environments that serve this middleware (e.g. dev).
 * Static hosting should also set headers via `public/_headers` where supported.
 */
export const onRequest = defineMiddleware((_context, next) => {
	const response = next();
	return Promise.resolve(response).then((res) => {
		res.headers.set('X-Robots-Tag', 'noindex, nofollow');
		return res;
	});
});
