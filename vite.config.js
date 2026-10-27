import { defineConfig, loadEnv } from 'vite';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

function elevenLabsSfxPlugin() {
  return {
    name: 'elevenlabs-sfx-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/sfx/generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const client = new ElevenLabsClient();
          const audio = await client.textToSoundEffects.convert({
            text: body.text || 'Crisp retro arcade sword slash sound effect',
            durationSeconds: body.durationSeconds ?? 1.0,
            promptInfluence: body.promptInfluence ?? 0.65,
          });
          const outChunks = [];
          for await (const chunk of audio) {
            outChunks.push(Buffer.from(chunk));
          }
          const audioBuffer = Buffer.concat(outChunks);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.end(audioBuffer);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'ElevenLabs SFX error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ELEVENLABS_API_KEY && !process.env.ELEVENLABS_API_KEY) {
    process.env.ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;
  }
  return {
    base: './',
    plugins: [elevenLabsSfxPlugin()],
    server: { port: 5173, host: '0.0.0.0' },
    build: { outDir: 'dist', sourcemap: true },
  };
});