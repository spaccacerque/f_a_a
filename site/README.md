# Sito vetrina EVcar (evcar.it)

Sito statico pronto per Hostinger: vendita di auto elettriche di importazione cinese,
brand EVcar by Nextora.

## Pubblicazione su Hostinger

1. Hostinger → il tuo piano hosting → **File Manager** (o FTP).
2. Carica il **contenuto** di questa cartella `site/` dentro `public_html/` del dominio evcar.it.
3. Fine: il sito è online. Nessun build, nessun server.

## Aggiornare il catalogo (auto e prezzi)

Tutto il catalogo vive in **`data/vehicles.json`**. Per ogni auto:

| Campo | Significato |
|---|---|
| `priceEur` | Prezzo mostrato (es. listino nextora.it per le auto del carosello) |
| `competitorPriceEur` | Prezzo del concorrente (auto-china.com): se `priceEur` è `null`, il sito mostra automaticamente **questo prezzo scontato del 5%** (campo `discountVsCompetitorPct`), con il prezzo pieno barrato accanto |
| entrambi `null` | Mostra "Prezzo su richiesta" |
| `featured` | `true` = l'auto appare nel carosello in homepage |
| `image` | percorso immagine in `img/` (vuoto = segnaposto grafico col nome del modello) |
| `badge` | etichetta sulla foto (es. "Pronta consegna") |

Le 4 auto presenti sono **segnaposto con prezzo nullo**: vanno sostituite con le auto
reali del carosello di nextora.it (con i loro prezzi in `priceEur`) e con i modelli di
auto-china.com (con i loro prezzi in `competitorPriceEur` per lo sconto automatico del 5%).

## Form preventivo

Per ora il form apre il client email verso `info@evcar.it`. Per la raccolta diretta dei
lead, collegare un endpoint (es. Formspree, oppure un piccolo `contact.php` su Hostinger)
nel submit handler in `js/app.js`.
