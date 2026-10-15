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
// Maps: tex/<tex>.jpg (see tex.js; re-run tools/make_tex_js.py after changing any).
// Source for facts: NASA Planetary Fact Sheets (rotation period, orbital period, mean distance from the Sun, gravity, temperature, mass).
const SUN_DIAMETER = { km: '1,392,700 km', r: 9.74 };
const PLANETS = [
  { name: 'Mercury', tex: 'mercury', kind: 0, tilt: 2,   tiltDeg: '0.03°', elev: 8,  atmo: [0, 0, 0, 0],            km: '57.9M km',  mkm: 57.9,   accent: '#D9C7A3', diameter: '4,879 km',   day: '1,408 hours', year: '88 days',     moons: '0',   temp: '167 °C',   r: 0.034,
    tidbit: 'A year here lasts 88 days, but sunrise to sunrise takes 176.',
    record: 'The widest temperature swing of any planet: about 430 °C by day, −180 °C by night.' },
  { name: 'Venus',   tex: 'venus',   kind: 3, tilt: 3,   tiltDeg: '177°',  elev: 6,  atmo: [1.0, 0.82, 0.5, 0.7],   km: '108.2M km', mkm: 108.2,  accent: '#F2B94B', diameter: '12,104 km',  day: '5,832 hours', year: '225 days',    moons: '0',   temp: '464 °C',   r: 0.085, retro: true,
    tidbit: 'It spins backwards, and slowly enough that one Venus day outlasts one Venus year.',
    record: 'The hottest planet, hotter than Mercury, under air pressure about 92 times Earth’s.' },
  { name: 'Earth',   tex: 'earth',   kind: 2, tilt: 23,  tiltDeg: '23°',   elev: 14, atmo: [0.35, 0.62, 1.0, 1.0],  km: '149.6M km', mkm: 149.6,  accent: '#3FA7FF', diameter: '12,756 km',  day: '24.0 hours',  year: '365 days',    moons: '1',   temp: '15 °C',         r: 0.089,
    tidbit: 'The only world we know of with liquid water standing on its surface.',
    record: 'The densest planet in the solar system, at 5.51 g/cm³.' },
  { name: 'Mars',    tex: 'mars',    kind: 0, tilt: 25,  tiltDeg: '25°',   elev: 10, atmo: [1.0, 0.6, 0.4, 0.35],   km: '227.9M km', mkm: 227.9,  accent: '#FF5A36', diameter: '6,792 km',   day: '24.6 hours',  year: '687 days',    moons: '2',   temp: '−65 °C',   r: 0.048,
    tidbit: 'Olympus Mons rises about 22 km above the plains, the tallest volcano known in the solar system.',
    record: 'Its dust storms can wrap the whole planet for weeks.' },
  { name: 'Jupiter', tex: 'jupiter', kind: 1, tilt: 3,   tiltDeg: '3°',    elev: 4,  atmo: [1.0, 0.86, 0.66, 0.3],  km: '778.5M km', mkm: 778.5,  accent: '#F0A04B', diameter: '142,984 km', day: '9.9 hours',   year: '11.9 years',  moons: '95',  temp: '−110 °C',   r: 1,
    tidbit: 'The Great Red Spot is a storm wider than Earth, watched for well over a century.',
    record: 'More than twice the mass of all the other planets put together.' },
  { name: 'Saturn',  tex: 'saturn',  kind: 1, tilt: -26, tiltDeg: '27°',   elev: 20, atmo: [1.0, 0.92, 0.65, 0.25], km: '1,432M km', mkm: 1432,   accent: '#E8D08A', diameter: '120,536 km', day: '10.7 hours',  year: '29.4 years',  moons: '146', temp: '−140 °C',     r: 0.843, ring: true,
    tidbit: 'Its average density is lower than water’s. In a big enough bath, Saturn would float.',
    record: 'The rings reach out some 280,000 km, yet are mostly about 10 metres thick.' },
  { name: 'Uranus',  tex: 'uranus',  kind: 1, tilt: 82,  tiltDeg: '98°',   elev: 10, atmo: [0.55, 0.92, 0.95, 0.6], km: '2,867M km', mkm: 2867,   accent: '#7FE5E0', diameter: '51,118 km',  day: '17.2 hours',  year: '84 years',    moons: '28',  temp: '−195 °C',   r: 0.358,
    tidbit: 'Tilted about 98°, it rolls around the Sun on its side.',
    record: 'The coldest atmosphere measured on any planet: −224 °C, colder than farther-out Neptune.' },
  { name: 'Neptune', tex: 'neptune', kind: 1, tilt: 28,  tiltDeg: '28°',   elev: 8,  atmo: [0.35, 0.5, 1.0, 0.7],   km: '4,495M km', mkm: 4495.1, accent: '#4F7CFF', diameter: '49,528 km',  day: '16.1 hours',  year: '164.8 years', moons: '16',  temp: '−200 °C',   r: 0.346,
    tidbit: 'Winds here pass 2,000 km/h, the fastest measured on any planet.',
    record: 'Predicted by maths before anyone saw it in 1846, it has made just one orbit since: in 2011.' }
];
