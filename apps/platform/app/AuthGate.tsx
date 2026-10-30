'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = url && anon ? createBrowserClient(url, anon) : null;

export default function AuthGate() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    const callbackUrl = window.location.origin + '/auth/callback';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl, queryParams: { access_type: 'offline', prompt: 'select_account' } },
    });
    if (error) { setError('تعذر بدء تسجيل الدخول. تحقق من إعداد Google OAuth.'); setBusy(false); }
  };

  return <main dir="rtl" className="min-h-screen grid place-items-center bg-[#08080c] p-6 text-white"><section className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-2xl font-black text-black">J</div><h1 className="text-2xl font-black">مرحباً بك في Jo1</h1><p className="mt-2 text-sm text-zinc-400">سجّل الدخول للمتابعة. محتوى المنصة غير متاح للزوار.</p>{!supabase ? <p className="mt-4 text-sm text-rose-400">إعدادات تسجيل الدخول غير مكتملة في بيئة النشر.</p> : <button disabled={busy} onClick={signIn} className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? 'جارٍ التحويل…' : 'المتابعة باستخدام Google'}</button>}{error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}</section></main>;
}
