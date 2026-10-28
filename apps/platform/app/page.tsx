'use client';
/* Jo1 — app/page.tsx (ملف واحد). 1) شغّل schema.sql في Supabase  2) الصور والفيديوهات في public/gifts/v/ (g01..g15)
   3) ENV: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   4) npm i @supabase/supabase-js */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './lib/sb';
import FeedPro from './FeedPro';
import AdminMod from './AdminMod';
import GamesPage from './games/page';
import { put, pub, objPath, squareJpeg } from './lib/media';
import { Room, RoomEvent, Track } from 'livekit-client';

type Any = any;
const C = { ink: '#0B1020', card: '#121a33', sand: '#EFE6CF', teal: '#1FC8B4', gold: '#E9B949' };
const ERR: Record<string, string> = {
  AUTH_REQUIRED: 'سجّل الدخول أولاً.', BAD_AMOUNT: 'المبلغ غير صالح.', BAD_VF_NUMBER: 'رقم فودافون كاش غير صالح (11 رقم يبدأ بـ01).',
  BAD_TX_REFERENCE: 'اكتب رقم عملية فودافون كاش من رسالة التأكيد.', TOO_MANY_PENDING: 'عندك 3 طلبات إيداع قيد المراجعة.',
  BELOW_MINIMUM: 'أقل من الحد الأدنى للسحب.', INSUFFICIENT_DIAMONDS: 'رصيد الألماس لا يكفي.', INSUFFICIENT_COINS: 'رصيد العملات لا يكفي.',
  SELF_GIFT: 'لا يمكنك إهداء نفسك.', SHIP_INFO: 'أكمل بيانات الشحن.', NOT_ADMIN: 'للأدمن فقط.', NOT_PENDING: 'الطلب تمت مراجعته.', ALREADY_CLAIMED: 'استلمتها اليوم بالفعل، ارجع بكرة.', BAD_KIND: 'مكافأة غير معروفة.',
};
const em = (e: Any) => { const m = String(e?.message ?? e); const k = Object.keys(ERR).find(k => m.includes(k)); return k ? ERR[k] : m.includes('duplicate') ? 'رقم العملية مستخدم من قبل.' : m; };
const REAL: Any = { choco: '🍫', bear: '🧸' };
const nameCache = new Map<string, string>();
let giftCache: Any[] | null = null;
const loadGifts = async () => giftCache ?? (giftCache = (await sb.from('gifts').select('*').order('price')).data ?? []);
const Icon = memo(({ g, s = 48 }: Any) => g.real
  ? <span style={{ fontSize: s * 0.8 }}>{REAL[g.img] ?? '🎁'}</span>
  : <img src={`/gifts/v/${g.img}.jpg`} alt={g.name} width={s} height={s} loading="lazy" decoding="async" style={{ borderRadius: 10, objectFit: 'cover', width: s, height: s }} />);
Icon.displayName = 'Icon';
/* فيديو الهدية: يشتغل مرة واحدة فوق البث، والهدايا من 2000 تملأ الشاشة */
const GiftVideo = memo(({ g, n, onEnd }: Any) => (
  <div className={g.price >= 2000 ? 'gv mega' : 'gv'}>
    <video ref={el => { if (el && !el.dataset.p) { el.dataset.p = '1'; el.play().catch(() => { el.muted = true; el.play().catch(() => {}); }); } }} src={`/gifts/v/${g.img}.mp4`} playsInline preload="auto" onEnded={onEnd} />
    <b>{n}: {g.name}</b>
  </div>));
GiftVideo.displayName = 'GiftVideo';

export default function Jo1() {
  const [me, setMe] = useState<Any>(null), [prof, setProf] = useState<Any>(null), [tab, setTab] = useState('feed'), [toast, setToast] = useState('');
  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 2800); }, []);
  const loadProf = useCallback(async (id: string) => { const { data } = await sb.from('profiles').select('*').eq('id', id).maybeSingle(); setProf(data); }, []);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setMe(data.session?.user ?? null); if (data.session) loadProf(data.session.user.id); });
    const { data: l } = sb.auth.onAuthStateChange((_e, s) => { setMe(s?.user ?? null); s ? loadProf(s.user.id) : setProf(null); });
    return () => l.subscription.unsubscribe();
  }, [loadProf]);
  if (!me) return <Auth say={say} toast={toast} />;
  const tabs: [string, string][] = [['feed', 'الرئيسية'], ['live', 'لايف'], ['wallet', 'المحفظة'], ['creator', 'المبدع'], ['me', 'حسابي'], ['games', 'ألعاب'], ...(prof?.is_admin ? [['admin', 'أدمن'] as [string, string]] : [])];
  const P = { me, prof, say, reload: () => loadProf(me.id), go: setTab };
  return (
    <div dir="rtl" style={{ background: C.ink, color: C.sand, minHeight: '100dvh', fontFamily: 'Tajawal, system-ui, sans-serif' }} className="mx-auto max-w-md pb-20">
      <style>{css}</style>
      <header className="flex items-center justify-between p-4"><b className="text-2xl" style={{ color: C.gold }}>Jo1</b><span>🪙 {(prof?.coins ?? 0)}{prof?.bonus ? ` (+${prof.bonus} مكافأة)` : ''} · 💎 {prof?.diamonds ?? 0}</span></header>
      {tab === 'feed' && <FeedPro {...P} />}{tab === 'live' && <Live {...P} />}{tab === 'wallet' && <Wallet {...P} />}
      {tab === 'creator' && <Creator {...P} />}{tab === 'me' && <Me {...P} />}{tab === 'games' && <GamesPage />}{tab === 'admin' && <Admin {...P} />}
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around p-3" style={{ background: C.card }}>
        {tabs.map(([k, v]) => <button key={k} onClick={() => setTab(k)} style={{ color: tab === k ? C.teal : C.sand }}>{v}</button>)}
      </nav>
      {toast && <div role="status" className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded px-4 py-2" style={{ background: C.gold, color: C.ink }}>{toast}</div>}
    </div>
  );
}

function Auth({ say, toast }: Any) {
  const [email, setE] = useState(''), [pw, setP] = useState(''), [user, setU] = useState(''), [reg, setR] = useState(false);
  const mk = async (id: string, name: string) => { const { data } = await sb.from('profiles').select('id').eq('id', id).maybeSingle(); if (!data) await sb.from('profiles').insert({ id, username: name }); };
  const go = async () => {
    if (reg) {
      const { data, error } = await sb.auth.signUp({ email, password: pw }); if (error) return say(error.message);
      if (data.user && data.session) await mk(data.user.id, user || email.split('@')[0]); else say('أكّد الإيميل ثم سجّل الدخول');
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw }); if (error) return say(error.message);
      await mk(data.user.id, email.split('@')[0]);
    }
  };
  const inp = 'w-full rounded p-3 mb-3 text-black';
  return (
    <div dir="rtl" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6" style={{ background: C.ink, color: C.sand }}>
      <h1 className="mb-6 text-5xl font-black" style={{ color: C.gold }}>Jo1</h1>
      {reg && <input className={inp} placeholder="اسم المستخدم" value={user} onChange={e => setU(e.target.value)} />}
      <input className={inp} placeholder="الإيميل" value={email} onChange={e => setE(e.target.value)} />
      <input className={inp} type="password" placeholder="كلمة المرور" value={pw} onChange={e => setP(e.target.value)} />
      <button onClick={go} className="rounded p-3 font-bold" style={{ background: C.teal, color: C.ink }}>{reg ? 'إنشاء حساب' : 'دخول'}</button>
      <button onClick={() => setR(!reg)} className="mt-4 underline">{reg ? 'عندي حساب' : 'حساب جديد'}</button>
      <div className="my-4 flex items-center gap-3 opacity-60"><span className="h-px flex-1 bg-current" />أو<span className="h-px flex-1 bg-current" /></div>
      <button onClick={() => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
        className="flex items-center justify-center gap-2 rounded p-3 font-bold" style={{ background: '#fff', color: '#1f1f1f' }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        تسجيل الدخول بجوجل
      </button>
      {toast && <p className="mt-4" style={{ color: C.gold }}>{toast}</p>}
    </div>
  );
}

/* فيديو واحد يشتغل في كل لحظة: بيتشغل لما يظهر وبيقف لما يختفي */
const VideoItem = memo(({ v, liked, onLike }: Any) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && e.intersectionRatio > 0.6) el.play().catch(() => {}); else el.pause(); }, { threshold: [0, 0.6] });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div className="mb-4"><video ref={ref} src={v.url} loop muted playsInline preload="metadata" controls className="w-full rounded" />
      <div className="mt-1 flex items-center justify-between gap-2"><p><b>@{v.profiles?.username}</b> {v.caption}</p>
        <button onClick={() => onLike(v.id)} aria-label="إعجاب" style={{ color: liked ? '#ff4f72' : C.sand }}>{liked ? '♥' : '♡'} {v.likes}</button></div></div>
  );
});
VideoItem.displayName = 'VideoItem';

/* بث حقيقي WebRTC عبر LiveKit: المضيف ينشر كاميرا وصوت، المشاهدون يستقبلون فقط */
function LiveVideo({ roomId }: Any) {
  const box = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState('جاري الاتصال...'), [host, setHost] = useState(false);
  useEffect(() => {
    let lk: Room | null = null, dead = false;
    const el = box.current;
    const attach = (t: Any) => { const e = t.attach() as HTMLMediaElement; if (t.kind === 'video') (e as HTMLVideoElement).playsInline = true; el?.appendChild(e); setSt(''); };
    (async () => {
      try {
        const { data: s } = await sb.auth.getSession();
        const r = await fetch('/api/livekit-token', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` }, body: JSON.stringify({ roomId }) });
        if (!r.ok) throw new Error(await r.text());
        const { token, url, isHost } = await r.json(); if (dead) return;
        setHost(isHost);
        lk = new Room({ adaptiveStream: true, dynacast: true });
        lk.on(RoomEvent.TrackSubscribed, attach)
          .on(RoomEvent.TrackUnsubscribed, (t: Any) => t.detach().forEach((e: Element) => e.remove()))
          .on(RoomEvent.Disconnected, () => !dead && setSt('انتهى الاتصال بالبث'));
        await lk.connect(url, token); if (dead) { lk.disconnect(); return; }
        if (isHost) {
          await lk.localParticipant.enableCameraAndMicrophone();
          const v = lk.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack; if (v) attach(v);
        } else setSt('في انتظار المذيع...');
      } catch (e: Any) { if (!dead) setSt('تعذّر الاتصال بالبث: ' + String(e?.message ?? e).slice(0, 80)); }
    })();
    return () => { dead = true; lk?.disconnect(); if (el) el.innerHTML = ''; };
  }, [roomId]);
  return (
    <div className="relative max-h-[60vh] w-full overflow-hidden rounded bg-black" style={{ aspectRatio: '9/16' }}>
      <div ref={box} className="h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
      {st && <p className="absolute inset-0 grid place-items-center p-4 text-center">{st}</p>}
      {host && !st && <span className="absolute top-2 right-2 rounded px-2 text-sm" style={{ background: '#d22' }}>🔴 أنت على الهواء</span>}
    </div>
  );
}

function Live({ me, prof, say, reload }: Any) {
  const [rooms, setRooms] = useState<Any[]>([]), [room, setRoom] = useState<Any>(null), [title, setT] = useState('');
  const [msgs, setM] = useState<Any[]>([]), [txt, setTx] = useState(''), [gifts, setG] = useState<Any[]>([]), [fx, setFx] = useState<Any[]>([]), [ship, setShip] = useState<Any>(null);
  const end = useRef<HTMLDivElement>(null);
  const loadRooms = async () => { const { data } = await sb.from('rooms').select('id,title,host_id,profiles(username)').eq('is_live', true).order('id', { ascending: false }).limit(30); setRooms(data ?? []); };
  useEffect(() => { loadRooms(); loadGifts().then(setG); }, []);
  const uname = async (id: string) => { if (!nameCache.has(id)) { const { data } = await sb.from('profiles').select('username').eq('id', id).single(); nameCache.set(id, data?.username ?? '؟'); } return nameCache.get(id)!; };
  useEffect(() => {
    if (!room) return;
    sb.from('messages').select('id,user_id,body,profiles(username)').eq('room_id', room.id).order('id', { ascending: false }).limit(60).then(({ data }) => setM((data ?? []).reverse()));
    const ch = sb.channel('room' + room.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, async p => {
        const n = await uname((p.new as Any).user_id); setM(m => [...m.slice(-79), { ...p.new, profiles: { username: n } }]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gift_sends', filter: `room_id=eq.${room.id}` }, async p => {
        const g = (await loadGifts()).find(x => x.id === (p.new as Any).gift_id); if (!g) return;
        const n = await uname((p.new as Any).sender_id); const k = (p.new as Any).id;
        setFx(f => [...f.slice(-2), { k, g, n }]); setTimeout(() => setFx(f => f.filter(x => x.k !== k)), g.real ? 2200 : 9000);
      }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [room]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs]);
  const open = async () => { if (!title) return; const { data, error } = await sb.from('rooms').insert({ host_id: me.id, title }).select('id,title,host_id').single(); if (error) return say(error.message); setT(''); setRoom(data); loadRooms(); };
  const close = async () => { if (room?.host_id === me.id) await sb.from('rooms').update({ is_live: false }).eq('id', room.id); setRoom(null); loadRooms(); };
  const send = async () => { const b = txt.trim(); if (!b) return; setTx(''); const { error } = await sb.from('messages').insert({ room_id: room.id, user_id: me.id, body: b.slice(0, 300) }); if (error) say(error.message); };
  const gift = async (g: Any, f?: FormData) => {
    if (g.real && !f) return setShip(g);
    const { error } = await sb.rpc('send_gift', { p_room: room.id, p_gift: g.id, p_to: room.host_id, p_name: f?.get('n') ?? null, p_phone: f?.get('p') ?? null, p_addr: f?.get('a') ?? null });
    if (error) return say(em(error)); setShip(null); reload(); if (g.real) say('تم طلب الهدية الحقيقية');
  };
  if (!room) return (
    <div className="px-4">
      <div className="mb-4 flex gap-2"><input className="flex-1 rounded p-2 text-black" placeholder="عنوان البث" value={title} onChange={e => setT(e.target.value)} /><button onClick={open} className="rounded px-3" style={{ background: C.teal, color: C.ink }}>ابدأ لايف</button></div>
      {rooms.length === 0 && <p>لا يوجد بث الآن.</p>}
      {rooms.map(r => <button key={r.id} onClick={() => setRoom(r)} className="mb-2 block w-full rounded p-3 text-right" style={{ background: C.card }}>🔴 {r.title} — @{r.profiles?.username}</button>)}
    </div>
  );
  return (
    <div className="px-4">
      <button onClick={close}>← {room.host_id === me.id ? 'إنهاء البث' : 'رجوع'}</button>
      <h3 className="my-2 font-bold">{room.title}</h3>
      <div className="relative">
        <LiveVideo roomId={room.id} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {fx.map(f => f.g.real ? <div key={f.k} className="fx"><Icon g={f.g} s={110} /><b className="block text-center" style={{ textShadow: '0 2px 6px #000' }}>{f.n}: {f.g.name}</b></div> : <GiftVideo key={f.k} g={f.g} n={f.n} onEnd={() => setFx(x => x.filter(y => y.k !== f.k))} />)}
        </div>
      </div>
      <div className="my-2 h-36 overflow-y-auto rounded p-2" style={{ background: C.card }}>{msgs.map(m => <p key={m.id}><b style={{ color: C.teal }}>{m.profiles?.username}:</b> {m.body}</p>)}<div ref={end} /></div>
      <div className="flex gap-2"><input className="flex-1 rounded p-2 text-black" maxLength={300} value={txt} onChange={e => setTx(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="اكتب..." /><button onClick={send} style={{ color: C.teal }}>إرسال</button></div>
      <div className="mt-3 grid grid-cols-4 gap-2">{gifts.map(g => <button key={g.id} onClick={() => gift(g)} className="flex flex-col items-center rounded p-2" style={{ background: C.card }}><Icon g={g} /><small>{g.name}</small><small>🪙{g.price}{g.real ? ' 📦' : ''}</small></button>)}</div>
      {ship && <form action={(f) => gift(ship, f)} className="mt-3 rounded p-3" style={{ background: C.card }}><b>شحن: {ship.name}</b>{['n:الاسم', 'p:الموبايل', 'a:العنوان'].map(s => <input key={s} name={s[0]} required placeholder={s.slice(2)} className="my-1 w-full rounded p-2 text-black" />)}<button className="rounded px-3 py-1" style={{ background: C.gold, color: C.ink }}>تأكيد وإرسال</button></form>}
    </div>
  );
}

function Wallet({ me, prof, say, reload }: Any) {
  const [st, setSt] = useState<Any>(null), [dep, setDep] = useState<Any[]>([]), [wd, setWd] = useState<Any[]>([]);
  const [a, setA] = useState(''), [vf, setVf] = useState(''), [tx, setTx] = useState(''), [d, setD] = useState(''), [vf2, setVf2] = useState('');
  const load = useCallback(async () => {
    const [s, x, y] = await Promise.all([sb.from('app_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('deposits').select('id,amount_egp,coins,status,note').eq('user_id', me.id).order('id', { ascending: false }).limit(20),
      sb.from('withdrawals').select('id,diamonds,amount_egp,status,note').eq('user_id', me.id).order('id', { ascending: false }).limit(20)]);
    setSt(s.data); setDep(x.data ?? []); setWd(y.data ?? []);
  }, [me.id]);
  useEffect(() => { load(); }, [load]);
  const deposit = async () => { const { error } = await sb.rpc('request_deposit', { p_amount_egp: Math.round(+a), p_vf_number: vf.trim(), p_tx_ref: tx.trim() }); if (error) return say(em(error)); setA(''); setTx(''); say('طلب الإيداع قيد المراجعة'); load(); };
  const withdraw = async () => { const { error } = await sb.rpc('request_withdrawal', { p_diamonds: Math.round(+d), p_vf_number: vf2.trim() }); if (error) return say(em(error)); setD(''); say('طلب السحب قيد المراجعة'); load(); reload(); };
  const S: Any = { pending: 'قيد المراجعة', approved: 'تمت الموافقة', paid: 'تم الدفع', rejected: 'مرفوض' };
  const inp = 'w-full rounded p-2 mb-2 text-black', btn = 'rounded px-3 py-2 font-bold';
  return (
    <div className="px-4">
      <h2 className="text-2xl font-bold" style={{ color: C.gold }}>🪙 {prof?.coins ?? 0} · 💎 {prof?.diamonds ?? 0}</h2>
      {st && <p className="text-sm">1 جنيه = {st.coins_per_egp} عملة · {st.diamonds_per_egp} ألماسة = 1 جنيه · أقل سحب {st.min_withdraw_diamonds} ألماسة</p>}
      <div className="my-3 rounded p-3" style={{ background: C.card }}>
        <b>إيداع</b><p className="text-sm">حوّل لفودافون كاش: <b dir="ltr">{st?.vodafone_number ?? '—'}</b> ثم اكتب بيانات العملية.</p>
        <input className={inp} type="number" placeholder="المبلغ بالجنيه" value={a} onChange={e => setA(e.target.value)} />
        <input className={inp} placeholder="رقمك اللي حوّلت منه" value={vf} onChange={e => setVf(e.target.value)} />
        <input className={inp} placeholder="رقم العملية" value={tx} onChange={e => setTx(e.target.value)} />
        <button onClick={deposit} className={btn} style={{ background: C.teal, color: C.ink }}>إرسال طلب الإيداع</button>
      </div>
      <div className="mb-3 rounded p-3" style={{ background: C.card }}>
        <b>سحب (بالألماس)</b>
        <input className={inp} type="number" placeholder="عدد الألماس" value={d} onChange={e => setD(e.target.value)} />
        <input className={inp} placeholder="رقم فودافون كاش للاستلام" value={vf2} onChange={e => setVf2(e.target.value)} />
        <button onClick={withdraw} className={btn} style={{ background: C.gold, color: C.ink }}>إرسال طلب السحب</button>
      </div>
      {dep.length + wd.length === 0 && <p>لا معاملات بعد.</p>}
      {dep.map(t => <p key={'d' + t.id} className="border-b py-1" style={{ borderColor: '#243' }}>إيداع {t.amount_egp}ج → {t.coins}🪙 · {S[t.status]}{t.note ? ` (${t.note})` : ''}</p>)}
      {wd.map(t => <p key={'w' + t.id} className="border-b py-1" style={{ borderColor: '#243' }}>سحب {t.diamonds}💎 → {t.amount_egp}ج · {S[t.status]}{t.note ? ` (${t.note})` : ''}</p>)}
    </div>
  );
}

function Memory({ onWin, disabled }: Any) {
  const [cards] = useState(() => Array.from('🦁🐯🐉🚀🌌🦅').flatMap(x => [x, x]).sort(() => Math.random() - 0.5));
  const [open, setOpen] = useState<number[]>([]), [ok, setOk] = useState<number[]>([]);
  const flip = (i: number) => {
    if (disabled || open.length === 2 || open.includes(i) || ok.includes(i)) return;
    const o = [...open, i]; setOpen(o);
    if (o.length < 2) return;
    if (cards[o[0]] === cards[o[1]]) { const d = [...ok, ...o]; setOk(d); setOpen([]); if (d.length === cards.length) onWin(); } else setTimeout(() => setOpen([]), 700);
  };
  return <div className="grid grid-cols-4 gap-2">{cards.map((c, i) => <button key={i} onClick={() => flip(i)} className="aspect-square rounded text-2xl" style={{ background: open.includes(i) || ok.includes(i) ? C.teal : '#1d2850' }}>{open.includes(i) || ok.includes(i) ? c : '?'}</button>)}</div>;
}

function Creator({ me, say, reload, go }: Any) {
  const [s, setS] = useState({ vids: 0, gifts: 0, earn: 0, rooms: 0, days: [] as number[] }), [done, setDone] = useState<Record<string, number>>({}), [rot, setRot] = useState(0), [play, setPlay] = useState(false);
  const load = useCallback(async () => {
    const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), today = new Date().toISOString().slice(0, 10);
    const [v, g, r, w, dc] = await Promise.all([
      sb.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', me.id),
      sb.from('gift_sends').select('id', { count: 'exact', head: true }).eq('receiver_id', me.id),
      sb.from('rooms').select('id', { count: 'exact', head: true }).eq('host_id', me.id),
      sb.from('ledger').select('amount,created_at').eq('user_id', me.id).eq('kind', 'gift_in').gte('created_at', since),
      sb.from('daily_claims').select('kind,reward').eq('user_id', me.id).eq('day', today)]);
    const days = Array(7).fill(0); (w.data ?? []).forEach((x: Any) => { const i = 6 - Math.floor((Date.now() - +new Date(x.created_at)) / 864e5); if (i >= 0 && i < 7) days[i] += x.amount; });
    setS({ vids: v.count ?? 0, gifts: g.count ?? 0, rooms: r.count ?? 0, earn: days.reduce((a, b) => a + b, 0), days });
    setDone(Object.fromEntries((dc.data ?? []).map((x: Any) => [x.kind, x.reward])));
  }, [me.id]);
  useEffect(() => { load(); }, [load]);
  const claim = async (k: string) => { const { data, error } = await sb.rpc('claim_daily', { p_kind: k }); if (error) return say(em(error)); say(`+${data} عملة مكافأة`); load(); reload(); };
  const spin = () => { if (done.wheel !== undefined) return say(ERR.ALREADY_CLAIMED); setRot(x => x + 1440 + Math.floor(Math.random() * 360)); setTimeout(() => claim('wheel'), 2300); };
  const share = async () => { const u = location.origin; try { if (navigator.share) await navigator.share({ title: 'Jo1', url: u }); else { await navigator.clipboard.writeText(u); say('تم نسخ الرابط'); } } catch { /* cancelled */ } };
  const rows: [string, number][] = [['ألماس آخر 7 أيام', s.earn], ['هدايا مستلمة', s.gifts], ['فيديوهات', s.vids], ['بثوث', s.rooms]];
  const mx = Math.max(1, ...s.days), card = { background: C.card }, btn = 'rounded px-3 py-2 font-bold';
  return (
    <div className="px-4">
      {rows.map(([k, v]) => <div key={k} className="mb-2 flex justify-between"><span>{k}</span><b>{v}</b></div>)}
      <div className="mt-3 flex h-24 items-end gap-1">{s.days.map((d, i) => <div key={i} className="flex-1 rounded-t" title={String(d)} style={{ height: `${Math.max(4, (d / mx) * 100)}%`, background: C.teal }} />)}</div>
      <h3 className="mt-5 mb-2 text-lg font-bold" style={{ color: C.gold }}>مداخل</h3>
      <p className="mb-2 text-sm">مكافآت يومية بعملات مكافأة: تُصرف على الهدايا فقط، ولا تُسحب ولا تتحول لألماس.</p>
      <div className="mb-2 flex items-center justify-between rounded p-3" style={card}><span>حضور اليوم (+20)</span><button disabled={done.checkin !== undefined} onClick={() => claim('checkin')} className={btn} style={{ background: C.teal, color: C.ink, opacity: done.checkin !== undefined ? 0.4 : 1 }}>{done.checkin !== undefined ? 'تم' : 'استلام'}</button></div>
      <div className="mb-2 rounded p-3 text-center" style={card}>
        <div className="mx-auto mb-2 h-28 w-28 rounded-full border-4" style={{ borderColor: C.gold, background: 'conic-gradient(#1FC8B4 0 25%,#E9B949 0 50%,#ff4f72 0 75%,#6b5bff 0)', transform: `rotate(${rot}deg)`, transition: 'transform 2.2s cubic-bezier(.2,.8,.2,1)' }} />
        <button disabled={done.wheel !== undefined} onClick={spin} className={btn} style={{ background: C.gold, color: C.ink, opacity: done.wheel !== undefined ? 0.4 : 1 }}>{done.wheel !== undefined ? `ربحت ${done.wheel} اليوم` : 'لف العجلة (10 إلى 50)'}</button>
      </div>
      <div className="mb-2 rounded p-3" style={card}>
        <div className="mb-2 flex items-center justify-between"><span>لعبة الذاكرة (+15)</span>{done.game !== undefined ? <b>تم اليوم</b> : <button onClick={() => setPlay(!play)} className={btn} style={{ background: C.teal, color: C.ink }}>{play ? 'إغلاق' : 'العب'}</button>}</div>
        {play && done.game === undefined && <Memory onWin={() => claim('game')} />}
      </div>
      <h3 className="mt-5 mb-2 text-lg font-bold" style={{ color: C.gold }}>مخارج</h3>
      <div className="mb-2 flex items-center justify-between rounded p-3" style={card}><span>سحب أرباح الهدايا (ألماس)</span><button onClick={() => go('wallet')} className={btn} style={{ background: C.gold, color: C.ink }}>المحفظة</button></div>
      <div className="mb-2 flex items-center justify-between rounded p-3" style={card}><span>شارك منصتك</span><button onClick={share} className={btn} style={{ background: C.teal, color: C.ink }}>مشاركة</button></div>
    </div>
  );
}

function Me({ me, prof, say, reload }: Any) {
  const [u, setU] = useState(prof?.username ?? ''), [b, setB] = useState(prof?.bio ?? ''), [g, setG] = useState<Any[]>([]);
  useEffect(() => { sb.from('videos').select('id,url,poster').eq('user_id', me.id).order('id', { ascending: false }).limit(30).then(({ data }) => setG(data ?? [])); }, [me.id]);
  const avatar = async (f?: File) => {
    if (!f) return;
    try {
      const path = `${me.id}/avatar-${Date.now()}.jpg`; await put(path, await squareJpeg(f), 'image/jpeg');
      const { error } = await sb.from('profiles').update({ avatar_url: pub(path) }).eq('id', me.id); if (error) throw error;
      const old = objPath(prof?.avatar_url); if (old) await sb.storage.from('videos').remove([old]);
      say('تم تحديث الصورة'); reload();
    } catch (e: Any) { say(em(e)); }
  };
  const save = async () => { const { error } = await sb.from('profiles').update({ username: u, bio: b }).eq('id', me.id); if (error) say(error.message); else { nameCache.delete(me.id); say('تم الحفظ'); reload(); } };
  return (
    <div className="px-4">
      <label className="mb-3 flex cursor-pointer items-center gap-3">
        {prof?.avatar_url ? <img src={prof.avatar_url} alt="" width={64} height={64} style={{ width: 64, height: 64, borderRadius: 32, objectFit: 'cover' }} /> : <span style={{ width: 64, height: 64, borderRadius: 32, background: C.teal, color: C.ink, display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700 }}>{(prof?.username ?? '?')[0]}</span>}
        <span style={{ color: C.teal }}>تغيير الصورة</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => avatar(e.target.files?.[0])} />
      </label>
      <input className="mb-2 w-full rounded p-2 text-black" value={u} onChange={e => setU(e.target.value)} placeholder="الاسم" />
      <textarea className="mb-2 w-full rounded p-2 text-black" value={b} onChange={e => setB(e.target.value)} placeholder="نبذة" />
      <button onClick={save} className="rounded px-3 py-1" style={{ background: C.teal, color: C.ink }}>حفظ</button>
      <button onClick={() => sb.auth.signOut()} className="mr-3 underline">خروج</button>
      <h3 className="my-3 font-bold">معرضي</h3>
      <div className="grid grid-cols-3 gap-1">{g.map(v => v.poster ? <img key={v.id} src={v.poster} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" /> : <video key={v.id} src={v.url} muted playsInline preload="metadata" className="aspect-square w-full rounded object-cover" />)}</div>
      {g.length === 0 && <p>معرضك فارغ. انشر من الرئيسية.</p>}
    </div>
  );
}

function Admin({ say }: Any) {
  const [dep, setDep] = useState<Any[]>([]), [wd, setWd] = useState<Any[]>([]);
  const load = useCallback(async () => {
    const [x, y] = await Promise.all([sb.from('deposits').select('*').eq('status', 'pending').order('id'), sb.from('withdrawals').select('*').eq('status', 'pending').order('id')]);
    setDep(x.data ?? []); setWd(y.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const run = async (fn: string, args: Any) => { const { error } = await sb.rpc(fn, args); if (error) return say(em(error)); load(); };
  const b = 'rounded px-2 py-1 mx-1';
  return (
    <div className="px-4">
      <h3 className="font-bold">إيداعات معلقة</h3>{dep.length === 0 && <p>لا شيء.</p>}
      {dep.map(d => <div key={d.id} className="my-2 rounded p-2" style={{ background: C.card }}>{d.amount_egp}ج → {d.coins}🪙<br /><small dir="ltr">{d.vf_number} · {d.tx_ref}</small><br />
        <button className={b} style={{ background: C.teal, color: C.ink }} onClick={() => run('admin_review_deposit', { p_id: d.id, p_approve: true })}>موافقة</button>
        <button className={b} style={{ background: '#b33' }} onClick={() => run('admin_review_deposit', { p_id: d.id, p_approve: false, p_note: 'لم تصل الحوالة' })}>رفض</button></div>)}
      <h3 className="mt-4 font-bold">سحوبات معلقة</h3>{wd.length === 0 && <p>لا شيء.</p>}
      {wd.map(w => <div key={w.id} className="my-2 rounded p-2" style={{ background: C.card }}>{w.diamonds}💎 → {w.amount_egp}ج<br /><small dir="ltr">{w.vf_number}</small><br />
        <button className={b} style={{ background: C.teal, color: C.ink }} onClick={() => run('admin_review_withdrawal', { p_id: w.id, p_paid: true })}>تم الدفع</button>
        <button className={b} style={{ background: '#b33' }} onClick={() => run('admin_review_withdrawal', { p_id: w.id, p_paid: false, p_note: 'مرفوض' })}>رفض واسترجاع</button></div>)}
      <AdminMod say={say} />
    </div>
  );
}

const css = `.fx{position:absolute;animation:pop 2.2s ease-out forwards;transform-style:preserve-3d}
.fx.mega{animation:mega 3.2s cubic-bezier(.2,.8,.2,1) forwards;filter:drop-shadow(0 0 30px #E9B949)}
@keyframes pop{0%{transform:translateY(60px) scale(.3);opacity:0}15%{opacity:1;transform:translateY(0) scale(1)}85%{opacity:1}100%{transform:translateY(-70px) scale(1);opacity:0}}
@keyframes mega{0%{transform:perspective(600px) rotateY(-90deg) scale(.2);opacity:0}25%{transform:perspective(600px) rotateY(0) scale(1.1);opacity:1}45%{transform:perspective(600px) rotateY(12deg) scale(1)}65%{transform:perspective(600px) rotateY(-12deg) scale(1.05)}85%{opacity:1}100%{transform:perspective(600px) scale(1.2);opacity:0}}
@media (prefers-reduced-motion:reduce){.fx,.fx.mega{animation-duration:.01s}}
.gv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:gin .35s ease-out}
.gv video{max-width:100%;max-height:100%;border-radius:10px}
.gv.mega video{width:100%;height:100%;object-fit:cover;border-radius:0}
.gv b{position:absolute;bottom:8px;text-shadow:0 2px 6px #000}
@keyframes gin{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
button:focus-visible,input:focus-visible{outline:2px solid #1FC8B4}`;
