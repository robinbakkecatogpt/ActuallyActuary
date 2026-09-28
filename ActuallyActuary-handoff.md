# ActuallyActuary – överlämning till Claude i VS Code

## Instruktion till Claude (klistra in hela detta dokument i chatten)

Skapa projektet i den öppna mappen `ActuallyActuary`. Varje fil nedan ska skapas med exakt sökväg och exakt innehåll som i kodblocket. Skriv inte om koden; den är testad.

Projektet är ett statiskt övningsspel (flashcards) för GitHub Pages, utan ramverk och utan byggsteg:
- Tre lägen: vänd kortet, flerval (↑ ↓ Enter), sant/falskt (← → Enter). Mus och mobil fungerar också.
- Kortlekar är JSON-filer i `decks/`. GitHub Actions kör `scripts/build_index.py`, som validerar alla kortlekar och skapar `decks/index.json`, och publicerar sedan sajten.
- Lokala kortlekar kan laddas in i appen och sparas i localStorage (för material som inte ska ligga publikt).
- Formatet beskrivs i `schema/deck.schema.json`. `PROMPT.md` är prompten för att göra om en PDF till en kortlek.

När alla filer finns:
1. Kör `python scripts/build_index.py .` för att kontrollera att exempelkortleken validerar. Radera sedan den genererade `decks/index.json` (den ska inte committas; Actions skapar den).
2. Lägg till en `.gitignore` med raden `decks/index.json`.
3. Testa lokalt: `python scripts/build_index.py .` och sedan `python -m http.server 8000`, öppna http://localhost:8000.

---

## `index.html`

```html
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>ActuallyActuary</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗂️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Kalam:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
<main id="app">

  <!-- Start -->
  <section id="screen-start" class="screen">
    <header class="top">
      <h1>ActuallyActuary</h1>
      <p class="lead">Välj kortlekar och ett sätt att öva.</p>
    </header>

    <div class="panel">
      <div class="panel-head">
        <h2>Kortlekar</h2>
        <input id="search" type="search" placeholder="Sök titel eller tagg" aria-label="Sök kortlekar">
      </div>
      <ul id="deck-list" class="deck-list"></ul>
      <p id="deck-empty" class="muted" hidden></p>
      <label class="file-btn">
        <input id="file-input" type="file" accept=".json,application/json" multiple>
        Lägg till lokal kortlek
      </label>
      <p class="muted small">Lokala kortlekar sparas bara i den här webbläsaren och laddas aldrig upp någonstans.</p>
    </div>

    <div class="panel">
      <h2>Läge</h2>
      <div class="modes" role="radiogroup" aria-label="Läge">
        <label class="mode"><input type="radio" name="mode" value="flip">
          <span><b>Vänd kortet</b><small>Se begreppet, tänk efter, vänd.</small></span></label>
        <label class="mode"><input type="radio" name="mode" value="mc">
          <span><b>Flerval</b><small>Välj rätt svar bland fyra.</small></span></label>
        <label class="mode"><input type="radio" name="mode" value="tf">
          <span><b>Sant eller falskt</b><small>Ta ställning till ett påstående.</small></span></label>
      </div>
      <div class="row">
        <label class="inline">Antal kort
          <select id="count">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="0">Alla</option>
          </select>
        </label>
        <label class="check"><input type="checkbox" id="focus"> Prioritera kort jag ofta missar</label>
      </div>
    </div>

    <p id="start-error" class="error" role="alert" hidden></p>
    <button id="start-btn" class="primary big">Starta</button>
  </section>

  <!-- Spel -->
  <section id="screen-play" class="screen" hidden>
    <header class="play-bar">
      <button id="quit-btn" class="ghost">Avsluta</button>
      <div class="progress" aria-hidden="true"><div id="progress-fill"></div></div>
      <span id="progress-text" class="muted"></span>
    </header>
    <div id="stage"></div>
    <p id="hint" class="hint"></p>
  </section>

  <!-- Resultat -->
  <section id="screen-end" class="screen" hidden>
    <div class="panel end">
      <h2 id="end-score"></h2>
      <p id="end-sub" class="muted"></p>
      <div class="row">
        <button id="retry-btn" class="primary">Öva på felen</button>
        <button id="again-btn" class="secondary">Kör samma igen</button>
        <button id="home-btn" class="ghost">Till start</button>
      </div>
      <h3 id="miss-head" hidden>Att öva mer på</h3>
      <ul id="miss-list" class="miss-list"></ul>
    </div>
  </section>

</main>
<script src="app.js"></script>
</body>
</html>
```

## `style.css`

```css
:root {
  --desk: #dde4eb;
  --panel: #eef2f6;
  --ink: #1b2a4a;
  --muted: #56647d;
  --accent: #2f4fa8;
  --accent-ink: #ffffff;
  --line: #c9d3de;
  --card: #fffefa;
  --card-ink: #1b2a4a;
  --rule-red: rgba(214, 72, 72, .55);
  --rule-blue: rgba(120, 155, 205, .35);
  --ok: #2e7d4f;
  --ok-bg: #dcefe3;
  --bad: #b3261e;
  --bad-bg: #f6dcd9;
  --hand: "Kalam", "Segoe Print", "Bradley Hand", cursive;
  --sans: "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
@media (prefers-color-scheme: dark) {
  :root {
    --desk: #1b2332;
    --panel: #253044;
    --ink: #e5eaf2;
    --muted: #a3afc2;
    --accent: #8fa8f0;
    --accent-ink: #14203a;
    --line: #34415a;
    --ok: #7fd3a0;
    --ok-bg: #1f3b2c;
    --bad: #f2a29b;
    --bad-bg: #472523;
  }
}
*, *::before, *::after { box-sizing: inherit; }
html, body { margin: 0; }
body {
  background: var(--desk);
  color: var(--ink);
  font: 1rem/1.5 var(--sans);
  -webkit-text-size-adjust: 100%;
}
#app { max-width: 60rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
[hidden] { display: none !important; }

h1, h2, h3 { margin: 0; line-height: 1.2; }
h1 { font-family: var(--hand); font-weight: 700; font-size: clamp(2.4rem, 7vw, 3.4rem); letter-spacing: -.01em; }
h2 { font-size: 1.15rem; }
h3 { font-size: 1rem; margin-top: 1.5rem; }
.lead { margin: .25rem 0 0; color: var(--muted); font-size: 1.1rem; }
.muted { color: var(--muted); }
.small { font-size: .875rem; }
.top { margin: .5rem 0 1.5rem; }

.panel { background: var(--panel); border-radius: 14px; padding: 1.25rem; margin-bottom: 1rem; }
.panel-head { display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: .5rem; }
.row { display: flex; gap: 1rem 1.5rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }

input[type=search], select {
  font: inherit; color: var(--ink); background: var(--desk);
  border: 1px solid var(--line); border-radius: 8px; padding: .45rem .7rem;
}
input[type=search] { min-width: 0; flex: 1 1 14rem; max-width: 20rem; }
input[type=checkbox], input[type=radio] { accent-color: var(--accent); width: 1.1rem; height: 1.1rem; margin: 0; flex: none; }
.inline { display: flex; gap: .6rem; align-items: center; }
.check { display: flex; gap: .5rem; align-items: center; cursor: pointer; }

button {
  font: inherit; font-weight: 700; color: var(--ink); cursor: pointer;
  border: 0; border-radius: 10px; padding: .7rem 1.2rem; background: transparent;
}
button.primary { background: var(--accent); color: var(--accent-ink); }
button.secondary { background: var(--desk); }
button.ghost { color: var(--muted); padding-inline: .6rem; }
button.big { width: 100%; padding: 1rem; font-size: 1.1rem; }
button:hover { filter: brightness(1.06); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Kortlekar */
.deck-list { list-style: none; margin: 0; padding: 0; }
.deck { display: flex; gap: .85rem; align-items: flex-start; padding: .8rem 0; border-bottom: 1px solid var(--line); cursor: pointer; }
.deck input { margin-top: .2rem; }
.deck-text { flex: 1; display: grid; gap: .15rem; }
.deck-title { font-weight: 700; }
.deck-desc { color: var(--muted); font-size: .95rem; }
.deck-meta { display: flex; gap: .4rem; flex-wrap: wrap; align-items: center; font-size: .85rem; color: var(--muted); }
.tag { background: var(--desk); border-radius: 999px; padding: 0 .55rem; }
.tag.local { outline: 1px dashed var(--muted); }
.deck .remove { font-size: .85rem; padding: .2rem .5rem; }
.file-btn { display: inline-block; margin-top: 1rem; font-weight: 700; color: var(--accent); cursor: pointer; }
.file-btn input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.file-btn:focus-within { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

/* Lägen */
.modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: .6rem; margin-top: .75rem; }
.mode { display: flex; gap: .7rem; align-items: flex-start; background: var(--desk); border: 2px solid transparent; border-radius: 10px; padding: .8rem; cursor: pointer; }
.mode:has(input:checked) { border-color: var(--accent); }
.mode span { display: grid; }
.mode small { color: var(--muted); font-size: .875rem; }

.error { color: var(--bad); background: var(--bad-bg); border-radius: 8px; padding: .7rem 1rem; }

/* Spel */
.play-bar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
.progress { flex: 1; height: 6px; background: var(--panel); border-radius: 3px; overflow: hidden; }
#progress-fill { height: 100%; width: 0; background: var(--accent); transition: width .25s; }
.hint { color: var(--muted); font-size: .875rem; text-align: center; margin-top: 1.25rem; }
@media (hover: none) { .hint { display: none; } }

/* Registerkortet — linjerat med rött huvud, som ett riktigt kort */
.card {
  color: var(--card-ink);
  border-radius: 6px;
  padding: 0 1.5rem 2rem;
  min-height: 16rem;
  box-shadow: 0 1px 0 rgba(0,0,0,.06), 0 14px 28px -16px rgba(15, 25, 55, .55);
  background:
    linear-gradient(var(--rule-red), var(--rule-red)) 0 3.2rem / 100% 2px no-repeat,
    linear-gradient(var(--card), var(--card)) 0 0 / 100% 3.2rem no-repeat,
    repeating-linear-gradient(to bottom, transparent 0 calc(2rem - 1px), var(--rule-blue) calc(2rem - 1px) 2rem),
    var(--card);
  line-height: 2rem;
  overflow-wrap: anywhere;
}
.card p { margin: 0; }
.card .src { height: 3.2rem; line-height: 3.2rem; font-size: .8rem; color: #6b7891; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card .src + * { margin-top: 1.2rem; }
.card .term { font-family: var(--hand); font-weight: 700; font-size: clamp(1.5rem, 4.5vw, 1.9rem); }
.card .answer, .card .statement, .card .claim { font-size: 1.15rem; }
.card .statement { font-family: var(--hand); font-size: clamp(1.3rem, 4vw, 1.6rem); }
.card .between { font-size: .85rem; color: #6b7891; }
.card .expl { margin-top: 2rem; color: #46546e; font-size: 1rem; }

/* Läge 1: vänd */
.flip-wrap { max-width: 38rem; margin: 0 auto; }
.flip { perspective: 1600px; cursor: pointer; border-radius: 6px; }
.flip-inner { display: grid; transition: transform .5s cubic-bezier(.3, .7, .2, 1); transform-style: preserve-3d; }
.flip.flipped .flip-inner { transform: rotateY(180deg); }
.face { grid-area: 1 / 1; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.face.back { transform: rotateY(180deg); }
.rate { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1.25rem; }
.rate button { padding: 1rem; }
.rate .no { background: var(--bad-bg); color: var(--bad); }
.rate .yes { background: var(--ok-bg); color: var(--ok); }
.flip-note { text-align: center; color: var(--muted); margin-top: 1rem; }

/* Läge 2: flerval */
.mc { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 1.5rem; align-items: start; }
@media (max-width: 44rem) { .mc { grid-template-columns: 1fr; } .mc .card { min-height: 10rem; } }
.options { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
.opt {
  width: 100%; display: flex; gap: .8rem; align-items: flex-start; text-align: left; font-weight: 400;
  background: var(--panel); border: 2px solid transparent; padding: .85rem 1rem; line-height: 1.4;
}
.opt .key { flex: none; width: 1.6rem; height: 1.6rem; border-radius: 50%; display: grid; place-items: center; font-size: .8rem; font-weight: 700; background: var(--desk); color: var(--muted); }
.opt.sel { border-color: var(--accent); }
.opt.right { background: var(--ok-bg); border-color: var(--ok); }
.opt.wrong { background: var(--bad-bg); border-color: var(--bad); }
.opt.dim { opacity: .5; }
.opt:disabled { cursor: default; color: var(--ink); }

.feedback { margin-top: 1rem; display: grid; gap: .6rem; }
.verdict { font-weight: 700; margin: 0; }
.verdict.ok { color: var(--ok); }
.verdict.bad { color: var(--bad); }
.feedback p { margin: 0; }

/* Läge 3: sant/falskt */
.tf { max-width: 38rem; margin: 0 auto; }
.tf-btns { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: 1.25rem; }
.tf-btns .opt { justify-content: center; font-weight: 700; font-size: 1.1rem; padding: 1.1rem; }

/* Resultat */
.end h2 { font-family: var(--hand); font-size: clamp(2rem, 6vw, 2.8rem); }
.miss-list { list-style: none; margin: .75rem 0 0; padding: 0; }
.miss-list li { display: grid; gap: .15rem; padding: .7rem 0; border-bottom: 1px solid var(--line); }
.m-term { font-weight: 700; }
.m-ans { color: var(--muted); }

@media (prefers-reduced-motion: reduce) {
  .flip-inner, #progress-fill { transition: none; }
}
```

## `app.js`

```javascript
'use strict';

/* ---------- Hjälpfunktioner ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rand = a => a[Math.floor(Math.random() * a.length)];

const LS = { local: 'kl.localDecks', stats: 'kl.stats', prefs: 'kl.prefs' };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full eller blockerad */ } };

/* ---------- Tillstånd ---------- */
const S = {
  decks: [], selected: new Set(), remoteFailed: false,
  mode: 'flip', count: 20, focus: false,
  queue: [], i: 0, results: [], lastItems: [], missed: [],
  cur: null, sel: 0, answered: false, flipped: false,
};

/* ---------- Validering (samma regler som scripts/build_index.py) ---------- */
function validateDeck(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'Filen är inte ett JSON-objekt.';
  if (typeof d.id !== 'string' || !/^[a-z0-9-]+$/.test(d.id)) return 'Fältet "id" saknas eller innehåller annat än a–z, 0–9 och bindestreck.';
  if (typeof d.title !== 'string' || !d.title.trim()) return 'Fältet "title" saknas.';
  if (!Array.isArray(d.cards) || !d.cards.length) return 'Fältet "cards" saknas eller är tomt.';
  for (const [n, c] of d.cards.entries()) {
    if (!c || typeof c.term !== 'string' || typeof c.answer !== 'string') return `Kort ${n + 1} saknar "term" eller "answer".`;
    if (c.distractors !== undefined && (!Array.isArray(c.distractors) || c.distractors.some(x => typeof x !== 'string')))
      return `Kort ${n + 1}: "distractors" måste vara en lista med text.`;
    if (c.statements !== undefined && (!Array.isArray(c.statements) || c.statements.some(s => !s || typeof s.text !== 'string' || typeof s.true !== 'boolean')))
      return `Kort ${n + 1}: varje påstående behöver "text" och "true" (true eller false).`;
  }
  return null;
}

/* ---------- Kortlekar ---------- */
const deckMeta = (d, local) => ({
  key: (local ? 'local:' : '') + d.id, id: d.id, title: d.title,
  description: d.description || '', tags: d.tags || [], count: d.cards.length, local, data: d,
});

function rebuildLocal() {
  S.decks = S.decks.filter(d => !d.local).concat(lsGet(LS.local, []).map(d => deckMeta(d, true)));
}

async function loadIndex() {
  try {
    const r = await fetch('decks/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error();
    const list = await r.json();
    S.decks = list.map(m => ({ ...m, key: m.id, tags: m.tags || [], local: false, data: null }));
  } catch {
    S.remoteFailed = true;
    S.decks = [];
  }
  rebuildLocal();
}

async function loadDeck(d) {
  if (d.data) return;
  const r = await fetch('decks/' + encodeURIComponent(d.file), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Kunde inte ladda "${d.title}".`);
  const data = await r.json();
  const err = validateDeck(data);
  if (err) throw new Error(`"${d.title}": ${err}`);
  d.data = data;
}

function renderDecks() {
  const q = $('#search').value.trim().toLowerCase();
  const shown = S.decks.filter(d => !q || d.title.toLowerCase().includes(q) || d.tags.some(t => t.toLowerCase().includes(q)));
  $('#deck-list').innerHTML = shown.map(d => `
    <li><label class="deck">
      <input type="checkbox" data-key="${esc(d.key)}" ${S.selected.has(d.key) ? 'checked' : ''}>
      <span class="deck-text">
        <span class="deck-title">${esc(d.title)}</span>
        ${d.description ? `<span class="deck-desc">${esc(d.description)}</span>` : ''}
        <span class="deck-meta">${d.count} kort ${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}${d.local ? '<span class="tag local">Lokal</span>' : ''}</span>
      </span>
      ${d.local ? `<button class="ghost remove" data-remove="${esc(d.key)}">Ta bort</button>` : ''}
    </label></li>`).join('');

  const empty = $('#deck-empty');
  empty.hidden = !!shown.length;
  if (!S.decks.length) {
    empty.textContent = S.remoteFailed
      ? 'Kunde inte läsa kortlekarna från servern. Lägg till en lokal kortlek nedan, eller öppna sidan via GitHub Pages.'
      : 'Inga kortlekar ännu. Lägg en JSON-fil i mappen decks/ eller lägg till en lokal kortlek.';
  } else if (!shown.length) {
    empty.textContent = 'Inga kortlekar matchar sökningen.';
  }
}

async function importFiles(e) {
  const errs = [];
  const local = lsGet(LS.local, []);
  for (const f of e.target.files) {
    try {
      const d = JSON.parse(await f.text());
      const err = validateDeck(d);
      if (err) { errs.push(`${f.name}: ${err}`); continue; }
      const i = local.findIndex(x => x.id === d.id);
      if (i >= 0) local[i] = d; else local.push(d);
      S.selected.add('local:' + d.id);
    } catch {
      errs.push(`${f.name}: filen är inte giltig JSON.`);
    }
  }
  e.target.value = '';
  lsSet(LS.local, local);
  rebuildLocal();
  savePrefs();
  renderDecks();
  errs.length ? showError(errs.join(' ')) : hideError();
}

function removeLocal(key) {
  const id = key.replace(/^local:/, '');
  lsSet(LS.local, lsGet(LS.local, []).filter(d => d.id !== id));
  S.selected.delete(key);
  rebuildLocal();
  savePrefs();
  renderDecks();
}

/* ---------- Inställningar ---------- */
function savePrefs() {
  lsSet(LS.prefs, { mode: S.mode, count: S.count, focus: S.focus, selected: [...S.selected] });
}
function loadPrefs() {
  const p = lsGet(LS.prefs, {});
  if (['flip', 'mc', 'tf'].includes(p.mode)) S.mode = p.mode;
  if (Number.isInteger(p.count)) S.count = p.count;
  S.focus = !!p.focus;
  (p.selected || []).forEach(k => S.selected.add(k));
}

const showError = msg => { const el = $('#start-error'); el.textContent = msg; el.hidden = false; };
const hideError = () => { $('#start-error').hidden = true; };

/* ---------- Bygg en omgång ---------- */
function tfItems(c) {
  if (c.statements?.length) {
    return c.statements.map((s, n) => ({
      card: c, key: `${c.key}::s${n}`, claim: s.text, truth: s.true,
      explanation: s.explanation || c.explanation,
    }));
  }
  // Inga påståenden: generera "begrepp = svar", ibland med ett annat korts svar.
  const others = [...new Set(c.deck.data.cards.map(x => x.answer))].filter(a => a !== c.answer);
  const wrong = others.length > 0 && Math.random() < 0.5;
  return [{
    card: c, key: `${c.key}::gen`, gen: true,
    claim: wrong ? rand(others) : c.answer, truth: !wrong, explanation: c.explanation,
  }];
}

// Viktat urval utan återläggning. Med "prioritera missar" väger kort med hög felandel tyngre.
function pick(items, n) {
  const stats = lsGet(LS.stats, {});
  const weight = it => {
    if (!S.focus) return 1;
    const s = stats[it.key];
    if (!s || !s.seen) return 2;
    return 1 + 6 * (s.miss / s.seen);
  };
  const out = items
    .map(it => ({ it, k: Math.pow(Math.random(), 1 / weight(it)) }))
    .sort((a, b) => b.k - a.k)
    .map(x => x.it);
  return n > 0 ? out.slice(0, n) : out;
}

async function startGame() {
  hideError();
  const decks = S.decks.filter(d => S.selected.has(d.key));
  if (!decks.length) return showError('Välj minst en kortlek.');
  $('#start-btn').disabled = true;
  try {
    await Promise.all(decks.map(loadDeck));
  } catch (e) {
    return showError(e.message);
  } finally {
    $('#start-btn').disabled = false;
  }
  const cards = decks.flatMap(d => d.data.cards.map(c => ({ ...c, deck: d, key: `${d.data.id}::${c.term}` })));
  const items = S.mode === 'tf' ? cards.flatMap(tfItems) : cards.map(c => ({ card: c, key: c.key, explanation: c.explanation }));
  play(pick(items, S.count));
}

function play(items) {
  S.queue = items;
  S.lastItems = items;
  S.i = 0;
  S.results = [];
  show('play');
  renderItem();
}

function show(name) {
  for (const s of ['start', 'play', 'end']) $('#screen-' + s).hidden = s !== name;
  window.scrollTo(0, 0);
}

/* ---------- Rendera ett kort ---------- */
const expl = t => t ? `<p class="expl">${esc(t)}</p>` : '';
const hint = t => { $('#hint').textContent = t; };

function renderItem() {
  const it = S.queue[S.i];
  Object.assign(S, { cur: it, answered: false, flipped: false });
  $('#progress-text').textContent = `${S.i + 1} / ${S.queue.length}`;
  $('#progress-fill').style.width = `${(S.i / S.queue.length) * 100}%`;
  const src = `<p class="src">${esc(it.card.deck.title)}</p>`;
  const stage = $('#stage');

  if (S.mode === 'flip') {
    stage.innerHTML = `
      <div class="flip-wrap">
        <div class="flip" id="flip" role="button" tabindex="0" aria-label="Vänd kortet">
          <div class="flip-inner">
            <div class="face front card">${src}<p class="term">${esc(it.card.term)}</p></div>
            <div class="face back card">${src}<p class="answer">${esc(it.card.answer)}</p>${expl(it.explanation)}</div>
          </div>
        </div>
        <p class="flip-note" id="flip-note">Tryck på kortet för att vända det.</p>
        <div class="rate" id="rate" hidden>
          <button class="no" data-rate="0">Kunde inte</button>
          <button class="yes" data-rate="1">Kunde</button>
        </div>
      </div>`;
    $('#flip').onclick = flip;
    $('#rate').onclick = e => { const b = e.target.closest('[data-rate]'); if (b) rateFlip(b.dataset.rate === '1'); };
    hint('Mellanslag vänder kortet · ← kunde inte · → kunde');
  }

  else if (S.mode === 'mc') {
    it.opts = mcOptions(it.card);
    S.sel = 0;
    stage.innerHTML = `
      <div class="mc">
        <div class="card">${src}<p class="term">${esc(it.card.term)}</p></div>
        <div>
          <ul class="options" id="options">
            ${it.opts.map((o, n) => `<li><button class="opt" data-i="${n}"><span class="key">${n + 1}</span><span>${esc(o)}</span></button></li>`).join('')}
          </ul>
          <div id="feedback" class="feedback"></div>
        </div>
      </div>`;
    $('#options').onclick = e => { const b = e.target.closest('[data-i]'); if (b) answerMC(+b.dataset.i); };
    updateSel();
    hint('↑ ↓ för att välja · Enter för att svara · eller siffra 1–4');
  }

  else {
    S.sel = -1;
    const body = it.gen
      ? `<p class="term">${esc(it.card.term)}</p><p class="between">betyder</p><p class="claim">${esc(it.claim)}</p>`
      : `<p class="statement">${esc(it.claim)}</p>`;
    stage.innerHTML = `
      <div class="tf">
        <div class="card">${src}${body}</div>
        <div class="tf-btns" id="tf">
          <button class="opt" data-v="1">Sant</button>
          <button class="opt" data-v="0">Falskt</button>
        </div>
        <div id="feedback" class="feedback"></div>
      </div>`;
    $('#tf').onclick = e => { const b = e.target.closest('[data-v]'); if (b) answerTF(b.dataset.v === '1'); };
    hint('← sant · → falskt · Enter för att svara');
  }
}

function mcOptions(c) {
  const pool = [];
  const add = a => { if (pool.length < 3 && a && a !== c.answer && !pool.includes(a)) pool.push(a); };
  shuffle(c.distractors || []).forEach(add);                       // 1. handskrivna felsvar
  shuffle(c.deck.data.cards.map(x => x.answer)).forEach(add);      // 2. andra svar i samma kortlek
  shuffle(S.queue.map(x => x.card.answer)).forEach(add);           // 3. andra svar i omgången
  return shuffle([c.answer, ...pool]);
}

function updateSel() {
  const btns = S.mode === 'mc' ? $$('#options .opt') : $$('#tf .opt');
  btns.forEach((b, n) => b.classList.toggle('sel', n === S.sel));
}

/* ---------- Svar ---------- */
function record(correct) {
  S.answered = true;
  S.results.push({ item: S.cur, correct });
  const stats = lsGet(LS.stats, {});
  const s = stats[S.cur.key] || (stats[S.cur.key] = { seen: 0, miss: 0 });
  s.seen++;
  if (!correct) s.miss++;
  lsSet(LS.stats, stats);
}

function flip() {
  S.flipped = !S.flipped;
  $('#flip').classList.toggle('flipped', S.flipped);
  if (S.flipped) { $('#rate').hidden = false; $('#flip-note').hidden = true; }
}

function rateFlip(correct) {
  if (S.answered || !S.flipped) return;
  record(correct);
  next();
}

function showFeedback(correct, extra) {
  $('#feedback').innerHTML = `
    <p class="verdict ${correct ? 'ok' : 'bad'}">${correct ? 'Rätt.' : 'Fel.'}</p>
    ${extra || ''}
    ${S.cur.explanation ? `<p class="muted">${esc(S.cur.explanation)}</p>` : ''}
    <button class="primary" id="next-btn">Nästa</button>`;
  $('#next-btn').onclick = next;
  hint('Enter för nästa');
}

function answerMC(i) {
  if (S.answered) return;
  const it = S.cur;
  const right = it.opts.indexOf(it.card.answer);
  const correct = i === right;
  record(correct);
  $$('#options .opt').forEach((b, n) => {
    b.disabled = true;
    b.classList.remove('sel');
    b.classList.add(n === right ? 'right' : n === i ? 'wrong' : 'dim');
  });
  showFeedback(correct);
}

function answerTF(saidTrue) {
  if (S.answered) return;
  const it = S.cur;
  const correct = saidTrue === it.truth;
  record(correct);
  $$('#tf .opt').forEach(b => {
    b.disabled = true;
    b.classList.remove('sel');
    const isTrueBtn = b.dataset.v === '1';
    if (isTrueBtn === it.truth) b.classList.add('right');
    else if (isTrueBtn === saidTrue) b.classList.add('wrong');
    else b.classList.add('dim');
  });
  const extra = it.gen && !it.truth ? `<p>Rätt svar: <b>${esc(it.card.answer)}</b></p>` : '';
  showFeedback(correct, extra);
}

function next() {
  S.i++;
  if (S.i >= S.queue.length) finish();
  else renderItem();
}

/* ---------- Resultat ---------- */
function finish() {
  const n = S.results.length;
  if (!n) { show('start'); return; }
  const ok = S.results.filter(r => r.correct).length;
  S.missed = S.results.filter(r => !r.correct).map(r => r.item);
  const pct = Math.round((ok / n) * 100);

  $('#end-score').textContent = `${ok} av ${n} rätt`;
  $('#end-sub').textContent = pct === 100 ? 'Alla rätt.' : `${pct} % rätt${n < S.queue.length ? `, avslutad efter ${n} av ${S.queue.length} kort` : ''}.`;
  $('#retry-btn').hidden = !S.missed.length;
  $('#retry-btn').textContent = `Öva på felen (${S.missed.length})`;
  $('#miss-head').hidden = !S.missed.length;
  $('#miss-list').innerHTML = S.missed.map(it => {
    const [q, a] = S.mode === 'tf' && !it.gen
      ? [it.claim, `Påståendet är ${it.truth ? 'sant' : 'falskt'}.`]
      : [it.card.term, it.card.answer];
    return `<li><span class="m-term">${esc(q)}</span><span class="m-ans">${esc(a)}</span></li>`;
  }).join('');
  show('end');
}

/* ---------- Tangentbord och svep ---------- */
function onKey(e) {
  if ($('#screen-play').hidden) return;
  if (e.target.matches('input, select, textarea')) return;
  const k = e.key;
  const handled = () => e.preventDefault();

  if (k === 'Escape') { handled(); return finish(); }

  if (S.mode === 'flip') {
    if (k === ' ' || k === 'Enter') { handled(); flip(); }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { handled(); rateFlip(k === 'ArrowRight'); }
    return;
  }

  if (S.answered) {
    if (k === 'Enter' || k === ' ') { handled(); next(); }
    return;
  }

  if (S.mode === 'mc') {
    const n = S.cur.opts.length;
    if (k === 'ArrowDown') { handled(); S.sel = (S.sel + 1) % n; updateSel(); }
    else if (k === 'ArrowUp') { handled(); S.sel = (S.sel - 1 + n) % n; updateSel(); }
    else if (k === 'Enter') { handled(); answerMC(S.sel); }
    else if (/^[1-9]$/.test(k) && +k <= n) { handled(); answerMC(+k - 1); }
  } else {
    if (k === 'ArrowLeft') { handled(); S.sel = 0; updateSel(); }
    else if (k === 'ArrowRight') { handled(); S.sel = 1; updateSel(); }
    else if (k === 'Enter' && S.sel >= 0) { handled(); answerTF(S.sel === 0); }
  }
}

function bindSwipe() {
  // Svep åt höger = kunde, vänster = kunde inte (bara i läge 1, efter att kortet vänts).
  let x0 = null, y0 = null;
  const stage = $('#stage');
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (S.mode !== 'flip' || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx)) return;
    rateFlip(dx > 0);
  });
}

/* ---------- Start ---------- */
function bindStart() {
  $('#search').addEventListener('input', renderDecks);
  $('#deck-list').addEventListener('change', e => {
    const k = e.target.dataset.key;
    if (!k) return;
    e.target.checked ? S.selected.add(k) : S.selected.delete(k);
    savePrefs();
  });
  $('#deck-list').addEventListener('click', e => {
    const k = e.target.dataset && e.target.dataset.remove;
    if (!k) return;
    e.preventDefault();
    removeLocal(k);
  });
  $$('input[name=mode]').forEach(r => {
    r.checked = r.value === S.mode;
    r.addEventListener('change', () => { S.mode = r.value; savePrefs(); });
  });
  $('#count').value = String(S.count);
  if (!$('#count').value) $('#count').value = '20';
  $('#count').addEventListener('change', e => { S.count = +e.target.value; savePrefs(); });
  $('#focus').checked = S.focus;
  $('#focus').addEventListener('change', e => { S.focus = e.target.checked; savePrefs(); });
  $('#file-input').addEventListener('change', importFiles);
  $('#start-btn').addEventListener('click', startGame);
  $('#quit-btn').addEventListener('click', finish);
  $('#retry-btn').addEventListener('click', () => play(shuffle(S.missed)));
  $('#again-btn').addEventListener('click', () => play(shuffle(S.lastItems)));
  $('#home-btn').addEventListener('click', () => { renderDecks(); show('start'); });
  document.addEventListener('keydown', onKey);
  bindSwipe();
}

(async function init() {
  loadPrefs();
  await loadIndex();
  for (const k of [...S.selected]) if (!S.decks.some(d => d.key === k)) S.selected.delete(k);
  bindStart();
  renderDecks();
})();
```

## `scripts/build_index.py`

```python
#!/usr/bin/env python3
"""Validerar alla kortlekar i <rot>/decks/ och skriver <rot>/decks/index.json.

Användning: python3 scripts/build_index.py [rot]   (standard: .)
Avslutar med felkod om någon kortlek är ogiltig, så att GitHub Actions stoppar publiceringen.
"""
import json
import re
import sys
from pathlib import Path


def validate(d):
    if not isinstance(d, dict):
        return "filen är inte ett JSON-objekt"
    if not isinstance(d.get("id"), str) or not re.fullmatch(r"[a-z0-9-]+", d["id"]):
        return 'fältet "id" saknas eller innehåller annat än a-z, 0-9 och bindestreck'
    if not isinstance(d.get("title"), str) or not d["title"].strip():
        return 'fältet "title" saknas'
    cards = d.get("cards")
    if not isinstance(cards, list) or not cards:
        return 'fältet "cards" saknas eller är tomt'
    terms = set()
    for n, c in enumerate(cards, 1):
        if not isinstance(c, dict) or not isinstance(c.get("term"), str) or not isinstance(c.get("answer"), str):
            return f'kort {n} saknar "term" eller "answer"'
        if c["term"] in terms:
            return f'kort {n}: begreppet "{c["term"]}" finns redan i kortleken'
        terms.add(c["term"])
        dis = c.get("distractors")
        if dis is not None and (not isinstance(dis, list) or not all(isinstance(x, str) for x in dis)):
            return f'kort {n}: "distractors" måste vara en lista med text'
        st = c.get("statements")
        if st is not None and (
            not isinstance(st, list)
            or not all(isinstance(s, dict) and isinstance(s.get("text"), str) and isinstance(s.get("true"), bool) for s in st)
        ):
            return f'kort {n}: varje påstående behöver "text" och "true" (true/false)'
    return None


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    decks_dir = root / "decks"
    errors, index, ids = [], [], {}

    for f in sorted(decks_dir.glob("*.json")):
        if f.name == "index.json":
            continue
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{f.name}: ogiltig JSON ({e})")
            continue
        err = validate(d)
        if err:
            errors.append(f"{f.name}: {err}")
            continue
        if d["id"] in ids:
            errors.append(f'{f.name}: id "{d["id"]}" används redan av {ids[d["id"]]}')
            continue
        ids[d["id"]] = f.name
        index.append({
            "id": d["id"],
            "title": d["title"],
            "description": d.get("description", ""),
            "tags": d.get("tags", []),
            "count": len(d["cards"]),
            "file": f.name,
        })

    if errors:
        print("Fel i kortlekarna:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    index.sort(key=lambda m: m["title"].lower())
    (decks_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(index)} kortlekar, {sum(m['count'] for m in index)} kort.")


if __name__ == "__main__":
    main()
```

## `.github/workflows/deploy.yml`

```yaml
name: Bygg och publicera

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Validera kortlekar och bygg sajten
        run: |
          mkdir _site
          cp index.html style.css app.js _site/
          cp -r decks _site/decks
          python3 scripts/build_index.py _site

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - id: deployment
        uses: actions/deploy-pages@v4
```

## `decks/reservsattning-grunder.json`

```json
{
  "id": "reservsattning-grunder",
  "title": "Reservsättning – grunder",
  "description": "Centrala begrepp inom skadereservsättning och Solvens II",
  "tags": ["reservsättning", "solvens II"],
  "cards": [
    {
      "term": "IBNR",
      "answer": "Reserv för skador som har inträffat men ännu inte rapporterats till bolaget",
      "distractors": [
        "Reserv för rapporterade skador som ännu inte är slutreglerade",
        "Reserv för framtida skador på försäkringar som redan tecknats",
        "Reserv för skadehanteringskostnader på redan reglerade skador"
      ],
      "explanation": "Incurred But Not Reported. Skattas ofta med triangelmetoder, eftersom det inte finns några enskilda skadeärenden att värdera.",
      "statements": [
        { "text": "IBNR kan värderas ärende för ärende av skadehandläggare.", "true": false },
        { "text": "IBNR ingår i avsättningen för oreglerade skador.", "true": true }
      ]
    },
    {
      "term": "RBNS",
      "answer": "Reserv för rapporterade skador som ännu inte är slutreglerade",
      "explanation": "Reported But Not Settled. Bygger ofta på handläggarnas ärendereserver."
    },
    {
      "term": "Skadetriangel",
      "answer": "Tabell med skadebelopp per skadeår (rader) och utvecklingsperiod (kolumner)",
      "distractors": [
        "Tabell med premier per försäkringsår och produkt",
        "Tabell med skadekvot per månad och land",
        "Matris med korrelationer mellan riskmoduler"
      ]
    },
    {
      "term": "Utvecklingsfaktor",
      "answer": "Kvoten mellan kumulerade skadebelopp i två på varandra följande utvecklingsperioder",
      "distractors": [
        "Kvoten mellan inkrementellt och kumulerat skadebelopp i samma period",
        "Andelen av slutskadekostnaden som är rapporterad vid en viss period",
        "Kvoten mellan skadekostnad och intjänad premie för ett skadeår"
      ],
      "statements": [
        { "text": "En utvecklingsfaktor på 1,00 betyder att det kumulerade beloppet inte förändrades mellan perioderna.", "true": true }
      ]
    },
    {
      "term": "Chain ladder",
      "answer": "Metod som projicerar slutskadekostnaden med utvecklingsfaktorer skattade ur historiska trianglar",
      "distractors": [
        "Metod som sätter reserven till förväntad skadekvot gånger intjänad premie",
        "Metod som väger ihop en a priori-skattning med observerat utfall",
        "Metod som summerar handläggarnas ärendereserver"
      ],
      "explanation": "Bygger på antagandet att historiska utvecklingsmönster är representativa för framtiden.",
      "statements": [
        { "text": "Chain ladder förutsätter att historiska utvecklingsmönster gäller även framåt.", "true": true },
        { "text": "Chain ladder är särskilt stabil för det senaste skadeåret, där lite har hunnit utvecklas.", "true": false, "explanation": "Tvärtom: för outvecklade år multipliceras ett litet observerat belopp med en stor faktor, vilket ger instabila skattningar." }
      ]
    },
    {
      "term": "Bornhuetter-Ferguson",
      "answer": "Metod som kombinerar en a priori förväntad slutskadekostnad med utvecklingsmönstret",
      "distractors": [
        "Metod som projicerar enbart observerade skador med utvecklingsfaktorer",
        "Metod som sätter reserven lika med summan av ärendereserverna",
        "Metod som diskonterar framtida kassaflöden med riskfri ränta"
      ],
      "explanation": "Reserven blir a priori-slutskadekostnaden gånger (1 − 1/kumulativ utvecklingsfaktor). Ger stabilare skattningar än chain ladder för outvecklade år.",
      "statements": [
        { "text": "Bornhuetter-Ferguson bygger enbart på observerade skador.", "true": false }
      ]
    },
    {
      "term": "Svansfaktor",
      "answer": "Faktor som fångar skadeutveckling efter den sista observerade utvecklingsperioden"
    },
    {
      "term": "Best Estimate",
      "answer": "Sannolikhetsviktat medelvärde av framtida kassaflöden, diskonterat med riskfri räntekurva",
      "distractors": [
        "Det mest sannolika enskilda utfallet av framtida kassaflöden, odiskonterat",
        "Ett försiktigt skattat värde av framtida kassaflöden inklusive säkerhetsmarginal",
        "Summan av framtida kassaflöden diskonterad med bolagets förväntade avkastning"
      ],
      "explanation": "Begreppet kommer från Solvens II. Diskonteringen görs med den riskfria räntekurva som EIOPA publicerar.",
      "statements": [
        { "text": "Best Estimate under Solvens II diskonteras inte.", "true": false }
      ]
    },
    {
      "term": "Riskmarginal",
      "answer": "Kostnaden för att hålla solvenskapital under avvecklingen av åtagandena",
      "distractors": [
        "Skillnaden mellan Best Estimate och den bokförda avsättningen",
        "En procentuell säkerhetsmarginal som läggs på alla reserver",
        "Det kapital som krävs för att klara en 1-på-200-årshändelse"
      ],
      "explanation": "Ska spegla vad en annan försäkringsgivare skulle kräva för att ta över åtagandena. Beräknas med en kapitalkostnadsmetod.",
      "statements": [
        { "text": "Riskmarginalen och solvenskapitalkravet (SCR) är samma sak.", "true": false }
      ]
    },
    {
      "term": "Actual vs Expected",
      "answer": "Jämförelse mellan faktiskt utfall och det utfall reservmodellen förväntade sig för perioden",
      "statements": [
        { "text": "En stor avvikelse i Actual vs Expected kan tyda på att modellens antaganden behöver ses över.", "true": true }
      ]
    },
    {
      "term": "Skadekvot",
      "answer": "Skadekostnad i förhållande till intjänad premie",
      "distractors": [
        "Antal skador i förhållande till antal försäkringar",
        "Driftskostnader i förhållande till premieinkomst",
        "Utbetalda skador i förhållande till total reserv"
      ]
    }
  ]
}
```

## `schema/deck.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Kortlek",
  "type": "object",
  "required": ["id", "title", "cards"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$", "description": "Unikt id, samma som filnamnet utan .json" },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "cards": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["term", "answer"],
        "properties": {
          "term": { "type": "string", "description": "Begreppet/frågan. Unikt inom kortleken." },
          "answer": { "type": "string", "description": "Rätt svar." },
          "distractors": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Felaktiga svar i samma form och längd som answer. Används i flerval. Saknas de tas felsvar från andra kort."
          },
          "explanation": { "type": "string", "description": "Visas efter svar." },
          "statements": {
            "type": "array",
            "description": "Påståenden för sant/falskt. Saknas de genereras 'term betyder answer'.",
            "items": {
              "type": "object",
              "required": ["text", "true"],
              "properties": {
                "text": { "type": "string" },
                "true": { "type": "boolean" },
                "explanation": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

## `PROMPT.md`

````markdown
# Prompt: PDF → kortlek

Ladda upp PDF:en i en chatt med Claude och klistra in allt nedanför linjen.
Spara svaret som `decks/<id>.json`.

---

Gör om det bifogade dokumentet till en kortlek för ett övningsspel. Svara **endast** med giltig JSON enligt formatet nedan, utan kodblock eller annan text.

```json
{
  "id": "kort-id-med-bindestreck",
  "title": "Kort titel",
  "description": "En mening om vad kortleken täcker",
  "tags": ["ämne"],
  "cards": [
    {
      "term": "Begrepp eller fråga",
      "answer": "Rätt svar",
      "distractors": ["Fel svar 1", "Fel svar 2", "Fel svar 3"],
      "explanation": "1–2 meningar som förklarar svaret",
      "statements": [
        { "text": "Ett påstående", "true": true },
        { "text": "Ett subtilt felaktigt påstående", "true": false, "explanation": "Varför det är fel" }
      ]
    }
  ]
}
```

Regler:
- `id`: gemener a–z, siffror och bindestreck. Inga å/ä/ö.
- Använd bara innehåll som faktiskt står i dokumentet. Hitta inte på fakta.
- 15–40 kort beroende på dokumentets omfattning. Prioritera det viktigaste.
- `term`: kort och entydigt, högst ett par rader. Varje term unik.
- `answer`: högst cirka 25 ord, fristående och begripligt utan dokumentet.
- `distractors`: exakt 3 per kort. Samma form, längd och ton som `answer`, så att rätt svar inte sticker ut. De ska vara rimliga men tydligt fel för den som kan ämnet. Använd gärna definitioner av närliggande begrepp.
- `statements`: 1–2 per kort för de viktigaste korten, ungefär hälften sanna. Falska påståenden ska vara subtilt fel (fel riktning, fel villkor, förväxlat begrepp), inte uppenbart absurda. Undvik "alltid/aldrig" som ledtråd.
- `explanation`: valfri men önskad, särskilt där det är lätt att göra fel.
- Skriv på samma språk som dokumentet.
````

## `README.md`

````markdown
# ActuallyActuary

Övningsspel med tre lägen: vänd kortet, flerval och sant/falskt. Fungerar i webbläsare på dator och mobil.

## Lägga till en kortlek

1. Gör om en PDF till JSON med prompten i `PROMPT.md`.
2. Lägg filen i `decks/` (på GitHub: öppna mappen `decks` → **Add file → Upload files**).
3. Commit. Efter någon minut finns kortleken i spelet.

GitHub Actions validerar alla kortlekar vid varje ändring. Är en fil trasig stoppas publiceringen och felet syns under fliken **Actions**; den senaste fungerande versionen ligger kvar.

Formatet beskrivs i `schema/deck.schema.json`. Bara `id`, `title` och `cards` (med `term` och `answer`) är obligatoriska.

## Lokala kortlekar

Material som inte ska ligga publikt kan laddas in med **Lägg till lokal kortlek** i appen. Det sparas bara i den webbläsaren.

## Kontroller

| Läge | Tangentbord | Mus/mobil |
|---|---|---|
| Vänd kortet | Mellanslag vänder, ← kunde inte, → kunde | Tryck vänder, knappar eller svep |
| Flerval | ↑ ↓ och Enter, eller 1–4 | Klick |
| Sant/falskt | ← sant, → falskt, Enter | Klick |

Enter går till nästa kort efter svar. Esc avslutar omgången.
````

