'use client';
import { useEffect, useState } from 'react';
import { sb } from './lib/sb';

type Any = any;
const C = { ink: '#0B1020', card: '#121a33', sand: '#EFE6CF', teal: '#1FC8B4', gold: '#E9B949' };
const num = (x: number) => (x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'K' : String(x ?? 0));

export default function Profile({ uid, me, say, onClose, onFollow, onOpen }: Any) {
  const [s, setS] = useState<Any>(null), [vids, setVids] = useState<Any[]>([]), [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        sb.rpc('profile_stats', { p_user: uid }),
        sb.from('videos').select('id,poster,views,likes_count').eq('user_id', uid).order('id', { ascending: false }).limit(60),
      ]);
      if (a.error) say(a.error.message);
      setS(a.data?.[0] ?? null); setVids(b.data ?? []); setReady(true);
    })();
  }, [uid, say]);
  const toggle = async () => {
    if (!s) return; const was = s.is_following;
    setS({ ...s, is_following: !was, followers: Number(s.followers) + (was ? -1 : 1) }); onFollow(uid, !was);
    const { error } = was ? await sb.from('follows').delete().eq('follower_id', me.id).eq('following_id', uid) : await sb.from('follows').insert({ follower_id: me.id, following_id: uid });
    if (error) { say(error.message); setS(s); onFollow(uid, was); }
  };
  const stat = (n: number, l: string) => <div className="text-center"><b className="block text-lg">{num(Number(n))}</b><small style={{ opacity: 0.7 }}>{l}</small></div>;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.ink, zIndex: 25, overflowY: 'auto' }}>
      <div className="flex justify-end p-3"><button onClick={onClose} aria-label="إغلاق">✕</button></div>
      {ready && !s && <p className="p-6 text-center">الحساب غير موجود.</p>}
      {s && <div className="px-4 pb-6">
        <div className="flex flex-col items-center gap-2">
          {s.avatar_url ? <img src={s.avatar_url} alt="" width={88} height={88} style={{ width: 88, height: 88, borderRadius: 44, objectFit: 'cover' }} />
            : <span style={{ width: 88, height: 88, borderRadius: 44, background: C.teal, color: C.ink, display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 700 }}>{(s.username ?? '?')[0]}</span>}
          <b className="text-xl">@{s.username}</b>
          {s.bio && <p className="text-center text-sm" style={{ opacity: 0.85 }}>{s.bio}</p>}
        </div>
        <div className="my-4 flex justify-around">{stat(s.followers, 'متابِع')}{stat(s.following, 'يتابع')}{stat(s.videos, 'فيديو')}{stat(s.likes, 'إعجاب')}</div>
        {uid !== me.id && <button onClick={toggle} className="mb-4 w-full rounded p-2 font-bold" style={{ background: s.is_following ? C.card : C.teal, color: s.is_following ? C.sand : C.ink }}>{s.is_following ? 'تتابعه ✓' : 'متابعة'}</button>}
        {!vids.length && <p className="text-center" style={{ opacity: 0.7 }}>لا فيديوهات بعد.</p>}
        <div className="grid grid-cols-3 gap-1">
          {vids.map(v => <button key={v.id} onClick={() => onOpen(v.id, s.username)} style={{ position: 'relative', aspectRatio: '9/16', background: C.card, borderRadius: 6, overflow: 'hidden' }}>
            {v.poster ? <img src={v.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, opacity: 0.5 }}>▶</span>}
            <small style={{ position: 'absolute', bottom: 4, left: 6, color: '#fff', textShadow: '0 1px 3px #000' }}>▶ {num(v.views)}</small>
          </button>)}
        </div>
      </div>}
    </div>
  );
}
