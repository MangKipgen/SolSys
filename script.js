const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const SUN = '#FFD400';
const MAX_KM = PLANETS[PLANETS.length - 1].mkm;
const CHAPTER_R = 0.346;   // every planet in the chapters is drawn at Neptune's size

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

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
  s.className = 'screen planet' + (p.ring ? ' ringed' : '');
  s.id = p.name.toLowerCase();
  s.style.setProperty('--accent', p.accent);
  s.innerHTML = `
    <div class="bar">
      <span class="label light">${pad(n)} / ${pad(PLANETS.length)}</span>
      <span class="label">${p.km}</span>
    </div>
    <div class="disc" style="--r:${CHAPTER_R}" aria-hidden="true"><i class="body"></i></div>
    <h2 class="name" aria-label="${p.name}"><span class="fit" aria-hidden="true">${
      [...p.name].map((c, k) => `<span class="ch" style="--i:${k}">${c}</span>`).join('')
    }</span></h2>
    <dl class="data">
      <div><dt class="label">Diameter</dt><dd>${valueHTML(p.diameter)}</dd></div>
      <div><dt class="label">Day</dt><dd>${valueHTML(p.day)}</dd></div>
      <div><dt class="label">Year</dt><dd>${valueHTML(p.year)}</dd></div>
      <div><dt class="label">Moons</dt><dd>${valueHTML(p.moons)}</dd></div>
    </dl>`;
  chapters.appendChild(s);
});

/* ---------- The stage: title, then the to-scale lineup ---------- */
const stageEl = document.getElementById('top');
const pinEl = stageEl.querySelector('.pin');
const lineupEl = stageEl.querySelector('.lineup');

function splitLetters(root) {
  const out = [];
  (function walk(node) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        if (!c.textContent.trim()) return;   // layout whitespace between elements
        const frag = document.createDocumentFragment();
        [...c.textContent].forEach((ch) => {
          if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = ch;
          frag.appendChild(s);
          out.push(s);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) walk(c);
    });
  })(root);
  return out;
}
const heroLetters = splitLetters(stageEl.querySelector('.display'));

const luLabels = PLANETS.map((p) => {
  const el = document.createElement('div');
  el.className = 'lu-label';
  el.innerHTML = `<i class="lu-rule"></i><b>${p.name}</b><span>${p.diameter}</span>`;
  lineupEl.appendChild(el);
  return { el, rule: el.querySelector('.lu-rule') };
});
const luSun = (() => {
  const el = document.createElement('div');
  el.className = 'lu-label lu-sun';
  el.innerHTML = `<b>Sun</b><span>${SUN_DIAMETER.km}</span>`;
  lineupEl.appendChild(el);
  return el;
})();
const luCap = lineupEl.querySelector('.lu-cap');

/* ---------- Fit each planet name to the space beside the planet ---------- */
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

/* ---------- Numbers count with the scroll ---------- */
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

/* ---------- Scroll-linked motion ----------
   Every chapter gets a progress value p: 0 when it sits in the middle of the
   screen, +1 one screen below, -1 one screen above. The stage has its own s
   (0 at the top of the pin, 1 at the end). Everything that moves is a pure
   function of these, so it plays forward going down and backward going up. */
const screens = [...document.querySelectorAll('.screen')];
const sections = screens.map((el) => ({
  el,
  letters: [...el.querySelectorAll('.name .ch')],
  fit: el.querySelector('.fit'),
  nums: [...el.querySelectorAll('.num')],
  p: 99, target: 99, top: 0, height: 1
}));
sections.forEach((s) => s.nums.forEach(prepNum));
const stage = { top: 0, height: 1, s: 99, target: 99, nums: [...stageEl.querySelectorAll('.num')] };
stage.nums.forEach(prepNum);

function applyProgress(sec, p) {
  const ap = Math.abs(p);
  const st = sec.el.style;
  st.setProperty('--p', p.toFixed(4));
  st.setProperty('--ap', ap.toFixed(4));
  st.setProperty('--c', smooth(clamp(1 - ap * 2.4, 0, 1)).toFixed(3));   // white -> planet colour
  // rules draw in as the section arrives and run out as it leaves
  st.setProperty('--rl', smooth(clamp(1.45 - ap * 2.0, 0, 1)).toFixed(3));
  st.setProperty('--ro', p > 0 ? '0%' : '100%');

  // letters rise in from below on arrival and lift out the top on departure, each a beat behind the last
  sec.letters.forEach((ch, i) => {
    const pl = p + i * 0.02;
    const ty = clamp((pl - 0.16) / 0.4, 0, 1) * 112 + clamp((pl + 0.16) / 0.4, -1, 0) * 112;
    ch.style.translate = `0 ${ty.toFixed(2)}%`;
  });
  if (sec.fit) {
    sec.fit.style.translate = `${(p * 7).toFixed(3)}vw 0`;
    sec.fit.style.scale = (1 - ap * 0.05).toFixed(4);
  }
  // numbers count up as the section arrives and back down as it leaves
  const v = smooth(clamp(1.2 - ap * 2.4, 0, 1));
  sec.nums.forEach((el) => setNum(el, v));
}

/* Lineup geometry: true relative diameters, Jupiter as the unit, Sun as a huge arc on the left. */
let lu = null;
function layoutLineup() {
  const W = window.innerWidth, H = window.innerHeight;
  const pad = W < 760 ? 20 : Math.max(20, W * 0.0333);
  const DJ = clamp(W * 0.15, 44, 235);
  const Rs = (DJ / 2) * SUN_DIAMETER.r;
  const sunEdge = W * 0.10;
  const cy = H * 0.46;
  const Rp = PLANETS.map((p) => (DJ / 2) * p.r);
  const xa = sunEdge + W * 0.055, xb = W - pad - W * 0.012;
  const sumD = Rp.reduce((a, r) => a + 2 * r, 0);
  const gap = Math.max(8, (xb - xa - sumD) / 7);
  let cur = xa;
  const cx = Rp.map((r) => { const c = cur + r; cur += 2 * r + gap; return c; });
  lu = { W, H, DJ, Rs, sunCx: sunEdge - Rs, cy, Rp, cx, sunEdge, rowY: cy + DJ / 2 + 36 };
}

/* The stage timeline. s -> everything on screen. */
const lineupNow = { sun: null, planets: [] };
function applyStage(s) {
  const out = smooth(clamp((s - 0.07) / 0.30, 0, 1));         // title leaves
  const Lp = clamp((s - 0.30) / 0.52, 0, 1);                   // planets arrive
  const Ls = clamp((s - 0.30) / 0.70, 0, 1);                   // drift through the hold
  const st = stageEl.style;
  st.setProperty('--s', s.toFixed(4));
  st.setProperty('--out', out.toFixed(4));
  st.setProperty('--lp', clamp(Lp * 2.2, 0, 1).toFixed(3));
  st.setProperty('--rl', (1 - smooth(clamp(out * 1.6, 0, 1))).toFixed(3));
  st.setProperty('--ro', '100%');

  // title: letters lift out through the line masks, in reading order
  heroLetters.forEach((ch, i) => {
    const lift = clamp((out * 1.5 - i * 0.045) / 0.7, 0, 1);
    ch.style.translate = `0 ${(-lift * 112).toFixed(2)}%`;
  });
  const vStats = 1 - smooth(clamp(out * 1.5, 0, 1));
  stage.nums.forEach((el) => setNum(el, vStats));

  // lineup
  if (!lu) layoutLineup();
  const pinTop = pinEl.getBoundingClientRect().top;
  const cy = lu.cy + pinTop;
  const eS = easeOut(clamp(Lp * 2.2, 0, 1));
  lineupNow.sun = {
    cx: lu.sunCx - lu.Rs * 0.10 * (1 - eS) - Ls * lu.W * 0.012,
    cy, R: lu.Rs * (1 + Ls * 0.03), a: eS
  };
  lineupNow.planets = PLANETS.map((p, i) => {
    const e = easeOut(clamp(Lp * 1.75 - i * 0.115, 0, 1));
    const depth = Math.sqrt(p.r);
    const x = lu.cx[i] + (1 - e) * lu.W * (0.22 + 0.4 * depth) - Ls * lu.W * 0.035 * (0.35 + 0.85 * depth);
    const R = lu.Rp[i] * (0.7 + 0.3 * e);
    return { x, cy, R, a: e, e };
  });

  // labels and the rules that drop to them
  const rowY = lu.rowY + pinTop;
  lineupNow.planets.forEach((q, i) => {
    const lab = luLabels[i];
    const k = clamp((q.e - 0.55) / 0.45, 0, 1);
    const top = q.cy + lu.Rp[i] * (0.7 + 0.3 * q.e) + 10;
    lab.el.style.opacity = k.toFixed(3);
    lab.el.style.transform = `translate(${q.x.toFixed(1)}px, ${top.toFixed(1)}px) translateX(-50%)`;
    lab.rule.style.height = `${Math.max(4, (rowY - top) * k).toFixed(1)}px`;
  });
  luSun.style.opacity = clamp((eS - 0.5) / 0.5, 0, 1).toFixed(3);
  luSun.style.transform = `translate(${(lu.sunEdge * 0.5).toFixed(1)}px, ${(rowY - 12).toFixed(1)}px) translateX(-50%)`;
  luCap.style.opacity = clamp((Lp - 0.7) / 0.3, 0, 1).toFixed(3);
}

function measure() {
  sections.forEach((s) => {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + window.scrollY;
    s.height = r.height;
  });
  const r = stageEl.getBoundingClientRect();
  stage.top = r.top + window.scrollY;
  stage.height = r.height;
}
function targetFor(sec) {
  const mid = window.scrollY + window.innerHeight / 2;
  return (sec.top + sec.height / 2 - mid) / window.innerHeight;
}
function stageTarget() {
  return clamp((window.scrollY - stage.top) / Math.max(1, stage.height - window.innerHeight), 0, 1);
}

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
const heroStop = { top: 0, height: 0 };
const stops = [{ sec: heroStop, km: 0, accent: SUN }].concat(
  PLANETS.map((p, i) => ({ sec: sections[i], km: p.mkm, accent: p.accent }))
);
let nearStop = 0;

function fmtKm(d) {
  if (d < 0.05) return '0 km';
  return d >= 1000 ? Math.round(d).toLocaleString('en-US') + 'M km' : d.toFixed(1) + 'M km';
}
function updateRail() {
  heroStop.top = stage.top;
  heroStop.height = window.innerHeight;
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
  nearStop = near;

  const pct = (km / MAX_KM) * 100;
  railDot.style.left = pct + '%';
  railFill.style.width = pct + '%';
  railR.textContent = fmtKm(km);
  rail.style.setProperty('--rail-accent', stops[near].accent);
  ticks.forEach((t, i) => t.classList.toggle('on', i + 1 === near));
}

/* ---------- WebGL2: stars you fly through, realistic planets, the Sun ----------
   Layout stays in the DOM. Each chapter's .disc box says where and how big its
   planet is, so the GL layer follows the same scroll motion as the text. */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const STAR_VS = `#version 300 es
in vec2 aCorner;   // x: 0 head / 1 tail, y: side -1..1
in vec4 aStar;     // x, y, depth, size
in vec2 aRnd;      // brightness, hue
uniform float uTravel, uBlur, uAspect, uDpr;
uniform vec2 uMouse, uRes;
out vec2 vUV; out float vA; out vec3 vCol;
vec2 proj(float zf, vec2 xy) {
  float d = 1.0 - zf * 0.93;
  return vec2(xy.x * uAspect, xy.y) * (0.75 / d) + vec2(uMouse.x, -uMouse.y) * zf * 0.09;
}
void main() {
  float zf = fract(aStar.z - uTravel);               // 0 far -> 1 near; wraps, so the field never runs out
  float zt = clamp(zf - uBlur, 0.0, 1.0);            // where the star was a moment ago: the motion blur
  vec2 sh = proj(zf, aStar.xy) * uRes * 0.5;
  vec2 st = proj(zt, aStar.xy) * uRes * 0.5;
  vec2 dir = sh - st;
  float len = length(dir);
  dir = len > 0.001 ? dir / len : vec2(1.0, 0.0);
  float w = (0.85 + zf * zf * 2.8) * aStar.w * uDpr;
  float L = max(len, w * 1.3);
  vec2 base = mix(sh, sh - dir * L, aCorner.x);
  vec2 side = vec2(-dir.y, dir.x) * aCorner.y * w;
  vec2 cap = dir * w * 0.9 * (1.0 - aCorner.x);
  gl_Position = vec4((base + side + cap) / (uRes * 0.5), 0.0, 1.0);
  vUV = aCorner;
  vA = smoothstep(0.0, 0.10, zf) * (1.0 - smoothstep(0.90, 1.0, zf)) * (0.4 + 0.6 * aRnd.x);
  vCol = mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.88, 0.72), aRnd.y);
}`;
const STAR_FS = `#version 300 es
precision mediump float;
in vec2 vUV; in float vA; in vec3 vCol;
uniform vec3 uTint;
out vec4 oc;
void main() {
  float across = 1.0 - smoothstep(0.3, 1.0, abs(vUV.y));
  float along = 1.0 - vUV.x * 0.92;
  float a = across * along * vA * 1.05;
  oc = vec4(mix(vCol, uTint, 0.28) * a, a);
}`;

const QUAD_VS = `#version 300 es
in vec2 aQ;
uniform vec4 uRect;     // cx, cy, half w, half h (css px, y down)
uniform vec2 uView;     // css viewport
out vec2 vPx;
void main() {
  vPx = uRect.xy + aQ * uRect.zw;
  gl_Position = vec4(vPx.x / uView.x * 2.0 - 1.0, 1.0 - vPx.y / uView.y * 2.0, 0.0, 1.0);
}`;

const NOISE_GLSL = `
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }`;

const PLANET_FS = `#version 300 es
precision highp float;
in vec2 vPx; out vec4 oc;
uniform sampler2D uAlb, uCld, uNit, uRng;
uniform vec3 uC;        // centre x, y, radius (css px)
uniform vec3 uL;        // direction to the Sun, view space, y up
uniform vec4 uA;        // spin, tilt, elevation, alpha
uniform vec4 uF;        // kind, albedo lod, cloud drift, -
uniform vec4 uAtmo;     // limb glow rgb, strength
uniform float uRingOn, uRL;
const float PI = 3.14159265;
vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec3 rotZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z); }
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

void main() {
  float R = uC.z;
  vec2 d = (vPx - uC.xy) / R; d.y = -d.y;
  float rr = length(d);
  vec3 L = normalize(uL);
  float spin = uA.x, tilt = uA.y, elev = uA.z;
  vec3 Nr = rotZ(vec3(0.0, cos(elev), sin(elev)), tilt);   // spin axis = ring plane normal
  float kind = uF.x;
  float edge = 1.4 / R;
  float aSph = 1.0 - smoothstep(1.0 - edge, 1.0, rr);
  vec4 sph = vec4(0.0);

  if (rr < 1.0 + edge) {
    float z = sqrt(max(1.0 - rr * rr, 0.0));
    vec3 n = vec3(d, z);
    vec3 no = rotY(rotX(rotZ(n, -tilt), -elev), spin);
    vec2 uv = vec2(atan(no.x, no.z) / (2.0 * PI) + 0.5, 0.5 - asin(clamp(no.y, -1.0, 1.0)) / PI);
    vec3 alb = toLin(textureLod(uAlb, uv, uF.y).rgb);
    float dif = dot(n, L);
    float lit = clamp(dif, 0.0, 1.0);
    if (kind > 2.5) lit = pow(clamp(dif * 0.5 + 0.55, 0.0, 1.0), 1.8);    // Venus: soft terminator under the haze
    vec3 col = alb * (0.016 + lit * 1.3);

    if (kind > 1.5 && kind < 2.5) {                                        // Earth
      float cld = textureLod(uCld, vec2(uv.x + uF.z, uv.y), uF.y).r;
      float ocean = clamp((alb.b - alb.r * 1.6) * 4.0, 0.0, 1.0);
      vec3 rf = reflect(-L, n);
      col += vec3(1.0, 0.93, 0.82) * pow(max(rf.z, 0.0), 48.0) * ocean * (1.0 - cld) * 0.6 * step(0.0, dif);
      vec3 nit = toLin(textureLod(uNit, uv, uF.y).rgb);
      float dark = 1.0 - smoothstep(-0.02, 0.2, dif);
      col += nit * vec3(1.0, 0.72, 0.38) * dark * (1.0 - cld * 0.8) * 1.7;
      col = mix(col, vec3(0.018 + lit * 1.2), cld * 0.9);
    }
    if (uRingOn > 0.5) {                                                   // the ring's shadow falls across Saturn
      float dl = dot(L, Nr);
      if (abs(dl) > 0.02) {
        float t = -dot(n, Nr) / dl;
        if (t > 0.0) {
          float rho = length(n + t * L);
          if (rho > 1.24 && rho < 2.27) col *= 1.0 - 0.9 * textureLod(uRng, vec2((rho - 1.24) / 1.03, 0.5), uRL).a;
        }
      }
    }
    float fres = pow(1.0 - z, 2.4);
    col += uAtmo.rgb * fres * uAtmo.a * (0.10 + 0.90 * smoothstep(-0.35, 0.65, dif)) * 1.1;
    if (kind > 0.5 && kind < 1.5) col *= mix(0.62, 1.0, pow(z, 0.35));    // giants darken toward the limb
    sph = vec4(toSRGB(col) * aSph, aSph);
  }

  vec4 glow = vec4(0.0);                                                   // atmosphere seen past the limb
  if (rr >= 1.0 && uAtmo.a > 0.0) {
    float k = exp(-(rr - 1.0) * (26.0 / (0.6 + uAtmo.a * 0.8)));
    float side = smoothstep(-0.6, 0.7, dot(d / rr, L.xy));
    float g = k * uAtmo.a * 0.6 * (0.06 + 0.94 * side);
    glow = vec4(uAtmo.rgb * g, g * 0.8);
  }
  vec4 o = sph + glow * (1.0 - sph.a);

  if (uRingOn > 0.5 && abs(Nr.z) > 0.02) {                                 // the ring itself
    float z = -(Nr.x * d.x + Nr.y * d.y) / Nr.z;
    vec3 P = vec3(d, z);
    float rho = length(P);
    if (rho > 1.24 && rho < 2.27 && (rr >= 1.0 || z > 0.0)) {              // behind the planet it is hidden
      vec4 rt = textureLod(uRng, vec2((rho - 1.24) / 1.03, 0.5), uRL);
      float s = dot(P, L);
      float lightK = (s < 0.0 && length(P - s * L) < 1.0) ? 0.07 : 1.0;    // Saturn's own shadow
      float ang = 0.35 + 0.65 * abs(dot(Nr, L));
      vec3 rc = toLin(rt.rgb) * (0.05 + 1.25 * lightK * ang);
      vec4 rg = vec4(toSRGB(rc) * rt.a, rt.a);
      o = rg + o * (1.0 - rg.a);
    }
  }
  oc = o * uA.w;
}`;

const SUN_FS = `#version 300 es
precision highp float;
in vec2 vPx; out vec4 oc;
uniform vec3 uC;       // centre x, y, radius
uniform vec4 uS;       // alpha, time, spin
${NOISE_GLSL}
void main() {
  float R = uC.z;
  vec2 d = (vPx - uC.xy) / R; d.y = -d.y;
  float rr = length(d);
  float t = uS.y;
  vec3 col = vec3(0.0);
  float a = 0.0;
  if (rr < 1.0) {
    float z = sqrt(1.0 - rr * rr);
    vec3 n = vec3(d, z);
    float c = cos(uS.z), s = sin(uS.z);
    vec3 no = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z);
    float gran = 0.55 * fbm(no * 5.0 + vec3(0.0, 0.0, t * 0.05)) + 0.45 * fbm(no * 15.0 - vec3(t * 0.07, 0.0, 0.0));
    float spot = smoothstep(0.62, 0.70, fbm(no * 2.4 + 3.1));
    float limb = 0.40 + 0.60 * pow(z, 0.55);
    vec3 hot = vec3(1.0, 0.94, 0.5), mid = vec3(1.0, 0.80, 0.10), cool = vec3(0.96, 0.55, 0.04);
    vec3 base = mix(cool, mid, smoothstep(0.25, 0.6, gran));
    base = mix(base, hot, smoothstep(0.55, 0.85, gran));
    a = 1.0 - smoothstep(1.0 - 1.5 / R, 1.0, rr);
    col = base * limb * 1.15 * (1.0 - 0.55 * spot) * a;
  }
  float dist = max(rr - 1.0, 0.0) * R;
  float ang = atan(d.y, d.x);
  float streak = 0.7 + 0.5 * noise(vec3(cos(ang) * 2.0, sin(ang) * 2.0, t * 0.08));
  float g = exp(-dist / 120.0) * 0.6 * streak;
  vec4 o = vec4(col + vec3(1.0, 0.74, 0.14) * g * (1.0 - a), max(a, g * 0.9 * (1.0 - a)));
  oc = o * uS.x;
}`;

function initGL() {
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs, attribs) => {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  let starProg, planetProg, sunProg;
  try {
    starProg = program(STAR_VS, STAR_FS, ['aCorner', 'aStar', 'aRnd']);
    planetProg = program(QUAD_VS, PLANET_FS, ['aQ']);
    sunProg = program(QUAD_VS, SUN_FS, ['aQ']);
  } catch (err) {
    console.warn('WebGL shaders failed, falling back to flat discs.', err);
    return null;
  }
  document.body.prepend(canvas);
  document.documentElement.classList.add('gl');

  /* stars: one instance each, drawn as a quad that stretches into a streak with scroll speed */
  const N = window.innerWidth < 760 ? 1100 : 2300;
  const inst = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) {
    const big = Math.random() < 0.06;
    inst.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random(), (big ? 1.7 : 0.8) * (0.7 + Math.random() * 0.6), Math.random(), Math.random()], i * 6);
  }
  const starVAO = gl.createVertexArray();
  gl.bindVertexArray(starVAO);
  const cornerBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
  gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
  gl.vertexAttribDivisor(2, 1);

  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const U = (prog, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]));
  const us = U(starProg, ['uTravel', 'uBlur', 'uAspect', 'uDpr', 'uMouse', 'uRes', 'uTint']);
  const up = U(planetProg, ['uRect', 'uView', 'uAlb', 'uCld', 'uNit', 'uRng', 'uC', 'uL', 'uA', 'uF', 'uAtmo', 'uRingOn', 'uRL']);
  const un = U(sunProg, ['uRect', 'uView', 'uC', 'uS']);

  /* textures: a solid placeholder first, the real map swaps in when it has decoded */
  const colorTex = (rgba) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const textures = {};
  const loadTex = (key, fallback) => {
    textures[key] = colorTex(fallback);
    if (typeof TEX === 'undefined' || !TEX[key]) return;
    const img = new Image();
    img.onload = () => {
      const t = textures[key];
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, key === 'saturn_ring' ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    };
    img.src = TEX[key];
  };
  PLANETS.forEach((p) => {
    const [r, g, b] = hexToRgb(p.accent).map((v) => Math.round(v * 150));
    loadTex(p.tex, [r, g, b, 255]);
  });
  loadTex('earth_clouds', [0, 0, 0, 255]);
  loadTex('earth_nightmap', [0, 0, 0, 255]);
  loadTex('saturn_ring', [0, 0, 0, 0]);
  const blackTex = colorTex([0, 0, 0, 255]);
  const clearTex = colorTex([0, 0, 0, 0]);

  const tint = hexToRgb(SUN);
  let dpr = 1, W = 1, H = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  const bindTex = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); };

  function drawPlanet(i, cx, cy, R, alpha, L, spin, t) {
    const p = PLANETS[i];
    if (alpha < 0.005 || R < 0.5) return;
    const m = p.ring ? 2.5 : 1.55;
    bindTex(0, textures[p.tex]);
    bindTex(1, p.kind === 2 ? textures.earth_clouds : blackTex);
    bindTex(2, p.kind === 2 ? textures.earth_nightmap : blackTex);
    bindTex(3, p.ring ? textures.saturn_ring : clearTex);
    gl.uniform4f(up.uRect, cx, cy, R * m, R * m);
    gl.uniform3f(up.uC, cx, cy, R);
    gl.uniform3f(up.uL, L[0], L[1], L[2]);
    gl.uniform4f(up.uA, spin, (p.tilt * Math.PI) / 180, (p.elev * Math.PI) / 180, alpha);
    const lod = Math.max(0, Math.log2(1024 / (2 * Math.PI * R * dpr)) - 0.2);
    gl.uniform4f(up.uF, p.kind, lod, t * 0.012 + window.scrollY * 0.0003, 0);
    gl.uniform4f(up.uAtmo, p.atmo[0], p.atmo[1], p.atmo[2], p.atmo[3]);
    gl.uniform1f(up.uRingOn, p.ring ? 1 : 0);
    gl.uniform1f(up.uRL, Math.max(0, Math.log2(2048 / (1.03 * R * dpr)) - 0.5));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function draw(time, travel, blur) {
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const want = hexToRgb(stops[nearStop].accent);
    for (let k = 0; k < 3; k++) tint[k] += (want[k] - tint[k]) * 0.06;
    const idle = reduceMotion ? 0 : time;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // stars
    gl.useProgram(starProg);
    gl.bindVertexArray(starVAO);
    gl.uniform1f(us.uTravel, travel);
    gl.uniform1f(us.uBlur, blur);
    gl.uniform1f(us.uAspect, W / H);
    gl.uniform1f(us.uDpr, dpr);
    gl.uniform2f(us.uMouse, mouse.x, mouse.y);
    gl.uniform2f(us.uRes, canvas.width, canvas.height);
    gl.uniform3fv(us.uTint, tint);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, N);

    gl.bindVertexArray(quadVAO);
    const spinBase = window.scrollY * 0.0014 + idle * 0.05;

    // the Sun and the to-scale lineup
    if (lineupNow.sun && lineupNow.sun.a > 0.003) {
      const sn = lineupNow.sun;
      gl.useProgram(sunProg);
      gl.uniform2f(un.uView, W, H);
      gl.uniform4f(un.uRect, W / 2, H / 2, W / 2, H / 2);
      gl.uniform3f(un.uC, sn.cx, sn.cy, sn.R);
      gl.uniform4f(un.uS, sn.a, idle, spinBase * 0.4, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.useProgram(planetProg);
    gl.uniform2f(up.uView, W, H);
    gl.uniform1i(up.uAlb, 0); gl.uniform1i(up.uCld, 1); gl.uniform1i(up.uNit, 2); gl.uniform1i(up.uRng, 3);
    const sunward = [-0.95, 0.16, 0.30];
    if (lineupNow.planets.length) {
      lineupNow.planets.forEach((q, i) => {
        if (q.a > 0.005) drawPlanet(i, q.x + mouse.x * -5 * (0.4 + PLANETS[i].r), q.cy + mouse.y * -3, q.R, q.a, sunward, spinBase + i * 1.7, idle);
      });
    }

    // the chapter planets, placed by their DOM boxes
    PLANETS.forEach((p, i) => {
      const sec = sections[i];
      if (sec.p === 99) return;
      const ap = Math.abs(sec.p);
      const alpha = clamp(1.6 - ap * 1.8, 0, 1);
      if (alpha < 0.01) return;
      const r = sec.el.querySelector('.disc .body').getBoundingClientRect();
      const pp = clamp(sec.p, -1.2, 1.2);
      // the light sweeps across as you scroll past
      const L = [-0.50 - 0.85 * pp, 0.28, 0.80 - 0.55 * Math.abs(pp)];
      drawPlanet(i, r.left + r.width / 2 + mouse.x * -9, r.top + r.height / 2 + mouse.y * -6, Math.max(r.width / 2, 1), alpha, L, spinBase + i * 1.7, idle);
    });
  }
  return { draw };
}
const glLayer = initGL();
if (!glLayer) document.documentElement.classList.add('no-gl');

/* ---------- Main loop ---------- */
const motion = { lastY: window.scrollY, vel: 0, blur: 0 };
function frame(now) {
  const t = now / 1000;
  const y = window.scrollY;
  // scroll speed drives the star streaks
  motion.vel += ((y - motion.lastY) - motion.vel) * 0.18;
  motion.lastY = y;
  const target = clamp(motion.vel * 0.00042 * 9, -0.45, 0.45) + (reduceMotion ? 0 : 0.0035);
  motion.blur += (target - motion.blur) * 0.25;

  sections.forEach((s) => {
    s.target = targetFor(s);
    const first = s.p === 99;
    const next = first || reduceMotion ? s.target : s.p + (s.target - s.p) * 0.16;
    const changed = first || Math.abs(next - s.p) > 0.00005 || Math.abs(s.target - next) > 0.0004;
    s.p = Math.abs(s.target - next) < 0.0004 ? s.target : next;
    if (changed && (Math.abs(s.p) < 1.5 || first)) applyProgress(s, reduceMotion ? 0 : s.p);
  });

  stage.target = stageTarget();
  const sFirst = stage.s === 99;
  const sNext = sFirst ? stage.target : stage.s + (stage.target - stage.s) * 0.14;
  const sChanged = sFirst || Math.abs(sNext - stage.s) > 0.00003 || Math.abs(stage.target - sNext) > 0.0003 || motion.vel !== 0;
  stage.s = Math.abs(stage.target - sNext) < 0.0003 ? stage.target : sNext;
  if (sChanged) applyStage(stage.s);

  updateRail();
  if (glLayer) glLayer.draw(t, y * 0.00042 + (reduceMotion ? 0 : t * 0.006), motion.blur);
  requestAnimationFrame(frame);
}
function layout() {
  fitNames();
  measure();
  layoutLineup();
  sections.forEach((s) => { s.p = 99; });
  stage.s = 99;
}
layout();
if (document.fonts) {
  document.fonts.ready.then(layout);
  document.fonts.addEventListener('loadingdone', layout);
}
window.addEventListener('load', layout);
window.addEventListener('resize', layout);
requestAnimationFrame(frame);

// title rises in once on load
requestAnimationFrame(() => requestAnimationFrame(() => stageEl.classList.add('in')));
