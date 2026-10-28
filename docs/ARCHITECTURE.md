# الهيكل والربط

## الصورة الكاملة

```mermaid
flowchart LR
  subgraph Users
    U[المستخدم<br/>جوال / متصفح]
    A[الأدمن]
  end

  subgraph Vercel
    P[apps/platform<br/>المنصة]
    C[apps/control<br/>لوحة التحكم]
  end

  subgraph Supabase
    DB[(Postgres + RLS<br/>+ RPC)]
    AUTH[Auth<br/>Google]
    ST[(Storage<br/>bucket: videos)]
  end

  W[services/worker<br/>ffmpeg → HLS]
  LK[LiveKit Cloud<br/>البث المباشر]
  AI[Anthropic API]
  NT[ntfy<br/>إشعارات الجوال]

  U -->|anon key + JWT| P
  P -->|تسجيل الدخول| AUTH
  P -->|قراءة/كتابة بصلاحية المستخدم| DB
  P -->|رفع mp4| ST
  P -->|/api/livekit-token| LK

  A --> C
  C -->|Bearer JWT → ADMIN_EMAIL| C
  C -->|service role| DB
  C -->|Vercel API: set_env| P
  C -->|Deploy Hook| P
  C -->|plan الأمر (قائمة مغلقة)| AI
  C -->|notify| NT

  W -->|يقرأ pending + service role| DB
  W -->|يكتب master.m3u8 و ts| ST
  W -->|يحدّث hls_url, status| DB
```

## من يكلّم مين (جدول الربط)

| من | إلى | كيف | المتغيرات | ملاحظة |
|---|---|---|---|---|
| المنصة (المتصفح) | Supabase | `@supabase/supabase-js` بالـ anon key | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | الحماية في RLS وسياسات الجداول |
| المنصة `/api/livekit-token` | LiveKit | إصدار توكن غرفة | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | |
| المنصة | Google | تسجيل دخول OAuth عبر Supabase | إعداد في Supabase Dashboard | Redirect URL لازم يطابق الدومين |
| control `/api/control` (التيرمنال الوحيد) | Supabase | service role بعد التحقق من `ADMIN_EMAIL` | `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` | |
| control | Vercel API | تعيين env للإنتاج | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (= **المنصة**), `VERCEL_TEAM_ID` | |
| control | Vercel Deploy Hook | إعادة نشر المنصة | `DEPLOY_HOOK_URL` (من مشروع المنصة) | |
| control | ntfy | إشعار للجوال | `NTFY_TOPIC` | |
| worker | Supabase | يقرأ `status='pending'`، يكتب `hls_url` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | نسخة واحدة فقط |

## تدفق الفيديو
1. المستخدم يرفع `mp4` إلى bucket `videos` في مجلد `<user_id>/`.
2. الصف يُدرج في `videos` مع `status='pending'` (trigger `videos_guard` يجبر القيم الآمنة ويرفض أي رابط من خارج التخزين).
3. الفيديو يظهر فوراً بالـ mp4 الأصلي.
4. الـ worker يأخذ الصف بـ claim ذري (`pending → processing`)، يحوّله إلى HLS، يرفع `master.m3u8` وقطع `.ts` إلى `<user_id>/hls/<video_id>/`.
5. يحدّث `hls_url` و `duration` و `status='ready'`. إذا فشل: `status='failed'` ويبقى المشغّل على mp4.

## تدفق الأوامر من الجوال
- جوال → control → الذكاء يختار أمراً من قائمة `commands.ts` ويعبّي معاملاته → أوامر القراءة تنفذ مباشرة، وأوامر التغيير تحتاج ضغطة تأكيد. لا SQL حر ولا shell.

## نقاط ضعف معروفة (مرتبة بالأهمية)
1. **لا يوجد runner للـ migrations.** الترتيب يعتمد على تشغيل الملفات يدوياً. الحل المقترح لاحقاً: Supabase CLI مع مجلد `supabase/migrations` بطابع زمني.
2. **التيرمنال واحد فقط (control).** تم حذف لوحة الأدمن الثانية داخل المنصة لتقليل سطح الهجوم. مفتاح `VERCEL_TOKEN` موجود في control فقط. تسريب مفتاح control هو أخطر حادثة ممكنة، لذلك حماية حساب `ADMIN_EMAIL` (كلمة مرور طويلة + تحقق بريد + 2FA من Supabase إن توفر) أولوية.
3. **الـ worker نسخة واحدة:** `reset` عند البداية يعيد أي `processing` إلى `pending`. تشغيل نسختين سيكرر التحويل.
4. **`set_env` يكتب للإنتاج فقط** ويحتاج `redeploy` بعده.
