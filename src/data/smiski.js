// Smiski-style series: small glow-in-the-dark figures, each in its own pose
// with a prop. Values are kept so a box is worth a little less than it costs.
// s(name, pose, prop, accent, value, extra)
// poses: stand, sit, hug, lying, stretch, carry, peek
const BODY = '#E2EBC0'
const s = (name, pose, prop, accent, value, extra = {}) => ({ name, color: BODY, accent, pose, prop, value, ...extra })

export const SMISKI_SERIES = [
  {
    id: 'smiski-living',
    brand: 'smiski',
    name: 'Living Series',
    theme: '#CFE3B0',
    price: 11.95,
    tagline: 'Quiet little moments at home.',
    figures: [
      s('Hugging Knees', 'hug', null, '#9BC36B', 12),
      s('Peeking', 'peek', 'wall', '#E9D6BE', 9),
      s('Reading', 'lying', 'book', '#E5343A', 9),
      s('Carrying a Box', 'carry', 'box', '#C9A27A', 8),
      s('Stretching', 'stretch', null, '#9BC36B', 10),
      s('Napping', 'lying', 'pillow', '#9AD9F2', 9),
    ],
    secret: s('Star Catcher', 'stretch', 'star', '#FFD34D', 120, { secret: true }),
  },
  {
    id: 'smiski-bath',
    brand: 'smiski',
    name: 'Bath Series',
    theme: '#BFE3F0',
    price: 11.95,
    tagline: 'Bubbles, towels and a good long soak.',
    figures: [
      s('Towel on Head', 'sit', 'towel', '#FF8FB1', 10),
      s('Rubber Duck', 'sit', 'duck', '#FFD34D', 11),
      s('Scrubbing', 'stand', 'brush', '#7FD0EC', 8),
      s('Bubble Hide', 'peek', 'bubbles', '#BFE7FF', 9),
      s('Drying Off', 'stand', 'towel', '#8CCB5E', 8),
      s('Shampoo', 'carry', 'bottle', '#B39DDB', 9),
    ],
    secret: s('Bath Bomb', 'hug', 'ball', '#FF6F91', 120, { secret: true }),
  },
  {
    id: 'smiski-bed',
    brand: 'smiski',
    name: 'Bed Series',
    theme: '#C9C2EA',
    price: 11.95,
    tagline: 'Time to wind down and dream.',
    figures: [
      s('Sleepy', 'lying', 'pillow', '#B39DDB', 10),
      s('Teddy Hug', 'hug', 'teddy', '#C9A27A', 12),
      s('Under the Blanket', 'peek', 'blanket', '#9AD9F2', 9),
      s('Night Cap', 'sit', 'nightcap', '#6E9BE8', 9),
      s('Yawning', 'stretch', null, '#B39DDB', 8),
      s('Counting Sheep', 'sit', 'sheep', '#FFFFFF', 9),
    ],
    secret: s('Moon Keeper', 'carry', 'moon', '#FFE08A', 120, { secret: true }),
  },
  {
    id: 'smiski-exercise',
    brand: 'smiski',
    name: 'Exercise Series',
    theme: '#F3D9A6',
    price: 11.95,
    tagline: 'Warming up, one tiny rep at a time.',
    figures: [
      s('Lifting Weights', 'carry', 'dumbbell', '#5A5A6E', 10),
      s('Yoga', 'stretch', 'mat', '#FF8FB1', 9),
      s('Push-ups', 'lying', 'mat', '#7FD0EC', 8),
      s('Jump Rope', 'stand', 'rope', '#E5343A', 9),
      s('Hula Hoop', 'stand', 'hoop', '#8CCB5E', 10),
      s('Water Break', 'sit', 'bottle', '#7FD0EC', 8),
    ],
    secret: s('Champion', 'carry', 'trophy', '#F4C430', 120, { secret: true }),
  },
]
