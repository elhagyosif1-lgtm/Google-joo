import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
export const supabase = createClient(url || 'http://localhost', key || 'x', {
  auth: { persistSession: false },
});

/** حفظ نسخة من تفاعلات الهدايا/التفاعل على الخادم فقط. */
export async function backupInteraction(userId, actionType, giftDetails = {}) {
  const { data, error } = await supabase
    .from('interactions_backup')
    .insert([{
      user_id: userId,
      action_type: actionType,
      details: giftDetails,
      created_at: new Date().toISOString(),
    }])
    .select()
    .maybeSingle();

  if (error) {
    console.error('خطأ في النسخ الاحتياطي:', error);
    return null;
  }
  return data;
}
