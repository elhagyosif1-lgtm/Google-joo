# Worker — تحويل الفيديو إلى HLS

يحوّل الفيديوهات `pending` إلى HLS بجودتين (360p و720p) تلقائياً.
التفاصيل والإعداد: [`docs/SETUP.md`](../../docs/SETUP.md) الخطوة 4.

- **Root Directory** في Render/Railway: `services/worker`
- **شغّل نسخة واحدة فقط.**
- محلياً (يحتاج ffmpeg): `npm install && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node worker.js`
