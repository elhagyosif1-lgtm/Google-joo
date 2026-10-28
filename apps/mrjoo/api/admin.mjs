import { sb, env, move, configured, weekId, COIN_PRICE } from './_lib/core.mjs';
import { prices, equity } from './_lib/market.mjs';

const json = (res, code, o) => res.status(code).json(o);
// إغلاق الأسبوع: آمن للتكرار. كل مستخدم بياخد الجايزة مرة واحدة فقط (نتحقق من الـ ledger قبل الصرف)
async function paidAlready(uid, kind) {
  const { data } = await sb.from('ledger').select('id').eq('user_id', uid).eq('kind', kind).limit(1);
  return !!(data && data.length);
}
async function weeklyClose() {
  const { data: pool } = await sb.from('pool').select('*').eq('id', 1).single();
  const fund = +pool.weekly_fund_egp; const week = weekId();
  const out = { week, fund, creators: 0, winners: [], skipped: 0 };
  if (fund > 0) {
    const creatorsPart = +(fund * 0.7).toFixed(2), prizePart = +(fund * 0.3).toFixed(2);
    const { data: ps } = await sb.from('profiles').select('id,points').gt('points', 0);
    const total = (ps || []).reduce((t, p) => t + p.points, 0);
    for (const p of ps || []) {
      const kind = 'creator_fund:' + week;
      if (await paidAlready(p.id, kind)) { out.skipped++; continue; }
      const share = +(creatorsPart * p.points / total).toFixed(2);
      if (share > 0) { await move(p.id, { cash: share, kind }); out.creators++; }
    }
    const px = prices();
    const { data: accs } = await sb.from('trade_accounts').select('user_id,cash,positions').eq('season', week).limit(2000);
    const top = (accs || []).map(a => ({ id: a.user_id, eq: equity(a, px) })).filter(a => a.eq > 10000).sort((a, b) => b.eq - a.eq).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      if (!top[i]) continue;
      const kind = 'trade_prize:' + week;
      const prize = +(prizePart * [0.5, 0.3, 0.2][i]).toFixed(2);
      out.winners.push({ id: top[i].id, eq: top[i].eq, prize });
      if (!(await paidAlready(top[i].id, kind))) await move(top[i].id, { cash: prize, kind });
    }
    // الصندوق يتصفر وتتصفر النقاط بعد الصرف فقط
    await sb.from('profiles').update({ points: 0 }).gt('points', 0);
    await sb.from('pool').update({ weekly_fund_egp: 0 }).eq('id', 1);
  }
  return out;
}

export default async function handler(req, res) {
  try {
    if (!configured()) return json(res, 503, { ok: false, error: 'backend_not_configured' });
    const isCron = req.headers.authorization === `Bearer ${env('CRON_SECRET', '\u0000')}`;
    const isAdmin = env('ADMIN_KEY') && req.headers['x-admin-key'] === env('ADMIN_KEY');
    if (!isCron && !isAdmin) return json(res, 401, { ok: false, error: 'unauthorized' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = req.query.action || body.action;

    if (req.method === 'GET' && action === 'weekly_close') return json(res, 200, { ok: true, ...(await weeklyClose()) });
    if (!isAdmin) return json(res, 401, { ok: false, error: 'unauthorized' });

    if (req.method === 'GET') {
      const [d, w, p] = await Promise.all([
        sb.from('deposits').select('*,profiles(username)').eq('status', 'pending').order('created_at'),
        sb.from('withdrawals').select('*,profiles(username)').eq('status', 'pending').order('created_at'),
        sb.from('pool').select('*').eq('id', 1).single(),
      ]);
      return json(res, 200, { ok: true, deposits: d.data, withdrawals: w.data, pool: p.data, vodafone: env('VODAFONE_CASH_NUMBER') });
    }
    if (action === 'deposit') { // تأكيد استلام الفلوس على رقمك → شحن العملات المدفوعة
      const newStatus = body.approve ? 'approved' : 'rejected';
      // نحجز الطلب ذرّيًا: لو اتضغط مرتين، الثانية هترجع null ومفيش شحن مكرر
      const { data: d } = await sb.from('deposits').update({ status: newStatus, decided_at: new Date().toISOString() })
        .eq('id', body.id).eq('status', 'pending').select('*').maybeSingle();
      if (!d) return json(res, 404, { ok: false, error: 'not_found' });
      if (body.approve) {
        try { await move(d.user_id, { paid: d.coins, kind: 'deposit', ref: d.tx_ref }); }
        catch (e) { // لو الشحن فشل نرجّع الطلب pending عشان ما يضيعش
          await sb.from('deposits').update({ status: 'pending', decided_at: null }).eq('id', d.id);
          throw e;
        }
      }
      return json(res, 200, { ok: true });
    }
    if (action === 'withdrawal') { // approve = أنت حولت فعلاً من فودافون كاش؛ reject = يرجع الرصيد
      const newStatus = body.approve ? 'paid' : 'rejected';
      const { data: w } = await sb.from('withdrawals').update({ status: newStatus, note: String(body.note || '').slice(0, 120), decided_at: new Date().toISOString() })
        .eq('id', body.id).eq('status', 'pending').select('*').maybeSingle();
      if (!w) return json(res, 404, { ok: false, error: 'not_found' });
      if (!body.approve) {
        try { await move(w.user_id, { cash: +w.amount_egp, kind: 'withdraw_refund' }); }
        catch (e) { await sb.from('withdrawals').update({ status: 'pending', decided_at: null }).eq('id', w.id); throw e; }
      }
      return json(res, 200, { ok: true });
    }
    if (action === 'revenue') { // سجّل إيراد إعلانات حقيقي وصلك؛ نسبة منه تدخل صندوق المبدعين الأسبوعي
      const amt = +body.amount; const pct = Math.min(Math.max(+body.fund_pct || 0.4, 0), 1);
      if (!(amt > 0)) return json(res, 400, { ok: false, error: 'bad_amount' });
      const { data: p } = await sb.from('pool').select('*').eq('id', 1).single();
      await sb.from('pool').update({ ad_revenue_egp: +p.ad_revenue_egp + amt, weekly_fund_egp: +(+p.weekly_fund_egp + amt * pct).toFixed(2) }).eq('id', 1);
      return json(res, 200, { ok: true });
    }
    if (action === 'weekly_close') return json(res, 200, { ok: true, ...(await weeklyClose()) });
    json(res, 400, { ok: false, error: 'unknown_action' });
  } catch (e) { console.error(e); json(res, 500, { ok: false, error: 'server_error' }); }
}
