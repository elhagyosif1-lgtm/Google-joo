-- Jo1 v2: رفع حقيقي + متابعة + تعليقات + إشعارات + مشاهدات + بلاغات + فيد ذكي
-- شغّله مرة واحدة في Supabase SQL Editor بعد schema.sql و gifts_seed.sql (آمن لو اتشغل تاني).

alter table videos add column if not exists poster text;
alter table videos add column if not exists views int not null default 0;
alter table videos add column if not exists likes_count int not null default 0;
alter table videos add column if not exists comments_count int not null default 0;
update videos v set likes_count=(select count(*) from video_likes l where l.video_id=v.id);

-- التخزين
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('videos','videos',true,52428800,array['video/mp4','video/webm','video/quicktime','image/jpeg'])
on conflict(id) do update set public=true,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists videos_read on storage.objects; drop policy if exists videos_insert on storage.objects; drop policy if exists videos_delete on storage.objects;
create policy videos_read on storage.objects for select using(bucket_id='videos');
create policy videos_insert on storage.objects for insert to authenticated with check(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy videos_delete on storage.objects for delete to authenticated using(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);

-- الجداول
create table if not exists follows(follower_id uuid references profiles on delete cascade, following_id uuid references profiles on delete cascade, created_at timestamptz default now(), primary key(follower_id,following_id), check(follower_id<>following_id));
create table if not exists comments(id bigint generated always as identity primary key, video_id bigint references videos on delete cascade, user_id uuid references profiles on delete cascade, body text not null check(length(body) between 1 and 300), created_at timestamptz default now());
create index if not exists comments_video on comments(video_id,id desc);
create table if not exists notifications(id bigint generated always as identity primary key, user_id uuid references profiles on delete cascade, actor_id uuid references profiles on delete cascade, kind text not null, video_id bigint references videos on delete cascade, read bool not null default false, created_at timestamptz default now());
create index if not exists notif_user on notifications(user_id,id desc);
create table if not exists video_views(video_id bigint references videos on delete cascade, user_id uuid references profiles on delete cascade, primary key(video_id,user_id));
create table if not exists reports(id bigint generated always as identity primary key, video_id bigint references videos on delete cascade, reporter_id uuid references profiles on delete cascade, reason text, created_at timestamptz default now(), unique(video_id,reporter_id));

alter table follows enable row level security; alter table comments enable row level security; alter table notifications enable row level security; alter table video_views enable row level security; alter table reports enable row level security;
drop policy if exists f1 on follows; drop policy if exists f2 on follows; drop policy if exists f3 on follows;
create policy f1 on follows for select using(true); create policy f2 on follows for insert with check(follower_id=auth.uid()); create policy f3 on follows for delete using(follower_id=auth.uid());
drop policy if exists c1 on comments; drop policy if exists c2 on comments; drop policy if exists c3 on comments;
create policy c1 on comments for select using(true); create policy c2 on comments for insert with check(user_id=auth.uid());
create policy c3 on comments for delete using(user_id=auth.uid() or coalesce((select is_admin from profiles where id=auth.uid()),false));
drop policy if exists n1 on notifications; drop policy if exists n2 on notifications;
create policy n1 on notifications for select using(user_id=auth.uid()); create policy n2 on notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists r1 on reports; drop policy if exists r2 on reports;
create policy r1 on reports for insert with check(reporter_id=auth.uid()); create policy r2 on reports for select using(coalesce((select is_admin from profiles where id=auth.uid()),false));
drop policy if exists v3 on videos;
create policy v3 on videos for delete using(user_id=auth.uid() or coalesce((select is_admin from profiles where id=auth.uid()),false));

-- العدّادات والإشعارات (تلقائي)
create or replace function trg_like() returns trigger language plpgsql security definer set search_path=public as $$
declare o uuid; begin
if tg_op='INSERT' then update videos set likes_count=likes_count+1 where id=new.video_id returning user_id into o;
 if o is not null and o<>new.user_id then insert into notifications(user_id,actor_id,kind,video_id) values(o,new.user_id,'like',new.video_id); end if; return new;
else update videos set likes_count=greatest(likes_count-1,0) where id=old.video_id; return old; end if; end $$;
drop trigger if exists t_like on video_likes; create trigger t_like after insert or delete on video_likes for each row execute function trg_like();

create or replace function trg_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare o uuid; begin
if tg_op='INSERT' then update videos set comments_count=comments_count+1 where id=new.video_id returning user_id into o;
 if o is not null and o<>new.user_id then insert into notifications(user_id,actor_id,kind,video_id) values(o,new.user_id,'comment',new.video_id); end if; return new;
else update videos set comments_count=greatest(comments_count-1,0) where id=old.video_id; return old; end if; end $$;
drop trigger if exists t_comment on comments; create trigger t_comment after insert or delete on comments for each row execute function trg_comment();

create or replace function trg_follow() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into notifications(user_id,actor_id,kind) values(new.following_id,new.follower_id,'follow'); return new; end $$;
drop trigger if exists t_follow on follows; create trigger t_follow after insert on follows for each row execute function trg_follow();

create or replace function trg_gift() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.receiver_id is not null and new.receiver_id<>new.sender_id then insert into notifications(user_id,actor_id,kind) values(new.receiver_id,new.sender_id,'gift'); end if; return new; end $$;
drop trigger if exists t_gift on gift_sends; create trigger t_gift after insert on gift_sends for each row execute function trg_gift();

-- مشاهدة فريدة لكل مستخدم
create or replace function add_view(p_video bigint) returns void language plpgsql security definer set search_path=public as $$
declare n int; begin
if auth.uid() is null then return; end if;
insert into video_views(video_id,user_id) values(p_video,auth.uid()) on conflict do nothing; get diagnostics n=row_count;
if n=1 then update videos set views=views+1 where id=p_video; end if; end $$;

-- الفيد: hot = ترتيب حسب التفاعل مع تقادم الوقت، following = من أتابعهم، new = الأحدث
create or replace function feed_videos(p_mode text default 'hot', p_q text default null, p_limit int default 8, p_offset int default 0, p_id bigint default null)
returns table(id bigint,url text,poster text,caption text,created_at timestamptz,user_id uuid,username text,avatar_url text,likes_count int,comments_count int,views int,liked bool,following bool)
language sql stable set search_path=public as $$
select v.id,v.url,v.poster,v.caption,v.created_at,v.user_id,p.username,p.avatar_url,v.likes_count,v.comments_count,v.views,
 exists(select 1 from video_likes l where l.video_id=v.id and l.user_id=auth.uid()),
 exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=v.user_id)
from videos v join profiles p on p.id=v.user_id
where (p_id is null or v.id=p_id)
 and (p_q is null or v.caption ilike '%'||replace(replace(p_q,'%','\%'),'_','\_')||'%')
 and (p_mode<>'following' or exists(select 1 from follows f where f.follower_id=auth.uid() and f.following_id=v.user_id))
order by case when p_mode='hot' then (v.likes_count*3+v.comments_count*5+v.views*0.2+1)/power(extract(epoch from now()-v.created_at)/3600+2,1.3) end desc nulls last, v.id desc
limit least(p_limit,30) offset p_offset $$;

do $$ begin
 begin alter publication supabase_realtime add table comments; exception when duplicate_object then null; end;
 begin alter publication supabase_realtime add table notifications; exception when duplicate_object then null; end;
end $$;
