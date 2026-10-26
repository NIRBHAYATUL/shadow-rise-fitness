// Cross-account isolation test against the live project (public publishable key only). Run: node scripts/rls-test.mjs
const U = 'https://ahokjyjxucccbfzgpwmc.supabase.co', K = 'sb_publishable_xoxbWJHEcUJ6o76dpV3-EQ_CkznWUHF'
const S = Math.random().toString(36).slice(2, 8)
const j = async (path, o = {}, tok) => { const r = await fetch(U + path, { ...o, headers: { apikey: K, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) } }); let b = null; try { b = await r.json() } catch {} return { s: r.status, b } }
const su = n => j('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: `qa_${n}_${S}@players.shadowrise.example`, password: 'Test-pass-' + S + '-xyz' }) })
let fail = 0; const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) fail++ }
const A = (await su('a')).b, B = (await su('b')).b
ok('both signups return a session', !!A.access_token && !!B.access_token)
const ins = (u, t, uid, av) => j('/rest/v1/player_state', { method: 'POST', body: JSON.stringify({ user_id: uid, avatar: av }) }, t)
ok('A inserts own row', (await ins(0, A.access_token, A.user.id, 'sung')).s === 201)
ok('B inserts own row', (await ins(0, B.access_token, B.user.id, 'b')).s === 201)
const rb = await j('/rest/v1/player_state?select=user_id', {}, B.access_token)
ok('B sees only own row', rb.b.length === 1 && rb.b[0].user_id === B.user.id)
ok('B cannot insert row for A', (await ins(0, B.access_token, A.user.id, 'x')).s === 403)
const up = await j(`/rest/v1/player_state?user_id=eq.${A.user.id}`, { method: 'PATCH', body: JSON.stringify({ avatar: 'hack' }) }, B.access_token)
ok('B cannot update A', Array.isArray(up.b) && up.b.length === 0)
await j(`/rest/v1/player_state?user_id=eq.${A.user.id}`, { method: 'DELETE' }, B.access_token)
const ra = await j('/rest/v1/player_state?select=avatar', {}, A.access_token)
ok('A row intact after B attacks', ra.b.length === 1 && ra.b[0].avatar === 'sung')
ok('anonymous cannot read', (await j('/rest/v1/player_state?select=user_id')).s >= 400)
const l1 = await j('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: `none_${S}@players.shadowrise.example`, password: 'bad-pass-1234' }) })
const l2 = await j('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: `qa_a_${S}@players.shadowrise.example`, password: 'bad-pass-1234' }) })
ok('login errors identical for unknown user and wrong password', l1.s === 400 && l1.b.msg === l2.b.msg)
const rf = await j('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: A.refresh_token }) })
ok('session refresh works', !!rf.b.access_token)
console.log(fail ? 'FAILED' : 'ALL PASS'); process.exit(fail ? 1 : 0)
