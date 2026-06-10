import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { loadStore } from './src/agency/store.ts';
import { loadConfig } from './src/agency/config.ts';
import { createAgencyRouter } from './src/agency/api.ts';
import { startEngine } from './src/agency/engine.ts';
import { logger } from './src/agency/logger.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Stato e configurazione dell'agenzia, poi API REST per la dashboard.
  loadStore();
  loadConfig();
  app.use('/api', createAgencyRouter());

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('server', `Dashboard agenzia su http://localhost:${PORT}`);
    // Il motore parte subito e lavora 24/7; si controlla dalla dashboard
    // o impostando ENGINE_AUTOSTART=false.
    if (process.env.ENGINE_AUTOSTART !== 'false') {
      startEngine();
    } else {
      logger.info('server', 'Motore in pausa (ENGINE_AUTOSTART=false): avviabile dalla dashboard');
    }
  });
}

startServer();
