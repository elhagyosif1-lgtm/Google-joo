'use client';
import { useEffect, useState } from 'react';

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// يسجّل الـ Service Worker ويعرض زر "ثبّت التطبيق" عندما يكون متاحاً
export default function PWA() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    const onInstalled = () => setDone(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt || done) return null;
  return (
    <button
      onClick={async () => { await evt.prompt(); setEvt(null); }}
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold shadow-lg"
      style={{ background: '#E9B949', color: '#0B1020' }}
    >
      ثبّت Jo1 على شاشتك
    </button>
  );
}
