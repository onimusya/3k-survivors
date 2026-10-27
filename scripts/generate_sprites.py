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
    elif kind == "shield":
        # Heavy ironclad tower-shield guard.
        polygon(d, [(10, 25), (9 + phase, 29), (15 + phase, 29), (15, 24)], (42, 48, 58, 255))
        polygon(d, [(17, 24), (19 - phase, 29), (24 - phase, 29), (21, 25)], (42, 48, 58, 255))
        polygon(d, [(9, 12 + bob), (23, 12 + bob), (24, 25), (9, 25)], (78, 90, 108, 255))
        ellipse(d, (11, 3 + bob, 22, 14 + bob), SKIN)
        polygon(d, [(9, 7 + bob), (12, 1 + bob), (21, 1 + bob), (24, 7 + bob)], (92, 106, 126, 255))
        rect(d, (4, 9 + bob, 15, 26 + bob), (56, 68, 86, 255))
        rect(d, (6, 11 + bob, 13, 24 + bob), (122, 142, 168, 255))
        rect(d, (8, 16 + bob, 11, 19 + bob), (228, 184, 72, 255))
    elif kind == "assassin":
        # Fast crimson-hooded dual-dagger nightblade.
        polygon(d, [(10, 25), (8 + phase * 2, 29), (14 + phase * 2, 29), (15, 24)], (45, 24, 34, 255))
        polygon(d, [(17, 24), (21 - phase * 2, 29), (26 - phase * 2, 29), (21, 25)], (45, 24, 34, 255))
        polygon(d, [(9, 12 + bob), (16, 9 + bob), (23, 12 + bob), (21, 24), (11, 24)], (128, 34, 52, 255))
        polygon(d, [(10, 4 + bob), (16, 1 + bob), (22, 4 + bob), (21, 13 + bob), (11, 13 + bob)], (88, 24, 38, 255))
        rect(d, (13, 7 + bob, 19, 9 + bob), (255, 92, 92, 255), outline=None)
        polygon(d, [(3, 19 + bob), (9, 15 + bob), (8, 21 + bob)], (220, 232, 245, 255))
        polygon(d, [(29, 19 + bob), (23, 15 + bob), (24, 21 + bob)], (220, 232, 245, 255))
    elif kind == "bomber":
        # Firebrand zealot carrying a glowing black-powder bomb overhead.
        polygon(d, [(11, 25), (10 + phase, 29), (15 + phase, 29), (15, 24)], (68, 42, 28, 255))
        polygon(d, [(17, 24), (20 - phase, 29), (25 - phase, 29), (21, 25)], (68, 42, 28, 255))
        polygon(d, [(9, 13 + bob), (23, 13 + bob), (24, 25), (8, 25)], (188, 84, 36, 255))
        ellipse(d, (11, 6 + bob, 21, 16 + bob), SKIN)
        ellipse(d, (11, 0 + bob, 21, 10 + bob), (24, 26, 32, 255))
        rect(d, (15, 0 + bob, 18, 2 + bob), (255, 232, 92, 255), outline=None)
    elif kind == "sorcerer":
        # Purple-robed Taoist mystic with arcane orb staff.
        polygon(d, [(9, 12 + bob), (16, 8 + bob), (23, 12 + bob), (25, 28), (7, 28)], (106, 56, 148, 255))
        line(d, [(16, 10 + bob), (16, 27)], (232, 194, 92, 255), width=2)
        ellipse(d, (11, 3 + bob, 21, 13 + bob), SKIN)
        polygon(d, [(10, 5 + bob), (16, 0 + bob), (22, 5 + bob)], (74, 36, 112, 255))
        line(d, [(26, 6 + bob), (26, 28)], (142, 96, 52, 255), width=2)
        ellipse(d, (23, 2 + bob, 29, 8 + bob), (124, 238, 255, 255))
    elif kind == "boss_huaxiong":
        # Hua Xiong: Crimson-black horned Demon Vanguard with giant battleaxe.
        polygon(d, [(5, 24), (2, 31), (13, 28)], (52, 18, 24, 255))
        polygon(d, [(26, 24), (30, 31), (19, 28)], (52, 18, 24, 255))
        polygon(d, [(6, 9 + bob), (16, 6 + bob), (26, 9 + bob), (27, 26), (5, 26)], (168, 36, 38, 255))
        polygon(d, [(10, 12 + bob), (22, 12 + bob), (23, 24 + bob), (9, 24 + bob)], (42, 44, 52, 255))
        ellipse(d, (10, 2 + bob, 22, 14 + bob), SKIN)
        polygon(d, [(7, 6 + bob), (5, 0 + bob), (11, 4 + bob)], (245, 210, 96, 255))
        polygon(d, [(25, 6 + bob), (27, 0 + bob), (21, 4 + bob)], (245, 210, 96, 255))
        line(d, [(27, 3 + bob), (25, 28 + bob)], (160, 120, 68, 255), width=2)
        polygon(d, [(22, 4 + bob), (31, 2 + bob), (31, 14 + bob), (22, 11 + bob)], (228, 82, 72, 255))
    elif kind == "boss_caoren":
        # Cao Ren: Sapphire-gold Imperial Grand Commander with heavy plate & glaive.
        polygon(d, [(5, 24), (2, 31), (14, 28)], (28, 58, 118, 255))
        polygon(d, [(26, 24), (30, 31), (18, 28)], (28, 58, 118, 255))
        polygon(d, [(6, 9 + bob), (16, 6 + bob), (26, 9 + bob), (27, 26), (5, 26)], (48, 96, 178, 255))
        polygon(d, [(10, 12 + bob), (22, 12 + bob), (23, 24 + bob), (9, 24 + bob)], (232, 192, 78, 255))
        ellipse(d, (10, 2 + bob, 22, 14 + bob), SKIN)
        polygon(d, [(8, 6 + bob), (16, 0 + bob), (24, 6 + bob)], (72, 132, 224, 255))
        line(d, [(27, 2 + bob), (25, 28 + bob)], (235, 205, 110, 255), width=2)
        polygon(d, [(24, 1 + bob), (31, 5 + bob), (25, 11 + bob)], (152, 224, 255, 255))
    else:
        # Zhang Jiao / Elite General: broad gold armor, horned crown, cloak, and staff/blade.
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


def make_props_atlas():
    prop_kinds = (
        "tree", "pine", "rock", "grass", "mountain", "banner",
        "house", "watchtower", "castle", "tent",
    )
    seasons = ("spring", "summer", "autumn", "winter")
    w, h = 48, 48
    sheet = Image.new("RGBA", (w * len(prop_kinds), h * len(seasons)), (0, 0, 0, 0))
    for s_row, season in enumerate(seasons):
        for idx, kind in enumerate(prop_kinds):
            cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(cell)
            OUTLINE = (22, 18, 22, 255)
            if kind == "tree":
                # CraftPix Medieval Fortress style multi-lobed oak/blossom tree with flared trunk & 3-tier shading
                ellipse(d, (9, 37, 39, 45), (10, 14, 12, 120), outline=None)
                polygon(d, [(18, 41), (20, 26), (28, 26), (30, 41)], (104, 64, 38, 255), outline=OUTLINE)
                line(d, [(23, 28), (22, 40)], (138, 88, 52, 255), width=2)
                if season == "spring":
                    c_dark, c_mid, c_hi, c_spec = (186, 68, 116, 255), (228, 108, 156, 255), (248, 158, 198, 255), (255, 222, 238, 255)
                elif season == "autumn":
                    c_dark, c_mid, c_hi, c_spec = (158, 52, 24, 255), (212, 92, 32, 255), (244, 148, 42, 255), (255, 210, 82, 255)
                elif season == "winter":
                    c_dark, c_mid, c_hi, c_spec = (118, 148, 178, 255), (164, 196, 224, 255), (216, 236, 250, 255), (250, 254, 255, 255)
                else:
                    c_dark, c_mid, c_hi, c_spec = (76, 112, 36, 255), (126, 168, 44, 255), (168, 206, 58, 255), (204, 234, 88, 255)
                for bx, by, br in ((15, 23, 9), (33, 23, 9), (24, 25, 10), (14, 15, 9), (34, 15, 9), (24, 12, 10)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), c_dark, outline=OUTLINE)
                for bx, by, br in ((15, 21, 8), (33, 21, 8), (24, 22, 9), (15, 14, 8), (33, 14, 8), (24, 11, 9)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), c_mid, outline=None)
                for bx, by, br in ((16, 13, 6), (31, 13, 6), (24, 10, 7), (20, 18, 6), (29, 18, 5)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), c_hi, outline=None)
                for px, py in ((19, 8), (25, 7), (14, 12), (29, 11), (22, 15)):
                    d.rectangle((px, py, px + 2, py + 2), fill=c_spec)
            elif kind == "pine":
                # CraftPix Medieval Fortress style tiered conifer pine with serrated boughs
                ellipse(d, (12, 38, 36, 45), (10, 14, 12, 120), outline=None)
                rect(d, (20, 31, 28, 42), (96, 58, 34, 255), outline=OUTLINE)
                if season == "autumn":
                    p_dark, p_mid, p_hi = (138, 72, 28, 255), (186, 112, 38, 255), (234, 166, 56, 255)
                elif season == "winter":
                    p_dark, p_mid, p_hi = (52, 86, 78, 255), (168, 204, 228, 255), (242, 250, 255, 255)
                else:
                    p_dark, p_mid, p_hi = (58, 92, 34, 255), (102, 146, 44, 255), (148, 192, 58, 255)
                tiers = [
                    ([(24, 17), (7, 35), (15, 34), (12, 37), (24, 36), (36, 37), (33, 34), (41, 35)], 20),
                    ([(24, 11), (10, 28), (17, 27), (15, 30), (24, 29), (33, 30), (31, 27), (38, 28)], 14),
                    ([(24, 5), (13, 21), (19, 20), (17, 22), (24, 21), (31, 22), (29, 20), (35, 21)], 8),
                    ([(24, 2), (17, 13), (24, 14), (31, 13)], 4),
                ]
                for pts, hi_y in tiers:
                    polygon(d, pts, p_dark, outline=OUTLINE)
                polygon(d, [(24, 18), (11, 33), (24, 34), (37, 33)], p_mid, outline=None)
                polygon(d, [(24, 12), (13, 26), (24, 27), (35, 26)], p_mid, outline=None)
                polygon(d, [(24, 6), (16, 19), (24, 20), (32, 19)], p_hi, outline=None)
                polygon(d, [(24, 3), (19, 11), (24, 12), (29, 11)], p_hi, outline=None)
            elif kind == "rock":
                # CraftPix faceted blue-grey fortress boulder + companion pebbles
                ellipse(d, (6, 33, 42, 43), (10, 14, 12, 115), outline=None)
                polygon(d, [(7, 36), (10, 21), (22, 14), (35, 18), (40, 34), (31, 39), (14, 39)], (104, 103, 122, 255), outline=OUTLINE)
                top_col = (238, 246, 255, 255) if season == "winter" else (178, 177, 198, 255)
                mid_col = (140, 139, 160, 255)
                polygon(d, [(11, 21), (22, 15), (34, 19), (28, 27), (15, 26)], top_col, outline=None)
                polygon(d, [(15, 26), (28, 27), (38, 33), (30, 38), (14, 38)], mid_col, outline=None)
                line(d, [(22, 15), (20, 25), (28, 27)], (78, 77, 94, 255), width=1)
                # Companion pebble
                polygon(d, [(33, 39), (36, 33), (43, 34), (44, 40), (36, 41)], (124, 123, 144, 255), outline=OUTLINE)
                polygon(d, [(6, 39), (8, 34), (14, 35), (14, 40)], (96, 95, 114, 255), outline=OUTLINE)
            elif kind == "grass":
                # CraftPix outlined flowering shrub & grass tuft
                ellipse(d, (10, 35, 38, 42), (10, 14, 12, 105), outline=None)
                if season == "autumn":
                    b_dark, b_mid, b_hi = (158, 72, 28, 255), (208, 114, 38, 255), (244, 168, 58, 255)
                elif season == "winter":
                    b_dark, b_mid, b_hi = (108, 138, 168, 255), (168, 202, 228, 255), (236, 248, 255, 255)
                else:
                    b_dark, b_mid, b_hi = (68, 108, 34, 255), (118, 164, 44, 255), (164, 208, 62, 255)
                for bx, by, br in ((16, 32, 7), (32, 32, 7), (24, 28, 8), (24, 34, 8)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), b_dark, outline=OUTLINE)
                for bx, by, br in ((16, 31, 6), (32, 31, 6), (24, 27, 7), (24, 33, 7)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), b_mid, outline=None)
                for bx, by, br in ((18, 29, 4), (30, 29, 4), (24, 25, 5)):
                    ellipse(d, (bx - br, by - br, bx + br, by + br), b_hi, outline=None)
                fcol1 = (255, 158, 198, 255) if season == "spring" else (250, 214, 82, 255)
                for fx, fy, col in ((17, 27, fcol1), (29, 28, (238, 88, 78, 255)), (23, 32, fcol1)):
                    rect(d, (fx - 2, fy - 2, fx + 2, fy + 2), col, outline=OUTLINE)
            elif kind == "mountain":
                ellipse(d, (3, 36, 45, 44), (10, 14, 12, 120), outline=None)
                polygon(d, [(3, 40), (16, 11), (31, 40)], (88, 87, 106, 255), outline=OUTLINE)
                polygon(d, [(16, 40), (30, 6), (45, 40)], (118, 117, 138, 255), outline=OUTLINE)
                snow_y = 28 if season == "winter" else 19
                polygon(d, [(30, 7), (22, snow_y), (30, snow_y - 3), (38, snow_y)], (238, 246, 255, 255), outline=None)
                polygon(d, [(16, 12), (10, snow_y + 2), (16, snow_y - 1), (22, snow_y + 2)], (218, 230, 245, 255), outline=None)
            elif kind == "banner":
                # CraftPix wooden supply crate + iron-hooped barrel + Three Kingdoms war banner
                ellipse(d, (8, 36, 40, 44), (10, 14, 12, 115), outline=None)
                line(d, [(16, 5), (16, 41)], (188, 142, 72, 255), width=2)
                polygon(d, [(17, 7), (35, 9), (31, 17), (36, 25), (17, 27)], (198, 48, 44, 255), outline=OUTLINE)
                line(d, [(19, 12), (31, 13)], (248, 208, 88, 255), width=2)
                line(d, [(19, 22), (31, 22)], (248, 208, 88, 255), width=2)
                # CraftPix iron-hooped wooden barrel at base
                ellipse(d, (22, 27, 36, 41), (142, 88, 52, 255), outline=OUTLINE)
                line(d, [(23, 31), (35, 31)], (184, 190, 204, 255), width=2)
                line(d, [(23, 37), (35, 37)], (184, 190, 204, 255), width=2)
                ellipse(d, (24, 27, 34, 31), (176, 118, 74, 255), outline=OUTLINE)
            elif kind == "house":
                # CraftPix Fantasy Medieval Village House: stone base, honey-timber walls, terracotta shingle roof & chimney
                ellipse(d, (4, 37, 44, 45), (10, 14, 12, 130), outline=None)
                rect(d, (8, 35, 40, 42), (118, 124, 138, 255), outline=OUTLINE)
                rect(d, (9, 20, 39, 36), (204, 148, 88, 255), outline=OUTLINE)
                for py in (24, 28, 32):
                    line(d, [(10, py), (38, py)], (152, 102, 54, 255), width=1)
                for px in (10, 19, 29, 38):
                    line(d, [(px, 20), (px, 36)], (122, 78, 42, 255), width=2)
                # Arched wooden door + framed windows
                rect(d, (21, 27, 27, 36), (116, 68, 38, 255), outline=OUTLINE)
                d.point((25, 32), fill=(238, 204, 96, 255))
                for wx in (12, 31):
                    rect(d, (wx, 25, wx + 5, 31), (255, 218, 108, 255), outline=OUTLINE)
                    line(d, [(wx + 2, 25), (wx + 2, 31)], OUTLINE, width=1)
                # Pitched Terracotta Shingle Roof + Stone Chimney
                roof_dark = (188, 214, 238, 255) if season == "winter" else ((168, 74, 34, 255) if season == "autumn" else (156, 56, 46, 255))
                roof_hi = (238, 248, 255, 255) if season == "winter" else ((214, 108, 46, 255) if season == "autumn" else (196, 78, 64, 255))
                polygon(d, [(4, 22), (24, 6), (44, 22)], roof_dark, outline=OUTLINE)
                polygon(d, [(7, 21), (24, 8), (41, 21)], roof_hi, outline=None)
                for ry in (12, 16, 20):
                    half_w = int((ry - 6) * 1.15)
                    line(d, [(24 - half_w, ry), (24 + half_w, ry)], roof_dark, width=1)
                # Stone chimney on left roof slope
                rect(d, (11, 6, 17, 15), (124, 128, 142, 255), outline=OUTLINE)
                rect(d, (10, 5, 18, 8), (154, 158, 172, 255), outline=OUTLINE)
            elif kind == "watchtower":
                # CraftPix Medieval Fortress Stone Watchtower with crenelated deck, arrow slits & wooden ladder
                ellipse(d, (7, 37, 41, 45), (10, 14, 12, 130), outline=None)
                rect(d, (11, 10, 37, 42), (122, 120, 140, 255), outline=OUTLINE)
                rect(d, (13, 12, 35, 22), (150, 148, 170, 255), outline=OUTLINE)
                # Stone brick courses on tower shaft
                for by in (25, 30, 35, 39):
                    line(d, [(12, by), (36, by)], (88, 86, 104, 255), width=1)
                for bx in (18, 26, 32):
                    line(d, [(bx, 23), (bx, 41)], (88, 86, 104, 255), width=1)
                # Crenelated top merlons
                cap_col = (232, 244, 255, 255) if season == "winter" else (168, 166, 188, 255)
                for cx in (10, 17, 25, 32):
                    rect(d, (cx, 6, cx + 5, 12), cap_col, outline=OUTLINE)
                # Arched arrow slit + wooden scaling ladder
                rect(d, (18, 26, 22, 34), (28, 24, 32, 255), outline=OUTLINE)
                rect(d, (28, 14, 33, 42), (138, 86, 48, 255), outline=OUTLINE)
                for ly in range(16, 41, 4):
                    line(d, [(28, ly), (33, ly)], (188, 128, 76, 255), width=1)
            elif kind == "castle":
                # CraftPix Medieval Fortress Gatehouse: coursed blue-grey stone wall, crenelations & double wooden gate with twin ring knockers
                ellipse(d, (2, 37, 46, 46), (10, 14, 12, 140), outline=None)
                rect(d, (4, 11, 44, 42), (122, 120, 140, 255), outline=OUTLINE)
                rect(d, (6, 13, 42, 22), (152, 150, 172, 255), outline=None)
                for by in (22, 27, 32, 37):
                    line(d, [(5, by), (43, by)], (86, 84, 102, 255), width=1)
                for bx in (12, 20, 28, 36):
                    line(d, [(bx, 13), (bx, 41)], (86, 84, 102, 255), width=1)
                # Top battlements (5 merlons)
                merlon_col = (235, 245, 255, 255) if season == "winter" else (168, 166, 188, 255)
                for bx in (4, 12, 20, 28, 36):
                    rect(d, (bx, 6, bx + 6, 12), merlon_col, outline=OUTLINE)
                # Stone archway + double wooden plank gate + twin silver ring knockers
                polygon(d, [(14, 42), (14, 26), (19, 21), (29, 21), (34, 26), (34, 42)], (92, 90, 108, 255), outline=OUTLINE)
                polygon(d, [(16, 42), (16, 27), (20, 23), (28, 23), (32, 27), (32, 42)], (140, 88, 56, 255), outline=OUTLINE)
                line(d, [(24, 23), (24, 42)], OUTLINE, width=1)
                for gx in (19, 29):
                    line(d, [(gx, 25), (gx, 41)], (104, 62, 38, 255), width=1)
                ellipse(d, (20, 32, 23, 35), (218, 224, 236, 255), outline=OUTLINE)
                ellipse(d, (25, 32, 28, 35), (218, 224, 236, 255), outline=OUTLINE)
            elif kind == "tent":
                # Command War Pavilion + CraftPix wooden supply crate
                ellipse(d, (5, 37, 43, 45), (10, 14, 12, 125), outline=None)
                polygon(d, [(6, 39), (12, 18), (36, 18), (42, 39)], (196, 52, 46, 255), outline=OUTLINE)
                polygon(d, [(16, 39), (19, 19), (29, 19), (32, 39)], (242, 198, 84, 255), outline=OUTLINE)
                polygon(d, [(19, 39), (24, 26), (29, 39)], (32, 24, 28, 255), outline=OUTLINE)
                top_col = (232, 244, 255, 255) if season == "winter" else (222, 68, 54, 255)
                polygon(d, [(9, 19), (24, 6), (39, 19)], top_col, outline=OUTLINE)
                line(d, [(9, 19), (39, 19)], (250, 212, 92, 255), width=2)
                ellipse(d, (22, 3, 26, 7), (255, 228, 102, 255), outline=OUTLINE)
                # CraftPix wooden supply crate beside pavilion
                rect(d, (33, 30, 44, 41), (156, 98, 56, 255), outline=OUTLINE)
                rect(d, (35, 32, 42, 39), (124, 76, 42, 255), outline=OUTLINE)
            sheet.paste(cell, (idx * w, s_row * h))
    return sheet

def make_effects():
    slash = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(slash)
    d.arc((3, 3, 60, 60), 198, 342, fill=(255, 168, 64, 185), width=8)
    d.arc((5, 5, 58, 58), 204, 336, fill=(255, 236, 158, 255), width=5)
    d.arc((7, 7, 56, 56), 212, 328, fill=(255, 255, 255, 255), width=2)
    d.arc((13, 13, 50, 50), 218, 320, fill=(255, 210, 96, 175), width=2)
    for px, py in ((14, 18), (24, 10), (38, 10), (49, 18), (53, 28)):
        d.rectangle((px - 1, py - 1, px + 1, py + 1), fill=(255, 252, 210, 255))
    save(slash, "effects/slash.png")

    spear = Image.new("RGBA", (64, 28), (0, 0, 0, 0))
    d = ImageDraw.Draw(spear)
    polygon(d, [(2, 14), (42, 4), (63, 14), (42, 24)], (255, 224, 180, 235), outline=(255, 255, 255, 255))
    polygon(d, [(8, 14), (45, 8), (61, 14), (45, 20)], (255, 250, 220, 255), outline=None)
    d.rectangle((4, 12, 58, 16), fill=(255, 255, 255, 255))
    for cx in (18, 30, 42):
        polygon(d, [(cx, 3), (cx + 7, 14), (cx, 25), (cx + 3, 14)], (255, 255, 255, 245), outline=None)
    save(spear, "effects/spear.png")

    whirlwind = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(whirlwind)
    d.ellipse((6, 6, 58, 58), outline=(255, 156, 72, 170), width=4)
    d.ellipse((10, 10, 54, 54), outline=(255, 234, 154, 245), width=2)
    for start_ang in (0, 90, 180, 270):
        d.arc((3, 3, 61, 61), start_ang, start_ang + 58, fill=(255, 252, 224, 255), width=4)
        d.arc((12, 12, 52, 52), start_ang + 25, start_ang + 75, fill=(255, 186, 82, 210), width=3)
    save(whirlwind, "effects/whirlwind.png")

    shockwave = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(shockwave)
    d.ellipse((3, 3, 44, 44), outline=(255, 232, 148, 245), width=3)
    d.ellipse((8, 8, 39, 39), outline=(255, 255, 255, 200), width=1)
    for a in range(0, 360, 45):
        x0 = 24 + int(sin(a * pi / 180) * 14)
        y0 = 24 + int(sin((a + 90) * pi / 180) * 14)
        x1 = 24 + int(sin(a * pi / 180) * 22)
        y1 = 24 + int(sin((a + 90) * pi / 180) * 22)
        d.line((x0, y0, x1, y1), fill=(255, 248, 204, 240), width=2)
    save(shockwave, "effects/shockwave.png")

    spark = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(spark)
    polygon(d, [(10, 1), (12, 8), (19, 10), (12, 12), (10, 19), (8, 12), (1, 10), (8, 8)], (255, 238, 142, 255), outline=None)
    polygon(d, [(10, 4), (11, 9), (16, 10), (11, 11), (10, 16), (9, 11), (4, 10), (9, 9)], (255, 255, 255, 255), outline=None)
    save(spark, "effects/spark.png")

    impact = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(impact)
    for radius, color in ((14, (255, 238, 166, 255)), (10, (255, 145, 57, 255)), (5, (255, 255, 255, 255))):
        d.ellipse((16 - radius, 16 - radius, 16 + radius, 16 + radius), outline=color, width=2)
    for a in range(0, 360, 45):
        x = 16 + int(sin(a * pi / 180) * 14)
        y = 16 + int(sin((a + 90) * pi / 180) * 14)
        d.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(255, 245, 190, 255))
    save(impact, "effects/impact.png")
    gem = Image.new("RGBA", (14, 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(gem)
    polygon(d, [(7, 1), (12, 5), (10, 12), (4, 12), (2, 5)], (60, 225, 170, 255))
    polygon(d, [(7, 2), (10, 5), (7, 10), (4, 5)], (157, 255, 211, 255))
    save(gem, "effects/gem.png")

    chest = Image.new("RGBA", (28, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(chest)
    OUTLINE = (22, 18, 22, 255)
    rect(d, (2, 4, 25, 21), (156, 94, 48, 255), outline=OUTLINE)
    rect(d, (3, 5, 24, 11), (198, 132, 74, 255), outline=OUTLINE)
    # Silver/iron CraftPix chest bands + gold lock plate
    for bx in (4, 21):
        rect(d, (bx, 4, bx + 2, 21), (206, 214, 228, 255), outline=OUTLINE)
    line(d, [(3, 12), (24, 12)], OUTLINE, width=1)
    rect(d, (11, 9, 16, 16), (250, 212, 92, 255), outline=OUTLINE)
    save(chest, "effects/chest.png")
    projectile = Image.new("RGBA", (14, 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(projectile)
    polygon(d, [(12, 4), (5, 1), (2, 4), (5, 7)], (244, 220, 157, 255))
    line(d, [(1, 4), (10, 4)], (129, 76, 40, 255), width=2)
    save(projectile, "effects/projectile.png")

    heart = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(heart)
    polygon(d, [(10, 17), (2, 10), (2, 5), (6, 2), (10, 6), (14, 2), (18, 5), (18, 10)], (238, 62, 84, 255))
    polygon(d, [(10, 14), (4, 9), (4, 6), (6, 4), (10, 7), (14, 4), (16, 6), (16, 9)], (255, 112, 132, 255), outline=None)
    d.rectangle((5, 5, 7, 7), fill=(255, 235, 240, 255))
    save(heart, "effects/heart.png")

    bomb = Image.new("RGBA", (22, 22), (0, 0, 0, 0))
    d = ImageDraw.Draw(bomb)
    ellipse(d, (2, 5, 19, 21), (14, 16, 20, 255), outline=(92, 98, 110, 255))
    ellipse(d, (4, 7, 17, 19), (22, 25, 32, 255), outline=None)
    ellipse(d, (6, 8, 10, 12), (148, 158, 175, 255), outline=None)
    rect(d, (9, 2, 13, 6), (82, 88, 98, 255))
    line(d, [(11, 2), (15, 1), (18, 3)], (232, 196, 116, 255), width=2)
    polygon(d, [(18, 0), (19, 3), (21, 3), (19, 5), (18, 7), (17, 5), (15, 3), (17, 3)], (255, 238, 96, 255), outline=None)
    save(bomb, "effects/bomb.png")

    explosion = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(explosion)
    for bx, by, br, col in (
        (32, 32, 27, (198, 52, 28, 215)),
        (20, 24, 16, (224, 78, 32, 230)),
        (44, 24, 16, (224, 78, 32, 230)),
        (22, 42, 16, (224, 78, 32, 230)),
        (42, 42, 16, (224, 78, 32, 230)),
        (32, 32, 21, (255, 142, 42, 245)),
        (32, 32, 14, (255, 224, 96, 255)),
        (32, 32, 8, (255, 255, 255, 255)),
    ):
        d.ellipse((bx - br, by - br, bx + br, by + br), fill=col)
    for a in range(0, 360, 30):
        x0 = 32 + int(sin(a * pi / 180) * 12)
        y0 = 32 + int(sin((a + 90) * pi / 180) * 12)
        x1 = 32 + int(sin(a * pi / 180) * 29)
        y1 = 32 + int(sin((a + 90) * pi / 180) * 29)
        d.line((x0, y0, x1, y1), fill=(255, 244, 168, 245), width=2)
    save(explosion, "effects/explosion.png")

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
        "flying_blades", "bagua_shields",
        "might", "armor", "swiftness", "cooldown", "area", "growth", "heal",
        "sound_on", "sound_off",
        "redhare", "vermilion", "white_tiger", "qilin",
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
        elif kind == "flying_blades":
            cd.ellipse((2, 2, 13, 13), outline=(56, 189, 248, 200), width=1)
            polygon(cd, [(8, 1), (10, 6), (15, 8), (10, 10), (8, 15), (6, 10), (1, 8), (6, 6)], (125, 211, 252, 255))
            cd.ellipse((6, 6, 10, 10), fill=(255, 255, 255, 255))
        elif kind == "bagua_shields":
            polygon(cd, [(5, 2), (11, 2), (14, 5), (14, 11), (11, 14), (5, 14), (2, 11), (2, 5)], (251, 191, 36, 255))
            polygon(cd, [(6, 4), (10, 4), (12, 6), (12, 10), (10, 12), (6, 12), (4, 10), (4, 6)], (146, 64, 14, 255), outline=None)
            cd.ellipse((6, 6, 10, 10), fill=(254, 240, 138, 255))
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
        elif kind == "sound_on":
            polygon(cd, [(2, 6), (5, 6), (9, 3), (9, 13), (5, 10), (2, 10)], (242, 199, 91, 255))
            cd.arc((8, 4, 13, 12), 300, 60, fill=(107, 255, 176, 255), width=1)
            cd.arc((9, 2, 15, 14), 300, 60, fill=(107, 255, 176, 255), width=1)
        elif kind == "sound_off":
            polygon(cd, [(2, 6), (5, 6), (9, 3), (9, 13), (5, 10), (2, 10)], (154, 166, 180, 255))
            line(cd, [(11, 5), (15, 11)], (255, 107, 107, 255), width=2)
            line(cd, [(15, 5), (11, 11)], (255, 107, 107, 255), width=2)
        elif kind == "redhare":
            polygon(cd, [(3, 12), (5, 5), (10, 3), (13, 6), (11, 10), (13, 13)], (238, 72, 54, 255))
            line(cd, [(4, 5), (8, 2)], (255, 214, 92, 255), width=2)
        elif kind == "vermilion":
            polygon(cd, [(2, 9), (8, 3), (14, 9), (10, 13), (6, 13)], (255, 118, 52, 255))
            polygon(cd, [(5, 8), (8, 4), (11, 8), (8, 12)], (255, 224, 96, 255))
        elif kind == "white_tiger":
            ellipse(cd, (3, 3, 13, 13), (235, 242, 252, 255))
            cd.rectangle((5, 6, 7, 8), fill=(72, 212, 255, 255))
            cd.rectangle((9, 6, 11, 8), fill=(72, 212, 255, 255))
        elif kind == "qilin":
            polygon(cd, [(4, 13), (6, 6), (11, 5), (13, 12)], (82, 224, 152, 255))
            line(cd, [(7, 5), (5, 2)], (255, 218, 92, 255), width=2)
            line(cd, [(10, 5), (12, 2)], (255, 218, 92, 255), width=2)
        icons.paste(cell, (idx * 16, 0))
    save(icons, "ui/icons.png")
    stages = Image.new("RGBA", (56 * 9, 32), (0, 0, 0, 0))
    stage_palettes = [
        ((34, 54, 30, 255), (56, 84, 46, 255), (124, 98, 62, 255), "glade"),
        ((58, 46, 26, 255), (88, 68, 38, 255), (218, 92, 42, 255), "fortress"),
        ((48, 32, 64, 255), (76, 50, 98, 255), (168, 112, 245, 255), "ring"),
        ((60, 36, 24, 255), (92, 54, 36, 255), (196, 78, 52, 255), "corridor"),
        ((68, 28, 26, 255), (104, 42, 38, 255), (224, 88, 56, 255), "fortress"),
        ((80, 22, 26, 255), (122, 34, 38, 255), (255, 96, 72, 255), "ring"),
        ((22, 50, 64, 255), (36, 78, 98, 255), (92, 184, 232, 255), "river"),
        ((26, 38, 70, 255), (44, 62, 108, 255), (122, 168, 245, 255), "armada"),
        ((50, 26, 68, 255), (82, 42, 108, 255), (245, 194, 82, 255), "flagship"),
    ]
    for s_idx, (bg_col, mid_col, acc_col, layout) in enumerate(stage_palettes):
        sc = Image.new("RGBA", (56, 32), bg_col)
        sd = ImageDraw.Draw(sc)
        # Subtle terrain texture bands
        for ty in range(0, 32, 6):
            sd.line([(0, ty), (55, ty)], fill=mid_col, width=1)
        if layout == "glade":
            polygon(sd, [(0, 22), (24, 15), (55, 19), (55, 27), (24, 23), (0, 29)], (112, 88, 54, 255))
            for tx, ty in ((8, 6), (42, 5), (14, 20), (45, 21)):
                ellipse(sd, (tx, ty, tx + 9, ty + 8), (48, 118, 54, 255))
            rect(sd, (26, 6, 30, 16), (218, 172, 54, 255))
        elif layout == "fortress":
            rect(sd, (6, 5, 50, 27), mid_col)
            for bx in range(8, 48, 8):
                rect(sd, (bx, 3, bx + 5, 9), (128, 134, 145, 255))
                rect(sd, (bx, 23, bx + 5, 29), (128, 134, 145, 255))
            ellipse(sd, (23, 11, 33, 21), acc_col)
        elif layout == "ring":
            sd.ellipse((10, 3, 46, 29), outline=acc_col, width=2)
            sd.ellipse((18, 8, 38, 24), fill=mid_col, outline=(245, 210, 102, 255))
            for px, py in ((10, 14), (43, 14), (26, 2), (26, 26)):
                rect(sd, (px, py, px + 4, py + 5), (210, 216, 228, 255))
        elif layout == "corridor":
            polygon(sd, [(0, 0), (55, 0), (48, 10), (8, 10)], (78, 64, 58, 255))
            polygon(sd, [(8, 22), (48, 22), (55, 31), (0, 31)], (78, 64, 58, 255))
            sd.line([(6, 16), (50, 16)], fill=acc_col, width=2)
            rect(sd, (42, 9, 50, 23), (148, 154, 166, 255))
        elif layout == "river":
            polygon(sd, [(0, 18), (55, 14), (55, 31), (0, 31)], (28, 96, 138, 255))
            sd.line([(4, 23), (22, 23)], fill=acc_col, width=1)
            sd.line([(28, 27), (50, 27)], fill=acc_col, width=1)
            for tx in (8, 22, 38):
                polygon(sd, [(tx + 4, 3), (tx, 14), (tx + 8, 14)], (42, 112, 74, 255))
        elif layout == "armada":
            rect(sd, (0, 0, 55, 31), (20, 42, 78, 255))
            polygon(sd, [(4, 6), (25, 6), (22, 26), (7, 26)], (118, 76, 44, 255))
            polygon(sd, [(31, 6), (52, 6), (49, 26), (34, 26)], (118, 76, 44, 255))
            sd.line([(22, 12), (34, 12)], fill=(192, 204, 218, 255), width=2)
            sd.line([(22, 20), (34, 20)], fill=(192, 204, 218, 255), width=2)
        elif layout == "flagship":
            rect(sd, (0, 0, 55, 31), (32, 22, 58, 255))
            polygon(sd, [(6, 5), (50, 5), (46, 27), (10, 27)], (136, 42, 48, 255))
            rect(sd, (18, 9, 38, 23), (188, 56, 58, 255))
            sd.rectangle((18, 9, 38, 23), outline=acc_col, width=1)
        stages.paste(sc, (s_idx * 56, 0))
    save(stages, "ui/stages.png")
    pets_sheet = Image.new("RGBA", (32 * 4, 32 * 4), (0, 0, 0, 0))
    pet_ids = ("redhare", "vermilion", "white_tiger", "qilin")
    for r_idx, pid in enumerate(pet_ids):
        for f_idx in range(4):
            pcell = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pcell)
            bob = (0, -2, -1, 1)[f_idx]
            # 4 distinct stride phases for each leg!
            leg_offsets = (
                (-2, 1, -1, 2),
                (0, -2, 2, -1),
                (2, -1, 1, -2),
                (-1, 2, -2, 0),
            )[f_idx]
            l0, l1, l2, l3 = leg_offsets
            OUTLINE = (22, 18, 22, 255)
            ellipse(pd, (6, 25, 26, 29), (10, 14, 18, 125), outline=None)
            if pid == "redhare":
                # Crimson Warhorse Spirit with 4-phase gallop, dark outline & 4px cell margin
                for lx in (9 + l0, 12 + l1, 17 + l2, 20 + l3):
                    rect(pd, (lx, 19 + bob, lx + 3, 26), (168, 38, 34, 255), outline=OUTLINE)
                    rect(pd, (lx, 24, lx + 3, 27), (255, 214, 82, 255), outline=OUTLINE)
                tail_y = (16, 14, 18, 20)[f_idx]
                polygon(pd, [(8, 14 + bob), (4, tail_y), (6, tail_y + 4), (10, 18 + bob)], (255, 174, 62, 255), outline=OUTLINE)
                ellipse(pd, (8, 11 + bob, 23, 21 + bob), (218, 52, 42, 255), outline=OUTLINE)
                ellipse(pd, (10, 12 + bob, 20, 17 + bob), (242, 82, 68, 255), outline=None)
                rect(pd, (12, 12 + bob, 18, 18 + bob), (246, 198, 74, 255), outline=OUTLINE)
                polygon(pd, [(18, 14 + bob), (21, 6 + bob), (27, 9 + bob), (24, 16 + bob)], (228, 58, 46, 255), outline=OUTLINE)
                polygon(pd, [(16, 11 + bob), (20, 4 + bob), (23, 8 + bob), (19, 13 + bob)], (255, 218, 88, 255), outline=OUTLINE)
                pd.rectangle((23, 8 + bob, 25, 10 + bob), fill=(255, 248, 162, 255))
            elif pid == "vermilion":
                # Vermilion Fire Phoenix with 4 distinct wing-flap angles & 4px cell margin
                wing_top = (4, 9, 15, 11)[f_idx]
                wing_bot = (17, 20, 23, 19)[f_idx]
                tail_spread = (-2, 0, 2, 1)[f_idx]
                polygon(pd, [(12, 19 + bob), (9 + tail_spread, 28), (16, 25), (23 - tail_spread, 28), (20, 19 + bob)], (255, 184, 68, 255), outline=OUTLINE)
                polygon(pd, [(15, 13 + bob), (4, wing_top), (6, wing_bot), (14, 18 + bob)], (238, 74, 38, 255), outline=OUTLINE)
                polygon(pd, [(17, 13 + bob), (28, wing_top), (26, wing_bot), (18, 18 + bob)], (238, 74, 38, 255), outline=OUTLINE)
                polygon(pd, [(14, 14 + bob), (7, wing_top + 2), (9, wing_bot - 1)], (255, 214, 82, 255), outline=None)
                polygon(pd, [(18, 14 + bob), (25, wing_top + 2), (23, wing_bot - 1)], (255, 214, 82, 255), outline=None)
                ellipse(pd, (11, 8 + bob, 21, 21 + bob), (255, 118, 48, 255), outline=OUTLINE)
                ellipse(pd, (13, 10 + bob, 19, 18 + bob), (255, 224, 96, 255), outline=None)
                polygon(pd, [(13, 7 + bob), (16, 2 + bob), (19, 7 + bob)], (255, 236, 104, 255), outline=OUTLINE)
                pd.rectangle((14, 10 + bob, 15, 11 + bob), fill=(255, 255, 255, 255))
                pd.rectangle((17, 10 + bob, 18, 11 + bob), fill=(255, 255, 255, 255))
            elif pid == "white_tiger":
                # Frost-fang White Tiger guardian with 4-phase prowl, dark outline & 4px cell margin
                for lx in (9 + l0, 12 + l1, 17 + l2, 21 + l3):
                    rect(pd, (lx, 19 + bob, lx + 3, 26), (218, 228, 242, 255), outline=OUTLINE)
                tail_y = (11, 14, 17, 13)[f_idx]
                polygon(pd, [(8, 15 + bob), (4, tail_y), (5, tail_y + 4), (9, 18 + bob)], (238, 246, 255, 255), outline=OUTLINE)
                ellipse(pd, (8, 11 + bob, 23, 21 + bob), (242, 248, 255, 255), outline=OUTLINE)
                for sx in (11, 14, 17):
                    line(pd, [(sx, 12 + bob), (sx - 1, 19 + bob)], (36, 44, 58, 255), width=2)
                ellipse(pd, (17, 8 + bob, 27, 18 + bob), (246, 250, 255, 255), outline=OUTLINE)
                pd.rectangle((20, 11 + bob, 22, 13 + bob), fill=(64, 224, 255, 255))
                pd.rectangle((24, 11 + bob, 26, 13 + bob), fill=(64, 224, 255, 255))
                line(pd, [(18, 15 + bob), (23, 17 + bob)], (245, 198, 76, 255), width=2)
            elif pid == "qilin":
                # Jade Celestial Qilin with 4-phase prance, outlined antlers & 4px cell margin
                for lx in (9 + l0, 12 + l1, 17 + l2, 20 + l3):
                    rect(pd, (lx, 19 + bob, lx + 3, 26), (52, 168, 112, 255), outline=OUTLINE)
                    rect(pd, (lx, 24, lx + 3, 27), (248, 210, 86, 255), outline=OUTLINE)
                tail_y = (14, 17, 19, 15)[f_idx]
                polygon(pd, [(8, 14 + bob), (4, tail_y), (6, tail_y + 4), (10, 18 + bob)], (128, 242, 184, 255), outline=OUTLINE)
                ellipse(pd, (8, 11 + bob, 23, 21 + bob), (72, 212, 142, 255), outline=OUTLINE)
                ellipse(pd, (11, 13 + bob, 19, 19 + bob), (158, 248, 198, 255), outline=None)
                polygon(pd, [(18, 14 + bob), (21, 7 + bob), (27, 9 + bob), (24, 16 + bob)], (82, 224, 152, 255), outline=OUTLINE)
                polygon(pd, [(19, 8 + bob), (17, 3 + bob), (21, 4 + bob), (22, 8 + bob)], (255, 222, 92, 255), outline=OUTLINE)
                polygon(pd, [(22, 8 + bob), (24, 3 + bob), (27, 5 + bob), (25, 8 + bob)], (255, 222, 92, 255), outline=OUTLINE)
                pd.rectangle((23, 9 + bob, 25, 11 + bob), fill=(255, 244, 142, 255))
            pets_sheet.paste(pcell, (f_idx * 32, r_idx * 32))
    save(pets_sheet, "pets/pets.png")

HEROES = {
    "guanyu": dict(cloth=(43, 139, 68, 255), accent=(208, 53, 43, 255), trim=(244, 203, 77, 255), hair=(28, 24, 27, 255), beard=(28, 24, 27, 255), helmet=True, plume=True, blade=True),
    "zhangfei": dict(cloth=(105, 48, 45, 255), accent=(206, 70, 55, 255), trim=(225, 106, 73, 255), hair=(30, 25, 27, 255), beard=(27, 23, 26, 255), helmet=True, spear=True),
    "zhaoyun": dict(cloth=(67, 126, 183, 255), accent=(238, 241, 235, 255), trim=(220, 230, 235, 255), hair=(39, 34, 40, 255), helmet=True, plume=True, bow=True),
    "zhugeliang": dict(cloth=(137, 87, 151, 255), accent=(235, 202, 111, 255), trim=(246, 224, 157, 255), hair=(43, 35, 46, 255), fan=True),
    "lubu": dict(cloth=(183, 49, 43, 255), accent=(245, 184, 56, 255), trim=(255, 224, 104, 255), hair=(36, 29, 31, 255), helmet=True, plume=True, halberd=True),
    "sunshangxiang": dict(cloth=(210, 93, 49, 255), accent=(255, 210, 71, 255), trim=(255, 235, 145, 255), hair=(52, 31, 33, 255), helmet=True, daggers=True),
}


def main():
    save(make_terrain(), "terrain/ground.png")
    save(make_props_atlas(), "terrain/props.png")
    make_effects()
    print(f"Generated terrain, props (with buildings), UI, and effects in {OUT}")


if __name__ == "__main__":
    main()
