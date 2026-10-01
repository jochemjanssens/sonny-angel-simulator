import { useEffect, useReducer } from 'react'
import { DAILY_ALLOWANCE, FIGURE_BY_ID, STARTING_WALLET, sellPrice } from '../data/collections'

const STORAGE_KEY = 'sonny-angel-sim-v1'

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const round = (n) => Math.round(n * 100) / 100

const initialState = {
  wallet: STARTING_WALLET,
  lastClaim: null,
  inventory: {}, // figureId -> count
  firstSeen: {}, // figureId -> timestamp, for "recently added" ordering
  stats: { opened: 0, spent: 0, earned: 0, secrets: 0 },
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState
  } catch {
    return initialState
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'CLAIM_DAILY': {
      const today = todayKey()
      if (state.lastClaim === today) return state
      return { ...state, wallet: round(state.wallet + DAILY_ALLOWANCE), lastClaim: today }
    }
    case 'BUY': {
      const { figure, price } = action
      if (state.wallet < price) return state
      const count = state.inventory[figure.id] || 0
      return {
        ...state,
        wallet: round(state.wallet - price),
        inventory: { ...state.inventory, [figure.id]: count + 1 },
        firstSeen: count ? state.firstSeen : { ...state.firstSeen, [figure.id]: Date.now() },
        stats: {
          ...state.stats,
          opened: state.stats.opened + 1,
          spent: round(state.stats.spent + price),
          secrets: state.stats.secrets + (figure.secret ? 1 : 0),
        },
      }
    }
    case 'SELL': {
      // By default only duplicates are sold; includeLast also lets the final copy go.
      const { figureId, qty, includeLast = false } = action
      const count = state.inventory[figureId] || 0
      const n = Math.min(qty, includeLast ? count : count - 1)
      if (n <= 0) return state
      const earned = round(sellPrice(FIGURE_BY_ID[figureId]) * n)
      return {
        ...state,
        wallet: round(state.wallet + earned),
        inventory: { ...state.inventory, [figureId]: count - n },
        stats: { ...state.stats, earned: round(state.stats.earned + earned) },
      }
    }
    case 'SELL_ALL_DUPES': {
      let earned = 0
      const inventory = { ...state.inventory }
      for (const [id, count] of Object.entries(inventory)) {
        if (count > 1) {
          earned += sellPrice(FIGURE_BY_ID[id]) * (count - 1)
          inventory[id] = 1
        }
      }
      earned = round(earned)
      return {
        ...state,
        wallet: round(state.wallet + earned),
        inventory,
        stats: { ...state.stats, earned: round(state.stats.earned + earned) },
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable — play continues in memory */
    }
  }, [state])

  return [state, dispatch]
}
