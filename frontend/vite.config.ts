import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs/promises';
import {defineConfig, type Plugin} from 'vite';

const developerLogFileApi = (): Plugin => ({
  name: 'ukkkk-developer-log-file-api',
  configureServer(server) {
    const logsRoot = path.resolve(__dirname, '../data/developer_logs');
    const safeName = (value: unknown, fallback: string) => {
      const cleaned = String(value || fallback)
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}._-]+/gu, '_')
        .replace(/^_+|_+$/g, '');
      return cleaned || fallback;
    };
    const readBody = async (request: NodeJS.ReadableStream) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    };

    server.middlewares.use('/api/developer-logs', async (request, response) => {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        if (request.method === 'GET') {
          await fs.mkdir(logsRoot, { recursive: true });
          const authors = await fs.readdir(logsRoot, { withFileTypes: true });
          const logs: unknown[] = [];
          for (const author of authors.filter((entry) => entry.isDirectory())) {
            const authorDir = path.join(logsRoot, author.name);
            const files = await fs.readdir(authorDir);
            for (const file of files.filter((name) => name.endsWith('.json'))) {
              try {
                logs.push(JSON.parse(await fs.readFile(path.join(authorDir, file), 'utf8')));
              } catch {
                // 손상된 단일 로그가 전체 목록 로드를 막지 않게 건너뛴다.
              }
            }
          }
          response.end(JSON.stringify(logs));
          return;
        }
        if (request.method === 'POST') {
          const log = await readBody(request);
          const author = safeName(log.createdBy, 'local-user');
          const id = safeName(log.id, `DEVLOG-${Date.now()}`);
          const authorDir = path.join(logsRoot, author);
          await fs.mkdir(authorDir, { recursive: true });
          await fs.writeFile(
            path.join(authorDir, `${id}.json`),
            `${JSON.stringify(log, null, 2)}\n`,
            'utf8',
          );
          response.statusCode = 201;
          response.end(JSON.stringify({ ok: true, author, id }));
          return;
        }
        response.statusCode = 405;
        response.end(JSON.stringify({ error: 'Method not allowed' }));
      } catch (error) {
        response.statusCode = 500;
        response.end(JSON.stringify({
          error: error instanceof Error ? error.message : 'Developer log file error',
        }));
      }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), developerLogFileApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-genai';
              }
              return 'vendor';
            }
            if (id.includes('src/data') || id.includes('src/mockData')) {
              return 'data-mock';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
