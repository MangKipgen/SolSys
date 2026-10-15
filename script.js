const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const SUN = '#FFD400';
const MAX_KM = PLANETS[PLANETS.length - 1].mkm;

// "142,984 km" -> number + unit. Values with no unit (e.g. "95") stay whole.
function splitValue(v) {
  const i = v.lastIndexOf(' ');
  return i < 0 ? { num: v, unit: '' } : { num: v.slice(0, i), unit: v.slice(i + 1) };
}
const valueHTML = (v) => {
  const { num, unit } = splitValue(v);
  return `<span class="num">${num}</span>${unit ? `<span class="unit">${unit}</span>` : ''}`;
};

/* ---------- Build one chapter per planet ---------- */
const chapters = document.getElementById('chapters');
PLANETS.forEach((p, i) => {
  const n = i + 1;
  const s = document.createElement('section');
  s.className = 'screen planet';
  s.id = p.name.toLowerCase();
  s.style.setProperty('--r', p.r);
  s.style.setProperty('--accent', p.accent);
  s.innerHTML = `
    <div class="bar">
      <span class="label light">${pad(n)} / ${pad(PLANETS.length)}</span>
      <span class="label">${p.km}</span>
    </div>
    <div class="disc${p.ring ? ' ringed' : ''}${p.r < 0.12 ? ' tiny' : ''}" aria-hidden="true">
      ${p.ring ? '<i class="ring back"></i>' : ''}
      <i class="body"></i>
      ${p.ring ? '<i class="ring front"></i>' : ''}
    </div>
    <h2 class="name" aria-label="${p.name}"><span class="fit" aria-hidden="true">${
      [...p.name].map((c, k) => `<span class="ch" style="--i:${k}">${c}</span>`).join('')
    }</span></h2>
    <dl class="data">
      <div><dt class="label">Diameter</dt><dd>${valueHTML(p.diameter)}</dd></div>
      <div><dt class="label">Day</dt><dd>${valueHTML(p.day)}</dd></div>
      <div><dt class="label">Year</dt><dd>${valueHTML(p.year)}</dd></div>
      <div><dt class="label">Moons</dt><dd class="accent">${valueHTML(p.moons)}</dd></div>
    </dl>`;
  chapters.appendChild(s);
});

/* ---------- Fit each planet name to the space beside the disc ---------- */
function fitNames() {
  document.querySelectorAll('.planet .name').forEach((name) => {
    const fit = name.querySelector('.fit');
    fit.style.fontSize = '100px';
    const w = fit.getBoundingClientRect().width;
    const target = name.clientWidth;
    const size = Math.max(48, Math.min((100 * target * 0.97) / w, window.innerWidth * 0.26));
    fit.style.fontSize = size + 'px';
  });
}

/* ---------- Scroll-linked motion ----------
   Every section gets a progress value p: 0 when it sits in the middle of the
   screen, +1 one screen below, -1 one screen above. Everything that moves is a
   pure function of p, so it plays forward when you scroll down and backward when
   you scroll up. p is eased toward its target each frame so it feels weighted. */
const screens = [...document.querySelectorAll('.screen')];
const numFmt = new WeakMap();

function prepNum(el) {
  const text = el.textContent;
  numFmt.set(el, {
    text,
    target: parseFloat(text.replace(/,/g, '')),
    decimals: (text.split('.')[1] || '').length,
    commas: text.includes(',')
  });
}
function setNum(el, v) {
  const f = numFmt.get(el);
  if (!f || isNaN(f.target)) return;
  el.textContent = v >= 0.999 ? f.text : (f.target * v).toLocaleString('en-US', {
    minimumFractionDigits: f.decimals, maximumFractionDigits: f.decimals, useGrouping: f.commas
  });
}

const sections = screens.map((el) => ({
  el,
  letters: [...el.querySelectorAll('.ch')],
  fit: el.querySelector('.fit'),
  nums: [...el.querySelectorAll('.num')],
  p: 99, target: 99, top: 0, height: 1
}));
sections.forEach((s) => s.nums.forEach(prepNum));

// Pure function of p: also callable on its own to pose a section at any progress.
function applyProgress(sec, p) {
  const ap = Math.abs(p);
  sec.el.style.setProperty('--p', p.toFixed(4));
  sec.el.style.setProperty('--ap', ap.toFixed(4));

  // letters rise in from below on arrival and lift out the top on departure, each a beat behind the last
  const n = sec.letters.length;
  sec.letters.forEach((ch, i) => {
    const pl = p + i * 0.02;
    const ty = clamp((pl - 0.16) / 0.4, 0, 1) * 112 + clamp((pl + 0.16) / 0.4, -1, 0) * 112;
    ch.style.translate = `0 ${ty.toFixed(2)}%`;
  });
  if (sec.fit) sec.fit.style.translate = `${(p * 7).toFixed(3)}vw 0`;

  // numbers count up as the section arrives and back down as it leaves
  const v = smooth(clamp(1.2 - ap * 2.4, 0, 1));
  sec.nums.forEach((el) => setNum(el, v));
}

function measure() {
  sections.forEach((s) => {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + window.scrollY;
    s.height = r.height;
  });
}
function targetFor(sec) {
  const mid = window.scrollY + window.innerHeight / 2;
  return (sec.top + sec.height / 2 - mid) / window.innerHeight;
}

let running = false;
function frame() {
  let moving = false;
  sections.forEach((s) => {
    s.target = targetFor(s);
    const first = s.p === 99;
    const gap = s.target - (first ? s.target : s.p);
    s.p = first || reduceMotion ? s.target : s.p + gap * 0.16;
    if (Math.abs(s.target - s.p) > 0.0004) moving = true; else s.p = s.target;
    if (Math.abs(s.p) < 1.5 || first) applyProgress(s, reduceMotion ? 0 : s.p);
  });
  updateRail();
  running = moving;
  if (moving) requestAnimationFrame(frame);
}
function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

/* ---------- Distance rail: honest linear scale, Sun to Neptune ---------- */
const rail = document.createElement('div');
rail.className = 'rail';
rail.innerHTML = `
  <a class="rail-l" href="#top">Sun</a>
  <span class="rail-track" aria-hidden="true">
    <span class="rail-fill"></span>
    ${PLANETS.map((p) => `<a class="tick" href="#${p.name.toLowerCase()}" title="${p.name} · ${p.km}" style="left:${(p.mkm / MAX_KM) * 100}%"></a>`).join('')}
    <span class="rail-dot"></span>
  </span>
  <span class="rail-r" aria-hidden="true">0 km</span>`;
document.body.appendChild(rail);

const railFill = rail.querySelector('.rail-fill');
const railDot = rail.querySelector('.rail-dot');
const railR = rail.querySelector('.rail-r');
const ticks = [...rail.querySelectorAll('.tick')];
const stops = [{ sec: sections[0], km: 0, accent: SUN }].concat(
  PLANETS.map((p, i) => ({ sec: sections[i + 1], km: p.mkm, accent: p.accent }))
);

function fmtKm(d) {
  if (d < 0.05) return '0 km';
  return d >= 1000 ? Math.round(d).toLocaleString('en-US') + 'M km' : d.toFixed(1) + 'M km';
}
function updateRail() {
  const mid = window.scrollY + window.innerHeight / 2;
  const c = stops.map((s) => s.sec.top + s.sec.height / 2);
  let km;
  if (mid <= c[0]) km = 0;
  else if (mid >= c[c.length - 1]) km = MAX_KM;
  else {
    let i = 0;
    while (mid > c[i + 1]) i++;
    const t = (mid - c[i]) / (c[i + 1] - c[i]);
    km = stops[i].km + (stops[i + 1].km - stops[i].km) * t;
  }
  let near = 0;
  c.forEach((v, i) => { if (Math.abs(v - mid) < Math.abs(c[near] - mid)) near = i; });

  const pct = (km / MAX_KM) * 100;
  railDot.style.left = pct + '%';
  railFill.style.width = pct + '%';
  railR.textContent = fmtKm(km);
  rail.style.setProperty('--rail-accent', stops[near].accent);
  ticks.forEach((t, i) => t.classList.toggle('on', i + 1 === near));
}

/* ---------- Go ---------- */
function layout() { fitNames(); measure(); sections.forEach((s) => { s.p = 99; }); kick(); }
layout();
if (document.fonts) {
  document.fonts.ready.then(layout);
  document.fonts.addEventListener('loadingdone', layout);
}
window.addEventListener('load', layout);
window.addEventListener('resize', layout);
window.addEventListener('scroll', kick, { passive: true });

// hero headline rises in once on load
requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('.hero').classList.add('in')));
