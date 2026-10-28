import { route, ok, fail, sb, move, vfOk, COIN_PRICE, MIN_WITHDRAW } from './_lib/core.mjs';
export default route({
  GET: async ({ res, u }) => {
    const [l, d, w] = await Promise.all([
      sb.from('ledger').select('kind,paid,bonus,cash,created_at').eq('user_id', u.id).order('id', { ascending: false }).limit(30),
      sb.from('deposits').select('amount_egp,coins,status,created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10),
      sb.from('withdrawals').select('amount_egp,status,note,created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10),
    ]);
    ok(res, { ledger: l.data || [], deposits: d.data || [], withdrawals: w.data || [] });
  },
  POST: async ({ res, u, body }) => {
    if (body.action === 'deposit') { // المستخدم حوّل لرقم فودافون كاش الخاص بك ثم يرسل رقم العملية
      const amount = +body.amount_egp;
      if (!(amount >= 10 && amount <= 5000)) return fail(res, 400, 'bad_amount');
      if (!vfOk(body.vf_number)) return fail(res, 400, 'bad_number');
      const ref = String(body.tx_ref || '').trim().slice(0, 40);
      if (ref.length < 6) return fail(res, 400, 'bad_ref');
      const { count } = await sb.from('deposits').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'pending');
      if ((count || 0) >= 3) return fail(res, 429, 'too_many_pending');
      const { error } = await sb.from('deposits').insert({ user_id: u.id, amount_egp: amount, coins: Math.round(amount / COIN_PRICE), vf_number: body.vf_number, tx_ref: ref });
      return error ? fail(res, 409, 'ref_used') : ok(res);
    }
    if (body.action === 'withdraw') {
      const amount = +body.amount_egp;
      if (!(amount >= MIN_WITHDRAW)) return fail(res, 400, 'below_min');
      if (!vfOk(body.vf_number)) return fail(res, 400, 'bad_number');
      await move(u.id, { cash: -amount, kind: 'withdraw' }); // يخصم فورًا (يرفض لو الرصيد ناقص)
      const { error } = await sb.from('withdrawals').insert({ user_id: u.id, amount_egp: amount, vf_number: body.vf_number });
      if (error) { await move(u.id, { cash: amount, kind: 'withdraw_refund' }); return fail(res, 500, 'server_error'); }
      return ok(res);
    }
    fail(res, 400, 'unknown_action');
  },
});
