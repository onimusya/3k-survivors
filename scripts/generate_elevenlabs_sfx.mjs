import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const OUT_DIR = join(process.cwd(), 'assets/sfx');
mkdirSync(OUT_DIR, { recursive: true });

export const GAME_SFX_RECIPES = [
  {
    id: 'slash',
    file: 'slash.wav',
    text: 'Sharp metallic guandao heavy blade slash whoosh cutting through air, crisp action RPG combat sound effect',
    durationSeconds: 0.7,
    promptInfluence: 0.75,
  },
  {
    id: 'thrust',
    file: 'thrust.wav',
    text: 'Fast heavy iron spear lance thrust piercing forward with sharp air crack, action game combat sound',
    durationSeconds: 0.7,
    promptInfluence: 0.75,
  },
  {
    id: 'spin',
    file: 'spin.wav',
    text: 'Powerful heavy halberd 360 degree whirlwind spin whoosh cutting through wind, action game weapon sound',
    durationSeconds: 0.9,
    promptInfluence: 0.75,
  },
  {
    id: 'shoot',
    file: 'shoot.wav',
    text: 'Crisp recurve war bow string release and fast arrow flight whoosh, arcade action game sound effect',
    durationSeconds: 0.6,
    promptInfluence: 0.75,
  },
  {
    id: 'hit',
    file: 'hit.wav',
    text: 'Punchy melee weapon impact hit on armor with brief metallic spark, arcade survivor game hit sound',
    durationSeconds: 0.5,
    promptInfluence: 0.8,
  },
  {
    id: 'hurt',
    file: 'hurt.wav',
    text: 'Heavy armor impact thud when warrior takes damage, crisp retro action game damage sound effect',
    durationSeconds: 0.6,
    promptInfluence: 0.75,
  },
  {
    id: 'bomb',
    file: 'bomb.wav',
    text: 'Black powder thunder bomb explosion with deep fiery blast wave and debris crackle, action game explosion',
    durationSeconds: 1.4,
    promptInfluence: 0.8,
  },
  {
    id: 'heal',
    file: 'heal.ogg',
    text: 'Warm shimmering emerald health recovery chime with gentle rising magical sparkle, RPG heal sound effect',
    durationSeconds: 1.0,
    promptInfluence: 0.75,
  },
  {
    id: 'gem',
    file: 'gem.ogg',
    text: 'Short bright crystal XP gem pickup ding, crisp high-pitched arcade coin crystal chime',
    durationSeconds: 0.5,
    promptInfluence: 0.8,
  },
  {
    id: 'chest',
    file: 'chest.ogg',
    text: 'Wooden war treasure chest unlatching with golden coin shimmer and triumphant chime, RPG reward sound',
    durationSeconds: 1.2,
    promptInfluence: 0.75,
  },
  {
    id: 'levelup',
    file: 'levelup.ogg',
    text: 'Heroic Three Kingdoms brass and chime level up fanfare, short triumphant RPG power up jingle',
    durationSeconds: 1.4,
    promptInfluence: 0.75,
  },
  {
    id: 'evolve',
    file: 'evolve.ogg',
    text: 'Epic celestial dragon weapon evolution fanfare with resonant gong and ascending magical chord',
    durationSeconds: 1.8,
    promptInfluence: 0.75,
  },
];

async function saveStream(streamOrBytes, outPath) {
  if (streamOrBytes && typeof streamOrBytes.pipe === 'function') {
    await pipeline(streamOrBytes, createWriteStream(outPath));
    return;
  }
  if (streamOrBytes && typeof streamOrBytes.getReader === 'function') {
    await pipeline(Readable.fromWeb(streamOrBytes), createWriteStream(outPath));
    return;
  }
  const chunks = [];
  for await (const chunk of streamOrBytes) {
    chunks.push(Buffer.from(chunk));
  }
  await pipeline(Readable.from(Buffer.concat(chunks)), createWriteStream(outPath));
}

async function main() {
  const client = new ElevenLabsClient();
  const filterIds = process.argv.slice(2);
  const list = filterIds.length
    ? GAME_SFX_RECIPES.filter((r) => filterIds.includes(r.id))
    : GAME_SFX_RECIPES;

  for (const item of list) {
    const outPath = join(OUT_DIR, item.file);
    console.log(`Generating ElevenLabs SFX [${item.id}] -> ${item.file} ...`);
    const audio = await client.textToSoundEffects.convert({
      text: item.text,
      durationSeconds: item.durationSeconds,
      promptInfluence: item.promptInfluence,
    });
    await saveStream(audio, outPath);
  }
  console.log(`Generated ${list.length} ElevenLabs sound effects in ${OUT_DIR}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('ElevenLabs SFX generation error:', err?.message || err);
    process.exit(1);
  });
}
