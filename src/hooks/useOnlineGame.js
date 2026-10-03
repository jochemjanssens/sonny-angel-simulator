import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Daily allowance resets at midnight UTC (same clock as the server).
export const utcTodayKey = () => new Date().toISOString().slice(0, 10)

// The signed-in player's budget, stats and shelf, kept live from Supabase.
export function useOnlineGame(userId) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const [player, inv, profile] = await Promise.all([
      supabase.from('players').select('*').eq('id', userId).single(),
      supabase.from('inventory').select('figure_id, count, first_seen').eq('user_id', userId),
      supabase.from('profiles').select('username').eq('id', userId).single(),
    ])
    const err = player.error || inv.error || profile.error
    if (err) return setError(err.message)
    const p = player.data
    const inventory = {}
    const firstSeen = {}
    for (const row of inv.data) {
      inventory[row.figure_id] = row.count
      firstSeen[row.figure_id] = row.first_seen
    }
    setError(null)
    setState({
      username: profile.data.username,
      wallet: Number(p.wallet),
      lastClaim: p.last_claim,
      imported: p.imported,
      welcomeBonus: p.welcome_bonus,
      inventory,
      firstSeen,
      stats: {
        opened: p.opened,
        spent: Number(p.spent),
        earned: Number(p.earned),
        secrets: p.secrets,
        puzzles: p.puzzles ?? 0,
        puzzleEarned: Number(p.puzzle_earned ?? 0),
      },
    })
  }, [userId])

  useEffect(() => {
    // make sure this account has its player rows, then load
    supabase.rpc('ensure_player').then(refresh)
    // trades by other players change our budget and shelf, so listen for them
    const channel = supabase
      .channel(`player-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  return { state, error, refresh }
}
