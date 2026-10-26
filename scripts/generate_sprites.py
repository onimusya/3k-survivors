#!/usr/bin/env python3
"""Deterministically generate the original pixel-art sprite set for 3K Survivors.

The artwork is drawn from primitives at a deliberately low resolution.  No
external artwork or reference images are used by this generator.
"""

from pathlib import Path
from math import sin, pi, sqrt
import random

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sprites"

OUTLINE = (14, 16, 22, 255)
SHADOW = (0, 0, 0, 88)
WHITE = (232, 226, 202, 255)
SKIN = (222, 151, 105, 255)
SKIN_DARK = (157, 91, 65, 255)

HERO_CELL = (32, 40)
HERO_WALK_FRAMES = 4
HERO_ATTACK_FRAMES = 4
HERO_COLS = HERO_WALK_FRAMES + HERO_ATTACK_FRAMES
HERO_ROWS = 4
ENEMY_CELL = (32, 32)
ENEMY_COLS = 4
ENEMY_ROWS = 1


def polygon(draw, points, fill, outline=OUTLINE, width=1):
    if outline:
        expanded = []
        cx = sum(p[0] for p in points) / len(points)
        cy = sum(p[1] for p in points) / len(points)
        for x, y in points:
            expanded.append((round(cx + (x - cx) * 1.10), round(cy + (y - cy) * 1.10)))
        draw.polygon(expanded, fill=outline)
    draw.polygon(points, fill=fill)


def rect(draw, box, fill, outline=OUTLINE, width=1):
    draw.rectangle(box, fill=fill, outline=outline, width=width)


def ellipse(draw, box, fill, outline=OUTLINE, width=1):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def line(draw, points, fill, width=1):
    draw.line(points, fill=fill, width=width)


def save(image, relative):
    path = OUT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def hero_frame(spec, direction, frame, attacking=False):
    """Draw a readable warrior with distinct walk and attack poses."""
    image = Image.new("RGBA", HERO_CELL, (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    cloth, accent, trim, hair = spec["cloth"], spec["accent"], spec["trim"], spec["hair"]
    walk_frame = frame % HERO_WALK_FRAMES
    phase = (0, 1, 0, -1)[walk_frame]
    bob = (0, -1, 0, 0)[walk_frame]
    if attacking:
        phase = (0, 1, 1, -1)[walk_frame]
        bob = (0, -1, -1, 0)[walk_frame]
    side = direction in (1, 2)
    back = direction == 3

    # Contact shadow, kept inside the transparent cell.
    ellipse(d, (7, 34, 25, 39), SHADOW, outline=None)

    # Legs and boots alternate with the walk cycle.
    if side:
        stride = (0, 4, 0, -4)[walk_frame]
        leg_a = [(10, 25), (7 + stride, 33), (12 + stride, 34), (15, 25)]
        leg_b = [(18, 25), (21 - stride, 33), (16 - stride, 34), (20, 25)]
        if direction == 2:
            leg_a = [(22 - (x - 7), y) for x, y in leg_a]
            leg_b = [(22 - (x - 7), y) for x, y in leg_b]
    else:
        stride = (0, 4, 0, -4)[walk_frame]
        leg_a = [(10, 25), (8 + stride, 33), (13 + stride, 34), (14, 25)]
        leg_b = [(18, 25), (20 - stride, 33), (15 - stride, 34), (20, 25)]
    polygon(d, leg_a, cloth)
    polygon(d, leg_b, cloth)
    rect(d, (9 + phase, 33, 15 + phase, 36), trim)
    rect(d, (17 - phase, 33, 23 - phase, 36), trim)

    # Torso and shoulder plates.
    body_y = 13 + bob
    polygon(d, [(9, body_y), (14, body_y - 2), (19, body_y - 2), (23, body_y), (21, 27), (10, 27)], cloth)
    rect(d, (12, body_y + 4, 20, body_y + 10), accent)
    line(d, [(10, body_y + 3), (14, body_y + 6), (14, body_y + 11)], trim)
    line(d, [(22, body_y + 3), (18, body_y + 6), (18, body_y + 11)], trim)

    # Arms. Side poses shift the weapon arm to read clearly in silhouette.
    if side:
        arm_x = 9 if direction == 1 else 21
        hand_x = arm_x + (-4 if direction == 1 else 4)
        if attacking:
            hand_x = 3 if direction == 1 else 29
        polygon(d, [(arm_x, body_y + 3), (hand_x, body_y + 7 + phase), (hand_x + 2, body_y + 10 + phase), (arm_x + 3, body_y + 7)], cloth)
    else:
        left_hand = (5, body_y + 9 + phase)
        right_hand = (27, body_y + 9 - phase)
        if attacking:
            left_hand = (3, body_y + 5)
            right_hand = (29, body_y + 4)
        polygon(d, [(8, body_y + 3), left_hand, (left_hand[0] + 3, left_hand[1] + 2), (11, body_y + 5)], cloth)
        polygon(d, [(24, body_y + 3), right_hand, (right_hand[0] - 3, right_hand[1] + 2), (21, body_y + 5)], cloth)

    # Head, hair/headgear, and face.
    head_y = 5 + bob
    if side:
        # A narrow profile, protruding nose and one eye make left/right rows
        # unmistakable even at the game's native scale.
        rear = 20 if direction == 1 else 12
        front = 11 if direction == 1 else 21
        nose = 9 if direction == 1 else 23
        polygon(d, [(rear, head_y + 1), (front, head_y + 2), (front, head_y + 10), (rear, head_y + 12)], SKIN)
        polygon(d, [(nose, head_y + 5), (front + (2 if direction == 1 else -2), head_y + 7), (front, head_y + 9)], SKIN)
        polygon(d, [(rear - 1, head_y), (rear + 4, head_y - 2), (front, head_y + 1), (rear, head_y + 4)], hair)
    else:
        ellipse(d, (10, head_y, 22, head_y + 12), SKIN if not back else hair)
    if spec.get("helmet"):
        if side:
            polygon(d, [(rear - 1, head_y + 2), (rear + 3, head_y - 1), (front, head_y + 1), (front, head_y + 4), (rear, head_y + 5)], trim)
        else:
            polygon(d, [(9, head_y + 3), (12, head_y - 1), (20, head_y - 1), (23, head_y + 3), (21, head_y + 6), (11, head_y + 6)], trim)
        if spec.get("plume"):
            polygon(d, [(14, head_y - 1), (16, head_y - 6), (19, head_y - 1)], accent)
    elif not spec.get("helmet"):
        polygon(d, [(9, head_y + 2), (12, head_y - 2), (21, head_y - 1), (24, head_y + 4), (20, head_y + 3), (11, head_y + 4)], hair)
    if not back:
        if side:
            eye_x = 15 if direction == 1 else 16
            rect(d, (eye_x, head_y + 6, eye_x + 1, head_y + 7), WHITE, outline=None)
        else:
            rect(d, (12, head_y + 6, 13, head_y + 7), WHITE, outline=None)
            rect(d, (19, head_y + 6, 20, head_y + 7), WHITE, outline=None)

    # Signature silhouette details.
    if spec.get("beard"):
        polygon(d, [(12, head_y + 8), (16, head_y + 11), (20, head_y + 8), (19, head_y + 16), (16, head_y + 19), (13, head_y + 16)], spec["beard"])
    if spec.get("fan"):
        if attacking:
            if direction == 1:
                fan = [(4, body_y + 8), (0, body_y + 1), (5, body_y + 12)]
            elif direction == 2:
                fan = [(27, body_y + 8), (32, body_y + 1), (27, body_y + 12)]
            else:
                fan = [(23, body_y + 8), (30, body_y + 1), (31, body_y + 13), (24, body_y + 12)]
        else:
            fan = [(24, body_y + 8), (29, body_y + 4), (30, body_y + 10), (25, body_y + 12)]
        polygon(d, fan, WHITE)
        line(d, [(fan[0][0], body_y + 9), (fan[1][0], body_y + 7)], trim)
    if spec.get("bow"):
        if attacking and side:
            arrow_y = 17 + bob
            if direction == 1:
                line(d, [(1, arrow_y), (25, arrow_y - 1)], trim, width=2)
                polygon(d, [(1, arrow_y - 2), (1, arrow_y + 2), (5, arrow_y)], WHITE)
            else:
                line(d, [(7, arrow_y), (31, arrow_y - 1)], trim, width=2)
                polygon(d, [(31, arrow_y - 2), (31, arrow_y + 2), (27, arrow_y)], WHITE)
        elif direction == 1:
            d.arc((1, 11 + bob, 10, 25 + bob), 270, 90, fill=trim, width=2)
            line(d, [(6, 12 + bob), (6, 24 + bob)], WHITE)
        else:
            d.arc((22, 11 + bob, 31, 25 + bob), 270, 90, fill=trim, width=2)
            line(d, [(27, 12 + bob), (27, 24 + bob)], WHITE)
    if spec.get("spear"):
        if attacking and side:
            spear_y = 17 + bob
            if direction == 1:
                line(d, [(1, spear_y), (27, spear_y - 1)], (115, 75, 42, 255), width=2)
                polygon(d, [(1, spear_y - 3), (1, spear_y + 3), (6, spear_y)], trim)
            else:
                line(d, [(5, spear_y), (31, spear_y - 1)], (115, 75, 42, 255), width=2)
                polygon(d, [(31, spear_y - 3), (31, spear_y + 3), (26, spear_y)], trim)
        else:
            sx = 7 if side and direction == 1 else (25 if not side else 24)
            line(d, [(sx, 7 + bob), (sx, 31 + bob)], (115, 75, 42, 255), width=2)
            polygon(d, [(sx, 3 + bob), (sx - 2, 9 + bob), (sx + 2, 9 + bob)], trim)
    if spec.get("halberd"):
        if attacking and side:
            pole_y = 17 + bob
            if direction == 1:
                line(d, [(1, pole_y), (29, pole_y - 1)], (111, 72, 39, 255), width=2)
                polygon(d, [(1, pole_y - 4), (1, pole_y + 4), (7, pole_y)], trim)
                polygon(d, [(4, pole_y - 3), (9, pole_y - 1), (4, pole_y + 1)], accent)
            else:
                line(d, [(3, pole_y), (31, pole_y - 1)], (111, 72, 39, 255), width=2)
                polygon(d, [(31, pole_y - 4), (31, pole_y + 4), (25, pole_y)], trim)
                polygon(d, [(28, pole_y - 3), (23, pole_y - 1), (28, pole_y + 1)], accent)
        else:
            sx = 7 if side and direction == 1 else (25 if not side else 24)
            line(d, [(sx, 6 + bob), (sx, 32 + bob)], (111, 72, 39, 255), width=2)
            polygon(d, [(sx, 2 + bob), (sx - 4, 8 + bob), (sx + 1, 9 + bob)], trim)
            polygon(d, [(sx, 5 + bob), (sx + 4, 8 + bob), (sx, 10 + bob)], accent)
    if spec.get("daggers"):
        for yy, off in ((11, 1), (15, -1)):
            xx = (5 if not side else 8) + off if direction != 1 else (27 - off)
            if attacking:
                if direction == 1:
                    line(d, [(6, body_y + yy), (1, body_y + yy - 3)], trim, width=2)
                elif direction == 2:
                    line(d, [(26, body_y + yy), (31, body_y + yy - 3)], trim, width=2)
                else:
                    line(d, [(xx, body_y + yy), (xx + (4 if direction == 0 else -4), body_y + yy - 4)], trim, width=2)
            else:
                line(d, [(xx, body_y + yy), (xx + 3, body_y + yy - 2)], trim, width=2)
    if spec.get("blade"):
        if attacking and side:
            if direction == 1:
                line(d, [(16, body_y + 6), (1, body_y - 2)], trim, width=3)
                line(d, [(14, body_y + 9), (3, body_y + 2)], (255, 240, 187, 180), width=1)
            else:
                line(d, [(16, body_y + 6), (31, body_y - 2)], trim, width=3)
                line(d, [(18, body_y + 9), (29, body_y + 2)], (255, 240, 187, 180), width=1)
        else:
            xx = 7 if side and direction == 1 else (24 if not side else 24)
            line(d, [(xx, body_y + 8), (xx + 3, body_y - 1)], trim, width=2)
            polygon(d, [(xx + 2, body_y - 3), (xx + 6, body_y + 6), (xx + 2, body_y + 8)], accent)
    return image


def make_hero_sheet(spec):
    sheet = Image.new("RGBA", (HERO_CELL[0] * HERO_COLS, HERO_CELL[1] * HERO_ROWS), (0, 0, 0, 0))
    for direction in range(HERO_ROWS):
        for frame in range(HERO_COLS):
            attacking = frame >= HERO_WALK_FRAMES
            sheet.paste(hero_frame(spec, direction, frame, attacking), (frame * HERO_CELL[0], direction * HERO_CELL[1]))
    return sheet


def enemy_frame(kind, frame):
    image = Image.new("RGBA", ENEMY_CELL, (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    phase = (0, 1, 0, -1)[frame]
    bob = (0, -1, 0, 0)[frame]
    ellipse(d, (5, 27, 27, 31), SHADOW, outline=None)

    if kind == "soldier":
        # Blue-grey helmet, red plume, spear, and a layered lamellar chest.
        polygon(d, [(11, 25), (10 + phase, 29), (15 + phase, 29), (15, 24)], (48, 55, 70, 255))
        polygon(d, [(17, 24), (20 - phase, 29), (25 - phase, 29), (21, 25)], (48, 55, 70, 255))
        polygon(d, [(9, 13 + bob), (15, 10 + bob), (22, 12 + bob), (23, 24), (16, 27), (8, 23)], (73, 88, 112, 255))
        for yy in range(14, 23, 3):
            line(d, [(10, yy + bob), (22, yy + bob)], (182, 78, 62, 255))
        ellipse(d, (11, 4 + bob, 22, 16 + bob), SKIN)
        polygon(d, [(9, 8 + bob), (12, 2 + bob), (20, 3 + bob), (23, 9 + bob)], (58, 73, 99, 255))
        polygon(d, [(13, 2 + bob), (15, 0 + bob), (19, 4 + bob)], (177, 61, 54, 255))
        line(d, [(27, 5 + bob), (27, 29 + bob)], (104, 73, 43, 255), width=2)
        polygon(d, [(27, 1 + bob), (25, 7 + bob), (29, 7 + bob)], (190, 196, 188, 255))
    elif kind == "archer":
        # Hooded green scout with a visible bow and quiver.
        polygon(d, [(12, 25), (11 + phase, 29), (16 + phase, 29), (16, 24)], (38, 62, 46, 255))
        polygon(d, [(17, 24), (19 - phase, 29), (24 - phase, 29), (21, 25)], (38, 62, 46, 255))
        polygon(d, [(9, 12 + bob), (15, 9 + bob), (22, 11 + bob), (22, 24), (16, 26), (9, 23)], (52, 92, 61, 255))
        ellipse(d, (11, 3 + bob, 21, 15 + bob), (35, 58, 43, 255))
        polygon(d, [(8, 12 + bob), (11, 3 + bob), (21, 2 + bob), (25, 12 + bob), (20, 8 + bob), (13, 9 + bob)], (65, 112, 72, 255))
        rect(d, (13, 7 + bob, 15, 8 + bob), WHITE, outline=None)
        d.arc((22, 8 + bob, 30, 24 + bob), 270, 90, fill=(155, 112, 62, 255), width=2)
        line(d, [(27, 9 + bob), (27, 23 + bob)], WHITE)
        line(d, [(6, 10 + bob), (10, 21 + bob)], (114, 79, 43, 255), width=2)
        for off in (-2, 0, 2):
            line(d, [(5 + off, 10 + bob), (7 + off, 5 + bob)], (196, 183, 148, 255))
    elif kind == "cavalry":
        # A compact horse silhouette with an armored rider.
        horse = [(5, 20), (8, 14), (17, 13), (20, 17), (27, 18), (29, 25), (24, 25), (22, 29), (17, 28), (15, 24), (10, 28), (6, 27)]
        polygon(d, horse, (119, 76, 45, 255))
        polygon(d, [(6, 19), (9, 15), (17, 15), (17, 22), (8, 23)], (77, 53, 39, 255))
        line(d, [(8 + phase, 27), (10 + phase, 31)], (48, 38, 37, 255), width=2)
        line(d, [(21 - phase, 27), (23 - phase, 31)], (48, 38, 37, 255), width=2)
        polygon(d, [(13, 17 + bob), (15, 9 + bob), (20, 8 + bob), (22, 18 + bob)], (135, 52, 43, 255))
        ellipse(d, (13, 3 + bob, 21, 12 + bob), SKIN)
        polygon(d, [(11, 5 + bob), (14, 1 + bob), (21, 4 + bob)], (151, 60, 48, 255))
        line(d, [(23, 7 + bob), (29, 12 + bob)], (198, 181, 130, 255), width=2)
        polygon(d, [(28, 10 + bob), (25, 12 + bob), (28, 15 + bob)], (190, 190, 178, 255))
    else:
        # Elite general: broad gold armor, horned crown, cloak, and command blade.
        polygon(d, [(7, 24), (3, 31), (13, 28)], (93, 34, 53, 255))
        polygon(d, [(24, 24), (29, 31), (19, 28)], (93, 34, 53, 255))
        polygon(d, [(7, 10 + bob), (15, 7 + bob), (24, 10 + bob), (26, 25), (16, 29), (5, 24)], (139, 94, 40, 255))
        polygon(d, [(12, 13 + bob), (20, 13 + bob), (22, 23 + bob), (10, 23 + bob)], (188, 147, 57, 255))
        ellipse(d, (10, 2 + bob, 22, 15 + bob), SKIN)
        polygon(d, [(8, 6 + bob), (11, 1 + bob), (20, 1 + bob), (24, 7 + bob)], (174, 126, 43, 255))
        polygon(d, [(10, 2 + bob), (6, 0 + bob), (9, 6 + bob)], WHITE)
        polygon(d, [(21, 2 + bob), (25, 0 + bob), (23, 7 + bob)], WHITE)
        rect(d, (13, 8 + bob, 14, 9 + bob), WHITE, outline=None)
        rect(d, (19, 8 + bob, 20, 9 + bob), WHITE, outline=None)
        line(d, [(27, 5 + bob), (24, 26 + bob)], (221, 221, 197, 255), width=2)
        polygon(d, [(26, 2 + bob), (29, 9 + bob), (24, 10 + bob)], (229, 164, 51, 255))
    return image


def make_enemy_sheet(kind):
    sheet = Image.new("RGBA", (ENEMY_CELL[0] * ENEMY_COLS, ENEMY_CELL[1]), (0, 0, 0, 0))
    for frame in range(ENEMY_COLS):
        sheet.paste(enemy_frame(kind, frame), (frame * ENEMY_CELL[0], 0))
    return sheet


def make_terrain():
    size = 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(image)
    rng = random.Random(314159)
    d.rectangle((0, 0, size, size), fill=(38, 42, 35, 255))

    # Large worn flagstones break up the field at gameplay scale.
    for box, fill in (
        ((3, 5, 29, 27), (48, 49, 40, 255)),
        ((34, 2, 60, 24), (43, 46, 38, 255)),
        ((-5, 31, 24, 60), (45, 45, 37, 255)),
        ((28, 29, 54, 57), (50, 50, 41, 255)),
        ((55, 31, 70, 62), (41, 44, 36, 255)),
    ):
        d.rounded_rectangle(box, radius=3, fill=fill, outline=(28, 31, 27, 255), width=1)

    # Fine grit, moss, and cracks keep the tile readable without visual noise.
    for _ in range(90):
        x, y = rng.randrange(size), rng.randrange(size)
        color = rng.choice(((54, 55, 45, 255), (31, 35, 31, 255), (64, 58, 46, 255)))
        d.point((x, y), fill=color)
    for x, y in ((7, 11), (28, 7), (47, 19), (18, 37), (39, 49), (58, 41), (3, 56), (34, 28)):
        d.line((x, y, x, y - 3), fill=(82, 91, 61, 255))
        d.line((x, y, x + 2, y - 2), fill=(67, 77, 54, 255))
    for x, y in ((22, 23), (51, 6), (7, 43), (39, 20)):
        d.rectangle((x, y, x + 2, y + 1), fill=(101, 94, 78, 255))
    for x, y in ((14, 4), (44, 34), (56, 57)):
        d.point((x, y), fill=(119, 91, 56, 255))
    return image


def make_effects():
    slash = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(slash)
    d.arc((5, 5, 58, 58), 205, 335, fill=(255, 240, 187, 255), width=5)
    d.arc((9, 9, 54, 54), 215, 325, fill=(255, 174, 73, 190), width=2)
    save(slash, "effects/slash.png")

    impact = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(impact)
    for radius, color in ((13, (255, 238, 166, 255)), (9, (255, 145, 57, 255)), (5, (255, 249, 220, 255))):
        d.ellipse((16 - radius, 16 - radius, 16 + radius, 16 + radius), outline=color, width=2)
    for a in range(0, 360, 45):
        x = 16 + int(sin(a * pi / 180) * 14)
        y = 16 + int(sin((a + 90) * pi / 180) * 14)
        d.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(255, 222, 131, 255))
    save(impact, "effects/impact.png")

    gem = Image.new("RGBA", (14, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(gem)
    polygon(d, [(7, 1), (12, 5), (10, 12), (4, 12), (2, 5)], (60, 225, 170, 255))
    polygon(d, [(7, 2), (10, 5), (7, 10), (4, 5)], (157, 255, 211, 255))
    save(gem, "effects/gem.png")

    chest = Image.new("RGBA", (28, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(chest)
    rect(d, (3, 8, 24, 21), (133, 77, 35, 255))
    d.arc((3, 2, 24, 16), 180, 360, fill=(174, 111, 42, 255), width=5)
    line(d, [(4, 10), (23, 10)], (218, 171, 71, 255), width=2)
    rect(d, (11, 9, 16, 16), (245, 207, 91, 255))
    save(chest, "effects/chest.png")

    projectile = Image.new("RGBA", (14, 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(projectile)
    polygon(d, [(12, 4), (5, 1), (2, 4), (5, 7)], (244, 220, 157, 255))
    line(d, [(1, 4), (10, 4)], (129, 76, 40, 255), width=2)
    save(projectile, "effects/projectile.png")

    vignette = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    pixels = []
    for y in range(128):
        for x in range(128):
            dx = (x - 63.5) / 63.5
            dy = (y - 63.5) / 63.5
            distance = sqrt(dx * dx + dy * dy)
            alpha = max(0, min(178, int((distance - 0.42) * 145)))
            pixels.append((6, 8, 12, alpha))
    vignette.putdata(pixels)
    save(vignette, "ui/vignette.png")


    icon_ids = (
        "blade", "spear", "bow", "fan", "halberd", "daggers",
        "might", "armor", "swiftness", "cooldown", "area", "growth", "heal",
    )
    icons = Image.new("RGBA", (16 * len(icon_ids), 16), (0, 0, 0, 0))
    for idx, kind in enumerate(icon_ids):
        cell = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cell)
        if kind == "blade":
            line(cd, [(3, 13), (12, 4)], (150, 102, 54, 255), width=2)
            polygon(cd, [(8, 2), (14, 2), (13, 8), (9, 6)], (95, 211, 141, 255))
        elif kind == "spear":
            line(cd, [(2, 13), (11, 4)], (168, 114, 64, 255), width=2)
            polygon(cd, [(10, 5), (14, 1), (12, 7)], (227, 95, 95, 255))
        elif kind == "bow":
            cd.arc((2, 2, 13, 13), 290, 70, fill=(95, 157, 211, 255), width=2)
            line(cd, [(6, 2), (6, 13)], (220, 230, 240, 255), width=1)
            line(cd, [(3, 8), (13, 8)], (245, 214, 122, 255), width=1)
        elif kind == "fan":
            polygon(cd, [(8, 13), (2, 5), (8, 3), (14, 5)], (179, 143, 211, 255))
            line(cd, [(8, 13), (5, 4)], (245, 232, 196, 255), width=1)
            line(cd, [(8, 13), (11, 4)], (245, 232, 196, 255), width=1)
        elif kind == "halberd":
            line(cd, [(3, 13), (12, 3)], (175, 122, 68, 255), width=2)
            polygon(cd, [(9, 3), (14, 4), (12, 9), (8, 7)], (227, 143, 95, 255))
        elif kind == "daggers":
            line(cd, [(2, 12), (9, 3)], (232, 204, 74, 255), width=2)
            line(cd, [(6, 13), (13, 4)], (255, 232, 128, 255), width=2)
        elif kind == "might":
            polygon(cd, [(8, 2), (13, 7), (10, 7), (10, 13), (6, 13), (6, 7), (3, 7)], (255, 107, 107, 255))
        elif kind == "armor":
            polygon(cd, [(3, 3), (13, 3), (12, 10), (8, 14), (4, 10)], (107, 159, 255, 255))
        elif kind == "swiftness":
            polygon(cd, [(3, 9), (9, 3), (8, 7), (13, 7), (6, 13), (7, 9)], (107, 255, 176, 255))
        elif kind == "cooldown":
            polygon(cd, [(4, 2), (12, 2), (9, 7), (12, 13), (4, 13), (7, 7)], (255, 176, 107, 255))
        elif kind == "area":
            cd.ellipse((2, 2, 13, 13), outline=(176, 107, 255, 255), width=2)
            cd.ellipse((6, 6, 9, 9), fill=(224, 184, 255, 255))
        elif kind == "growth":
            polygon(cd, [(8, 1), (10, 6), (15, 8), (10, 10), (8, 15), (6, 10), (1, 8), (6, 6)], (255, 235, 95, 255))
        elif kind == "heal":
            rect(cd, (6, 3, 9, 12), (255, 96, 112, 255), outline=None)
            rect(cd, (3, 6, 12, 9), (255, 96, 112, 255), outline=None)
        icons.paste(cell, (idx * 16, 0))
    save(icons, "ui/icons.png")

HEROES = {
    "guanyu": dict(cloth=(43, 139, 68, 255), accent=(208, 53, 43, 255), trim=(244, 203, 77, 255), hair=(28, 24, 27, 255), beard=(28, 24, 27, 255), helmet=True, plume=True, blade=True),
    "zhangfei": dict(cloth=(105, 48, 45, 255), accent=(206, 70, 55, 255), trim=(225, 106, 73, 255), hair=(30, 25, 27, 255), beard=(27, 23, 26, 255), helmet=True, spear=True),
    "zhaoyun": dict(cloth=(67, 126, 183, 255), accent=(238, 241, 235, 255), trim=(220, 230, 235, 255), hair=(39, 34, 40, 255), helmet=True, plume=True, bow=True),
    "zhugeliang": dict(cloth=(137, 87, 151, 255), accent=(235, 202, 111, 255), trim=(246, 224, 157, 255), hair=(43, 35, 46, 255), fan=True),
    "lubu": dict(cloth=(183, 49, 43, 255), accent=(245, 184, 56, 255), trim=(255, 224, 104, 255), hair=(36, 29, 31, 255), helmet=True, plume=True, halberd=True),
    "sunshangxiang": dict(cloth=(210, 93, 49, 255), accent=(255, 210, 71, 255), trim=(255, 235, 145, 255), hair=(52, 31, 33, 255), helmet=True, daggers=True),
}


def main():
    for hero_id, spec in HEROES.items():
        save(make_hero_sheet(spec), f"heroes/{hero_id}.png")
    for enemy_id in ("soldier", "archer", "cavalry", "elite"):
        save(make_enemy_sheet(enemy_id), f"enemies/{enemy_id}.png")
    # A combined atlas lets every pooled enemy share one texture source in a
    # ParticleContainer while still retaining the four standalone enemy sheets.
    atlas = Image.new("RGBA", (ENEMY_CELL[0] * ENEMY_COLS, ENEMY_CELL[1] * 4), (0, 0, 0, 0))
    for row, enemy_id in enumerate(("soldier", "archer", "cavalry", "elite")):
        atlas.paste(make_enemy_sheet(enemy_id), (0, row * ENEMY_CELL[1]))
    save(atlas, "enemies/atlas.png")
    save(make_terrain(), "terrain/ground.png")
    make_effects()
    print(f"Generated original pixel art in {OUT}")


if __name__ == "__main__":
    main()
