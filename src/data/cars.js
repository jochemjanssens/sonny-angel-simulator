// Turbo Minis: small die-cast style race cars in blind boxes. Every car has
// four stats from 1 to 10 that decide how well it does on each track.
// c(name, body, color, accent, value, [speed, accel, grip, weight], extra)
// bodies: sports, muscle, retro, truck, buggy, van, f1, rocket
// patterns: flames, stripes, checker, number
const c = (name, body, color, accent, value, [speed, accel, grip, weight], extra = {}) => ({
  name,
  body,
  color,
  accent,
  value,
  stats: { speed, accel, grip, weight },
  ...extra,
})

export const CAR_SERIES = [
  {
    id: 'cars-street',
    brand: 'cars',
    name: 'Street Racers',
    theme: '#FF8A3D',
    price: 11.95,
    tagline: 'Fast, flashy and ready to roll.',
    figures: [
      c('Red Rocket', 'sports', '#E5343A', '#FFD34D', 13, [8, 7, 6, 4], { pattern: 'flames' }),
      c('Blue Bolt', 'sports', '#2F6FDB', '#FFFFFF', 9, [7, 7, 6, 4], { pattern: 'stripes' }),
      c('Night Shadow', 'sports', '#2B2B33', '#7FD0EC', 11, [8, 6, 7, 5], { pattern: 'stripes' }),
      c('Lime Flash', 'sports', '#8CCB5E', '#2B2B33', 8, [6, 8, 6, 3], { pattern: 'checker' }),
      c('Muscle Max', 'muscle', '#F28A2E', '#2B2B33', 10, [9, 6, 4, 7], { pattern: 'stripes' }),
      c('Taxi Turbo', 'muscle', '#FFD34D', '#2B2B33', 7, [6, 6, 6, 6], { pattern: 'checker' }),
      c('Retro Bubble', 'retro', '#7FD0EC', '#FFFFFF', 8, [4, 6, 7, 4]),
      c('Pink Cruiser', 'retro', '#FF8FB1', '#FFFFFF', 9, [5, 5, 7, 4], { pattern: 'flames' }),
    ],
    secret: c('Golden Comet', 'sports', '#FFE08A', '#E5343A', 150, [10, 9, 8, 4], { pattern: 'flames', secret: true }),
  },
  {
    id: 'cars-offroad',
    brand: 'cars',
    name: 'Off-Road Series',
    theme: '#C99A6B',
    price: 11.95,
    tagline: 'Mud, rocks and monster-sized wheels.',
    figures: [
      c('Mud Monster', 'truck', '#6B8E23', '#FFD34D', 11, [5, 6, 9, 9], { pattern: 'flames' }),
      c('Big Foot', 'truck', '#E5343A', '#FFFFFF', 12, [5, 5, 8, 10], { pattern: 'stripes' }),
      c('Dune Buggy', 'buggy', '#FFA94D', '#2B2B33', 9, [6, 8, 8, 3]),
      c('Rock Crawler', 'truck', '#4D79B5', '#FFD34D', 8, [4, 5, 10, 8]),
      c('Safari Jeep', 'buggy', '#C9A27A', '#5A4632', 8, [5, 6, 8, 5], { pattern: 'stripes' }),
      c('Snow Plough', 'van', '#F4F6F8', '#E5343A', 7, [3, 4, 9, 9], { pattern: 'stripes' }),
      c('Desert Rally', 'buggy', '#F4C430', '#E5343A', 9, [7, 7, 7, 4], { pattern: 'number' }),
      c('Swamp Thing', 'truck', '#2E8B57', '#B6E36A', 8, [4, 5, 9, 9]),
    ],
    secret: c('Golden Crusher', 'truck', '#FFE08A', '#2B2B33', 150, [7, 7, 10, 10], { pattern: 'flames', secret: true }),
  },
  {
    id: 'cars-raceday',
    brand: 'cars',
    name: 'Race Day Series',
    theme: '#F05454',
    price: 11.95,
    tagline: 'Pit stop, green light, full throttle!',
    figures: [
      c('Formula Red', 'f1', '#E5343A', '#FFFFFF', 14, [10, 9, 8, 2], { pattern: 'number' }),
      c('Formula Blue', 'f1', '#2F6FDB', '#FFD34D', 11, [9, 9, 8, 2], { pattern: 'number' }),
      c('Formula Green', 'f1', '#2E8B57', '#FFD34D', 10, [9, 8, 9, 2], { pattern: 'number' }),
      c('Le Mans Silver', 'sports', '#C4C8CE', '#E5343A', 10, [9, 7, 8, 4], { pattern: 'number' }),
      c('Rally Champ', 'sports', '#FFFFFF', '#2F6FDB', 8, [7, 8, 8, 4], { pattern: 'stripes' }),
      c('Drag King', 'muscle', '#2B2B33', '#FF6A00', 11, [10, 10, 3, 6], { pattern: 'flames' }),
      c('Pace Car', 'muscle', '#FFD34D', '#2B2B33', 7, [7, 6, 6, 6], { pattern: 'checker' }),
      c('Kart Kid', 'buggy', '#FF8FB1', '#FFFFFF', 8, [5, 9, 7, 2], { pattern: 'number' }),
    ],
    secret: c('Rocket Racer', 'rocket', '#FFE08A', '#FF6A00', 160, [10, 10, 6, 3], { pattern: 'flames', secret: true }),
  },
  {
    id: 'cars-city',
    brand: 'cars',
    name: 'City Series',
    theme: '#7FD0EC',
    price: 11.95,
    tagline: 'Everyday heroes on tiny wheels.',
    figures: [
      c('Fire Truck', 'van', '#E5343A', '#FFD34D', 10, [5, 5, 6, 9], { pattern: 'stripes' }),
      c('Police Car', 'muscle', '#2B2B33', '#FFFFFF', 10, [8, 7, 7, 6], { pattern: 'stripes' }),
      c('Ambulance', 'van', '#FFFFFF', '#E5343A', 8, [6, 6, 6, 8], { pattern: 'stripes' }),
      c('Ice Cream Van', 'van', '#FFC2D4', '#7FD0EC', 11, [3, 4, 6, 8], { pattern: 'checker' }),
      c('School Bus', 'van', '#FFD34D', '#2B2B33', 8, [3, 3, 6, 10], { pattern: 'stripes' }),
      c('Garbage Truck', 'van', '#8CCB5E', '#4D4D4D', 7, [3, 4, 7, 10]),
      c('Pizza Delivery', 'retro', '#F28A2E', '#FFFFFF', 8, [5, 7, 7, 2], { pattern: 'checker' }),
      c('Mail Van', 'van', '#4D79B5', '#FFD34D', 7, [4, 5, 6, 7], { pattern: 'stripes' }),
    ],
    secret: c('Golden Limo', 'muscle', '#FFE08A', '#2B2B33', 150, [8, 6, 8, 7], { pattern: 'stripes', secret: true }),
  },
]

// The tracks you drive yourself (the layouts are in race/trackGeometry.js). The
// weights only mark which stats matter most on each track.
export const TRACKS = [
  {
    id: 'drag',
    name: 'Drag Strip',
    icon: '🏁',
    text: 'A wide, fast oval: top speed and a quick start win.',
    weights: { speed: 0.5, accel: 0.5, grip: 0, weight: 0 },
    risk: null,
  },
  {
    id: 'canyon',
    name: 'Canyon Curves',
    icon: '⛰️',
    text: 'Narrow bends between canyon walls. Grip is king.',
    weights: { speed: 0.15, accel: 0.3, grip: 0.55, weight: 0 },
    risk: null,
  },
]
export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]))
