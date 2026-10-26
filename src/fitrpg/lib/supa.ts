// Supabase backend. Username login uses a profiles table (unique username) and an
// internal sign-in address derived from a server-side lookup. Not wired until a
// project exists; env values are supplied at build time, never committed.
import { createClient } from '@supabase/supabase-js'
import { Backend, Session, checkCreds } from './store'
import { emptyProgress } from './game'
export function supabaseBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey)
  const alias = (u: string) => `${u}@players.invalid`
  const load = async (username: string): Promise<Session> => {
    const { data } = await sb.from('player_state').select('avatar,progress').single()
    return { username, avatar: data?.avatar ?? null, progress: data?.progress ?? emptyProgress() }
  }
  return {
    async signUp(u, p) {
      const e = checkCreds(u, p); if (e) throw new Error(e)
      const { error } = await sb.auth.signUp({ email: alias(u), password: p, options: { data: { username: u } } })
      if (error) throw new Error(error.message)
      return load(u)
    },
    async signIn(u, p) {
      const { error } = await sb.auth.signInWithPassword({ email: alias(u), password: p })
      if (error) throw new Error('Wrong username or password.')
      return load(u)
    },
    async save(_u, patch) {
      const { data: s } = await sb.auth.getUser(); if (!s.user) throw new Error('Not signed in.')
      const { error } = await sb.from('player_state').upsert({ user_id: s.user.id, ...patch })
      if (error) throw new Error(error.message)
    },
  }
}
