#!/usr/bin/env python3
"""
Flat screenshot -> portfolio „skew” mockup (PNG on solid color + soft shadow).

Projekcja zbliżona do CSS: perspective(...) rotateX(...) rotateZ(...), pinhole
u = cx + f * x / z, v = cy + f * y / z (płaszczyzna tekstury z = 0, potem obrót
i przesunięcie). Mapowanie PIL PERSPECTIVE (odwrotna homografia).

Wymaga: Pillow, NumPy.

Przykład:
  python3 scripts/skew_cover.py content/images/Sysdyne-NewOrder.png \\
    -o content/images/dynamite-skew.png --bg "#ec413a" --shadow
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
    """DLT: src, dst shape (4,2) -> 3x3 H with dst ~ H @ src_hom."""
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


def project_corners(
    sw: int,
    sh: int,
    cx: float,
    cy: float,
    focal: float,
    rot_x_rad: float,
    rot_y_rad: float,
    rot_z_rad: float,
    tz: float,
) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
    """Cztery rogi tekstury (TL,TR,BR,BL) w pikselach wyjściowych."""
    # CSS: perspective * rotateX * rotateZ * rotateY (na wektorze z lewej w CSS;
    # tutaj składamy macierze tak, by P' = M @ P w kolumnach).
    rw = rot_x(rot_x_rad) @ rot_z(rot_z_rad) @ rot_y(rot_y_rad)
    t_model = translate(cx, cy, tz)
    m = t_model @ rw @ translate(-sw / 2, -sh / 2, 0)

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
        if abs(z) < 1e-6:
            raise RuntimeError("Punkt na płaszczyźnie ogniskowej — zwiększ |translate-z|.")
        out[i, 0] = cx + focal * x / z
        out[i, 1] = cy + focal * y / z

    src = np.array(
        [[0, 0], [sw - 1, 0], [sw - 1, sh - 1], [0, sh - 1]], dtype=np.float64
    )
    return src, out


def pil_perspective_coeffs(h_fwd: NDArray[np.float64]) -> tuple[float, ...]:
    """PIL oczekuje współczynników odwrotnej homografii (wyjście -> wejście), h33 = 1."""
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


def main() -> None:
    p = argparse.ArgumentParser(description="Zrzut ekranu -> mockup skew (PNG).")
    p.add_argument("input", type=Path, help="PNG/JPG wejściowy")
    p.add_argument("-o", "--output", type=Path, required=True, help="Ścieżka wyjścia PNG")
    p.add_argument(
        "--bg",
        default="#202020",
        help='Kolor tła (np. "#ec413a" dopasowany do --color projektu)',
    )
    p.add_argument("--width", type=int, default=1600, help="Szerokość wyjścia (px)")
    p.add_argument("--height", type=int, default=1000, help="Wysokość wyjścia (px)")
    p.add_argument(
        "--focal",
        type=float,
        default=None,
        help='Długość perspektywy jak w CSS perspective() (px); domyślnie 520',
    )
    p.add_argument("--rot-x", type=float, default=8.0, help="rotateX (stopnie)")
    p.add_argument("--rot-y", type=float, default=0.0, help="rotateY (stopnie)")
    p.add_argument("--rot-z", type=float, default=-6.0, help="rotateZ (stopnie)")
    p.add_argument(
        "--translate-z",
        type=float,
        default=-900.0,
        help="Położenie Z środka płaszczyzny przed projekcją (ujemne = „przed kamerą”)",
    )
    p.add_argument("--margin", type=float, default=0.12, help="Margines (0–0.45)")
    p.add_argument("--shadow", action="store_true", help="Lekki drop shadow")
    p.add_argument("--shadow-offset", type=float, default=18.0, help="Cień: przesunięcie w dół (px)")
    p.add_argument("--shadow-blur", type=int, default=28, help="Cień: Gaussian blur (radius PIL)")
    args = p.parse_args()

    if not args.input.is_file():
        print(f"Brak pliku: {args.input}", file=sys.stderr)
        sys.exit(1)

    focal = args.focal if args.focal is not None else 520.0
    margin = max(0.0, min(0.45, args.margin))
    inner_w = args.width * (1 - 2 * margin)
    inner_h = args.height * (1 - 2 * margin)
    oy = args.height * margin

    im = Image.open(args.input).convert("RGBA")
    sw0, sh0 = im.size

    scale = min(inner_w / sw0, inner_h / sh0)
    nw = max(1, int(round(sw0 * scale)))
    nh = max(1, int(round(sh0 * scale)))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    sw, sh = resized.size

    cx_img = args.width / 2
    cy_band = inner_h / 2 + oy + nh * 0.02

    rx = math.radians(args.rot_x)
    ry = math.radians(args.rot_y)
    rz = math.radians(args.rot_z)

    src_pts, dst_pts = project_corners(
        sw, sh, cx_img, cy_band, focal, rx, ry, rz, args.translate_z
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

    bg = parse_hex_color(args.bg)
    canvas = np.zeros((args.height, args.width, 4), dtype=np.float64)
    canvas[:, :, 0] = bg[0] / 255.0
    canvas[:, :, 1] = bg[1] / 255.0
    canvas[:, :, 2] = bg[2] / 255.0
    canvas[:, :, 3] = bg[3] / 255.0

    if args.shadow:
        shadow_rgb = np.concatenate(
            [np.zeros((args.height, args.width, 3)), warped[:, :, 3:4] * 0.45],
            axis=2,
        )
        shadow_pil = Image.fromarray(
            np.clip(shadow_rgb * 255, 0, 255).astype(np.uint8), "RGBA"
        )
        shadow_pil = shadow_pil.filter(ImageFilter.GaussianBlur(radius=args.shadow_blur))
        ox_s, oy_s = int(args.shadow_offset * 0.25), int(args.shadow_offset)
        shadow_shift = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
        shadow_shift.paste(shadow_pil, (ox_s, oy_s))
        sc = np.asarray(shadow_shift).astype(np.float64) / 255.0
        canvas = canvas * (1 - sc[:, :, 3:4]) + sc

    a = warped[:, :, 3:4]
    canvas = canvas * (1 - a) + warped

    out_im = Image.fromarray(np.clip(canvas * 255, 0, 255).astype(np.uint8), "RGBA")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    out_im.save(args.output, "PNG")
    print(f"Zapisano {args.output}")


if __name__ == "__main__":
    main()
