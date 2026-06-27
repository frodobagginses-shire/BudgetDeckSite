-- 0022: playgroups. A user owns playgroups and adds people they follow as
-- members; anyone can join via a short invite code. Used by match tracking.

create table public.playgroups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users (id) on delete cascade,
  name        text not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table public.playgroup_members (
  playgroup_id uuid not null references public.playgroups (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (playgroup_id, user_id)
);
create index playgroup_members_user_idx on public.playgroup_members (user_id);

-- SECURITY DEFINER membership check: used inside RLS policies so a policy on
-- playgroup_members can reference membership without recursing on itself.
create or replace function public.is_playgroup_member(p_group uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playgroup_members
     where playgroup_id = p_group and user_id = p_user
  );
$$;

alter table public.playgroups        enable row level security;
alter table public.playgroup_members enable row level security;

-- playgroups: visible to the owner and to members; only the owner mutates.
create policy playgroups_select on public.playgroups
  for select using (
    owner_id = auth.uid() or public.is_playgroup_member(id, auth.uid())
  );
create policy playgroups_insert on public.playgroups
  for insert with check (owner_id = auth.uid());
create policy playgroups_update on public.playgroups
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy playgroups_delete on public.playgroups
  for delete using (owner_id = auth.uid());

-- members: visible to everyone in the group; owner adds anyone, you can add or
-- remove yourself (join via code / leave).
create policy playgroup_members_select on public.playgroup_members
  for select using (public.is_playgroup_member(playgroup_id, auth.uid()));
create policy playgroup_members_insert on public.playgroup_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.playgroups g
       where g.id = playgroup_id and g.owner_id = auth.uid()
    )
  );
create policy playgroup_members_delete on public.playgroup_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.playgroups g
       where g.id = playgroup_id and g.owner_id = auth.uid()
    )
  );

-- Join by code (the group row isn't visible until you're a member, so resolve
-- the code in a definer function).
create or replace function public.join_playgroup(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  select id into v_group from public.playgroups
   where invite_code = upper(btrim(p_code));
  if v_group is null then
    raise exception 'No playgroup with that code';
  end if;
  insert into public.playgroup_members (playgroup_id, user_id)
  values (v_group, auth.uid())
  on conflict do nothing;
  return v_group;
end;
$$;

grant execute on function public.is_playgroup_member(uuid, uuid) to authenticated;
grant execute on function public.join_playgroup(text) to authenticated;
