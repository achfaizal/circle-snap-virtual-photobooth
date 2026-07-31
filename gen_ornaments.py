"""Generate corner ornament PNGs untuk tema event tanpa aset floral custom.

Beda dengan gen_templates.py (bingkai foto dengan slot), file ini bikin satu
dekorasi sudut transparan per tema — dipasang di ke-4 pojok layar lewat CSS
(dicerminkan/diputar), bukan lubang foto. Semua digambar procedural pakai
Pillow (garis, busur, daun sederhana) karena tidak ada aset ilustrasi floral
siap pakai untuk event selain Salma & Faizal.

Supersample 4x lalu downscale supaya kurva/garis halus (ImageDraw bawaan
tidak antialiased di resolusi native).
"""
from PIL import Image, ImageDraw
import math
import os

SS = 4  # faktor supersampling
SIZE = 480 * SS
OUT = "public/templates"


def new_canvas():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def leaf(img, cx, cy, length, width, angle_deg, color):
    """Tempel satu daun elips di atas `img`, memanjang dari (cx, cy) ke arah angle_deg."""
    leaf_img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaf_img)
    mx, my = cx + length / 2, cy
    ld.ellipse([mx - length / 2, my - width / 2, mx + length / 2, my + width / 2], fill=color)
    rotated = leaf_img.rotate(-angle_deg, center=(cx, cy), resample=Image.BICUBIC)
    img.alpha_composite(rotated)


def corner_bracket(d, inset, reach, color, width, gap):
    """Bingkai siku ganda di pojok kiri-atas: dua garis L dengan jarak `gap`."""
    for off in (0, gap):
        d.line([(inset + off, inset + reach), (inset + off, inset + off), (inset + reach, inset + off)],
               fill=color, width=width, joint="curve")


def botanical_corner(path, gold, emerald, deep):
    """Tema Emerald & Gold — Sarah & Wildan: bracket tipis + ranting daun modern."""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    inset = 40 * SS
    reach = 300 * SS
    corner_bracket(d, inset, reach, gold, 3 * SS, 10 * SS)

    # dot kecil di ujung bracket
    r = 5 * SS
    d.ellipse([inset + reach - r, inset - r, inset + reach + r, inset + r], fill=gold)
    d.ellipse([inset - r, inset + reach - r, inset + r, inset + reach + r], fill=gold)

    # ranting botani memancar dari sudut, daun berselang-seling
    stem_len = 220 * SS
    origin = (inset + 6 * SS, inset + 6 * SS)
    stem_end = (origin[0] + stem_len * math.cos(math.radians(48)),
                origin[1] + stem_len * math.sin(math.radians(48)))
    d.line([origin, stem_end], fill=emerald, width=int(2.5 * SS))

    leaf_specs = [
        (0.18, 34, 60, 22), (0.34, -28, 66, 24), (0.5, 40, 72, 26),
        (0.66, -34, 68, 24), (0.82, 30, 56, 20),
    ]
    for t, spread, length, width in leaf_specs:
        px = origin[0] + (stem_end[0] - origin[0]) * t
        py = origin[1] + (stem_end[1] - origin[1]) * t
        base_angle = 48 + spread
        leaf(img, px, py, length * SS, width * SS, base_angle, emerald)

    # sedikit aksen emas di ujung ranting
    tip_r = 6 * SS
    d.ellipse([stem_end[0] - tip_r, stem_end[1] - tip_r, stem_end[0] + tip_r, stem_end[1] + tip_r], fill=gold)

    img = img.resize((480, 480), Image.LANCZOS)
    img.save(path)


def laurel_corner(path, gold, gold_deep):
    """Tema Navy & Gold — Wisuda 45: bracket ganda + cabang laurel akademik."""
    img = new_canvas()
    d = ImageDraw.Draw(img)

    inset = 40 * SS
    reach = 300 * SS
    corner_bracket(d, inset, reach, gold, 3 * SS, 12 * SS)

    r = 5 * SS
    d.ellipse([inset + reach - r, inset - r, inset + reach + r, inset + r], fill=gold)
    d.ellipse([inset - r, inset + reach - r, inset + r, inset + reach + r], fill=gold)

    # cabang laurel: batang lengkung dari sudut, daun berpasangan simetris
    origin = (inset + 4 * SS, inset + 4 * SS)
    steps = 7
    branch_len = 230 * SS
    prev = origin
    for i in range(1, steps + 1):
        t = i / steps
        angle = 46 + 10 * math.sin(t * math.pi)
        px = origin[0] + branch_len * t * math.cos(math.radians(46))
        py = origin[1] + branch_len * t * math.sin(math.radians(46))
        d.line([prev, (px, py)], fill=gold_deep, width=int(2.2 * SS))
        prev = (px, py)

        leaf_len = (34 - t * 10) * SS
        leaf_w = (14 - t * 4) * SS
        leaf(img, px, py, leaf_len, leaf_w, angle + 55, gold)
        leaf(img, px, py, leaf_len, leaf_w, angle - 55, gold)

    tip_r = 6 * SS
    d.ellipse([prev[0] - tip_r, prev[1] - tip_r, prev[0] + tip_r, prev[1] + tip_r], fill=gold)

    img = img.resize((480, 480), Image.LANCZOS)
    img.save(path)


if __name__ == "__main__":
    sarah_dir = f"{OUT}/Sarah&Wildan"
    wisuda_dir = f"{OUT}/Wisuda45"
    os.makedirs(sarah_dir, exist_ok=True)
    os.makedirs(wisuda_dir, exist_ok=True)

    botanical_corner(
        f"{sarah_dir}/decor-tl.png",
        gold=(196, 155, 74, 255),
        emerald=(46, 107, 78, 255),
        deep=(23, 66, 47, 255),
    )
    laurel_corner(
        f"{wisuda_dir}/decor-tl.png",
        gold=(230, 190, 100, 255),
        gold_deep=(178, 140, 66, 255),
    )
    print("ornamen dibuat di", sarah_dir, "dan", wisuda_dir)
