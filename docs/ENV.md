# متغيرات البيئة

**القاعدة:** كل متغير يوضع في **مشروع المنصة المناسب فقط**. أي متغير مكتوب `SECRET` أو `SERVICE_ROLE` أو `TOKEN` أو `API_KEY` (عدا `NEXT_PUBLIC_`) لا يدخل Git ولا الواجهة.

## المنصة — `apps/platform` (Vercel)

| المتغير | عام؟ | مطلوب؟ | المصدر | ملاحظة |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | عام | نعم | Supabase → Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | عام | نعم | Supabase → Settings → API | آمن للواجهة لأن الحماية في RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **سري** | نعم (للتيرمنال) | Supabase → Settings → API | للسيرفر فقط. كان ناقصاً في `.env.example` القديم |
| `LIVEKIT_URL` | عام | نعم للبث | LiveKit Cloud | شكل `wss://...` |
| `LIVEKIT_API_KEY` | **سري** | نعم للبث | LiveKit Cloud | |
| `LIVEKIT_API_SECRET` | **سري** | نعم للبث | LiveKit Cloud | |
| `ANTHROPIC_API_KEY` | **سري** | نعم للتيرمنال | Anthropic Console | |
| `ANTHROPIC_MODEL` | عام | لا | — | الافتراضي `claude-sonnet-4-6` |

## لوحة التحكم — `apps/control` (Vercel، مشروع منفصل)

| المتغير | عام؟ | مطلوب؟ | ملاحظة |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | عام | نعم | نفس قيمة المنصة |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | عام | نعم | نفس قيمة المنصة |
| `SUPABASE_SERVICE_ROLE_KEY` | **سري** | نعم | لا يُعدّل من اللوحة نفسها (محمي في الكود) |
| `ADMIN_EMAIL` | خاص | نعم | الحساب الوحيد المسموح |
| `VERCEL_TOKEN` | **سري** | للـ `set_env` | توكن محدود للمشروع + تاريخ انتهاء |
| `VERCEL_PROJECT_ID` | خاص | للـ `set_env` | **معرّف مشروع المنصة** وليس control |
| `VERCEL_TEAM_ID` | خاص | لا | فقط إذا المشروع تحت فريق |
| `DEPLOY_HOOK_URL` | **سري** | للـ `redeploy` | من Settings → Git → Deploy Hooks لمشروع **المنصة** |
| `NTFY_TOPIC` | خاص | لا | اسم طويل عشوائي؛ من يعرفه يقرأ إشعاراتك |
| `ANTHROPIC_API_KEY` | **سري** | نعم | |
| `ANTHROPIC_MODEL` | عام | لا | |

## الـ Worker — `services/worker` (Render / Railway)

| المتغير | عام؟ | مطلوب؟ | ملاحظة |
|---|---|---|---|
| `SUPABASE_URL` | عام | نعم | رابط المشروع |
| `SUPABASE_SERVICE_ROLE_KEY` | **سري جداً** | نعم | يتجاوز RLS. لا تضعه إلا هنا |

الـ worker يحتاج `ffmpeg` و `ffprobe` (موجودان في `Dockerfile`).

## Supabase Dashboard (ليست env)
- Authentication → Providers → Google: Client ID + Secret
- Authentication → URL Configuration: Site URL + Redirect URLs
- Authentication → Users: إنشاء حساب `ADMIN_EMAIL`

## ما الذي يتغير عند كل تعديل؟
- تعديل متغير في Vercel → **يحتاج نشر جديد** (`redeploy` من control أو من Vercel).
- تعديل متغير في Render → إعادة تشغيل الخدمة.
