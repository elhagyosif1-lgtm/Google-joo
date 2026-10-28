import 'server-only';
// كل الأسرار تُقرأ من متغيرات بيئة مشروع اللوحة في Vercel فقط.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  adminEmail: (process.env.ADMIN_EMAIL ?? '').toLowerCase(),
  vercelToken: process.env.VERCEL_TOKEN ?? '',
  vercelProjectId: process.env.VERCEL_PROJECT_ID ?? '',
  vercelTeamId: process.env.VERCEL_TEAM_ID ?? '',
  deployHook: process.env.DEPLOY_HOOK_URL ?? '',
  ntfyTopic: process.env.NTFY_TOPIC ?? '',
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
};
