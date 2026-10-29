-- 새 전용 프로젝트에서 실행합니다. 기존 scores가 있으면 중단되므로 먼저 확인합니다.
begin;
create table public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 8 and name ~ '^[[:alnum:]가-힣 _-]+$'),
  score integer not null check (score between 0 and 1000000)
);
alter table public.scores enable row level security;
alter table public.scores force row level security;
revoke all on public.scores from public, anon, authenticated;
grant usage on schema public to anon;
grant select on public.scores to anon;
grant insert (name, score) on public.scores to anon;
grant usage on sequence public.scores_id_seq to anon;
create policy scores_read on public.scores for select to anon using (true);
create policy scores_insert on public.scores for insert to anon
  with check (score between 0 and 1000000 and char_length(name) between 1 and 8
    and name ~ '^[[:alnum:]가-힣 _-]+$');
create index scores_rank_idx on public.scores (score desc, created_at asc);
commit;
-- UPDATE/DELETE 권한과 정책은 부여하지 않습니다.
-- INSERT는 name/score 열에만 허용하여 등록 시각과 id를 브라우저가 보낼 수 없습니다.
