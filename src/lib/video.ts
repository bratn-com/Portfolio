export type EmbedKind = 'youtube' | 'vimeo';

export type ParsedVideoUrl =
	| { kind: EmbedKind; embedUrl: string }
	| { kind: 'unknown'; embedUrl: null };

/**
 * Parse common YouTube/Vimeo URLs into an iframe-ready embed URL.
 */
export function parseVideoEmbedUrl(input: string): ParsedVideoUrl {
	try {
		const url = new URL(input);
		const host = url.hostname.replace(/^www\./, '');

		if (host === 'youtu.be') {
			const id = url.pathname.replace(/^\//, '').split('/')[0];
			if (id) {
				return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
			}
		}

		if (host === 'youtube.com' || host === 'm.youtube.com') {
			if (url.pathname.startsWith('/embed/')) {
				return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com${url.pathname}${url.search}` };
			}
			const v = url.searchParams.get('v');
			if (v) {
				return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${v}` };
			}
		}

		if (host === 'vimeo.com' || host === 'player.vimeo.com') {
			const parts = url.pathname.split('/').filter(Boolean);
			const last = parts[parts.length - 1];
			if (last && /^\d+$/.test(last)) {
				return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${last}` };
			}
		}

		return { kind: 'unknown', embedUrl: null };
	} catch {
		return { kind: 'unknown', embedUrl: null };
	}
}
