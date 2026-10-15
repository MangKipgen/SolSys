// Edit planet facts here. The page rebuilds itself from this list.
// r      = diameter relative to Jupiter (sizes the disc)
// mkm    = mean distance from the Sun in millions of km (places the planet on the distance rail)
// accent = this chapter's highlight color
// ring   = draws a ring (Saturn)
// Planet surfaces are painted in style.css (search "#jupiter .body").
// Source: NASA Planetary Fact Sheets (rotation period, orbital period, mean distance from the Sun).
const PLANETS = [
  { name: 'Mercury', km: '57.9M km',  mkm: 57.9,   accent: '#D9C7A3', diameter: '4,879 km',   day: '1,408 hours', year: '88 days',     moons: '0',   r: 0.034 },
  { name: 'Venus',   km: '108.2M km', mkm: 108.2,  accent: '#F2B94B', diameter: '12,104 km',  day: '5,832 hours', year: '225 days',    moons: '0',   r: 0.085 },
  { name: 'Earth',   km: '149.6M km', mkm: 149.6,  accent: '#3FA7FF', diameter: '12,756 km',  day: '24.0 hours',  year: '365 days',    moons: '1',   r: 0.089 },
  { name: 'Mars',    km: '227.9M km', mkm: 227.9,  accent: '#FF5A36', diameter: '6,792 km',   day: '24.6 hours',  year: '687 days',    moons: '2',   r: 0.048 },
  { name: 'Jupiter', km: '778.5M km', mkm: 778.5,  accent: '#F0A04B', diameter: '142,984 km', day: '9.9 hours',   year: '11.9 years',  moons: '95',  r: 1 },
  { name: 'Saturn',  km: '1,432M km', mkm: 1432,   accent: '#E8D08A', diameter: '120,536 km', day: '10.7 hours',  year: '29.4 years',  moons: '146', r: 0.843, ring: true },
  { name: 'Uranus',  km: '2,867M km', mkm: 2867,   accent: '#7FE5E0', diameter: '51,118 km',  day: '17.2 hours',  year: '84 years',    moons: '28',  r: 0.358 },
  { name: 'Neptune', km: '4,495M km', mkm: 4495.1, accent: '#4F7CFF', diameter: '49,528 km',  day: '16.1 hours',  year: '164.8 years', moons: '16',  r: 0.346 }
];
