import { createClient } from '../../lib/supabase/client';

// Use the SSR-aware browser client so Supabase Auth persists through the
// same cookie-backed session checked by the protected server page.
export const sb = createClient();
