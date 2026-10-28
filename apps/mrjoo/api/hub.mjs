import { route, ok, fail, sb, move, weekId, weekStart, dayStart } from './_lib/core.mjs';
// تحديات تتبدّل كل أسبوع: يُختار 3 من 8 بناءً على رقم الأسبوع. التقدم يُحسب من السيرفر نفسه.
const POOL = [
  { id: 'watch20', t: 'شاهد ٢٠ فيديو لنهايته', goal: 20, reward: 40 },
  { id: 'play10',  t: 'العب ١٠ جولات ألعاب',   goal: 10, reward: 40 },
  { id: 'gift3',   t: 'ابعت ٣ هدايا',           goal: 3,  reward: 30 },
  { id: 'post2',   t: 'انشر فيديوهين',          goal: 2,  reward: 60 },
  { id: 'comment10', t: 'اكتب ١٠ تعليقات',      goal: 10, reward: 30 },
  { id: 'like30',  t: 'حط ٣٠ لايك',             goal: 30, reward: 20 },
  { id: 'trade5',  t: 'نفّذ ٥ صفقات تداول تجريبي', goal: 5, reward: 30 },
  { id: 'follow5', t: 'تابع ٥ مبدعين',          goal: 5,  reward: 25 },
];
const pick = w => { let h = 0; for (const c of w) h = (h * 31 + c.charCodeAt(0)) >>> 0; const a = [...POOL]; const out = []; while (out.length < 3) out.push(a.splice(h % a.length, 1)[0]), h = Math.floor(h / 7) + 13; return out; };
const cnt = async (uid, table, col, since, extra = q => q, tcol = 'created_at') => {
  const { count } = await extra(sb.from(table).select('*', { count: 'exact', head: true }).eq(col, uid).gte(tcol, since));
  return count || 0;
};
async function progress(uid) {
  const ws = weekStart();
  const [watch, play, gift, post, comment, like, follow, trade] = await Promise.all([
    cnt(uid, 'game_runs', 'user_id', ws, q => q.eq('game', 'watch').not('finished_at', 'is', null), 'started_at'),
    cnt(uid, 'game_runs', 'user_id', ws, q => q.neq('game', 'watch').not('finished_at', 'is', null), 'started_at'),
    cnt(uid, 'gifts', 'sender_id', ws), cnt(uid, 'videos', 'user_id', ws), cnt(uid, 'comments', 'user_id', ws),
    cnt(uid, 'likes', 'user_id', ws), cnt(uid, 'follows', 'follower_id', ws),
    cnt(uid, 'ledger', 'user_id', ws, q => q.eq('kind', 'trade')),
  ]);
  return { watch20: watch, play10: play, gift3: gift, post2: post, comment10: comment, like30: like, trade5: trade, follow5: follow };
}
export default route({
  GET: async ({ res, u, profile }) => {
    const w = weekId(); const pr = await progress(u.id);
    const { data: claimed } = await sb.from('ledger').select('kind').eq('user_id', u.id).like('kind', `challenge:%:${w}`);
    const done = new Set((claimed || []).map(x => x.kind.split(':')[1]));
    const { data: days } = await sb.from('ledger').select('created_at').eq('user_id', u.id).eq('kind', 'checkin').order('created_at', { ascending: false }).limit(30);
    let streak = 0, cur = new Date(); cur.setUTCHours(0, 0, 0, 0);
    const set = new Set((days || []).map(d => new Date(d.created_at).toISOString().slice(0, 10)));
    if (!set.has(cur.toISOString().slice(0, 10))) cur.setUTCDate(cur.getUTCDate() - 1);
    while (set.has(cur.toISOString().slice(0, 10))) { streak++; cur.setUTCDate(cur.getUTCDate() - 1); }
    const { data: pool } = await sb.from('pool').select('weekly_fund_egp').eq('id', 1).maybeSingle();
    const { data: tot } = await sb.from('profiles').select('points').gt('points', 0);
    const all = (tot || []).reduce((t, x) => t + x.points, 0);
    const { data: v } = await sb.from('videos').select('views,likes,comments,gifts_coins').eq('user_id', u.id);
    const stats = (v || []).reduce((a, x) => ({ views: a.views + x.views, likes: a.likes + x.likes, comments: a.comments + x.comments, gifts: a.gifts + x.gifts_coins }), { views: 0, likes: 0, comments: 0, gifts: 0 });
    const fund = +(pool?.weekly_fund_egp || 0);
    ok(res, { week: w, streak, checkedIn: set.has(new Date().toISOString().slice(0, 10)),
      challenges: pick(w).map(c => ({ ...c, progress: Math.min(pr[c.id], c.goal), claimed: done.has(c.id) })),
      stats, points: profile.points, fund, estShare: all ? +(fund * 0.7 * profile.points / all).toFixed(2) : 0 });
  },
  POST: async ({ res, u, body }) => {
    const w = weekId();
    if (body.action === 'checkin') {
      const { count } = await sb.from('ledger').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('kind', 'checkin').gte('created_at', dayStart());
      if (count) return fail(res, 409, 'already');
      const { data: days } = await sb.from('ledger').select('created_at').eq('user_id', u.id).eq('kind', 'checkin').order('created_at', { ascending: false }).limit(7);
      const y = new Date(); y.setUTCDate(y.getUTCDate() - 1);
      const streak = days?.length && new Date(days[0].created_at).toISOString().slice(0, 10) === y.toISOString().slice(0, 10) ? Math.min(days.length + 1, 7) : 1;
      const reward = 5 * streak;
      await move(u.id, { bonus: reward, kind: 'checkin' });
      return ok(res, { reward, streak });
    }
    if (body.action === 'claim') {
      const c = pick(w).find(x => x.id === body.id); if (!c) return fail(res, 400, 'bad_challenge');
      const pr = await progress(u.id); if (pr[c.id] < c.goal) return fail(res, 400, 'not_done');
      const kind = `challenge:${c.id}:${w}`;
      const { count } = await sb.from('ledger').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('kind', kind);
      if (count) return fail(res, 409, 'already');
      await move(u.id, { bonus: c.reward, kind });
      return ok(res, { reward: c.reward });
    }
    fail(res, 400, 'unknown_action');
  },
});
