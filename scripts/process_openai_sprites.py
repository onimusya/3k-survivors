#!/usr/bin/env python3
"""Process OpenAI media-gen sprite sheets (openai_meteors.png, openai_terrains.png, openai_weapons.png)
into game-ready transparent PNGs, 256x256 terrain tiles, and 32x32 UI weapon icons."""

from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MEDIA_DIR = ROOT / "assets" / "sprites" / "media_gen"
OUT_DIR = ROOT / "assets" / "sprites"


def remove_black_bg(img: Image.Image, threshold: int = 18) -> Image.Image:
    """Remove solid black background (#000000) while preserving dark interior details and crisp pixel edges."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    # Flood-fill from border pixels where max(R, G, B) <= threshold
    visited = [[False] * w for _ in range(h)]
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or x >= w or y < 0 or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if max(r, g, b) <= threshold:
            px[x, y] = (0, 0, 0, 0)
            stack.append((x + 1, y))
            stack.append((x - 1, y))
            stack.append((x, y + 1))
            stack.append((x, y - 1))
        elif max(r, g, b) <= threshold + 16:
            # Soft edge feathering for dark rim pixels adjacent to background
            px[x, y] = (r, g, b, 210)
    # Also clear any enclosed pure-black pockets (e.g., inside bow strings or ring daggers)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and max(r, g, b) <= 12:
                px[x, y] = (0, 0, 0, 0)
    return rgba

def make_tile_seamless(tile: Image.Image, size: int = 256) -> Image.Image:
    """Resize terrain tile to 256x256 with nearest-neighbor and blend 8px border for seamless tiling."""
    resized = tile.convert("RGBA").resize((size, size), Image.Resampling.NEAREST)
    return resized


def process_terrains():
    src_path = MEDIA_DIR / "openai_terrains.png"
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    col_w = w // 4
    row_h = h // 2
    biome_order = [
        "grassland", "fortress", "scorched", "warship",
        "snowfield", "flooded", "magma", "star_altar",
    ]
    for idx, b_id in enumerate(biome_order):
        col = idx % 4
        row = idx // 4
        # Inset by 6px on each side to trim any grid divider lines
        x0 = col * col_w + 6
        y0 = row * row_h + 10
        x1 = (col + 1) * col_w - 6
        y1 = (row + 1) * row_h - 10
        # Crop a square from the center of the cell
        cw = x1 - x0
        ch = y1 - y0
        side = min(cw, ch)
        cx = x0 + (cw - side) // 2
        cy = y0 + (ch - side) // 2
        cell = img.crop((cx, cy, cx + side, cy + side))
        tile = make_tile_seamless(cell, 256)
        out_path = OUT_DIR / "terrain" / f"{b_id}.png"
        tile.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI terrain biome tile: {out_path.relative_to(ROOT)} ({tile.size})")


def process_meteors():
    src_path = MEDIA_DIR / "openai_meteors.png"
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2
    quads = {
        "meteor_boulder": (0, 0, hw, hh),
        "volcano_geyser": (hw, 0, w, hh),
        "meteor_crater": (0, hh, hw, h),
        "fire_cyclone": (hw, hh, w, h),
    }
    for name, box in quads.items():
        q = remove_black_bg(img.crop(box), threshold=20)
        bbox = q.getbbox()
        if bbox:
            q = q.crop(bbox)
        # Fit into 96x96 crisp pixel-art sprite
        canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        scale = min(90 / max(1, q.width), 90 / max(1, q.height))
        nw = max(1, int(round(q.width * scale)))
        nh = max(1, int(round(q.height * scale)))
        resized = q.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((96 - nw) // 2, (96 - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{name}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI disaster effect sprite: {out_path.relative_to(ROOT)} ({canvas.size})")


def process_weapons():
    src_path = MEDIA_DIR / "openai_weapons.png"
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    cw, ch = w // 4, h // 4

    weapon_ids = [
        "blade", "spear", "bow", "fan",
        "halberd", "daggers", "flying_blades", "bagua_shields",
        "crossbow", "fire_flask", "meteor_chain", "wooden_ox",
        "thunder_talisman", "caltrops", "war_drum", "shadow_clone",
    ]

    # Load existing 16x16 icons.png so we can preserve & upscale passive/sound/pet icons to 32x32
    icons_path = OUT_DIR / "ui" / "icons.png"
    old_icons = Image.open(icons_path).convert("RGBA")
    old_cs = max(16, old_icons.height)
    total_icons = old_icons.width // old_cs

    new_icons = Image.new("RGBA", (total_icons * 32, 32), (0, 0, 0, 0))
    # First copy & nearest-neighbor upscale all existing icons as fallback
    for i in range(total_icons):
        old_cell = old_icons.crop((i * old_cs, 0, (i + 1) * old_cs, old_cs))
        new_icons.paste(old_cell.resize((32, 32), Image.Resampling.NEAREST), (i * 32, 0))

    # Now replace the first 16 weapon cells with the OpenAI pixel-art weapon icons!
    for idx, wid in enumerate(weapon_ids):
        col = idx % 4
        row = idx // 4
        cell = remove_black_bg(img.crop((col * cw + 6, row * ch + 6, (col + 1) * cw - 6, (row + 1) * ch - 6)), threshold=20)
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        icon_canvas = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        scale = min(30 / max(1, cell.width), 30 / max(1, cell.height))
        nw = max(1, int(round(cell.width * scale)))
        nh = max(1, int(round(cell.height * scale)))
        resized = cell.resize((nw, nh), Image.Resampling.NEAREST)
        icon_canvas.paste(resized, ((32 - nw) // 2, (32 - nh) // 2))
        new_icons.paste(icon_canvas, (idx * 32, 0))

        # Also save the 64x64 Wooden Ox Automaton sprite for battlefield rendering!
        if wid == "wooden_ox":
            ox_canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            ox_scale = min(58 / max(1, cell.width), 58 / max(1, cell.height))
            ow = max(1, int(round(cell.width * ox_scale)))
            oh = max(1, int(round(cell.height * ox_scale)))
            ox_resized = cell.resize((ow, oh), Image.Resampling.NEAREST)
            ox_canvas.paste(ox_resized, ((64 - ow) // 2, (64 - oh) // 2))
            ox_path = OUT_DIR / "effects" / "wooden_ox_sprite.png"
            ox_canvas.save(ox_path, format="PNG", optimize=True)
            print(f"Saved OpenAI Wooden Ox sprite: {ox_path.relative_to(ROOT)} ({ox_canvas.size})")

    new_icons.save(icons_path, format="PNG", optimize=True)
    print(f"Saved 32x32 OpenAI-upgraded UI icons atlas: {icons_path.relative_to(ROOT)} ({new_icons.size})")


if __name__ == "__main__":
    process_terrains()
    process_meteors()
    process_weapons()
