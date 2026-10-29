#!/usr/bin/env python3
"""Process OpenAI media-gen sprite sheets (openai_meteors.png, openai_terrains.png, openai_weapons.png)
into game-ready transparent PNGs, 256x256 terrain tiles, and 32x32 UI weapon icons."""

from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MEDIA_DIR = ROOT / "assets" / "sprites" / "media_gen"
OUT_DIR = ROOT / "assets" / "sprites"


def remove_black_bg(img: Image.Image, threshold: int = 18, clear_interior: bool = True) -> Image.Image:
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
    # Optionally clear any enclosed pure-black pockets (e.g., inside bow strings or ring daggers)
    if clear_interior:
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


def process_mounts():
    src_path = MEDIA_DIR / "openai_mounts.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2
    quads = {
        "mount_elephant": (0, 0, hw, hh),
        "mount_chariot": (hw, 0, w, hh),
        "mount_wolf": (0, hh, hw, h),
        "mount_dragon": (hw, hh, w, h),
    }
    for name, box in quads.items():
        q = remove_black_bg(img.crop(box), threshold=20)
        bbox = q.getbbox()
        if bbox:
            q = q.crop(bbox)
        canvas = Image.new("RGBA", (88, 88), (0, 0, 0, 0))
        scale = min(82 / max(1, q.width), 82 / max(1, q.height))
        nw = max(1, int(round(q.width * scale)))
        nh = max(1, int(round(q.height * scale)))
        resized = q.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((88 - nw) // 2, (88 - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{name}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI War Beast Mount sprite: {out_path.relative_to(ROOT)} ({canvas.size})")


def process_gems_and_forts():
    src_path = MEDIA_DIR / "openai_gems_forts.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    cw, ch = w // 4, h // 2
    fort_names = ["fort_gatehouse", "fort_beacon", "fort_depot", "fort_citadel"]
    for idx, fname in enumerate(fort_names):
        cell = remove_black_bg(img.crop((idx * cw + 4, 4, (idx + 1) * cw - 4, ch - 4)), threshold=20)
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        scale = min(90 / max(1, cell.width), 90 / max(1, cell.height))
        nw = max(1, int(round(cell.width * scale)))
        nh = max(1, int(round(cell.height * scale)))
        resized = cell.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((96 - nw) // 2, (96 - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{fname}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI Destructible Fortress sprite: {out_path.relative_to(ROOT)} ({canvas.size})")

    gem_names = ["gem_fire", "gem_ice", "gem_thunder", "formation_bagua"]
    for idx, gname in enumerate(gem_names):
        cell = remove_black_bg(img.crop((idx * cw + 4, ch + 4, (idx + 1) * cw - 4, h - 4)), threshold=20)
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        size = 84 if gname == "formation_bagua" else 36
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        scale = min((size - 4) / max(1, cell.width), (size - 4) / max(1, cell.height))
        nw = max(1, int(round(cell.width * scale)))
        nh = max(1, int(round(cell.height * scale)))
        resized = cell.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{gname}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI Gem/Formation sprite: {out_path.relative_to(ROOT)} ({canvas.size})")


def make_4frame_from_single(sprite_img: Image.Image) -> Image.Image:
    """Build a 256x64 4-frame animated sheet from a cropped transparent sprite with 4-phase stride/wing bob."""
    sheet = Image.new("RGBA", (256, 64), (0, 0, 0, 0))
    scale = min(60 / max(1, sprite_img.width), 60 / max(1, sprite_img.height))
    bw = max(1, int(round(sprite_img.width * scale)))
    bh = max(1, int(round(sprite_img.height * scale)))
    for f_idx, (dw, dh, dy) in enumerate(((0, 0, 0), (2, -2, -1), (0, 0, 1), (-2, 2, -1))):
        cell = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        nw = max(1, min(62, bw + dw))
        nh = max(1, min(62, bh + dh))
        resized = sprite_img.resize((nw, nh), Image.Resampling.NEAREST)
        cx = (64 - nw) // 2
        cy = max(0, min(64 - nh, (64 - nh) // 2 + dy))
        cell.paste(resized, (cx, cy))
        sheet.paste(cell, (f_idx * 64, 0))
    return sheet


def process_titans():
    atlas_path = OUT_DIR / "enemies" / "atlas.png"
    atlas = Image.open(atlas_path).convert("RGBA") if atlas_path.exists() else None
    # Ensure atlas is 30 rows tall (256 x 1920) so rows 22..25 hold v0.6.0 Titans and rows 26..29 hold v0.7.0 Titans
    if atlas is not None and atlas.height < 30 * 64:
        expanded = Image.new("RGBA", (256, 30 * 64), (0, 0, 0, 0))
        expanded.paste(atlas, (0, 0))
        atlas = expanded
    titan_specs = [
        ("kaiju", MEDIA_DIR / "openai_godzilla.png", 10, 6, False),
        ("ghidorah", MEDIA_DIR / "openai_ghidorah.png", 12, 14, True),
    ]
    for enemy_key, src_path, atlas_row, thresh, clear_int in titan_specs:
        if not src_path.exists():
            continue
        img = Image.open(src_path).convert("RGBA")
        w, h = img.size
        hw, hh = w // 2, h // 2
        boxes = [
            (0, 0, hw, hh),
            (hw, 0, w, hh),
            (0, hh, hw, h),
            (hw, hh, w, h),
        ]
        sheet = Image.new("RGBA", (256, 64), (0, 0, 0, 0))
        for f_idx, box in enumerate(boxes):
            q = remove_black_bg(img.crop(box), threshold=thresh, clear_interior=clear_int)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            cell = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            scale = min(62 / max(1, q.width), 62 / max(1, q.height))
            nw = max(1, int(round(q.width * scale)))
            nh = max(1, int(round(q.height * scale)))
            resized = q.resize((nw, nh), Image.Resampling.NEAREST)
            cell.paste(resized, ((64 - nw) // 2, (64 - nh) // 2))
            sheet.paste(cell, (f_idx * 64, 0))
        out_path = OUT_DIR / "enemies" / f"{enemy_key}.png"
        sheet.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI 4-frame Titan sheet: {out_path.relative_to(ROOT)} ({sheet.size})")
        if atlas is not None:
            atlas.paste((0, 0, 0, 0), (0, atlas_row * 64, 256, (atlas_row + 1) * 64))
            atlas.alpha_composite(sheet, (0, atlas_row * 64))

    # Process 4 New v0.6.0 Titans (mothra=row 22, rodan=row 23, mechagodzilla=row 24, biollante=row 25)
    v060_path = MEDIA_DIR / "openai_titans_v060.png"
    if v060_path.exists():
        img = Image.open(v060_path).convert("RGBA")
        w, h = img.size
        hw, hh = w // 2, h // 2
        new_titans = [
            ("mothra", (0, 0, hw, hh), 22, 12, False),
            ("rodan", (hw, 0, w, hh), 23, 12, False),
            ("mechagodzilla", (0, hh, hw, h), 24, 10, False),
            ("biollante", (hw, hh, w, h), 25, 10, False),
        ]
        for t_key, box, row_idx, thresh, clear_int in new_titans:
            q = remove_black_bg(img.crop(box), threshold=thresh, clear_interior=clear_int)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            sheet = make_4frame_from_single(q)
            out_path = OUT_DIR / "enemies" / f"{t_key}.png"
            sheet.save(out_path, format="PNG", optimize=True)
            print(f"Saved OpenAI v0.6.0 Titan sheet: {out_path.relative_to(ROOT)} ({sheet.size})")
            if atlas is not None:
                atlas.paste((0, 0, 0, 0), (0, row_idx * 64, 256, (row_idx + 1) * 64))
                atlas.alpha_composite(sheet, (0, row_idx * 64))

    # Process 4 New v0.7.0 Mythic Titans (gamera=row 26, king_kong=row 27, destoroyah=row 28, gigan=row 29)
    v070_path = MEDIA_DIR / "openai_titans_v070.png"
    if v070_path.exists():
        img = Image.open(v070_path).convert("RGBA")
        w, h = img.size
        hw, hh = w // 2, h // 2
        v070_titans = [
            ("gamera", (0, 0, hw, hh), 26, 10, False),
            ("king_kong", (hw, 0, w, hh), 27, 10, False),
            ("destoroyah", (0, hh, hw, h), 28, 10, False),
            ("gigan", (hw, hh, w, h), 29, 10, False),
        ]
        for t_key, box, row_idx, thresh, clear_int in v070_titans:
            q = remove_black_bg(img.crop(box), threshold=thresh, clear_interior=clear_int)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            sheet = make_4frame_from_single(q)
            out_path = OUT_DIR / "enemies" / f"{t_key}.png"
            sheet.save(out_path, format="PNG", optimize=True)
            print(f"Saved OpenAI v0.7.0 Titan sheet: {out_path.relative_to(ROOT)} ({sheet.size})")
            if atlas is not None:
                atlas.paste((0, 0, 0, 0), (0, row_idx * 64, 256, (row_idx + 1) * 64))
                atlas.alpha_composite(sheet, (0, row_idx * 64))

    # Process 3 Guardians + Cosmic UFO (openai_guardians_ufo.png)
    g_path = MEDIA_DIR / "openai_guardians_ufo.png"
    if g_path.exists():
        img = Image.open(g_path).convert("RGBA")
        w, h = img.size
        hw, hh = w // 2, h // 2
        g_quads = [
            ("ultraman", (0, 0, hw, hh), True),
            ("guardian_mecha", (hw, 0, w, hh), False),
            ("guardian_dragon", (0, hh, hw, h), False),
            ("ufo", (hw, hh, w, h), True),
        ]
        for g_key, box, is_sheet in g_quads:
            q = remove_black_bg(img.crop(box), threshold=12, clear_interior=False)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            sheet = make_4frame_from_single(q)
            if g_key == "ufo":
                ufo_path = OUT_DIR / "enemies" / "ufo.png"
                sheet.save(ufo_path, format="PNG", optimize=True)
                if atlas is not None:
                    atlas.paste((0, 0, 0, 0), (0, 11 * 64, 256, 12 * 64))
                    atlas.alpha_composite(sheet, (0, 11 * 64))
                print(f"Saved OpenAI 4-frame Cosmic UFO sheet: {ufo_path.relative_to(ROOT)} ({sheet.size})")
            elif g_key == "ultraman":
                u_path = OUT_DIR / "effects" / "ultraman.png"
                sheet.save(u_path, format="PNG", optimize=True)
                print(f"Saved OpenAI 4-frame Ultraman Guardian sheet: {u_path.relative_to(ROOT)} ({sheet.size})")
            else:
                g_out = OUT_DIR / "effects" / f"{g_key}.png"
                sheet.save(g_out, format="PNG", optimize=True)
                print(f"Saved OpenAI 4-frame Guardian sheet: {g_out.relative_to(ROOT)} ({sheet.size})")

    if atlas is not None:
        atlas.save(atlas_path, format="PNG", optimize=True)
        print(f"Updated combined enemy atlas with all 6 Titans + UFO: {atlas_path.relative_to(ROOT)} ({atlas.size})")


def process_gear_and_stratagems():
    src_path = MEDIA_DIR / "openai_gear_stratagems.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    cw, ch = w // 4, h // 2
    names = [
        "gear_helm", "gear_armor", "gear_sword", "gear_scroll",
        "gear_boots", "gear_pendant", "stratagem_seal", "tiger_tally",
    ]
    for idx, name in enumerate(names):
        col = idx % 4
        row = idx // 4
        cell = remove_black_bg(img.crop((col * cw + 4, row * ch + 4, (col + 1) * cw - 4, (row + 1) * ch - 4)), threshold=16, clear_interior=True)
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        scale = min(44 / max(1, cell.width), 44 / max(1, cell.height))
        nw = max(1, int(round(cell.width * scale)))
        nh = max(1, int(round(cell.height * scale)))
        resized = cell.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((48 - nw) // 2, (48 - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{name}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI Heirloom Gear/Stratagem sprite: {out_path.relative_to(ROOT)} ({canvas.size})")

def process_npcs_and_banners():
    src_path = MEDIA_DIR / "openai_npcs_banners.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2
    quads = {
        "npc_merchant": (0, 0, hw, hh),
        "npc_blacksmith": (hw, 0, w, hh),
        "npc_sage": (0, hh, hw, h),
        "allied_banner": (hw, hh, w, h),
    }
    for name, box in quads.items():
        q = remove_black_bg(img.crop(box), threshold=14, clear_interior=False)
        bbox = q.getbbox()
        if bbox:
            q = q.crop(bbox)
        canvas = Image.new("RGBA", (88, 88), (0, 0, 0, 0))
        scale = min(82 / max(1, q.width), 82 / max(1, q.height))
        nw = max(1, int(round(q.width * scale)))
        nh = max(1, int(round(q.height * scale)))
        resized = q.resize((nw, nh), Image.Resampling.NEAREST)
        canvas.paste(resized, ((88 - nw) // 2, (88 - nh) // 2))
        out_path = OUT_DIR / "effects" / f"{name}.png"
        canvas.save(out_path, format="PNG", optimize=True)
        print(f"Saved OpenAI NPC/Banner sprite: {out_path.relative_to(ROOT)} ({canvas.size})")


def process_pets_v070():
    src_path = MEDIA_DIR / "openai_pets_v070.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    hw, hh = w // 2, h // 2
    pet_boxes = [
        ("redhare", (0, 0, hw, hh)),
        ("vermilion", (hw, 0, w, hh)),
        ("white_tiger", (0, hh, hw, h)),
        ("qilin", (hw, hh, w, h)),
    ]
    pets_sheet = Image.new("RGBA", (32 * 4, 32 * 4), (0, 0, 0, 0))
    for r_idx, (pid, box) in enumerate(pet_boxes):
        q = remove_black_bg(img.crop(box), threshold=14, clear_interior=False)
        bbox = q.getbbox()
        if bbox:
            q = q.crop(bbox)
        scale = min(30 / max(1, q.width), 30 / max(1, q.height))
        bw = max(1, int(round(q.width * scale)))
        bh = max(1, int(round(q.height * scale)))
        for f_idx, (dw, dh, dy) in enumerate(((0, 0, 0), (1, -1, -1), (0, 0, 1), (-1, 1, -1))):
            cell = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            nw = max(1, min(31, bw + dw))
            nh = max(1, min(31, bh + dh))
            resized = q.resize((nw, nh), Image.Resampling.NEAREST)
            cx = (32 - nw) // 2
            cy = max(0, min(32 - nh, (32 - nh) // 2 + dy))
            cell.paste(resized, (cx, cy))
            pets_sheet.paste(cell, (f_idx * 32, r_idx * 32))
    out_path = OUT_DIR / "pets" / "pets.png"
    pets_sheet.save(out_path, format="PNG", optimize=True)
    print(f"Saved OpenAI 4x4 Mythic Pets sheet: {out_path.relative_to(ROOT)} ({pets_sheet.size})")


def process_heroes_v070():
    batches = [
        (MEDIA_DIR / "openai_heroes_shu.png", ["guanyu", "zhangfei", "zhaoyun", "zhugeliang", "lubu", "sunshangxiang"]),
        (MEDIA_DIR / "openai_heroes_legends.png", ["caocao", "zhouyu", "diaochan", "machao", "simayi", "menghuo"]),
        (MEDIA_DIR / "openai_heroes_mythic.png", ["liubei", "huangzhong", "ganning", "zhurong", "zuoci", "wukong"]),
    ]
    for src_path, hero_ids in batches:
        if not src_path.exists():
            continue
        img = Image.open(src_path).convert("RGBA")
        w, h = img.size
        cw, ch = w // 3, h // 2
        for idx, hid in enumerate(hero_ids):
            col = idx % 3
            row = idx // 3
            q = remove_black_bg(img.crop((col * cw + 6, row * ch + 6, (col + 1) * cw - 6, (row + 1) * ch - 6)), threshold=12, clear_interior=False)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            scale = min(58 / max(1, q.width), 58 / max(1, q.height))
            bw = max(1, int(round(q.width * scale)))
            bh = max(1, int(round(q.height * scale)))
            base_spr = q.resize((bw, bh), Image.Resampling.NEAREST)
            flipped_spr = base_spr.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

            # Build 512x256 sheet (8 cols x 4 rows of 64x64: cols 0..3 = walk, cols 4..7 = attack)
            sheet = Image.new("RGBA", (512, 256), (0, 0, 0, 0))
            for dir_row in range(4):
                spr = flipped_spr if dir_row == 1 else base_spr
                for f_idx, (dx, dy, dw, dh) in enumerate(((0, 0, 0, 0), (0, -2, 1, -1), (0, 0, 0, 0), (0, -1, -1, 1))):
                    cell = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
                    nw = max(1, min(62, bw + dw))
                    nh = max(1, min(62, bh + dh))
                    frame_img = spr.resize((nw, nh), Image.Resampling.NEAREST)
                    cx = max(0, min(64 - nw, (64 - nw) // 2 + dx))
                    cy = max(0, min(64 - nh, (64 - nh) // 2 + dy))
                    cell.paste(frame_img, (cx, cy))
                    sheet.paste(cell, (f_idx * 64, dir_row * 64))
                lunge_sign = -1 if dir_row == 1 else 1
                for a_idx, (lx, ly, rot) in enumerate(((2, -1, -6), (5, -2, 8), (4, 0, 12), (1, 0, 4))):
                    cell = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
                    rotated = spr.rotate(rot * (-lunge_sign), resample=Image.Resampling.NEAREST, expand=False)
                    cx = max(0, min(64 - bw, (64 - bw) // 2 + lx * lunge_sign))
                    cy = max(0, min(64 - bh, (64 - bh) // 2 + ly))
                    cell.paste(rotated, (cx, cy))
                    sheet.paste(cell, ((4 + a_idx) * 64, dir_row * 64))

            out_path = OUT_DIR / "heroes" / f"{hid}.png"
            sheet.save(out_path, format="PNG", optimize=True)
            print(f"Saved OpenAI 512x256 Hero sheet: {out_path.relative_to(ROOT)} ({sheet.size})")


def process_minions_and_bosses_v080():
    atlas_path = OUT_DIR / "enemies" / "atlas.png"
    atlas = Image.open(atlas_path).convert("RGBA") if atlas_path.exists() else None
    batches = [
        (
            MEDIA_DIR / "openai_minions_v080.png",
            [
                ("soldier", 0), ("archer", 1), ("cavalry", 2),
                ("shield", 3), ("assassin", 4), ("bomber", 5),
                ("sorcerer", 6), ("halberdier", 7), ("catapult", 8),
            ],
        ),
        (
            MEDIA_DIR / "openai_bosses_v080.png",
            [
                ("boss_chengyuanzhi", 13), ("boss_dengmao", 14), ("elite", 15),
                ("boss_huzhen", 16), ("boss_lijue", 17), ("boss_huaxiong", 18),
                ("boss_caimao", 19), ("boss_zhangyun", 20), ("boss_caoren", 21),
            ],
        ),
    ]
    for src_path, entries in batches:
        if not src_path.exists():
            continue
        img = Image.open(src_path).convert("RGBA")
        w, h = img.size
        cw, ch = w // 3, h // 3
        for idx, (e_key, row_idx) in enumerate(entries):
            col = idx % 3
            row = idx // 3
            q = remove_black_bg(img.crop((col * cw + 4, row * ch + 4, (col + 1) * cw - 4, (row + 1) * ch - 4)), threshold=10, clear_interior=False)
            bbox = q.getbbox()
            if bbox:
                q = q.crop(bbox)
            sheet = make_4frame_from_single(q)
            out_path = OUT_DIR / "enemies" / f"{e_key}.png"
            sheet.save(out_path, format="PNG", optimize=True)
            if atlas is not None:
                atlas.paste((0, 0, 0, 0), (0, row_idx * 64, 256, (row_idx + 1) * 64))
                atlas.alpha_composite(sheet, (0, row_idx * 64))
            print(f"Saved OpenAI v0.8.0 Enemy/Boss sheet: {out_path.relative_to(ROOT)} (row {row_idx})")

    if atlas is not None:
        atlas.save(atlas_path, format="PNG", optimize=True)


def tint_season(img: Image.Image, season: str) -> Image.Image:
    """Apply subtle seasonal color grading for spring, summer, autumn, and winter prop rows."""
    if season == "spring":
        return img
    rgba = img.copy()
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if season == "summer":
                r = min(255, int(r * 0.94))
                g = min(255, int(g * 1.12))
                b = min(255, int(b * 0.92))
            elif season == "autumn":
                r = min(255, int(r * 1.18))
                g = min(255, int(g * 0.92))
                b = min(255, int(b * 0.78))
            elif season == "winter":
                avg = (r + g + b) // 3
                r = min(255, int(r * 0.65 + avg * 0.35 + 24))
                g = min(255, int(g * 0.72 + avg * 0.35 + 32))
                b = min(255, int(b * 0.85 + avg * 0.35 + 48))
            px[x, y] = (r, g, b, a)
    return rgba


def process_props_v080():
    src_path = MEDIA_DIR / "openai_props_v080.png"
    if not src_path.exists():
        return
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    cw, ch = w // 4, h // 3
    prop_ids = ["tree", "pine", "rock", "grass", "mountain", "banner", "house", "watchtower", "castle", "tent"]
    seasons = ["spring", "summer", "autumn", "winter"]
    props_sheet = Image.new("RGBA", (48 * 10, 48 * 4), (0, 0, 0, 0))

    for idx, pid in enumerate(prop_ids):
        col = idx % 4
        row = idx // 4
        q = remove_black_bg(img.crop((col * cw + 4, row * ch + 4, (col + 1) * cw - 4, (row + 1) * ch - 4)), threshold=12, clear_interior=False)
        bbox = q.getbbox()
        if bbox:
            q = q.crop(bbox)
        cell = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        scale = min(46 / max(1, q.width), 46 / max(1, q.height))
        nw = max(1, int(round(q.width * scale)))
        nh = max(1, int(round(q.height * scale)))
        resized = q.resize((nw, nh), Image.Resampling.NEAREST)
        cell.paste(resized, ((48 - nw) // 2, (48 - nh) // 2))
        for s_idx, s_name in enumerate(seasons):
            props_sheet.paste(tint_season(cell, s_name), (idx * 48, s_idx * 48))

    props_out = OUT_DIR / "terrain" / "props.png"
    props_sheet.save(props_out, format="PNG", optimize=True)
    print(f"Saved OpenAI 10x4 Seasonal Props & Buildings atlas: {props_out.relative_to(ROOT)} ({props_sheet.size})")

    # Cell 10 (col=2, row=2): firebird (Feather-Storm War Hawk -> row 9 of atlas.png)
    fb_q = remove_black_bg(img.crop((2 * cw + 4, 2 * ch + 4, 3 * cw - 4, 3 * ch - 4)), threshold=12, clear_interior=False)
    if fb_q.getbbox():
        fb_q = fb_q.crop(fb_q.getbbox())
    fb_sheet = make_4frame_from_single(fb_q)
    fb_path = OUT_DIR / "enemies" / "firebird.png"
    fb_sheet.save(fb_path, format="PNG", optimize=True)
    atlas_path = OUT_DIR / "enemies" / "atlas.png"
    if atlas_path.exists():
        atlas = Image.open(atlas_path).convert("RGBA")
        atlas.paste((0, 0, 0, 0), (0, 9 * 64, 256, 10 * 64))
        atlas.alpha_composite(fb_sheet, (0, 9 * 64))
        atlas.save(atlas_path, format="PNG", optimize=True)
    print(f"Saved OpenAI Feather-Storm Hawk sheet: {fb_path.relative_to(ROOT)} ({fb_sheet.size})")

    # Cell 11 (col=3, row=2): titan_core (Primordial Titan Core pickup -> 48x48 effects/titan_core.png)
    tc_q = remove_black_bg(img.crop((3 * cw + 4, 2 * ch + 4, 4 * cw - 4, 3 * ch - 4)), threshold=12, clear_interior=False)
    if tc_q.getbbox():
        tc_q = tc_q.crop(tc_q.getbbox())
    tc_canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    tc_scale = min(44 / max(1, tc_q.width), 44 / max(1, tc_q.height))
    tw = max(1, int(round(tc_q.width * tc_scale)))
    th = max(1, int(round(tc_q.height * tc_scale)))
    tc_canvas.paste(tc_q.resize((tw, th), Image.Resampling.NEAREST), ((48 - tw) // 2, (48 - th) // 2))
    tc_path = OUT_DIR / "effects" / "titan_core.png"
    tc_canvas.save(tc_path, format="PNG", optimize=True)
    print(f"Saved OpenAI Primordial Titan Core sprite: {tc_path.relative_to(ROOT)} ({tc_canvas.size})")


if __name__ == "__main__":
    process_terrains()
    process_meteors()
    process_weapons()
    process_mounts()
    process_gems_and_forts()
    process_titans()
    process_gear_and_stratagems()
    process_npcs_and_banners()
    process_pets_v070()
    process_heroes_v070()
    process_minions_and_bosses_v080()
    process_props_v080()
