"use client";

import React, { useState, useRef } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkles,
  Flame,
  Coins,
  Radio,
  ShieldCheck,
  Gamepad2,
  Bot,
  Compass,
  User,
  Wallet,
  KeyRound,
  ChevronLeft,
  Award,
  Lock,
  ExternalLink,
  X,
  Plus,
} from "lucide-react";

export default function Jo1MasterPlatform() {
  const [activeTab, setActiveTab] = useState<"feed" | "discover" | "gemini" | "game" | "profile">("feed");
  const [subView, setSubView] = useState<"none" | "wallet" | "vault" | "cosmic" | "pk">("none");
  const [geminiRole, setGeminiRole] = useState("مستشار المحتوى والتريندات");
  const [walletCoins] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(210400);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white select-none">
      <div className="relative mx-auto flex h-full w-full max-w-[440px] flex-col justify-between overflow-hidden border-x border-zinc-900 bg-[#08080c] shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent px-3 pt-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubView("wallet")}
              className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-600/30 to-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300"
            >
              <Coins size={12} className="text-amber-400" />
              <span>شحن الآن</span>
              
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubView("pk")}
              className="flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-600/80 px-2.5 py-1 text-[10px] font-black text-white shadow-lg animate-pulse"
            >
              <Radio size={12} />
              <span>تحدي PK Live</span>
            </button>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-rose-600 text-[10px] font-black">
              52
            </div>
          </div>
        </header>

        {activeTab === "feed" && subView === "none" && (
          <div className="relative flex h-full w-full items-center justify-center bg-black">
            <video
              ref={videoRef}
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted={false}
              playsInline
            />

            <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
              <div className="relative flex flex-col items-center">
                <div
                  onClick={() => setActiveTab("profile")}
                  className="h-11 w-11 cursor-pointer rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 p-0.5 shadow-xl"
                >
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                    className="h-full w-full rounded-full object-cover"
                    alt="profile"
                  />
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLiked((prev) => !prev);
                  setLikeCount((p) => (isLiked ? p - 1 : p + 1));
                }}
                className="flex flex-col items-center transition active:scale-75"
              >
                <div className="rounded-full border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
                  <Heart size={26} className={isLiked ? "fill-rose-500 text-rose-500" : "text-white"} />
                </div>
                <span className="mt-1 font-mono text-[11px] font-bold">{likeCount.toLocaleString()}</span>
              </button>

              <button type="button" className="flex flex-col items-center transition active:scale-75">
                <div className="rounded-full border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
                  <MessageCircle size={26} />
                </div>
                <span className="mt-1 font-mono text-[11px] font-bold">6.4K</span>
              </button>

              <button type="button" className="flex flex-col items-center transition active:scale-75">
                <div className="rounded-full border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
                  <Bookmark size={26} />
                </div>
                <span className="mt-1 font-mono text-[11px] font-bold">45.1K</span>
              </button>

              <button type="button" className="flex flex-col items-center transition active:scale-75">
                <div className="rounded-full border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
                  <Share2 size={26} />
                </div>
                <span className="mt-1 font-mono text-[11px] font-bold">19.8K</span>
              </button>

              <div
                className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border border-zinc-700 bg-zinc-900"
                style={{ animationDuration: "6s" }}
              >
                <div className="h-4 w-4 rounded-full bg-rose-600" />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-16 z-20 bg-gradient-to-t from-black via-black/50 to-transparent px-4 pb-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-extrabold text-cyan-400">@tech_kareem</span>
                <span className="rounded-full bg-gradient-to-r from-amber-400 to-rose-600 px-2 py-0.5 text-[9px] font-black">👑 52</span>
                <span className="text-xs text-zinc-400">· منذ ساعتين</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-100 line-clamp-2">
                أسرار البرمجة وتطبيقات الذكاء الاصطناعي في 2026! كيف تبني منصتك الخاصة في دقائق؟ 🚀💻 #Jo1
              </p>
              <div className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur-md">
                <span>🎵 Future Bass Trend - SynthMaster</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "discover" && subView === "none" && (
          <div className="h-full w-full overflow-y-auto p-4 pb-20 pt-16 no-scrollbar">
            <input
              type="text"
              placeholder="ابحث عن فيديوهات، وسوم، صناع محتوى أو..."
              className="mb-3 w-full rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 text-xs text-white outline-none"
            />

            <div className="flex gap-2 overflow-x-auto pb-2 text-[11px] font-bold no-scrollbar">
              <span className="whitespace-nowrap rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-rose-400">🔥 #التريند_اليوم</span>
              <span className="whitespace-nowrap rounded-full border border-cyan-500/30 bg-cyan-500/20 px-3 py-1 text-cyan-400">#Jo1 (1.8B)</span>
              <span className="whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-amber-400">#إبداع_2026</span>
            </div>

            <h3 className="my-3 text-xs font-black text-zinc-400">فيديوهات مقترحة لك 🔥</h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative aspect-[9/14] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300" className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold">▶ 1450K</span>
              </div>
              <div className="relative aspect-[9/14] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300" className="h-full w-full object-cover" alt="" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold">▶ 680K</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "gemini" && subView === "none" && (
          <div className="flex h-full w-full flex-col justify-between p-4 pb-20 pt-16">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-2 text-indigo-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-black text-white">
                      <span>استوديو ذكاء Gemini</span>
                      <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-mono">PRO 2026</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">محادثة متعددة الأدوار · بحث Google · صوت حي</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2.5">
                <span className="mb-1 block text-[10px] text-zinc-400">الدور النشط:</span>
                <select
                  value={geminiRole}
                  onChange={(e) => setGeminiRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black/60 p-2 text-xs font-bold text-amber-300 outline-none"
                >
                  <option>🌟 مستشار المحتوى والتريندات</option>
                  <option>🎬 كاتب السيناريو الإبداعي</option>
                  <option>💰 خبير أرباح البث والهدايا</option>
                  <option>📊 محلل خوارزميات المنصة</option>
                </select>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-zinc-900/60 p-3 text-xs leading-relaxed text-zinc-200">
                أهلاً بك يا <b>يوسف الحج 🌟</b>! أنا رفيقك ومستشارك الذكي المدعوم بنماذج Gemini 3.8 Flash Argon. كيف أساعدك اليوم في صناعة محتوى أسطوري ومضاعفة أرباح البث المباشر؟
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="اكتب سيناريو بدقة واضحة واطلب ما تشاء..."
                className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white outline-none"
              />
              <button type="button" className="rounded-2xl bg-indigo-600 px-4 text-xs font-bold text-white active:scale-95">
                إرسال
              </button>
            </div>
          </div>
        )}

        {activeTab === "game" && subView === "none" && (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 pb-20 pt-16 text-center">
            <span className="mb-3 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-300">
              ✨ JO1 CYBER ARENA · 3D THREE.JS
            </span>
            <h2 className="mb-2 bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 bg-clip-text text-2xl font-black text-transparent">
              تحدي الأبطال والـ 3D
            </h2>
            <p className="mb-6 max-w-xs text-xs text-zinc-400">
              تحكم في مركبتك الفضائية، اجمع هدايا التيك توك الأسطورية، واربح عملات حقيقية تضاف مباشرة لمحفظة فودافون كاش!
            </p>
            <button
              type="button"
              onClick={() => alert("جاري إطلاق محرك Three.js 3D الفضائي! 🚀")}
              className="w-full max-w-xs rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-600 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95"
            >
              ▶ ابدأ التحدي الآن (اضغط Space)
            </button>
          </div>
        )}

        {activeTab === "profile" && subView === "none" && (
          <div className="h-full w-full overflow-y-auto p-4 pb-20 pt-14 no-scrollbar">
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 p-1 shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200" className="h-full w-full rounded-full object-cover" alt="" />
                </div>
                <div className="absolute inset-x-0 -bottom-1 flex justify-center">
                  <span className="rounded-full border border-white bg-gradient-to-r from-amber-400 to-rose-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                    🔥 52
                  </span>
                </div>
              </div>

              <h2 className="mt-1 text-lg font-black">يوسف الحج 🌟</h2>
              <p className="font-mono text-xs text-zinc-400">@youssef_official</p>

              <span className="mt-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-0.5 text-[10px] font-bold text-amber-300">
                👑 داعم إمبراطوري أسطوري (Level 52)
              </span>

              <div className="my-3 w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-900 p-2">
                <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                  <span>أعلى مستوى دعم في العالم</span>
                  <span className="font-mono text-amber-300">15.8M / 20M XP</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full w-[79%] bg-gradient-to-r from-amber-400 to-rose-600" />
                </div>
              </div>

              <div className="my-2 flex w-full max-w-xs justify-around text-center">
                <div>
                  <b className="font-mono text-sm font-black">240</b>
                  <span className="block text-[9px] text-zinc-500">يتابع</span>
                </div>
                <div>
                  <b className="font-mono text-sm font-black">184.5K</b>
                  <span className="block text-[9px] text-zinc-500">متابع</span>
                </div>
                <div>
                  <b className="font-mono text-sm font-black">3.4M</b>
                  <span className="block text-[9px] text-zinc-500">إعجاب</span>
                </div>
              </div>

              <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubView("wallet")}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 py-2.5 text-xs font-black text-black shadow-md"
                >
                  💳 شحن وسحب الأرباح
                </button>
                <button
                  type="button"
                  onClick={() => setSubView("vault")}
                  className="rounded-xl border border-amber-500/30 bg-zinc-900 py-2.5 text-xs font-bold text-amber-300"
                >
                  🔒 الخزنة الرقمية
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSubView("cosmic")}
                className="mt-2 flex w-full max-w-xs items-center justify-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/60 py-2.5 text-xs font-bold text-purple-300"
              >
                <span>✨ البوابة الكونية (100)</span>
              </button>
            </div>
          </div>
        )}

        {subView === "wallet" && (
          <div className="absolute inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-black/95 p-4 pt-12">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-black text-white">المحفظة — وضع تجريبي غير متصل</h3>
                <button type="button" onClick={() => setSubView("none")} className="rounded-full bg-zinc-800 p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2 rounded-3xl border border-rose-500/40 bg-gradient-to-tr from-rose-900/60 via-zinc-900 to-black p-5 shadow-xl">
                <span className="block text-[10px] text-zinc-400">الرصيد غير متاح: لا يوجد اتصال موثّق بالمحفظة</span>
                <h2 className="font-mono text-3xl font-black text-white">
                  — <span className="text-sm font-normal text-amber-300">غير متاح 🪙</span>
                </h2>
                <div className="flex justify-between border-t border-white/10 pt-2 font-mono text-xs">
                  <span className="font-bold text-amber-300">لا توجد أرصدة مالية حقيقية مفعّلة</span>
                </div>
              </div>

              <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs leading-6 text-amber-200">الشحن والسحب متوقفان في هذه النسخة. لا ترسل أموالاً أو بيانات دفع؛ لن يتم تسجيل أي عملية مالية حالياً.</p>
            </div>

            <button type="button" disabled className="w-full cursor-not-allowed rounded-xl bg-zinc-700 py-3 text-xs font-black text-zinc-300">الشحن غير متاح حالياً</button>
          </div>
        )}

        {subView === "vault" && (
          <div className="absolute inset-0 z-50 overflow-y-auto bg-black/95 p-4 pt-12">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-300">
                <KeyRound size={16} /> الخزنة الرقمية الآمنة (Digital Vault)
              </h3>
              <button type="button" onClick={() => setSubView("none")} className="rounded-full bg-zinc-800 p-1">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <b className="text-xs text-white">كوبون خصم الشحن الأول</b>
                  <span className="text-[10px] font-bold text-amber-400">+20% عملات إضافية</span>
                </div>
                <span className="rounded border border-zinc-700 bg-black px-2 py-0.5 font-mono text-xs text-cyan-300">ATHAR-2025</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <b className="text-xs text-white">باقة الداعم الإمبراطوري 52</b>
                  <span className="text-[10px] font-bold text-emerald-400">عضوية دائمة</span>
                </div>
                <span className="rounded border border-zinc-700 bg-black px-2 py-0.5 font-mono text-xs text-cyan-300">JO1-EMPEROR-52</span>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <b className="text-xs text-white">قسيمة إطلاق مجسم الأسد 3D</b>
                  <span className="text-[10px] font-bold text-rose-400">مجاني</span>
                </div>
                <span className="rounded border border-zinc-700 bg-black px-2 py-0.5 font-mono text-xs text-cyan-300">LION-KING-FREE</span>
              </div>
            </div>
          </div>
        )}

        {subView === "pk" && (
          <div className="absolute inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 p-3 pt-6">
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-black animate-pulse">تحدي PK Live</span>
                <span className="font-mono text-xs text-zinc-400">02:44</span>
              </div>
              <button type="button" onClick={() => setSubView("none")} className="rounded-full bg-zinc-800 p-1">
                <X size={16} />
              </button>
            </div>

            <div className="relative grid flex-1 grid-cols-2 gap-1 bg-zinc-900">
              <div className="relative flex items-center justify-center overflow-hidden bg-zinc-950">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" className="h-full w-full object-cover opacity-80" alt="" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold">المتحدي السوري</span>
                <span className="absolute left-2 top-2 rounded bg-rose-600 px-2 py-0.5 font-mono text-xs font-black">980 pt</span>
              </div>

              <div className="relative flex items-center justify-center overflow-hidden bg-zinc-950">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" className="h-full w-full object-cover opacity-80" alt="" />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold">الملك ليث</span>
                <span className="absolute right-2 top-2 rounded bg-blue-600 px-2 py-0.5 font-mono text-xs font-black">1,250 pt</span>
              </div>
            </div>

            <div className="h-36 overflow-y-auto space-y-1.5 border-t border-zinc-800 bg-zinc-950/90 p-3 text-xs">
              <div><b className="text-cyan-400">سارة خالد:</b> منور البث يا بطل! 🔥</div>
              <div><b className="text-amber-400">أحمد التميمي:</b> ما شاء الله البث عالي الدقة جداً 👏</div>
              <div className="font-bold text-rose-400">👑 يوسف الحج [LVL 52]: أرسل دعم أسطوري الآن!</div>
            </div>
          </div>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-14 max-w-[440px] items-center justify-around border-t border-zinc-900 bg-black/95 px-2 text-[10px] font-bold text-zinc-500 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setActiveTab("feed");
              setSubView("none");
            }}
            className={`flex flex-col items-center ${activeTab === "feed" && subView === "none" ? "text-white" : "hover:text-white"}`}
          >
            <Compass size={18} />
            <span className="mt-1">الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("discover");
              setSubView("none");
            }}
            className={`flex flex-col items-center ${activeTab === "discover" ? "text-white" : "hover:text-white"}`}
          >
            <Sparkles size={18} />
            <span className="mt-1">استكشف</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView("pk")}
            className="flex h-7 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-white to-rose-500 text-black shadow-md active:scale-90"
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("gemini");
              setSubView("none");
            }}
            className={`flex flex-col items-center ${activeTab === "gemini" ? "text-indigo-400" : "hover:text-white"}`}
          >
            <Bot size={18} />
            <span className="mt-1">ذكاء Gemini</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("profile");
              setSubView("none");
            }}
            className={`flex flex-col items-center ${activeTab === "profile" && subView === "none" ? "text-white" : "hover:text-white"}`}
          >
            <User size={18} />
            <span className="mt-1">صفحتي</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
