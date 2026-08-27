#!/usr/bin/env python3
"""Split the zodiac character sheet into transparent PNG and SVG assets."""

from __future__ import annotations

import base64
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


SOURCE = Path(
    "/Users/yuking/Library/Containers/com.tencent.xinWeChat/Data/Documents/"
    "xwechat_files/wxid_lkt9t54yh9ok22_fea5/temp/RWTemp/2026-08/"
    "4ed8132aa8922e45c3e95faba7bebba1/813cb0aa07c56a8239143b5c3ee48326.jpg"
)
OUTPUT = Path("assets/zodiac-characters")

# Crop boxes deliberately stop above the captions in the source sheet.
ITEMS = [
    ("01-rat", "子鼠", (8, 126, 268, 468)),
    ("02-ox", "丑牛", (274, 128, 524, 468)),
    ("03-tiger", "寅虎", (518, 135, 790, 468)),
    ("04-rabbit", "卯兔", (789, 112, 1047, 468)),
    ("05-dragon", "辰龙", (8, 535, 270, 902)),
    ("06-snake", "巳蛇", (272, 574, 524, 902)),
    ("07-horse", "午马", (530, 558, 790, 902)),
    ("08-goat", "未羊", (800, 574, 1048, 902)),
    ("09-monkey", "申猴", (8, 992, 270, 1318)),
    ("10-rooster", "酉鸡", (300, 965, 505, 1318)),
    ("11-dog", "戌狗", (530, 993, 780, 1318)),
    ("12-pig", "亥猪", (786, 990, 1048, 1318)),
]


def border_connected_white(rgb: np.ndarray) -> np.ndarray:
    """Return near-white regions connected to a crop border."""
    hi = rgb.min(axis=2) > 239
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) < 22
    candidate = (hi & neutral).astype(np.uint8)
    count, labels = cv2.connectedComponents(candidate, connectivity=8)
    if count <= 1:
        return np.zeros(candidate.shape, dtype=bool)
    border_labels = np.unique(
        np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1]))
    )
    border_labels = border_labels[border_labels != 0]
    return np.isin(labels, border_labels)


def remove_background(crop: Image.Image) -> Image.Image:
    rgb = np.asarray(crop.convert("RGB"))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    connected_bg = border_connected_white(rgb)

    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    chroma = mx - mn

    mask = np.full(rgb.shape[:2], cv2.GC_PR_FGD, dtype=np.uint8)
    mask[connected_bg] = cv2.GC_BGD
    mask[(mn > 232) & (chroma < 25) & ~connected_bg] = cv2.GC_PR_BGD
    mask[(mn < 218) | (chroma > 28)] = cv2.GC_FGD

    # Guarantee a background frame for GrabCut without forcing actual artwork
    # touching the crop boundary to disappear.
    mask[:2, :] = cv2.GC_BGD
    mask[-2:, :] = cv2.GC_BGD
    mask[:, :2] = cv2.GC_BGD
    mask[:, -2:] = cv2.GC_BGD

    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, bg_model, fg_model, 5, cv2.GC_INIT_WITH_MASK)

    foreground = np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD)).astype(np.uint8) * 255
    # Remove isolated specks while retaining fine accessories and tails.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, 8)
    cleaned = np.zeros_like(foreground)
    largest_area = stats[1:, cv2.CC_STAT_AREA].max(initial=0)
    min_area = max(20, int(largest_area * 0.005))
    for label in range(1, count):
        if stats[label, cv2.CC_STAT_AREA] >= min_area:
            cleaned[labels == label] = 255

    alpha = cv2.GaussianBlur(cleaned, (0, 0), 0.75)
    rgba = np.dstack((rgb, alpha)).astype(np.uint8)
    result = Image.fromarray(rgba, "RGBA")

    bbox = result.getchannel("A").getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 8
        result = result.crop(
            (
                max(0, left - pad),
                max(0, top - pad),
                min(result.width, right + pad),
                min(result.height, bottom + pad),
            )
        )
    return result


def write_svg(png_path: Path, svg_path: Path, title: str, width: int, height: int) -> None:
    encoded = base64.b64encode(png_path.read_bytes()).decode("ascii")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg"
  width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">
  <title id="title">{title}</title>
  <image width="{width}" height="{height}" preserveAspectRatio="xMidYMid meet"
    href="data:image/png;base64,{encoded}"/>
</svg>
'''
    svg_path.write_text(svg, encoding="utf-8")


def make_contact_sheet(images: list[tuple[str, str, Image.Image]]) -> None:
    cell_w, cell_h = 280, 390
    sheet = Image.new("RGB", (cell_w * 4, cell_h * 3), "#eeeeee")
    draw = ImageDraw.Draw(sheet)
    for index, (slug, title, asset) in enumerate(images):
        preview = asset.copy()
        preview.thumbnail((250, 330), Image.Resampling.LANCZOS)
        x = (index % 4) * cell_w + (cell_w - preview.width) // 2
        y = (index // 4) * cell_h + 8 + (330 - preview.height)
        sheet.paste(preview, (x, y), preview)
        draw.text(((index % 4) * cell_w + 12, (index // 4 + 1) * cell_h - 38), f"{slug}  {title}", fill="#222222")
    sheet.save(OUTPUT / "preview-contact-sheet.jpg", quality=92)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")
    processed: list[tuple[str, str, Image.Image]] = []
    for slug, title, box in ITEMS:
        asset = remove_background(source.crop(box))
        png_path = OUTPUT / f"{slug}.png"
        svg_path = OUTPUT / f"{slug}.svg"
        asset.save(png_path, optimize=True)
        write_svg(png_path, svg_path, title, asset.width, asset.height)
        processed.append((slug, title, asset))
        print(f"{slug}: {asset.width}x{asset.height}")
    make_contact_sheet(processed)


if __name__ == "__main__":
    main()
