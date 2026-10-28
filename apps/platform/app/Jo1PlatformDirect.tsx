"use client";

import React, { useState, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Radio,
  Coins,
  Sparkles,
  CheckCircle2,
  Compass,
  User,
  Bot
} from "lucide-react";

// الفيديوهات الحقيقية من باك أب المنصة
const VIDEOS_FEED = [
  {
    id: "v1",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    creator: "tech_kareem",
    caption: "أسرار البرمجة وتطبيقات الذكاء الاصطناعي في 2026! كيف تبني منصتك الخاصة في دقائق؟ 🚀💻 #Jo1",
    likes: "210.4K",
    comments: "6,410",
    shares: "19.8K",
    music: "Cyber Beats - Future Bass Trend"
  },
  {
    id: "v2",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    creator: "hassan_comedy",
    caption: "لما تحاول تكون مودي�� وتتصور في الشارع والناس بتبص عليك 😂 منشن صاحبك اللي كده! 🎬",
    likes: "310.5K",
    comments: "8,900",
    shares: "44.0K",
    music: "Chic Runway Groove - Paris Vibes"
  },
  {
    id: "v3",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    creator: "sara_adventures",
    caption: "أفضل لقطة ركوب أمواج وتحدي تزلج لهذا الشهر! سرعة الموجة كانت خيالية 🏄‍♂️🔥",
    likes: "125.6K",
    comments: "3,200",
    shares: "8,900",
    music: "ألحان ليلية هادئة - Original Mix"
  }
];

// هدايا الأثر 3D
const GIFTS = [
  { id: "lion", name: "الأسد الملكي 🦁", cost: 18000, icon: "🦁" },
  { id: "universe", name: "اليونيفيرس 🌌", cost: 20000, icon: "🌌" },
  { id: "phoenix", name: "طائر العنقاء 🦅", cost: 16000, icon: "🦅" },
  { id: "meteor", name: "نيزك الألماس ☄️", cost: 7000, icon: "☄️" },
  { id: "crown", name: "تاج الملوك 👑", cost: 5500, icon: "👑" }
];

export default function Jo1PlatformDirect() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [coins, setCoins] = useState(100000);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [showGifts, setShowGifts] = useState(false);
  const [activeGiftAnim, setActiveGiftAnim] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"feed" | "profile" | "live">("feed");

  const sendGift = (g: typeof GIFTS[0]) => {
    if (coins < g.cost) {
      alert("⚠️ رصيد العملات غير كافٍ!");
      return;
    }
    setCoins(prev => prev - g.cost);
    setActiveGiftAnim(g.icon);
    setShowGifts(false);
    setTimeout(() => setActiveGiftAnim(null), 2500);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex justify-center items-center overflow-hidden font-sans select-none">
      
      <div className="relative w-full max-w-[440px] h-full bg-zinc-950 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* شريط الرأس المباشر والمحفظة */}
        <header className="absolute top-0 inset-x-0 z-30 p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/90 text-xs font-black animate-pulse">
              <Radio size={14} />
              <span>LIVE 4K</span>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full shadow-lg">
            <Coins size={16} className="text-amber-400" />
            <span className="text-sm font-black text-amber-300 font-mono">{coins.toLocaleString()}</span>
            <span className="text-[10px] text-zinc-300">عملة</span>
          </div>
        </header>

        {/* عرض الفيديوهات - مباشر وبدون أي تسجيل دخول */}
        <main className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            key={VIDEOS_FEED[currentIdx].id}
            src={VIDEOS_FEED[currentIdx].url}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={false}
            playsInline
          />

          {/* أنيميشن الهدية العملاقة عند إرسالها */}
          {activeGiftAnim && (
            <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center animate-bounce">
              <span className="text-9xl drop-shadow-[0_15px_35px_rgba(255,215,0,0.8)]">{activeGiftAnim}</span>
              <span className="mt-4 px-4 py-1.5 rounded-full bg-black/80 border border-amber-400/60 text-amber-300 font-black text-sm">
                👑 الداعم الإمبراطوري يوسف الحج أطلق هدية 3D!
              </span>
            </div>
          )}

          {/* أزرار التفاعل الجانبية */}
          <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-4">
            <button 
              onClick={() => {
                const vidId = VIDEOS_FEED[currentIdx].id;
                setLiked(p => ({ ...p, [vidId]: !p[vidId] }));
              }}
              className="flex flex-col items-center active:scale-75 transition"
            >
              <div className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <Heart size={26} className={liked[VIDEOS_FEED[currentIdx].id] ? "text-rose-500 fill-rose-500" : "text-white"} />
              </div>
              <span className="text-[11px] font-bold mt-1">{VIDEOS_FEED[currentIdx].likes}</span>
            </button>

            <button className="flex flex-col items-center active:scale-75 transition">
              <div className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <MessageCircle size={26} />
              </div>
              <span className="text-[11px] font-bold mt-1">{VIDEOS_FEED[currentIdx].comments}</span>
            </button>

            {/* زر الهدايا الرئيسي المتوهج */}
            <button 
              onClick={() => setShowGifts(true)}
              className="flex flex-col items-center active:scale-75 transition"
            >
              <div className="p-3.5 bg-gradient-to-tr from-amber-400 via-yellow-500 to-rose-600 rounded-full text-black shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse">
                <Gift size={26} className="stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black text-amber-400 mt-1">هدايا 3D</span>
            </button>

            <button className="flex flex-col items-center active:scale-75 transition">
              <div className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <Share2 size={26} />
              </div>
              <span className="text-[11px] font-bold mt-1">{VIDEOS_FEED[currentIdx].shares}</span>
            </button>
          </div>

          {/* تفاصيل الفيديو بالأسفل والتنقل */}
          <div className="absolute bottom-16 inset-x-0 z-20 px-4 pb-2 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide">@{VIDEOS_FEED[currentIdx].creator}</span>
              <CheckCircle2 size={16} className="text-sky-400 fill-sky-400/20" />
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-600 text-[9px] font-black">LVL 52</span>
            </div>
            <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
              {VIDEOS_FEED[currentIdx].caption}
            </p>

            {/* أزرار الانتقال بين الفيديوهات */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs text-zinc-400">
              <button 
                onClick={() => setCurrentIdx(p => (p > 0 ? p - 1 : VIDEOS_FEED.length - 1))}
                className="hover:text-white px-2 py-1 bg-white/5 rounded"
              >
                ▲ السابق
              </button>
              <span className="font-mono text-zinc-500">{currentIdx + 1} / {VIDEOS_FEED.length}</span>
              <button 
                onClick={() => setCurrentIdx(p => (p < VIDEOS_FEED.length - 1 ? p + 1 : 0))}
                className="hover:text-white px-2 py-1 bg-white/5 rounded"
              >
                التالي ▼
              </button>
            </div>
          </div>
        </main>

        {/* درج الهدايا المنبثق */}
        {showGifts && (
          <div className="absolute inset-x-0 bottom-0 z-50 bg-neutral-950/95 backdrop-blur-2xl border-t border-amber-500/40 p-4 rounded-t-3xl shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm flex items-center gap-1.5 text-amber-400">
                <Sparkles size={16} /> متجر هدايا الأثر 3D
              </h3>
              <button 
                onClick={() => setShowGifts(false)}
                className="text-xs text-zinc-400 hover:text-white bg-white/5 px-2.5 py-1 rounded-full"
              >
                ✕ إغلاق
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {GIFTS.map(g => (
                <button
                  key={g.id}
                  onClick={() => sendGift(g)}
                  className="flex flex-col items-center bg-white/5 hover:bg-white/10 active:scale-90 p-2 rounded-2xl border border-white/5 transition"
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span className="text-[9px] text-zinc-200 font-semibold mt-1 truncate w-full text-center">{g.name}</span>
                  <span className="text-[9px] text-amber-400 font-black">{g.cost.toLocaleString()} 🪙</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
