'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './lib/sb';
import { put, frame, pub, rmVideoFiles } from './lib/media';
import Profile from './Profile';

type Any = any;
import { C } from './lib/theme';
const MAX_MB = 50, MAX_SEC = 180, PAGE = 8;
const seen = new Set<number>();
const num = (x: number) => (x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'K' : String(x ?? 0));
const Caption = ({ t, onTag }: Any) => (
  <>{String(t ?? '').split(/(#[\p{L}\p{N}_]+)/u).map((p, i) => p.startsWith('#')
    ? <button key={i} onClick={() => onTag(p)} style={{ color: C.teal }}>{p}</button> : <span key={i}>{p}</span>)}</>
);

export default function FeedPro({ me, say }: Any) {
  const [mode, setMode] = useState('hot'), [q, setQ] = useState(''), [dq, setDq] = useState(''), [showQ, setShowQ] = useState(false);
  const [vs, setVs] = useState<Any[]>([]), [act, setAct] = useState(0), [muted, setMuted] = useState(true), [done, setDone] = useState(false), [loading, setLoading] = useState(true);
  const [cm, setCm] = useState<Any>(null), [up, setUp] = useState(false), [bell, setBell] = useState(false);
  const [prof, setProf] = useState<string | null>(null), [focus, setFocus] = useState<Any>(null), deep = useRef(true);
  const box = useRef<HTMLDivElement>(null), busy = useRef(false), off = useRef(0);
  useEffect(() => { const t = setTimeout(() => setDq(q), 350); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (reset: boolean) => {
    if (busy.current) return; busy.current = true; setLoading(true);
    const { data, error } = await sb.rpc('feed_videos_v2', { p_mode: focus ? 'new' : mode, p_q: dq || null, p_limit: PAGE, p_offset: reset ? 0 : off.current, p_user: focus?.uid ?? null });
    if (error) say(error.message);
    const got: Any[] = data ?? []; let rows = got;
    if (reset) {
      off.current = got.length;
      const id = focus ? focus.startId : deep.current ? Number(new URLSearchParams(location.search).get('v')) : 0;
      deep.current = false;
      if (id && !dq && (focus || mode !== 'following')) {
        const { data: one } = await sb.rpc('feed_videos_v2', { p_mode: 'new', p_limit: 1, p_id: id });
        if (one?.[0]) rows = [one[0], ...got.filter((r: Any) => r.id !== id)];
      }
    } else off.current += got.length;
    setDone(got.length < PAGE);
    setVs(p => (reset ? rows : [...p, ...rows.filter(r => !p.some(x => x.id === r.id))]));
    if (reset) { setAct(0); box.current?.scrollTo({ top: 0 }); }
    busy.current = false; setLoading(false);
  }, [mode, dq, focus, say]);
  useEffect(() => { load(true); }, [load]);

  const onScroll = () => {
    const el = box.current; if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== act) setAct(i);
    if (i >= vs.length - 3 && !done) load(false);
  };
  const patch = (id: number, f: (v: Any) => Any) => setVs(p => p.map(v => (v.id === id ? f(v) : v)));

  const h = {
    mute: () => setMuted(m => !m),
    profile: (v: Any) => setProf(v.user_id),
    tag: (t: string) => { setQ(t); setShowQ(true); },
    comments: (v: Any) => setCm(v),
    like: async (v: Any) => {
      patch(v.id, x => ({ ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) }));
      const { error } = v.liked ? await sb.from('video_likes').delete().eq('video_id', v.id).eq('user_id', me.id) : await sb.from('video_likes').insert({ video_id: v.id, user_id: me.id });
      if (error) { say(error.message); patch(v.id, x => ({ ...x, liked: v.liked, likes_count: v.likes_count })); }
    },
    follow: async (v: Any) => {
      if (v.user_id === me.id) return;
      const was = v.following, set = (f: boolean) => setVs(p => p.map(x => (x.user_id === v.user_id ? { ...x, following: f } : x)));
      set(!was);
      const { error } = was ? await sb.from('follows').delete().eq('follower_id', me.id).eq('following_id', v.user_id) : await sb.from('follows').insert({ follower_id: me.id, following_id: v.user_id });
      if (error) { say(error.message); set(was); }
    },
    share: async (v: Any) => {
      const url = `${location.origin}${location.pathname}?v=${v.id}`;
      try { if (navigator.share) await navigator.share({ title: `@${v.username} على Jo1`, text: v.caption, url }); else { await navigator.clipboard.writeText(url); say('تم نسخ الرابط'); } } catch {}
    },
    report: async (v: Any) => {
      const r = prompt('سبب البلاغ (محتوى مسيء، عنف، سبام...)'); if (!r?.trim()) return;
      const { error } = await sb.from('reports').insert({ video_id: v.id, reporter_id: me.id, reason: r.trim().slice(0, 200) });
      say(error ? (error.message.includes('duplicate') ? 'بلّغت عن الفيديو ده قبل كده' : error.message) : 'وصل بلاغك، شكرًا');
    },
    del: async (v: Any) => {
      if (!confirm('حذف الفيديو نهائيًا؟')) return;
      const { error } = await sb.from('videos').delete().eq('id', v.id); if (error) return say(error.message);
      await rmVideoFiles(v);
      setVs(p => p.filter(x => x.id !== v.id));
    },
  };

  const tabs: [string, string][] = [['hot', 'لك'], ['following', 'أتابعهم'], ['new', 'الجديد']];
  return (
    <div style={{ position: 'relative' }}>
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex gap-3">{tabs.map(([k, t]) => <button key={k} onClick={() => setMode(k)} style={{ color: mode === k ? C.teal : C.sand, fontWeight: mode === k ? 700 : 400 }}>{t}</button>)}</div>
        <div className="flex items-center gap-3">
          <button aria-label="بحث" onClick={() => setShowQ(s => !s)}>🔍</button>
          <Bell me={me} open={bell} setOpen={setBell} />
          <button onClick={() => setUp(true)} className="rounded px-3 py-1 font-bold" style={{ background: C.teal, color: C.ink }}>＋ نشر</button>
        </div>
      </div>
      {focus && <div className="flex items-center justify-between px-3 pb-2"><b>فيديوهات @{focus.name}</b><button onClick={() => setFocus(null)} style={{ color: C.teal }}>رجوع ✕</button></div>}
      {showQ && <input autoFocus className="mx-3 mb-2 w-[calc(100%-1.5rem)] rounded p-2 text-black" placeholder="ابحث في الوصف أو #هاشتاج" value={q} onChange={e => setQ(e.target.value)} />}
      <div ref={box} onScroll={onScroll} style={{ height: 'calc(100dvh - 170px)', overflowY: 'scroll', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}>
        {vs.map((v, i) => <Clip key={v.id} v={v} i={i} act={act} muted={muted} me={me} h={h} />)}
        {!vs.length && !loading && <p className="p-6 text-center">{mode === 'following' ? 'تابع مبدعين عشان فيديوهاتهم تظهر هنا.' : dq ? 'مفيش نتائج.' : 'لا فيديوهات بعد. انشر أول فيديو!'}</p>}
        {loading && <p className="p-4 text-center" style={{ color: C.teal }}>جاري التحميل...</p>}
      </div>
      {prof && <Profile uid={prof} me={me} say={say} onClose={() => setProf(null)} onFollow={(uid: string, f: boolean) => setVs(p => p.map(x => (x.user_id === uid ? { ...x, following: f } : x)))} onOpen={(id: number, name: string) => { setProf(null); setFocus({ uid: prof, name, startId: id }); }} />}
      {cm && <Comments v={cm} me={me} say={say} onClose={() => setCm(null)} bump={(id: number, d: number) => patch(id, x => ({ ...x, comments_count: Math.max(0, x.comments_count + d) }))} />}
      {up && <Uploader me={me} say={say} onClose={() => setUp(false)} onDone={() => { setUp(false); setMode('new'); load(true); }} />}
    </div>
  );
}

function Clip({ v, i, act, muted, me, h }: Any) {
  const on = i === act, near = Math.abs(i - act) <= 1, ref = useRef<HTMLVideoElement>(null), [paused, setPaused] = useState(false), onRef = useRef(on), hls = !!v.hls_url;
  onRef.current = on;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (on) el.play().then(() => setPaused(false)).catch(() => setPaused(true));
    else { el.pause(); el.currentTime = 0; setPaused(false); }
  }, [on, near]);
  /* HLS: سفاري يشغّله مباشرة، والباقي عبر hls.js (يتحمّل عند الحاجة فقط) */
  useEffect(() => {
    const el = ref.current; if (!el || !hls || !near) return;
    const go = () => { if (onRef.current) el.play().then(() => setPaused(false)).catch(() => setPaused(true)); };
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = v.hls_url; el.addEventListener('loadedmetadata', go, { once: true });
      return () => { el.removeAttribute('src'); el.load(); };
    }
    let inst: Any, dead = false;
    import('hls.js').then(({ default: Hls }) => {
      if (dead) return;
      if (!Hls.isSupported()) { el.src = v.url; go(); return; }
      inst = new Hls({ maxBufferLength: 12, capLevelToPlayerSize: true });
      inst.loadSource(v.hls_url); inst.attachMedia(el); inst.on(Hls.Events.MANIFEST_PARSED, go);
    });
    return () => { dead = true; inst?.destroy(); };
  }, [near, hls, v.hls_url, v.url]);
  useEffect(() => {
    if (!on || seen.has(v.id)) return;
    const t = setTimeout(() => { seen.add(v.id); sb.rpc('add_view', { p_video: v.id }).then(() => {}); }, 2000);
    return () => clearTimeout(t);
  }, [on, v.id]);
  const tap = () => { const el = ref.current; if (!el) return; if (el.paused) { el.play(); setPaused(false); } else { el.pause(); setPaused(true); } };
  const btn: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 12, color: '#fff', textShadow: '0 1px 4px #000' };
  return (
    <section style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', background: '#000' }}>
      <video ref={ref} src={near && !hls ? v.url : undefined} poster={v.poster ?? undefined} loop muted={muted} playsInline preload="metadata" onClick={tap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {paused && <div onClick={tap} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 64, color: '#fff9' }}>▶</div>}
      <div style={{ position: 'absolute', left: 10, bottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ position: 'relative', ...btn }}>
          <button onClick={() => h.profile(v)} aria-label="الحساب" style={{ width: 44, height: 44, borderRadius: 22, background: C.teal, color: C.ink, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, overflow: 'hidden' }}>{v.avatar_url ? <img src={v.avatar_url} alt="" width={44} height={44} style={{ width: 44, height: 44, objectFit: 'cover' }} /> : (v.username ?? '?')[0]}</button>
          {v.user_id !== me.id && !v.following && <button aria-label="متابعة" onClick={() => h.follow(v)} style={{ position: 'absolute', bottom: -8, width: 20, height: 20, borderRadius: 10, background: '#ff4f72', color: '#fff', fontWeight: 700, lineHeight: '20px' }}>+</button>}
        </div>
        <button style={btn} onClick={() => h.like(v)} aria-label="إعجاب"><span style={{ fontSize: 30, color: v.liked ? '#ff4f72' : '#fff' }}>{v.liked ? '♥' : '♡'}</span>{num(v.likes_count)}</button>
        <button style={btn} onClick={() => h.comments(v)} aria-label="تعليقات"><span style={{ fontSize: 28 }}>💬</span>{num(v.comments_count)}</button>
        <button style={btn} onClick={() => h.share(v)} aria-label="مشاركة"><span style={{ fontSize: 28 }}>↗</span>شارك</button>
        <button style={btn} onClick={h.mute} aria-label="الصوت"><span style={{ fontSize: 26 }}>{muted ? '🔇' : '🔊'}</span></button>
        {v.user_id === me.id
          ? <button style={btn} onClick={() => h.del(v)} aria-label="حذف"><span style={{ fontSize: 24 }}>🗑</span></button>
          : <button style={btn} onClick={() => h.report(v)} aria-label="إبلاغ"><span style={{ fontSize: 24 }}>⚑</span></button>}
      </div>
      <div style={{ position: 'absolute', right: 12, left: 76, bottom: 24, color: '#fff', textShadow: '0 1px 4px #000' }}>
        <button onClick={() => h.profile(v)}><b>@{v.username}</b></button>{v.user_id !== me.id && v.following && <span style={{ marginInlineStart: 8, fontSize: 12, opacity: 0.8 }}>· تتابعه</span>}
        <p style={{ marginTop: 4 }}><Caption t={v.caption} onTag={h.tag} /></p>
        <small style={{ opacity: 0.8 }}>👁 {num(v.views)}</small>
      </div>
    </section>
  );
}

function Comments({ v, me, say, onClose, bump }: Any) {
  const [cs, setCs] = useState<Any[]>([]), [t, setT] = useState('');
  const load = useCallback(async () => {
    const { data } = await sb.from('comments').select('id,body,user_id,profiles(username)').eq('video_id', v.id).order('id', { ascending: false }).limit(100);
    setCs(data ?? []);
  }, [v.id]);
  useEffect(() => {
    load();
    const ch = sb.channel(`c${v.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `video_id=eq.${v.id}` }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [v.id, load]);
  const send = async () => {
    const b = t.trim(); if (!b) return;
    const { error } = await sb.from('comments').insert({ video_id: v.id, user_id: me.id, body: b.slice(0, 300) });
    if (error) return say(error.message);
    setT(''); bump(v.id, 1); load();
  };
  const del = async (id: number) => { const { error } = await sb.from('comments').delete().eq('id', id); if (error) return say(error.message); bump(v.id, -1); load(); };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000a', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, height: '65%', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between p-3"><b>{num(v.comments_count)} تعليق</b><button onClick={onClose} aria-label="إغلاق">✕</button></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
          {!cs.length && <p className="p-4 text-center" style={{ opacity: 0.7 }}>كن أول من يعلّق.</p>}
          {cs.map(c => <div key={c.id} className="mb-3 flex justify-between gap-2"><p><b>@{c.profiles?.username}</b> {c.body}</p>{(c.user_id === me.id) && <button onClick={() => del(c.id)} aria-label="حذف التعليق">🗑</button>}</div>)}
        </div>
        <div className="flex gap-2 p-3"><input className="flex-1 rounded p-2 text-black" maxLength={300} placeholder="اكتب تعليق..." value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button onClick={send} style={{ color: C.teal }}>إرسال</button></div>
      </div>
    </div>
  );
}

function Uploader({ me, say, onClose, onDone }: Any) {
  const [f, setF] = useState<File | null>(null), [cap, setCap] = useState(''), [p, setP] = useState(0), [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) return say('الصيغ المسموحة: mp4 أو webm أو mov');
    if (file.size > MAX_MB * 1048576) return say(`الحد الأقصى ${MAX_MB} ميجا`);
    const { dur } = await frame(file);
    if (!isFinite(dur)) return say('تعذّر قراءة الفيديو، جرّب ملفًا آخر');
    if (dur > MAX_SEC) return say(`الحد الأقصى ${MAX_SEC / 60} دقائق`);
    setF(file);
  };
  const post = async () => {
    if (!f) return; setBusy(true);
    try {
      const ext = f.type === 'video/webm' ? 'webm' : f.type === 'video/quicktime' ? 'mov' : 'mp4', base = `${me.id}/${Date.now()}`;
      const { blob } = await frame(f);
      await put(`${base}.${ext}`, f, f.type, setP);
      let poster: string | null = null;
      if (blob) { await put(`${base}.jpg`, blob, 'image/jpeg'); poster = pub(`${base}.jpg`); }
      const { error } = await sb.from('videos').insert({ user_id: me.id, url: pub(`${base}.${ext}`), poster, caption: cap.trim().slice(0, 300) });
      if (error) throw error;
      say('تم النشر 🎉'); onDone();
    } catch (e: any) { say(e?.message ?? 'فشل الرفع'); setBusy(false); }
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000b', zIndex: 30, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, width: '100%' }}>
        <div className="mb-3 flex justify-between"><b>نشر فيديو</b>{!busy && <button onClick={onClose} aria-label="إغلاق">✕</button>}</div>
        <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e => pick(e.target.files?.[0])} className="mb-3 w-full" />
        {f && <p className="mb-2 text-sm">{f.name} · {(f.size / 1048576).toFixed(1)} MB</p>}
        <textarea className="mb-3 w-full rounded p-2 text-black" rows={3} maxLength={300} placeholder="اكتب وصف و #هاشتاج" value={cap} onChange={e => setCap(e.target.value)} disabled={busy} />
        {busy && <div className="mb-3" style={{ background: '#fff2', borderRadius: 6 }}><div style={{ width: `${p}%`, background: C.teal, height: 8, borderRadius: 6, transition: 'width .2s' }} /><small>{p}%</small></div>}
        <button onClick={post} disabled={!f || busy} className="w-full rounded p-2 font-bold" style={{ background: f && !busy ? C.teal : '#555', color: C.ink }}>{busy ? 'جاري الرفع...' : 'انشر'}</button>
        <p className="mt-2 text-xs" style={{ opacity: 0.7 }}>حتى {MAX_MB} ميجا و{MAX_SEC / 60} دقائق · mp4 / webm / mov</p>
      </div>
    </div>
  );
}

const TXT: Record<string, string> = { like: 'أعجب بفيديوك ♥', comment: 'علّق على فيديوك 💬', follow: 'بدأ بمتابعتك', gift: 'أرسل لك هدية 🎁' };
function Bell({ me, open, setOpen }: Any) {
  const [items, setItems] = useState<Any[]>([]), [cnt, setCnt] = useState(0);
  const count = useCallback(async () => {
    const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', me.id).eq('read', false);
    setCnt(count ?? 0);
  }, [me.id]);
  useEffect(() => {
    count();
    const ch = sb.channel(`n${me.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, count).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [me.id, count]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await sb.from('notifications').select('id,kind,read,actor:profiles!actor_id(username)').eq('user_id', me.id).order('id', { ascending: false }).limit(30);
      setItems(data ?? []);
      await sb.from('notifications').update({ read: true }).eq('user_id', me.id).eq('read', false); setCnt(0);
    })();
  }, [open, me.id]);
  return (
    <div style={{ position: 'relative' }}>
      <button aria-label="الإشعارات" onClick={() => setOpen(!open)}>🔔{cnt > 0 && <b style={{ position: 'absolute', top: -6, right: -8, background: '#ff4f72', color: '#fff', borderRadius: 9, fontSize: 10, padding: '0 5px' }}>{cnt > 9 ? '9+' : cnt}</b>}</button>
      {open && <div style={{ position: 'absolute', top: 30, left: 0, width: 260, maxHeight: 320, overflowY: 'auto', background: C.card, borderRadius: 12, zIndex: 40, padding: 10, boxShadow: '0 8px 24px #000a' }}>
        {!items.length && <p style={{ opacity: 0.7 }}>مفيش إشعارات بعد.</p>}
        {items.map(n => <p key={n.id} className="mb-2" style={{ opacity: n.read ? 0.6 : 1 }}><b>@{n.actor?.username}</b> {TXT[n.kind] ?? ''}</p>)}
      </div>}
    </div>
  );
}
