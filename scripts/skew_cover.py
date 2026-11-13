#!/usr/bin/env python3
"""
DEPRECATED — nie używamy tego generatora. Gotowe mockupy wgrywaj jako PNG/JPG
i ustaw `"cover": "baked"` w content/portfolio.json.

---
Płaski zrzut -> ciasno wykadrowany PNG z perspektywą karty portfolio.

Ten sam zestaw co CSS kart bez klasy skew:
  perspective(520px) rotateX(8deg) rotateZ(-6deg)
  transform-origin: center bottom

Wyjście ma przezroczyste tło i jest przycięte do pikseli mockupu
(bez pustego płótna — inaczej karta pokazuje miniaturę).
Bez drop shadow. Kolor karty zostaje w CSS.

  python3 scripts/skew_cover.py content/images/dynamite.jpg \\
    -o content/images/dynamite-skew.png
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from numpy.typing import NDArray
except ImportError:
    NDArray = np.ndarray  # type: ignore[misc, assignment]


def rot_x(a: float) -> NDArray[np.float64]:
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], dtype=np.float64)


def rot_z(a: float) -> NDArray[np.float64]:
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], dtype=np.float64)


def homography(src: NDArray[np.float64], dst: NDArray[np.float64]) -> NDArray[np.float64]:
    rows = []
    for i in range(4):
        x, y = float(src[i, 0]), float(src[i, 1])
        xp, yp = float(dst[i, 0]), float(dst[i, 1])
        rows.append([-x, -y, -1, 0, 0, 0, xp * x, xp * y, xp])
        rows.append([0, 0, 0, -x, -y, -1, yp * x, yp * y, yp])
    _, _, vt = np.linalg.svd(np.array(rows, dtype=np.float64))
    h = vt[-1].reshape(3, 3)
    return h / h[2, 2]


def pil_inverse_coeffs(h_fwd: NDArray[np.float64]) -> tuple[float, ...]:
    h_inv = np.linalg.inv(h_fwd)
    h_inv = h_inv / h_inv[2, 2]
    return tuple(float(h_inv[i, j]) for i in range(2) for j in range(3)) + (
        float(h_inv[2, 0]),
        float(h_inv[2, 1]),
    )


def project_corners(
    width: int,
    height: int,
    perspective: float,
    rot_x_deg: float,
    rot_z_deg: float,
) -> NDArray[np.float64]:
    """CSS: origin center-bottom, Y w dół. rotateZ potem rotateX potem perspective."""
    ox, oy = (width - 1) / 2.0, height - 1.0
    rx = rot_x(math.radians(rot_x_deg))
    rz = rot_z(math.radians(rot_z_deg))
    # Punkt najpierw rotateZ (wokół origin), potem rotateX.
    # W układzie Y-w-dół dodatni rotateX odchyla górę (ujemne ly) w +Z (od kamery).
    r = rx @ rz
    corners = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype=np.float64,
    )
    out = np.zeros((4, 2), dtype=np.float64)
    for i, (x, y) in enumerate(corners):
        lx, ly = x - ox, y - oy
        p = r @ np.array([lx, ly, 0.0])
        depth = perspective - p[2]
        if depth < 1.0:
            raise RuntimeError("Perspektywa za mocna — zmniejsz kąty albo zwiększ --perspective.")
        s = perspective / depth
        out[i, 0] = ox + p[0] * s
        out[i, 1] = oy + p[1] * s
    return out


def crop_alpha(im: Image.Image, pad: int) -> Image.Image:
    alpha = np.asarray(im.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        raise RuntimeError("Po projekcji nie zostało nic nieprzezroczystego.")
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(im.width, int(xs.max()) + pad + 1)
    bottom = min(im.height, int(ys.max()) + pad + 1)
    return im.crop((left, top, right, bottom))


def skew(
    src: Image.Image,
    perspective: float,
    rot_x_deg: float,
    rot_z_deg: float,
    pad: int,
) -> Image.Image:
    im = src.convert("RGBA")
    w, h = im.size
    dst = project_corners(w, h, perspective, rot_x_deg, rot_z_deg)
    src_pts = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype=np.float64)

    minx, miny = dst.min(axis=0)
    maxx, maxy = dst.max(axis=0)
    margin = max(w, h) * 0.08 + pad
    shift = np.array([margin - minx, margin - miny])
    dst_shifted = dst + shift
    out_w = int(math.ceil(maxx - minx + 2 * margin))
    out_h = int(math.ceil(maxy - miny + 2 * margin))

    h_fwd = homography(src_pts, dst_shifted)
    warped = im.transform(
        (out_w, out_h),
        Image.Transform.PERSPECTIVE,
        pil_inverse_coeffs(h_fwd),
        Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )
    return crop_alpha(warped, pad)


def main() -> None:
    p = argparse.ArgumentParser(description="Płaski zrzut -> ciasny PNG z perspektywą karty.")
    p.add_argument("input", type=Path)
    p.add_argument("-o", "--output", type=Path, required=True)
    p.add_argument("--perspective", type=float, default=520.0, help="Jak CSS perspective() w px")
    p.add_argument("--rot-x", type=float, default=8.0)
    p.add_argument("--rot-z", type=float, default=-6.0)
    p.add_argument("--pad", type=int, default=2, help="Piksele marginesu po kadrowaniu")
    p.add_argument(
        "--max-edge",
        type=int,
        default=1600,
        help="Dłuższy bok wejścia przed warp (0 = bez skalowania w górę)",
    )
    args = p.parse_args()

    if not args.input.is_file():
        print(f"Brak pliku: {args.input}", file=sys.stderr)
        sys.exit(1)

    im = Image.open(args.input).convert("RGBA")
    if args.max_edge > 0:
        scale = args.max_edge / max(im.size)
        if scale > 1.01:
            im = im.resize(
                (max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                Image.Resampling.LANCZOS,
            )

    # CSS perspective() jest w pikselach elementu. Ta sama liczba na dużym
    # bitmapie daje karykaturalny skos — skalujemy do szerokości wejścia.
    perspective = args.perspective * (im.width / 480.0)
    out = skew(im, perspective, args.rot_x, args.rot_z, args.pad)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    out.save(args.output, "PNG")
    print(f"Zapisano {args.output} ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
