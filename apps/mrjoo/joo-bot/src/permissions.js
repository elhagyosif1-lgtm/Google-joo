// صلاحيات البوت/الأدوات الإدارية — الخادم فقط.
// ضع ADMIN_ID في بيئة التشغيل، ولا تضعه في الواجهة الأمامية.
const ADMIN_ID = process.env.ADMIN_ID || '';

export function checkPermissions(userId) {
  if (!ADMIN_ID || userId !== ADMIN_ID) {
    console.warn(`تنبيه أمني: محاولة وصول غير مصرح بها للبوت من: ${userId || 'unknown'}`);
    return false;
  }
  return true;
}
