import { sb } from '../lib/sb';

export async function saveScore(game: 'xo' | '2048', score: number) {
  const { data } = await sb.auth.getUser();
  if (!data.user) return { ok: false, reason: 'سجّل الدخول لحفظ النقاط.' };
  const { error } = await sb.from('game_scores').insert({ user_id: data.user.id, game, score });
  return error ? { ok: false, reason: error.message } : { ok: true, reason: '' };
}

export async function topScores(game: 'xo' | '2048', limit = 10) {
  const { data } = await sb
    .from('game_scores')
    .select('score, profiles(username)')
    .eq('game', game)
    .order('score', { ascending: false })
    .limit(limit);
  return (data ?? []) as { score: number; profiles: { username: string } | null }[];
}
