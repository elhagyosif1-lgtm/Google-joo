import { route, ok, fail, sb, env } from './_lib/core.mjs';
import { backupInteraction } from './_lib/db.mjs';
const CATS = ['general', 'info', 'lessons', 'nature', 'animals', 'tech', 'skills', 'funny'];
const CF = () => env('CF_ACCOUNT_ID') && env('CF_STREAM_TOKEN') && env('CF_STREAM_DOMAIN');
export default route({
  GET: async ({ res, q }) => {
    const { data } = await sb.from('comments').select('id,body,created_at,profiles(username,display_name)').eq('video_id', String(q.video)).order('created_at', { ascending: false }).limit(50);
    ok(res, { comments: data || [] });
  },
  POST: async ({ res, u, profile, body }) => {
    const { action } = body;
    if (action === 'view') { await sb.rpc('bump_video', { p_video: body.video, p_views: 1 }); return ok(res); }
    if (action === 'like') {
      const { data } = await sb.rpc('toggle_like', { p_video: body.video, p_user: u.id });
      return ok(res, { liked: data?.liked, likes: data?.likes });
    }
    if (action === 'follow') {
      if (body.user === u.id) return fail(res, 400, 'self');
      const { data } = await sb.rpc('toggle_follow', { p_a: u.id, p_b: body.user });
      return ok(res, { following: data });
    }
    if (action === 'comment') {
      const text = String(body.body || '').trim().slice(0, 300);
      if (!text) return fail(res, 400, 'empty');
      const { error } = await sb.from('comments').insert({ video_id: body.video, user_id: u.id, body: text });
      if (error) return fail(res, 400, 'bad_video');
      await sb.rpc('bump_video', { p_video: body.video, p_comments: 1 });
      await backupInteraction(u.id, 'comment', { video: body.video, body: text });
      return ok(res);
    }
    if (action === 'sign' && CF()) { // فيديو ضخم: الرفع مباشرة من الهاتف إلى Cloudflare Stream (ترميز HLS تلقائي)، لا يمر على موقعك
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env('CF_ACCOUNT_ID')}/stream/direct_upload`, { method: 'POST', headers: { authorization: 'Bearer ' + env('CF_STREAM_TOKEN'), 'content-type': 'application/json' }, body: JSON.stringify({ maxDurationSeconds: 180, creator: u.id }) }).then(x => x.json()).catch(() => null);
      if (!r?.success) return fail(res, 500, 'sign_failed');
      return ok(res, { provider: 'cf', uploadURL: r.result.uploadURL, uid: r.result.uid });
    }
    if (action === 'sign') { // رابط رفع مباشر لفيديو (حد أقصى 60 ث / 50MB يتحقق منه العميل + حدود Supabase)
      const ext = (String(body.ext || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 5)) || 'mp4';
      const path = `${u.id}/${Date.now()}.${ext}`;
      const { data, error } = await sb.storage.from('videos').createSignedUploadUrl(path);
      if (error) return fail(res, 500, 'sign_failed');
      return ok(res, { signedUrl: data.signedUrl, path });
    }
    if (action === 'publish' && body.uid) {
      if (!CF() || !/^[a-f0-9]{32}$/.test(body.uid)) return fail(res, 400, 'bad_path');
      const base = `https://${env('CF_STREAM_DOMAIN')}/${body.uid}`;
      const { data, error } = await sb.from('videos').insert({ user_id: u.id, caption: String(body.caption || '').slice(0, 200), video_url: base + '/manifest/video.m3u8', thumb_url: base + '/thumbnails/thumbnail.jpg', duration: +body.duration || 0, category: CATS.includes(body.category) ? body.category : 'general' }).select('id').single();
      return error ? fail(res, 500, 'publish_failed') : ok(res, { id: data.id });
    }
    if (action === 'publish') {
      if (!String(body.path || '').startsWith(u.id + '/')) return fail(res, 403, 'bad_path');
      const url = `${env('SUPABASE_URL')}/storage/v1/object/public/videos/${body.path}`;
      const { data, error } = await sb.from('videos').insert({ user_id: u.id, caption: String(body.caption || '').slice(0, 200), video_url: url, duration: +body.duration || 0, category: CATS.includes(body.category) ? body.category : 'general' }).select('id').single();
      if (error) return fail(res, 500, 'publish_failed');
      return ok(res, { id: data.id });
    }
    fail(res, 400, 'unknown_action');
  },
});
