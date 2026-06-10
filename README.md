# 🤖 Agenzia Social Autonoma

Un'agenzia online che gestisce i social **in autonomia, 24 ore su 24**: raccoglie contenuti
dalle fonti che le indichi (feed RSS, canali YouTube, siti web), scrive post su misura per
ogni piattaforma con l'AI, ne controlla la qualità, li pubblica e **impara dai risultati**
per migliorare continuamente il servizio offerto alla comunità.

## Come funziona

Il motore esegue quattro loop continui:

| Loop | Default | Cosa fa |
|---|---|---|
| 🛰️ **Raccolta** | ogni 15 min | Legge tutte le fonti attive (RSS, YouTube, siti) e cattura i nuovi contenuti, senza duplicati |
| ✍️ **Generazione** | ogni 5 min | Per ogni contenuto nuovo scrive un post per ciascuna piattaforma attiva, seguendo il *playbook editoriale*; un revisore AI assegna un voto di qualità (1-10) e, se sotto soglia, il post viene riscritto |
| 📤 **Pubblicazione** | ogni 3 min | Pubblica i post approvati, distanziandoli nella giornata e rispettando il limite giornaliero per piattaforma |
| 🎯 **Retrospettiva** | ogni 6 ore | Confronta i risultati con gli **obiettivi** (qualità media, cadenza, tasso di approvazione, freschezza fonti, tasso di errore) e **riscrive il playbook editoriale**: è il ciclo di auto-miglioramento |

I post che non superano la soglia di qualità (o tutti, se disattivi la pubblicazione
automatica) finiscono nella **coda di approvazione** della dashboard, dove puoi
modificarli, approvarli o scartarli.

## Piattaforme supportate

Telegram, Mastodon, X/Twitter, Facebook, Instagram, LinkedIn.

Ogni piattaforma senza credenziali in `.env` lavora in **modalità simulazione**: il flusso
completo resta attivo e verificabile dalla dashboard; appena aggiungi le chiavi, la
pubblicazione diventa reale. Vedi `.env.example` per tutte le variabili.

## Avvio

```bash
npm install
cp .env.example .env   # inserisci almeno GEMINI_API_KEY
npm run dev            # dashboard su http://localhost:3000
```

Il motore parte da solo all'avvio del server (disattivabile con `ENGINE_AUTOSTART=false`).
Poi, dalla dashboard:

1. **Fonti** → aggiungi i tuoi feed RSS, canali YouTube (URL, handle `@nome` o channel ID) e siti web.
2. **Impostazioni** → definisci brand, tono di voce, lingua, soglia di qualità, limiti per piattaforma.
3. **Panoramica** → segui obiettivi e stato del motore; puoi forzare ogni ciclo manualmente.
4. **Playbook** → osserva come l'agenzia affina da sola le proprie regole editoriali a ogni retrospettiva.

## Architettura

```
server.ts                  Express + Vite, avvia il motore
src/agency/
  engine.ts                i 4 loop (raccolta, generazione, pubblicazione, retrospettiva)
  goals.ts                 calcolo degli obiettivi sulle metriche reali
  config.ts / store.ts     configurazione e persistenza JSON (cartella data/)
  ingest/                  rss.ts, youtube.ts, website.ts
  ai/                      gemini.ts, writer.ts (copywriter), critic.ts (revisore + retrospettiva)
  publish/                 publisher.ts + adapter per le 6 piattaforme
  api.ts                   API REST per la dashboard
src/App.tsx                dashboard React (Panoramica, Fonti, Coda, Pubblicati, Playbook, Impostazioni, Log)
```

I dati (fonti, contenuti, post, retrospettive, playbook) vivono in `data/`, fuori dal
versionamento. Le credenziali restano solo nelle variabili d'ambiente.
