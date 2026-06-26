-- Social v1 — likes & follows (no comments, by design — less moderation).

-- ---- deck likes ----------------------------------------------------------
create table public.deck_likes (
  deck_id    uuid not null references public.decks (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);
create index deck_likes_deck_idx on public.deck_likes (deck_id);

alter table public.deck_likes enable row level security;
create policy deck_likes_select_all on public.deck_likes
  for select using (true);
create policy deck_likes_insert_self on public.deck_likes
  for insert with check (user_id = auth.uid());
create policy deck_likes_delete_self on public.deck_likes
  for delete using (user_id = auth.uid());

-- ---- follows --------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
create policy follows_select_all on public.follows
  for select using (true);
create policy follows_insert_self on public.follows
  for insert with check (follower_id = auth.uid());
create policy follows_delete_self on public.follows
  for delete using (follower_id = auth.uid());

-- ---- browse_decks v2: add like_count + 'likes' sort -----------------------
drop function if exists public.browse_decks(text, numeric, text, int, int);

create function public.browse_decks(
  p_format     text    default null,
  p_max_budget numeric default null,
  p_sort       text    default 'recent',
  p_limit      int     default 24,
  p_offset     int     default 0
)
returns table (
  id               uuid,
  name             text,
  game_format      text,
  threshold_amount numeric,
  owner_handle     text,
  budget_price     numeric,
  card_count       int,
  like_count       int,
  updated_at       timestamptz
)
language sql
stable
as $$
  with deck_budget as (
    select d.id, d.name, d.game_format, d.threshold_amount, d.owner_id, d.updated_at,
           coalesce(sum(dc.quantity * cc.cheapest_price_usd)
             filter (where dc.counts_toward_budget and dc.board = 'main'), 0) as budget_price,
           coalesce(sum(dc.quantity) filter (where dc.board = 'main'), 0)::int as card_count
      from public.decks d
      left join public.deck_cards dc on dc.deck_id = d.id
      left join public.cards c       on c.scryfall_id = dc.scryfall_id
      left join public.card_cheapest cc on cc.oracle_id = c.oracle_id
     where d.visibility = 'public'
       and (p_format is null or d.game_format = p_format)
     group by d.id
  )
  select db.id, db.name, db.game_format, db.threshold_amount,
         u.handle as owner_handle, db.budget_price, db.card_count,
         coalesce(lk.n, 0)::int as like_count, db.updated_at
    from deck_budget db
    left join public.users u on u.id = db.owner_id
    left join (
      select deck_id, count(*) as n from public.deck_likes group by deck_id
    ) lk on lk.deck_id = db.id
   where (p_max_budget is null or db.budget_price <= p_max_budget)
   order by
     case when p_sort = 'price_asc'  then db.budget_price end asc nulls last,
     case when p_sort = 'price_desc' then db.budget_price end desc nulls last,
     case when p_sort = 'likes'      then coalesce(lk.n, 0) end desc nulls last,
     case when p_sort = 'name'       then db.name end asc,
     case when p_sort = 'recent' or p_sort is null then db.updated_at end desc
   limit greatest(1, least(coalesce(p_limit, 24), 60))
   offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function
  public.browse_decks(text, numeric, text, int, int)
  to anon, authenticated;
