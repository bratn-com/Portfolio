---
title: Sample mobile flow
platform: mobile
summary: Placeholder mobile project demonstrating filtering and optional self-hosted video from public/.
date: 2023-11-02
hero: images/hero.svg
gallery:
  - images/frame-1.svg
---

## Overview

Use **`videoUrl`** when the video is hosted on YouTube or Vimeo (embedded iframe). Use **`videoFile`** for an MP4 (or similar) you add under `public/` — the value must start with `/`, e.g. `/video/my-demo.mp4`. Add **`videoFile`** to frontmatter only when that file exists.

## Notes

Mobile-first layout applies site-wide. The home page can filter to **Mobile** or **Desktop** using the controls at the top.
