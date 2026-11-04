# To-do

Known bugs and small follow-ups. Check items off (or delete them) as they ship.

## Bugs

- [ ] **Deck page Export leaves out the sideboard.** "Copy as text" (and "Copy for
      Arena") on a deck page only copies the main deck. Reported by a tester,
      2026-11-03.
  - Cause: `src/app/decks/[id]/page.tsx` filters to `board === "main"` before
    passing cards to `ExportMenu` (`src/components/decks/export-menu.tsx`), and
    the read-only view (`deck-read-only.tsx`) passes the same main-only list.
    `ExportMenu` has no notion of boards, so there is no `SIDEBOARD:` section.
  - Fix idea: pass the sideboard in too and output it after a blank line and
    `SIDEBOARD:`, the way snapshot export already does (`snapshotToText` in
    `src/lib/snapshot-export.ts`). Check that the Arena format gets it as well,
    and that a deck with no sideboard still exports cleanly.
