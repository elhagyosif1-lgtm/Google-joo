import { createClient, SupabaseClient } from '@supabase/supabase-js';

// عميل بصلاحيات كاملة: يُستخدم فقط داخل السيرفر (API routes). لا تستورده في أي ملف 'use client'.
export function adminDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SERVER_MISCONFIGURED');
  return createClient(url, key, { auth: { persistSession: false } });
}
