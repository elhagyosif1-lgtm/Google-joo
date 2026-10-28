'use client';
import { useEffect, useRef, useState } from 'react';
import { sb } from '../../lib/sb';

type Line = { kind: 'you' | 'out' | 'err' | 'sys'; text: string };
type Plan = { command: string; params: Record<string, any>; reason?: string; risk?: string; desc?: string };

export default function ConsolePage() {
  const [lines, setLines] = useState<Line[]>([{ kind: 'sys', text: 'تيرمنال Jo1 — اكتب أمرك بالعربي، مثال: "كم مستخدم عندنا؟" أو "أعطِ @ahmed مكافأة 500"' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Plan | null>(null);
  const [reason, setReason] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines, pending]);

  const token = async () => (await sb.auth.getSession()).data.session?.access_token ?? '';
  const push = (l: Line) => setLines(p => [...p, l]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(''); push({ kind: 'you', text: '› ' + text }); setBusy(true);
    try {
      const r = await fetch('/api/console', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (j.needsConfirm) { setPending(j.plan); push({ kind: 'sys', text: `⚠️ ${j.plan.desc} — راجع الخطة وأكّد من الأسفل.` }); }
      else push({ kind: j.ok ? 'out' : 'err', text: j.output ?? 'خطأ غير معروف' });
    } catch { push({ kind: 'err', text: 'تعذّر الاتصال بالسيرفر' }); }
    setBusy(false);
  };

  const confirm = async (ok: boolean) => {
    if (!pending) return;
    if (!ok) { push({ kind: 'sys', text: 'أُلغي الأمر' }); setPending(null); setReason(''); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/console', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ confirm: { ...pending, reason } }) });
      const j = await r.json();
      push({ kind: j.ok ? 'out' : 'err', text: j.output });
    } catch { push({ kind: 'err', text: 'تعذّر الاتصال بالسيرفر' }); }
    setPending(null); setReason(''); setBusy(false);
  };

  const color = { you: '#1FC8B4', out: '#EFE6CF', err: '#ff6b6b', sys: '#E9B949' } as const;

  return (
    <main dir="rtl" className="mx-auto flex min-h-dvh max-w-2xl flex-col p-3" style={{ background: '#0B1020', color: '#EFE6CF' }}>
      <h1 className="mb-2 text-xl font-black" style={{ color: '#E9B949' }}>تيرمنال الأدمن</h1>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl p-3 font-mono text-sm" style={{ background: '#050914', minHeight: '60dvh' }}>
        {lines.map((l, i) => <pre key={i} className="whitespace-pre-wrap break-words" style={{ color: color[l.kind], margin: 0, fontFamily: 'inherit' }}>{l.text}</pre>)}
        {pending && (
          <div className="mt-3 space-y-2 rounded-lg p-3" style={{ background: '#121a33' }}>
            <p>الأمر: <b>{pending.command}</b> · المعاملات: <code>{JSON.stringify(pending.params)}</code></p>
            {pending.reason && <p className="opacity-80">السبب المقترح: {pending.reason}</p>}
            {pending.risk === 'danger' && (
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="اكتب سبب التنفيذ (مطلوب للأوامر الخطرة)"
                className="w-full rounded p-2 text-black" />
            )}
            <div className="flex gap-2">
              <button onClick={() => confirm(true)} disabled={busy || (pending.risk === 'danger' && reason.trim().length < 4)}
                className="flex-1 rounded p-2 font-bold disabled:opacity-40" style={{ background: '#1FC8B4', color: '#0B1020' }}>تأكيد التنفيذ</button>
              <button onClick={() => confirm(false)} className="flex-1 rounded p-2 font-bold" style={{ background: '#2a2f45' }}>إلغاء</button>
            </div>
          </div>
        )}
        {busy && <p className="opacity-60">جاري التنفيذ...</p>}
        <div ref={end} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="اكتب أمرك بالعربي..." disabled={busy || !!pending}
          className="flex-1 rounded-lg p-3 text-black" />
        <button type="submit" disabled={busy || !!pending} className="rounded-lg px-4 font-bold disabled:opacity-40" style={{ background: '#E9B949', color: '#0B1020' }}>إرسال</button>
      </form>
    </main>
  );
}
