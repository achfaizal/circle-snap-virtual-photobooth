"""Generate transparent PNG frame overlays.

Perbedaan penting dari versi pertama: TIDAK ADA TEKS di dalam PNG.

Nama pengantin, tanggal, dan tagar digambar oleh compositor saat runtime dari
data event. Kalau teks dibakar ke PNG, setiap pernikahan butuh file baru dan
bisnisnya berubah jadi jasa desain per-klien, bukan SaaS. PNG hanya memuat
elemen yang benar-benar tetap: kertas, garis, dan lubang foto.
"""
from PIL import Image, ImageDraw
import os

OUT = "public/templates"
os.makedirs(OUT, exist_ok=True)

INK = (20, 16, 14, 255)
PAPER = (247, 243, 236, 255)
FLASH = (255, 228, 94, 255)
LIVE = (255, 77, 61, 255)


def punch(img, slots):
    px = img.load()
    for s in slots:
        for y in range(s["y"], s["y"] + s["h"]):
            for x in range(s["x"], s["x"] + s["w"]):
                px[x, y] = (0, 0, 0, 0)


def klasik():
    W, H = 600, 1800
    slots = [{"x": 40, "y": 40 + i * 414, "w": 520, "h": 390} for i in range(4)]
    img = Image.new("RGBA", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    for s in slots:
        d.rectangle([s["x"] - 6, s["y"] - 6, s["x"] + s["w"] + 5, s["y"] + s["h"] + 5],
                    outline=(20, 16, 14, 40), width=2)
    d.line([(40, 1700), (560, 1700)], fill=(20, 16, 14, 45), width=2)
    d.ellipse([W / 2 - 5, 1752, W / 2 + 5, 1762], fill=LIVE)
    punch(img, slots)
    img.save(f"{OUT}/klasik.png")


def duo():
    W, H = 600, 1200
    slots = [{"x": 40, "y": 40 + i * 504, "w": 520, "h": 480} for i in range(2)]
    img = Image.new("RGBA", (W, H), FLASH)
    d = ImageDraw.Draw(img)
    d.rectangle([16, 16, W - 17, H - 17], outline=INK, width=5)
    for s in slots:
        d.rectangle([s["x"] - 5, s["y"] - 5, s["x"] + s["w"] + 4, s["y"] + s["h"] + 4],
                    outline=INK, width=4)
    punch(img, slots)
    img.save(f"{OUT}/duo.png")


def grid():
    W, H = 1200, 1320
    slots = []
    for r in range(2):
        for c in range(2):
            slots.append({"x": 48 + c * 564, "y": 48 + r * 564, "w": 540, "h": 540})
    img = Image.new("RGBA", (W, H), INK)
    d = ImageDraw.Draw(img)
    d.line([(48, 1170), (1152, 1170)], fill=(247, 243, 236, 55), width=2)
    punch(img, slots)
    img.save(f"{OUT}/grid.png")


def polaroid():
    W, H = 1050, 1260
    slots = [{"x": 75, "y": 75, "w": 900, "h": 900}]
    img = Image.new("RGBA", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([69, 69, 981, 981], outline=(20, 16, 14, 35), width=3)
    punch(img, slots)
    img.save(f"{OUT}/polaroid.png")


if __name__ == "__main__":
    klasik(); duo(); grid(); polaroid()
    print("overlay dibuat di", OUT)
