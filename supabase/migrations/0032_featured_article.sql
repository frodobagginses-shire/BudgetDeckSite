-- 0032: one featured article, advertised on the homepage.
alter table public.articles
  add column if not exists is_featured boolean not null default false;

-- Author-only setter. SECURITY DEFINER so it can also clear/set the flag on
-- seeded articles that have no author_id. Enforces a single featured article.
create or replace function public.set_featured_article(p_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_author) then
    raise exception 'authors only';
  end if;
  if p_on then
    update public.articles set is_featured = false where is_featured;
    update public.articles set is_featured = true where id = p_id;
  else
    update public.articles set is_featured = false where id = p_id;
  end if;
end $$;

grant execute on function public.set_featured_article(uuid, boolean) to authenticated;

-- Seed the current featured article.
update public.articles set is_featured = true
 where slug = 'underrated-for-the-price-unexplained-absence';
