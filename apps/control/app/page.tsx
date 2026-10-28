'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// المفتاح هنا عام (anon) وآمن بطبيعته؛ الحماية الحقيقية في السيرفر عبر التحقق من البريد.
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
type Plan = { command: string; params: Record<string, any>; desc: string; reason?: string };
type Line = { t: 'you' | 'out' | 'err' | 'sys'; s: string };

export default function Control() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState('');
  const [lines, setLines] = useState<Line[]>([{ t: 'sys', s: 'لوحة Jo1 — اكتب أمرك بالعربي.' }]);
  const [input, setInput] = useState(''), [busy, setBusy] = useState(false), [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => { sb.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);

  const login = async () => {
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) return setMsg('بيانات الدخول غير صحيحة');
    setAuthed(true); setMsg('');
  };
  const magicLogin = async () => {
    if (!email) return setMsg('اكتب الإيميل الأول');
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMsg(error ? 'تعذر إرسال الرابط، جرّب تاني' : 'اتبعتلك رابط دخول على الإيميل، افتحه من نفس الجهاز');
  };
  const token = async () => (await sb.auth.getSession()).data.session?.access_token ?? '';
  const call = async (body: any) => {
    const r = await fetch('/api/control', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
    return { status: r.status, j: await r.json().catch(() => ({ ok: false, output: 'رد غير متوقع' })) };
  };

  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    setInput(''); setBusy(true); setLines(l => [...l, { t: 'you', s: '› ' + text }]);
    const { status, j } = await call({ text });
    if (status === 403) { setAuthed(false); setMsg('انتهت الجلسة أو ليس لديك صلاحية'); }
    else if (j.needsConfirm) { setPlan(j.plan); setLines(l => [...l, { t: 'sys', s: `⚠️ ${j.plan.desc}` }]); }
    else setLines(l => [...l, { t: j.ok ? 'out' : 'err', s: j.output }]);
    setBusy(false);
  };

  const confirm = async (yes: boolean) => {
    if (!plan) return;
    if (!yes) { setLines(l => [...l, { t: 'sys', s: 'أُلغي' }]); setPlan(null); return; }
    setBusy(true);
    const { j } = await call({ confirm: plan });
    setLines(l => [...l, { t: j.ok ? 'out' : 'err', s: j.output }]);
    setPlan(null); setBusy(false);
  };

  const color = { you: '#1FC8B4', out: '#EFE6CF', err: '#ff6b6b', sys: '#E9B949' } as const;

  if (!authed) return (
    <main dir="rtl" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-3xl font-black" style={{ color: '#E9B949' }}>Jo1 Control</h1>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد" className="rounded p-3 text-black" autoComplete="username" />
      <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="كلمة المرور" className="rounded p-3 text-black" autoComplete="current-password" />
      <button onClick={login} className="rounded p-3 font-bold" style={{ background: '#1FC8B4', color: '#0B1020' }}>دخول</button>
      <button onClick={magicLogin} className="rounded p-3 font-bold" style={{ background: '#E9B949', color: '#0B1020' }}>دخول برابط على الإيميل (من غير باسورد)</button>
      {msg && <p style={{ color: '#ff6b6b' }}>{msg}</p>}
    </main>
  );

  return (
    <main dir="rtl" className="mx-auto flex min-h-dvh max-w-xl flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-black" style={{ color: '#E9B949' }}>Jo1 Control</h1>
        <button onClick={() => { sb.auth.signOut(); setAuthed(false); }} className="text-sm underline opacity-70">خروج</button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl p-3 font-mono text-sm" style={{ background: '#050914', minHeight: '60dvh' }}>
        {lines.map((l, i) => <pre key={i} className="whitespace-pre-wrap break-words" style={{ color: color[l.t], margin: 0, fontFamily: 'inherit' }}>{l.s}</pre>)}
        {plan && (
          <div className="mt-2 space-y-2 rounded-lg p-3" style={{ background: '#121a33' }}>
            <p>الأمر: <b>{plan.command}</b></p>
            <pre className="text-xs opacity-80">{JSON.stringify(plan.params, null, 2)}</pre>
            {plan.reason && <p className="opacity-70">السبب: {plan.reason}</p>}
            <div className="flex gap-2">
              <button onClick={() => confirm(true)} disabled={busy} className="flex-1 rounded p-3 font-bold" style={{ background: '#1FC8B4', color: '#0B1020' }}>تأكيد</button>
              <button onClick={() => confirm(false)} className="flex-1 rounded p-3 font-bold" style={{ background: '#2a2f45' }}>إلغاء</button>
            </div>
          </div>
        )}
        {busy && <p className="opacity-60">جاري...</p>}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} disabled={busy || !!plan} placeholder="اكتب أمرك..." className="flex-1 rounded-lg p-3 text-black" />
        <button disabled={busy || !!plan} className="rounded-lg px-4 font-bold disabled:opacity-40" style={{ background: '#E9B949', color: '#0B1020' }}>إرسال</button>
      </form>
    </main>
  );
}
