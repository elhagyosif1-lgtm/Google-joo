'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Heart, HeartHandshake, Leaf, MapPin, Sparkles } from 'lucide-react';
import { sb } from '../lib/sb';

type Charity = {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string | null;
  impact_label: string | null;
  impact_value: string | null;
};

const accents = [
  'from-emerald-300/20 via-teal-400/10 to-transparent',
  'from-amber-300/20 via-orange-400/10 to-transparent',
  'from-sky-300/20 via-cyan-400/10 to-transparent',
  'from-rose-300/20 via-pink-400/10 to-transparent',
];

export default function ImpactHub() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCharities() {
      const { data, error } = await sb
        .from('impact_charities')
        .select('id, name, description, category, location, impact_label, impact_value')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!active) return;
      if (error) setLoadError(true);
      else setCharities((data ?? []) as Charity[]);
      setLoading(false);
    }

    void loadCharities();
    return () => { active = false; };
  }, []);

  return (
    <main dir="rtl" className="min-h-[100dvh] overflow-hidden bg-[#07120f] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),transparent_65%)]" />
      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-7 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-emerald-100 transition hover:bg-white/10">
          <ArrowRight size={16} /> رجوع إلى Jo1
        </Link>

        <section className="mt-10 grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
              <Sparkles size={14} /> مساحة الأثر الطيب
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
              محتواك يقرّبنا… <span className="bg-gradient-to-l from-emerald-200 to-teal-400 bg-clip-text text-transparent">والأثر يكمل الحكاية.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-emerald-50/70 sm:text-lg">
              اكتشف مبادرات خيرية مقترحة، وتعرّف على المجالات التي تستحق الدعم. نؤمن أن كل أثر يبدأ بخطوة واعية وشفافة.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm text-emerald-50/80">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><Heart size={16} className="text-rose-300" /> محتوى يصنع فرقاً</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><BadgeCheck size={16} className="text-emerald-300" /> شفافية قبل أي دعم</span>
            </div>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[19rem] items-center justify-center rounded-full border border-emerald-200/10 bg-gradient-to-br from-emerald-300/10 to-teal-900/10 shadow-[0_0_100px_rgba(16,185,129,0.12)]">
            <div className="absolute inset-5 rounded-full border border-dashed border-emerald-100/20" />
            <div className="absolute inset-12 rounded-full border border-emerald-100/10" />
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-emerald-300 to-teal-600 text-[#052019] shadow-2xl shadow-emerald-950/50 rotate-3">
              <HeartHandshake size={68} strokeWidth={1.5} />
            </div>
            <span className="absolute right-8 top-12 rounded-full bg-[#14352c] p-3 text-emerald-200"><Leaf size={20} /></span>
            <span className="absolute bottom-10 left-8 rounded-full bg-[#14352c] p-3 text-rose-200"><Heart size={18} /></span>
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-300">اختر مجالاً يهمك</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">مبادرات مقترحة</h2>
            </div>
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 sm:inline">تعرّف أولاً، وتحقق دائماً</span>
          </div>

          {loading && <div className="grid gap-4 sm:grid-cols-2"><div className="h-56 animate-pulse rounded-3xl bg-white/5" /><div className="h-56 animate-pulse rounded-3xl bg-white/5" /></div>}
          {!loading && loadError && <div role="status" className="rounded-2xl border border-amber-200/20 bg-amber-200/5 p-5 text-sm leading-7 text-amber-100/80">تعذر تحميل المبادرات الآن. حاول تحديث الصفحة لاحقاً.</div>}
          {!loading && !loadError && charities.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/60">لا توجد مبادرات منشورة حالياً. ستظهر المبادرات بعد مراجعتها وإضافتها من إدارة المنصة.</div>}

          {!loading && !loadError && charities.length > 0 && <div className="grid gap-4 sm:grid-cols-2">
            {charities.map((charity, index) => (
              <article key={charity.id} className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${accents[index % accents.length]} p-6 transition hover:-translate-y-1 hover:border-emerald-200/30`}>
                <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-white/[0.03] blur-2xl transition group-hover:bg-emerald-200/10" />
                <div className="relative flex items-start justify-between gap-4">
                  <span className="rounded-full border border-emerald-100/15 bg-black/20 px-3 py-1 text-xs font-bold text-emerald-100">{charity.category}</span>
                  <HeartHandshake size={21} className="text-emerald-200/80" />
                </div>
                <h3 className="relative mt-8 text-xl font-extrabold">{charity.name}</h3>
                <p className="relative mt-3 min-h-[3.5rem] text-sm leading-7 text-white/65">{charity.description}</p>
                {(charity.location || charity.impact_label) && <div className="relative mt-5 flex flex-wrap gap-2 text-xs text-white/55">
                  {charity.location && <span className="inline-flex items-center gap-1 rounded-lg bg-black/20 px-2.5 py-1.5"><MapPin size={13} />{charity.location}</span>}
                  {charity.impact_label && <span className="rounded-lg bg-black/20 px-2.5 py-1.5">{charity.impact_label}{charity.impact_value ? `: ${charity.impact_value}` : ''}</span>}
                </div>}
              </article>
            ))}
          </div>}
        </section>

        <aside className="mt-10 rounded-2xl border border-amber-200/15 bg-amber-100/[0.04] p-5 text-sm leading-7 text-amber-50/70">
          <strong className="text-amber-100">مهم:</strong> هذه مساحة للتعريف بالمبادرات فقط؛ لا تتم معالجة تبرعات أو تحويل أموال من Jo1 حالياً. تحقّق من تسجيل الجهة وقنواتها الرسمية قبل أي مساهمة، ولا ترسل بيانات الدفع أو كلمات المرور عبر الرسائل.
        </aside>
        <footer className="mt-8 text-center text-xs text-white/35">اترك أثراً طيباً — خطوة صغيرة، بمعنى كبير.</footer>
      </div>
    </main>
  );
}
