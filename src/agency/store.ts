import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ContentItem, PostDraft, RetroReport, Source } from './types.ts';
import { logger } from './logger.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PLAYBOOK_FILE = path.join(DATA_DIR, 'playbook.md');

interface Db {
  sources: Source[];
  items: ContentItem[];
  posts: PostDraft[];
  retros: RetroReport[];
}

const DEFAULT_PLAYBOOK = `# Playbook editoriale

Questo playbook guida la generazione dei contenuti. Viene aggiornato
automaticamente dal ciclo di auto-miglioramento dell'agenzia.

## Linee guida iniziali
- Apri con un aggancio forte nelle prime parole: la prima riga decide se l'utente si ferma.
- Aggiungi sempre valore: contesto, un dato o un punto di vista, mai solo il link.
- Adatta tono e lunghezza alla piattaforma (breve e diretto su X, più discorsivo su LinkedIn/Facebook).
- Usa 2-4 hashtag pertinenti, mai generici.
- Chiudi con una call-to-action chiara (domanda, invito a commentare o ad approfondire).
- Non inventare fatti non presenti nella fonte.
`;

let db: Db = { sources: [], items: [], posts: [], retros: [] };
let saveTimer: NodeJS.Timeout | null = null;

export function newId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function hashLink(link: string): string {
  return crypto.createHash('sha1').update(link.trim()).digest('hex');
}

export function loadStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
      logger.info('store', `Database caricato: ${db.sources.length} fonti, ${db.items.length} contenuti, ${db.posts.length} post`);
    } catch (e: any) {
      logger.error('store', `Database corrotto, riparto da zero: ${e.message}`);
    }
  }
  if (!fs.existsSync(PLAYBOOK_FILE)) {
    fs.writeFileSync(PLAYBOOK_FILE, DEFAULT_PLAYBOOK);
  }
}

export function saveStore() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      // Limita la crescita del file: conserva gli ultimi 2000 contenuti e 5000 post.
      db.items = db.items.slice(-2000);
      db.posts = db.posts.slice(-5000);
      db.retros = db.retros.slice(-100);
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e: any) {
      logger.error('store', `Salvataggio fallito: ${e.message}`);
    }
  }, 500);
}

export function getDb(): Db {
  return db;
}

export function readPlaybook(): string {
  try {
    return fs.readFileSync(PLAYBOOK_FILE, 'utf-8');
  } catch {
    return DEFAULT_PLAYBOOK;
  }
}

export function writePlaybook(content: string) {
  fs.writeFileSync(PLAYBOOK_FILE, content);
}
