const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const SUN = '#FFD400';
const MAX_KM = PLANETS[PLANETS.length - 1].mkm;

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
  s.className = 'screen planet';
  s.id = p.name.toLowerCase();
  s.style.setProperty('--accent', p.accent);
  s.innerHTML = `
    <div class="bar">
      <span class="label light">${pad(n)} / ${pad(PLANETS.length)}</span>
      <span class="label">${p.km}</span>
    </div>
    <div class="disc" style="--r:${p.r}" aria-hidden="true"><i class="body"></i></div>
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

/* ---------- Data row: counts up once when a section first arrives ---------- */
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
    el.textContent = k < 1 ? fmt(target * (1 - Math.pow(1 - k, 3))) : text;
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}
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

/* ---------- Scroll-linked motion ----------
   Every section gets a progress value p: 0 when it sits in the middle of the
   screen, +1 one screen below, -1 one screen above. The names, the planets and
   the lighting are pure functions of p, so they play forward when you scroll
   down and backward when you scroll up. p is eased toward its target. */
const sections = screens.map((el) => ({
  el,
  letters: [...el.querySelectorAll('.ch')],
  fit: el.querySelector('.fit'),
  p: 99, target: 99, top: 0, height: 1
}));

function applyProgress(sec, p) {
  const ap = Math.abs(p);
  sec.el.style.setProperty('--p', p.toFixed(4));
  sec.el.style.setProperty('--ap', ap.toFixed(4));
  // 0 when far away, 1 when centred: drives the white -> planet-colour name
  sec.el.style.setProperty('--c', smooth(clamp(1 - ap * 2.4, 0, 1)).toFixed(3));

  // letters rise in from below on arrival and lift out the top on departure, each a beat behind the last
  sec.letters.forEach((ch, i) => {
    const pl = p + i * 0.02;
    const ty = clamp((pl - 0.16) / 0.4, 0, 1) * 112 + clamp((pl + 0.16) / 0.4, -1, 0) * 112;
    ch.style.translate = `0 ${ty.toFixed(2)}%`;
  });
  if (sec.fit) sec.fit.style.translate = `${(p * 7).toFixed(3)}vw 0`;
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
let nearStop = 0;

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
  nearStop = near;

  const pct = (km / MAX_KM) * 100;
  railDot.style.left = pct + '%';
  railFill.style.width = pct + '%';
  railR.textContent = fmtKm(km);
  rail.style.setProperty('--rail-accent', stops[near].accent);
  ticks.forEach((t, i) => t.classList.toggle('on', i + 1 === near));
}

/* ---------- WebGL: starfield you fly through + halftone planets ----------
   The page layout stays in the DOM. Each planet's .disc box says where and how
   big to draw it, so the GL layer follows the same scroll motion as the text. */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

const STAR_VS = `
attribute vec3 aPos; attribute vec2 aRnd;
uniform float uTravel, uAspect, uDpr; uniform vec2 uMouse;
varying float vA;
void main() {
  float zf = fract(aPos.z - uTravel);          // 0 far -> 1 near; wraps, so the field never runs out
  float d = 1.0 - zf * 0.93;
  vec2 p = vec2(aPos.x * uAspect, aPos.y) * (0.75 / d) + vec2(uMouse.x, -uMouse.y) * zf * 0.08;
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = (0.9 + zf * zf * 3.4) * (0.7 + aRnd.x * 0.9) * uDpr;
  vA = smoothstep(0.0, 0.12, zf) * (1.0 - smoothstep(0.88, 1.0, zf)) * (0.3 + 0.7 * aRnd.y);
}`;
const STAR_FS = `
precision mediump float;
uniform vec3 uTint; varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.12, 0.5, d)) * vA;
  gl_FragColor = vec4(mix(vec3(1.0), uTint, 0.35) * a, a);
}`;
const QUAD_VS = `attribute vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }`;
const PLANET_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uDpr, uTime;
uniform vec4 uP[8];   // centre x, centre y, radius (css px), alpha
uniform vec3 uCol[8]; // accent
uniform vec4 uS[8];   // surface look
uniform vec4 uM[8];   // light x, spin, ring flag, seed

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

// Classic halftone: a rotated dot screen, dot area follows brightness.
float dots(vec2 px, float cell, float ang, float lum) {
  float c = cos(ang), s = sin(ang);
  vec2 q = vec2(c * px.x - s * px.y, s * px.x + c * px.y) / cell;
  float d = length(fract(q) - 0.5);
  float r = 0.74 * sqrt(clamp(lum, 0.0, 1.0));
  float aa = 0.9 / cell;
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 8; i++) {
    vec4 P = uP[i];
    if (P.w < 0.01) continue;
    vec2 d = px - P.xy;
    float R = P.z;
    float len = length(d);
    float dist = len / R;
    float ringed = uM[i].z;
    float Ra = max(R, 46.0);
    if (len / Ra > 3.4 && dist > 2.5) continue;
    vec3 col = uCol[i];
    float cell = max(2.2, R / 13.0);
    vec4 layer = vec4(0.0);

    // halftone aura: a coarse dot glow that fades out from the planet
    float fall = exp(-pow(max(len / Ra - R / Ra, 0.0), 1.0) * 3.8) * 0.11;
    float aura = dots(px, 12.0, 0.26, fall) * smoothstep(0.96, 1.04, dist);
    layer = vec4(col * 0.85 * aura, aura) * P.w;

    // Saturn's ring, as dots. Back half goes behind the planet, front half over it.
    float ringBack = 0.0, ringFront = 0.0;
    if (ringed > 0.5) {
      float a = -0.30;
      vec2 e = vec2(cos(a) * d.x - sin(a) * d.y, sin(a) * d.x + cos(a) * d.y) / R;
      vec2 u = vec2(e.x, e.y / 0.30);
      float rg = length(u);
      float band = smoothstep(1.24, 1.30, rg) * (1.0 - smoothstep(2.16, 2.24, rg));
      float gap = smoothstep(0.0, 0.035, abs(rg - 2.0) - 0.035);
      float lum = band * gap * (0.38 + 0.62 * (0.5 + 0.5 * sin(rg * 44.0)));
      lum *= rg < 1.62 ? 0.45 : 1.0;
      float cov = dots(px, cell, 0.7854, lum);
      if (e.y > 0.0) ringFront = cov; else if (dist > 1.0) ringBack = cov;
    }
    vec3 ringCol = mix(col, vec3(1.0), 0.55);
    layer = vec4(ringCol * ringBack, ringBack) * P.w + layer * (1.0 - ringBack * P.w);

    // the sphere
    if (dist < 1.0) {
      float z = sqrt(1.0 - dist * dist);
      vec3 n = vec3(d.x / R, -d.y / R, z);
      vec3 L = normalize(vec3(uM[i].x, 0.55, 0.72));
      float diff = max(dot(n, L), 0.0);
      vec3 nr = rotY(n, uM[i].y);
      vec4 S = uS[i];
      float n1 = fbm(nr * S.z + uM[i].w);
      float lat = asin(clamp(nr.y, -1.0, 1.0));
      float bands = S.x > 0.0 ? 0.5 + 0.5 * sin(lat * S.x + (n1 - 0.5) * 1.6) : 1.0;
      float feat = mix(1.0, bands, S.y * 0.7) * mix(1.0, clamp(n1 * 1.8, 0.0, 1.15), S.w * 0.55);
      float lum = (0.07 + 0.93 * pow(diff, 0.72)) * clamp(feat, 0.4, 1.12);
      float cov = dots(px, cell, 0.7854, lum) * (1.0 - smoothstep(1.0 - 1.6 / R, 1.0, dist));
      vec3 pc = mix(col, vec3(1.0), smoothstep(0.85, 1.1, lum) * 0.30);
      vec4 sph = vec4(pc * cov, cov) * P.w;
      layer = sph + layer * (1.0 - sph.a);
    }
    vec4 fr = vec4(ringCol * ringFront, ringFront) * P.w;
    layer = fr + layer * (1.0 - fr.a);

    acc = layer + acc * (1.0 - layer.a);
  }
  gl_FragColor = acc;
}`;

function initGL() {
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  let starProg, planetProg;
  try {
    starProg = program(STAR_VS, STAR_FS);
    planetProg = program(QUAD_VS, PLANET_FS);
  } catch (err) {
    console.warn('WebGL shaders failed, falling back to flat discs.', err);
    return null;
  }
  document.body.prepend(canvas);
  document.documentElement.classList.add('gl');

  // stars: x, y in [-1,1], z in [0,1), plus two random numbers for size and brightness
  const N = window.innerWidth < 760 ? 900 : 1900;
  const data = new Float32Array(N * 5);
  for (let i = 0; i < N; i++) {
    data.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random(), Math.random(), Math.random()], i * 5);
  }
  const starBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const su = (n) => gl.getUniformLocation(starProg, n);
  const pu = (n) => gl.getUniformLocation(planetProg, n);
  const loc = {
    sTravel: su('uTravel'), sAspect: su('uAspect'), sDpr: su('uDpr'), sMouse: su('uMouse'), sTint: su('uTint'),
    pRes: pu('uRes'), pDpr: pu('uDpr'), pTime: pu('uTime'),
    pP: pu('uP[0]'), pCol: pu('uCol[0]'), pS: pu('uS[0]'), pM: pu('uM[0]')
  };
  const aPos = gl.getAttribLocation(starProg, 'aPos');
  const aRnd = gl.getAttribLocation(starProg, 'aRnd');
  const aP = gl.getAttribLocation(planetProg, 'aP');

  const uP = new Float32Array(32), uCol = new Float32Array(24), uS = new Float32Array(32), uM = new Float32Array(32);
  PLANETS.forEach((p, i) => {
    uCol.set(hexToRgb(p.accent), i * 3);
    uS.set(p.look, i * 4);
    uM[i * 4 + 2] = p.ring ? 1 : 0;
    uM[i * 4 + 3] = i * 7.3;
  });
  const tint = hexToRgb(SUN);
  let dpr = 1, W = 1, H = 1, travel = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(time) {
    // ease the mouse and the colour of the starlight toward their targets
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const want = hexToRgb(stops[nearStop].accent);
    for (let k = 0; k < 3; k++) tint[k] += (want[k] - tint[k]) * 0.06;

    const idle = reduceMotion ? 0 : time;
    travel = window.scrollY * 0.00042 + idle * 0.006;

    PLANETS.forEach((p, i) => {
      const sec = sections[i + 1];
      const body = sec.el.querySelector('.disc .body');
      const r = body.getBoundingClientRect();
      const ap = Math.abs(sec.p === 99 ? 9 : sec.p);
      const alpha = clamp(1.6 - ap * 1.8, 0, 1);
      uP[i * 4] = r.left + r.width / 2 + mouse.x * -9;
      uP[i * 4 + 1] = r.top + r.height / 2 + mouse.y * -6;
      uP[i * 4 + 2] = Math.max(r.width / 2, 1);
      uP[i * 4 + 3] = alpha;
      // the light sweeps across as you scroll past, so the terminator moves with you
      uM[i * 4] = -0.5 - 0.9 * clamp(sec.p === 99 ? 0 : sec.p, -1.2, 1.2);
      uM[i * 4 + 1] = window.scrollY * 0.0014 + idle * 0.05 + i * 1.7;
    });

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(starProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    for (let k = 0; k < 4; k++) gl.disableVertexAttribArray(k);   // both programs use attribute 0
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aRnd);
    gl.vertexAttribPointer(aRnd, 2, gl.FLOAT, false, 20, 12);
    gl.uniform1f(loc.sTravel, travel);
    gl.uniform1f(loc.sAspect, W / H);
    gl.uniform1f(loc.sDpr, dpr);
    gl.uniform2f(loc.sMouse, mouse.x, mouse.y);
    gl.uniform3fv(loc.sTint, tint);
    gl.drawArrays(gl.POINTS, 0, N);

    gl.useProgram(planetProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    for (let k = 0; k < 4; k++) gl.disableVertexAttribArray(k);
    gl.enableVertexAttribArray(aP);
    gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(loc.pRes, canvas.width, canvas.height);
    gl.uniform1f(loc.pDpr, dpr);
    gl.uniform1f(loc.pTime, time);
    gl.uniform4fv(loc.pP, uP);
    gl.uniform3fv(loc.pCol, uCol);
    gl.uniform4fv(loc.pS, uS);
    gl.uniform4fv(loc.pM, uM);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return { draw };
}
const glLayer = initGL();

/* ---------- Main loop ---------- */
function frame(now) {
  sections.forEach((s) => {
    s.target = targetFor(s);
    const first = s.p === 99;
    const next = first || reduceMotion ? s.target : s.p + (s.target - s.p) * 0.16;
    const changed = first || Math.abs(next - s.p) > 0.00005 || Math.abs(s.target - next) > 0.0004;
    s.p = Math.abs(s.target - next) < 0.0004 ? s.target : next;
    if (changed && (Math.abs(s.p) < 1.5 || first)) applyProgress(s, reduceMotion ? 0 : s.p);
  });
  updateRail();
  if (glLayer) glLayer.draw(now / 1000);
  requestAnimationFrame(frame);
}
function layout() { fitNames(); measure(); sections.forEach((s) => { s.p = 99; }); }
layout();
if (document.fonts) {
  document.fonts.ready.then(layout);
  document.fonts.addEventListener('loadingdone', layout);
}
window.addEventListener('load', layout);
window.addEventListener('resize', layout);
requestAnimationFrame(frame);

// hero headline rises in once on load
requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('.hero').classList.add('in')));
