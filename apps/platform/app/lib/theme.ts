// ألوان المنصة. مصدر واحد لكل الملفات. تُعدَّل من لوحة control عبر app_settings.theme.
export const C: Record<'ink' | 'card' | 'sand' | 'teal' | 'gold', string> = {
  ink: '#0B1020', card: '#121a33', sand: '#EFE6CF', teal: '#1FC8B4', gold: '#E9B949',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// يطبّق الألوان المحفوظة من قاعدة البيانات. يتجاهل أي مفتاح أو قيمة غير صالحة.
export function applyTheme(t: unknown) {
  if (!t || typeof t !== 'object') return;
  for (const [k, v] of Object.entries(t as Record<string, unknown>)) {
    if (k in C && typeof v === 'string' && HEX.test(v)) (C as Record<string, string>)[k] = v;
  }
}
