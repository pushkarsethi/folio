/* ══════════════════════════════════════════════════════════
   FOLIO — script.js
   Advanced financial calculator suite
   ══════════════════════════════════════════════════════════ */
'use strict';

/* ── Chart instances ───────────────────────────────────── */
let compoundChartInst = null, compoundDonutInst = null;
let sipChartInst = null,      sipDonutInst = null;
let goalChartInst = null;

/* ── Last computed data (for export/copy) ──────────────── */
let lastSimple = {}, lastCompound = {}, lastSIP = {}, lastGoal = {};

/* ── Chart.js defaults ─────────────────────────────────── */
Chart.defaults.color = '#64748B';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

function applyChartTheme() {
  const isLight = document.body.classList.contains('light');
  Chart.defaults.color       = isLight ? '#64748B' : '#64748B';
  Chart.defaults.borderColor = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)';
}

/* ══════════════════════════════════════════════════════════
   LIVE MARKET TICKER — Yahoo Finance API (15-min delayed)
   7 visible slots · rotates every 3s · auto-refreshes every 60s
   ══════════════════════════════════════════════════════════ */
(function initTicker() {
  const NUM_SLOTS = 7;

  /* ── Symbol map: display name → Yahoo Finance symbol ── */
  const SYMBOL_MAP = window.FOLIO_SYMBOLS = [
    { sym: 'NIFTY 50',   yahoo: '^NSEI',          tag: 'index' },
    { sym: 'SENSEX',     yahoo: '^BSESN',          tag: 'index' },
    { sym: 'NIFTY BANK', yahoo: '^NSEBANK',        tag: 'index' },
    { sym: 'NIFTY IT',   yahoo: '^CNXIT',          tag: 'index' },
    { sym: 'NIFTY MID',  yahoo: 'NIFTY_MID_SELECT.NS', tag: 'index' },
    { sym: 'RELIANCE',   yahoo: 'RELIANCE.NS'  },
    { sym: 'TCS',        yahoo: 'TCS.NS'       },
    { sym: 'HDFCBANK',   yahoo: 'HDFCBANK.NS'  },
    { sym: 'INFY',       yahoo: 'INFY.NS'      },
    { sym: 'ICICIBANK',  yahoo: 'ICICIBANK.NS' },
    { sym: 'BHARTIARTL', yahoo: 'BHARTIARTL.NS'},
    { sym: 'ITC',        yahoo: 'ITC.NS'       },
    { sym: 'KOTAKBANK',  yahoo: 'KOTAKBANK.NS' },
    { sym: 'LT',         yahoo: 'LT.NS'        },
    { sym: 'SBIN',       yahoo: 'SBIN.NS'      },
    { sym: 'WIPRO',      yahoo: 'WIPRO.NS'     },
    { sym: 'AXISBANK',   yahoo: 'AXISBANK.NS'  },
    { sym: 'MARUTI',     yahoo: 'MARUTI.NS'    },
    { sym: 'SUNPHARMA',  yahoo: 'SUNPHARMA.NS' },
    { sym: 'BAJFINANCE', yahoo: 'BAJFINANCE.NS'},
    { sym: 'ADANIPORTS', yahoo: 'ADANIPORTS.NS'},
    { sym: 'TECHM',      yahoo: 'TECHM.NS'     },
    { sym: 'HCLTECH',    yahoo: 'HCLTECH.NS'   },
    { sym: 'LTIM',       yahoo: 'LTIM.NS'      },
    { sym: 'GOLD MCX',   yahoo: 'GC=F'         },
    { sym: 'USD/INR',    yahoo: 'INR=X'        },
  ];

  /* ── Fallback prices (shown while API loads) ── */
  const FALLBACK = {
    '^NSEI':          { price: 24198.30, chg: +0.42 },
    '^BSESN':         { price: 79671.58, chg: +0.38 },
    '^NSEBANK':       { price: 52134.75, chg: -0.15 },
    '^CNXIT':         { price: 38920.40, chg: +1.24 },
    'NIFTY_MID_SELECT.NS': { price: 55218.65, chg: +0.89 },
    'RELIANCE.NS':    { price: 2847.35,  chg: +1.24 },
    'TCS.NS':         { price: 3921.80,  chg: -0.38 },
    'HDFCBANK.NS':    { price: 1678.45,  chg: +0.62 },
    'INFY.NS':        { price: 1842.60,  chg: +1.85 },
    'ICICIBANK.NS':   { price: 1156.20,  chg: +0.47 },
    'BHARTIARTL.NS':  { price: 1524.90,  chg: +2.14 },
    'ITC.NS':         { price: 478.35,   chg: -0.65 },
    'KOTAKBANK.NS':   { price: 1847.65,  chg: +0.33 },
    'LT.NS':          { price: 3642.15,  chg: +1.07 },
    'SBIN.NS':        { price: 762.40,   chg: +1.56 },
    'WIPRO.NS':       { price: 298.75,   chg: -0.44 },
    'AXISBANK.NS':    { price: 1124.50,  chg: +0.89 },
    'MARUTI.NS':      { price: 12847.30, chg: +0.71 },
    'SUNPHARMA.NS':   { price: 1724.85,  chg: -0.18 },
    'BAJFINANCE.NS':  { price: 6842.10,  chg: +1.33 },
    'ADANIPORTS.NS':  { price: 1284.60,  chg: -0.92 },
    'TECHM.NS':       { price: 1587.40,  chg: +2.37 },
    'HCLTECH.NS':     { price: 1934.25,  chg: +1.62 },
    'LTIM.NS':        { price: 5621.80,  chg: +1.94 },
    'GC=F':           { price: 3087.50,  chg: +0.62 },
    'INR=X':          { price: 83.47,    chg: -0.08 },
  };

  /* ── Live state (starts from fallback, overwritten by API) ── */
  const state = SYMBOL_MAP.map(s => ({
    sym:       s.sym,
    yahoo:     s.yahoo,
    tag:       s.tag || '',
    livePrice: (FALLBACK[s.yahoo] || {}).price || 0,
    liveChg:   (FALLBACK[s.yahoo] || {}).chg   || 0,
    isReal:    false,
  }));

  let offset    = 0;
  let apiStatus = 'loading'; // 'loading' | 'live' | 'delayed' | 'offline'

  /* ── CORS proxies to try in order ── */
  const PROXIES = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  /* Yahoo's v7/quote endpoint now requires a crumb cookie (HTTP 401).
     v8/chart/{SYMBOL} works publicly — fetched per-symbol in parallel. */
  const yahooChartURL = sym =>
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;

  /* ── Fetch with proxy fallback ── */
  async function fetchWithProxy(url, proxyIndex = 0) {
    if (proxyIndex >= PROXIES.length) throw new Error('All proxies failed');
    const proxied = PROXIES[proxyIndex](url);
    try {
      const resp = await fetch(proxied, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      return JSON.parse(text);
    } catch(e) {
      return fetchWithProxy(url, proxyIndex + 1);
    }
  }

  /* Fetch one symbol from Yahoo v8/chart and normalize to {symbol,price,chg} */
  async function fetchOneQuote(sym) {
    const data = await fetchWithProxy(yahooChartURL(sym));
    const r = data?.chart?.result?.[0];
    const meta = r?.meta;
    if (!meta) throw new Error('no meta');
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const chg   = prev ? ((price - prev) / prev) * 100 : 0;
    return { symbol: sym, price, chg };
  }

  /* ── Update state from normalized quotes ── */
  function applyAPIData(quotes) {
    if (!quotes || !quotes.length) return false;
    let ok = false;
    quotes.forEach(q => {
      if (!q) return;
      const entry = state.find(s => s.yahoo === q.symbol);
      if (!entry) return;
      const price = q.price;
      const chg   = q.chg;
      if (price && !isNaN(price)) {
        ok = true;
        const oldChg = entry.liveChg;
        entry.livePrice = price;
        entry.liveChg   = chg || 0;
        entry.isReal    = true;
        // Flash the slot if visible and direction changed
        const slots = getSlots();
        slots.forEach((slot, i) => {
          if (state[(offset + i) % state.length] === entry) {
            const wasPos = oldChg >= 0;
            const isPos  = chg >= 0;
            if (wasPos !== isPos) {
              slot.classList.remove('flash-green','flash-red');
              void slot.offsetWidth;
              slot.classList.add(isPos ? 'flash-green' : 'flash-red');
              setTimeout(() => slot.classList.remove('flash-green','flash-red'), 700);
            }
          }
        });
      }
    });
    return ok;
  }

  /* ── Update the ticker-time label ── */
  function setTickerLabel(status) {
    const t = document.getElementById('tickerTime');
    if (!t) return;
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2,'0');
    const mm  = String(now.getMinutes()).padStart(2,'0');
    const ss  = String(now.getSeconds()).padStart(2,'0');
    const time = `IST ${hh}:${mm}:${ss}`;

    const dot = document.getElementById('tickerStatusDot');
    if (status === 'live' || status === 'delayed') {
      t.innerHTML = '';
      if (dot) dot.style.background = status === 'live' ? '#10B981' : '#F59E0B';
      t.textContent = time;
      // Add a small "delayed" badge
      if (status === 'delayed') {
        const badge = document.createElement('span');
        badge.style.cssText = 'margin-left:6px;font-size:7px;color:#F59E0B;letter-spacing:0.08em;';
        badge.textContent = '~15m delay';
        t.appendChild(badge);
      }
    } else if (status === 'offline') {
      t.textContent = time;
      if (dot) dot.style.background = '#EF4444';
    } else {
      t.textContent = time;
    }
  }

  /* ── Main API fetch loop — parallel per-symbol via v8 chart ── */
  async function fetchLiveData() {
    try {
      const results = await Promise.all(
        SYMBOL_MAP.map(s => fetchOneQuote(s.yahoo).catch(() => null))
      );
      const ok = applyAPIData(results.filter(Boolean));
      apiStatus = ok ? 'delayed' : 'offline';
    } catch(e) {
      apiStatus = 'offline';
      console.warn('FOLIO Ticker: All data sources failed, using simulated prices.');
    }
  }

  /* ── Clock ── */
  function updateClock() { setTickerLabel(apiStatus); }
  updateClock();
  setInterval(updateClock, 1000);

  /* ── Helpers ── */
  function fmtPrice(p) {
    return p.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function renderSlot(slotEl, stock) {
    const isPos  = stock.liveChg >= 0;
    const arrow  = isPos ? '▲' : '▼';
    const chgCls = isPos ? 'pos' : 'neg';
    slotEl.innerHTML =
      `<span class="ts-name">${stock.sym}</span>` +
      `<span class="ts-price">${fmtPrice(stock.livePrice)}</span>` +
      `<span class="ts-chg ${chgCls}">${arrow} ${Math.abs(stock.liveChg).toFixed(2)}%</span>`;
  }

  function getSlots() {
    return Array.from({ length: NUM_SLOTS }, (_, i) =>
      document.getElementById('ts-' + i)
    ).filter(Boolean);
  }

  /* ── Initial render from fallback ── */
  function renderAll() {
    const slots = getSlots();
    slots.forEach((slot, i) => {
      renderSlot(slot, state[(offset + i) % state.length]);
    });
  }
  renderAll();

  /* ── Rotate every 3s ── */
  function rotate() {
    offset = (offset + 1) % state.length;
    const slots = getSlots();
    const bar   = document.getElementById('tickerBar');
    let hasIndex = false;

    slots.forEach((slot, i) => {
      const stock = state[(offset + i) % state.length];
      slot.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      slot.style.opacity    = '0';
      slot.style.transform  = 'translateY(-6px)';
      setTimeout(() => {
        renderSlot(slot, stock);
        slot.style.transform = 'translateY(6px)';
        slot.style.opacity   = '0';
        requestAnimationFrame(() => {
          slot.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
          slot.style.opacity    = '1';
          slot.style.transform  = 'translateY(0)';
        });
        if (stock.tag === 'index') hasIndex = true;
      }, 180);
    });

    if (bar && hasIndex) {
      setTimeout(() => {
        const idxStock = slots.map((_, i) => state[(offset + i) % state.length])
                             .find(s => s.tag === 'index');
        const flashCls = idxStock
          ? (idxStock.liveChg >= 0 ? 'flash-green' : 'flash-red')
          : 'flash-blue';
        bar.classList.remove('flash-green','flash-red','flash-blue');
        void bar.offsetWidth;
        bar.classList.add(flashCls);
        setTimeout(() => bar.classList.remove(flashCls), 900);
      }, 200);
    }
  }
  setInterval(rotate, 3000);

  /* ── Simulate small drift while between API calls ── */
  setInterval(() => {
    if (apiStatus === 'offline') {
      // Full simulation if API is down
      const idx = Math.floor(Math.random() * state.length);
      const s   = state[idx];
      const tickPct = (Math.random() - 0.49) * 0.12;
      s.livePrice   = +(s.livePrice * (1 + tickPct / 100)).toFixed(2);
      s.liveChg     = +(s.liveChg + (Math.random() - 0.49) * 0.06).toFixed(2);
      const slots = getSlots();
      slots.forEach((slot, i) => {
        if ((offset + i) % state.length === idx) renderSlot(slot, s);
      });
    }
  }, 2500);

  /* ── Add a status dot to the ticker label ── */
  const label = document.querySelector('.ticker-label');
  if (label) {
    const statusDot = document.createElement('span');
    statusDot.id = 'tickerStatusDot';
    statusDot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:#F59E0B;display:inline-block;margin-left:2px;transition:background 0.5s;';
    label.appendChild(statusDot);
  }

  /* ── Kick off first fetch immediately, then every 60s ── */
  fetchLiveData();
  setInterval(fetchLiveData, 60000);

})();

/* ══════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════ */
const fmt    = n  => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n));
const fmtCur = n  => (n < 0 ? '−' : '') + '₹' + fmt(n);
const fmtPct = n  => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const v      = id => {
  const raw = parseFloat(document.getElementById(id)?.value);
  // Smart guard: NaN → 0, clamp negatives to 0 (no negative money / negative time).
  return (isNaN(raw) || !isFinite(raw)) ? 0 : Math.max(0, raw);
};
const el     = id => document.getElementById(id);

function fmtLakh(n) {
  if (Math.abs(n) >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (Math.abs(n) >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
  return fmtCur(n);
}

/* ── Toast notification ─────────────────────────────────── */
function showToast(msg, icon = '✓') {
  const t = el('toast');
  el('toast-msg').textContent = msg;
  el('toast-icon').textContent = icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── Animated number pop ────────────────────────────────── */
const popCSS = document.createElement('style');
popCSS.textContent = `@keyframes numPop{from{transform:scale(1.06) translateY(-4px);opacity:.5}to{transform:scale(1);opacity:1}}.npop{animation:numPop .4s cubic-bezier(.34,1.56,.64,1) both}`;
document.head.appendChild(popCSS);

function setVal(id, text) {
  const e = el(id);
  if (!e) return;
  e.textContent = text;
  e.classList.remove('npop');
  void e.offsetWidth;
  e.classList.add('npop');
}

/* ══════════════════════════════════════════════════════════
   NAVBAR — scroll shadow + hamburger
   ══════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  el('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
});

function toggleMenu() {
  el('mobileMenu')?.classList.toggle('open');
}

/* ══════════════════════════════════════════════════════════
   THEME TOGGLE
   ══════════════════════════════════════════════════════════ */
function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  el('theme-icon').textContent = isLight ? '☾' : '☀';
  applyChartTheme();
  // Re-render active calculator so charts repaint with new grid colours
  const activeBtn = document.querySelector('.mnav-btn.active');
  if (activeBtn) {
    const mode = activeBtn.dataset.mode;
    const fns  = { simple: calcSimple, compound: calcCompound, sip: calcSIP, goal: calcGoal };
    if (fns[mode]) fns[mode]();
  }
}

/* ══════════════════════════════════════════════════════════
   STOCK SEARCH POPUP
   ══════════════════════════════════════════════════════════ */
function openStockSearch() {
  el('stockSearchOverlay')?.classList.add('open');
  el('stockSearchModal')?.classList.add('open');
  setTimeout(() => el('stockSearchInput')?.focus(), 30);
}

function closeStockSearch() {
  el('stockSearchOverlay')?.classList.remove('open');
  el('stockSearchModal')?.classList.remove('open');
  const input = el('stockSearchInput');
  if (input) input.value = '';
  handleStockSearch('');
}

function getSearchSymbols() {
  return window.FOLIO_SYMBOLS || [];
}

function handleStockSearch(value) {
  const query = (value || '').trim().toUpperCase();
  const chips = el('ssmChips');
  const result = el('ssmResult');
  if (!chips || !result) return;

  chips.querySelectorAll('.ssm-chip').forEach(chip => {
    chip.style.display = query ? (chip.textContent.toUpperCase().includes(query) ? '' : 'none') : '';
  });

  if (!query) {
    result.style.display = 'none';
    result.innerHTML = '';
    return;
  }

  const match = getSearchSymbols().find(s =>
    s.sym.toUpperCase().includes(query) || s.yahoo.toUpperCase().includes(query)
  );
  if (match) {
    searchStock(match.sym, match.yahoo, false);
  } else {
    result.style.display = 'block';
    result.innerHTML = '<div class="ssm-note">No matching NSE symbol found.</div>';
  }
}

function handleSearchKey(event) {
  if (event.key === 'Escape') closeStockSearch();
  if (event.key !== 'Enter') return;
  const query = (event.target.value || '').trim().toUpperCase();
  const match = getSearchSymbols().find(s =>
    s.sym.toUpperCase().includes(query) || s.yahoo.toUpperCase().includes(query)
  );
  if (match) searchStock(match.sym, match.yahoo);
}

function searchStock(name, yahoo, keepOpen = true) {
  const result = el('ssmResult');
  if (!result) return;
  result.style.display = 'block';
  result.innerHTML = `
    <div class="ssm-result-card">
      <div class="ssm-result-top">
        <div>
          <div class="ssm-symbol">${name}</div>
          <div class="ssm-yahoo">${yahoo}</div>
        </div>
        <div class="ssm-result-loading">
          <div class="ssm-spinner"></div>
          <span>Fetching live quote…</span>
        </div>
      </div>
      <div class="ssm-note">Pulling the latest available market price for <strong>${name}</strong>.</div>
    </div>`;

  // Yahoo v7/quote requires a crumb cookie now → use v8/chart (public).
  // Try several CORS proxies in order so a single proxy outage doesn't break the popup.
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=2d`;
  const proxies = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  (async () => {
    for (const wrap of proxies) {
      try {
        const resp = await fetch(wrap(target), { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const data = await resp.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || meta.regularMarketPrice == null) continue;
        const price = meta.regularMarketPrice;
        const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const chg   = prev ? ((price - prev) / prev) * 100 : 0;
        const isPos = chg >= 0;
        result.innerHTML = `
          <div class="ssm-result-card">
            <div class="ssm-result-top">
              <div>
                <div class="ssm-symbol">${name}</div>
                <div class="ssm-yahoo">${yahoo}</div>
              </div>
              <div class="ssm-price">${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </div>
            <div class="ssm-change ${isPos ? 'pos' : 'neg'}">${isPos ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%</div>
            <div class="ssm-note">Live quote via Yahoo Finance · may be 15 min delayed.</div>
          </div>`;
        return;
      } catch (_) { /* try next proxy */ }
    }
    result.innerHTML = `
      <div class="ssm-result-card">
        <div class="ssm-result-top">
          <div>
            <div class="ssm-symbol">${name}</div>
            <div class="ssm-yahoo">${yahoo}</div>
          </div>
        </div>
        <div class="ssm-note">Quote is temporarily unavailable. Please try again shortly.</div>
      </div>`;
  })();

  if (keepOpen) openStockSearch();
}

/* ══════════════════════════════════════════════════════════
   UI HELPERS
   ══════════════════════════════════════════════════════════ */
function syncS(id, badgeId, val, unit) {
  const inp = el(id);
  if (inp) inp.value = val;
  const badge = el(badgeId);
  if (!badge) return;
  if (badge.tagName === 'INPUT') {
    if (document.activeElement !== badge) badge.value = val;
  } else {
    badge.textContent = val + ' ' + unit;
  }
}

/* Edit badge -> drives slider + hidden value (used by editable number badges) */
function editBadge(rangeId, hiddenId, val) {
  let v = parseFloat(val);
  if (isNaN(v)) return;
  const r = el(rangeId);
  if (r) {
    const mn = parseFloat(r.min), mx = parseFloat(r.max);
    if (!isNaN(mn) && v < mn) v = mn;
    if (!isNaN(mx) && v > mx) v = mx;
    r.value = v;
  }
  const h = el(hiddenId);
  if (h) h.value = v;
}

function switchMode(mode) {
  ['simple', 'compound', 'sip', 'goal'].forEach(m => {
    const p = el('panel-' + m);
    if (p) p.style.display = m === mode ? '' : 'none';
  });
  document.querySelectorAll('.mnav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', ['simple','compound','sip','goal'][i] === mode);
  });
  const fns = { simple: calcSimple, compound: calcCompound, sip: calcSIP, goal: calcGoal };
  if (fns[mode]) fns[mode]();

  // Scroll to calculator section
  const calcSection = el('calculators');
  if (calcSection) {
    setTimeout(() => calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
}

function toggleBd(id) {
  const box = el(id);
  if (!box) return;
  const hidden = box.classList.toggle('bd-hidden');
  const toggle = box.previousElementSibling;
  if (toggle) {
    const chev = toggle.querySelector('.bd-chev');
    if (chev) chev.style.transform = hidden ? '' : 'rotate(180deg)';
    toggle.classList.toggle('bd-open', !hidden);
  }
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (!item) return;
  const answer = item.querySelector('.faq-a');
  const icon   = item.querySelector('.faq-icon');
  const isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    const a = i.querySelector('.faq-a');
    const ic = i.querySelector('.faq-icon');
    if (a)  a.style.display = 'none';
    if (ic) ic.textContent  = '+';
  });

  // Open clicked one if it was closed
  if (!isOpen) {
    item.classList.add('open');
    if (answer) answer.style.display = 'block';
    if (icon)   icon.textContent = '×';
  }
}

function setFreq(n) {
  el('c-freq').value = n;
  document.querySelectorAll('.freq-pill').forEach(p => {
    p.classList.toggle('active', +p.dataset.n === n);
  });
  calcCompound();
}

function setGoalPreset(el_btn, target, name, years, rate) {
  el('g-target').value = target;
  el('g-years-r').value = years;
  el('g-rate-r').value = rate;
  syncS('g-years', 'g-years-badge', years, 'yrs');
  syncS('g-rate', 'g-rate-badge', rate, '%');
  document.querySelectorAll('.goal-pill').forEach(p => p.classList.remove('active'));
  if (el_btn) el_btn.classList.add('active');
  calcGoal();
}

function resetAll() {
  document.querySelectorAll('input').forEach(inp => { inp.value = inp.defaultValue; });
  [
    ['s-years','s-years-badge','yrs'], ['s-inflation','s-infl-badge','%'],
    ['c-rate','c-rate-badge','%'],    ['c-years','c-years-badge','yrs'],
    ['sip-rate','sip-rate-badge','%'],['sip-years','sip-years-badge','yrs'],
    ['sip-stepup','sip-step-badge','%'],
    ['g-years','g-years-badge','yrs'],['g-rate','g-rate-badge','%'],
    ['g-stepup','g-step-badge','%'],
  ].forEach(([id, badge, unit]) => {
    const r = el(id + '-r');
    if (r) syncS(id, badge, r.defaultValue, unit);
  });
  calcSimple();
  showToast('All fields reset to defaults', '↺');
}

/* ══════════════════════════════════════════════════════════
   CHART FACTORY — Line
   ══════════════════════════════════════════════════════════ */
function buildLineChart(canvasId, labels, datasets, existing) {
  const canvas = el(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (existing) existing.destroy();

  const isLight  = document.body.classList.contains('light');
  const gridCol  = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.04)';
  const tickCol  = isLight ? '#94A3B8' : '#475569';
  const tooltipBg = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(10,15,28,0.96)';
  const tooltipBorder = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.08)';
  const tooltipTitle  = isLight ? '#0F172A' : '#F1F5F9';
  const tooltipBody   = isLight ? '#475569' : '#94A3B8';

  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: datasets.length > 1,
          labels: { boxWidth: 8, boxHeight: 8, borderRadius: 3, font: { family: 'Space Mono', size: 9 }, color: tickCol, padding: 14 },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder, borderWidth: 1,
          titleColor: tooltipTitle, bodyColor: tooltipBody,
          titleFont: { family: 'Space Mono', size: 10 },
          bodyFont:  { family: 'Space Mono', size: 11 },
          padding: 12, cornerRadius: 8,
          callbacks: { label: c => '  ' + fmtLakh(c.raw) },
        },
      },
      scales: {
        x: { grid: { color: gridCol }, ticks: { font: { family: 'Space Mono', size: 8 }, color: tickCol, maxTicksLimit: 10 } },
        y: { grid: { color: gridCol }, ticks: { font: { family: 'Space Mono', size: 8 }, color: tickCol, callback: v => fmtLakh(v) } },
      },
      elements: { line: { borderWidth: 2 }, point: { radius: 0, hitRadius: 8 } },
    },
  });
}

/* ── Donut Chart Factory ────────────────────────────────── */
function buildDonut(canvasId, labels, data, colors, existing, legendId) {
  const canvas = el(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (existing) existing.destroy();

  const isLight   = document.body.classList.contains('light');
  const tooltipBg = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(10,15,28,0.96)';
  const tooltipBorder = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.08)';
  const tooltipTitle  = isLight ? '#0F172A' : '#F1F5F9';
  const tooltipBody   = isLight ? '#475569' : '#94A3B8';

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 5 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
          titleColor: tooltipTitle, bodyColor: tooltipBody,
          titleFont: { family: 'Space Mono', size: 10 },
          bodyFont:  { family: 'Space Mono', size: 11 },
          padding: 10, cornerRadius: 8,
          callbacks: { label: c => '  ' + fmtLakh(c.raw) + ' (' + ((c.raw / c.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1) + '%)' },
        },
      },
    },
  });

  const legend = el(legendId);
  if (legend) {
    legend.innerHTML = labels.map((l, i) =>
      `<div class="dl-item"><div class="dl-dot" style="background:${colors[i]}"></div><span>${l}</span></div>`
    ).join('');
  }
  return chart;
}

/* ══════════════════════════════════════════════════════════
   BENCHMARK MINI ROWS
   ══════════════════════════════════════════════════════════ */
const BENCHMARKS = [
  { name: 'Nifty 50',  cagr: 14.8, color: '#b8ff3e' },
  { name: 'PPF',       cagr: 7.1,  color: '#9aa0b4' },
  { name: 'FD',        cagr: 6.8,  color: '#9aa0b4' },
  { name: 'Inflation', cagr: 6.2,  color: '#ff5757' },
];

function updateBenchmarkMini(yourCAGR) {
  const container = el('bench-simple-rows');
  if (!container) return;

  const allRows = [{ name: 'Your CAGR', cagr: yourCAGR, color: '#b8ff3e', yours: true }, ...BENCHMARKS];
  const maxCagr = Math.max(...allRows.map(b => Math.abs(b.cagr)), 1);

  container.innerHTML = allRows.map(b => `
    <div class="bench-mini-row">
      <span class="bmr-name">${b.name}</span>
      <div class="bmr-bar-wrap">
        <div class="bmr-bar" style="width:${Math.max((b.cagr/maxCagr)*100,0).toFixed(1)}%;background:${b.color}"></div>
      </div>
      <span class="bmr-pct ${b.yours ? 'bmr-yours' : ''}">${b.cagr >= 0 ? '+' : ''}${b.cagr.toFixed(1)}%</span>
    </div>`
  ).join('');
}

/* ══════════════════════════════════════════════════════════
   EXPORT TO CSV
   ══════════════════════════════════════════════════════════ */
function exportCSV(mode) {
  let csv = '';
  let filename = 'yield_';

  if (mode === 'simple' && lastSimple.rows) {
    csv = 'Item,Value\n' + lastSimple.rows.map(r => `"${r[0]}","${r[1]}"`).join('\n');
    filename += 'simple_return.csv';
  } else if (mode === 'compound' && lastCompound.rows) {
    csv = 'Year,Opening Balance,Interest Earned,Tax,After-Tax Interest,Closing Balance\n' +
          lastCompound.rows.map(r => r.join(',')).join('\n');
    filename += 'compound_interest.csv';
  } else if (mode === 'sip' && lastSIP.rows) {
    csv = 'Year,Monthly SIP,Year Invested,Total Invested,Returns Earned,Corpus\n' +
          lastSIP.rows.map(r => r.join(',')).join('\n');
    filename += 'sip_planner.csv';
  } else {
    showToast('No data to export yet. Calculate first.', '⚠');
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully', '↓');
}

/* ══════════════════════════════════════════════════════════
   COPY RESULTS TO CLIPBOARD
   ══════════════════════════════════════════════════════════ */
function copyResults(mode) {
  let text = '';

  if (mode === 'simple' && lastSimple.summary) {
    text = '=== YIELD — Simple Return Calculator ===\n\n' + lastSimple.summary;
  } else if (mode === 'compound' && lastCompound.summary) {
    text = '=== YIELD — Compound Interest Calculator ===\n\n' + lastCompound.summary;
  } else if (mode === 'sip' && lastSIP.summary) {
    text = '=== YIELD — SIP Planner ===\n\n' + lastSIP.summary;
  } else if (mode === 'goal' && lastGoal.summary) {
    text = '=== YIELD — Goal Planner ===\n\n' + lastGoal.summary;
  } else {
    showToast('Calculate first to copy results', '⚠');
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast('Results copied to clipboard', '⎘'))
    .catch(() => showToast('Copy failed — try again', '✗'));
}

/* ══════════════════════════════════════════════════════════
   APPROXIMATE XIRR (Newton-Raphson, max 100 iterations)
   ══════════════════════════════════════════════════════════ */
function approxXIRR(cashflows, dates) {
  // cashflows: array of { amount, date(ms) }
  const YEAR_MS = 365.25 * 24 * 3600 * 1000;
  let rate = 0.1;

  for (let iter = 0; iter < 100; iter++) {
    let f = 0, df = 0;
    const t0 = dates[0];
    for (let i = 0; i < cashflows.length; i++) {
      const t = (dates[i] - t0) / YEAR_MS;
      const pow = Math.pow(1 + rate, t);
      f  += cashflows[i] / pow;
      df -= t * cashflows[i] / (pow * (1 + rate));
    }
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
  }
  return rate;
}

/* ══════════════════════════════════════════════════════════
   PANEL 1 — SIMPLE RETURN
   ══════════════════════════════════════════════════════════ */
function calcSimple() {
  const initial  = v('s-initial');
  const finalVal = v('s-final');
  const years    = v('s-years') || 1;
  const feePct   = v('s-fee');
  const taxPct   = v('s-tax');
  const sttPct   = v('s-stt');
  const inflPct  = v('s-inflation');

  const fee       = initial * feePct / 100;
  const stt       = initial * sttPct / 100;
  const costBasis = initial + fee + stt;
  const grossGain = finalVal - costBasis;
  const taxAmt    = grossGain > 0 ? grossGain * taxPct / 100 : 0;
  const netGain   = grossGain - taxAmt;
  const netValue  = finalVal - taxAmt - fee - stt;

  const totalRetPct = initial ? ((finalVal - initial) / initial) * 100 : 0;
  const cagr        = years > 0 && initial > 0
                        ? (Math.pow(finalVal / initial, 1 / years) - 1) * 100
                        : 0;
  const realCAGR    = ((1 + cagr / 100) / (1 + inflPct / 100) - 1) * 100;

  // Big card
  const big = el('big-simple');
  if (big) {
    big.classList.remove('pos', 'neg');
    big.classList.add(netGain >= 0 ? 'pos' : 'neg');
  }
  setVal('bv-netgain', fmtCur(netGain));
  if (el('bs-netgain')) el('bs-netgain').textContent = netGain >= 0
    ? `Profit after fees (${feePct}%) & tax (${taxPct}%)`
    : `Loss after all deductions`;

  // ROI bar
  const roiPct = initial ? Math.min(Math.max((netGain / initial) * 100, -100), 200) : 0;
  const fill = el('roi-bar-fill');
  if (fill) fill.style.width = Math.max(0, roiPct / 2).toFixed(1) + '%';
  if (el('roi-bar-label')) el('roi-bar-label').textContent = `ROI: ${fmtPct(roiPct)} on principal`;

  // Metrics
  const trEl = el('mv-totalret');
  if (trEl) { trEl.textContent = fmtPct(totalRetPct); trEl.className = 'metric-val ' + (totalRetPct >= 0 ? 'pos' : 'neg'); }
  const cagrEl = el('mv-cagr');
  if (cagrEl) { cagrEl.textContent = fmtPct(cagr); cagrEl.className = 'metric-val ' + (cagr >= 0 ? 'pos' : 'neg'); }
  const realEl = el('mv-real');
  if (realEl) { realEl.textContent = fmtPct(realCAGR); realEl.className = 'metric-val ' + (realCAGR >= 0 ? '' : 'neg'); }
  setVal('mv-netval', fmtCur(netValue));

  // Benchmark comparison
  updateBenchmarkMini(cagr);

  // Breakdown table
  const rows = [
    ['Purchase Price',             fmtCur(initial),           '100%'],
    ['Brokerage Fee ('+feePct+'%)','−'+fmtCur(fee),           fmtPct(-feePct)],
    ['STT ('+sttPct+'%)',          '−'+fmtCur(stt),           fmtPct(-sttPct)],
    ['Total Cost Basis',           fmtCur(costBasis),         ''],
    ['Sale / Current Value',       fmtCur(finalVal),          ''],
    ['Gross Gain / Loss',          fmtCur(grossGain),         fmtPct(totalRetPct)],
    ['Capital Gains Tax ('+taxPct+'%)', grossGain > 0 ? '−'+fmtCur(taxAmt) : '—', grossGain > 0 ? fmtPct(-taxPct) : ''],
    ['Net Gain / Loss',            fmtCur(netGain),           fmtPct(initial ? (netGain/initial)*100 : 0)],
    ['CAGR (annualised)',          fmtPct(cagr),              years + ' yrs'],
    ['Real CAGR (post-inflation)', fmtPct(realCAGR),          'adj. for '+inflPct+'% inflation'],
  ];

  const tbody = el('s-bd-body');
  if (tbody) {
    tbody.innerHTML = rows.map(([label, val, pct]) =>
      `<tr><td>${label}</td>
       <td class="${val.startsWith('−') ? 'loss' : (val.startsWith('+') ? 'profit' : '')}">${val}</td>
       <td style="color:var(--text-dim);font-size:10px">${pct}</td></tr>`
    ).join('');
  }

  // Save for export/copy
  lastSimple.rows = rows.map(r => [r[0], r[1]]);
  lastSimple.summary =
    `Initial Investment:  ${fmtCur(initial)}\n` +
    `Final Value:         ${fmtCur(finalVal)}\n` +
    `Net Gain / Loss:     ${fmtCur(netGain)}\n` +
    `Total Return:        ${fmtPct(totalRetPct)}\n` +
    `CAGR:                ${fmtPct(cagr)}\n` +
    `Real CAGR:           ${fmtPct(realCAGR)}\n` +
    `Holding Period:      ${years} years\n` +
    `Generated by YIELD — https://yield.finance`;
}

/* ══════════════════════════════════════════════════════════
   PANEL 2 — COMPOUND INTEREST
   ══════════════════════════════════════════════════════════ */
function calcCompound() {
  const P    = v('c-principal');
  const r    = v('c-rate') / 100;
  const n    = v('c-freq') || 4;
  const t    = v('c-years') || 1;
  const tax  = v('c-tax') / 100;
  const infl = v('c-inflation') / 100;

  const A         = P * Math.pow(1 + r / n, n * t);
  const totInt    = A - P;
  const effRate   = (Math.pow(1 + r / n, n) - 1) * 100;
  const taxOnInt  = totInt * tax;
  const afterTaxA = A - taxOnInt;
  const realR     = ((1 + r) / (1 + infl) - 1) * 100;
  const realVal   = P * Math.pow(1 + realR / 100, t);
  const doubTime  = (72 / (v('c-rate'))).toFixed(1);

  setVal('bv-maturity',   fmtLakh(A));
  setVal('mv-cinterest',  fmtLakh(totInt));
  setVal('mv-effective',  effRate.toFixed(2) + '%');
  setVal('mv-ctax',       fmtLakh(afterTaxA));
  setVal('mv-creal',      fmtLakh(realVal));
  if (el('rule72-val')) el('rule72-val').textContent = doubTime + ' years';

  // Donut chart: principal vs interest
  compoundDonutInst = buildDonut(
    'compoundDonut',
    ['Principal', 'Interest'],
    [P, totInt],
    ['rgba(100,116,139,0.75)', '#2563EB'],
    compoundDonutInst,
    'donut-legend-c'
  );

  // Line chart
  const labels = [], pArr = [], aArr = [];
  for (let y = 0; y <= t; y++) {
    labels.push('Yr ' + y);
    pArr.push(P);
    aArr.push(P * Math.pow(1 + r / n, n * y));
  }
  compoundChartInst = buildLineChart('compoundChart', labels, [
    { label: 'Principal', data: pArr, borderColor: 'rgba(90,98,114,0.6)', backgroundColor: 'rgba(90,98,114,0.05)', fill: true, tension: 0 },
    { label: 'Value', data: aArr, borderColor: '#2563EB',
      backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,180); g.addColorStop(0,'rgba(37,99,235,0.14)'); g.addColorStop(1,'rgba(37,99,235,0)'); return g; },
      fill: true, tension: 0.4 },
  ], compoundChartInst);

  // Year-by-year table
  const tbody = el('c-bd-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const csvRows = [];
  let bal = P;
  for (let y = 1; y <= t; y++) {
    const newBal  = P * Math.pow(1 + r / n, n * y);
    const yInt    = newBal - bal;
    const yTax    = yInt * tax;
    const yAfter  = yInt - yTax;
    tbody.innerHTML += `<tr>
      <td>${y}</td>
      <td>₹${fmt(bal)}</td>
      <td class="profit">₹${fmt(yInt)}</td>
      <td class="loss">₹${fmt(yTax)}</td>
      <td>₹${fmt(yAfter)}</td>
      <td class="bal">₹${fmt(bal + yAfter)}</td>
    </tr>`;
    csvRows.push([y, fmt(bal), fmt(yInt), fmt(yTax), fmt(yAfter), fmt(bal + yAfter)]);
    bal = newBal;
  }

  lastCompound.rows = csvRows;
  lastCompound.summary =
    `Principal:            ${fmtCur(P)}\n` +
    `Maturity Value:       ${fmtLakh(A)}\n` +
    `Total Interest:       ${fmtLakh(totInt)}\n` +
    `Effective Rate (EAR): ${effRate.toFixed(2)}%\n` +
    `Post-Tax Value:       ${fmtLakh(afterTaxA)}\n` +
    `Inflation-Adj Value:  ${fmtLakh(realVal)}\n` +
    `Money doubles in:     ${doubTime} years (Rule of 72)\n` +
    `Generated by YIELD`;
}

/* ══════════════════════════════════════════════════════════
   PANEL 3 — SIP
   ══════════════════════════════════════════════════════════ */
function calcSIP() {
  const monthly   = v('sip-monthly');
  const rate      = v('sip-rate') / 100;
  const years     = v('sip-years') || 1;
  const stepup    = v('sip-stepup') / 100;
  const infl      = v('sip-inflation') / 100;
  const lumpsum   = v('sip-lumpsum');

  const mr = rate / 12;
  let corpus = 0, invested = 0, cur = monthly;
  const snaps = [{ year:0, invested:0, corpus:0, monthly, yearlyInvested:0 }];

  // Build XIRR cashflows list
  const now = Date.now();
  const cfAmounts = [], cfDates = [];

  for (let y = 1; y <= years; y++) {
    if (y > 1) cur *= (1 + stepup);
    let yearlyInvested = 0;
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + cur) * (1 + mr);
      invested += cur;
      yearlyInvested += cur;
      cfAmounts.push(-cur);
      cfDates.push(now + ((y - 1) * 12 + m) * 30.44 * 24 * 3600 * 1000);
    }
    snaps.push({ year: y, invested, corpus, monthly: cur, yearlyInvested });
  }
  // Final positive cashflow = corpus
  cfAmounts.push(corpus);
  cfDates.push(now + years * 365.25 * 24 * 3600 * 1000);

  const gains     = corpus - invested;
  const realCorpus = corpus / Math.pow(1 + infl, years);

  // XIRR
  let xirr = 0;
  try { xirr = approxXIRR(cfAmounts, cfDates) * 100; } catch(e) { xirr = 0; }

  // Lump sum comparison
  const lsCorpus = lumpsum > 0 ? lumpsum * Math.pow(1 + rate, years) : 0;
  const lsEl = el('lumpsum-compare');
  if (lsEl) {
    lsEl.style.display = lumpsum > 0 ? '' : 'none';
    const diff = corpus - lsCorpus;
    if (el('lc-val')) el('lc-val').textContent = fmtLakh(lsCorpus);
    if (el('lc-diff')) el('lc-diff').textContent = diff >= 0
      ? `SIP outperforms by ${fmtLakh(diff)}`
      : `Lump sum outperforms by ${fmtLakh(Math.abs(diff))}`;
  }

  setVal('bv-corpus',   fmtLakh(corpus));
  setVal('mv-invested', fmtLakh(invested));
  setVal('mv-sipgain',  fmtLakh(gains));
  setVal('mv-xirr',     xirr > 0 ? fmtPct(xirr) : '—');
  setVal('mv-sipreal',  fmtLakh(realCorpus));

  // Donut
  sipDonutInst = buildDonut(
    'sipDonut',
    ['Invested', 'Returns'],
    [invested, gains],
    ['rgba(100,116,139,0.75)', '#10B981'],
    sipDonutInst,
    'donut-legend-sip'
  );

  // Line chart
  const labels   = snaps.map(d => 'Yr ' + d.year);
  const invArr   = snaps.map(d => d.invested);
  const corArr   = snaps.map(d => d.corpus);

  sipChartInst = buildLineChart('sipChart', labels, [
    { label: 'Invested', data: invArr, borderColor: 'rgba(90,98,114,0.6)', backgroundColor: 'rgba(90,98,114,0.05)', fill: true, tension: 0 },
    { label: 'Corpus', data: corArr, borderColor: '#10B981',
      backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,180); g.addColorStop(0,'rgba(16,185,129,0.13)'); g.addColorStop(1,'rgba(16,185,129,0)'); return g; },
      fill: true, tension: 0.4 },
  ], sipChartInst);

  // Table
  const tbody = el('sip-bd-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const csvRows = [];
  snaps.slice(1).forEach(d => {
    const ret = d.corpus - d.invested;
    tbody.innerHTML += `<tr>
      <td>${d.year}</td>
      <td>₹${fmt(d.monthly)}</td>
      <td>₹${fmt(d.yearlyInvested)}</td>
      <td>₹${fmt(d.invested)}</td>
      <td class="profit">₹${fmt(ret)}</td>
      <td class="bal">₹${fmt(d.corpus)}</td>
    </tr>`;
    csvRows.push([d.year, fmt(d.monthly), fmt(d.yearlyInvested), fmt(d.invested), fmt(ret), fmt(d.corpus)]);
  });

  lastSIP.rows = csvRows;
  lastSIP.summary =
    `Starting Monthly SIP:  ${fmtCur(monthly)}\n` +
    `Annual Step-Up:         ${(stepup*100).toFixed(0)}%\n` +
    `Investment Duration:    ${years} years\n` +
    `Total Amount Invested:  ${fmtLakh(invested)}\n` +
    `Returns Earned:         ${fmtLakh(gains)}\n` +
    `Final Corpus:           ${fmtLakh(corpus)}\n` +
    `XIRR (approx):          ${xirr.toFixed(2)}%\n` +
    `Inflation-Adj Corpus:   ${fmtLakh(realCorpus)}\n` +
    `Generated by YIELD`;
}

/* ══════════════════════════════════════════════════════════
   PANEL 4 — GOAL PLANNER (Reverse SIP)
   ══════════════════════════════════════════════════════════ */
function calcGoal() {
  const target  = v('g-target');
  const years   = v('g-years') || 1;
  const rate    = v('g-rate') / 100;
  const stepup  = v('g-stepup') / 100;
  const infl    = v('g-inflation') / 100;

  const mr = rate / 12;
  const months = years * 12;

  // Reverse calculate: what monthly SIP gives the target corpus?
  // Using binary search since step-up makes closed form complex
  let lo = 100, hi = target;
  let sipNeeded = 0;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    // Simulate corpus with this starting SIP
    let corpus = 0, cur = mid;
    for (let y = 1; y <= years; y++) {
      if (y > 1) cur *= (1 + stepup);
      for (let m = 0; m < 12; m++) {
        corpus = (corpus + cur) * (1 + mr);
      }
    }
    if (corpus < target) lo = mid;
    else hi = mid;
    sipNeeded = mid;
    if (Math.abs(corpus - target) < 1) break;
  }

  // Now compute summary stats with sipNeeded
  let corpus = 0, invested = 0, cur = sipNeeded;
  let sip5yr = sipNeeded;
  const snaps = [{ year:0, invested:0, corpus:0, monthly:sipNeeded }];

  for (let y = 1; y <= years; y++) {
    if (y > 1) cur *= (1 + stepup);
    if (y === 5) sip5yr = cur;
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + cur) * (1 + mr);
      invested += cur;
    }
    snaps.push({ year:y, invested, corpus, monthly:cur });
  }

  const returns    = corpus - invested;
  const realTarget = target / Math.pow(1 + infl, years); // today's equivalent of target

  setVal('bv-sip-needed', fmtCur(sipNeeded));
  if (el('bs-goal')) el('bs-goal').textContent = `Starting SIP to reach ${fmtLakh(target)} in ${years}yrs`;
  setVal('mv-g-invested', fmtLakh(invested));
  setVal('mv-g-returns',  fmtLakh(returns));
  setVal('mv-g-realgoal', fmtLakh(realTarget));
  setVal('mv-g-sip5',     years >= 5 ? fmtCur(sip5yr) : 'N/A');

  // Goal chart — corpus milestone + target line
  const labels  = snaps.map(d => 'Yr ' + d.year);
  const corArr  = snaps.map(d => d.corpus);
  const invArr  = snaps.map(d => d.invested);
  const tgtArr  = snaps.map(() => target);

  goalChartInst = buildLineChart('goalChart', labels, [
    { label: 'Invested', data: invArr, borderColor: 'rgba(90,98,114,0.6)', backgroundColor: 'rgba(90,98,114,0.04)', fill: true, tension: 0 },
    { label: 'Corpus', data: corArr, borderColor: '#8B5CF6',
      backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,180); g.addColorStop(0,'rgba(139,92,246,0.12)'); g.addColorStop(1,'rgba(139,92,246,0)'); return g; },
      fill: true, tension: 0.4 },
    { label: 'Goal', data: tgtArr, borderColor: 'rgba(37,99,235,0.5)', borderDash: [6,3], pointRadius: 0, fill: false, tension: 0 },
  ], goalChartInst);

  // Sensitivity table: what if returns change?
  const rates = [6, 8, 10, 12, 14, 16, 18];
  const sbody = el('g-sensitivity-body');
  if (sbody) {
    sbody.innerHTML = '';
    rates.forEach(rr => {
      const mr2 = rr / 100 / 12;
      // Binary search for SIP at this rate
      let lo2 = 100, hi2 = target, sip2 = 0;
      for (let i = 0; i < 60; i++) {
        const m2 = (lo2 + hi2) / 2;
        let c2 = 0, cv = m2;
        for (let y = 1; y <= years; y++) {
          if (y > 1) cv *= (1 + stepup);
          for (let mm = 0; mm < 12; mm++) c2 = (c2 + cv) * (1 + mr2);
        }
        if (c2 < target) lo2 = m2; else hi2 = m2;
        sip2 = m2;
      }
      let inv2 = 0, cv2 = sip2;
      for (let y = 1; y <= years; y++) {
        if (y > 1) cv2 *= (1 + stepup);
        inv2 += cv2 * 12;
      }
      const isCurrent = rr === Math.round(rate * 100);
      sbody.innerHTML += `<tr ${isCurrent ? 'style="background:rgba(37,99,235,0.06)"' : ''}>
        <td ${isCurrent ? 'class="profit"' : ''}>${rr}% ${isCurrent ? '← current' : ''}</td>
        <td class="profit">₹${fmt(sip2)}/mo</td>
        <td>₹${fmt(inv2)}</td>
        <td class="profit">₹${fmt(target - inv2)}</td>
      </tr>`;
    });
  }

  lastGoal.summary =
    `Goal Target:           ${fmtLakh(target)}\n` +
    `Time Horizon:          ${years} years\n` +
    `Expected Return:       ${(rate*100).toFixed(1)}%\n` +
    `Annual Step-Up:        ${(stepup*100).toFixed(0)}%\n` +
    `Starting Monthly SIP:  ${fmtCur(sipNeeded)}\n` +
    `Total to be Invested:  ${fmtLakh(invested)}\n` +
    `Returns Earned:        ${fmtLakh(returns)}\n` +
    `Today's Value of Goal: ${fmtLakh(realTarget)}\n` +
    `Generated by YIELD`;
}

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
// Ensure FAQ answers are hidden on load (belt-and-suspenders)
document.querySelectorAll('.faq-a').forEach(a => { a.style.display = 'none'; });

calcSimple();

/* ══════════════════════════════════════════════════════════
   SCROLL PROGRESS BAR
   ══════════════════════════════════════════════════════════ */
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  const backTop = document.getElementById('backTop');
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0).toFixed(2) + '%';
    if (backTop) backTop.classList.toggle('visible', scrolled > 400);
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL — Intersection Observer
   ══════════════════════════════════════════════════════════ */
(function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // Apply reveal to elements
  const selectors = [
    '.section-header',
    '.feat-card',
    '.step-card',
    '.bench-card',
    '.faq-item',
    '.trust-item',
    '.hero-scroll-hint'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        if (i < 6) el.classList.add('reveal-delay-' + (i + 1));
      }
      observer.observe(el);
    });
  });

  // Also observe pre-tagged reveals
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   ACTIVE NAV SECTION HIGHLIGHTING
   ══════════════════════════════════════════════════════════ */
(function initActiveNav() {
  const sections = ['home', 'features', 'calculators', 'benchmarks', 'faq'];
  const links = {};
  sections.forEach(id => {
    const a = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (a) links[id] = a;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        Object.values(links).forEach(l => l.classList.remove('active-section'));
        const link = links[entry.target.id];
        if (link) link.classList.add('active-section');
      }
    });
  }, { threshold: 0.25, rootMargin: '-80px 0px -40% 0px' });

  sections.forEach(id => {
    const sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });
})();

/* ══════════════════════════════════════════════════════════
   ANIMATED TRUST STRIP COUNTERS
   ══════════════════════════════════════════════════════════ */
(function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target);
      const isPercent = el.parentElement?.querySelector('.trust-lbl')?.textContent?.includes('Free');
      const duration = 1600;
      const start = performance.now();
      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = target * eased;
        el.textContent = (isPercent ? Math.round(current) + '%' : Math.round(current));
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = isPercent ? target + '%' : target;
      }
      requestAnimationFrame(step);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.trust-num[data-target]').forEach(el => {
    el.textContent = '0';
    counterObserver.observe(el);
  });
})();

/* ══════════════════════════════════════════════════════════
   HERO PARTICLES GENERATOR
   ══════════════════════════════════════════════════════════ */
(function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  const count = 24;
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    const left = Math.random() * 100;
    const bottom = Math.random() * 60;
    const dur = 5 + Math.random() * 7;
    const delay = Math.random() * 8;
    span.style.cssText = `left:${left}%;bottom:${bottom}%;--dur:${dur}s;--delay:${delay}s;opacity:${0.2 + Math.random() * 0.4}`;
    if (Math.random() > 0.6) { span.style.width = '3px'; span.style.height = '3px'; }
    container.appendChild(span);
  }
})();
