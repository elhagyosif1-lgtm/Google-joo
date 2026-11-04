'use client';

import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';

export default function ImpactShortcut() {
  return (
    <Link
      href="/impact"
      aria-label="افتح مساحة اترك أثراً"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-full border border-emerald-300/30 bg-[#10231f]/95 px-4 py-3 text-sm font-bold text-emerald-100 shadow-xl shadow-emerald-950/30 backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200/60"
    >
      <HeartHandshake size={18} aria-hidden="true" />
      <span>اترك أثراً</span>
    </Link>
  );
}
