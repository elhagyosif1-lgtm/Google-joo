import { cookies } from 'next/headers';
import AuthGate from './AuthGate';
import { createServerClient } from '@supabase/ssr';
import Jo1MasterPlatform from './Jo1MasterPlatform';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return <AuthGate />;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; the OAuth callback persists the session.
        }
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return <AuthGate />;

  return <Jo1MasterPlatform />;
}
