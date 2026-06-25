# Budget Deck Site

A Magic: The Gathering deck builder focused on **price-capped decks** — build to a
budget, validate every list on the **cheapest printing**, optionally "bling" it
with the printings you prefer, and **Lock In** a dated price you can prove later.

This repo is the Phase 0 scaffold (Linear issue **F-1**). See `docs/` for the
full plan: competitive teardown, MVP scope & roadmap, and the Phase 1 backlog.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/` dir)
- **Tailwind CSS v4** + **shadcn/ui**
- **ESLint** + **Prettier** (with `prettier-plugin-tailwindcss`)
- Target hosting: **Vercel**; data layer (later): **Supabase** + **Scryfall**

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run lint         # eslint
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

## Deploy pipeline (F-1 acceptance criteria)

Finish wiring CI/CD with these one-time steps:

1. **Initialize git locally.** (This was scaffolded in a sandbox that can't
   finalize git, so do it on your machine. First delete the placeholder:
   `rm -rf .git_partial_DELETE_ME`.)
   ```bash
   git init -b main
   git add -A
   git commit -m "F-1: scaffold Next.js + Tailwind + shadcn/ui app"
   ```
2. **Push to GitHub.** Create an empty repo, then:
   ```bash
   git remote add origin git@github.com:<you>/budget-deck-site.git
   git push -u origin main
   ```
3. **Connect Vercel.** In Vercel, "Add New → Project", import the GitHub repo,
   accept the detected Next.js defaults, and deploy. Vercel then gives you:
   - **Production deploys** on every push to `main`
   - **Preview deploys** with a unique URL on every pull request

No environment variables are required yet; they'll arrive with F-2 (Supabase).

## Project structure

```
src/
  app/
    layout.tsx      # root layout, fonts, metadata
    page.tsx        # landing page (hello-world, branded)
    globals.css     # Tailwind v4 + shadcn tokens + brand palette
  components/ui/     # shadcn components (Button)
  lib/utils.ts       # cn() helper
docs/                # planning docs (teardown, roadmap, backlog)
```
