'use client';

import { useEffect, useState } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = url && anon ? createClient(url, anon) : null;

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError('تعذر بدء تسجيل الدخول. راجع إعدادات Google OAuth في Supabase.'); setBusy(false); }
  };

  if (!ready) return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#08080c] text-white">جارٍ التحقق من تسجيل الدخول…</main>;
  if (!supabase) return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#08080c] p-6 text-white"><section className="max-w-sm text-center"><h1 className="text-xl font-black">إعداد تسجيل الدخول غير مكتمل</h1><p className="mt-3 text-sm text-zinc-400">لم يتم تحميل المنصة لأن إعدادات Supabase العامة غير موجودة في بيئة النشر.</p></section></main>;
  if (!user) return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#08080c] p-6 text-white"><section className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-2xl font-black text-black">J</div><h1 className="text-2xl font-black">مرحباً بك في Jo1</h1><p className="mt-2 text-sm text-zinc-400">سجّل الدخول للمتابعة. محتوى المنصة محجوب عن الزوار.</p><button disabled={busy} onClick={signIn} className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? 'جارٍ التحويل…' : 'المتابعة باستخدام Google'}</button>{error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}</section></main>;
  return <>{children}</>;
}
