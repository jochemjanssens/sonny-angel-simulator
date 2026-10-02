import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const LISTING_FIELDS = 'id, figure_id, price, status, created_at, seller_id, sold_price, seller:profiles!listings_seller_id_fkey(username)'

// Market listings plus every negotiation the player takes part in.
export function useMarket(userId) {
  const [active, setActive] = useState([])
  const [mine, setMine] = useState([])
  const [offers, setOffers] = useState([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const [a, m, o] = await Promise.all([
      supabase.from('listings').select(LISTING_FIELDS).eq('status', 'active').order('created_at', { ascending: false }).limit(300),
      supabase.from('listings').select(LISTING_FIELDS).eq('seller_id', userId).order('created_at', { ascending: false }).limit(60),
      // row level security only returns offers where we are the buyer or the seller
      supabase
        .from('offers')
        .select(`id, listing_id, buyer_id, amount, proposed_by, status, created_at, buyer:profiles(username), listing:listings(${LISTING_FIELDS})`)
        .order('created_at', { ascending: true })
        .limit(1000),
    ])
    if (!a.error) setActive(a.data)
    if (!m.error) setMine(m.data)
    if (!o.error) setOffers(o.data)
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    refresh()
    const channel = supabase
      .channel('market')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, refresh)
      .subscribe()
    // safety net in case a live update is missed
    const poll = setInterval(refresh, 20_000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  // Group offers into negotiations: one per (listing, buyer), newest offer last.
  const threads = useMemo(() => {
    const map = new Map()
    for (const o of offers) {
      const key = `${o.listing_id}:${o.buyer_id}`
      if (!map.has(key)) map.set(key, { key, listing: o.listing, buyerId: o.buyer_id, buyer: o.buyer?.username, offers: [] })
      map.get(key).offers.push(o)
    }
    return [...map.values()].map((t) => {
      const latest = t.offers[t.offers.length - 1]
      const role = t.buyerId === userId ? 'buyer' : 'seller'
      const open = latest.status === 'pending' && t.listing?.status === 'active'
      return { ...t, latest, role, open, myTurn: open && latest.proposed_by !== role }
    })
  }, [offers, userId])

  const buying = threads.filter((t) => t.role === 'buyer')
  const selling = threads.filter((t) => t.role === 'seller')
  const actionCount = threads.filter((t) => t.myTurn).length
  const listedFigureIds = useMemo(() => new Set(mine.filter((l) => l.status === 'active').map((l) => l.figure_id)), [mine])

  return { userId, active, mine, buying, selling, actionCount, listedFigureIds, loaded, refresh }
}
