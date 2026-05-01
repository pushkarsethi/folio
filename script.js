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
  const SYMBOL_MAP = [
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

  const YAHOO_SYMBOLS = SYMBOL_MAP.map(s => s.yahoo).join(',');
  const YAHOO_URL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${YAHOO_SYMBOLS}&fields=regularMarketPrice,regularMarketChangePercent,shortName&lang=en-IN&region=IN`;

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

  /* ── Update state from Yahoo API response ── */
  function applyAPIData(data) {
    const quotes = data?.quoteResponse?.result || [];
    if (!quotes.length) return false;
    quotes.forEach(q => {
      const entry = state.find(s => s.yahoo === q.symbol);
      if (!entry) return;
      const price = q.regularMarketPrice;
      const chg   = q.regularMarketChangePercent;
      if (price && !isNaN(price)) {
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
    return true;
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

  /* ── Main API fetch loop ── */
  async function fetchLiveData() {
    try {
      const data = await fetchWithProxy(YAHOO_URL);
      const ok = applyAPIData(data);
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
const v      = id => parseFloat(document.getElementById(id)?.value) || 0;
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
   UI HELPERS
   ══════════════════════════════════════════════════════════ */
function syncS(id, badgeId, val, unit) {
  const inp = el(id);
  if (inp) inp.value = val;
  const badge = el(badgeId);
  if (badge) badge.textContent = val + ' ' + unit;
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

/* ══════════════════════════════════════════════════════════
   STOCK SEARCH
   ══════════════════════════════════════════════════════════ */
const SEARCH_DB = [
  // Indices
  { sym:'NIFTY 50',    yahoo:'^NSEI',           name:'Nifty 50 Index',               cat:'index' },
  { sym:'SENSEX',      yahoo:'^BSESN',           name:'BSE Sensex Index',              cat:'index' },
  { sym:'NIFTY BANK',  yahoo:'^NSEBANK',         name:'Nifty Bank Index',              cat:'index' },
  { sym:'NIFTY IT',    yahoo:'^CNXIT',           name:'Nifty IT Index',                cat:'index' },
  { sym:'NIFTY MID',   yahoo:'NIFTY_MID_SELECT.NS', name:'Nifty Midcap Select Index', cat:'index' },
  // Large Cap
  { sym:'RELIANCE',    yahoo:'RELIANCE.NS',    name:'Reliance Industries',   cat:'stock' },
  { sym:'TCS',         yahoo:'TCS.NS',         name:'Tata Consultancy Services', cat:'stock' },
  { sym:'HDFCBANK',    yahoo:'HDFCBANK.NS',    name:'HDFC Bank Ltd',         cat:'stock' },
  { sym:'INFY',        yahoo:'INFY.NS',        name:'Infosys Ltd',           cat:'stock' },
  { sym:'ICICIBANK',   yahoo:'ICICIBANK.NS',   name:'ICICI Bank Ltd',        cat:'stock' },
  { sym:'HINDUNILVR',  yahoo:'HINDUNILVR.NS',  name:'Hindustan Unilever',    cat:'stock' },
  { sym:'BHARTIARTL',  yahoo:'BHARTIARTL.NS',  name:'Bharti Airtel',         cat:'stock' },
  { sym:'ITC',         yahoo:'ITC.NS',         name:'ITC Ltd',               cat:'stock' },
  { sym:'KOTAKBANK',   yahoo:'KOTAKBANK.NS',   name:'Kotak Mahindra Bank',   cat:'stock' },
  { sym:'LT',          yahoo:'LT.NS',          name:'Larsen & Toubro',       cat:'stock' },
  { sym:'SBIN',        yahoo:'SBIN.NS',        name:'State Bank of India',   cat:'stock' },
  { sym:'WIPRO',       yahoo:'WIPRO.NS',       name:'Wipro Ltd',             cat:'stock' },
  { sym:'AXISBANK',    yahoo:'AXISBANK.NS',    name:'Axis Bank Ltd',         cat:'stock' },
  { sym:'MARUTI',      yahoo:'MARUTI.NS',      name:'Maruti Suzuki India',   cat:'stock' },
  { sym:'SUNPHARMA',   yahoo:'SUNPHARMA.NS',   name:'Sun Pharmaceutical',    cat:'stock' },
  { sym:'BAJFINANCE',  yahoo:'BAJFINANCE.NS',  name:'Bajaj Finance Ltd',     cat:'stock' },
  { sym:'ADANIPORTS',  yahoo:'ADANIPORTS.NS',  name:'Adani Ports & SEZ',     cat:'stock' },
  { sym:'TECHM',       yahoo:'TECHM.NS',       name:'Tech Mahindra',         cat:'stock' },
  { sym:'HCLTECH',     yahoo:'HCLTECH.NS',     name:'HCL Technologies',      cat:'stock' },
  { sym:'LTIM',        yahoo:'LTIM.NS',        name:'LTIMindtree Ltd',       cat:'stock' },
  { sym:'PERSISTENT',  yahoo:'PERSISTENT.NS',  name:'Persistent Systems',    cat:'stock' },
  { sym:'COFORGE',     yahoo:'COFORGE.NS',     name:'Coforge Ltd',           cat:'stock' },
  { sym:'KPITTECH',    yahoo:'KPITTECH.NS',    name:'KPIT Technologies',     cat:'stock' },
  { sym:'NESTLEIND',   yahoo:'NESTLEIND.NS',   name:'Nestle India',          cat:'stock' },
  { sym:'ASIANPAINT',  yahoo:'ASIANPAINT.NS',  name:'Asian Paints Ltd',      cat:'stock' },
  { sym:'TITAN',       yahoo:'TITAN.NS',       name:'Titan Company Ltd',     cat:'stock' },
  { sym:'BAJAJFINSV',  yahoo:'BAJAJFINSV.NS',  name:'Bajaj Finserv Ltd',     cat:'stock' },
  { sym:'ONGC',        yahoo:'ONGC.NS',        name:'Oil & Natural Gas Corp',cat:'stock' },
  { sym:'NTPC',        yahoo:'NTPC.NS',        name:'NTPC Ltd',              cat:'stock' },
  { sym:'POWERGRID',   yahoo:'POWERGRID.NS',   name:'Power Grid Corp',       cat:'stock' },
  { sym:'M&M',         yahoo:'M&M.NS',         name:'Mahindra & Mahindra',   cat:'stock' },
  { sym:'TATAMOTORS',  yahoo:'TATAMOTORS.NS',  name:'Tata Motors Ltd',       cat:'stock' },
  { sym:'TATASTEEL',   yahoo:'TATASTEEL.NS',   name:'Tata Steel Ltd',        cat:'stock' },
  { sym:'HINDALCO',    yahoo:'HINDALCO.NS',    name:'Hindalco Industries',   cat:'stock' },
  { sym:'JSWSTEEL',    yahoo:'JSWSTEEL.NS',    name:'JSW Steel Ltd',         cat:'stock' },
  { sym:'DRREDDY',     yahoo:'DRREDDY.NS',     name:'Dr Reddy\'s Laboratories', cat:'stock' },
  { sym:'CIPLA',       yahoo:'CIPLA.NS',       name:'Cipla Ltd',             cat:'stock' },
  { sym:'DIVISLAB',    yahoo:'DIVISLAB.NS',    name:'Divi\'s Laboratories',  cat:'stock' },
  { sym:'APOLLOHOSP',  yahoo:'APOLLOHOSP.NS',  name:'Apollo Hospitals',      cat:'stock' },
  // Commodities & Forex
  { sym:'GOLD MCX',    yahoo:'GC=F',           name:'Gold Futures (MCX)',    cat:'commodity' },
  { sym:'SILVER MCX',  yahoo:'SI=F',           name:'Silver Futures (MCX)',  cat:'commodity' },
  { sym:'CRUDE OIL',   yahoo:'CL=F',           name:'Crude Oil WTI Futures', cat:'commodity' },
  { sym:'USD/INR',     yahoo:'INR=X',          name:'US Dollar / Indian Rupee', cat:'commodity' },
];

let _searchCategory = 'all';
let _searchCache    = {}; // yahoo → { price, chg, ts }
let _searchResults  = [...SEARCH_DB];

function openStockSearch() {
  const overlay = document.getElementById('stockSearchOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const inp = document.getElementById('stockSearchInput');
    if (inp) inp.focus();
  }, 100);
  renderSearchResults('');
}

function closeStockSearch(e) {
  if (e && e.target !== document.getElementById('stockSearchOverlay')) return;
  const overlay = document.getElementById('stockSearchOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  const inp = document.getElementById('stockSearchInput');
  if (inp) inp.value = '';
}

function filterCategory(cat, btn) {
  _searchCategory = cat;
  document.querySelectorAll('.ssm-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const inp = document.getElementById('stockSearchInput');
  renderSearchResults(inp ? inp.value : '');
}

function onStockSearch(query) {
  renderSearchResults(query);
}

function renderSearchResults(query) {
  const container = document.getElementById('ssmResults');
  if (!container) return;

  const q = query.trim().toLowerCase();
  let filtered = SEARCH_DB.filter(s => {
    const matchCat = _searchCategory === 'all' || s.cat === _searchCategory;
    const matchQ   = !q ||
      s.sym.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.yahoo.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="ssm-empty"><span>⌕</span>No results for "${query}"<br><small style="font-size:9px;margin-top:6px;display:block">Try: RELIANCE, TCS, HDFC, NIFTY</small></div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const cached = _searchCache[s.yahoo];
    const price  = cached ? cached.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';
    const chg    = cached ? cached.chg : null;
    const chgStr = chg !== null ? (chg >= 0 ? '▲ ' : '▼ ') + Math.abs(chg).toFixed(2) + '%' : '—';
    const chgCls = chg !== null ? (chg >= 0 ? 'pos' : 'neg') : '';
    const catLabel = s.cat === 'index' ? 'INDEX' : s.cat === 'commodity' ? 'COMMODITY' : 'NSE';
    return `<div class="ssm-result-row" onclick="selectSearchResult('${s.yahoo}','${s.sym}','${s.name}')">
      <span class="ssm-rr-sym">${s.sym}</span>
      <span class="ssm-rr-name">${s.name}</span>
      <span class="ssm-rr-cat">${catLabel}</span>
      <span class="ssm-rr-price">${price}</span>
      <span class="ssm-rr-chg ${chgCls}">${chgStr}</span>
    </div>`;
  }).join('');

  // Fetch live prices for visible rows (batch)
  const symbols = filtered.slice(0, 20).map(s => s.yahoo);
  fetchSearchPrices(symbols).then(() => renderSearchResults(query));
}

async function fetchSearchPrices(symbols) {
  const now = Date.now();
  const toFetch = symbols.filter(s => {
    const c = _searchCache[s];
    return !c || (now - c.ts > 60000); // cache 60s
  });
  if (!toFetch.length) return;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${toFetch.join(',')}&fields=regularMarketPrice,regularMarketChangePercent`;
  const proxies = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];

  for (const makeProxy of proxies) {
    try {
      const resp = await fetch(makeProxy(url), { signal: AbortSignal.timeout(6000) });
      const data = await resp.json();
      const quotes = data?.quoteResponse?.result || [];
      quotes.forEach(q => {
        if (q.regularMarketPrice) {
          _searchCache[q.symbol] = {
            price: q.regularMarketPrice,
            chg:   q.regularMarketChangePercent || 0,
            ts:    now
          };
        }
      });
      return;
    } catch(e) { /* try next proxy */ }
  }
}

function selectSearchResult(yahoo, sym, name) {
  // Open the selected stock's price in a mini toast + close modal
  const cached = _searchCache[yahoo];
  if (cached) {
    const chgStr = (cached.chg >= 0 ? '+' : '') + cached.chg.toFixed(2) + '%';
    showToast(`${sym}  ₹${cached.price.toLocaleString('en-IN', {maximumFractionDigits:2})}  ${chgStr}`, '📈');
  } else {
    showToast(`Fetching ${sym}…`, '⌕');
    fetchSearchPrices([yahoo]).then(() => {
      const c = _searchCache[yahoo];
      if (c) showToast(`${sym}  ₹${c.price.toLocaleString('en-IN', {maximumFractionDigits:2})}  ${(c.chg>=0?'+':'')}${c.chg.toFixed(2)}%`, '📈');
    });
  }
  closeStockSearch(null);
}

// ESC key closes search
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeStockSearch(null); closeBenchModal(null); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openStockSearch(); }
});

/* ══════════════════════════════════════════════════════════
   BENCHMARK MODAL DATA + LOGIC
   ══════════════════════════════════════════════════════════ */
const BENCH_DATA = {
  nifty50: {
    title: 'Nifty 50',
    tag: 'Equity Index · NSE',
    cagr: '14.8% CAGR (20yr)',
    risk: 'Medium-High Risk', riskCls: 'bm-risk-high',
    color: '#2563EB',
    stats: [
      { label: '20yr CAGR',    val: '14.8%',  cls: 'green' },
      { label: '10yr CAGR',    val: '12.4%',  cls: 'green' },
      { label: 'Real Return',  val: '~8.4%',  cls: 'green' },
      { label: 'Volatility',   val: 'High',   cls: 'amber' },
    ],
    growthRate: 14.8,
    sections: [
      {
        icon: '📊', title: 'What is Nifty 50?',
        body: `The Nifty 50 is India's premier stock market index, tracking the 50 largest companies listed on the NSE by market capitalisation. It represents about 66% of the float-adjusted market cap of the stocks listed on NSE and covers 13 sectors.`,
        bullets: ['Covers: IT, Banking, FMCG, Auto, Energy, Pharma', 'Rebalanced semi-annually by NSE', 'Base year: 1995 = 1000 points', 'Current constituents include Reliance, TCS, HDFC Bank, Infosys']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['Highest long-term returns among safe instruments', 'High liquidity — buy/sell anytime', 'SIP via Index Funds/ETFs from ₹500/month', 'Low cost (expense ratio 0.05–0.20%)'],
        cons: ['Short-term volatility — can fall 30–50% in crashes', 'Requires 7–10yr horizon for reliable returns', 'No capital protection', 'Gains above ₹1L taxed at 10% LTCG']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Long-term investors (10yr+) who can stomach short-term drops. Ideal as SIP via a Nifty 50 Index Fund. Not suitable for investors needing money within 3–5 years.',
        bullets: ['Retirement corpus building', 'Wealth creation over 15–30 years', 'Core portfolio holding (50–60% allocation)']
      }
    ]
  },
  midcap: {
    title: 'Nifty Midcap 150',
    tag: 'Mid-Cap Equity · NSE',
    cagr: '17.2% CAGR (10yr)',
    risk: 'High Risk', riskCls: 'bm-risk-high',
    color: '#10B981',
    stats: [
      { label: '10yr CAGR',    val: '17.2%',  cls: 'green' },
      { label: '5yr CAGR',     val: '21.4%',  cls: 'green' },
      { label: 'Real Return',  val: '~11%',   cls: 'green' },
      { label: 'Max Drawdown', val: '-58%',   cls: 'red'   },
    ],
    growthRate: 17.2,
    sections: [
      {
        icon: '📊', title: 'What is Nifty Midcap 150?',
        body: `Tracks 150 companies ranked 101–250 by full market capitalisation. Midcap companies are in a growth phase — bigger than small-caps but still growing fast. They offer higher return potential than Nifty 50 but with significantly more volatility.`,
        bullets: ['Sectors: Consumer, IT services, Chemicals, Healthcare', 'Higher growth potential than large-caps', 'More sensitive to economic cycles', 'Can outperform Nifty 50 by 3–5% in bull markets']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['Highest long-term CAGR among broad indices', 'Exposure to India growth story', 'Many multi-baggers emerge from midcap space', 'Available via low-cost mutual funds'],
        cons: ['Extreme drawdowns — fell 58% in 2008', 'High volatility — not for weak hearts', 'Liquidity risk in market crashes', 'Needs 10yr+ horizon to smooth out cycles']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Aggressive investors with 10yr+ horizon who want to beat Nifty 50 returns. Best used as a satellite allocation (20–30%) alongside a Nifty 50 core.',
        bullets: ['Aggressive wealth creation', 'Satellite portfolio allocation', 'SIP investors who can ignore short-term noise']
      }
    ]
  },
  gold: {
    title: 'Gold (MCX)',
    tag: 'Commodity · MCX',
    cagr: '11.4% CAGR (20yr)',
    risk: 'Medium Risk', riskCls: 'bm-risk-medium',
    color: '#F59E0B',
    stats: [
      { label: '20yr CAGR',    val: '11.4%',  cls: 'amber' },
      { label: '10yr CAGR',    val: '8.7%',   cls: 'amber' },
      { label: 'Inflation Beat','val': 'Yes',  cls: 'green' },
      { label: 'Correlation',  val: 'Low',    cls: 'green' },
    ],
    growthRate: 11.4,
    sections: [
      {
        icon: '🥇', title: 'Gold as an Investment',
        body: 'Gold is the oldest store of value. In India, gold has a cultural significance and acts as a hedge against inflation, currency depreciation, and geopolitical risk. MCX Gold tracks international gold prices in INR.',
        bullets: ['Inversely correlated with equity markets', 'Performs best during crises and high inflation', 'Available as physical, ETF, Sovereign Gold Bond, or Digital Gold', 'SGBs give additional 2.5% annual interest']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['Excellent inflation hedge over 20yr', 'Portfolio diversifier — reduces overall risk', 'SGBs are tax-free on maturity', 'High liquidity (ETFs & digital gold)'],
        cons: ['No dividends or interest (unless SGB)', 'Underperforms equity in strong bull markets', 'Storage risk for physical gold', 'LTCG taxed at 20% with indexation']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Recommended as 10–15% of any portfolio as insurance and diversification. Not a primary wealth-creation vehicle.',
        bullets: ['Portfolio diversification', 'Crisis and inflation hedge', 'Conservative investors seeking stability']
      }
    ]
  },
  ppf: {
    title: 'PPF',
    tag: 'Government Scheme · EEE',
    cagr: '7.1% p.a. (Current rate)',
    risk: 'Zero Risk', riskCls: 'bm-risk-low',
    color: '#8B5CF6',
    stats: [
      { label: 'Current Rate', val: '7.1%',   cls: 'dim' },
      { label: 'Real Return',  val: '~1%',    cls: 'dim' },
      { label: 'Tax Status',   val: 'EEE',    cls: 'green' },
      { label: 'Lock-in',      val: '15 yrs', cls: 'amber' },
    ],
    growthRate: 7.1,
    sections: [
      {
        icon: '🏛️', title: 'What is PPF?',
        body: 'Public Provident Fund is a government-backed savings scheme offering guaranteed, tax-free returns. It enjoys EEE (Exempt-Exempt-Exempt) tax status — investment, interest, and maturity are all fully tax-free. Max investment: ₹1.5L per year.',
        bullets: ['Backed by Government of India — zero default risk', 'Interest rate revised quarterly by Finance Ministry', 'Partial withdrawal allowed after 7 years', 'Loan facility available from 3rd to 6th year']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['100% safe — government guarantee', 'Completely tax-free (EEE status)', 'Compounding over 15 years is powerful', '80C deduction on investment'],
        cons: ['15-year lock-in period', 'Real return barely beats inflation (1% real)', 'Max ₹1.5L/year contribution limit', 'Rate can be cut by govt at any time']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Conservative investors, tax savers, and retirees who want guaranteed tax-free returns. Ideal as debt component of a portfolio.',
        bullets: ['Tax-saving under Section 80C', 'Debt/safe portion of portfolio', 'Retirement corpus for risk-averse investors']
      }
    ]
  },
  fd: {
    title: 'Bank FD',
    tag: 'Debt Instrument · Taxable',
    cagr: '6.5–7.5% p.a.',
    risk: 'Low Risk', riskCls: 'bm-risk-low',
    color: '#94A3B8',
    stats: [
      { label: 'Gross Return',  val: '7.25%',  cls: 'dim' },
      { label: 'Post-Tax (30%)', val: '5.1%',  cls: 'red'  },
      { label: 'Real Return',   val: '~-1%',   cls: 'red'  },
      { label: 'DICGC Cover',   val: '₹5L',   cls: 'green' },
    ],
    growthRate: 7.0,
    sections: [
      {
        icon: '🏦', title: 'What is a Bank FD?',
        body: 'Fixed Deposits are the most popular savings instrument in India. You deposit a lump sum for a fixed tenure and earn guaranteed interest. DICGC insures up to ₹5 lakh per bank. Interest is taxed as income — at your slab rate.',
        bullets: ['Tenure: 7 days to 10 years', 'Premature withdrawal allowed (with penalty)', 'Senior citizens get 0.25–0.50% extra', 'TDS deducted if interest > ₹40,000/year']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['Guaranteed returns — no market risk', 'Highly liquid with premature exit', 'DICGC insurance up to ₹5L', 'Easy to open with any bank'],
        cons: ['Fully taxable at income slab rate', 'Real return is negative for 30% tax bracket', 'Interest rate risk on renewal', 'Not inflation-beating over long term']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Emergency fund, short-term goals (1–3 years), or senior citizens in lower tax brackets. A poor choice for long-term wealth creation — the post-tax real return is near zero.',
        bullets: ['Emergency fund (6 months expenses)', 'Short-term parking of funds', 'Senior citizens with low tax liability']
      }
    ]
  },
  realestate: {
    title: 'Real Estate',
    tag: 'Physical Asset · Illiquid',
    cagr: '8–12% CAGR',
    risk: 'Medium Risk', riskCls: 'bm-risk-medium',
    color: '#F59E0B',
    stats: [
      { label: 'Price CAGR',   val: '8–12%',  cls: 'amber' },
      { label: 'Rental Yield', val: '2–3%',   cls: 'dim'   },
      { label: 'Total Return', val: '~11%',   cls: 'amber' },
      { label: 'Liquidity',    val: 'Low',    cls: 'red'   },
    ],
    growthRate: 10,
    sections: [
      {
        icon: '🏠', title: 'Real Estate in India',
        body: 'Indian real estate has delivered solid long-term returns, especially in metro cities. Returns vary hugely by location — Bengaluru IT corridors and Mumbai suburbs have outperformed significantly. Includes capital appreciation + rental income.',
        bullets: ['Metro cities outperform tier-2/3 cities consistently', 'Rental yield is low (2–3%) vs global average of 4–5%', 'REITs now available for fractional real estate exposure', 'Indexed cost benefits reduce LTCG tax burden']
      },
      {
        icon: '⚖️', title: 'Pros & Cons',
        proscons: true,
        pros: ['Dual income: capital gains + rental yield', 'Home loan tax benefits (Sec 24, 80C)', 'Inflation hedge — tangible asset', 'REITs offer liquid alternative'],
        cons: ['Highly illiquid — can take months to sell', 'Large ticket size (₹30L+)', 'Hidden costs: stamp duty, registration, maintenance', 'Rental income taxable at full slab rate']
      },
      {
        icon: '💡', title: 'Best For',
        body: 'Investors with large capital and long horizon who want a tangible asset and rental income. Consider REITs for liquid real estate exposure without the hassle.',
        bullets: ['Own home (emotional + financial value)', 'Rental income for retirees', 'REITs for liquid real estate exposure']
      }
    ]
  }
};

let _bmChartInst = null;

function openBenchModal(key) {
  const data = BENCH_DATA[key];
  if (!data) return;

  const overlay = document.getElementById('benchModalOverlay');
  if (!overlay) return;

  // Header
  document.getElementById('bmTag').textContent   = data.tag;
  document.getElementById('bmTitle').textContent = data.title;
  document.getElementById('bmCagr').textContent  = data.cagr;
  const riskEl = document.getElementById('bmRisk');
  riskEl.textContent  = data.risk;
  riskEl.className    = 'bm-risk-badge ' + data.riskCls;

  // Stats
  const statsEl = document.getElementById('bmStats');
  statsEl.innerHTML = data.stats.map(s =>
    `<div class="bm-stat">
       <div class="bm-stat-label">${s.label}</div>
       <div class="bm-stat-val ${s.cls}">${s.val}</div>
     </div>`
  ).join('');

  // Chart — ₹1L invested over 20 years
  buildBenchGrowthChart(data.growthRate, data.color);

  // Sections
  const sectionsEl = document.getElementById('bmSections');
  sectionsEl.innerHTML = data.sections.map((sec, idx) => {
    let body = '';
    if (sec.proscons) {
      body = `<div class="bm-pros-cons">
        <div class="bm-pros">
          <div class="bm-pros-title">ADVANTAGES</div>
          <ul>${sec.pros.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        <div class="bm-cons">
          <div class="bm-cons-title">WATCH OUT</div>
          <ul>${sec.cons.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
      </div>`;
    } else {
      body = `${sec.body ? `<p>${sec.body}</p>` : ''}
        ${sec.bullets ? `<ul>${sec.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}`;
    }
    return `<div class="bm-section ${idx === 0 ? 'open' : ''}">
      <div class="bm-section-head" onclick="toggleBmSection(this)">
        <span>${sec.icon} ${sec.title}</span>
        <span class="bm-sec-chev">▾</span>
      </div>
      <div class="bm-section-body">${body}</div>
    </div>`;
  }).join('');

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function toggleBmSection(head) {
  const section = head.closest('.bm-section');
  section.classList.toggle('open');
}

function closeBenchModal(e) {
  if (e && e.target !== document.getElementById('benchModalOverlay')) return;
  const overlay = document.getElementById('benchModalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function buildBenchGrowthChart(rate, color) {
  const canvas = document.getElementById('bmGrowthChart');
  if (!canvas) return;
  if (_bmChartInst) { _bmChartInst.destroy(); _bmChartInst = null; }

  const isLight = document.body.classList.contains('light');
  const gridCol = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.04)';
  const tickCol = '#64748B';
  const tooltipBg = isLight ? 'rgba(255,255,255,0.98)' : 'rgba(10,15,28,0.96)';

  const labels = [], vals5 = [], vals10 = [], valsAsset = [];
  const base = 100000;
  for (let y = 0; y <= 20; y++) {
    labels.push('Yr ' + y);
    vals5.push(base * Math.pow(1.05, y));       // 5% FD/inflation
    vals10.push(base * Math.pow(1.10, y));      // 10% moderate
    valsAsset.push(base * Math.pow(1 + rate/100, y));
  }

  _bmChartInst = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'This Asset (' + rate + '%)',
          data: valsAsset, borderColor: color,
          backgroundColor: (() => {
            const g = canvas.getContext('2d').createLinearGradient(0,0,0,160);
            g.addColorStop(0, color + '28'); g.addColorStop(1, color + '00'); return g;
          })(),
          fill: true, tension: 0.4, borderWidth: 2.5,
        },
        {
          label: 'FD / Low-return (5%)',
          data: vals5, borderColor: 'rgba(100,116,139,0.6)',
          backgroundColor: 'rgba(100,116,139,0.04)',
          fill: true, tension: 0, borderDash: [5,3], borderWidth: 1.5,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { labels: { boxWidth: 8, boxHeight: 8, font: { family: 'Space Mono', size: 9 }, color: tickCol, padding: 14 } },
        tooltip: {
          backgroundColor: tooltipBg, borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
          titleColor: isLight ? '#0F172A' : '#F1F5F9', bodyColor: tickCol,
          titleFont: { family: 'Space Mono', size: 10 }, bodyFont: { family: 'Space Mono', size: 11 },
          padding: 12, cornerRadius: 8,
          callbacks: { label: c => '  ₹' + Math.round(c.raw).toLocaleString('en-IN') }
        }
      },
      scales: {
        x: { grid: { color: gridCol }, ticks: { font: { family: 'Space Mono', size: 8 }, color: tickCol, maxTicksLimit: 6 } },
        y: { grid: { color: gridCol }, ticks: { font: { family: 'Space Mono', size: 8 }, color: tickCol, callback: v => '₹' + (v/100000).toFixed(1) + 'L' } }
      },
      elements: { point: { radius: 0, hitRadius: 10 } }
    }
  });
}

/* ══════════════════════════════════════════════════════════
   STOCK SEARCH
   ══════════════════════════════════════════════════════════ */
const SEARCH_SYMBOL_MAP = {
  'NIFTY 50':'^NSEI','NIFTY50':'^NSEI','NIFTY':'^NSEI',
  'SENSEX':'^BSESN','BSE':'^BSESN',
  'NIFTY BANK':'^NSEBANK','BANKNIFTY':'^NSEBANK','BANKEX':'^NSEBANK',
  'NIFTY IT':'^CNXIT',
  'RELIANCE':'RELIANCE.NS','TCS':'TCS.NS','HDFCBANK':'HDFCBANK.NS',
  'INFY':'INFY.NS','INFOSYS':'INFY.NS','ICICIBANK':'ICICIBANK.NS',
  'HINDUNILVR':'HINDUNILVR.NS','HUL':'HINDUNILVR.NS',
  'BHARTIARTL':'BHARTIARTL.NS','AIRTEL':'BHARTIARTL.NS',
  'ITC':'ITC.NS','KOTAKBANK':'KOTAKBANK.NS','KOTAK':'KOTAKBANK.NS',
  'LT':'LT.NS','LARSEN':'LT.NS','SBIN':'SBIN.NS','SBI':'SBIN.NS',
  'WIPRO':'WIPRO.NS','AXISBANK':'AXISBANK.NS','AXIS':'AXISBANK.NS',
  'MARUTI':'MARUTI.NS','SUNPHARMA':'SUNPHARMA.NS',
  'BAJFINANCE':'BAJFINANCE.NS','BAJAJ FINANCE':'BAJFINANCE.NS',
  'ADANIPORTS':'ADANIPORTS.NS','ADANI':'ADANIPORTS.NS',
  'TECHM':'TECHM.NS','TECH MAHINDRA':'TECHM.NS',
  'HCLTECH':'HCLTECH.NS','HCL':'HCLTECH.NS',
  'LTIM':'LTIM.NS','MPHASIS':'MPHASIS.NS',
  'PERSISTENT':'PERSISTENT.NS','COFORGE':'COFORGE.NS',
  'KPITTECH':'KPITTECH.NS','KPIT':'KPITTECH.NS',
  'GOLD':'GC=F','GOLD MCX':'GC=F','MCX GOLD':'GC=F',
  'USD/INR':'INR=X','USDINR':'INR=X','DOLLAR':'INR=X',
  'TITAN':'TITAN.NS','ASIANPAINT':'ASIANPAINT.NS','ASIAN PAINTS':'ASIANPAINT.NS',
  'NESTLEIND':'NESTLEIND.NS','NESTLE':'NESTLEIND.NS',
  'ONGC':'ONGC.NS','NTPC':'NTPC.NS','POWERGRID':'POWERGRID.NS',
  'JSWSTEEL':'JSWSTEEL.NS','TATASTEEL':'TATASTEEL.NS','TATA STEEL':'TATASTEEL.NS',
  'TATAMOTORS':'TATAMOTORS.NS','TATA MOTORS':'TATAMOTORS.NS',
  'M&M':'M&M.NS','MAHINDRA':'M&M.NS','BAJAJFINSV':'BAJAJFINSV.NS',
  'ULTRACEMCO':'ULTRACEMCO.NS','ULTRATECH':'ULTRACEMCO.NS',
  'GRASIM':'GRASIM.NS','DIVISLAB':'DIVISLAB.NS',
  'DRREDDY':'DRREDDY.NS','DR REDDY':'DRREDDY.NS',
  'CIPLA':'CIPLA.NS','APOLLOHOSP':'APOLLOHOSP.NS',
  'BRITANNIA':'BRITANNIA.NS','HINDALCO':'HINDALCO.NS',
  'INDUSINDBK':'INDUSINDBK.NS','INDUSIND':'INDUSINDBK.NS',
  'TATACONSUM':'TATACONSUM.NS','EICHERMOT':'EICHERMOT.NS',
  'SBILIFE':'SBILIFE.NS','HDFCLIFE':'HDFCLIFE.NS',
  'HAL':'HAL.NS','BEL':'BEL.NS',
};

let _searchTimeout = null;

function openStockSearch() {
  document.getElementById('stockSearchOverlay').classList.add('open');
  document.getElementById('stockSearchModal').classList.add('open');
  setTimeout(function(){ var i=document.getElementById('stockSearchInput');if(i)i.focus(); }, 320);
  document.addEventListener('keydown', onSearchEsc);
}

function closeStockSearch() {
  document.getElementById('stockSearchOverlay').classList.remove('open');
  document.getElementById('stockSearchModal').classList.remove('open');
  var inp=document.getElementById('stockSearchInput'); if(inp) inp.value='';
  var res=document.getElementById('ssmResult'); if(res){res.style.display='none';res.innerHTML='';}
  var bod=document.getElementById('ssmBody'); if(bod) bod.style.display='';
  document.removeEventListener('keydown', onSearchEsc);
}

function onSearchEsc(e) { if (e.key === 'Escape') closeStockSearch(); }

function handleStockSearch(val) {
  clearTimeout(_searchTimeout);
  if (!val.trim()) {
    document.getElementById('ssmResult').style.display = 'none';
    document.getElementById('ssmBody').style.display = '';
    return;
  }
  _searchTimeout = setTimeout(() => {
    const upper = val.trim().toUpperCase();
    let yahoo = SEARCH_SYMBOL_MAP[upper];
    if (!yahoo) {
      // Try suffix match
      for (const [k, v] of Object.entries(SEARCH_SYMBOL_MAP)) {
        if (k.startsWith(upper) || upper.startsWith(k)) { yahoo = v; break; }
      }
    }
    if (!yahoo) yahoo = upper + '.NS';
    searchStock(upper.replace('.NS',''), yahoo);
  }, 500);
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const val = e.target.value.trim().toUpperCase();
    if (!val) return;
    const yahoo = SEARCH_SYMBOL_MAP[val] || val + '.NS';
    searchStock(val, yahoo);
  }
}

async function searchStock(displayName, yahooSymbol) {
  const resultEl = document.getElementById('ssmResult');
  const bodyEl   = document.getElementById('ssmBody');
  resultEl.style.display = 'block';
  bodyEl.style.display   = 'none';
  resultEl.innerHTML = `<div class="ssm-loading"><div class="ssm-spinner"></div><span>Fetching ${displayName}...</span></div>`;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,shortName&lang=en-IN&region=IN`;

  const PROXIES = [
    u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  let data = null;
  for (const proxy of PROXIES) {
    try {
      const resp = await fetch(proxy(url), { signal: AbortSignal.timeout(7000) });
      if (!resp.ok) continue;
      data = await resp.json();
      if (data?.quoteResponse?.result?.length) break;
    } catch(e) { continue; }
  }

  const q = data?.quoteResponse?.result?.[0];
  if (!q) {
    resultEl.innerHTML = `<div class="ssm-err">⚠ Could not fetch data for <strong>${displayName}</strong>. Try a different symbol.</div>`;
    return;
  }

  const price  = q.regularMarketPrice;
  const chg    = q.regularMarketChangePercent || 0;
  const chgAbs = q.regularMarketChange || 0;
  const isPos  = chg >= 0;
  const arrow  = isPos ? '▲' : '▼';
  const chgCls = isPos ? 'pos' : 'neg';
  const name   = q.shortName || displayName;

  function fP(n) { return n != null ? n.toLocaleString('en-IN', {maximumFractionDigits:2}) : '—'; }
  function fM(n) { if (!n) return '—'; if (n >= 1e12) return '₹' + (n/1e12).toFixed(2) + 'T'; if (n >= 1e9) return '₹' + (n/1e9).toFixed(2) + 'B'; return '₹' + (n/1e6).toFixed(0) + 'M'; }
  function fV(n) { if (!n) return '—'; if (n >= 1e7) return (n/1e7).toFixed(2) + ' Cr'; if (n >= 1e5) return (n/1e5).toFixed(2) + ' L'; return n.toLocaleString('en-IN'); }

  resultEl.innerHTML = `
    <div class="ssm-stock-card">
      <div class="ssc-top">
        <div>
          <div class="ssc-name">${name}</div>
          <div class="ssc-sym">${yahooSymbol} · ${isPos ? '▲' : '▼'} ${Math.abs(chgAbs).toFixed(2)}</div>
        </div>
        <div class="ssc-price">
          <div class="ssc-price-val">${fP(price)}</div>
          <div class="ssc-chg ${chgCls}">${arrow} ${Math.abs(chg).toFixed(2)}%</div>
        </div>
      </div>
      <div class="ssc-tags">
        <span class="ssc-tag">Open: ${fP(q.regularMarketOpen)}</span>
        <span class="ssc-tag">H: ${fP(q.regularMarketDayHigh)}</span>
        <span class="ssc-tag">L: ${fP(q.regularMarketDayLow)}</span>
        <span class="ssc-tag">52W H: ${fP(q.fiftyTwoWeekHigh)}</span>
        <span class="ssc-tag">52W L: ${fP(q.fiftyTwoWeekLow)}</span>
        <span class="ssc-tag">Vol: ${fV(q.regularMarketVolume)}</span>
        ${q.marketCap ? `<span class="ssc-tag">Mkt Cap: ${fM(q.marketCap)}</span>` : ''}
        <span class="ssc-tag" style="color:var(--text-dim);font-size:8px">~15 min delay</span>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════
   BENCHMARK DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
const BENCH_DATA = {
  nifty50: {
    asset: 'Nifty 50', type: 'Equity Index', cagrTxt: '14.8%', cagrClass: 'lime',
    cagrLabel: 'CAGR over 20 years (2004–2024)',
    stats: [
      { label: 'Best Year', val: '+72.3%', sub: '2009 post-crisis rally' },
      { label: 'Worst Year', val: '−51.8%', sub: '2008 global financial crisis' },
      { label: 'Volatility', val: 'High', sub: 'Std dev ~22% p.a.' },
      { label: '₹1L → (20yr)', val: '₹15.8L', sub: 'At 14.8% CAGR, no tax' },
    ],
    risk: 4, riskLabel: 'High risk · High reward',
    facts: [
      'Tracks the 50 largest companies on NSE by free-float market cap.',
      'LTCG above ₹1L is taxed at 10% after 12 months of holding.',
      'Best accessed via index funds — expense ratio as low as 0.05%.',
      'Drawdowns of 30–50% are historically common — stay invested.',
      'A ₹10,000/month SIP for 20 years at 14.8% builds ~₹2.6 Crore.',
    ],
    sipRate: 14.8, color: 'var(--accent-light)', sipMode: 'sip',
  },
  midcap: {
    asset: 'Nifty Midcap 150', type: 'Mid-Cap Equity', cagrTxt: '17.2%', cagrClass: 'lime',
    cagrLabel: 'CAGR over 10 years (2014–2024)',
    stats: [
      { label: 'Best Year', val: '+67%', sub: '2021 post-covid boom' },
      { label: 'Worst Year', val: '−31%', sub: '2018 NBFC crisis' },
      { label: 'Volatility', val: 'Very High', sub: 'Std dev ~28% p.a.' },
      { label: '₹1L → (10yr)', val: '₹4.85L', sub: 'At 17.2% CAGR' },
    ],
    risk: 5, riskLabel: 'Very high risk · Highest potential reward',
    facts: [
      'Mid-caps are companies ranked 101–250 by market cap on NSE.',
      'Historically outperform large-caps over long periods (10yr+).',
      'Much higher volatility — can fall 40–60% in bear markets.',
      'Best suited for aggressive investors with 10+ year horizon.',
      'Top funds: Motilal Midcap, Nippon Midcap, Kotak Midcap.',
    ],
    sipRate: 17.2, color: '#22d3ee', sipMode: 'sip',
  },
  gold: {
    asset: 'Gold (MCX)', type: 'Commodity', cagrTxt: '11.4%', cagrClass: 'amber',
    cagrLabel: 'CAGR over 20 years (2004–2024)',
    stats: [
      { label: 'Best Year', val: '+30.1%', sub: '2020 pandemic flight to safety' },
      { label: 'Worst Year', val: '−8.2%', sub: '2013 taper tantrum' },
      { label: 'Volatility', val: 'Medium', sub: 'Std dev ~15% p.a.' },
      { label: '₹1L → (20yr)', val: '₹8.2L', sub: 'At 11.4% CAGR' },
    ],
    risk: 3, riskLabel: 'Medium risk · Inflation hedge',
    facts: [
      'Gold has no equity correlation — great portfolio diversifier.',
      'In INR terms, gold returns include rupee depreciation vs dollar.',
      'Sovereign Gold Bonds (SGBs) give 2.5% p.a. interest + appreciation.',
      'LTCG on physical gold taxed at 20% with indexation after 3 years.',
      'Ideal allocation: 10–15% of portfolio as a hedge.',
    ],
    sipRate: 11.4, color: 'var(--gold)', sipMode: 'sip',
  },
  ppf: {
    asset: 'Public Provident Fund', type: 'Government Scheme', cagrTxt: '7.1%', cagrClass: 'dim',
    cagrLabel: 'Current interest rate (Q1 2025)',
    stats: [
      { label: 'Tax Status', val: 'EEE', sub: 'Exempt-Exempt-Exempt' },
      { label: 'Lock-in', val: '15 Years', sub: 'Partial withdrawal after 7yr' },
      { label: 'Max p.a.', val: '₹1.5L', sub: 'Annual contribution limit' },
      { label: '₹1.5L/yr (15yr)', val: '₹40.7L', sub: 'At 7.1% compounded' },
    ],
    risk: 1, riskLabel: 'No risk · Government guaranteed',
    facts: [
      'Fully exempt — contributions, interest, and maturity are all tax-free.',
      'Rate is revised quarterly by government — has ranged 7%–12% historically.',
      'Ideal for conservative investors in the 30%+ tax bracket.',
      'Can be extended in 5-year blocks after maturity.',
      '80C deduction available for contributions up to ₹1.5L/year.',
    ],
    sipRate: 7.1, color: 'var(--text-mid)', sipMode: 'sip',
  },
  fd: {
    asset: 'Bank Fixed Deposit', type: 'Debt Instrument', cagrTxt: '6.5–7.5%', cagrClass: 'dim',
    cagrLabel: 'Current rates (major banks, 2025)',
    stats: [
      { label: 'Tax', val: 'Slab rate', sub: 'Added to income — up to 30%' },
      { label: 'Real Return', val: '~0–1%', sub: 'Post 30% tax + 6% inflation' },
      { label: 'Safety', val: 'DICGC', sub: 'Insured up to ₹5L per bank' },
      { label: '₹5L (5yr)', val: '₹7.1L', sub: 'At 7.1% compounded quarterly' },
    ],
    risk: 1, riskLabel: 'Very low risk · Fully taxable',
    facts: [
      'Interest is taxable — at 30% tax bracket, real post-inflation return is near zero.',
      'TDS deducted at 10% if interest exceeds ₹40,000/year.',
      'Senior citizens get 0.25–0.5% extra — can use Form 15H to avoid TDS.',
      'Consider debt mutual funds or FDs via small finance banks for better rates.',
      'Laddering FDs (1yr, 2yr, 3yr) gives liquidity without penalty.',
    ],
    sipRate: 7.0, color: 'var(--text-mid)', sipMode: 'compound',
  },
  realestate: {
    asset: 'Real Estate', type: 'Physical Asset', cagrTxt: '8–12%', cagrClass: 'amber',
    cagrLabel: 'Price appreciation CAGR (city-dependent)',
    stats: [
      { label: 'Rental Yield', val: '2–3%', sub: 'Gross, before maintenance' },
      { label: 'Total Return', val: '10–15%', sub: 'Price + rental yield' },
      { label: 'Liquidity', val: 'Very Low', sub: 'Months to sell' },
      { label: 'Entry Cost', val: '₹50L+', sub: 'Plus stamp duty & registration' },
    ],
    risk: 3, riskLabel: 'Medium–high risk · Very illiquid',
    facts: [
      'Location is everything — Tier-1 cities consistently outperform Tier-2/3.',
      'LTCG of 20% with indexation applies after 2 years of holding.',
      'REITs (Embassy, Nexus, Mindspace) give real estate exposure with liquidity.',
      'Home loan interest deduction under Sec 24b up to ₹2L/year.',
      'Rental income taxed at slab rate — 30% tax erodes yield significantly.',
    ],
    sipRate: 10, color: 'var(--gold)', sipMode: 'sip',
  },
};

function openBenchDetail(id) {
  const d = BENCH_DATA[id];
  if (!d) return;

  const riskSegs = Array.from({length:5}, (_,i) => {
    let cls = '';
    if (i < d.risk) {
      cls = d.risk <= 2 ? 'filled-low' : d.risk <= 3 ? 'filled-med' : 'filled-high';
    }
    return `<div class="bdm-risk-seg ${cls}"></div>`;
  }).join('');

  const statsHtml = d.stats.map(s => `
    <div class="bdm-stat">
      <div class="bdm-stat-label">${s.label}</div>
      <div class="bdm-stat-val">${s.val}</div>
      <div class="bdm-stat-sub">${s.sub}</div>
    </div>`).join('');

  const factsHtml = d.facts.map(f => `
    <div class="bdm-fact"><span class="bdm-fact-icon">›</span><span>${f}</span></div>`).join('');

  document.getElementById('bdmContent').innerHTML = `
    <div class="bdm-drag-handle"></div>
    <div class="bdm-header" style="margin-top:16px">
      <div class="bdm-asset">${d.asset}</div>
      <div class="bdm-type">${d.type}</div>
      <div class="bdm-return-row">
        <div class="bdm-cagr ${d.cagrClass}">${d.cagrTxt}</div>
        <div class="bdm-cagr-label">${d.cagrLabel}</div>
      </div>
    </div>
    <div class="bdm-grid">${statsHtml}</div>
    <div class="bdm-risk">
      <div class="bdm-risk-label">Risk Level — ${d.riskLabel}</div>
      <div class="bdm-risk-bar">${riskSegs}</div>
    </div>
    <div class="bdm-facts">
      <div class="bdm-facts-title">Key Facts</div>
      ${factsHtml}
    </div>
    <div class="bdm-sip-cta">
      <div class="bdm-sip-text">
        <strong>Model this in the calculator</strong>
        Use ${d.sipRate}% return rate to project your investment in ${d.asset}
      </div>
      <button class="bdm-sip-btn" onclick="useBenchInCalc('${d.sipMode}',${d.sipRate})">
        Open Calculator →
      </button>
    </div>`;

  document.getElementById('benchOverlay').classList.add('open');
  document.getElementById('benchDetailModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onBenchEsc);
}

function closeBenchDetail() {
  document.getElementById('benchOverlay').classList.remove('open');
  document.getElementById('benchDetailModal').classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onBenchEsc);
}

function onBenchEsc(e) { if (e.key === 'Escape') closeBenchDetail(); }

function useBenchInCalc(mode, rate) {
  closeBenchDetail();
  // Pre-fill the rate into whichever calculator
  if (mode === 'sip') {
    const r = document.getElementById('sip-rate-r');
    const h = document.getElementById('sip-rate');
    const b = document.getElementById('sip-rate-badge');
    if (r) { r.value = rate; h.value = rate; b.textContent = rate + '%'; calcSIP(); }
  } else if (mode === 'compound') {
    const r = document.getElementById('c-rate-r');
    const h = document.getElementById('c-rate');
    const b = document.getElementById('c-rate-badge');
    if (r) { r.value = rate; h.value = rate; b.textContent = rate + '%'; calcCompound(); }
  }
  switchMode(mode);
  setTimeout(() => document.getElementById('calculators').scrollIntoView({behavior:'smooth'}), 100);
}

/* ══════════════════════════════════════════════════════════
   CUSTOM CURSOR (desktop only)
   ══════════════════════════════════════════════════════════ */
(function initCursor() {
  const isTouchDevice = window.matchMedia('(hover: none)').matches;
  if (isTouchDevice) return;

  // Inject cursor HTML
  const el = document.createElement('div');
  el.id = 'folio-cursor';
  el.innerHTML = '<div class="cur-ring"></div><div class="cur-dot"></div>';
  document.body.appendChild(el);

  const dot  = el.querySelector('.cur-dot');
  const ring = el.querySelector('.cur-ring');

  let mouseX = -100, mouseY = -100;
  let ringX  = -100, ringY  = -100;
  let rafId;

  // Smooth ring follows mouse with lag
  function animate() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;

    dot.style.transform  = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
    rafId = requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  // Hover state on interactive elements
  const hoverTargets = 'a, button, [onclick], input[type=range], .feat-card, .bench-card, .step-card, .mnav-btn, .ssm-chip, .freq-pill, .goal-pill, label';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) document.body.classList.remove('cursor-hover');
  });

  // Click state
  document.addEventListener('mousedown', () => {
    document.body.classList.add('cursor-click');
    document.body.classList.remove('cursor-hover');
  });
  document.addEventListener('mouseup', () => {
    document.body.classList.remove('cursor-click');
  });

  // Input state
  document.addEventListener('focusin', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      document.body.classList.add('cursor-input');
    }
  });
  document.addEventListener('focusout', () => {
    document.body.classList.remove('cursor-input');
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
})();

/* ══════════════════════════════════════════════════════════
   RIPPLE EFFECT on buttons
   ══════════════════════════════════════════════════════════ */
(function initRipple() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.cta-btn, .btn-primary, .nav-cta');
    if (!btn) return;
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 1.5;
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
})();

/* ══════════════════════════════════════════════════════════
   MOBILE FEAT-CARD TEXT WRAPPER
   ══════════════════════════════════════════════════════════ */
(function wrapFeatText() {
  if (window.innerWidth > 580) return;
  document.querySelectorAll('.feat-card').forEach(card => {
    if (card.querySelector('.feat-card-text')) return;
    const icon = card.querySelector('.feat-icon-wrap');
    const wrap = document.createElement('div');
    wrap.className = 'feat-card-text';
    while (card.children.length > 0 && card.children[0] !== icon) {
      if (card.lastChild !== icon) {
        wrap.prepend(card.lastChild);
      }
    }
    // Move everything except icon into wrapper
    Array.from(card.children).forEach(child => {
      if (child !== icon) wrap.appendChild(child);
    });
    card.appendChild(wrap);
  });
})();

/* ══════════════════════════════════════════════════════════
   STEP-CARD TEXT WRAPPER FOR MOBILE
   ══════════════════════════════════════════════════════════ */
(function wrapStepText() {
  if (window.innerWidth > 700) return;
  document.querySelectorAll('.step-card').forEach(card => {
    if (card.querySelector('.step-card-text')) return;
    const num  = card.querySelector('.step-num');
    const wrap = document.createElement('div');
    wrap.className = 'step-card-text';
    Array.from(card.children).forEach(child => {
      if (child !== num) wrap.appendChild(child);
    });
    card.appendChild(wrap);
  });
})();

/* ══════════════════════════════════════════════════════════
   SMOOTH SECTION SCROLL (override default)
   ══════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id  = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (!sec) return;
    e.preventDefault();
    const top = sec.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  });
});

/* ══════════════════════════════════════════════════════════
   MOBILE: swipe to close stock search modal
   ══════════════════════════════════════════════════════════ */
(function initSwipeClose() {
  const modal = document.getElementById('stockSearchModal');
  if (!modal) return;
  let startY = 0;
  modal.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  modal.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeStockSearch();
  }, { passive: true });

  const bench = document.getElementById('benchDetailModal');
  if (!bench) return;
  bench.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  bench.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeBenchDetail();
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════
   NAVBAR: active link underline animation
   ══════════════════════════════════════════════════════════ */
(function initNavUnderline() {
  const style = document.createElement('style');
  style.textContent = `
    .nav-links a {
      position: relative;
    }
    .nav-links a::after {
      content: '';
      position: absolute; bottom: -3px; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent), var(--green));
      border-radius: 1px;
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .nav-links a:hover::after,
    .nav-links a.active-section::after { transform: scaleX(1); }
  `;
  document.head.appendChild(style);
})();
