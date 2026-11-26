#!/usr/bin/env bash
# Regenerates assets/cv/cv-JN.pdf from assets/cv/cv-JN.source.html (requires Chrome/Chromium).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="file://${ROOT}/assets/cv/cv-JN.source.html"
OUT="${ROOT}/assets/cv/cv-JN.pdf"
CHROME="${CHROME:-google-chrome}"
exec "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$OUT" "$HTML"