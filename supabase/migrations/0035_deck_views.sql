-- Deck view counts.
-- Kept in a separate counter table (not a decks column) on purpose: decks has a
-- BEFORE UPDATE trigger that stamps updated_at = now(), so incrementing a column
-- on decks would shove every viewed deck to the top of "recently updated". A
-- side table sidesteps that and keeps the hot write path tiny.

create table public.deck_views (
  deck_id uuid primary key references public.decks (id) on delete cascade,
  count   bigint not null default 0
);

alter table public.deck_views enable row level security;
create policy deck_views_select_all on public.deck_views
  for select using (true);
-- No insert/update/delete policies: only the SECURITY DEFINER function below writes.

grant select on public.deck_views to anon, authenticated;

-- Increment a deck's view counter. SECURITY DEFINER so anonymous + non-owner
-- visitors can bump the count past RLS. Guarded to public/unlisted decks so a
-- stray id can't rack up views on someone's private deck.
create or replace function public.increment_deck_view(p_deck uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.decks
     where id = p_deck and visibility in ('public', 'unlisted')
  ) then
    return;
  end if;

  insert into public.deck_views (deck_id, count)
       values (p_deck, 1)
  on conflict (deck_id)
       do update set count = deck_views.count + 1;
end;
$$;

grant execute on function public.increment_deck_view(uuid) to anon, authenticated;

-- ---- browse_decks v3: add view_count + 'views' sort -----------------------
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
  view_count       int,
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
         coalesce(lk.n, 0)::int as like_count,
         coalesce(vw.count, 0)::int as view_count,
         db.updated_at
    from deck_budget db
    left join public.users u on u.id = db.owner_id
    left join (
      select deck_id, count(*) as n from public.deck_likes group by deck_id
    ) lk on lk.deck_id = db.id
    left join public.deck_views vw on vw.deck_id = db.id
   where (p_max_budget is null or db.budget_price <= p_max_budget)
   order by
     case when p_sort = 'price_asc'  then db.budget_price end asc nulls last,
     case when p_sort = 'price_desc' then db.budget_price end desc nulls last,
     case when p_sort = 'likes'      then coalesce(lk.n, 0) end desc nulls last,
     case when p_sort = 'views'      then coalesce(vw.count, 0) end desc nulls last,
     case when p_sort = 'name'       then db.name end asc,
     case when p_sort = 'recent' or p_sort is null then db.updated_at end desc
   limit greatest(1, least(coalesce(p_limit, 24), 60))
   offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function
  public.browse_decks(text, numeric, text, int, int)
  to anon, authenticated;
