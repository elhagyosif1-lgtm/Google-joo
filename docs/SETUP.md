# التركيب من الصفر — بالترتيب

اتبع الخطوات بنفس الترتيب. كل خطوة تعتمد على اللي قبلها.

## 0) ما تحتاجه
- حساب [Supabase](https://supabase.com/dashboard)
- حساب [Vercel](https://vercel.com/dashboard) مربوط بـ GitHub (`elhagyosif1-lgtm/Google-joo`)
- حساب [Render](https://dashboard.render.com) أو [Railway](https://railway.com/dashboard) للـ worker
- حساب [LiveKit Cloud](https://cloud.livekit.io) للبث المباشر
- حساب [Google Cloud Console](https://console.cloud.google.com/apis/credentials) لتسجيل الدخول بجوجل
- حساب [Anthropic Console](https://console.anthropic.com/settings/keys) لمفتاح التيرمنال الذكي (يوضع في مشروع control فقط)
- تطبيق [ntfy](https://ntfy.sh) على جوالك (اختياري، للإشعارات)

## 1) قاعدة البيانات — Supabase
افتح [SQL Editor](https://supabase.com/dashboard) في مشروعك، ونفّذ الملفات **بهذا الترتيب بالضبط**:

1. `supabase/01_schema.sql`
2. `supabase/02_gifts_seed.sql`
3. `supabase/03_migration_v2.sql`
4. `supabase/04_migration_v3.sql`
5. `supabase/05_migration_v4.sql` (الألعاب)
6. `supabase/06_migration_v5.sql` (سجل تدقيق الأدمن)
7. `supabase/07_theme_and_admin.sql` (ألوان المنصة)

**ملاحظة:** الملف `03` ينشئ جداول التعليقات والمتابعة والبلاغات، و`04` يضيف HLS والحظر وسياسات التخزين. تشغيله قبل `03` يفشل.

## 2) تسجيل الدخول بجوجل — Supabase + Google Cloud
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID (Web application).
2. Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. انسخ Client ID و Client Secret.
4. Supabase → Authentication → Providers → Google → فعّله والصق القيم.
5. Supabase → Authentication → URL Configuration:
   - **Site URL:** رابط المنصة على Vercel (مثال: `https://jo1.vercel.app`)
   - **Redirect URLs:** نفس الرابط + `/**`

## 3) مشروع المنصة — Vercel
1. Vercel → Add New → Project → اختر المستودع.
2. **Root Directory:** `apps/platform` ← مهم جداً.
3. Environment Variables (انظر `docs/ENV.md`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`
4. Deploy.
5. Vercel → Settings → Git → **Deploy Hooks** → أنشئ hook باسم `control` وانسخ رابطه. ستحتاجه في الخطوة 6.

## 4) الـ Worker — تحويل الفيديو (اختياري لكن موصى به)
بدونه كل الفيديوهات تعمل بملف mp4 الأصلي. مع الـ worker تتحول تلقائياً إلى HLS بجودتين.

1. [Render](https://dashboard.render.com) → New → Background Worker → اختر المستودع.
2. **Root Directory:** `services/worker` · **Runtime:** Docker (يستخدم `Dockerfile`).
3. Environment:
   - `SUPABASE_URL` = رابط مشروع Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = مفتاح service_role (سري جداً)
4. شغّل **نسخة واحدة فقط**.

## 5) إعداد الأدمن الأول
في SQL Editor:

```sql
-- 1) سجّل دخولك مرة واحدة بجوجل من المنصة أولاً (ينشئ profile لك)
-- 2) بعدها:
update profiles set is_admin = true where username = 'اسمك';
update app_settings set vodafone_number = 'رقمك' where id = 1;
```

## 6) لوحة التحكم المنفصلة — Vercel (مشروع ثانٍ)
1. Vercel → Add New → Project → نفس المستودع مرة ثانية.
2. **Root Directory:** `apps/control` ← مهم.
3. Environment Variables (انظر `docs/ENV.md` قسم Control):
   - `ADMIN_EMAIL` = بريدك (هذا الحساب الوحيد المسموح)
   - `VERCEL_PROJECT_ID` = **معرّف مشروع المنصة** (من Settings → General في مشروع المنصة، ليس مشروع control)
   - `DEPLOY_HOOK_URL` = رابط الـ Deploy Hook من الخطوة 3.5
   - `NTFY_TOPIC` = اسم طويل عشوائي
   - `VERCEL_TOKEN` (توكن محدود للمشروع فقط، بتاريخ انتهاء)
   - `VERCEL_TEAM_ID` (اختياري، إذا المشروع تحت فريق)
   - `ANTHROPIC_API_KEY` (مطلوب، للتيرمنال الذكي)
   - `ANTHROPIC_MODEL` (اختياري)
4. في Supabase → Authentication → Users → أنشئ مستخدم بالبريد `ADMIN_EMAIL` وكلمة مرور طويلة، وفعّل تأكيد البريد.
5. افتح رابط مشروع control وسجّل الدخول.

## 7) التحقق من الربط
- المنصة: سجّل دخول بجوجل → تظهر تبويبات الرئيسية/لايف/المحفظة/المبدع/حسابي/ألعاب (+ أدمن لو أنت admin).
- الألعاب: تبويب **ألعاب** في الأسفل.
- التيرمنال الذكي: افتح مشروع control من الجوال وسجّل دخولك. كل الأوامر هناك (`stats`, `user_lookup`, `ban_user`, `set_theme`...).
- الفيديو: ارفع فيديو تجريبي. يظهر فوراً بـ mp4، وبعد دقيقة يصير HLS إذا الـ worker شغّال (تحقق من `videos.status` = `ready`).
- لوحة التحكم: أمر `status` يرجع أرقام المستخدمين والفيديوهات.

## 8) استكشاف الأخطاء
| العَرَض | السبب المحتمل |
|---|---|
| تسجيل جوجل يرجع لصفحة خطأ | Redirect URL غير مضاف في Supabase |
| الصفحة بيضاء عند البناء | متغيرات `NEXT_PUBLIC_SUPABASE_*` ناقصة في Vercel |
| `SERVER_MISCONFIGURED` | `SUPABASE_SERVICE_ROLE_KEY` ناقص في مشروع المنصة |
| التيرمنال يقول `ANTHROPIC_API_KEY غير مضبوط` | المفتاح ناقص في مشروع control |
| لون تغيّر ولا يظهر | الصفحة قديمة: حدّثها، أو الأمر `reset_theme` لإرجاع الافتراضي |
| `redeploy` يفشل في control | `DEPLOY_HOOK_URL` ناقص أو منسوخ من مشروع خاطئ |
| `set_env` يعمل لكن التغيير لا يظهر | يحتاج نشر جديد (أمر `redeploy`) |
| فيديو يبقى `pending` | الـ worker متوقف أو بدون `SUPABASE_SERVICE_ROLE_KEY` |
| `BAD_VIDEO_URL` عند الرفع | الرابط ليس من bucket `videos` في مجلد المستخدم |
