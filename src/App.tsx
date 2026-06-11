import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe,
  ListChecks,
  Newspaper,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rss,
  Send,
  Settings,
  Target,
  Trash2,
  XCircle,
  Youtube,
} from 'lucide-react';

// ----------------------------------------------------------------- tipi API

type Platform = 'telegram' | 'mastodon' | 'twitter' | 'facebook' | 'instagram' | 'linkedin';
const PLATFORM_LABELS: Record<Platform, string> = {
  telegram: 'Telegram',
  mastodon: 'Mastodon',
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

interface Status {
  engine: { running: boolean; startedAt: string | null; tasks: Record<string, { lastRunAt?: string; running: boolean }> };
  aiAvailable: boolean;
  editorial: {
    phase: 'backfill' | 'fresh';
    articlesTotal: number;
    backfillTarget: number;
    articlesToday: number;
    dailyQuota: number;
  };
  platforms: Record<Platform, { enabled: boolean; configured: boolean }>;
  counts: {
    sources: number;
    items: number;
    itemsNew: number;
    draftsPending: number;
    approved: number;
    published: number;
    failed: number;
  };
  goals: { goal: { id: string; description: string; target: number; direction: string }; current: number; achieved: boolean }[];
  lastRetro: { ts: string; analysis: string; playbookUpdated: boolean } | null;
}

interface Source {
  id: string;
  type: 'rss' | 'youtube' | 'website';
  name: string;
  url: string;
  enabled: boolean;
  lastFetchedAt?: string;
  lastError?: string;
}

interface Post {
  id: string;
  platform: Platform;
  text: string;
  itemTitle: string;
  itemLink: string;
  qualityScore?: number;
  critique?: string;
  status: string;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
}

interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error';
  scope: string;
  message: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function timeAgo(iso?: string): string {
  if (!iso) return 'mai';
  const diff = Date.now() - Date.parse(iso);
  if (diff < 60_000) return 'adesso';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h fa`;
  return new Date(iso).toLocaleString('it-IT');
}

// ------------------------------------------------------------ componenti UI

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 ${className}`}>{children}</div>;
}

function Badge({ tone, children }: { tone: 'green' | 'red' | 'yellow' | 'zinc' | 'blue'; children: React.ReactNode }) {
  const tones = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    zinc: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    blue: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function Button({
  onClick,
  children,
  variant = 'primary',
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const styles = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    ghost: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

const SOURCE_ICONS = { rss: Rss, youtube: Youtube, website: Globe };

// -------------------------------------------------------------------- viste

function Overview({ status, refresh }: { status: Status; refresh: () => void }) {
  const run = async (task: string) => {
    await api(`/engine/run/${task}`, { method: 'POST' });
    refresh();
  };
  const toggleEngine = async () => {
    await api(`/engine/${status.engine.running ? 'stop' : 'start'}`, { method: 'POST' });
    refresh();
  };

  const counts = status.counts;
  const stats: [string, number][] = [
    ['Fonti', counts.sources],
    ['Contenuti raccolti', counts.items],
    ['Da elaborare', counts.itemsNew],
    ['Da approvare', counts.draftsPending],
    ['Approvati in coda', counts.approved],
    ['Pubblicati', counts.published],
    ['Falliti', counts.failed],
  ];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className={status.engine.running ? 'text-emerald-400' : 'text-zinc-500'} size={22} />
          <div>
            <div className="font-semibold">Motore {status.engine.running ? 'attivo 24/7' : 'in pausa'}</div>
            <div className="text-xs text-zinc-400">
              {status.aiAvailable ? 'AI Gemini collegata' : 'AI non configurata (GEMINI_API_KEY assente): modalità fallback + approvazione manuale'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={toggleEngine} variant={status.engine.running ? 'danger' : 'primary'}>
            {status.engine.running ? <Pause size={15} /> : <Play size={15} />}
            {status.engine.running ? 'Ferma' : 'Avvia'}
          </Button>
          <Button onClick={() => run('ingest')} variant="ghost"><RefreshCw size={15} /> Raccogli ora</Button>
          <Button onClick={() => run('generate')} variant="ghost"><Bot size={15} /> Genera ora</Button>
          <Button onClick={() => run('publish')} variant="ghost"><Send size={15} /> Pubblica ora</Button>
          <Button onClick={() => run('retro')} variant="ghost"><Target size={15} /> Retrospettiva</Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <div className="text-xs text-zinc-400">Fase editoriale</div>
          <div className="font-semibold">
            {status.editorial.phase === 'backfill' ? '📚 Storico (dal passato in avanti)' : '📰 Attualità (max 5 giorni)'}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Articoli verso il traguardo storico</div>
          <div className="font-semibold">{status.editorial.articlesTotal} / {status.editorial.backfillTarget}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Articoli lavorati oggi</div>
          <div className="font-semibold">{status.editorial.articlesToday} / {status.editorial.dailyQuota}</div>
        </div>
        <div className="min-w-40 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (status.editorial.articlesTotal / Math.max(1, status.editorial.backfillTarget)) * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, value]) => (
          <Card key={label} className="text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-zinc-400">{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Target size={17} /> Obiettivi</h3>
        <div className="space-y-2">
          {status.goals.map((g) => (
            <div key={g.goal.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
              <span>{g.goal.description}</span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-zinc-400">{g.current} / {g.goal.target}</span>
                {g.achieved ? <Badge tone="green"><CheckCircle2 size={12} /> raggiunto</Badge> : <Badge tone="yellow">in corso</Badge>}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold">Piattaforme</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(status.platforms) as Platform[]).map((p) => {
            const info = status.platforms[p];
            return (
              <Badge key={p} tone={!info.enabled ? 'zinc' : info.configured ? 'green' : 'blue'}>
                {PLATFORM_LABELS[p]} · {!info.enabled ? 'disattivata' : info.configured ? 'reale' : 'simulazione'}
              </Badge>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Le piattaforme senza credenziali in .env pubblicano in modalità simulazione: il flusso completo resta attivo e verificabile.
        </p>
      </Card>

      {status.lastRetro && (
        <Card>
          <h3 className="mb-2 font-semibold">Ultima retrospettiva · {timeAgo(status.lastRetro.ts)}</h3>
          <p className="text-sm text-zinc-300">{status.lastRetro.analysis}</p>
          {status.lastRetro.playbookUpdated && <Badge tone="green">playbook aggiornato</Badge>}
        </Card>
      )}
    </div>
  );
}

function SourcesView() {
  const [sources, setSources] = useState<Source[]>([]);
  const [type, setType] = useState<'rss' | 'youtube' | 'website'>('rss');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => api<Source[]>('/sources').then(setSources).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setError('');
    try {
      await api('/sources', { method: 'POST', body: JSON.stringify({ type, name, url }) });
      setName('');
      setUrl('');
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const placeholders = {
    rss: 'https://esempio.it/feed.xml',
    youtube: 'https://www.youtube.com/@nomecanale (o channel ID UC...)',
    website: 'https://esempio.it/blog',
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Plus size={17} /> Aggiungi fonte</h3>
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            <option value="rss">Feed RSS</option>
            <option value="youtube">Canale YouTube</option>
            <option value="website">Sito web</option>
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (opzionale)"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholders[type]}
            className="min-w-72 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <Button onClick={add} disabled={!url}><Plus size={15} /> Aggiungi</Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      <div className="space-y-2">
        {sources.length === 0 && (
          <Card className="text-center text-sm text-zinc-400">
            Nessuna fonte configurata. Aggiungi feed RSS, canali YouTube o siti: l'agenzia inizierà a raccogliere e pubblicare da sola.
          </Card>
        )}
        {sources.map((s) => {
          const Icon = SOURCE_ICONS[s.type];
          return (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Icon size={18} className="shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="truncate text-xs text-zinc-500">{s.url}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.lastError ? (
                  <Badge tone="red">errore: {s.lastError.slice(0, 60)}</Badge>
                ) : (
                  <Badge tone="zinc">aggiornata {timeAgo(s.lastFetchedAt)}</Badge>
                )}
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api(`/sources/${s.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !s.enabled }) });
                    load();
                  }}
                >
                  {s.enabled ? 'Sospendi' : 'Riattiva'}
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!confirm(`Rimuovere la fonte "${s.name}"?`)) return;
                    await api(`/sources/${s.id}`, { method: 'DELETE' });
                    load();
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Converte una data ISO nel formato accettato da <input type="datetime-local">.
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function PostCard({ post, onAction }: { post: Post; onAction?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.text);
  const [schedule, setSchedule] = useState(() => toLocalInput(post.scheduledAt));

  const approve = async (scheduledAt?: string) => {
    await api(`/posts/${post.id}/approve`, {
      method: 'POST',
      body: JSON.stringify(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
    });
    onAction?.();
  };
  const reject = async () => {
    await api(`/posts/${post.id}/reject`, { method: 'POST' });
    onAction?.();
  };
  const unapprove = async () => {
    await api(`/posts/${post.id}/unapprove`, { method: 'POST' });
    onAction?.();
  };
  const reschedule = async () => {
    await api(`/posts/${post.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt: new Date(schedule).toISOString() }),
    });
    onAction?.();
  };
  const saveEdit = async () => {
    await api(`/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ text }) });
    setEditing(false);
    onAction?.();
  };

  const statusTone: Record<string, 'green' | 'red' | 'yellow' | 'zinc' | 'blue'> = {
    draft: 'yellow',
    approved: 'blue',
    published: 'green',
    simulated: 'zinc',
    failed: 'red',
    rejected: 'red',
  };
  const statusLabel: Record<string, string> = {
    draft: 'da approvare',
    approved: 'in coda',
    published: 'pubblicato',
    simulated: 'simulato',
    failed: 'fallito',
    rejected: 'scartato',
  };

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{PLATFORM_LABELS[post.platform]}</Badge>
        <Badge tone={statusTone[post.status] ?? 'zinc'}>{statusLabel[post.status] ?? post.status}</Badge>
        {typeof post.qualityScore === 'number' && (
          <Badge tone={post.qualityScore >= 8 ? 'green' : post.qualityScore >= 6 ? 'yellow' : 'red'}>
            qualità {post.qualityScore}/10
          </Badge>
        )}
        <span className="ml-auto text-xs text-zinc-500">{timeAgo(post.publishedAt ?? post.scheduledAt ?? post.createdAt)}</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={saveEdit}>Salva</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-zinc-200">{post.text}</p>
      )}
      <div className="mt-2 truncate text-xs text-zinc-500">
        Fonte: <a href={post.itemLink} target="_blank" rel="noreferrer" className="underline hover:text-zinc-300">{post.itemTitle}</a>
      </div>
      {post.critique && <div className="mt-1 text-xs text-zinc-500">Revisore: {post.critique}</div>}
      {post.error && <div className="mt-1 text-xs text-red-400">Errore: {post.error}</div>}
      {(post.status === 'draft' || post.status === 'failed') && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => approve()}><CheckCircle2 size={15} /> Approva subito</Button>
          <span className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2 py-1">
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="bg-transparent text-sm text-zinc-200 [color-scheme:dark]"
            />
            <Button variant="ghost" onClick={() => approve(schedule)}><CalendarDays size={15} /> Pianifica</Button>
          </span>
          <Button variant="ghost" onClick={() => setEditing(true)}>Modifica</Button>
          <Button variant="danger" onClick={reject}><XCircle size={15} /> Scarta</Button>
        </div>
      )}
      {post.status === 'approved' && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2 py-1">
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="bg-transparent text-sm text-zinc-200 [color-scheme:dark]"
            />
            <Button variant="ghost" onClick={reschedule}><CalendarDays size={15} /> Sposta</Button>
          </span>
          <Button variant="ghost" onClick={() => setEditing(true)}>Modifica</Button>
          <Button variant="ghost" onClick={unapprove}>Torna in bozza</Button>
        </div>
      )}
    </Card>
  );
}

function QueueView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(
    () =>
      api<Post[]>('/posts?limit=200')
        .then((all) => setPosts(all.filter((p) => p.status === 'draft' || p.status === 'failed')))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-3">
      {posts.length === 0 && (
        <Card className="text-center text-sm text-zinc-400">
          Nessuna bozza da revisionare. Le bozze generate dal motore appariranno qui: potrai modificarle,
          approvarle subito o pianificarle a una data e ora precise (i post pianificati si gestiscono nella scheda Pianificazione).
        </Card>
      )}
      {posts.map((p) => <PostCard key={p.id} post={p} onAction={load} />)}
    </div>
  );
}

// Calendario editoriale dei prossimi 15 giorni: mostra i post approvati nel
// giorno previsto e permette di spostarli o riportarli in bozza.
function PlanningView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(
    () => api<Post[]>('/posts?status=approved&limit=500').then(setPosts).catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const days = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map<string, Post[]>();
  const unplaced: Post[] = [];
  for (const p of posts) {
    if (!p.scheduledAt) {
      unplaced.push(p);
      continue;
    }
    const local = new Date(p.scheduledAt);
    local.setHours(0, 0, 0, 0);
    const key = dayKey(local);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => Date.parse(a.scheduledAt!) - Date.parse(b.scheduledAt!));
  }
  const overdue = posts.filter((p) => p.scheduledAt && Date.parse(p.scheduledAt) < days[0].getTime());

  return (
    <div className="space-y-4">
      <Card className="text-sm text-zinc-400">
        Piano editoriale dei prossimi 15 giorni: {posts.length} post approvati in coda.
        Approva le bozze dalla scheda <b>Coda</b> scegliendo data e ora; qui puoi spostarle o ritirarle.
        {overdue.length > 0 && <span className="ml-1 text-amber-400">{overdue.length} post con orario già passato usciranno alla prossima finestra di pubblicazione.</span>}
      </Card>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const isToday = dayKey(d) === dayKey(new Date());
          return (
            <Card key={dayKey(d)} className={isToday ? 'border-emerald-700/60' : ''}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">
                  {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-1 text-emerald-400">· oggi</span>}
                </span>
                <Badge tone={list.length > 0 ? 'blue' : 'zinc'}>{list.length} post</Badge>
              </div>
              <div className="space-y-2">
                {list.length === 0 && <div className="text-xs text-zinc-600">—</div>}
                {list.map((p) => <PlannedPostRow key={p.id} post={p} onAction={load} />)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PlannedPostRow({ post, onAction }: { post: Post; onAction: () => void }) {
  const [moving, setMoving] = useState(false);
  const [schedule, setSchedule] = useState(() => toLocalInput(post.scheduledAt));

  const move = async () => {
    await api(`/posts/${post.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt: new Date(schedule).toISOString() }),
    });
    setMoving(false);
    onAction();
  };
  const unapprove = async () => {
    await api(`/posts/${post.id}/unapprove`, { method: 'POST' });
    onAction();
  };

  return (
    <div className="rounded-lg bg-zinc-800/60 p-2 text-xs">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-zinc-400">
          {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
        </span>
        <Badge tone="blue">{PLATFORM_LABELS[post.platform]}</Badge>
        <span className="ml-auto flex gap-1">
          <button onClick={() => setMoving(!moving)} className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-700" title="Sposta">
            <CalendarDays size={13} />
          </button>
          <button onClick={unapprove} className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-700" title="Torna in bozza">
            <XCircle size={13} />
          </button>
        </span>
      </div>
      <div className="line-clamp-2 text-zinc-300">{post.text}</div>
      {moving && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="datetime-local"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-200 [color-scheme:dark]"
          />
          <button onClick={move} className="rounded bg-emerald-600 px-2 py-1 font-medium text-white hover:bg-emerald-500">OK</button>
        </div>
      )}
    </div>
  );
}

function PublishedView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(
    () =>
      api<Post[]>('/posts?limit=200')
        .then((all) => setPosts(all.filter((p) => p.status === 'published' || p.status === 'simulated' || p.status === 'rejected')))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-3">
      {posts.length === 0 && <Card className="text-center text-sm text-zinc-400">Ancora nessun post pubblicato.</Card>}
      {posts.map((p) => <PostCard key={p.id} post={p} onAction={load} />)}
    </div>
  );
}

function PlaybookView() {
  const [playbook, setPlaybook] = useState('');
  const [retros, setRetros] = useState<{ ts: string; analysis: string; playbookUpdated: boolean }[]>([]);
  useEffect(() => {
    api<{ playbook: string }>('/playbook').then((r) => setPlaybook(r.playbook)).catch(() => {});
    api<{ ts: string; analysis: string; playbookUpdated: boolean }[]>('/retros').then(setRetros).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-2 flex items-center gap-2 font-semibold"><FileText size={17} /> Playbook editoriale (auto-aggiornato)</h3>
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">{playbook || 'Caricamento…'}</pre>
      </Card>
      <Card>
        <h3 className="mb-3 font-semibold">Storico retrospettive</h3>
        {retros.length === 0 && <p className="text-sm text-zinc-400">La prima retrospettiva verrà eseguita automaticamente dal motore.</p>}
        <div className="space-y-2">
          {retros.map((r) => (
            <div key={r.ts} className="rounded-lg bg-zinc-800/50 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                {new Date(r.ts).toLocaleString('it-IT')}
                {r.playbookUpdated && <Badge tone="green">playbook aggiornato</Badge>}
              </div>
              {r.analysis}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsView() {
  const [config, setConfig] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api('/config').then(setConfig).catch(() => {});
  }, []);

  if (!config) return <Card>Caricamento…</Card>;

  const save = async () => {
    await api('/config', { method: 'PUT', body: JSON.stringify(config) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const set = (patch: any) => setConfig({ ...config, ...patch });

  const input = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm';
  const label = 'mb-1 block text-xs font-medium text-zinc-400';

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 font-semibold">Identità del brand</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className={label}>Nome</label><input className={input} value={config.brand.name} onChange={(e) => set({ brand: { ...config.brand, name: e.target.value } })} /></div>
          <div><label className={label}>Lingua</label><input className={input} value={config.brand.language} onChange={(e) => set({ brand: { ...config.brand, language: e.target.value } })} /></div>
          <div className="md:col-span-2"><label className={label}>Missione</label><textarea rows={2} className={input} value={config.brand.mission} onChange={(e) => set({ brand: { ...config.brand, mission: e.target.value } })} /></div>
          <div><label className={label}>Tono di voce</label><input className={input} value={config.brand.tone} onChange={(e) => set({ brand: { ...config.brand, tone: e.target.value } })} /></div>
          <div><label className={label}>Pubblico</label><input className={input} value={config.brand.audience} onChange={(e) => set({ brand: { ...config.brand, audience: e.target.value } })} /></div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Interessi e temi</h3>
        <p className="mb-3 text-xs text-zinc-500">
          Descrivi qui i temi che ti interessano (parole chiave o frasi, separate da virgola o a capo): il curatore
          scarterà i contenuti delle fonti che non sono in linea. Lascia vuoto per accettare tutto.
        </p>
        <textarea
          rows={3}
          className={input}
          placeholder="es. energie rinnovabili, fotovoltaico in agricoltura, incentivi e bandi per le aziende agricole"
          value={config.interests}
          onChange={(e) => set({ interests: e.target.value })}
        />
        <div className="mt-3 max-w-60">
          <label className={label}>Soglia pertinenza (0-10)</label>
          <input type="number" min={0} max={10} className={input} value={config.relevanceThreshold} onChange={(e) => set({ relevanceThreshold: Number(e.target.value) })} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Strategia editoriale</h3>
        <p className="mb-3 text-xs text-zinc-500">
          L'agenzia lavora prima in fase <b>Storico</b>: parte dai contenuti più vecchi (entro la finestra indicata) e
          procede in ordine cronologico per costruire l'archivio del canale. Raggiunto il traguardo articoli, passa da
          sola alla fase <b>Attualità</b> e accetta solo contenuti recenti.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <div><label className={label}>Articoli al giorno</label><input type="number" min={1} max={100} className={input} value={config.editorial.articlesPerDay} onChange={(e) => set({ editorial: { ...config.editorial, articlesPerDay: Number(e.target.value) } })} /></div>
          <div><label className={label}>Storico: parti da (mesi fa)</label><input type="number" min={1} max={60} className={input} value={config.editorial.backfillMonthsAgo} onChange={(e) => set({ editorial: { ...config.editorial, backfillMonthsAgo: Number(e.target.value) } })} /></div>
          <div><label className={label}>Traguardo articoli storico</label><input type="number" min={1} className={input} value={config.editorial.backfillTargetArticles} onChange={(e) => set({ editorial: { ...config.editorial, backfillTargetArticles: Number(e.target.value) } })} /></div>
          <div><label className={label}>Attualità: età max (giorni)</label><input type="number" min={1} max={60} className={input} value={config.editorial.freshMaxAgeDays} onChange={(e) => set({ editorial: { ...config.editorial, freshMaxAgeDays: Number(e.target.value) } })} /></div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Automazione</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className={label}>Pubblicazione automatica</label>
            <select className={input} value={String(config.autoPublish)} onChange={(e) => set({ autoPublish: e.target.value === 'true' })}>
              <option value="true">Sì: pubblica da sola se la qualità supera la soglia</option>
              <option value="false">No: ogni post richiede approvazione manuale</option>
            </select>
          </div>
          <div><label className={label}>Soglia qualità (1-10)</label><input type="number" min={1} max={10} className={input} value={config.qualityThreshold} onChange={(e) => set({ qualityThreshold: Number(e.target.value) })} /></div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div><label className={label}>Raccolta fonti (min)</label><input type="number" min={2} className={input} value={config.intervals.ingestMinutes} onChange={(e) => set({ intervals: { ...config.intervals, ingestMinutes: Number(e.target.value) } })} /></div>
          <div><label className={label}>Generazione (min)</label><input type="number" min={1} className={input} value={config.intervals.generateMinutes} onChange={(e) => set({ intervals: { ...config.intervals, generateMinutes: Number(e.target.value) } })} /></div>
          <div><label className={label}>Pubblicazione (min)</label><input type="number" min={1} className={input} value={config.intervals.publishMinutes} onChange={(e) => set({ intervals: { ...config.intervals, publishMinutes: Number(e.target.value) } })} /></div>
          <div><label className={label}>Retrospettiva (ore)</label><input type="number" min={1} className={input} value={config.intervals.retroHours} onChange={(e) => set({ intervals: { ...config.intervals, retroHours: Number(e.target.value) } })} /></div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Piattaforme</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <div key={p} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.platforms[p].enabled}
                  onChange={(e) => set({ platforms: { ...config.platforms, [p]: { ...config.platforms[p], enabled: e.target.checked } } })}
                />
                {PLATFORM_LABELS[p]}
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                max/giorno
                <input
                  type="number"
                  min={1}
                  max={48}
                  className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm"
                  value={config.platforms[p].maxPostsPerDay}
                  onChange={(e) => set({ platforms: { ...config.platforms, [p]: { ...config.platforms[p], maxPostsPerDay: Number(e.target.value) } } })}
                />
              </label>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Le credenziali si impostano nel file .env (vedi .env.example): senza credenziali la piattaforma lavora in simulazione.</p>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save}>Salva impostazioni</Button>
        {saved && <span className="text-sm text-emerald-400">Salvato ✓</span>}
      </div>
    </div>
  );
}

function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    const load = () => api<LogEntry[]>('/logs').then(setLogs).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const tone = { info: 'text-zinc-300', warn: 'text-amber-400', error: 'text-red-400' };
  return (
    <Card>
      <div className="max-h-[70vh] space-y-1 overflow-y-auto font-mono text-xs">
        {logs.map((l, i) => (
          <div key={i} className={tone[l.level]}>
            <span className="text-zinc-600">{new Date(l.ts).toLocaleTimeString('it-IT')}</span>{' '}
            <span className="text-zinc-500">[{l.scope}]</span> {l.message}
          </div>
        ))}
        {logs.length === 0 && <span className="text-zinc-500">Nessun log.</span>}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------- app

const TABS = [
  { id: 'overview', label: 'Panoramica', icon: Activity },
  { id: 'sources', label: 'Fonti', icon: Newspaper },
  { id: 'queue', label: 'Coda', icon: ClipboardList },
  { id: 'planning', label: 'Pianificazione', icon: CalendarDays },
  { id: 'published', label: 'Pubblicati', icon: ListChecks },
  { id: 'playbook', label: 'Playbook', icon: FileText },
  { id: 'settings', label: 'Impostazioni', icon: Settings },
  { id: 'logs', label: 'Log', icon: Bot },
] as const;

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('overview');
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(() => api<Status>('/status').then(setStatus).catch(() => {}), []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">🤖 Agenzia Social Autonoma</h1>
          <p className="text-sm text-zinc-400">Raccoglie dalle tue fonti, scrive, controlla la qualità e pubblica sui social, 24 ore su 24.</p>
        </div>
        {status && (
          <Badge tone={status.engine.running ? 'green' : 'zinc'}>
            {status.engine.running ? '● motore attivo' : '○ motore in pausa'}
          </Badge>
        )}
      </header>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (status ? <Overview status={status} refresh={refresh} /> : <Card>Caricamento…</Card>)}
      {tab === 'sources' && <SourcesView />}
      {tab === 'queue' && <QueueView />}
      {tab === 'planning' && <PlanningView />}
      {tab === 'published' && <PublishedView />}
      {tab === 'playbook' && <PlaybookView />}
      {tab === 'settings' && <SettingsView />}
      {tab === 'logs' && <LogsView />}
    </div>
  );
}
