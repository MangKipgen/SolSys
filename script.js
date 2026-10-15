const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
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
      <a class="brand" href="#top">Perihelion</a>
      <span class="progress">
        <span class="label light">${pad(n)} / ${pad(PLANETS.length)}</span>
        <span class="label">${p.km}</span>
      </span>
    </div>
    <div class="disc" aria-hidden="true">
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

/* ---------- Fit each planet name to the content width ---------- */
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
fitNames();
if (document.fonts) {
  document.fonts.ready.then(fitNames);
  document.fonts.addEventListener('loadingdone', fitNames);
}
window.addEventListener('load', fitNames);
window.addEventListener('resize', fitNames);

/* ---------- Count-up numbers ---------- */
function countUp(el) {
  const text = el.textContent;
  const target = parseFloat(text.replace(/,/g, ''));
  if (reduceMotion || isNaN(target)) return;
  const decimals = (text.split('.')[1] || '').length;
  const commas = text.includes(',');
  const t0 = performance.now();
  const dur = 1400;
  const fmt = (v) => v.toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: commas
  });
  (function tick(now) {
    const k = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = k < 1 ? fmt(target * eased) : text;
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- Reveal on scroll ---------- */
const screens = [...document.querySelectorAll('.screen')];
function reveal(el) {
  if (el.classList.contains('in')) return;
  el.classList.add('in');
  el.querySelectorAll('.num').forEach(countUp);
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) reveal(e.target); });
  }, { threshold: 0.35 });
  screens.forEach((el) => io.observe(el));
} else {
  screens.forEach(reveal);
}
document.querySelector('.hero').querySelectorAll('.num').forEach(countUp);

/* ---------- Distance rail: honest linear scale, Sun to Neptune ---------- */
const rail = document.createElement('div');
rail.className = 'rail';
rail.setAttribute('aria-hidden', 'true');
rail.innerHTML = `
  <span class="rail-l">Sun</span>
  <span class="rail-track">
    <span class="rail-fill"></span>
    ${PLANETS.map((p) => `<a class="tick" href="#${p.name.toLowerCase()}" title="${p.name} · ${p.km}" style="left:${(p.mkm / MAX_KM) * 100}%"></a>`).join('')}
    <span class="rail-dot"></span>
  </span>
  <span class="rail-r">0 km</span>`;
document.body.appendChild(rail);

const railFill = rail.querySelector('.rail-fill');
const railDot = rail.querySelector('.rail-dot');
const railR = rail.querySelector('.rail-r');
const ticks = [...rail.querySelectorAll('.tick')];
const stops = [{ el: screens[0], km: 0, accent: SUN }].concat(
  PLANETS.map((p, i) => ({ el: screens[i + 1], km: p.mkm, accent: p.accent }))
);

function fmtKm(d) {
  if (d < 0.05) return '0 km';
  return d >= 1000 ? Math.round(d).toLocaleString('en-US') + 'M km' : d.toFixed(1) + 'M km';
}

function updateRail() {
  const mid = window.scrollY + window.innerHeight / 2;
  const c = stops.map((s) => {
    const r = s.el.getBoundingClientRect();
    return r.top + window.scrollY + r.height / 2;
  });
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
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(() => { updateRail(); ticking = false; }); }
}, { passive: true });
window.addEventListener('resize', updateRail);
updateRail();
