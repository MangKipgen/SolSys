// Build one chapter per planet from data.js
const chapters = document.getElementById('chapters');
const pad = (n) => String(n).padStart(2, '0');

PLANETS.forEach((p, i) => {
  const n = i + 1;
  const pct = (n / PLANETS.length) * 100;
  const s = document.createElement('section');
  s.className = 'screen planet';
  s.id = p.name.toLowerCase();
  s.style.setProperty('--r', p.r);
  s.style.setProperty('--pct', pct + '%');
  s.innerHTML = `
    <div class="bar">
      <a class="brand" href="#top">Perihelion</a>
      <span class="progress">
        <span class="label light">${pad(n)} / ${pad(PLANETS.length)}</span>
        <span class="track"><span class="fill"></span></span>
        <span class="label">${p.km}</span>
      </span>
    </div>
    <div class="disc" aria-hidden="true"></div>
    <h2 class="name">${p.name}</h2>
    <dl class="data">
      <div><dt class="label">Diameter</dt><dd>${p.diameter}</dd></div>
      <div><dt class="label">Day</dt><dd>${p.day}</dd></div>
      <div><dt class="label">Year</dt><dd>${p.year}</dd></div>
      <div><dt class="label">Moons</dt><dd class="accent">${p.moons}</dd></div>
    </dl>`;
  chapters.appendChild(s);
});

// Reveal each screen as it scrolls into view
const screens = document.querySelectorAll('.screen');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.35 });
  screens.forEach((el) => io.observe(el));
} else {
  screens.forEach((el) => el.classList.add('in'));
}
