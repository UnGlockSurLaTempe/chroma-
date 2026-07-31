#!/usr/bin/env python3
"""Génère l'icône de l'app : web/icon.png et web/icon.ico.

Pur Python (zlib + struct), aucune dépendance. Relance-le si tu veux changer
les couleurs ou le dessin : `python tools/make_icon.py`.
"""

import os
import struct
import zlib

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PNG = os.path.join(HERE, "web", "icon.png")
OUT_ICO = os.path.join(HERE, "web", "icon.ico")

BG = (0x15, 0x1a, 0x22)
GOLD = (0xc9, 0xa2, 0x27)
GOLD_DIM = (0x8a, 0x6f, 0x1b)
SS = 4  # suréchantillonnage pour l'anticrénelage


def draw(size):
    """Cible dorée sur carré arrondi sombre → bytearray RGBA."""
    n = size * SS
    px = bytearray(size * size * 4)

    radius = 0.20 * n           # arrondi du carré
    r_out = 0.375 * n           # anneau extérieur
    r_in = 0.285 * n
    r_dot = 0.115 * n
    tick_w = 0.045 * n          # entailles du réticule
    tick_len = 0.47 * n
    cx = cy = n / 2.0

    for y in range(size):
        for x in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    fx = x * SS + sx + 0.5
                    fy = y * SS + sy + 0.5

                    # carré arrondi
                    dx = max(abs(fx - cx) - (n / 2.0 - radius), 0.0)
                    dy = max(abs(fy - cy) - (n / 2.0 - radius), 0.0)
                    if (dx * dx + dy * dy) > radius * radius:
                        continue  # transparent hors du carré

                    d = ((fx - cx) ** 2 + (fy - cy) ** 2) ** 0.5
                    color = BG

                    on_cross = (abs(fx - cx) < tick_w and abs(fy - cy) < tick_len) or \
                               (abs(fy - cy) < tick_w and abs(fx - cx) < tick_len)
                    in_ring = r_in <= d <= r_out

                    if d <= r_dot:
                        color = GOLD
                    elif in_ring and not on_cross:
                        color = GOLD
                    elif on_cross and d > r_dot and d < tick_len:
                        color = GOLD_DIM if d > r_out else GOLD_DIM

                    acc[0] += color[0]; acc[1] += color[1]; acc[2] += color[2]; acc[3] += 255

            k = (y * size + x) * 4
            total = SS * SS
            alpha = acc[3] / total
            if alpha > 0:
                # les couleurs accumulées sont pondérées par les sous-pixels opaques
                opaque = acc[3] / 255.0
                px[k] = int(acc[0] / opaque)
                px[k + 1] = int(acc[1] / opaque)
                px[k + 2] = int(acc[2] / opaque)
            px[k + 3] = int(alpha)
    return px


def png_bytes(size, px):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw += px[y * size * 4:(y + 1) * size * 4]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)) +
            chunk(b"IEND", b""))


def ico_bytes(images):
    """Conteneur ICO à entrées PNG (supporté depuis Windows Vista)."""
    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries, blobs = b"", b""
    for size, data in images:
        entries += struct.pack("<BBBBHHII", size if size < 256 else 0,
                               size if size < 256 else 0, 0, 0, 1, 32,
                               len(data), offset)
        blobs += data
        offset += len(data)
    return header + entries + blobs


def main():
    sizes = [256, 64, 32]
    rendered = [(s, png_bytes(s, draw(s))) for s in sizes]

    with open(OUT_PNG, "wb") as fh:
        fh.write(dict(rendered)[256])
    with open(OUT_ICO, "wb") as fh:
        fh.write(ico_bytes(rendered))

    print("écrit %s (%d o)" % (OUT_PNG, os.path.getsize(OUT_PNG)))
    print("écrit %s (%d o)" % (OUT_ICO, os.path.getsize(OUT_ICO)))


if __name__ == "__main__":
    main()
