import { createUISFX } from 'uisfx';

const SFX_URLS = {
  select: new URL('../assets/sfx/select.ogg', import.meta.url).href,
  start: new URL('../assets/sfx/start.ogg', import.meta.url).href,
  levelup: new URL('../assets/sfx/levelup.ogg', import.meta.url).href,
  upgrade: new URL('../assets/sfx/upgrade.ogg', import.meta.url).href,
  evolve: new URL('../assets/sfx/evolve.ogg', import.meta.url).href,
  chest: new URL('../assets/sfx/chest.ogg', import.meta.url).href,
  gem: new URL('../assets/sfx/gem.ogg', import.meta.url).href,
  heal: new URL('../assets/sfx/heal.ogg', import.meta.url).href,
  gameover: new URL('../assets/sfx/gameover.ogg', import.meta.url).href,
  slash: new URL('../assets/sfx/slash.wav', import.meta.url).href,
  thrust: new URL('../assets/sfx/thrust.wav', import.meta.url).href,
  spin: new URL('../assets/sfx/spin.wav', import.meta.url).href,
  shoot: new URL('../assets/sfx/shoot.wav', import.meta.url).href,
  hit: new URL('../assets/sfx/hit.wav', import.meta.url).href,
  hurt: new URL('../assets/sfx/hurt.wav', import.meta.url).href,
  bomb: new URL('../assets/sfx/bomb.wav', import.meta.url).href,
};

// Map semantic cues to uisfx (https://uisfx.com) arcade synthesizer cues
const UISFX_CUE_MAP = {
  select: 'select',
  start: 'start',
  upgrade: 'bonus',
  toggleOn: 'toggle-on',
  toggleOff: 'toggle-off',
};

const CUE_CONFIG = {
  select: { vol: 0.42, minIntervalMs: 35, jitter: 0.02 },
  start: { vol: 0.58, minIntervalMs: 120, jitter: 0.0 },
  levelup: { vol: 0.65, minIntervalMs: 180, jitter: 0.0 },
  upgrade: { vol: 0.55, minIntervalMs: 80, jitter: 0.02 },
  evolve: { vol: 0.78, minIntervalMs: 250, jitter: 0.0 },
  chest: { vol: 0.68, minIntervalMs: 150, jitter: 0.02 },
  gem: { vol: 0.26, minIntervalMs: 55, jitter: 0.14 },
  gameover: { vol: 0.72, minIntervalMs: 300, jitter: 0.0 },
  slash: { vol: 0.44, minIntervalMs: 85, jitter: 0.10 },
  thrust: { vol: 0.46, minIntervalMs: 85, jitter: 0.10 },
  spin: { vol: 0.50, minIntervalMs: 95, jitter: 0.08 },
  shoot: { vol: 0.34, minIntervalMs: 75, jitter: 0.12 },
  hit: { vol: 0.32, minIntervalMs: 65, jitter: 0.14 },
  hurt: { vol: 0.62, minIntervalMs: 180, jitter: 0.06 },
  heal: { vol: 0.56, minIntervalMs: 100, jitter: 0.02 },
  bomb: { vol: 0.78, minIntervalMs: 140, jitter: 0.05 },
  toggleOn: { vol: 0.40, minIntervalMs: 40, jitter: 0.0 },
  toggleOff: { vol: 0.40, minIntervalMs: 40, jitter: 0.0 },
};
export const ELEVENLABS_SFX_PROMPTS = {
  slash: { text: 'Sharp metallic guandao heavy blade slash whoosh cutting through air', durationSeconds: 0.7 },
  thrust: { text: 'Fast heavy iron spear lance thrust piercing forward with sharp air crack', durationSeconds: 0.7 },
  spin: { text: 'Powerful heavy halberd 360 degree whirlwind spin whoosh cutting through wind', durationSeconds: 0.9 },
  shoot: { text: 'Crisp recurve war bow string release and fast arrow flight whoosh', durationSeconds: 0.6 },
  hit: { text: 'Punchy melee weapon impact hit on armor with brief metallic spark', durationSeconds: 0.5 },
  hurt: { text: 'Heavy armor impact thud when warrior takes damage', durationSeconds: 0.6 },
  bomb: { text: 'Black powder thunder bomb explosion with deep fiery blast wave and debris crackle', durationSeconds: 1.4 },
  heal: { text: 'Warm shimmering emerald health recovery chime with gentle rising magical sparkle', durationSeconds: 1.0 },
};

const STORAGE_KEY = '3k-survivors-sfx-enabled';

export class SoundManager {
  constructor() {
    let saved = true;
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (raw !== null) saved = raw !== 'false';
    } catch {
      saved = true;
    }
    this.enabled = saved;
    this.volume = 0.75;
    this.ctx = null;
    this.unlocked = false;
    this.buffers = new Map();
    this.rawBytes = new Map();
    this.lastPlayedAt = new Map();
    this.playedCounts = {};
    this.lastCue = null;

    this.uisfx = createUISFX({
      pack: 'arcade',
      volume: this.volume,
      enabled: this.enabled,
    });
  }

  async preload() {
    await Promise.all(
      Object.entries(SFX_URLS).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            this.rawBytes.set(key, buf);
          }
        } catch {
          // Ignore network/fetch errors in offline or restricted environments
        }
      }),
    );
  }

  async generateWithElevenLabs(cue, customPrompt = null) {
    const spec = ELEVENLABS_SFX_PROMPTS[cue] || { text: customPrompt || cue, durationSeconds: 0.8 };
    const res = await fetch('/api/sfx/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: customPrompt || spec.text,
        durationSeconds: spec.durationSeconds,
        promptInfluence: 0.75,
      }),
    });
    if (!res.ok) throw new Error(`Failed to generate SFX for ${cue}`);
    const buf = await res.arrayBuffer();
    this.rawBytes.set(cue, buf);
    if (this.ctx) {
      const audioBuf = await this.ctx.decodeAudioData(buf.slice(0));
      this.buffers.set(cue, audioBuf);
    }
    return true;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    if (this.ctx && this.buffers.size === 0 && this.rawBytes.size > 0) {
      for (const [key, bytes] of this.rawBytes.entries()) {
        this.ctx.decodeAudioData(bytes.slice(0))
          .then((audioBuf) => this.buffers.set(key, audioBuf))
          .catch(() => {});
      }
    }
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (!next && this.uisfx) {
      this.uisfx.stopAll();
    }
    this.enabled = next;
    if (this.uisfx) {
      this.uisfx.setEnabled(next);
    }
    try {
      window.localStorage?.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore storage quota / privacy errors
    }
    if (next) {
      this.unlock();
      this.play('toggleOn');
    }
    return this.enabled;
  }

  toggleMute() {
    if (this.enabled) {
      this.play('toggleOff');
      return this.setEnabled(false);
    }
    return this.setEnabled(true);
  }

  play(cue) {
    if (!this.enabled) return false;
    const cfg = CUE_CONFIG[cue] || { vol: 0.4, minIntervalMs: 60, jitter: 0.05 };
    const now = performance.now();
    const prev = this.lastPlayedAt.get(cue) || -Infinity;
    if (now - prev < cfg.minIntervalMs) return false;
    this.lastPlayedAt.set(cue, now);

    this.playedCounts[cue] = (this.playedCounts[cue] || 0) + 1;
    this.lastCue = cue;

    // 1. Play decoded ElevenLabs / bundled AudioBuffer with micro-pitch jitter when available
    if (this.ctx && this.buffers.has(cue)) {
      try {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers.get(cue);
        if (cfg.jitter > 0) {
          source.playbackRate.value = 1 + (Math.random() * 2 - 1) * cfg.jitter;
        }
        const gain = this.ctx.createGain();
        gain.gain.value = cfg.vol * this.volume;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return true;
      } catch {
        // Fall through to uisfx synthesizer
      }
    }

    // 2. UI / fallback cues use uisfx live arcade synthesizer
    const uiCue = UISFX_CUE_MAP[cue];
    if (uiCue && this.uisfx) {
      try {
        const res = this.uisfx.play(uiCue, { volume: cfg.vol * this.volume });
        if (res) return true;
      } catch {
        return false;
      }
    }

    return true;
  }
}
