import { route, ok, fail, sb, GIFTS, CREATOR_SHARE, COIN_PRICE } from '../_lib/core.mjs';
import { backupInteraction } from '../_lib/db.mjs';
export default route({
  POST: async ({ res, u, body }) => {
    const g = GIFTS[body.gift];
    if (!g) return fail(res, 400, 'bad_gift');
    const n = Math.min(Math.max(parseInt(body.count) || 1, 1), 99);
    const coins = g.coins * n;
    let recipient = body.to, video = body.video || null;
    if (video) {
      const { data: v } = await sb.from('videos').select('user_id').eq('id', video).maybeSingle();
      if (!v) return fail(res, 404, 'video_not_found');
      recipient = v.user_id;
    }
    if (!recipient || recipient === u.id) return fail(res, 400, 'bad_recipient');
    // العملات المدفوعة فقط تتحول لنقود للمبدع (الشحن الحقيقي يموّلها). العملات المجانية تتحول لنقاط تدخل في صندوق المبدعين الأسبوعي.
    const { data, error } = await sb.rpc('send_gift', {
      p_sender: u.id, p_recipient: recipient, p_coins: coins, p_gift: body.gift,
      p_video: video, p_live: body.live || null, p_cash_per_paid: +(COIN_PRICE * CREATOR_SHARE).toFixed(4),
    });
    if (error) return fail(res, /insufficient/i.test(error.message) ? 402 : 500, /insufficient/i.test(error.message) ? 'insufficient' : 'server_error');
    await backupInteraction(u.id, 'gift', {
      gift: body.gift,
      count: n,
      coins,
      recipient,
      video,
      live: body.live || null,
    });
    ok(res, data);
  },
});
