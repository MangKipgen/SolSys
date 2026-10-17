// Edit planet facts here. The page rebuilds itself from this list.
// r      = true diameter relative to Jupiter (used by the to-scale lineup; chapters show every planet at one size)
// mkm    = mean distance from the Sun in millions of km (places the planet on the distance rail, and sets its light time)
// accent = this chapter's highlight colour (name colour, starlight tint, rail)
// kind   = shader treatment: 0 rock, 1 gas/ice giant, 2 Earth (clouds, night lights, ocean glint), 3 Venus (thick haze)
// tilt   = axial tilt in degrees as drawn (rolls the globe in the frame)   elev = how far the north pole leans toward you
// tiltDeg = the tilt as NASA lists it (shown under the planet)   retro = spins backwards
// atmo   = [r, g, b, strength] of the limb glow
// ring   = Saturn's ring
// temp   = mean temperature (surface; the 1 bar level for the giants)
// facts = one entry per fact, any number: { title, text, at?, side? }. Titles name what the fact is about. `at` is where a leader line points, and it is only given when there is something real to point at: axis (the pole tip), ring (the ring tip), limb (angle in degrees on the edge) or surface (x, y in planet radii, y down). No `at` means a floating fact with no line. Facts alternate sides unless `side` is 'l' or 'r'.
// Maps: tex/<tex>.jpg (see tex.js; re-run tools/make_tex_js.py after changing any).
// Source for facts: NASA Planetary Fact Sheets (rotation period, orbital period, mean distance from the Sun, gravity, temperature, mass).
const SUN_DIAMETER = { km: '1,392,700 km', r: 9.74 };
const PLANETS = [
  { name: 'Mercury', tex: 'mercury', kind: 0, tilt: 2,   tiltDeg: '0.03°', elev: 8,  atmo: [0, 0, 0, 0],            km: '57.9M km',  mkm: 57.9,   accent: '#D9C7A3', diameter: '4,879 km',   day: '1,408 hours', year: '88 days',     moons: '0',   temp: '167 °C',   r: 0.034,
    facts: [
      { title: 'Temperature swing', text: 'About 430 °C by day, −180 °C by night: the widest swing of any planet.', at: { type: 'limb', a: 150 }, side: 'l' },
      { title: 'Solar day', text: 'A year here lasts 88 days, but sunrise to sunrise takes 176.', side: 'r' }] },
  { name: 'Venus',   tex: 'venus',   kind: 3, tilt: 3,   tiltDeg: '177°',  elev: 6,  atmo: [1.0, 0.82, 0.5, 0.7],   km: '108.2M km', mkm: 108.2,  accent: '#F2B94B', diameter: '12,104 km',  day: '5,832 hours', year: '225 days',    moons: '0',   temp: '464 °C',   r: 0.085, retro: true,
    facts: [
      { title: 'Backwards spin', text: 'It spins backwards, and slowly enough that one Venus day outlasts one Venus year.', at: { type: 'axis' } },
      { title: 'Atmosphere', text: 'The hottest planet, hotter than Mercury, under air pressure about 92 times Earth’s.', at: { type: 'limb', a: 160 } }] },
  { name: 'Earth',   tex: 'earth',   kind: 2, tilt: 23,  tiltDeg: '23°',   elev: 14, atmo: [0.35, 0.62, 1.0, 1.0],  km: '149.6M km', mkm: 149.6,  accent: '#3FA7FF', diameter: '12,756 km',  day: '24.0 hours',  year: '365 days',    moons: '1',   temp: '15 °C',         r: 0.089,
    facts: [
      { title: 'Oceans', text: 'The only world we know of with liquid water standing on its surface.' },
      { title: 'Seasons', text: 'Tilted 23°, which is why we have seasons.', at: { type: 'axis' } },
      { title: 'Density', text: 'The densest planet in the solar system, at 5.51 g/cm³.' }] },
  { name: 'Mars',    tex: 'mars',    kind: 0, tilt: 25,  tiltDeg: '25°',   elev: 10, atmo: [1.0, 0.6, 0.4, 0.35],   km: '227.9M km', mkm: 227.9,  accent: '#FF5A36', diameter: '6,792 km',   day: '24.6 hours',  year: '687 days',    moons: '2',   temp: '−65 °C',   r: 0.048,
    facts: [
      { title: 'Olympus Mons', text: 'Roughly 22 km high, the tallest volcano known in the solar system.' },
      { title: 'Dust storms', text: 'Dust storms can cover much of the planet, and take months to settle.', at: { type: 'surface', x: -0.2, y: 0.3 } }] },
  { name: 'Jupiter', tex: 'jupiter', kind: 1, tilt: 3,   tiltDeg: '3°',    elev: 4,  atmo: [1.0, 0.86, 0.66, 0.3],  km: '778.5M km', mkm: 778.5,  accent: '#F0A04B', diameter: '142,984 km', day: '9.9 hours',   year: '11.9 years',  moons: '95',  temp: '−110 °C',   r: 1,
    facts: [
      { title: 'Great Red Spot', text: 'A storm wider than Earth, watched for well over a century.' },
      { title: 'Equator', text: 'Spins so fast it bulges: about 7% wider at the equator than pole to pole.', at: { type: 'limb', a: 180 } },
      { title: 'Mass', text: 'More than twice the mass of all the other planets put together.' }] },
  { name: 'Saturn',  tex: 'saturn',  kind: 1, tilt: -26, tiltDeg: '27°',   elev: 20, atmo: [1.0, 0.92, 0.65, 0.25], km: '1,432M km', mkm: 1432,   accent: '#E8D08A', diameter: '120,536 km', day: '10.7 hours',  year: '29.4 years',  moons: '146', temp: '−140 °C',     r: 0.843, ring: true,
    facts: [
      { title: 'Rings', text: 'The rings reach out some 282,000 km, yet are mostly about 10 metres thick.', at: { type: 'ring' } },
      { title: 'Density', text: 'Its average density is lower than water’s. In a big enough bath, Saturn would float.' }] },
  { name: 'Uranus',  tex: 'uranus',  kind: 1, tilt: 82,  tiltDeg: '98°',   elev: 10, atmo: [0.55, 0.92, 0.95, 0.6], km: '2,867M km', mkm: 2867,   accent: '#7FE5E0', diameter: '51,118 km',  day: '17.2 hours',  year: '84 years',    moons: '28',  temp: '−195 °C',   r: 0.358,
    facts: [
      { title: 'Sideways', text: 'Tilted about 98°, it rolls around the Sun on its side.', at: { type: 'axis' } },
      { title: 'Polar days', text: 'Each pole gets about 42 years of continuous sunlight, then 42 years of darkness.', at: { type: 'axis' } },
      { title: 'Coldest atmosphere', text: '−224 °C, colder than farther-out Neptune.' }] },
  { name: 'Neptune', tex: 'neptune', kind: 1, tilt: 28,  tiltDeg: '28°',   elev: 8,  atmo: [0.35, 0.5, 1.0, 0.7],   km: '4,495M km', mkm: 4495.1, accent: '#4F7CFF', diameter: '49,528 km',  day: '16.1 hours',  year: '164.8 years', moons: '16',  temp: '−200 °C',   r: 0.346,
    facts: [
      { title: 'Winds', text: 'Winds here pass 2,000 km/h, the fastest measured on any planet.' },
      { title: 'One lap', text: 'Predicted by maths before anyone saw it in 1846, it has made just one orbit since: in 2011.' }] }
];
