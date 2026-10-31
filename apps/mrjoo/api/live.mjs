import crypto from 'node:crypto';
import { route, ok, fail, sb, env } from './_lib/core.mjs';
// بث مباشر: السيرفر يصدر توكنات LiveKit (WebRTC). الدردشة والهدايا الحية تمر عبر data channel.
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function token(room, identity, name, publish) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const pay = b64({ iss: env('LIVEKIT_API_KEY'), sub: identity, name, nbf: now, exp: now + 4 * 3600,
    video: { room, roomJoin: true, canPublish: publish, canSubscribe: true, canPublishData: true } });
  const sig = crypto.createHmac('sha256', env('LIVEKIT_API_SECRET')).update(`${head}.${pay}`).digest('base64url');
  return `${head}.${pay}.${sig}`;
}
export default route({
  GET: async ({ res, u, profile, q }) => {
    if (q.room) {
      if (!env('LIVEKIT_URL')) return fail(res, 503, 'live_not_configured');
      return ok(res, { url: env('LIVEKIT_URL'), token: token(q.room, u.id, profile.username, false) });
    }
    const { data } = await sb.from('lives').select('id,title,room,started_at,user_id,profiles(username,display_name)').eq('status', 'live').order('started_at', { ascending: false }).limit(20);
    ok(res, { lives: data || [] });
  },
  POST: async ({ res, u, profile, body }) => {
    if (body.action === 'end') {
      await sb.from('lives').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('user_id', u.id).eq('status', 'live');
      return ok(res);
    }
    if (!env('LIVEKIT_URL')) return fail(res, 503, 'live_not_configured');
    await sb.from('lives').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('user_id', u.id).eq('status', 'live');
    const { data, error } = await sb.from('lives').insert({ user_id: u.id, title: String(body.title || 'بث مباشر').slice(0, 80), room: 'r_' + crypto.randomBytes(6).toString('hex') }).select('id,room').single();
    if (error) return fail(res, 500, 'server_error');
    ok(res, { id: data.id, room: data.room, url: env('LIVEKIT_URL'), token: token(data.room, u.id, profile.username, true) });
  },
});
