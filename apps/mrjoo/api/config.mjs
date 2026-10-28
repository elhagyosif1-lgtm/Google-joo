import { env, configured, GIFTS, COIN_PRICE, MIN_WITHDRAW, weekId } from './_lib/core.mjs';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    ok: true,
    live: configured(),
    supabaseUrl: env('SUPABASE_URL'),
    anonKey: env('SUPABASE_ANON_KEY'),
    adsenseClient: env('ADSENSE_CLIENT'),
    adsenseFeedSlot: env('ADSENSE_FEED_SLOT'),
    vodafoneNumber: env('VODAFONE_CASH_NUMBER'),
    video: env('CF_ACCOUNT_ID') ? 'cf' : 'supabase',
    livekit: !!env('LIVEKIT_URL'),
    coinPrice: COIN_PRICE,
    minWithdraw: MIN_WITHDRAW,
    week: weekId(),
    gifts: GIFTS,
  });
}
