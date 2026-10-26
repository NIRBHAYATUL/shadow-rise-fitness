// Storage interface. Real accounts use Supabase (server-saved, per-user). There is no local password store. Passwords never touch our code
// except being passed to the auth service.
import { Progress, validUsername, validPassword } from './game'
export interface Session { username: string; avatar: string | null; progress: Progress }
export interface Backend {
  signUp(username: string, password: string): Promise<Session>
  signIn(username: string, password: string): Promise<Session>
  save(username: string, patch: { avatar?: string; progress?: Progress }): Promise<void>
}
export function checkCreds(u: string, p: string): string | null {
  if (!validUsername(u)) return 'Username: 3-20 letters, numbers or underscore.'
  if (!validPassword(p)) return 'Password: 8 to 72 characters.'
  return null
}
