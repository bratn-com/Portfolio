#!/usr/bin/env python3
"""
Flat screenshot -> portfolio „skew” mockup (PNG on solid project color).

Perspektywa zbliżona do kart referencyjnych (duży mockup, rotateX/Y/Z,
wyśrodkowany, dół przy dolnej krawędzi pasma wizualnego). Wejście = płaski
zrzut (bez wcześniejszego skew).

Requires: Pillow, NumPy.

Example:
  python3 scripts/skew_cover.py content/images/Sysdyne-NewOrder.png \\
    -o content/images/dynamite-skew-cover.png --preset portfolio
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

try:
    from numpy.typing import NDArray
except ImportError:
    NDArray = np.ndarray  # type: ignore[misc, assignment]


def parse_hex_color(s: str) -> tuple[int, int, int, int]:
    raw = s.strip()
    if raw.startswith("#"):
        raw = raw[1:]
    if len(raw) == 6:
        r, g, b = struct.unpack("BBB", bytes.fromhex(raw))
        return r, g, b, 255
    if len(raw) == 8:
        r, g, b, a = struct.unpack("BBBB", bytes.fromhex(raw))
        return r, g, b, a
    raise ValueError(f"Nieznany kolor: {s}")


def rot_x(a: float) -> NDArray[np.float64]:
    c, s = math.cos(a), math.sin(a)
    return np.array(
        [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]],
        dtype=np.float64,
    )


def rot_y(a: float) -> NDArray[np.float64]:
    c, s = math.cos(a), math.sin(a)
    return np.array(
        [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]],
        dtype=np.float64,
    )


def rot_z(a: float) -> NDArray[np.float64]:
    c, s = math.cos(a), math.sin(a)
    return np.array(
        [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
        dtype=np.float64,
    )


def translate(tx: float, ty: float, tz: float) -> NDArray[np.float64]:
    m = np.eye(4, dtype=np.float64)
    m[0, 3] = tx
    m[1, 3] = ty
    m[2, 3] = tz
    return m


def homography_from_four_points(
    src: NDArray[np.float64], dst: NDArray[np.float64]
) -> NDArray[np.float64]:
    a_rows = []
    for i in range(4):
        x, y = src[i, 0], src[i, 1]
        xp, yp = dst[i, 0], dst[i, 1]
        a_rows.append([-x, -y, -1, 0, 0, 0, xp * x, xp * y, xp])
        a_rows.append([0, 0, 0, -x, -y, -1, yp * x, yp * y, yp])
    a_mat = np.array(a_rows, dtype=np.float64)
    _, _, vt = np.linalg.svd(a_mat)
    h = vt[-1, :].reshape(3, 3)
    if abs(h[2, 2]) > 1e-12:
        h = h / h[2, 2]
    return h


def pil_perspective_coeffs(h_fwd: NDArray[np.float64]) -> tuple[float, ...]:
    h_inv = np.linalg.inv(h_fwd)
    h_inv = h_inv / h_inv[2, 2]
    return (
        float(h_inv[0, 0]),
        float(h_inv[0, 1]),
        float(h_inv[0, 2]),
        float(h_inv[1, 0]),
        float(h_inv[1, 1]),
        float(h_inv[1, 2]),
        float(h_inv[2, 0]),
        float(h_inv[2, 1]),
    )


def project_quad(
    sw: int,
    sh: int,
    focal: float,
    rot_x_rad: float,
    rot_y_rad: float,
    rot_z_rad: float,
    tz: float,
) -> NDArray[np.float64]:
    """4 rogi w przestrzeni rzutu (bez przesunięcia do pikseli karty)."""
    # Kamera w (0,0,0); płaszczyzna z=0, potem obrót, potem odsunięcie w Z.
    rw = rot_x(rot_x_rad) @ rot_z(rot_z_rad) @ rot_y(rot_y_rad)
    m = translate(0, 0, tz) @ rw @ translate(-sw / 2, -sh / 2, 0)

    corners_local = np.array(
        [
            [0, 0, 0, 1],
            [sw - 1, 0, 0, 1],
            [sw - 1, sh - 1, 0, 1],
            [0, sh - 1, 0, 1],
        ],
        dtype=np.float64,
    )
    out = np.zeros((4, 2), dtype=np.float64)
    for i in range(4):
        q = m @ corners_local[i]
        x, y, z = float(q[0]), float(q[1]), float(q[2])
        depth = -z
        if depth < 1e-3:
            raise RuntimeError(
                "Płaszczyzna za blisko kamery — zwiększ --translate-z (bardziej ujemne)."
            )
        out[i, 0] = focal * x / depth
        out[i, 1] = focal * y / depth
    return out


def fit_quad_to_canvas(
    pts: NDArray[np.float64],
    out_w: int,
    out_h: int,
    margin: float,
    fill: float,
    bottom_frac: float,
) -> NDArray[np.float64]:
    """Skala + wyrównanie: środek X, dół mockupu przy bottom_frac wysokości."""
    minx, miny = pts.min(axis=0)
    maxx, maxy = pts.max(axis=0)
    w, h = maxx - minx, maxy - miny
    if w < 1e-6 or h < 1e-6:
        raise RuntimeError("Zdegenerowany czworokąt po projekcji — zmień kąty lub translate-z.")
    cx_box = (minx + maxx) / 2
    cy_box = (miny + maxy) / 2
    centered = pts - np.array([cx_box, cy_box])

    inner_w = out_w * (1 - 2 * margin)
    inner_h = out_h * (1 - 2 * margin)
    scale = min(inner_w * fill / w, inner_h * fill / h)
    scaled = centered * scale

    minx, miny = scaled.min(axis=0)
    maxx, maxy = scaled.max(axis=0)
    dx = out_w / 2 - (minx + maxx) / 2
    dy = out_h * bottom_frac - maxy
    return scaled + np.array([dx, dy])


def trim_near_white(im: Image.Image, threshold: int = 250) -> Image.Image:
    """Obetnij jednolite jasne marginesy (typowy zrzut na białym)."""
    arr = np.asarray(im.convert("RGB"))
    mask = np.any(arr < threshold, axis=2)
    if not mask.any():
        return im
    ys, xs = np.where(mask)
    pad = 2
    left = max(0, int(xs.min()) - pad)
    top = max(0, int(ys.min()) - pad)
    right = min(im.width, int(xs.max()) + pad + 1)
    bottom = min(im.height, int(ys.max()) + pad + 1)
    return im.crop((left, top, right, bottom))


def main() -> None:
    p = argparse.ArgumentParser(description="Zrzut ekranu -> mockup skew (PNG).")
    p.add_argument("input", type=Path, help="PNG/JPG wejściowy (płaski zrzut)")
    p.add_argument("-o", "--output", type=Path, required=True, help="Ścieżka wyjścia PNG")
    p.add_argument(
        "--bg",
        default="transparent",
        help='Kolor tła lub "transparent" (karta portfolio ma własny color)',
    )
    p.add_argument(
        "--preset",
        choices=["portfolio", "custom"],
        default="portfolio",
        help="portfolio = kąty jak site.css (perspective 520, rotateX/Z)",
    )
    p.add_argument("--width", type=int, default=1200, help="Szerokość wyjścia (px)")
    p.add_argument("--height", type=int, default=900, help="Wysokość wyjścia (px)")
    p.add_argument(
        "--focal",
        type=float,
        default=None,
        help="Perspektywa jak CSS perspective() (px); domyślnie 520",
    )
    p.add_argument("--rot-x", type=float, default=8.0, help="rotateX (stopnie)")
    p.add_argument("--rot-y", type=float, default=-5.0, help="rotateY (stopnie)")
    p.add_argument("--rot-z", type=float, default=-6.0, help="rotateZ (stopnie)")
    p.add_argument("--translate-z", type=float, default=-2200.0, help="Odsunięcie płaszczyzny w Z")
    p.add_argument("--margin", type=float, default=0.04, help="Margines karty (0–0.45)")
    p.add_argument("--fill", type=float, default=1.12, help="Jak duży mockup w pasie (0.5–1.25)")
    p.add_argument(
        "--bottom",
        type=float,
        default=0.9,
        help="Pozycja dolnej krawędzi mockupu (frakcja wysokości karty)",
    )
    p.add_argument("--no-trim", action="store_true", help="Nie obcinaj białych marginesów")
    p.add_argument("--shadow", action="store_true", help="Lekki drop shadow (CSS i tak daje cień)")
    p.add_argument("--shadow-offset", type=float, default=14.0)
    p.add_argument("--shadow-blur", type=int, default=22)
    args = p.parse_args()

    if not args.input.is_file():
        print(f"Brak pliku: {args.input}", file=sys.stderr)
        sys.exit(1)

    focal = args.focal if args.focal is not None else 520.0
    margin = max(0.0, min(0.45, args.margin))
    fill = max(0.5, min(1.25, args.fill))
    bottom_frac = max(0.55, min(0.95, args.bottom))

    if args.preset == "portfolio":
        args.rot_x = 8.0
        args.rot_y = -5.0
        args.rot_z = -6.0
        args.translate_z = -2200.0
        args.fill = 1.12
        args.bottom = 0.9
        args.margin = 0.04
        if args.focal is None:
            focal = 520.0
        fill = args.fill
        margin = args.margin
        bottom_frac = args.bottom

    im = Image.open(args.input).convert("RGBA")
    if not args.no_trim:
        im = trim_near_white(im)

    sw0, sh0 = im.size
    inner_w = args.width * (1 - 2 * margin)
    inner_h = args.height * (1 - 2 * margin)
    # Wejście możliwie duże przed warp — skalę dopasuje fit_quad.
    scale_in = min(inner_w * fill * 1.15 / sw0, inner_h * fill * 1.15 / sh0)
    nw = max(1, int(round(sw0 * scale_in)))
    nh = max(1, int(round(sh0 * scale_in)))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    sw, sh = resized.size

    rx = math.radians(args.rot_x)
    ry = math.radians(args.rot_y)
    rz = math.radians(args.rot_z)

    proj = project_quad(sw, sh, focal, rx, ry, rz, args.translate_z)
    dst_pts = fit_quad_to_canvas(proj, args.width, args.height, margin, fill, bottom_frac)

    src_pts = np.array(
        [[0, 0], [sw - 1, 0], [sw - 1, sh - 1], [0, sh - 1]], dtype=np.float64
    )
    h_fwd = homography_from_four_points(src_pts, dst_pts)
    coeffs = pil_perspective_coeffs(h_fwd)

    warped_rgba = resized.transform(
        (args.width, args.height),
        Image.Transform.PERSPECTIVE,
        coeffs,
        Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0),
    )

    warped = np.asarray(warped_rgba).astype(np.float64) / 255.0
    transparent_bg = args.bg.strip().lower() in {"transparent", "none", "clear"}
    if transparent_bg:
        canvas = warped
    else:
        bg = parse_hex_color(args.bg)
        canvas = np.zeros((args.height, args.width, 4), dtype=np.float64)
        canvas[:, :, 0] = bg[0] / 255.0
        canvas[:, :, 1] = bg[1] / 255.0
        canvas[:, :, 2] = bg[2] / 255.0
        canvas[:, :, 3] = bg[3] / 255.0

    if args.shadow and not transparent_bg:
        shadow_rgb = np.concatenate(
            [np.zeros((args.height, args.width, 3)), warped[:, :, 3:4] * 0.4],
            axis=2,
        )
        shadow_pil = Image.fromarray(
            np.clip(shadow_rgb * 255, 0, 255).astype(np.uint8), "RGBA"
        )
        shadow_pil = shadow_pil.filter(ImageFilter.GaussianBlur(radius=args.shadow_blur))
        ox_s, oy_s = int(args.shadow_offset * 0.2), int(args.shadow_offset)
        shadow_shift = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
        shadow_shift.paste(shadow_pil, (ox_s, oy_s))
        sc = np.asarray(shadow_shift).astype(np.float64) / 255.0
        canvas = canvas * (1 - sc[:, :, 3:4]) + sc

    if not transparent_bg:
        a = warped[:, :, 3:4]
        canvas = canvas * (1 - a) + warped

    out_im = Image.fromarray(np.clip(canvas * 255, 0, 255).astype(np.uint8), "RGBA")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    out_im.save(args.output, "PNG")
    print(f"Zapisano {args.output} ({args.width}x{args.height})")


if __name__ == "__main__":
    main()
