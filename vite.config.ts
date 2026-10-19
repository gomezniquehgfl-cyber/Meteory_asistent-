import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleGeminiChat } from './src/server/geminiHandler.ts';
import { handleNeuralTTS } from './src/server/ttsHandler.ts';

function apiChatPlugin(): Plugin {
  return {
    name: 'api-chat-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Chat endpoint
        if (req.url?.startsWith('/api/chat') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const result = await handleGeminiChat(body);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err: unknown) {
              const error = err as Error;
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error?.message || 'Error en el núcleo de IA' }));
            }
          });
          return;
        }

        // Neural TTS endpoint (100% Free & Unlimited Microsoft Neural JARVIS Voice)
        if (req.url?.startsWith('/api/tts') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const audioBuffer = await handleNeuralTTS(body);
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Content-Length', audioBuffer.length);
              res.statusCode = 200;
              res.end(audioBuffer);
            } catch (err: unknown) {
              const error = err as Error;
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error?.message || 'Error en síntesis neural' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiChatPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
