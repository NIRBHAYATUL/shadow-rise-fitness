// Supabase backend. Username login uses a profiles table (unique username) and an
// internal sign-in address derived from a server-side lookup. Not wired until a
// project exists; env values are supplied at build time, never committed.
import { createClient } from '@supabase/supabase-js'
import { Backend, Session, checkCreds } from './store'
import { emptyProgress } from './game'
export function supabaseBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey)
  const alias = (u: string) => `${u.trim().toLowerCase()}@players.shadowrise.example`
  const load = async (username: string): Promise<Session> => {
    const { data, error } = await sb.from('player_state').select('avatar,progress').maybeSingle()
    // A failed read must never look like a new player: the next save would overwrite real progress.
    if (error) throw new Error('Could not load your saved progress. Check your connection and try again.')
    return { username, avatar: data?.avatar ?? null, progress: data?.progress ?? emptyProgress() }
  }
  return {
    async signUp(u, p) {
      const e = checkCreds(u, p); if (e) throw new Error(e)
      const { error } = await sb.auth.signUp({ email: alias(u), password: p, options: { data: { username: u } } })
      if (error) throw new Error(/already/i.test(error.message) ? 'That username is taken. Pick another.' : 'Could not create the account. Try again.')
      // The account exists from here on. If only the first read fails, say so: retrying Create Account would answer "taken".
      try { return await load(u) } catch { throw new Error('Account created. Press Log in to continue.') }
    },
    async signIn(u, p) {
      const { error } = await sb.auth.signInWithPassword({ email: alias(u), password: p })
      if (error) throw new Error('Wrong username or password.')
      return load(u)
    },
    async restore() {
      const { data } = await sb.auth.getSession(); const em = data.session?.user.email
      return em ? load(em.split('@')[0] ?? '') : null
    },
    async signOut() { await sb.auth.signOut() },
    async save(u, patch) {
      const { data: s } = await sb.auth.getUser(); if (!s.user) throw new Error('Not signed in.')
      // Only ever write to the account that started this save; never to whoever is signed in now.
      if (s.user.email !== alias(u)) throw new Error('Account changed before saving.')
      const { error } = await sb.from('player_state').upsert({ user_id: s.user.id, ...patch })
      if (error) throw new Error(error.message)
    },
  }
}
