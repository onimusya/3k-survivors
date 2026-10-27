import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const OUT_DIR = join(process.cwd(), 'assets/bgm');
mkdirSync(OUT_DIR, { recursive: true });

export const MAP_BGM_TRACKS = [
  {
    id: 'outskirts',
    file: 'outskirts.mp3',
    prompt: 'Heroic ancient Chinese Three Kingdoms battlefield instrumental music with guzheng zither, dizi bamboo flute, and driving war drums, upbeat action RPG loop',
    sfxFallbackPrompt: 'Seamless rhythmic ancient Chinese guzheng and war drum battle music loop, heroic Three Kingdoms instrumental background music',
    musicLengthMs: 20000,
    durationSeconds: 14.0,
  },
  {
    id: 'hulao',
    file: 'hulao.mp3',
    prompt: 'Intense dark Three Kingdoms fortress siege instrumental battle music with pounding war drums, fierce erhu strings, and brass horns, fast action loop',
    sfxFallbackPrompt: 'Seamless intense ancient war drums and low brass siege battle music loop, dark Three Kingdoms fortress instrumental background music',
    musicLengthMs: 20000,
    durationSeconds: 14.0,
  },
  {
    id: 'redcliffs',
    file: 'redcliffs.mp3',
    prompt: 'Epic cinematic Three Kingdoms naval armada war instrumental music with sweeping Chinese strings, pipa lute, thunderous percussion, and heroic brass',
    sfxFallbackPrompt: 'Seamless epic Chinese pipa lute, orchestral strings, and naval war drum battle music loop, Red Cliffs armada instrumental background music',
    musicLengthMs: 20000,
    durationSeconds: 14.0,
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
  for (const track of MAP_BGM_TRACKS) {
    const outPath = join(OUT_DIR, track.file);
    try {
      console.log(`Composing ElevenLabs Music BGM [${track.id}] -> ${track.file} ...`);
      const audio = await client.music.compose({
        prompt: track.prompt,
        musicLengthMs: track.musicLengthMs,
        modelId: 'music_v2_5',
        forceInstrumental: true,
      });
      await saveStream(audio, outPath);
      console.log(`Saved music.compose BGM: ${track.file}`);
    } catch (err) {
      console.log(`music.compose unavailable (${err?.statusCode || err?.message}), generating looping BGM via textToSoundEffects.convert ...`);
      const audio = await client.textToSoundEffects.convert({
        text: track.sfxFallbackPrompt,
        durationSeconds: track.durationSeconds,
        promptInfluence: 0.75,
        loop: true,
      });
      await saveStream(audio, outPath);
      console.log(`Saved looping BGM: ${track.file}`);
    }
  }
  console.log(`Generated ${MAP_BGM_TRACKS.length} map BGM tracks in ${OUT_DIR}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('BGM generation error:', err?.message || err);
    process.exit(1);
  });
}
