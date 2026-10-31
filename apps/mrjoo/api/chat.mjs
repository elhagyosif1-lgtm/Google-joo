import { route, ok, fail, sb } from './_lib/core.mjs';
// دردشة فردية وجماعية (استعلام دوري كل ٣ ثواني — بديل مجاني عن Realtime) + الأصدقاء = متابعة متبادلة
const member = async (conv, uid) => !!(await sb.from('conv_members').select('user_id').eq('conv_id', conv).eq('user_id', uid).maybeSingle()).data;
const byName = async names => (await sb.from('profiles').select('id,username,display_name').in('username', names)).data || [];
export default route({
  GET: async ({ res, u, q }) => {
    if (q.friends) {
      const [{ data: a }, { data: b }] = await Promise.all([sb.from('follows').select('followee_id').eq('follower_id', u.id), sb.from('follows').select('follower_id').eq('followee_id', u.id)]);
      const mine = new Set((a || []).map(x => x.followee_id)), ids = (b || []).map(x => x.follower_id).filter(i => mine.has(i));
      const { data } = ids.length ? await sb.from('profiles').select('id,username,display_name').in('id', ids) : { data: [] };
      return ok(res, { friends: data || [] });
    }
    if (q.conv) {
      if (!(await member(q.conv, u.id))) return fail(res, 403, 'forbidden');
      const { data } = await sb.from('messages').select('id,body,user_id,created_at,profiles(username,display_name)').eq('conv_id', q.conv).gt('id', +q.after || 0).order('id', { ascending: false }).limit(50);
      return ok(res, { messages: (data || []).reverse() });
    }
    const { data: mine } = await sb.from('conv_members').select('conv_id').eq('user_id', u.id);
    const ids = (mine || []).map(x => x.conv_id); if (!ids.length) return ok(res, { convs: [] });
    const [{ data: cs }, { data: ms }] = await Promise.all([
      sb.from('convs').select('id,title,is_group,conv_members(user_id,profiles(username,display_name))').in('id', ids),
      sb.from('messages').select('conv_id,body,id').in('conv_id', ids).order('id', { ascending: false }).limit(200)]);
    const last = {}; (ms || []).forEach(m => { last[m.conv_id] ??= m; });
    const convs = (cs || []).map(c => ({ id: c.id, is_group: c.is_group, last: last[c.id]?.body || '', lid: last[c.id]?.id || 0,
      title: c.is_group ? c.title : (c.conv_members.find(m => m.user_id !== u.id)?.profiles?.display_name || '؟') })).sort((a, b) => b.lid - a.lid);
    ok(res, { convs });
  },
  POST: async ({ res, u, body }) => {
    if (body.action === 'dm') {
      const [t] = await byName([String(body.username || '').toLowerCase()]); if (!t || t.id === u.id) return fail(res, 404, 'not_found');
      const key = [u.id, t.id].sort().join(':');
      let { data: c } = await sb.from('convs').select('id').eq('dm_key', key).maybeSingle();
      if (!c) { ({ data: c } = await sb.from('convs').insert({ dm_key: key, created_by: u.id }).select('id').single()); await sb.from('conv_members').insert([{ conv_id: c.id, user_id: u.id }, { conv_id: c.id, user_id: t.id }]); }
      return ok(res, { id: c.id, title: t.display_name || t.username });
    }
    if (body.action === 'group') {
      const us = await byName((body.usernames || []).slice(0, 49).map(x => String(x).toLowerCase())); const title = String(body.title || 'مجموعة').slice(0, 40);
      const { data: c } = await sb.from('convs').insert({ title, is_group: true, created_by: u.id }).select('id').single();
      await sb.from('conv_members').insert([...new Set([u.id, ...us.map(x => x.id)])].map(id => ({ conv_id: c.id, user_id: id })));
      return ok(res, { id: c.id, title });
    }
    if (body.action === 'send') {
      const text = String(body.body || '').trim().slice(0, 500); if (!text) return fail(res, 400, 'empty');
      if (!(await member(body.conv, u.id))) return fail(res, 403, 'forbidden');
      const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', u.id).gt('created_at', new Date(Date.now() - 60000).toISOString());
      if (count >= 20) return fail(res, 429, 'busy');
      await sb.from('messages').insert({ conv_id: body.conv, user_id: u.id, body: text });
      return ok(res);
    }
    fail(res, 400, 'unknown_action');
  },
});
