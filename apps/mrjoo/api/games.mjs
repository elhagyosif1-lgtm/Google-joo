import { route, ok, fail, sb, move, dayStart } from './_lib/core.mjs';
// مكافآت تتحقق منها السيرفر: مدة دنيا، سقف نتيجة، سقف يومي. العملات هنا "مجانية" (bonus) للإنفاق على الهدايا.
const GAMES = {
  tap:    { minSec: 19, maxScore: 190, reward: s => Math.min(Math.floor(s / 3), 25) },
  memory: { minSec: 12, maxScore: 100, reward: s => Math.min(Math.floor(s / 10), 10) },
  watch:  { minSec: 14, maxScore: 1,   reward: () => 2 },
};
const DAILY_COINS = 250, DAILY_RUNS = 60;
export default route({
  GET: async ({ res, u }) => {
    const { data } = await sb.from('game_runs').select('reward,game').eq('user_id', u.id).gte('started_at', dayStart());
    const earned = (data || []).reduce((t, r) => t + (r.reward || 0), 0);
    ok(res, { earned, cap: DAILY_COINS, runs: data?.length || 0 });
  },
  POST: async ({ res, u, body }) => {
    const g = GAMES[body.game];
    if (body.action === 'start') {
      if (!g) return fail(res, 400, 'bad_game');
      const { data: today } = await sb.from('game_runs').select('reward,ref').eq('user_id', u.id).gte('started_at', dayStart());
      if ((today?.length || 0) >= DAILY_RUNS) return ok(res, { capped: true });
      if (body.game === 'watch' && today.some(r => r.ref === body.ref)) return ok(res, { capped: true, dup: true });
      if ((today || []).reduce((t, r) => t + (r.reward || 0), 0) >= DAILY_COINS) return ok(res, { capped: true });
      const { data } = await sb.from('game_runs').insert({ user_id: u.id, game: body.game, ref: body.ref || null }).select('id').single();
      return ok(res, { id: data.id });
    }
    if (body.action === 'finish') {
      const { data: run } = await sb.from('game_runs').select('*').eq('id', body.id).eq('user_id', u.id).maybeSingle();
      if (!run || run.finished_at) return fail(res, 400, 'bad_run');
      const G = GAMES[run.game];
      const sec = (Date.now() - new Date(run.started_at)) / 1000;
      const score = Math.max(0, Math.min(parseInt(body.score) || 0, G.maxScore));
      let reward = sec >= G.minSec ? G.reward(score) : 0;
      const { data: today } = await sb.from('game_runs').select('reward').eq('user_id', u.id).gte('started_at', dayStart());
      const left = DAILY_COINS - (today || []).reduce((t, r) => t + (r.reward || 0), 0);
      reward = Math.max(0, Math.min(reward, left));
      await sb.from('game_runs').update({ finished_at: new Date().toISOString(), score, reward }).eq('id', run.id);
      if (reward > 0) await move(u.id, { bonus: reward, kind: 'game:' + run.game, ref: run.id });
      return ok(res, { reward, score });
    }
    fail(res, 400, 'unknown_action');
  },
});
