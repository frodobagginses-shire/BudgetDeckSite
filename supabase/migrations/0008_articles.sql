-- Articles — the content + affiliate engine.
-- Deep dives on underpriced/underplayed cards and budget builds, with buy links.

create table public.articles (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  excerpt        text,
  body_md        text not null,
  featured_cards text[] not null default '{}',   -- card names → affiliate buy links
  author_id      uuid references public.users (id) on delete set null,
  published_at   timestamptz,                     -- null = draft
  created_at     timestamptz not null default now()
);

create index articles_published_idx on public.articles (published_at desc);

alter table public.articles enable row level security;

-- Public can read published articles; authors can read their own drafts.
create policy articles_select_published on public.articles
  for select using (published_at is not null or author_id = auth.uid());

-- Seed one example article so /articles has content on first load.
insert into public.articles (slug, title, excerpt, body_md, featured_cards, published_at)
values (
  'underrated-for-the-price-unexplained-absence',
  'Underrated for the Price: Unexplained Absence',
  'A flexible, dirt-cheap answer that overperforms in budget Commander.',
  E'# Underrated for the Price\n\n**Unexplained Absence** never makes the highlight reels, but for a deck built to a price cap it punches well above its cost.\n\n## Why it overperforms\n\n- Flexible, instant-speed interaction\n- Pennies on the dollar next to premium options\n- Scales naturally as the game goes long\n\n## Building around it\n\nWhen you are validating a deck to a **$15 cap**, cards like this are how you stretch every dollar — keep the cheap, high-impact effects and cut the pricey win-more.\n\nPair it with **Dismantling Wave** for a removal suite that costs less than a single premium board wipe.',
  array['Unexplained Absence', 'Dismantling Wave'],
  now()
);
