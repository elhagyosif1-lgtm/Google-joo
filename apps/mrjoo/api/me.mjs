import { route, ok, fail, sb } from './_lib/core.mjs';
const pub = p => ({ id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, bio: p.bio, followers: p.followers });
export default route({
  GET: async ({ res, profile, q }) => {
    if (q.u) {
      const { data } = await sb.from('profiles').select('*').eq('username', String(q.u)).maybeSingle();
      if (!data) return fail(res, 404, 'not_found');
      const { data: vids } = await sb.from('videos').select('id,caption,video_url,views,likes').eq('user_id', data.id).order('created_at', { ascending: false }).limit(30);
      return ok(res, { profile: pub(data), videos: vids || [] });
    }
    const { data: vids } = await sb.from('videos').select('id,caption,video_url,views,likes,comments,gifts_coins').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30);
    ok(res, { me: { ...pub(profile), paid: profile.paid_coins, bonus: profile.bonus_coins, cash: +profile.cash_egp, points: profile.points }, videos: vids || [] });
  },
  POST: async ({ res, profile, body }) => {
    const patch = {};
    if (body.username) {
      if (!/^[a-z0-9_]{3,20}$/.test(body.username)) return fail(res, 400, 'bad_username');
      patch.username = body.username;
    }
    if (body.display_name) patch.display_name = String(body.display_name).slice(0, 40);
    if (body.bio !== undefined) patch.bio = String(body.bio).slice(0, 160);
    const { error } = await sb.from('profiles').update(patch).eq('id', profile.id);
    if (error) return fail(res, 409, 'username_taken');
    ok(res);
  },
});
