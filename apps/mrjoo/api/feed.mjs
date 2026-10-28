import { route, ok, sb } from './_lib/core.mjs';
// ترتيب خفيف: تفاعل (مع وزن للهدايا) ÷ عمر الفيديو، مع حدّ للتنويع
const score = v => {
  const hrs = (Date.now() - new Date(v.created_at)) / 36e5;
  return (v.likes * 3 + v.comments * 4 + v.gifts_coins * 0.5 + v.views * 0.2 + 2) / Math.pow(hrs + 2, 1.15);
};
export default route({
  GET: async ({ res, q, u }) => {
    let query = sb.from('videos').select('id,user_id,caption,video_url,thumb_url,views,likes,comments,gifts_coins,created_at,profiles(username,display_name,avatar_url)').order('created_at', { ascending: false }).limit(60);
    if (q.cat && q.cat !== 'general') query = query.eq('category', String(q.cat));
    if (q.tab === 'following' && u) {
      const { data: f } = await sb.from('follows').select('followee_id').eq('follower_id', u.id);
      query = query.in('user_id', (f || []).map(x => x.followee_id).concat(['00000000-0000-0000-0000-000000000000']));
    }
    const { data: vids } = await query;
    let list = (vids || []).sort((a, b) => score(b) - score(a)).slice(0, 30);
    if (u && list.length) {
      const ids = list.map(v => v.id);
      const [{ data: l }, { data: f }] = await Promise.all([
        sb.from('likes').select('video_id').eq('user_id', u.id).in('video_id', ids),
        sb.from('follows').select('followee_id').eq('follower_id', u.id),
      ]);
      const L = new Set((l || []).map(x => x.video_id)), F = new Set((f || []).map(x => x.followee_id));
      list = list.map(v => ({ ...v, liked: L.has(v.id), following: F.has(v.user_id) }));
    }
    res.setHeader('Cache-Control', 'private, max-age=10');
    ok(res, { feed: list });
  },
}, { auth: () => false });
