'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from './lib/sb';
import { rmVideoFiles } from './lib/media';

type Any = any;
import { C } from './lib/theme';
const B = 'rounded px-2 py-1 mx-1 mt-1';

export default function AdminMod({ say }: Any) {
  const [st, setSt] = useState<Any>(null), [rs, setRs] = useState<Any[]>([]), [q, setQ] = useState(''), [us, setUs] = useState<Any[]>([]);
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.rpc('admin_stats'),
      sb.from('reports').select('id,reason,video_id,reporter:profiles!reporter_id(username),videos(id,url,poster,caption,user_id,profiles(username,banned))').order('id', { ascending: false }).limit(200),
    ]);
    if (a.error) say(a.error.message); setSt(a.data ?? null);
    const g = new Map<number, Any>();
    for (const r of (b.data ?? []) as Any[]) { if (!r.videos) continue; const x = g.get(r.video_id) ?? { v: r.videos, rs: [] }; x.rs.push(r); g.set(r.video_id, x); }
    setRs(Array.from(g.values()).sort((x, y) => y.rs.length - x.rs.length));
  }, [say]);
  useEffect(() => { load(); }, [load]);

  const dismiss = async (id: number) => { const { error } = await sb.from('reports').delete().eq('video_id', id); if (error) return say(error.message); load(); };
  const remove = async (v: Any) => {
    if (!confirm('حذف الفيديو نهائيًا من المنصة؟')) return;
    const { error } = await sb.from('videos').delete().eq('id', v.id); if (error) return say(error.message);
    await rmVideoFiles(v); say('تم حذف الفيديو'); load();
  };
  const ban = async (uid: string, banned: boolean) => {
    if (banned && !confirm('حظر هذا المستخدم؟ مش هيقدر ينشر أو يعلّق.')) return;
    const { error } = await sb.rpc('admin_set_ban', { p_user: uid, p_banned: banned }); if (error) return say(error.message);
    say(banned ? 'تم الحظر' : 'تم رفع الحظر'); load(); if (q) find();
  };
  const find = async () => { const { data } = await sb.from('profiles').select('id,username,banned,is_admin').ilike('username', `%${q.trim()}%`).limit(20); setUs(data ?? []); };

  const cell = (n: Any, l: string) => <div className="rounded p-2 text-center" style={{ background: C.card }}><b className="block text-lg">{n ?? '-'}</b><small style={{ opacity: 0.7 }}>{l}</small></div>;
  return (
    <div className="mt-6">
      <h3 className="mb-2 font-bold">نظرة عامة</h3>
      {st && <div className="grid grid-cols-3 gap-2">
        {cell(st.users, 'مستخدمين')}{cell(st.videos, 'فيديوهات')}{cell(st.views, 'مشاهدات')}
        {cell(st.comments, 'تعليقات')}{cell(st.gifts, 'هدايا')}{cell(st.approved_egp + 'ج', 'إيداعات مقبولة')}
        {cell(st.hls_ready, 'HLS جاهز')}{cell(st.hls_waiting, 'بانتظار التحويل')}{cell(st.open_reports, 'بلاغات مفتوحة')}
      </div>}
      <h3 className="mb-2 mt-6 font-bold">البلاغات ({rs.length})</h3>
      {!rs.length && <p>مفيش بلاغات مفتوحة.</p>}
      {rs.map(({ v, rs: list }) => (
        <div key={v.id} className="my-3 rounded p-2" style={{ background: C.card }}>
          <div className="flex gap-2">
            {v.poster ? <img src={v.poster} alt="" width={64} height={96} style={{ width: 64, height: 96, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ width: 64, height: 96, background: '#000', borderRadius: 6 }} />}
            <div className="flex-1 text-sm"><b>@{v.profiles?.username}</b>{v.profiles?.banned && <span style={{ color: '#ff6b6b' }}> · محظور</span>}<p>{v.caption || '(بدون وصف)'}</p><b style={{ color: C.gold }}>{list.length} بلاغ</b></div>
          </div>
          <ul className="my-2 list-disc pr-5 text-xs" style={{ opacity: 0.85 }}>{list.slice(0, 5).map((r: Any) => <li key={r.id}>{r.reason} <span style={{ opacity: 0.6 }}>— @{r.reporter?.username}</span></li>)}</ul>
          <a href={v.url} target="_blank" rel="noreferrer" className={B} style={{ background: C.ink, display: 'inline-block' }}>مشاهدة</a>
          <button className={B} style={{ background: '#b33' }} onClick={() => remove(v)}>حذف الفيديو</button>
          <button className={B} style={{ background: '#7a2' }} onClick={() => ban(v.user_id, !v.profiles?.banned)}>{v.profiles?.banned ? 'رفع الحظر' : 'حظر الناشر'}</button>
          <button className={B} style={{ background: C.teal, color: C.ink }} onClick={() => dismiss(v.id)}>تجاهل البلاغات</button>
        </div>
      ))}
      <h3 className="mb-2 mt-6 font-bold">بحث عن مستخدم</h3>
      <div className="flex gap-2"><input className="flex-1 rounded p-2 text-black" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && find()} placeholder="اسم المستخدم" /><button onClick={find} style={{ color: C.teal }}>بحث</button></div>
      {us.map(u => <div key={u.id} className="my-2 flex items-center justify-between rounded p-2" style={{ background: C.card }}>
        <span>@{u.username}{u.is_admin && ' (أدمن)'}{u.banned && <span style={{ color: '#ff6b6b' }}> · محظور</span>}</span>
        {!u.is_admin && <button className={B} style={{ background: u.banned ? C.teal : '#b33', color: u.banned ? C.ink : '#fff' }} onClick={() => ban(u.id, !u.banned)}>{u.banned ? 'رفع الحظر' : 'حظر'}</button>}
      </div>)}
    </div>
  );
}
