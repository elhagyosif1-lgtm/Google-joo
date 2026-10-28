-- Jo1 v4: قسم الألعاب ونقاط اللاعبين. شغّله بعد migration_v3.sql (آمن لو اتشغل تاني).
create table if not exists game_scores (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  game text not null check (game in ('xo','2048')),
  score int not null check (score >= 0 and score <= 10000000),
  created_at timestamptz not null default now()
);
create index if not exists game_scores_game_score on game_scores(game, score desc);
alter table game_scores enable row level security;
drop policy if exists "scores_read" on game_scores;
create policy "scores_read" on game_scores for select using (true);
drop policy if exists "scores_insert_own" on game_scores;
create policy "scores_insert_own" on game_scores for insert with check (auth.uid() = user_id);
