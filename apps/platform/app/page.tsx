import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import AuthGate from './AuthGate';
import Jo1MasterPlatform from './Jo1MasterPlatform';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return <AuthGate />;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <AuthGate />;
  return <Jo1MasterPlatform />;
}
