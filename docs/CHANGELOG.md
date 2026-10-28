# سجل التغييرات

## v4 — إضافات فوق v3
- package.json و tsconfig.json و next.config.mjs و postcss.config.mjs (كانت ناقصة، والمشروع ما يبنى بدونها)
- app/layout.tsx (RTL عربي + خط Tajawal) و app/globals.css (Tailwind v4)
- app/not-found.tsx
- .gitignore

التركيب:
1) npm install
2) ضع متغيرات البيئة في .env.local (انظر .env.example)
3) npm run typecheck ثم npm run dev
4) نفّذ SQL بالترتيب: schema.sql ثم gifts_seed.sql ثم migration_v2.sql ثم migration_v3.sql

ملاحظة: الألعاب والأخبار والشات الخاص والواقع الافتراضي/3D لم تُضف بعد، وهي المرحلة التالية.

الإصدار v5:
- قسم الألعاب على /games: إكس أو ضد الكمبيوتر (ذكاء كامل minimax) و2048 (يدعم السحب باللمس والأسهم).
- لوحة أفضل اللاعبين، وحفظ النقاط في جدول game_scores.
- migration_v4.sql: شغّله بعد migration_v3.sql.

الإصدار v6 — تيرمنال الأدمن الذكي (/admin/console)
- الأدمن يكتب أمره بالعربي، والذكاء الاصطناعي يختار أمراً من سجل محدد ويعبّي معاملاته.
- الأوامر الحالية: stats، user_lookup، grant_bonus، ban_user، unban_user، delete_video، pending_deposits.
- الأوامر الكتابية والخطرة تحتاج تأكيد من الأدمن، والخطرة تحتاج سبباً مكتوباً.
- كل محاولة تُسجَّل في جدول admin_audit.
- migration_v5.sql: شغّله بعد migration_v4.sql.
- متغيرات Vercel الجديدة: ANTHROPIC_API_KEY (مطلوب)، SUPABASE_SERVICE_ROLE_KEY (مطلوب للسيرفر فقط)، ANTHROPIC_MODEL (اختياري).

حدود مقصودة: الذكاء ما ينفّذ SQL حر ولا أوامر نظام. كل قدرة جديدة تُضاف كأمر في app/lib/console-commands.ts.

الإصدار v7 — تطبيق على الجوال (PWA)
- public/manifest.webmanifest: يخلي Jo1 يتثبت على الشاشة الرئيسية ويفتح بدون شريط المتصفح.
- public/sw.js: يخزّن واجهة التطبيق والأيقونات فقط. لا يخزّن الفيديوهات ولا Supabase ولا /api.
- app/lib/pwa.tsx: يسجّل الـ Service Worker ويعرض زر "ثبّت Jo1" على أندرويد وكروم.
- على الآيفون: من سفاري اضغط مشاركة ثم "إضافة إلى الشاشة الرئيسية" (ما فيه زر تلقائي على iOS).
- ملاحظة: الـ Service Worker يشتغل بعد النشر على HTTPS فقط.

الإصدار النهائي (jo1-final):
- تسجيل الدخول بجوجل من شاشة الدخول (Supabase OAuth). يتطلب تفعيل Google في Supabase > Authentication > Providers مع Client ID و Secret من Google Cloud.
- يرجع المستخدم تلقائياً للموقع بعد الدخول، ولا يحتاج صفحة callback منفصلة.
- تأكد أن رابط الموقع مضاف في Supabase > Authentication > URL Configuration (Site URL وRedirect URLs).

## تنظيم المستودع (هذا الإصدار)
- نقل كل شيء إلى مونوريبو: `apps/platform`، `apps/control`، `services/worker`، `supabase/` مرقّم.
- إصلاح ربط: تبويب **ألعاب** صار ظاهراً في شريط المنصة (كان `/games` معزولاً).
- إصلاح ربط: زر **تيرمنال الأدمن الذكي** من تبويب الأدمن (كان `/admin/console` يُفتح بكتابة الرابط فقط).
- إصلاح: `.env.example` للمنصة صار يشمل `SUPABASE_SERVICE_ROLE_KEY` و`ANTHROPIC_*`.
- إضافة `docs/SETUP.md` و`docs/ARCHITECTURE.md` و`docs/ENV.md` و`.github/workflows/ci.yml`.
