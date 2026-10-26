#!/usr/bin/env python3
"""Bundle CC0 UI SFX from `uisfx` (https://uisfx.com) and synthesize combat SFX
using `earshot` (https://leonxlnx.github.io/earshot-site/) physical recipes:
- Bessel membrane modes [1.0, 1.594, 2.136, 2.296] with exponential pitch glide
- Strouhal aeolian blade/spear swish + filtered air band
- Soft tanh console saturation
"""

from pathlib import Path
from math import pi, sin, cos, exp, tanh, sqrt
import random
import shutil
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "sfx"
UISFX_DIR = ROOT / "node_modules" / "uisfx" / "sounds"
SR = 24000
MEMBRANE_RATIOS = (1.0, 1.594, 2.136, 2.296)


def save_wav(samples, name):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    peak = max((abs(s) for s in samples), default=1.0) or 1.0
    scale = 0.88 / peak if peak > 0.88 else 1.0
    pcm = bytearray()
    for s in samples:
        v = max(-1.0, min(1.0, s * scale))
        pcm += struct.pack("<h", int(v * 32767))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(bytes(pcm))


def glide_phase(t, f_start, f_end, tau):
    return 2.0 * pi * (f_end * t + (f_start - f_end) * tau * (1.0 - exp(-t / max(tau, 1e-4))))


def env_ar(t, attack, tau):
    e = exp(-t / max(tau, 1e-4))
    if attack > 0 and t < attack:
        e *= 0.5 - 0.5 * cos(pi * t / attack)
    return e


def make_swish(duration, rise, fall, f_peak, doppler_drop, metallic=0.0, seed=1):
    """earshot swish.py recipe: narrow Strouhal whistle + filtered air band."""
    rng = random.Random(seed)
    n = int(duration * SR)
    out = []
    lp1 = 0.0
    lp2 = 0.0
    for i in range(n):
        t = i / SR
        if t < rise:
            env = (t / rise) ** 1.1
        else:
            env = exp(-(t - rise) / max(fall, 0.02))
        progress = min(1.0, t / max(duration, 1e-4))
        freq = f_peak * (1.25 - doppler_drop * progress)
        alpha = min(0.85, max(0.04, 2.0 * pi * freq / SR))
        wn = rng.uniform(-1.0, 1.0)
        lp1 += alpha * (wn - lp1)
        lp2 += alpha * 0.5 * (lp1 - lp2)
        band = lp1 - lp2
        whistle = sin(glide_phase(t, f_peak * 1.35, f_peak * (1.0 - 0.35 * doppler_drop), fall))
        ring = sin(2.0 * pi * (f_peak * 2.4) * t) * exp(-t / 0.045) * metallic
        sample = env * (0.68 * band + 0.28 * whistle) + ring
        out.append(tanh(1.6 * sample))
    return out


def make_impact(duration, f0, f1, drop_tau, body_tau, crack_amp, seed=7):
    """earshot impact.py recipe: Bessel membrane modes + pitch drop + contact crack."""
    rng = random.Random(seed)
    n = int(duration * SR)
    out = []
    lp = 0.0
    for i in range(n):
        t = i / SR
        body_env = env_ar(t, 0.002, body_tau)
        base_phase = glide_phase(t, f0, f1, drop_tau)
        membrane = 0.0
        for idx, ratio in enumerate(MEMBRANE_RATIOS):
            mode_decay = exp(-t / max(body_tau / (1.0 + 0.7 * idx), 0.008))
            membrane += (0.65 / (idx + 1)) * sin(base_phase * ratio) * mode_decay
        wn = rng.uniform(-1.0, 1.0)
        lp += 0.35 * (wn - lp)
        crack = (wn - lp) * exp(-t / 0.012) * crack_amp
        sample = body_env * membrane + crack
        out.append(tanh(2.1 * sample))
    return out


def make_bow_shot(seed=11):
    """Bowstring twang (Karplus-like modal pluck) + fast arrow air zip."""
    rng = random.Random(seed)
    duration = 0.16
    n = int(duration * SR)
    out = []
    for i in range(n):
        t = i / SR
        string_env = exp(-t / 0.045)
        twang = (
            0.55 * sin(glide_phase(t, 340.0, 195.0, 0.025))
            + 0.30 * sin(glide_phase(t, 680.0, 390.0, 0.018))
        ) * string_env
        zip_env = env_ar(t, 0.012, 0.04)
        zip_noise = rng.uniform(-1.0, 1.0) * sin(2.0 * pi * 1450.0 * t) * zip_env * 0.35
        out.append(tanh(1.8 * (twang + zip_noise)))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # 1. Copy CC0 semantic cues from uisfx (https://uisfx.com)
    uisfx_map = {
        "select.ogg": ("arcade", "select.ogg"),
        "start.ogg": ("arcade", "start.ogg"),
        "levelup.ogg": ("arcade", "level-up.ogg"),
        "upgrade.ogg": ("arcade", "bonus.ogg"),
        "evolve.ogg": ("arcade", "achievement.ogg"),
        "chest.ogg": ("arcade", "reward.ogg"),
        "gem.ogg": ("arcade", "snap.ogg"),
        "heal.ogg": ("arcade", "success.ogg"),
        "gameover.ogg": ("cinematic", "error.ogg"),
    }
    for dest_name, (pack, src_name) in uisfx_map.items():
        src_path = UISFX_DIR / pack / src_name
        if src_path.exists():
            shutil.copyfile(src_path, OUT / dest_name)

    # 2. Render earshot-recipe physical combat WAVs
    save_wav(make_swish(0.16, 0.038, 0.075, 920.0, 0.42, metallic=0.22, seed=101), "slash.wav")
    save_wav(make_swish(0.15, 0.028, 0.068, 1180.0, 0.55, metallic=0.28, seed=102), "thrust.wav")
    save_wav(make_swish(0.22, 0.055, 0.110, 460.0, 0.38, metallic=0.15, seed=103), "spin.wav")
    save_wav(make_bow_shot(seed=104), "shoot.wav")
    save_wav(make_impact(0.11, 210.0, 58.0, 0.018, 0.048, crack_amp=0.65, seed=105), "hit.wav")
    save_wav(make_impact(0.22, 145.0, 36.0, 0.032, 0.095, crack_amp=0.85, seed=106), "hurt.wav")
    save_wav(make_impact(0.38, 165.0, 28.0, 0.045, 0.165, crack_amp=1.15, seed=107), "bomb.wav")
    print(f"Generated and bundled 16 SFX files in {OUT}")


if __name__ == "__main__":
    main()
