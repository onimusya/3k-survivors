#!/usr/bin/env python3
"""
Deterministic Universal LPC Character Sprite Generator for 3K Survivors.
Downloads and caches official Universal LPC spritesheet layers from:
  https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets/
Applies authentic Universal LPC palette recoloring (body, metal, cloth, hair, wood)
and composites 6 Three Kingdoms Heroes (8x4 frames of 64x64) and 10 Enemy/Boss types
(4x1 frames of 64x64 + combined 256x640 ParticleContainer atlas).
"""
import hashlib
import io
import urllib.request
from pathlib import Path
from PIL import Image

BASE_URL = "https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/spritesheets"
ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache" / "lpc"
OUT_DIR = ROOT / "assets" / "sprites"

CELL = 64
OVER = 192  # 3x64 oversize canvas so 64x64, 128x128, and 192x192 LPC layers align at center

# Official Universal LPC 6-step color ramps (from palette-metadata.js)
PALETTES = {
    "body": {
        "base": ["#271920", "#99423c", "#cc8665", "#e4a47c", "#f9d5ba", "#faece7"],
        "light": ["#271920", "#99423c", "#cc8665", "#e4a47c", "#f9d5ba", "#faece7"],
        "amber": ["#271920", "#893029", "#b96747", "#df9163", "#f6bd8c", "#f9dfc4"],
        "olive": ["#271920", "#762a23", "#a25c3d", "#c67d53", "#e4a672", "#f3cfa6"],
        "taupe": ["#271920", "#662823", "#8b4c39", "#a9694f", "#cfa17d", "#e6c6aa"],
        "bronze": ["#20141b", "#59221d", "#7c3f29", "#9e5b3b", "#c38258", "#deb189"],
    },
    "metal": {
        "base": ["#1d131e", "#4d4a5d", "#726b7e", "#867e7f", "#c4b59f", "#ffffff"],
        "steel": ["#1d131e", "#4d4a5d", "#726b7e", "#867e7f", "#c4b59f", "#ffffff"],
        "iron": ["#161018", "#33313d", "#4d4a5a", "#676373", "#8f8b99", "#c8c5d0"],
        "silver": ["#1d1824", "#56586e", "#7d8299", "#a4abbf", "#d2d8e6", "#ffffff"],
        "gold": ["#2e2533", "#6d4a00", "#966600", "#dc6f35", "#ffc95a", "#ffff61"],
        "brass": ["#281e29", "#593e16", "#805c22", "#a87e33", "#d4af53", "#f5df8b"],
        "bronze": ["#241822", "#522b18", "#784222", "#a15c2f", "#cc8349", "#edb479"],
        "jade": ["#13261c", "#1f4d34", "#2e784d", "#45a86b", "#75db99", "#c8ffdc"],
        "crimson_metal": ["#240e14", "#521820", "#82242c", "#b5353a", "#e65c55", "#ff9e8a"],
    },
    "cloth": {
        "base": ["#281820", "#4d4a5d", "#958080", "#c4b59f", "#e5e6c7", "#ffffff"],
        "white": ["#281820", "#4d4a5d", "#958080", "#c4b59f", "#e5e6c7", "#ffffff"],
        "green": ["#14241b", "#1e4728", "#2b6e37", "#419648", "#65bf63", "#98e68e"],
        "forest": ["#142019", "#1d3826", "#2b5436", "#3d7348", "#579460", "#7eb884"],
        "red": ["#291117", "#5c161e", "#8f2024", "#c2302b", "#e85343", "#ff8773"],
        "maroon": ["#210e14", "#42141c", "#661c24", "#8a272f", "#b03e42", "#d46563"],
        "blue": ["#151829", "#1f2e59", "#2b4b8c", "#3b6ec2", "#5c95e6", "#8fc0ff"],
        "navy": ["#111321", "#182040", "#223263", "#30498a", "#4668b0", "#6c91d4"],
        "teal": ["#122126", "#19404a", "#226470", "#2f8c99", "#4bb5bf", "#7de0e6"],
        "purple": ["#1f1329", "#3c1f54", "#5c2e80", "#8042ab", "#a864d4", "#d198f5"],
        "lavender": ["#21182b", "#413057", "#654b85", "#8c6bb0", "#b594d9", "#dec4f7"],
        "yellow": ["#2b1e16", "#664414", "#996b1b", "#cc9624", "#f0c238", "#ffe76b"],
        "orange": ["#291512", "#612714", "#943f19", "#c75d20", "#eb8434", "#ffb35c"],
        "brown": ["#211517", "#42271d", "#633c26", "#875433", "#ab7046", "#cfa26b"],
        "leather": ["#241617", "#4a291b", "#704022", "#995a2c", "#c27a3e", "#e6a463"],
        "tan": ["#26191a", "#523929", "#7a583d", "#a37b56", "#cca376", "#edd0a6"],
        "black": ["#0d0d12", "#1c1d24", "#2e303b", "#434654", "#5d6170", "#7e8394"],
        "charcoal": ["#12131a", "#242633", "#383b4d", "#505469", "#6d728a", "#9297b0"],
    },
    "hair": {
        "base": ["#260d14", "#6a1108", "#a42600", "#bf4000", "#e55600", "#ff8a00"],
        "black": ["#08080c", "#12141c", "#1f2330", "#303647", "#464e63", "#636d85"],
        "dark_brown": ["#170f11", "#2e1b18", "#4a2c22", "#69402e", "#8a583f", "#ad7757"],
        "gray": ["#171721", "#333545", "#54586e", "#787d94", "#a1a6bd", "#cfd4e6"],
        "white": ["#222430", "#494e63", "#747b94", "#a3abc2", "#d1d7e8", "#ffffff"],
        "red": ["#240c12", "#591216", "#8c1c1c", "#bf2a22", "#e84a38", "#ff7a5c"],
        "gold": ["#2b1c12", "#664214", "#99681a", "#cc9224", "#f2bf38", "#ffe86b"],
    },
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def fetch_sheet(rel_path):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = rel_path.replace("/", "__")
    cached = CACHE_DIR / safe_name
    if cached.exists():
        return Image.open(cached).convert("RGBA")
    url = f"{BASE_URL}/{rel_path}"
    req = urllib.request.Request(url, headers={"User-Agent": "3k-survivors-lpc-builder/1.0"})
    data = urllib.request.urlopen(req).read()
    cached.write_bytes(data)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def recolor_image(img, material, target_palette):
    if not material or not target_palette:
        return img
    mat_map = PALETTES.get(material)
    if not mat_map or target_palette not in mat_map:
        return img
    src_cols = [hex_to_rgb(c) for c in mat_map["base"]]
    dst_cols = [hex_to_rgb(c) for c in mat_map[target_palette]]
    if src_cols == dst_cols:
        return img

    lookup = {}
    for s, d in zip(src_cols, dst_cols):
        lookup[s] = d

    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            key = (r, g, b)
            if key in lookup:
                nr, ng, nb = lookup[key]
                px[x, y] = (nr, ng, nb, a)
            else:
                # Check within tolerance 2 (matching LPC WebGL shader 0.004 * 255)
                for (sr, sg, sb), (nr, ng, nb) in lookup.items():
                    if abs(r - sr) <= 2 and abs(g - sg) <= 2 and abs(b - sb) <= 2:
                        px[x, y] = (nr, ng, nb, a)
                        break
    return out


def extract_lpc_cell(sheet, lpc_row, col):
    """
    Extracts one frame from an LPC sheet (whether 64x64, 128x128, or 192x192 per cell)
    and places it centered onto a 192x192 canvas, then crops the 64x64 character cell.
    """
    w, h = sheet.size
    cell_h = h // 4
    cell_w = cell_h  # LPC cells are square (64, 128, or 192)
    cols = max(1, w // cell_w)
    c = min(col, cols - 1)
    r = min(lpc_row, 3)

    crop = sheet.crop((c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h))
    if cell_w == CELL:
        return crop
    canvas = Image.new("RGBA", (OVER, OVER), (0, 0, 0, 0))
    offset = (OVER - cell_w) // 2
    canvas.alpha_composite(crop, (offset, offset))
    center_off = (OVER - CELL) // 2
    return canvas.crop((center_off, center_off, center_off + CELL, center_off + CELL))


def add_pixel_outline(cell, outline_col=(12, 14, 20, 225)):
    """Adds a clean 1px dark outer outline around non-transparent character pixels."""
    w, h = cell.size
    src = cell.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] > 24:
                continue
            has_neighbor = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 96:
                    has_neighbor = True
                    break
            if has_neighbor:
                dst[x, y] = outline_col
    out.alpha_composite(cell)
    return out


def decorate_three_kingdoms(cell, char_id, g_row, f_idx, is_attack=False):
    """Adds signature Three Kingdoms details inside the 64x64 cell without border clipping."""
    from PIL import ImageDraw
    d = ImageDraw.Draw(cell)
    bob = -1 if f_idx in (1, 3) else 0

    if char_id == "guanyu":
        # Iconic waist-length flowing black beard (visible in down/left/right rows 0, 1, 2)
        if g_row == 0:
            d.polygon([(28, 31 + bob), (35, 31 + bob), (37, 48 + bob), (31, 51 + bob), (26, 47 + bob)], fill=(14, 16, 22, 255))
            d.line([(30, 32 + bob), (31, 49 + bob)], fill=(42, 48, 62, 255), width=1)
            d.line([(33, 32 + bob), (34, 48 + bob)], fill=(42, 48, 62, 255), width=1)
        elif g_row == 1:
            d.polygon([(23, 31 + bob), (29, 31 + bob), (26, 48 + bob), (20, 46 + bob)], fill=(14, 16, 22, 255))
        elif g_row == 2:
            d.polygon([(34, 31 + bob), (40, 31 + bob), (43, 46 + bob), (37, 48 + bob)], fill=(14, 16, 22, 255))
        # Green Dragon Crescent Blade (Guan Dao) — 100% inside 64x64 cell
        if not is_attack:
            sx = 45 if g_row != 1 else 18
            d.line([(sx, 14 + bob), (sx, 56 + bob)], fill=(142, 96, 48, 255), width=2)
            d.polygon([(sx - 3, 18 + bob), (sx + 6, 10 + bob), (sx + 8, 20 + bob), (sx, 23 + bob)], fill=(95, 225, 145, 255), outline=(245, 205, 82, 255))
        else:
            ang_step = f_idx % 4
            bx = 48 if g_row != 1 else 15
            by = 22 + ang_step * 6
            d.line([(32, 38), (bx, by)], fill=(168, 114, 56, 255), width=2)
            d.polygon([(bx - 6, by - 8), (bx + 8, by - 3), (bx + 5, by + 9), (bx - 4, by + 4)], fill=(95, 235, 155, 255), outline=(255, 230, 110, 255))

    elif char_id == "lubu":
        # Iconic twin long crimson-gold pheasant tail plumes on crown
        d.line([(29, 15 + bob), (20, 4 + bob), (13, 9 + bob)], fill=(235, 56, 48, 255), width=2)
        d.line([(34, 15 + bob), (43, 4 + bob), (50, 9 + bob)], fill=(235, 56, 48, 255), width=2)
        d.line([(29, 14 + bob), (21, 5 + bob)], fill=(255, 215, 86, 255), width=1)
        d.line([(34, 14 + bob), (42, 5 + bob)], fill=(255, 215, 86, 255), width=1)
        # Sky Piercer Halberd (Fangtian Huaji) — twin crescent blades + spear tip inside 64x64 cell
        hx = 46 if g_row != 1 else 17
        hy = (16 + bob) if not is_attack else (18 + (f_idx % 4) * 5)
        d.line([(34 if g_row != 1 else 29, 44), (hx, hy)], fill=(178, 132, 62, 255), width=2)
        d.polygon([(hx, hy - 8), (hx - 3, hy + 2), (hx + 3, hy + 2)], fill=(255, 236, 140, 255))
        d.polygon([(hx + 2, hy - 5), (hx + 8, hy - 2), (hx + 8, hy + 6), (hx + 2, hy + 3)], fill=(255, 184, 72, 255))
        d.polygon([(hx - 2, hy - 5), (hx - 7, hy - 2), (hx - 7, hy + 6), (hx - 2, hy + 3)], fill=(255, 184, 72, 255))

    elif char_id == "zhugeliang":
        # Iconic White Crane Feather Fan (Yushan) in hand
        fx = 44 if g_row != 1 else 19
        fy = 34 + bob - (3 if is_attack else 0)
        d.polygon([(fx, fy + 6), (fx - 6, fy - 4), (fx, fy - 7), (fx + 6, fy - 4)], fill=(245, 248, 255, 255), outline=(148, 172, 215, 255))
        d.line([(fx, fy + 8), (fx, fy + 2)], fill=(168, 118, 62, 255), width=2)

    elif char_id == "cavalry":
        # Steppe warhorse head, mane, saddle, and hooves so Cavalry is visibly mounted
        step = (-2, 0, 2, 0)[f_idx % 4]
        d.ellipse((19, 43 + bob, 45, 57 + bob), fill=(122, 74, 42, 255), outline=(58, 34, 18, 255))
        d.polygon([(27, 36 + bob), (37, 36 + bob), (39, 48 + bob), (25, 48 + bob)], fill=(142, 88, 50, 255), outline=(58, 34, 18, 255))
        d.rectangle((29, 39 + bob, 35, 45 + bob), fill=(218, 172, 72, 255))
        for lx in (22 + step, 28 - step, 35 + step, 41 - step):
            d.rectangle((lx, 54, lx + 3, 61), fill=(78, 46, 26, 255))

    elif char_id == "bomber":
        # Jet-black gunpowder bomb with sizzling yellow-orange spark held in hand
        bx, by = 44, 28 + bob
        d.ellipse((bx - 6, by - 6, bx + 6, by + 6), fill=(18, 20, 26, 255), outline=(96, 104, 118, 255))
        d.ellipse((bx - 3, by - 3, bx, by), fill=(156, 168, 185, 255))
        d.line([(bx + 1, by - 6), (bx + 5, by - 10)], fill=(232, 196, 116, 255), width=2)
        d.polygon([(bx + 5, by - 13), (bx + 7, by - 10), (bx + 10, by - 10), (bx + 7, by - 8), (bx + 5, by - 5), (bx + 4, by - 8), (bx + 1, by - 10), (bx + 4, by - 10)], fill=(255, 238, 92, 255))
    elif char_id == "catapult":
        # Wooden & iron wheeled Siege Catapult War Machine with flaming boulder payload
        arm_lift = (0, -3, -6, -2)[f_idx % 4]
        d.ellipse((10, 50, 54, 60), fill=(10, 14, 18, 130))
        # Heavy timber chassis & A-frame struts
        d.rectangle((14, 42, 50, 49), fill=(118, 74, 40, 255), outline=(58, 34, 18, 255))
        d.polygon([(18, 44), (28, 22), (32, 22), (24, 44)], fill=(138, 88, 48, 255), outline=(58, 34, 18, 255))
        d.polygon([(46, 44), (36, 22), (32, 22), (40, 44)], fill=(138, 88, 48, 255), outline=(58, 34, 18, 255))
        d.rectangle((26, 20, 38, 25), fill=(88, 96, 108, 255), outline=(38, 42, 50, 255))
        # Throwing arm + blazing fire-boulder basket
        by = 16 + arm_lift
        d.line([(32, 36), (32, by + 4)], fill=(156, 102, 54, 255), width=4)
        d.ellipse((23, by - 6, 41, by + 10), fill=(68, 46, 28, 255), outline=(38, 24, 14, 255))
        d.ellipse((25, by - 5, 39, by + 8), fill=(218, 72, 32, 255), outline=(255, 196, 72, 255))
        d.ellipse((28, by - 2, 36, by + 5), fill=(255, 232, 110, 255))
        # 4 iron-rimmed spoked wheels
        for wx in (14, 40):
            d.ellipse((wx, 45, wx + 11, 56), fill=(78, 50, 28, 255), outline=(142, 152, 166, 255))
            d.ellipse((wx + 3, 48, wx + 8, 53), fill=(168, 176, 188, 255))

    elif char_id == "firebird":
        # Feather-Storm War Hawk firing glowing crimson & gold feather-bullet darts from the sky
        wing_dy = (-7, 2, 8, 0)[f_idx % 4]
        # Ground shadow far below to emphasize altitude
        d.ellipse((22, 54, 42, 59), fill=(8, 12, 16, 95))
        # Wings
        d.polygon([(30, 24 + bob), (8, 14 + wing_dy), (12, 28 + wing_dy // 2), (28, 29 + bob)], fill=(168, 38, 38, 255), outline=(32, 12, 16, 255))
        d.polygon([(34, 24 + bob), (56, 14 + wing_dy), (52, 28 + wing_dy // 2), (36, 29 + bob)], fill=(168, 38, 38, 255), outline=(32, 12, 16, 255))
        d.line([(12, 18 + wing_dy), (26, 24 + bob)], fill=(255, 184, 68, 255), width=2)
        d.line([(52, 18 + wing_dy), (38, 24 + bob)], fill=(255, 184, 68, 255), width=2)
        # Body & head
        d.ellipse((25, 18 + bob, 39, 33 + bob), fill=(208, 48, 42, 255), outline=(32, 12, 16, 255))
        d.polygon([(28, 15 + bob), (32, 8 + bob), (36, 15 + bob)], fill=(255, 206, 76, 255), outline=(32, 12, 16, 255))
        d.polygon([(30, 31 + bob), (32, 36 + bob), (34, 31 + bob)], fill=(255, 232, 92, 255))
        d.rectangle((29, 21 + bob, 31, 23 + bob), fill=(255, 248, 150, 255))
        d.rectangle((33, 21 + bob, 35, 23 + bob), fill=(255, 248, 150, 255))
        # Fan of 3 glowing feather-bullet darts beneath wings
        for dx, dy in ((-9, 35), (0, 38), (9, 35)):
            qx, qy = 32 + dx, dy + bob
            d.polygon([(qx, qy + 7), (qx - 3, qy), (qx, qy - 2), (qx + 3, qy)], fill=(255, 218, 88, 255), outline=(188, 42, 38, 255))

def build_character_frames(layers_spec, anim, frame_indices, lpc_rows=(2, 1, 3, 0), char_id="", is_attack=False):
    loaded_layers = []
    for item in layers_spec:
        path_tmpl, mat, pal = item[0], item[1], item[2]
        anim_map = item[3] if len(item) > 3 else None
        if isinstance(anim_map, dict):
            if anim not in anim_map or anim_map[anim] is None:
                continue
            use_anim = anim_map[anim]
        else:
            use_anim = anim_map or anim
        rel_path = path_tmpl.format(anim=use_anim)
        sheet = fetch_sheet(rel_path)
        sheet = recolor_image(sheet, mat, pal)
        loaded_layers.append(sheet)

    rows_out = {}
    for g_row, lpc_row in enumerate(lpc_rows):
        row_frames = []
        for i, f_idx in enumerate(frame_indices):
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            for sheet in loaded_layers:
                part = extract_lpc_cell(sheet, lpc_row, f_idx)
                cell.alpha_composite(part)
            decorate_three_kingdoms(cell, char_id, g_row, i, is_attack=is_attack)
            row_frames.append(add_pixel_outline(cell))
        rows_out[g_row] = row_frames
    return rows_out


# 6 Three Kingdoms Heroes: authentic Universal LPC layer recipes
HERO_RECIPES = {
    "guanyu": {
        "attack_anim": "slash",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [1, 2, 3, 4],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("cape/solid/bg/{anim}.png", "cloth", "red"),
            ("body/bodies/male/{anim}.png", "body", "amber"),
            ("legs/pants/male/{anim}.png", "cloth", "green"),
            ("feet/armour/plate/male/{anim}.png", "metal", "gold"),
            ("torso/armour/legion/male/{anim}.png", "metal", "gold"),
            ("torso/jacket/tabard/male/{anim}/green.png", None, None),
            ("shoulders/legion/male/{anim}.png", "metal", "gold"),
            ("arms/bracers/male/{anim}.png", "metal", "gold"),
            ("head/heads/human/male/{anim}.png", "body", "amber"),
            ("head/faces/male/anger/{anim}.png", "body", "amber"),
            ("beards/beard/winter/male/{anim}.png", "hair", "black"),
            ("hat/helmet/legion/adult/{anim}.png", "metal", "gold"),
            ("cape/solid/fg/{anim}.png", "cloth", "red"),
        ],
    },
    "zhangfei": {
        "attack_anim": "thrust",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [2, 3, 4, 5],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("cape/tattered/bg/{anim}.png", "cloth", "maroon"),
            ("body/bodies/male/{anim}.png", "body", "taupe"),
            ("legs/armour/plate/male/{anim}.png", "metal", "iron"),
            ("feet/armour/plate/male/{anim}.png", "metal", "iron"),
            ("torso/armour/plate/male/{anim}.png", "metal", "bronze"),
            ("torso/jacket/tabard/male/{anim}/maroon.png", None, None),
            ("shoulders/pauldrons/male/{anim}.png", "cloth", "red"),
            ("arms/armour/plate/male/{anim}.png", "metal", "iron"),
            ("head/heads/human/male/{anim}.png", "body", "taupe"),
            ("head/faces/male/anger/{anim}.png", "body", "taupe"),
            ("beards/beard/basic/{anim}.png", "hair", "black"),
            ("hair/spiked_porcupine/adult/{anim}.png", "hair", "black"),
            ("hat/headband/thick/adult/{anim}.png", "cloth", "red"),
            ("cape/tattered/fg/{anim}.png", "cloth", "maroon"),
            ("weapon/polearm/spear/foreground/{anim}/red.png", None, None),
        ],
    },
    "zhaoyun": {
        "attack_anim": "shoot",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [3, 5, 7, 8],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("cape/solid/bg/{anim}.png", "cloth", "blue"),
            ("body/bodies/male/{anim}.png", "body", "light"),
            ("legs/armour/plate/male/{anim}.png", "metal", "silver"),
            ("feet/armour/plate/male/{anim}.png", "metal", "silver"),
            ("torso/armour/plate/male/{anim}.png", "metal", "silver"),
            ("torso/jacket/tabard/male/{anim}/blue.png", None, None),
            ("shoulders/legion/male/{anim}.png", "metal", "silver"),
            ("arms/armour/plate/male/{anim}.png", "metal", "silver"),
            ("head/heads/human/male/{anim}.png", "body", "light"),
            ("head/faces/male/neutral/{anim}.png", "body", "light"),
            ("hat/helmet/bascinet/adult/{anim}.png", "metal", "silver"),
            ("cape/solid/fg/{anim}.png", "cloth", "white"),
            ("weapon/ranged/bow/recurve/walk/foreground/silver.png", None, None, {"walk": "walk", "shoot": None}),
            ("weapon/ranged/bow/recurve/universal/foreground/shoot/silver.png", None, None, {"walk": None, "shoot": "shoot"}),
            ("weapon/ranged/bow/arrow/shoot/arrow.png", None, None, {"walk": None, "shoot": "shoot"}),
        ],
    },
    "zhugeliang": {
        "attack_anim": "spellcast",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [1, 3, 4, 5],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("cape/solid/bg/{anim}.png", "cloth", "purple"),
            ("body/bodies/male/{anim}.png", "body", "light"),
            ("legs/pants/male/{anim}.png", "cloth", "navy"),
            ("feet/boots/basic/male/{anim}.png", "cloth", "black"),
            ("torso/clothes/longsleeve/longsleeve/male/{anim}.png", "cloth", "white"),
            ("torso/jacket/frock/male/{anim}/purple.png", None, None),
            ("torso/waist/sash/male/{anim}.png", "cloth", "yellow"),
            ("shoulders/mantal/male/{anim}.png", "cloth", "purple"),
            ("head/heads/human/male/{anim}.png", "body", "light"),
            ("head/faces/male/neutral/{anim}.png", "body", "light"),
            ("beards/mustache/chevron/{anim}.png", "hair", "black"),
            ("hat/cloth/bandana2/adult/{anim}.png", "cloth", "navy"),
            ("cape/solid/fg/{anim}.png", "cloth", "purple"),
            ("weapon/magic/simple/foreground/{anim}/simple.png", None, None),
        ],
    },
    "lubu": {
        "attack_anim": "slash",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [1, 2, 3, 4],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("cape/solid/bg/{anim}.png", "cloth", "red"),
            ("body/bodies/male/{anim}.png", "body", "light"),
            ("legs/armour/plate/male/{anim}.png", "metal", "gold"),
            ("feet/armour/plate/male/{anim}.png", "metal", "gold"),
            ("torso/armour/plate/male/{anim}.png", "metal", "crimson_metal"),
            ("torso/jacket/tabard/male/{anim}/red.png", None, None),
            ("shoulders/legion/male/{anim}.png", "metal", "gold"),
            ("arms/armour/plate/male/{anim}.png", "metal", "gold"),
            ("head/heads/human/male/{anim}.png", "body", "light"),
            ("head/faces/male/anger/{anim}.png", "body", "light"),
            ("hat/helmet/horned/adult/{anim}.png", "metal", "gold"),
            ("cape/solid/fg/{anim}.png", "cloth", "red"),
        ],
    },
    "sunshangxiang": {
        "attack_anim": "slash",
        "walk_frames": [1, 3, 5, 7],
        "attack_frames": [1, 2, 3, 4],
        "layers": [
            ("shadow/adult/{anim}.png", None, None),
            ("hair/high_ponytail/adult/bg/{anim}.png", "hair", "black"),
            ("body/bodies/female/{anim}.png", "body", "light"),
            ("legs/leggings/thin/{anim}.png", "cloth", "red"),
            ("feet/boots/rimmed/thin/{anim}.png", "cloth", "brown"),
            ("torso/armour/leather/female/{anim}.png", "cloth", "red"),
            ("torso/jacket/tabard/female/{anim}/orange.png", None, None),
            ("shoulders/epaulets/thin/{anim}.png", "cloth", "yellow"),
            ("arms/bracers/thin/{anim}.png", "metal", "gold"),
            ("head/heads/human/female/{anim}.png", "body", "light"),
            ("head/faces/female/neutral/{anim}.png", "body", "light"),
            ("hair/high_ponytail/adult/fg/{anim}.png", "hair", "black"),
            ("hat/headband/hairtie/adult/{anim}.png", "cloth", "red"),
            ("weapon/sword/dagger/{anim}/dagger.png", "metal", "gold"),
        ],
    },
}

# 10 Minion & Boss Enemy Types: authentic Universal LPC layer recipes (south-facing walk cycle)
ENEMY_RECIPES = {
    "soldier": [
        ("shadow/adult/{anim}.png", None, None),
        ("body/bodies/male/{anim}.png", "body", "olive"),
        ("legs/pants/male/{anim}.png", "cloth", "brown"),
        ("feet/boots/basic/male/{anim}.png", "cloth", "brown"),
        ("torso/armour/leather/male/{anim}.png", "cloth", "tan"),
        ("torso/waist/sash/male/{anim}.png", "cloth", "yellow"),
        ("head/heads/human/male/{anim}.png", "body", "olive"),
        ("head/faces/male/anger/{anim}.png", "body", "olive"),
        ("hat/cloth/bandana/adult/{anim}.png", "cloth", "yellow"),
        ("weapon/polearm/spear/foreground/{anim}/steel.png", None, None),
    ],
    "archer": [
        ("shadow/adult/{anim}.png", None, None),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/pants/male/{anim}.png", "cloth", "forest"),
        ("feet/boots/basic/male/{anim}.png", "cloth", "leather"),
        ("torso/clothes/longsleeve/longsleeve/male/{anim}.png", "cloth", "forest"),
        ("torso/armour/leather/male/{anim}.png", "cloth", "brown"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("hat/cloth/hood_sack/adult/{anim}.png", "cloth", "forest"),
        ("weapon/ranged/crossbow/foreground/{anim}/crossbow.png", None, None),
    ],
    "cavalry": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/tattered/bg/{anim}.png", "cloth", "orange"),
        ("body/bodies/male/{anim}.png", "body", "bronze"),
        ("legs/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("feet/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("torso/armour/legion/male/{anim}.png", "metal", "bronze"),
        ("shoulders/pauldrons/male/{anim}.png", "cloth", "orange"),
        ("head/heads/human/male/{anim}.png", "body", "bronze"),
        ("head/faces/male/anger/{anim}.png", "body", "bronze"),
        ("hat/helmet/barbarian_viking/adult/{anim}.png", "metal", "bronze"),
        ("cape/tattered/fg/{anim}.png", "cloth", "orange"),
        ("weapon/sword/saber/{anim}/saber.png", None, None),
    ],
    "shield": [
        ("shadow/adult/{anim}.png", None, None),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/armour/plate/male/{anim}.png", "metal", "steel"),
        ("feet/armour/plate/male/{anim}.png", "metal", "steel"),
        ("torso/chainmail/male/{anim}.png", "metal", "steel"),
        ("torso/armour/plate/male/{anim}.png", "metal", "steel"),
        ("shoulders/legion/male/{anim}.png", "metal", "steel"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("hat/helmet/greathelm/male/{anim}.png", "metal", "steel"),
        ("shield/spartan/fg/{anim}/spartan.png", "metal", "steel"),
        ("weapon/sword/longsword/{anim}/longsword.png", None, None),
    ],
    "assassin": [
        ("shadow/adult/{anim}.png", None, None),
        ("body/bodies/male/{anim}.png", "body", "taupe"),
        ("legs/pants/male/{anim}.png", "cloth", "black"),
        ("feet/boots/basic/male/{anim}.png", "cloth", "charcoal"),
        ("torso/clothes/longsleeve/longsleeve/male/{anim}.png", "cloth", "charcoal"),
        ("torso/jacket/tabard/male/{anim}/maroon.png", None, None),
        ("head/heads/human/male/{anim}.png", "body", "taupe"),
        ("facial/masks/plain/adult/{anim}.png", "cloth", "black"),
        ("hat/cloth/hood/adult/{anim}.png", "cloth", "maroon"),
        ("weapon/sword/dagger/{anim}/dagger.png", "metal", "crimson_metal"),
    ],
    "bomber": [
        ("shadow/adult/{anim}.png", None, None),
        ("body/bodies/male/{anim}.png", "body", "amber"),
        ("legs/pants/male/{anim}.png", "cloth", "maroon"),
        ("feet/boots/basic/male/{anim}.png", "cloth", "brown"),
        ("torso/armour/leather/male/{anim}.png", "cloth", "orange"),
        ("torso/waist/sash/male/{anim}.png", "cloth", "red"),
        ("head/heads/human/male/{anim}.png", "body", "amber"),
        ("head/faces/male/anger/{anim}.png", "body", "amber"),
        ("hair/spiked_porcupine/adult/{anim}.png", "hair", "red"),
        ("hat/headband/thick/adult/{anim}.png", "cloth", "yellow"),
    ],
    "sorcerer": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "purple"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/pants/male/{anim}.png", "cloth", "purple"),
        ("feet/boots/basic/male/{anim}.png", "cloth", "black"),
        ("torso/clothes/longsleeve/longsleeve/male/{anim}.png", "cloth", "lavender"),
        ("torso/jacket/frock/male/{anim}/purple.png", None, None),
        ("shoulders/mantal/male/{anim}.png", "cloth", "purple"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("beards/beard/trimmed/{anim}.png", "hair", "white"),
        ("hat/cloth/hood/adult/{anim}.png", "cloth", "purple"),
        ("cape/solid/fg/{anim}.png", "cloth", "purple"),
        ("weapon/magic/simple/foreground/{anim}/simple.png", None, None),
    ],
    "halberdier": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "red"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/armour/plate/male/{anim}.png", "metal", "gold"),
        ("feet/armour/plate/male/{anim}.png", "metal", "gold"),
        ("torso/armour/plate/male/{anim}.png", "metal", "crimson_metal"),
        ("torso/jacket/tabard/male/{anim}/red.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "gold"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("hat/helmet/armet/adult/{anim}.png", "metal", "gold"),
        ("cape/solid/fg/{anim}.png", "cloth", "red"),
        ("weapon/polearm/halberd/{anim}/halberd.png", "metal", "gold"),
    ],
    "catapult": [],
    "firebird": [],
    "boss_chengyuanzhi": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/tattered/bg/{anim}.png", "cloth", "yellow"),
        ("body/bodies/male/{anim}.png", "body", "olive"),
        ("legs/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("feet/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("torso/armour/legion/male/{anim}.png", "metal", "bronze"),
        ("torso/jacket/tabard/male/{anim}/yellow.png", None, None),
        ("shoulders/pauldrons/male/{anim}.png", "cloth", "orange"),
        ("head/heads/human/male/{anim}.png", "body", "olive"),
        ("head/faces/male/anger/{anim}.png", "body", "olive"),
        ("beards/beard/basic/{anim}.png", "hair", "dark_brown"),
        ("hat/cloth/bandana/adult/{anim}.png", "cloth", "yellow"),
        ("cape/tattered/fg/{anim}.png", "cloth", "yellow"),
        ("weapon/polearm/halberd/{anim}/halberd.png", "metal", "bronze"),
    ],
    "boss_dengmao": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/tattered/bg/{anim}.png", "cloth", "orange"),
        ("body/bodies/male/{anim}.png", "body", "amber"),
        ("legs/armour/plate/male/{anim}.png", "metal", "iron"),
        ("feet/armour/plate/male/{anim}.png", "metal", "iron"),
        ("torso/armour/plate/male/{anim}.png", "metal", "iron"),
        ("torso/jacket/tabard/male/{anim}/orange.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "brass"),
        ("head/heads/human/male/{anim}.png", "body", "amber"),
        ("head/faces/male/anger/{anim}.png", "body", "amber"),
        ("hat/helmet/barbarian_viking/adult/{anim}.png", "metal", "brass"),
        ("cape/tattered/fg/{anim}.png", "cloth", "orange"),
        ("weapon/blunt/mace/{anim}/mace.png", None, None),
    ],
    "elite": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "yellow"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/armour/plate/male/{anim}.png", "metal", "gold"),
        ("feet/armour/plate/male/{anim}.png", "metal", "gold"),
        ("torso/armour/legion/male/{anim}.png", "metal", "gold"),
        ("torso/jacket/tabard/male/{anim}/yellow.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "gold"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("beards/beard/winter/male/{anim}.png", "hair", "gray"),
        ("hat/headband/thick/adult/{anim}.png", "cloth", "yellow"),
        ("cape/solid/fg/{anim}.png", "cloth", "yellow"),
        ("weapon/magic/simple/foreground/{anim}/simple.png", None, None),
    ],
    "boss_huzhen": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "maroon"),
        ("body/bodies/male/{anim}.png", "body", "bronze"),
        ("legs/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("feet/armour/plate/male/{anim}.png", "metal", "bronze"),
        ("torso/armour/legion/male/{anim}.png", "metal", "bronze"),
        ("torso/jacket/tabard/male/{anim}/teal.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "bronze"),
        ("head/heads/human/male/{anim}.png", "body", "bronze"),
        ("hat/helmet/bascinet/adult/{anim}.png", "metal", "bronze"),
        ("cape/solid/fg/{anim}.png", "cloth", "maroon"),
        ("weapon/polearm/spear/foreground/{anim}/gold.png", None, None),
    ],
    "boss_lijue": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "black"),
        ("body/bodies/male/{anim}.png", "body", "taupe"),
        ("legs/armour/plate/male/{anim}.png", "metal", "iron"),
        ("feet/armour/plate/male/{anim}.png", "metal", "iron"),
        ("torso/armour/plate/male/{anim}.png", "metal", "iron"),
        ("torso/jacket/tabard/male/{anim}/maroon.png", None, None),
        ("shoulders/pauldrons/male/{anim}.png", "cloth", "maroon"),
        ("arms/armour/plate/male/{anim}.png", "metal", "iron"),
        ("head/heads/human/male/{anim}.png", "body", "taupe"),
        ("hat/helmet/greathelm/male/{anim}.png", "metal", "crimson_metal"),
        ("cape/solid/fg/{anim}.png", "cloth", "black"),
        ("weapon/sword/longsword/{anim}/longsword.png", None, None),
    ],
    "boss_huaxiong": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "red"),
        ("body/bodies/male/{anim}.png", "body", "taupe"),
        ("legs/armour/plate/male/{anim}.png", "metal", "iron"),
        ("feet/armour/plate/male/{anim}.png", "metal", "iron"),
        ("torso/armour/plate/male/{anim}.png", "metal", "crimson_metal"),
        ("torso/jacket/tabard/male/{anim}/red.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "gold"),
        ("arms/armour/plate/male/{anim}.png", "metal", "iron"),
        ("head/heads/human/male/{anim}.png", "body", "taupe"),
        ("head/faces/male/anger/{anim}.png", "body", "taupe"),
        ("beards/beard/basic/{anim}.png", "hair", "black"),
        ("hat/helmet/barbarian/adult/{anim}.png", "metal", "gold"),
        ("cape/solid/fg/{anim}.png", "cloth", "red"),
        ("weapon/blunt/waraxe/{anim}/waraxe.png", None, None),
    ],
    "boss_caimao": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "white"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/pants/male/{anim}.png", "cloth", "navy"),
        ("feet/armour/plate/male/{anim}.png", "metal", "silver"),
        ("torso/armour/legion/male/{anim}.png", "metal", "silver"),
        ("torso/jacket/tabard/male/{anim}/navy.png", None, None),
        ("shoulders/epaulets/thin/{anim}.png", "cloth", "yellow"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("beards/mustache/chevron/{anim}.png", "hair", "black"),
        ("hat/helmet/legion/adult/{anim}.png", "metal", "silver"),
        ("cape/solid/fg/{anim}.png", "cloth", "white"),
        ("weapon/ranged/crossbow/foreground/{anim}/crossbow.png", None, None),
    ],
    "boss_zhangyun": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "teal"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/armour/plate/male/{anim}.png", "metal", "steel"),
        ("feet/armour/plate/male/{anim}.png", "metal", "steel"),
        ("torso/armour/plate/male/{anim}.png", "metal", "jade"),
        ("torso/jacket/tabard/male/{anim}/teal.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "gold"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("hat/helmet/horned/adult/{anim}.png", "metal", "silver"),
        ("cape/solid/fg/{anim}.png", "cloth", "teal"),
        ("shield/spartan/fg/{anim}/spartan.png", "metal", "silver"),
        ("weapon/polearm/spear/foreground/{anim}/steel.png", None, None),
    ],
    "boss_caoren": [
        ("shadow/adult/{anim}.png", None, None),
        ("cape/solid/bg/{anim}.png", "cloth", "blue"),
        ("body/bodies/male/{anim}.png", "body", "light"),
        ("legs/armour/plate/male/{anim}.png", "metal", "steel"),
        ("feet/armour/plate/male/{anim}.png", "metal", "gold"),
        ("torso/armour/plate/male/{anim}.png", "metal", "steel"),
        ("torso/jacket/tabard/male/{anim}/blue.png", None, None),
        ("shoulders/legion/male/{anim}.png", "metal", "gold"),
        ("arms/armour/plate/male/{anim}.png", "metal", "gold"),
        ("head/heads/human/male/{anim}.png", "body", "light"),
        ("hat/helmet/armet/adult/{anim}.png", "metal", "gold"),
        ("cape/solid/fg/{anim}.png", "cloth", "blue"),
        ("shield/round/{anim}/gold.png", None, None),
        ("weapon/polearm/halberd/{anim}/halberd.png", "metal", "gold"),
    ],
}


def main():
    (OUT_DIR / "heroes").mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "enemies").mkdir(parents=True, exist_ok=True)

    # 1. Generate 6 Hero Sheets (8 cols x 4 rows of 64x64 = 512x256)
    for hero_id, spec in HERO_RECIPES.items():
        walk_rows = build_character_frames(spec["layers"], "walk", spec["walk_frames"], char_id=hero_id, is_attack=False)
        atk_rows = build_character_frames(spec["layers"], spec["attack_anim"], spec["attack_frames"], char_id=hero_id, is_attack=True)
        sheet = Image.new("RGBA", (CELL * 8, CELL * 4), (0, 0, 0, 0))
        for r in range(4):
            for c in range(4):
                sheet.paste(walk_rows[r][c], (c * CELL, r * CELL))
                sheet.paste(atk_rows[r][c], ((4 + c) * CELL, r * CELL))
        out_path = OUT_DIR / "heroes" / f"{hero_id}.png"
        sheet.save(out_path, format="PNG", optimize=True)
        print(f"Saved LPC hero sheet: {out_path.relative_to(ROOT)} ({sheet.size})")

    # 2. Generate 10 Enemy & Boss Sheets (4 cols x 1 row of 64x64 = 256x64) + Combined Atlas (256x640)
    enemy_order = list(ENEMY_RECIPES.keys())
    atlas = Image.new("RGBA", (CELL * 4, CELL * len(enemy_order)), (0, 0, 0, 0))
    for row_idx, enemy_id in enumerate(enemy_order):
        layers = ENEMY_RECIPES[enemy_id]
        # Use south-facing (LPC row 2) walk cycle frames [1, 3, 5, 7]
        rows = build_character_frames(layers, "walk", [1, 3, 5, 7], lpc_rows=(2,), char_id=enemy_id, is_attack=False)
        e_sheet = Image.new("RGBA", (CELL * 4, CELL), (0, 0, 0, 0))
        for c in range(4):
            e_sheet.paste(rows[0][c], (c * CELL, 0))
        e_path = OUT_DIR / "enemies" / f"{enemy_id}.png"
        e_sheet.save(e_path, format="PNG", optimize=True)
        atlas.paste(e_sheet, (0, row_idx * CELL))
        print(f"Saved LPC enemy sheet: {e_path.relative_to(ROOT)} ({e_sheet.size})")

    atlas_path = OUT_DIR / "enemies" / "atlas.png"
    atlas.save(atlas_path, format="PNG", optimize=True)
    print(f"Saved combined LPC enemy atlas: {atlas_path.relative_to(ROOT)} ({atlas.size})")


if __name__ == "__main__":
    main()
