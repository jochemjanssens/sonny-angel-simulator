// Market values are approximate secondary-market (resale) prices in EUR for
// loose, unboxed figures. Most regulars resell *below* the box price — only
// fan favourites (Rabbit, Strawberry, Cherry Blossom...) and the secrets
// (official odds 1 in 144) are worth more. Each series' average regular value
// stays under its box price, so blind boxes are a gamble, not a sure profit.

export const DAILY_ALLOWANCE = 40.5
export const STARTING_WALLET = 60
export const SELL_RATE = 0.7 // you receive 70% of market value after marketplace fees
export const SECRET_ODDS = 144 // regular series: 1 in 144
export const LIMITED_SECRET_ODDS = 72 // limited 6-figure series: 1 in 72

// f(name, color, accent, hat, value, extra)
const f = (name, color, accent, hat, value, extra = {}) => ({ name, color, accent, hat, value, ...extra })

const RAW_SERIES = [
  {
    id: 'animal1',
    name: 'Animal Series Ver. 1',
    theme: '#F7B6C2',
    price: 12.95,
    tagline: 'The classic line-up that started it all.',
    figures: [
      f('Rabbit', '#FFFFFF', '#F7B6C2', 'longEars', 26),
      f('Mouse', '#C4C8CE', '#F7B6C2', 'roundEars', 9),
      f('Pig', '#F9C1CF', '#F08AA5', 'pointyEars', 8),
      f('Frog', '#8CCB5E', '#FFFFFF', 'roundEars', 9),
      f('Elephant', '#A9B4C2', '#F7B6C2', 'bigEars', 8),
      f('Koala', '#9EA3A8', '#F2F2F2', 'bigEars', 10),
      f('Sheep', '#F7F2E8', '#E8C99A', 'fluffy', 8),
      f('Lion', '#F2B33D', '#C9762B', 'mane', 11),
      f('Monkey', '#A8714A', '#F3D2B3', 'roundEars', 7),
      f('Tiger', '#F7A23B', '#3A2A1E', 'pointyEars', 10, { pattern: 'stripes' }),
      f('Cow', '#FFFFFF', '#3A3A3A', 'horns', 9, { pattern: 'spots' }),
      f('Panda', '#FFFFFF', '#2B2B2B', 'roundEars', 14),
    ],
    secret: f('Robby Angel · Bunny', '#FFE08A', '#FF9EB5', 'longEars', 185, { secret: true }),
  },
  {
    id: 'animal2',
    name: 'Animal Series Ver. 2',
    theme: '#A8D8F0',
    price: 12.95,
    tagline: 'More furry and feathery friends.',
    figures: [
      f('Dalmatian', '#FFFFFF', '#2B2B2B', 'floppyEars', 10, { pattern: 'spots' }),
      f('Penguin', '#34405A', '#FFFFFF', 'tuft', 9),
      f('Calico Cat', '#FFFFFF', '#F2A65A', 'pointyEars', 18, { pattern: 'spots' }),
      f('Fawn', '#C98B5A', '#FFF3E0', 'bigEars', 9, { pattern: 'spots' }),
      f('Toy Poodle', '#C47A4A', '#C47A4A', 'fluffy', 11),
      f('Lesser Panda', '#C8572B', '#FFFFFF', 'pointyEars', 12),
      f('Squirrel', '#B5763E', '#F3D2B3', 'pointyEars', 7),
      f('Sea Otter', '#8B6A50', '#F3D2B3', 'roundEars', 8),
      f('Duck', '#FFE066', '#FF9F2E', 'tuft', 7),
      f('Hedgehog', '#8A6B55', '#5A4434', 'mane', 9),
      f('Horse', '#A0663A', '#3A2A1E', 'pointyEars', 7),
      f('Bear', '#8A5A3B', '#F3D2B3', 'roundEars', 9),
    ],
    secret: f('Robby Angel · Pup', '#FFE08A', '#8EC9F0', 'floppyEars', 165, { secret: true }),
  },
  {
    id: 'fruit',
    name: 'Fruit Series',
    theme: '#FFC27A',
    price: 12.95,
    tagline: 'Juicy, sweet and freshly picked.',
    figures: [
      f('Apple', '#E5343A', '#5DAA48', 'leaf', 9),
      f('Strawberry', '#E83E5A', '#FFF2A8', 'sprout', 24, { pattern: 'seeds' }),
      f('Pineapple', '#F5C542', '#5DAA48', 'sprout', 10),
      f('Orange', '#FF9A2E', '#5DAA48', 'leaf', 7),
      f('Peach', '#FFB3A7', '#5DAA48', 'leaf', 12),
      f('Melon', '#A8D672', '#E7F5D2', 'stem', 8, { pattern: 'net' }),
      f('Kiwi', '#8A6A44', '#9ACD32', 'leaf', 7),
      f('Lemon', '#FFE45C', '#5DAA48', 'leaf', 7),
      f('Cherry', '#C8102E', '#5DAA48', 'stem', 15),
      f('Watermelon', '#3E9B4A', '#1F5E2A', 'stem', 10, { pattern: 'stripes' }),
      f('Grape', '#7B4FA0', '#5DAA48', 'leaf', 8),
      f('Banana', '#FFE066', '#7A5A2A', 'stem', 9),
    ],
    secret: f('Robby Angel · Berry', '#FFE08A', '#E83E5A', 'sprout', 150, { secret: true }),
  },
  {
    id: 'vegetable',
    name: 'Vegetable Series',
    theme: '#B6DE8F',
    price: 12.95,
    tagline: 'Eat your greens (and oranges, and purples).',
    figures: [
      f('Carrot', '#F28C28', '#5DAA48', 'sprout', 10),
      f('Eggplant', '#6B3E8E', '#4C8A3A', 'leaf', 7),
      f('Turnip', '#FFFFFF', '#5DAA48', 'sprout', 7),
      f('Corn', '#F7D046', '#8CC152', 'leaf', 8),
      f('Pumpkin', '#F28C28', '#6B8E23', 'stem', 10),
      f('Broccoli', '#4C9A3B', '#4C9A3B', 'fluffy', 8),
      f('Mushroom', '#D9443A', '#FFFFFF', 'none', 14, { pattern: 'spots' }),
      f('Onion', '#E9C27A', '#8CC152', 'sprout', 6),
      f('Green Pea', '#8CCB5E', '#5DAA48', 'tuft', 6),
      f('Cabbage', '#B7DB8C', '#DFF0C5', 'petals', 6),
      f('Tomato', '#E5343A', '#5DAA48', 'sprout', 8),
      f('Cucumber', '#4E8F3A', '#A8D672', 'stem', 6, { pattern: 'spots' }),
    ],
    secret: f('Robby Angel · Veggie', '#FFE08A', '#F28C28', 'sprout', 140, { secret: true }),
  },
  {
    id: 'marine',
    name: 'Marine Series',
    theme: '#7FD0EC',
    price: 12.95,
    tagline: 'Treasures from under the sea.',
    figures: [
      f('Clownfish', '#FF8C2E', '#FFFFFF', 'fin', 11, { pattern: 'stripes' }),
      f('Octopus', '#F26B6B', '#FFC2C2', 'none', 9, { pattern: 'spots' }),
      f('Dolphin', '#7FB3D5', '#5A92B8', 'fin', 10),
      f('Seahorse', '#F7C04A', '#E39A1E', 'fin', 9),
      f('Crab', '#E5483A', '#B5281C', 'pointyEars', 8),
      f('Shark', '#8EA3B5', '#6D8194', 'fin', 14),
      f('Starfish', '#F5A04A', '#FFD34D', 'star', 8),
      f('Pufferfish', '#F7E07A', '#C9A93D', 'mane', 7),
      f('Whale', '#4D79B5', '#9CC7F0', 'tuft', 10),
      f('Jellyfish', '#E9B5E8', '#F6D9F5', 'tuft', 9),
      f('Seal', '#CFD6DD', '#A9B4C2', 'none', 9),
      f('Sea Turtle', '#6BAF5B', '#4A8A3C', 'none', 10, { pattern: 'spots' }),
    ],
    secret: f('Robby Angel · Mermaid', '#FFE08A', '#7FD0EC', 'fin', 155, { secret: true }),
  },
  {
    id: 'flower',
    name: 'Flower Series',
    theme: '#F9B8D0',
    price: 12.95,
    tagline: 'In full bloom, all year round.',
    figures: [
      f('Rose', '#E0405A', '#B8213B', 'petals', 13),
      f('Sunflower', '#FFC93C', '#8A5A2B', 'petals', 11),
      f('Tulip', '#F2667A', '#F9A5B2', 'petals', 9),
      f('Daisy', '#FFFFFF', '#FFD34D', 'petals', 8),
      f('Lily', '#FFF4E0', '#F7C873', 'petals', 8),
      f('Hydrangea', '#9DB7F2', '#9DB7F2', 'fluffy', 10),
      f('Cherry Blossom', '#F9C6D3', '#F28FA9', 'petals', 28),
      f('Morning Glory', '#6B7FE0', '#FFFFFF', 'petals', 7),
      f('Carnation', '#F28FA9', '#F28FA9', 'fluffy', 7),
      f('Dandelion', '#FFE066', '#FFE066', 'fluffy', 7),
      f('Lavender', '#B39DDB', '#7E57C2', 'sprout', 9),
      f('Pansy', '#8A6FD1', '#FFD34D', 'petals', 7),
    ],
    secret: f('Robby Angel · Blossom', '#FFE08A', '#F9C6D3', 'petals', 160, { secret: true }),
  },
  {
    id: 'sweets',
    name: 'Sweets Series',
    theme: '#F8D49B',
    price: 12.95,
    tagline: 'A little treat for every day of the week.',
    figures: [
      f('Macaron', '#F7B6C2', '#FFF4E0', 'none', 11, { pattern: 'band' }),
      f('Cupcake', '#FFD3E0', '#FFFFFF', 'cream', 10),
      f('Donut', '#E0A060', '#FF9EC4', 'cream', 9, { pattern: 'sprinkles' }),
      f('Ice Cream', '#FFF0D6', '#FFB3C7', 'cream', 10),
      f('Pudding', '#F7D16A', '#7A4A1E', 'cream', 12),
      f('Strawberry Shortcake', '#FFFFFF', '#FFFFFF', 'cream', 20),
      f('Chocolate', '#6B4226', '#4A2C18', 'none', 8, { pattern: 'band' }),
      f('Cookie', '#D9A066', '#5A3A1E', 'none', 7, { pattern: 'spots' }),
      f('Parfait', '#FFE0E8', '#FFFFFF', 'cream', 9),
      f('Croissant', '#E7B062', '#C98A3A', 'none', 8, { pattern: 'stripes' }),
      f('Lollipop', '#FF7EB6', '#FFFFFF', 'stem', 9, { pattern: 'stripes' }),
      f('Candy', '#9AD9F2', '#FFFFFF', 'tuft', 7, { pattern: 'sprinkles' }),
    ],
    secret: f('Robby Angel · Chef', '#FFE08A', '#FFFFFF', 'cream', 170, { secret: true }),
  },
  {
    id: 'christmas',
    name: 'Christmas Series 2025',
    theme: '#E9505F',
    price: 14.95,
    limited: true,
    tagline: 'Limited edition — only 6 figures, double the secret odds.',
    figures: [
      f('Santa Claus', '#D7263D', '#FFFFFF', 'santa', 15),
      f('Reindeer', '#B07A4A', '#7A4A24', 'antlers', 13),
      f('Snowman', '#FFFFFF', '#E5343A', 'santa', 10),
      f('Gingerbread', '#C47A3A', '#FFFFFF', 'roundEars', 11, { pattern: 'sprinkles' }),
      f('Christmas Tree', '#2E8B57', '#FFD34D', 'star', 10, { pattern: 'sprinkles' }),
      f('Polar Bear', '#FFFFFF', '#DDE8F2', 'roundEars', 12),
    ],
    secret: f('Robby Angel · Angel', '#FFE08A', '#D7263D', 'santa', 230, { secret: true }),
  },
  {
    id: 'valentine',
    name: "Valentine's Series 2026",
    theme: '#F48FB1',
    price: 14.95,
    limited: true,
    tagline: 'Limited edition gifts of love — 6 figures.',
    figures: [
      f('Love Rabbit', '#FFD6E2', '#F25C8A', 'longEars', 16),
      f('Teddy Bear', '#C9925F', '#F25C8A', 'roundEars', 12),
      f('Cupid', '#FFFFFF', '#F25C8A', 'heart', 11),
      f('Love Letter', '#FFF4E0', '#E5343A', 'heart', 9),
      f('Rose Bouquet', '#E0405A', '#B8213B', 'petals', 10),
      f('Chocolate Heart', '#6B4226', '#F25C8A', 'heart', 10),
    ],
    secret: f('Robby Angel · Cupid', '#FFE08A', '#F25C8A', 'heart', 210, { secret: true }),
  },
]

export const SERIES = RAW_SERIES.map((s) => {
  const make = (fig, i) => ({
    ...fig,
    id: `${s.id}-${fig.secret ? 'secret' : i}`,
    seriesId: s.id,
    secret: !!fig.secret,
  })
  return {
    ...s,
    odds: s.limited ? LIMITED_SECRET_ODDS : SECRET_ODDS,
    figures: s.figures.map(make),
    secret: make(s.secret),
  }
})

export const SERIES_BY_ID = Object.fromEntries(SERIES.map((s) => [s.id, s]))

export const FIGURES = SERIES.flatMap((s) => [...s.figures, s.secret])
export const FIGURE_BY_ID = Object.fromEntries(FIGURES.map((x) => [x.id, x]))

export function drawFigure(series) {
  if (Math.random() < 1 / series.odds) return series.secret
  return series.figures[Math.floor(Math.random() * series.figures.length)]
}

export const sellPrice = (fig) => Math.round(fig.value * SELL_RATE * 100) / 100

const fmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
export const euro = (n) => fmt.format(n)
