"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Radio,
  Coins,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const VIDEOS_FEED = [
  {
    id: "v1",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    creator: "tech_kareem",
    caption: "أسرار البرمجة وتطبيقات الذكاء الاصطناعي في 2026! كيف تبني منصتك الخاصة في دقائق؟ 🚀💻 #Jo1",
    likes: "210.4K",
    comments: "6,410",
    shares: "19.8K",
    music: "Cyber Beats - Future Bass Trend",
  },
  {
    id: "v2",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    creator: "hassan_comedy",
    caption: "لما تحاول تكون موديل وتتصور في الشارع والناس بتبص عليك 😂 منشن صاحبك اللي كده! 🎬",
    likes: "310.5K",
    comments: "8,900",
    shares: "44.0K",
    music: "Chic Runway Groove - Paris Vibes",
  },
  {
    id: "v3",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    creator: "sara_adventures",
    caption: "أفضل لقطة ركوب أمواج وتحدي تزلج لهذا الشهر! سرعة الموجة كانت خيالية 🏄‍♂️🔥",
    likes: "125.6K",
    comments: "3,200",
    shares: "8,900",
    music: "ألحان ليلية هادئة - Original Mix",
  },
];

const GIFTS = [
  { id: "lion", name: "الأسد الملكي 🦁", cost: 18000, icon: "🦁" },
  { id: "universe", name: "اليونيفيرس 🌌", cost: 20000, icon: "🌌" },
  { id: "phoenix", name: "طائر العنقاء 🦅", cost: 16000, icon: "🦅" },
  { id: "meteor", name: "نيزك الألماس ☄️", cost: 7000, icon: "☄️" },
  { id: "crown", name: "تاج الملوك 👑", cost: 5500, icon: "👑" },
];

export default function Jo1PlatformDirect() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [coins, setCoins] = useState(100000);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [showGifts, setShowGifts] = useState(false);
  const [activeGiftAnim, setActiveGiftAnim] = useState<string | null>(null);

  const currentVideo = VIDEOS_FEED[currentIdx];

  const sendGift = (g: (typeof GIFTS)[number]) => {
    if (coins < g.cost) {
      alert("⚠️ رصيد العملات غير كافٍ!");
      return;
    }

    setCoins((prev) => prev - g.cost);
    setActiveGiftAnim(g.icon);
    setShowGifts(false);
    setTimeout(() => setActiveGiftAnim(null), 2500);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white select-none">
      <div className="relative mx-auto flex h-full w-full max-w-[440px] flex-col justify-between overflow-hidden bg-zinc-950 shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent p-4 pt-6">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3 py-1 text-xs font-black animate-pulse">
              <Radio size={14} />
              <span>LIVE 4K</span>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 shadow-lg backdrop-blur-md">
            <Coins size={16} className="text-amber-400" />
            <span className="font-mono text-sm font-black text-amber-300">{coins.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-300">عملة</span>
          </div>
        </header>

        <main className="relative h-full w-full bg-black">
          <video
            key={currentVideo.id}
            src={currentVideo.url}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted={false}
            playsInline
            preload="auto"
          />

          {activeGiftAnim && (
            <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center animate-bounce">
              <span className="text-9xl drop-shadow-[0_15px_35px_rgba(255,215,0,0.8)]">{activeGiftAnim}</span>
              <span className="mt-4 rounded-full border border-amber-400/60 bg-black/80 px-4 py-1.5 text-sm font-black text-amber-300">
                👑 الداعم الإمبراطوري يوسف الحج أطلق هدية 3D!
              </span>
            </div>
          )}

          <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
            <button
              type="button"
              aria-label="إعجاب"
              onClick={() => {
                const vidId = currentVideo.id;
                setLiked((prev) => ({ ...prev, [vidId]: !prev[vidId] }));
              }}
              className="flex flex-col items-center transition active:scale-75"
            >
              <div className="rounded-full border border-white/10 bg-black/50 p-3 shadow-lg backdrop-blur-md">
                <Heart
                  size={26}
                  className={liked[currentVideo.id] ? "fill-rose-500 text-rose-500" : "text-white"}
                />
              </div>
              <span className="mt-1 text-[11px] font-bold">{currentVideo.likes}</span>
            </button>

            <button type="button" className="flex flex-col items-center transition active:scale-75" aria-label="التعليقات">
              <div className="rounded-full border border-white/10 bg-black/50 p-3 shadow-lg backdrop-blur-md">
                <MessageCircle size={26} />
              </div>
              <span className="mt-1 text-[11px] font-bold">{currentVideo.comments}</span>
            </button>

            <button
              type="button"
              aria-label="إرسال هدية"
              onClick={() => setShowGifts(true)}
              className="flex flex-col items-center transition active:scale-75"
            >
              <div className="rounded-full bg-gradient-to-tr from-amber-400 via-yellow-500 to-rose-600 p-3.5 text-black shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse">
                <Gift size={26} className="stroke-[2.5]" />
              </div>
              <span className="mt-1 text-[10px] font-black text-amber-400">هدايا 3D</span>
            </button>

            <button type="button" className="flex flex-col items-center transition active:scale-75" aria-label="مشاركة">
              <div className="rounded-full border border-white/10 bg-black/50 p-3 shadow-lg backdrop-blur-md">
                <Share2 size={26} />
              </div>
              <span className="mt-1 text-[11px] font-bold">{currentVideo.shares}</span>
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-16 z-20 flex flex-col gap-2 bg-gradient-to-t from-black via-black/40 to-transparent px-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-wide">@{currentVideo.creator}</span>
              <CheckCircle2 size={16} className="fill-sky-400 text-sky-400/20" />
              <span className="rounded-full bg-gradient-to-r from-amber-400 to-rose-600 px-2 py-0.5 text-[9px] font-black">
                LVL 52
              </span>
            </div>

            <p className="text-xs leading-relaxed text-zinc-200 line-clamp-2">{currentVideo.caption}</p>

            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => setCurrentIdx((p) => (p > 0 ? p - 1 : VIDEOS_FEED.length - 1))}
                className="rounded bg-white/5 px-2 py-1 hover:text-white"
              >
                ▲ السابق
              </button>
              <span className="font-mono text-zinc-500">{currentIdx + 1} / {VIDEOS_FEED.length}</span>
              <button
                type="button"
                onClick={() => setCurrentIdx((p) => (p < VIDEOS_FEED.length - 1 ? p + 1 : 0))}
                className="rounded bg-white/5 px-2 py-1 hover:text-white"
              >
                التالي ▼
              </button>
            </div>
          </div>
        </main>

        {showGifts && (
          <div className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-amber-500/40 bg-neutral-950/95 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-400">
                <Sparkles size={16} /> متجر هدايا الأثر 3D
              </h3>
              <button
                type="button"
                onClick={() => setShowGifts(false)}
                className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {GIFTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => sendGift(g)}
                  className="flex flex-col items-center rounded-2xl border border-white/5 bg-white/5 p-2 transition hover:bg-white/10 active:scale-90"
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span className="mt-1 w-full truncate text-center text-[9px] font-semibold text-zinc-200">
                    {g.name}
                  </span>
                  <span className="text-[9px] font-black text-amber-400">{g.cost.toLocaleString()} ���</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
