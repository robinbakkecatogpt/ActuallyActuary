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
