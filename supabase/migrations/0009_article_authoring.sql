-- Article authoring — author role + write policies.

alter table public.users
  add column is_author boolean not null default false;

-- Only flagged authors may create articles (as themselves); authors edit/delete
-- their own. (Reads stay governed by the published/own-draft policy from 0008.)
create policy articles_insert_author on public.articles
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_author
    )
  );

create policy articles_update_own on public.articles
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy articles_delete_own on public.articles
  for delete using (author_id = auth.uid());

-- Make yourself an author (run once, replace with your handle):
--   update public.users set is_author = true where handle = 'your-handle';
