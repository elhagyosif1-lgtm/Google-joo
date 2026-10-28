import { route, ok, fail, sb, weekId } from './_lib/core.mjs';
import { ASSETS, prices, equity } from './_lib/market.mjs';
const START = 10000, FEE = 0.001;
async function account(uid) {
  const season = weekId();
  const { data } = await sb.from('trade_accounts').select('*').eq('user_id', uid).eq('season', season).maybeSingle();
  if (data) return data;
  const { data: n } = await sb.from('trade_accounts').insert({ user_id: uid, season, cash: START, positions: {} }).select().single();
  return n || (await sb.from('trade_accounts').select('*').eq('user_id', uid).eq('season', season).single()).data;
}
export default route({
  GET: async ({ res, u, q }) => {
    const px = prices();
    const acc = await account(u.id);
    const out = { prices: px, assets: Object.fromEntries(Object.entries(ASSETS).map(([k, v]) => [k, v.name])), account: { cash: +acc.cash, positions: acc.positions, equity: equity(acc, px) }, season: weekId(), start: START };
    if (q.board) {
      const { data } = await sb.from('trade_accounts').select('user_id,cash,positions,profiles(username)').eq('season', weekId()).limit(500);
      out.board = (data || []).map(a => ({ user: a.profiles?.username, equity: +equity(a, px).toFixed(2), me: a.user_id === u.id })).sort((a, b) => b.equity - a.equity).slice(0, 10);
    }
    ok(res, out);
  },
  POST: async ({ res, u, body }) => {
    const sym = body.sym; if (!ASSETS[sym]) return fail(res, 400, 'bad_asset');
    const qty = +body.qty; if (!(qty > 0) || qty > 1e9) return fail(res, 400, 'bad_qty');
    for (let attempt = 0; attempt < 3; attempt++) {
      const acc = await account(u.id); const px = prices()[sym];
      const pos = { ...(acc.positions || {}) }; let cash = +acc.cash;
      if (body.side === 'buy') {
        const cost = qty * px * (1 + FEE); if (cost > cash + 1e-9) return fail(res, 400, 'no_cash');
        cash -= cost; pos[sym] = (pos[sym] || 0) + qty;
      } else {
        if ((pos[sym] || 0) + 1e-9 < qty) return fail(res, 400, 'no_position');
        cash += qty * px * (1 - FEE); pos[sym] = Math.max(0, (pos[sym] || 0) - qty); if (pos[sym] < 1e-9) delete pos[sym];
      }
      const { data } = await sb.from('trade_accounts').update({ cash, positions: pos, version: acc.version + 1 }).eq('user_id', u.id).eq('season', acc.season).eq('version', acc.version).select('cash,positions');
      if (data?.length) { await sb.from('ledger').insert({ user_id: u.id, kind: 'trade', ref: sym }); return ok(res, { price: px, account: { cash: +data[0].cash, positions: data[0].positions, equity: equity(data[0]) } }); }
    }
    fail(res, 409, 'busy');
  },
});
