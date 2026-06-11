import { Router } from 'express';
import type { Platform, Source, SourceType } from './types.ts';
import { ALL_PLATFORMS } from './types.ts';
import { getConfig, updateConfig, platformConfigured } from './config.ts';
import { getDb, newId, saveStore, readPlaybook } from './store.ts';
import { logger } from './logger.ts';
import { evaluateGoals } from './goals.ts';
import { aiAvailable } from './ai/gemini.ts';
import {
  editorialProgress,
  engineStatus,
  runTask,
  startEngine,
  stopEngine,
  type TaskName,
} from './engine.ts';

export function createAgencyRouter(): Router {
  const router = Router();

  // ------------------------------------------------------------ stato generale
  router.get('/status', (_req, res) => {
    const db = getDb();
    const platforms = {} as Record<Platform, { enabled: boolean; configured: boolean }>;
    for (const p of ALL_PLATFORMS) {
      platforms[p] = { enabled: getConfig().platforms[p].enabled, configured: platformConfigured(p) };
    }
    res.json({
      engine: engineStatus(),
      aiAvailable: aiAvailable(),
      editorial: editorialProgress(),
      platforms,
      counts: {
        sources: db.sources.length,
        items: db.items.length,
        itemsNew: db.items.filter((i) => i.status === 'new').length,
        draftsPending: db.posts.filter((p) => p.status === 'draft').length,
        approved: db.posts.filter((p) => p.status === 'approved').length,
        published: db.posts.filter((p) => p.status === 'published' || p.status === 'simulated').length,
        failed: db.posts.filter((p) => p.status === 'failed').length,
      },
      goals: evaluateGoals(),
      lastRetro: db.retros.at(-1) ?? null,
    });
  });

  // ------------------------------------------------------------------- fonti
  router.get('/sources', (_req, res) => res.json(getDb().sources));

  router.post('/sources', (req, res) => {
    const { type, name, url, tags } = req.body as { type: SourceType; name?: string; url?: string; tags?: string[] };
    if (!url || !['rss', 'youtube', 'website'].includes(type)) {
      return res.status(400).json({ error: 'Servono "url" e "type" (rss | youtube | website)' });
    }
    const source: Source = {
      id: newId(),
      type,
      name: name?.trim() || url,
      url: url.trim(),
      enabled: true,
      tags: tags ?? [],
    };
    getDb().sources.push(source);
    saveStore();
    logger.info('sources', `Nuova fonte ${type}: ${source.name}`);
    res.status(201).json(source);
  });

  router.patch('/sources/:id', (req, res) => {
    const source = getDb().sources.find((s) => s.id === req.params.id);
    if (!source) return res.status(404).json({ error: 'Fonte non trovata' });
    const { name, url, enabled, tags } = req.body;
    if (typeof name === 'string') source.name = name;
    if (typeof url === 'string') source.url = url;
    if (typeof enabled === 'boolean') source.enabled = enabled;
    if (Array.isArray(tags)) source.tags = tags;
    saveStore();
    res.json(source);
  });

  router.delete('/sources/:id', (req, res) => {
    const db = getDb();
    const idx = db.sources.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Fonte non trovata' });
    const [removed] = db.sources.splice(idx, 1);
    saveStore();
    logger.info('sources', `Fonte rimossa: ${removed.name}`);
    res.json({ ok: true });
  });

  // --------------------------------------------------------------- contenuti
  router.get('/items', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(
      [...getDb().items]
        .sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))
        .slice(0, limit),
    );
  });

  // -------------------------------------------------------------------- post
  router.get('/posts', (req, res) => {
    const status = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    let posts = [...getDb().posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    if (status) posts = posts.filter((p) => p.status === status);
    res.json(posts.slice(0, limit));
  });

  // Approva una bozza; con "scheduledAt" nel body la pianifica per data e ora
  // scelte (es. piano editoriale a 15 giorni), altrimenti esce appena possibile.
  router.post('/posts/:id/approve', (req, res) => {
    const post = getDb().posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });
    const { scheduledAt } = req.body ?? {};
    if (scheduledAt !== undefined && Number.isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({ error: 'Data di pianificazione non valida' });
    }
    post.status = 'approved';
    post.scheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString();
    post.error = undefined;
    saveStore();
    res.json(post);
  });

  router.post('/posts/:id/reject', (req, res) => {
    const post = getDb().posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });
    post.status = 'rejected';
    saveStore();
    res.json(post);
  });

  router.patch('/posts/:id', (req, res) => {
    const post = getDb().posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });
    if (typeof req.body.text === 'string' && req.body.text.trim()) {
      post.text = req.body.text.trim();
    }
    if (typeof req.body.scheduledAt === 'string') {
      if (Number.isNaN(Date.parse(req.body.scheduledAt))) {
        return res.status(400).json({ error: 'Data di pianificazione non valida' });
      }
      post.scheduledAt = new Date(req.body.scheduledAt).toISOString();
    }
    saveStore();
    res.json(post);
  });

  // Riporta in bozza un post approvato (per ripensamenti durante la pianificazione).
  router.post('/posts/:id/unapprove', (req, res) => {
    const post = getDb().posts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post non trovato' });
    if (post.status !== 'approved') return res.status(400).json({ error: 'Solo i post approvati possono tornare in bozza' });
    post.status = 'draft';
    post.scheduledAt = undefined;
    saveStore();
    res.json(post);
  });

  // ------------------------------------------------- configurazione e goal
  router.get('/config', (_req, res) => res.json(getConfig()));
  router.put('/config', (req, res) => res.json(updateConfig(req.body)));

  router.get('/playbook', (_req, res) => res.json({ playbook: readPlaybook() }));
  router.get('/retros', (_req, res) => res.json([...getDb().retros].reverse().slice(0, 20)));

  // ------------------------------------------------------------------ motore
  router.post('/engine/start', (_req, res) => {
    startEngine();
    res.json(engineStatus());
  });
  router.post('/engine/stop', (_req, res) => {
    stopEngine();
    res.json(engineStatus());
  });
  router.post('/engine/run/:task', async (req, res) => {
    const task = req.params.task as TaskName;
    if (!['ingest', 'generate', 'publish', 'retro'].includes(task)) {
      return res.status(400).json({ error: 'Task sconosciuto' });
    }
    await runTask(task);
    res.json(engineStatus());
  });

  // --------------------------------------------------------------------- log
  router.get('/logs', (req, res) => {
    res.json(logger.recent(Math.min(Number(req.query.limit) || 200, 1000)));
  });

  return router;
}
