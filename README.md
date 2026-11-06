# Portfolio

Static portfolio site built with **[Astro](https://astro.build/)** (TypeScript, **`output: 'static'`**). Project write-ups live in Markdown under `src/content/projects/` with **no search-engine indexing** by default (`noindex` meta, `X-Robots-Tag`, and [`public/_headers`](public/_headers) for Cloudflare-style static hosts).

## Prerequisites

- **Node.js** current LTS (see [`.nvmrc`](.nvmrc); CI uses Node **22**)
- npm

## Install

```bash
npm ci
```

## Development

```bash
npm run dev
```

Open the URL printed in the terminal (defaults to `http://127.0.0.1:4321`).

## Production build

```bash
npm run build
```

Static files are written to `dist/`. Preview locally:

```bash
npm run preview
```

## Content model

Collections are defined in [`src/content.config.ts`](src/content.config.ts) (Astro 7+). Each project is a **folder** under [`src/content/projects/<slug>/`](src/content/projects/) with:

| Path | Purpose |
|------|--------|
| `index.md` | Frontmatter + Markdown body (case study) |
| `images/` | Optional images referenced from frontmatter |

### Frontmatter

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | Project name |
| `platform` | `desktop` \| `mobile` | Used for filtering on the home page |
| `summary` | string | Short blurb for cards and SEO description |
| `date` | date (optional) | Display + sort (newest first when present) |
| `hero` | string | Path **relative to the project folder** (e.g. `images/cover.png`) |
| `gallery` | string[] | More image paths, same as `hero` |
| `videoUrl` | string (optional) | **YouTube or Vimeo** page or embed URL (iframe embed) |
| `videoFile` | string (optional) | Path **under `public/`**, site-root style: must start with `/`, e.g. `/video/demo.mp4` — served as a static file, **not** from the project folder |

Use **either** `videoUrl` **or** `videoFile`, not both. Prefer `videoUrl` when the clip is already on YouTube/Vimeo; use `videoFile` for a file you commit (or upload) under `public/`.

### Add a new project

1. Copy an existing folder under `src/content/projects/`, e.g. [`src/content/projects/sample-desktop-app/`](src/content/projects/sample-desktop-app/).
2. Rename the folder — that folder name becomes the URL slug (`/projects/<folder-name>/`).
3. Edit `index.md` frontmatter and body; replace images under `images/` or add new paths.
4. For self-hosted video, add the file under `public/` (e.g. `public/video/my-demo.mp4`) and set `videoFile: /video/my-demo.mp4`.

Sample entries included: `sample-desktop-app`, `sample-mobile-experience`.

## Large media (Git LFS)

Images and video can get large. For smoother Git workflows, consider **[Git LFS](https://git-lfs.com/)** for big binaries—optional and independent of Astro.

## Deploy notes

This repo does **not** configure Cloudflare Pages. Many static hosts only need `dist/` after `npm run build`.

If you deploy to **Cloudflare Pages**, you can use the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) to upload or wire CI—optional and out of scope here.

## Project layout (key files)

- [`astro.config.mjs`](astro.config.mjs) — static output, `noindex`-friendly dev headers
- [`src/content.config.ts`](src/content.config.ts) — content collections schema
- [`src/pages/index.astro`](src/pages/index.astro) — home + platform filter
- [`src/pages/projects/[slug].astro`](src/pages/projects/[slug].astro) — project detail
- [`src/layouts/Base.astro`](src/layouts/Base.astro) — layout, robots meta
- [`public/_headers`](public/_headers) — `X-Robots-Tag` for hosts that support it
